"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { playUkuleleNote, triggerHapticPluck } from "@/lib/ukuleleAudio";
import EqualizerPanel from "@/components/EqualizerPanel";
import { startSession, logEvent, endSession, getInactivityTimeoutMs } from "@/lib/practiceTracking";
import { STRING_DATA, getStringX, getStringIdxFromSvgX } from "@/lib/constants";
import { useStringOscillator } from "@/lib/useStringOscillator";
import ParticleCanvas, { type ParticleCanvasHandle } from "@/components/ParticleCanvas";
import UkuleleSVG from "@/components/UkuleleSVG";

const CHORDS = [
  { name: "Do", freqs: [261.63, 329.63, 392.0, 440.0], color: "#C77DFF" },
  { name: "Re", freqs: [293.66, 369.99, 440.0, 587.33], color: "#FFB347" },
  { name: "Mi", freqs: [329.63, 415.3, 493.88, 659.25], color: "#FF6B9D" },
  { name: "Sol", freqs: [392.0, 493.88, 587.33, 783.99], color: "#FF6B9D" },
];

const MESSAGES = [
  "¡Eso es! 🌟",
  "¡Qué nota tan bonita! 🎵",
  "¡Lo estás haciendo increíble! ✨",
  "¡El ukelele te ama! 🎶",
  "¡Esa nota suena genial! 💫",
  "¡Tocas con el alma! 🌙",
  "¡Van Gogh pintaba, tú tocas! 🎨",
  "¡Caifanes estaría orgulloso! 🎸",
  "¡Cada nota es un regalo! 💖",
  "¡Sigue, no pares! 🌸",
  "¡Eres un artista! 🎀",
  "¡Música pura! 🎼",
];

const floatVariants = {
  animate: {
    y: [0, -12, 0],
    rotate: [-1, 1, -1],
    transition: { duration: 5, ease: "easeInOut" as const, repeat: Infinity },
  },
};

const shadowVariants = {
  animate: {
    scaleX: [1, 0.75, 1],
    transition: { duration: 5, ease: "easeInOut" as const, repeat: Infinity },
  },
};

interface StrumState {
  startX: number;
  startY: number;
  startTime: number;
  stringsHit: number[];
  isStrumGesture: boolean;
}

