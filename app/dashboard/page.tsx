"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getDashboardStats, DashboardStats } from "@/lib/practiceTracking";

const SPANISH_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = SPANISH_MONTHS[d.getMonth()];
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month}, ${h}:${m}`;
}

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "24px 28px",
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

const skeletonPulse = {
  animate: {
    opacity: [0.3, 0.6, 0.3],
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null | "loading">("loading");

  const fetchStats = useCallback(async () => {
    setStats("loading");
    const result = await getDashboardStats();
    setStats(result);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <main
      style={{ background: "#000000", minHeight: "100vh", padding: "32px 16px 64px" }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>
                ✦ estadísticas ✦
              </p>
              <h1 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.8rem,5vw,2.8rem)",
                fontWeight: 300,
                background: "linear-gradient(135deg, #FF6B9D, #C77DFF)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                margin: "4px 0 0",
              }}>
                Tu Progreso
              </h1>
            </div>
            <Link href="/" style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999,
              padding: "8px 16px",
              display: "inline-block",
              transition: "color 0.2s",
            }}>
              ← volver al ukelele
            </Link>
          </div>
        </motion.div>

        {/* Loading skeleton */}
        {stats === "loading" && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <motion.div key={i} variants={skeletonPulse} animate="animate" style={{ ...panelStyle, height: 100 }} />
            ))}
          </>
        )}

        {/* Error state */}
        {stats === null && (
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" style={{ ...panelStyle, textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.5)", margin: "0 0 16px" }}>
              No se pudieron cargar tus estadísticas.
            </p>
            <button
              onClick={fetchStats}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 999,
                padding: "8px 20px",
                cursor: "pointer",
              }}
            >
              Intentar de nuevo
            </button>
          </motion.div>
        )}

        {/* Empty state */}
        {stats && stats !== "loading" && stats.totalSessions === 0 && (
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" style={{ ...panelStyle, textAlign: "center", padding: "40px 28px" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎵</div>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 300, color: "rgba(255,255,255,0.8)", margin: "0 0 8px" }}>
              Aún no has tocado ninguna nota
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 24px" }}>
              ¡Vuelve a la página principal y empieza a tocar!
            </p>
            <Link href="/" style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "white",
              textDecoration: "none",
              background: "linear-gradient(135deg, rgba(255,107,157,0.3), rgba(199,125,255,0.3))",
              border: "1px solid rgba(255,107,157,0.3)",
              borderRadius: 999,
              padding: "10px 24px",
            }}>
              Ir al ukelele ✦
            </Link>
          </motion.div>
        )}

        {/* Stats cards */}
        {stats && stats !== "loading" && stats.totalSessions > 0 && (
          <>
            {/* Streak */}
            <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" style={panelStyle}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>
                Racha
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "3.5rem", fontWeight: 300, lineHeight: 1, color: "#FF6B9D" }}>
                    {stats.currentStreak}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                    🔥 racha actual (días)
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "3.5rem", fontWeight: 300, lineHeight: 1, color: "#C77DFF" }}>
                    {stats.longestStreak}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                    ✨ mejor racha (días)
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Totals */}
            <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" style={panelStyle}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>
                Totales
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { value: stats.totalNotes, label: "notas tocadas", color: "#FFB347" },
                  { value: stats.totalSessions, label: "sesiones", color: "#7DF9FF" },
                ].map(({ value, label, color }) => (
                  <div key={label}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "2.4rem", fontWeight: 300, lineHeight: 1, color }}>
                      {value.toLocaleString("es-MX")}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top chord */}
            <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" style={panelStyle}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>
                Acorde favorito
              </p>
              {stats.topChord ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", fontWeight: 300, color: "#C77DFF" }}>
                    {stats.topChord.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {stats.topChord.count} veces
                  </span>
                </div>
              ) : (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  Aún no has tocado ningún acorde.
                </p>
              )}
            </motion.div>

            {/* Recent sessions */}
            <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" style={panelStyle}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>
                Sesiones recientes
              </p>
              {stats.recentSessions.length === 0 ? (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>Sin sesiones aún.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stats.recentSessions.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                        {formatDate(s.startedAt)}
                      </span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        🎵 {s.notesPlayed} · 🎶 {s.chordsPlayed}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}
