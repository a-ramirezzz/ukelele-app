import { getSupabaseClient } from "./supabaseClient";
import { getAnonId } from "./anonId";

export interface DashboardStats {
  currentStreak: number;
  longestStreak: number;
  totalNotes: number;
  totalSessions: number;
  recentSessions: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    notesPlayed: number;
    chordsPlayed: number;
  }>;
  topChord: { label: string; count: number } | null;
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const anon_id = getAnonId();
    const sb = getSupabaseClient();

    const [streakResult, sessionsResult, chordsResult] = await Promise.all([
      sb.from("user_streaks").select("current_streak,longest_streak,total_notes,total_sessions").eq("anon_id", anon_id).maybeSingle(),
      sb.from("practice_sessions").select("id,started_at,ended_at,notes_played,chords_played").eq("anon_id", anon_id).order("started_at", { ascending: false }).limit(10),
      sb.from("note_events").select("label").eq("anon_id", anon_id).eq("event_type", "chord").order("created_at", { ascending: false }).limit(500),
    ]);

    if (streakResult.error) { console.error("[tracking] getDashboardStats streak error:", streakResult.error); return null; }
    if (sessionsResult.error) { console.error("[tracking] getDashboardStats sessions error:", sessionsResult.error); return null; }
    if (chordsResult.error) { console.error("[tracking] getDashboardStats chords error:", chordsResult.error); return null; }

    const streak = streakResult.data;
    if (!streak && (!sessionsResult.data || sessionsResult.data.length === 0)) {
      return { currentStreak: 0, longestStreak: 0, totalNotes: 0, totalSessions: 0, recentSessions: [], topChord: null };
    }

    const recentSessions = (sessionsResult.data ?? []).map((s) => ({
      id: s.id as string,
      startedAt: s.started_at as string,
      endedAt: s.ended_at as string | null,
      notesPlayed: (s.notes_played as number) ?? 0,
      chordsPlayed: (s.chords_played as number) ?? 0,
    }));

    const chordCounts = new Map<string, number>();
    for (const row of chordsResult.data ?? []) {
      const lbl = row.label as string;
      chordCounts.set(lbl, (chordCounts.get(lbl) ?? 0) + 1);
    }
    let topChord: DashboardStats["topChord"] = null;
    for (const [label, count] of chordCounts) {
      if (!topChord || count > topChord.count) topChord = { label, count };
    }

    return {
      currentStreak: (streak?.current_streak as number) ?? 0,
      longestStreak: (streak?.longest_streak as number) ?? 0,
      totalNotes: (streak?.total_notes as number) ?? 0,
      totalSessions: (streak?.total_sessions as number) ?? 0,
      recentSessions,
      topChord,
    };
  } catch (err) {
    console.error("[tracking] getDashboardStats error:", err);
    return null;
  }
}

export const INACTIVITY_TIMEOUT_MS = 120_000;

export function getInactivityTimeoutMs(): number {
  return INACTIVITY_TIMEOUT_MS;
}

export async function startSession(): Promise<string | null> {
  try {
    const anon_id = getAnonId();
    const { data, error } = await getSupabaseClient()
      .from("practice_sessions")
      .insert({ anon_id, notes_played: 0, chords_played: 0 })
      .select("id")
      .single();
    if (error) {
      console.error("[tracking] startSession failed:", error);
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error("[tracking] startSession error:", err);
    return null;
  }
}

export async function logEvent(
  sessionId: string,
  eventType: "note" | "chord" | "strum",
  label: string
): Promise<void> {
  try {
    const anon_id = getAnonId();
    const sb = getSupabaseClient();

    const { error: insertError } = await sb
      .from("note_events")
      .insert({ session_id: sessionId, anon_id, event_type: eventType, label });
    if (insertError) {
      console.error("[tracking] logEvent insert failed:", insertError);
    }

    const counterField = eventType === "chord" ? "chords_played" : "notes_played";
    const { data: session, error: fetchError } = await sb
      .from("practice_sessions")
      .select(counterField)
      .eq("id", sessionId)
      .single();
    if (fetchError) {
      console.error("[tracking] logEvent fetch session failed:", fetchError);
      return;
    }
    const current = (session as Record<string, number>)[counterField] ?? 0;
    const { error: updateError } = await sb
      .from("practice_sessions")
      .update({ [counterField]: current + 1 })
      .eq("id", sessionId);
    if (updateError) {
      console.error("[tracking] logEvent update session failed:", updateError);
    }
  } catch (err) {
    console.error("[tracking] logEvent error:", err);
  }
}

export async function endSession(sessionId: string): Promise<void> {
  try {
    const { error } = await getSupabaseClient()
      .from("practice_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) {
      console.error("[tracking] endSession failed:", error);
    }
    await updateStreak(sessionId);
  } catch (err) {
    console.error("[tracking] endSession error:", err);
  }
}

async function updateStreak(sessionId: string): Promise<void> {
  try {
    const anon_id = getAnonId();
    const sb = getSupabaseClient();

    const { data: session, error: sessionError } = await sb
      .from("practice_sessions")
      .select("notes_played, chords_played")
      .eq("id", sessionId)
      .single();
    if (sessionError) {
      console.error("[tracking] updateStreak fetch session failed:", sessionError);
      return;
    }
    const sessionNotes =
      ((session?.notes_played ?? 0) as number) + ((session?.chords_played ?? 0) as number);

    const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE");

    const { data: existing, error: fetchError } = await sb
      .from("user_streaks")
      .select("*")
      .eq("anon_id", anon_id)
      .maybeSingle();
    if (fetchError) {
      console.error("[tracking] updateStreak fetch streak failed:", fetchError);
      return;
    }

    let current_streak: number;
    let longest_streak: number;
    let last_played_date: string;
    let total_notes: number;
    let total_sessions: number;

    if (!existing) {
      current_streak = 1;
      longest_streak = 1;
      last_played_date = today;
      total_notes = sessionNotes;
      total_sessions = 1;
    } else {
      total_notes = (existing.total_notes ?? 0) + sessionNotes;
      total_sessions = (existing.total_sessions ?? 0) + 1;
      longest_streak = existing.longest_streak ?? 1;

      if (existing.last_played_date === today) {
        current_streak = existing.current_streak ?? 1;
        last_played_date = today;
      } else if (existing.last_played_date === yesterday) {
        current_streak = (existing.current_streak ?? 1) + 1;
        longest_streak = Math.max(longest_streak, current_streak);
        last_played_date = today;
      } else {
        current_streak = 1;
        last_played_date = today;
      }
    }

    const { error: upsertError } = await sb.from("user_streaks").upsert(
      {
        anon_id,
        current_streak,
        longest_streak,
        last_played_date,
        total_notes,
        total_sessions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "anon_id" }
    );
    if (upsertError) {
      console.error("[tracking] updateStreak upsert failed:", upsertError);
    }
  } catch (err) {
    console.error("[tracking] updateStreak error:", err);
  }
}