export default function UkelelePage() {
  const [mounted, setMounted] = useState(false);
  const [vibratingStrings, setVibratingStrings] = useState<Set<number>>(new Set());
  const [displayCount, setDisplayCount] = useState(0);
  const noteCountRef = useRef(0);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [milestoneMessage, setMilestoneMessage] = useState<{ title: string; subtitle: string } | null>(null);
  const [bgPulseColor, setBgPulseColor] = useState<string | null>(null);
  const [activeChordFrets, setActiveChordFrets] = useState<number[] | null>(null);
  const particleCanvasRef = useRef<ParticleCanvasHandle>(null);
  const lastMsgRef = useRef(-1);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ukeRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const strumStateRef = useRef<StrumState | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseRef = useRef({ x: 0.3, y: 0.25 });

  const { stringPaths, animateString } = useStringOscillator();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
    };
  }, []);

  // On React unmount, close any open session. Note: this won't catch hard tab closes
  // or browser kills — only SPA unmounts. beforeunload fetch is unreliable across browsers.
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
    };
  }, []);

  const recordInteraction = useCallback(
    async (eventType: "note" | "chord" | "strum", label: string) => {
      if (!sessionIdRef.current) {
        const id = await startSession();
        sessionIdRef.current = id;
      }
      if (sessionIdRef.current) {
        logEvent(sessionIdRef.current, eventType, label);
      }
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        if (sessionIdRef.current) {
          endSession(sessionIdRef.current);
          sessionIdRef.current = null;
        }
      }, getInactivityTimeoutMs());
    },
    []
  );

  const showToast = useCallback((message: string) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setCurrentMessage(message);
    messageTimeoutRef.current = setTimeout(() => setCurrentMessage(null), 2000);
  }, []);

  const showMilestone = useCallback((title: string, subtitle: string) => {
    if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
    setMilestoneMessage({ title, subtitle });
    milestoneTimeoutRef.current = setTimeout(() => setMilestoneMessage(null), 3500);
  }, []);

  const fireSmallConfetti = async () => {
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.4 }, colors: ['#D4537E', '#C77DFF'], startVelocity: 20, gravity: 0.9 });
  };

  const fireMediumConfetti = async () => {
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.4 }, colors: ['#D4537E', '#C77DFF', '#FFB347', '#7DF9FF'], startVelocity: 25, gravity: 0.85 });
  };

  const fireLargeConfetti = async () => {
    const confetti = (await import('canvas-confetti')).default;
    const origins = [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, { x: 0.5, y: 0.3 }];
    origins.forEach((origin, i) => {
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 70, origin, colors: ['#D4537E', '#C77DFF', '#FFB347', '#7DF9FF', '#FFF'], startVelocity: 30, gravity: 0.8 });
      }, i * 200);
    });
  };

  const handleNoteCount = useCallback((color: string) => {
    noteCountRef.current += 1;
    setDisplayCount(noteCountRef.current);
    const count = noteCountRef.current;

    if (count === 5) {
      showMilestone('¡5 notas! 🚀', '¡Ya estás despegando!');
      fireSmallConfetti();
    } else if (count === 10) {
      showMilestone('¡10 notas! ⭐', '¡Eres imparable!');
      fireMediumConfetti();
    } else if (count === 20) {
      showMilestone('¡20 notas! 🎉', 'Ya eres todo un ukulelista.');
      fireLargeConfetti();
    } else {
      let idx: number;
      do { idx = Math.floor(Math.random() * MESSAGES.length); } while (idx === lastMsgRef.current);
      lastMsgRef.current = idx;
      showToast(MESSAGES[idx]);
    }
  }, [showToast, showMilestone]);

  const getStringOrigin = useCallback((stringIdx: number) => {
    const uke = ukeRef.current;
    if (!uke) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rect = uke.getBoundingClientRect();
    const xRatio = getStringX(stringIdx) / 260;
    const yRatio = 220 / 500;
    return { x: rect.left + rect.width * xRatio, y: rect.top + rect.height * yRatio };
  }, []);

  const pluckString = useCallback((idx: number, velocity = 1) => {
    try { playUkuleleNote(STRING_DATA[idx].freq, 1.2, velocity); } catch {}
    triggerHapticPluck(velocity);
    setVibratingStrings((prev) => new Set(prev).add(idx));
    animateString(idx, velocity);
    setTimeout(() => setVibratingStrings((prev) => { const n = new Set(prev); n.delete(idx); return n; }), 700);

    setBgPulseColor(STRING_DATA[idx].color);
    setTimeout(() => setBgPulseColor(null), 3000);

    const origin = getStringOrigin(idx);
    particleCanvasRef.current?.emit(idx, origin.x, origin.y);

    handleNoteCount(STRING_DATA[idx].color);
    recordInteraction("note", STRING_DATA[idx].note);
  }, [getStringOrigin, handleNoteCount, animateString, recordInteraction]);

  const getSvgX = useCallback((clientX: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    return (clientX - rect.left) / rect.width * 260;
  }, []);

  const handleStrumPointerDown = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const svgX = getSvgX(e.clientX);
    const idx = getStringIdxFromSvgX(svgX);
    strumStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      stringsHit: idx !== null ? [idx] : [],
      isStrumGesture: false,
    };
  }, [getSvgX]);

  const handleStrumPointerMove = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    const state = strumStateRef.current;
    if (!state) return;
    const svgX = getSvgX(e.clientX);
    const idx = getStringIdxFromSvgX(svgX);
    if (idx !== null && !state.stringsHit.includes(idx)) {
      state.stringsHit.push(idx);
      if (state.stringsHit.length >= 2) {
        state.isStrumGesture = true;
      }
    }
  }, [getSvgX]);

  const handleStrumPointerUp = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    const state = strumStateRef.current;
    strumStateRef.current = null;
    if (!state) return;

    const dt = (Date.now() - state.startTime) / 1000;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / dt : 0;
    const rawVelocity = speed / 400;

    if (state.isStrumGesture) {
      const velocity = Math.max(0.3, Math.min(1.0, rawVelocity));
      state.stringsHit.forEach((idx, i) => {
        setTimeout(() => pluckString(idx, velocity), i * 30);
      });
      recordInteraction("strum", "strum");
    } else {
      const idx = state.stringsHit[0] ?? null;
      if (idx !== null) {
        const velocity = dist < 10 ? 0.85 : Math.max(0.3, Math.min(1.0, rawVelocity));
        pluckString(idx, velocity);
      }
    }
  }, [getSvgX, pluckString, recordInteraction]);

  const playChord = useCallback((chord: typeof CHORDS[0]) => {
    chord.freqs.forEach((freq, i) => {
      setTimeout(() => { try { playUkuleleNote(freq); } catch {} }, i * 30);
    });
    [0, 1, 2, 3].forEach((i) => {
      setTimeout(() => {
        setVibratingStrings((prev) => new Set(prev).add(i));
        animateString(i);
        const origin = getStringOrigin(i);
        particleCanvasRef.current?.emit(i, origin.x, origin.y);
        setTimeout(() => setVibratingStrings((prev) => { const n = new Set(prev); n.delete(i); return n; }), 700);
      }, i * 80);
    });
    handleNoteCount(chord.color);
    setBgPulseColor(chord.color);
    setTimeout(() => setBgPulseColor(null), 3000);
    showToast(`Acorde de ${chord.name} 🎵`);
    recordInteraction("chord", chord.name);
  }, [getStringOrigin, handleNoteCount, showToast, animateString, recordInteraction]);

  if (!mounted) return <div className="min-h-screen bg-black" />;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const ukeW = isMobile ? 200 : 260;
  const ukeH = isMobile ? 380 : 500;

  return (
    <>
    <main className="relative w-full h-screen overflow-hidden flex flex-col items-center" style={{ background: "#000000", isolation: "isolate" }}>
      <AnimatePresence>
        {bgPulseColor && (
          <motion.div
            key={bgPulseColor + displayCount}
            initial={{ opacity: 0 }}
            animate={{ opacity: isMobile ? 0.06 : 0.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3 }}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ background: `radial-gradient(circle at center, ${bgPulseColor}, transparent 70%)` }}
          />
        )}
      </AnimatePresence>

      <ParticleCanvas
        ref={particleCanvasRef}
        mounted={mounted}
        onMouseMove={(x, y) => { mouseRef.current = { x, y }; }}
      />

      {/* Header */}
      <div className="relative z-[2] pt-8 pb-4 text-center w-full">
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
        }}>
          ✦ instrumento virtual ✦
        </p>
        <h1 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2rem,6vw,3.5rem)",
          fontWeight: 300,
          background: "linear-gradient(135deg, #FF6B9D, #C77DFF)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          margin: "4px 0 0",
        }}>
          Ukelele de Leslie
        </h1>

        <motion.div
          key={displayCount}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ type: "tween", duration: 0.4, times: [0, 0.5, 1], ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute top-4 right-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999,
            padding: "6px 16px",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          🎵 {displayCount}
        </motion.div>
      </div>

      {/* Ukulele */}
      <div className="relative z-[2] flex-1 flex items-center justify-center" style={{ minHeight: isMobile ? "55vh" : "50vh" }}>
        <motion.div
          variants={shadowVariants}
          animate="animate"
          className="absolute"
          style={{
            bottom: isMobile ? "5%" : "8%",
            width: 140, height: 20,
            background: "rgba(0,0,0,0.5)",
            borderRadius: "50%",
            filter: "blur(8px)",
          }}
        />

        <motion.div
          ref={ukeRef}
          variants={floatVariants}
          animate="animate"
          className="relative"
          style={{ width: ukeW, height: ukeH }}
        >
          <AnimatePresence>
            {vibratingStrings.size > 0 && (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ type: "tween", duration: 0.3, times: [0, 0.5, 1], ease: "easeInOut" }}
                className="absolute inset-0"
              />
            )}
          </AnimatePresence>

          <UkuleleSVG
            ref={svgRef}
            stringPaths={stringPaths}
            vibratingStrings={vibratingStrings}
            activeChordFrets={activeChordFrets}
            isMobile={isMobile}
            displayCount={displayCount}
            onStrumPointerDown={handleStrumPointerDown}
            onStrumPointerMove={handleStrumPointerMove}
            onStrumPointerUp={handleStrumPointerUp}
            onStrumPointerCancel={() => { strumStateRef.current = null; }}
          />

          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: `radial-gradient(ellipse 40% 30% at ${mouseRef.current.x * 100}% ${mouseRef.current.y * 100}%, rgba(255,255,255,0.06), transparent)`,
              mixBlendMode: "overlay",
            }}
          />
        </motion.div>
      </div>

      {/* Chord buttons */}
      <div className="relative z-[2] pb-8 pt-4 text-center w-full">
        <div className={`flex flex-wrap justify-center gap-4 mb-3 ${isMobile ? "grid grid-cols-2 gap-3 px-8" : ""}`}
          style={isMobile ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 200, margin: "0 auto" } : {}}>
          {CHORDS.map((chord) => (
            <motion.button
              key={chord.name}
              whileHover={{ scale: 1.08, background: `rgba(${hexToRgb(chord.color)},0.08)`, borderColor: `rgba(${hexToRgb(chord.color)},0.4)` }}
              whileTap={{ scale: 0.88, background: `rgba(${hexToRgb(chord.color)},0.2)` }}
              onClick={() => playChord(chord)}
              className="flex flex-col items-center justify-center rounded-full"
              style={{
                width: isMobile ? 60 : 68,
                height: isMobile ? 60 : 68,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", color: "white" }}>{chord.name}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>acorde</span>
            </motion.button>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 16 }}>
          Toca las cuerdas · toca los acordes · deja que la magia suceda
        </p>

        <Link
          href="/dashboard"
          className="absolute bottom-4 left-4"
          style={{
            fontFamily: "var(--font-body)", fontSize: 11,
            color: "rgba(255,255,255,0.2)", textDecoration: "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
        >
          ☆ mi progreso
        </Link>

        <button
          onClick={() => { noteCountRef.current = 0; setDisplayCount(0); particleCanvasRef.current?.clearParticles(); }}
          className="absolute bottom-4 right-4"
          style={{
            fontFamily: "var(--font-body)", fontSize: 11,
            color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
        >
          ↺ reiniciar
        </button>
      </div>
    </main>

    {/* Toast */}
    <AnimatePresence>
      {currentMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
          width: 'max-content',
          maxWidth: '85vw',
        }}>
          <motion.div
            key={currentMessage}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'tween', duration: 0.3 }}
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              padding: '10px 24px',
              color: 'white',
              fontFamily: 'var(--font-script)',
              fontStyle: 'italic',
              fontSize: '1rem',
              whiteSpace: 'nowrap',
            }}
          >
            {currentMessage}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <EqualizerPanel />

    {/* Milestone banner */}
    <AnimatePresence>
      {milestoneMessage && (
        <div style={{
          position: 'fixed',
          top: 124,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          pointerEvents: 'none',
          width: 'max-content',
          maxWidth: '85vw',
        }}>
          <motion.div
            key={milestoneMessage.title}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'tween', duration: 0.3 }}
            style={{
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(212,83,126,0.35)',
              borderRadius: 999,
              padding: '10px 24px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1rem',
              color: 'white',
              fontWeight: 400,
            }}>
              {milestoneMessage.title}
            </span>
            <span style={{
              fontFamily: 'var(--font-script)',
              fontStyle: 'italic',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.6)',
              marginLeft: 8,
            }}>
              {milestoneMessage.subtitle}
            </span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
