"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, useEffect } from "react";
import { playUkuleleNote } from "@/lib/ukuleleAudio";

const STRING_DATA = [
  { note: "G", freq: 392.0, color: "#FF6B9D", type: "heart" as const },
  { note: "C", freq: 261.63, color: "#C77DFF", type: "star" as const },
  { note: "E", freq: 329.63, color: "#FFB347", type: "note" as const },
  { note: "A", freq: 440.0, color: "#7DF9FF", type: "bubble" as const },
];

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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "heart" | "star" | "note" | "bubble";
  angle: number;
  angularVel: number;
  phase: number;
}

interface AmbientDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  const s = size / 2;
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(0, -s * 0.3, -s, -s * 0.3, -s, s * 0.1);
  ctx.bezierCurveTo(-s, s * 0.6, 0, s, 0, s);
  ctx.bezierCurveTo(0, s, s, s * 0.6, s, s * 0.1);
  ctx.bezierCurveTo(s, -s * 0.3, 0, -s * 0.3, 0, s * 0.3);
  ctx.fill();
  ctx.restore();
}

function drawStar6(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.45;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    const a2 = a + Math.PI / 6;
    ctx.lineTo(Math.cos(a2) * (size * 0.45), Math.sin(a2) * (size * 0.45));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawNote(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.4, size * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(size * 0.3, -size, size * 0.12, size);
  ctx.beginPath();
  ctx.moveTo(size * 0.42, -size);
  ctx.quadraticCurveTo(size * 0.9, -size * 0.7, size * 0.42, -size * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * 0.6;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ambientRef = useRef<AmbientDot[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastMsgRef = useRef(-1);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ukeRef = useRef<HTMLDivElement>(null);
  const spotlightOffsetRef = useRef(0);
  const mouseRef = useRef({ x: 0.3, y: 0.25 });
  const [stringPaths, setStringPaths] = useState<string[]>(
    STRING_DATA.map((_, i) => {
      const x = 78 + i * 22;
      return `M${x},55 L${x},355`;
    })
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = STRING_DATA.map((s) => s.color);
    ambientRef.current = Array.from({ length: 25 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random(),
      color: colors[Math.floor(Math.random() * 4)],
      opacity: 0.15 + Math.random() * 0.15,
    }));

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", handleMouse);

    let time = 0;
    const animate = () => {
      time += 1 / 60;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const swayX = Math.sin(time * 0.785) * 30;
      spotlightOffsetRef.current = swayX;
      const cx = canvas.width / 2 + swayX;
      const grad = ctx.createRadialGradient(cx, 0, 0, cx, canvas.height * 0.6, canvas.width * 0.5);
      grad.addColorStop(0, "rgba(255,240,200,0.12)");
      grad.addColorStop(0.6, "rgba(255,240,200,0.04)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "rgba(255,240,200,1)";
      ctx.beginPath();
      const floorScale = 1 + Math.sin(time * 0.785) * 0.1;
      ctx.ellipse(cx, canvas.height * 0.78, 150 * floorScale, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (const dot of ambientRef.current) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
        ctx.globalAlpha = dot.opacity;
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1 / 60;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const alpha = Math.min(1, (p.life / p.maxLife) * 1.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;

        if (p.type === "heart") {
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy += 0.12;
          p.angle += p.angularVel;
          drawHeart(ctx, p.x, p.y, p.size, p.angle);
        } else if (p.type === "star") {
          p.angle += p.angularVel;
          p.x += Math.cos(p.angle) * 1.5 + p.vx * 0.3;
          p.y += Math.sin(p.angle) * 1.5 + p.vy * 0.3;
          p.vx *= 0.96;
          p.vy *= 0.96;
          drawStar6(ctx, p.x, p.y, p.size, p.phase + time * 2);
          continue;
        } else if (p.type === "note") {
          p.vx = Math.sin(time * 3 + p.phase) * 1.5;
          p.vy += -0.08;
          p.angle += 0.03;
          drawNote(ctx, p.x, p.y, p.size, p.angle);
        } else if (p.type === "bubble") {
          p.vy *= 0.97;
          const lifePct = 1 - p.life / p.maxLife;
          if (lifePct > 0.6 + p.phase * 0.2) {
            p.size *= 1.08;
            ctx.globalAlpha = alpha * 0.5;
          }
          drawBubble(ctx, p.x, p.y, p.size);
        }
        p.x += p.vx;
        p.y += p.vy;
      }
      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [mounted]);

  const emitParticles = useCallback((stringIdx: number, originX: number, originY: number) => {
    const isMobile = window.innerWidth < 768;
    const countMult = isMobile ? 0.5 : 1;
    const s = STRING_DATA[stringIdx];
    const counts = [20, 16, 14, 24];
    const lifespans = [1.6, 1.8, 2.0, 1.2];
    const sizes: [number, number][] = [[5, 12], [6, 14], [8, 16], [3, 8]];
    const count = Math.round(counts[stringIdx] * countMult);

    if (particlesRef.current.length > 200) {
      particlesRef.current.splice(0, particlesRef.current.length - 150);
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 4;
      particlesRef.current.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * (stringIdx === 2 ? 0.6 : 1),
        vy: stringIdx === 2 ? -(3 + Math.random() * 3) :
            stringIdx === 3 ? -(4 + Math.random() * 4) :
            Math.sin(angle) * speed,
        life: lifespans[stringIdx],
        maxLife: lifespans[stringIdx],
        size: sizes[stringIdx][0] + Math.random() * (sizes[stringIdx][1] - sizes[stringIdx][0]),
        color: s.color,
        type: s.type,
        angle: Math.random() * Math.PI * 2,
        angularVel: stringIdx === 1 ? (0.05 + Math.random() * 0.1) * (Math.random() > 0.5 ? 1 : -1) : (Math.random() - 0.5) * 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }, []);

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
    const xRatio = (78 + stringIdx * 22) / 260;
    const yRatio = 220 / 500;
    return { x: rect.left + rect.width * xRatio, y: rect.top + rect.height * yRatio };
  }, []);

  const animateString = useCallback((idx: number) => {
    const x = 78 + idx * 22;
    const rest = `M${x},55 L${x},355`;
    const frames = [
      `M${x},55 Q${x - 8},205 ${x},355`,
      rest,
      `M${x},55 Q${x + 5},205 ${x},355`,
      rest,
      `M${x},55 Q${x - 2},205 ${x},355`,
      rest,
    ];
    let frame = 0;
    const interval = setInterval(() => {
      setStringPaths((prev) => {
        const next = [...prev];
        next[idx] = frames[frame];
        return next;
      });
      frame++;
      if (frame >= frames.length) {
        clearInterval(interval);
        setStringPaths((prev) => {
          const next = [...prev];
          next[idx] = rest;
          return next;
        });
      }
    }, 55);
  }, []);

  const pluckString = useCallback((idx: number) => {
    try { playUkuleleNote(STRING_DATA[idx].freq); } catch {}
    setVibratingStrings((prev) => new Set(prev).add(idx));
    animateString(idx);
    setTimeout(() => setVibratingStrings((prev) => { const n = new Set(prev); n.delete(idx); return n; }), 340);

    setBgPulseColor(STRING_DATA[idx].color);
    setTimeout(() => setBgPulseColor(null), 3000);

    const origin = getStringOrigin(idx);
    emitParticles(idx, origin.x, origin.y);

    handleNoteCount(STRING_DATA[idx].color);
  }, [emitParticles, getStringOrigin, handleNoteCount, animateString]);

  const playChord = useCallback((chord: typeof CHORDS[0]) => {
    chord.freqs.forEach((freq, i) => {
      setTimeout(() => { try { playUkuleleNote(freq); } catch {} }, i * 30);
    });
    [0, 1, 2, 3].forEach((i) => {
      setTimeout(() => {
        setVibratingStrings((prev) => new Set(prev).add(i));
        animateString(i);
        const origin = getStringOrigin(i);
        emitParticles(i, origin.x, origin.y);
        setTimeout(() => setVibratingStrings((prev) => { const n = new Set(prev); n.delete(i); return n; }), 340);
      }, i * 80);
    });
    handleNoteCount(chord.color);
    setBgPulseColor(chord.color);
    setTimeout(() => setBgPulseColor(null), 3000);
    showToast(`Acorde de ${chord.name} 🎵`);
  }, [emitParticles, getStringOrigin, handleNoteCount, showToast, animateString]);

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

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

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
          Ukelele Virtual
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

          <svg viewBox="0 0 260 500" className="w-full h-full" style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))" }}>
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0%" stopColor="#D4892A" />
                <stop offset="30%" stopColor="#B8691A" />
                <stop offset="65%" stopColor="#8B4A0A" />
                <stop offset="100%" stopColor="#A05C14" />
              </linearGradient>
              <linearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6B3A0A" />
                <stop offset="100%" stopColor="#4A2506" />
              </linearGradient>
              <pattern id="grain" width="4" height="40" patternUnits="userSpaceOnUse">
                <path d="M2 0 Q2.5 20 2 40" stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" fill="none" />
                <path d="M1 0 Q1.8 15 1.2 40" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" fill="none" />
              </pattern>
              <radialGradient id="lacquer" cx="30%" cy="25%" rx="40%" ry="30%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="holeDepth" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000" />
                <stop offset="100%" stopColor="rgba(50,25,0,0.8)" />
              </radialGradient>
              <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#A0A0A0" />
                <stop offset="50%" stopColor="#D0D0D0" />
                <stop offset="100%" stopColor="#A0A0A0" />
              </linearGradient>
              <linearGradient id="buttonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C0C0C0" />
                <stop offset="100%" stopColor="#909090" />
              </linearGradient>
              <filter id="bodyShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="-2" dy="3" stdDeviation="4" floodColor="#3D1A00" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Headstock */}
            <path d="M90,10 Q90,0 100,0 L160,0 Q170,0 170,10 L170,55 Q170,60 165,60 L95,60 Q90,60 90,55 Z"
              fill="url(#neckGrad)" stroke="rgba(255,200,100,0.2)" strokeWidth="0.5" />
            <ellipse cx="130" cy="30" rx="25" ry="18" fill="rgba(0,0,0,0.1)" />

            {/* Tuning pegs */}
            {[18, 40].map((py, i) => (
              <g key={`peg-l-${i}`}>
                <rect x="68" y={py - 8} width="22" height="16" rx="3" fill="url(#buttonGrad)" />
                <line x1="69" y1={py - 7} x2="69" y2={py + 7} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <rect x="87" y={py - 4} width="6" height="8" rx="1" fill="#B0B0B0" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
                <rect x="91" y={py - 5} width="5" height="10" rx="1.5" fill="url(#metalGrad)" />
              </g>
            ))}
            {[18, 40].map((py, i) => (
              <g key={`peg-r-${i}`}>
                <rect x="170" y={py - 8} width="22" height="16" rx="3" fill="url(#buttonGrad)" />
                <line x1="191" y1={py - 7} x2="191" y2={py + 7} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <rect x="167" y={py - 4} width="6" height="8" rx="1" fill="#B0B0B0" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
                <rect x="164" y={py - 5} width="5" height="10" rx="1.5" fill="url(#metalGrad)" />
              </g>
            ))}

            {/* Nut */}
            <rect x="95" y="58" width="70" height="3" rx="1" fill="#F5F0E0" />

            {/* Neck */}
            <path d="M98,60 L95,240 L165,240 L162,60 Z" fill="url(#neckGrad)" />
            <line x1="97" y1="60" x2="95" y2="240" stroke="rgba(255,200,100,0.4)" strokeWidth="1" />
            <line x1="163" y1="60" x2="165" y2="240" stroke="rgba(255,200,100,0.4)" strokeWidth="1" />

            {/* Frets */}
            {[80, 98, 115, 130, 144, 157, 169, 180, 190, 199, 208, 216].map((y, i) => {
              const xL = 97 - (y - 60) * (2 / 180);
              const xR = 163 + (y - 60) * (2 / 180);
              return (
                <g key={`fret-${i}`}>
                  <line x1={xL} y1={y} x2={xR} y2={y} stroke="#C8A050" strokeWidth="2" />
                  <circle cx={xL} cy={y} r="1.5" fill="#C8A050" />
                  <circle cx={xR} cy={y} r="1.5" fill="#C8A050" />
                </g>
              );
            })}
            {[115, 144, 169, 199].map((y, i) => (
              <circle key={`inlay-${i}`} cx="130" cy={y - 7} r="3" fill="rgba(255,255,255,0.5)" />
            ))}

            {/* Body */}
            <path
              d="M130,220 C80,220 55,235 50,265 C45,295 50,330 55,350 C65,385 95,410 130,420 C165,410 195,385 205,350 C210,330 215,295 210,265 C205,235 180,220 130,220 Z"
              fill="url(#bodyGrad)" filter="url(#bodyShadow)"
            />
            <path
              d="M130,220 C80,220 55,235 50,265 C45,295 50,330 55,350 C65,385 95,410 130,420 C165,410 195,385 205,350 C210,330 215,295 210,265 C205,235 180,220 130,220 Z"
              fill="none" stroke="#C8A050" strokeWidth="2"
            />
            <path
              d="M130,220 C80,220 55,235 50,265 C45,295 50,330 55,350 C65,385 95,410 130,420 C165,410 195,385 205,350 C210,330 215,295 210,265 C205,235 180,220 130,220 Z"
              fill="url(#grain)"
            />
            <path
              d="M130,220 C80,220 55,235 50,265 C45,295 50,330 55,350 C65,385 95,410 130,420 C165,410 195,385 205,350 C210,330 215,295 210,265 C205,235 180,220 130,220 Z"
              fill="url(#lacquer)"
            />
            {[270, 290, 310, 330, 350, 370].map((y, i) => (
              <path
                key={`wg-${i}`}
                d={`M${65 + i * 2},${y} Q130,${y + (i % 2 ? 6 : -6)} ${195 - i * 2},${y}`}
                fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.8"
              />
            ))}

            {/* Sound hole */}
            <circle cx="130" cy="310" r="38" fill="none" stroke="#C8A050" strokeWidth="2" />
            <circle cx="130" cy="310" r="35" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
            <circle cx="130" cy="310" r="32" fill="none" stroke="rgba(255,200,100,0.3)" strokeWidth="1" />
            <circle cx="130" cy="310" r="30" fill="#050200" />
            <circle cx="130" cy="310" r="30" fill="url(#holeDepth)" />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const r = 36;
              const cx = 130 + Math.cos(angle) * r;
              const cy = 310 + Math.sin(angle) * r;
              return i % 2 === 0 ? (
                <circle key={`ros-${i}`} cx={cx} cy={cy} r="2" fill="#C8A050" />
              ) : (
                <rect key={`ros-${i}`} x={cx - 2} y={cy - 2} width="4" height="4"
                  transform={`rotate(45 ${cx} ${cy})`} fill="#C8A050" />
              );
            })}

            {/* Bridge */}
            <rect x="105" y="375" width="50" height="12" rx="2" fill="#3D1A00" />
            <line x1="107" y1="376" x2="153" y2="376" stroke="#F5F0E0" strokeWidth="2" />
            {[0, 1, 2, 3].map((i) => (
              <circle key={`bp-${i}`} cx={115 + i * 10} cy="383" r="2" fill="#F5F0E0" />
            ))}

            {/* Strings */}
            {STRING_DATA.map((s, i) => {
              const isVib = vibratingStrings.has(i);
              const hitW = isMobile ? 28 : 24;
              const x = 78 + i * 22;
              return (
                <g key={`string-${i}`}>
                  <rect
                    x={x - hitW / 2} y={55} width={hitW} height={320}
                    fill="transparent" cursor="pointer"
                    style={{ pointerEvents: "all" }}
                    onClick={() => pluckString(i)}
                    onTouchStart={(e) => { e.preventDefault(); pluckString(i); }}
                  />
                  <path
                    d={stringPaths[i]}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={isVib ? 2.5 : 1.5}
                    opacity={isVib ? 1 : 0.6}
                    style={{
                      filter: isVib ? `drop-shadow(0 0 4px ${s.color})` : "none",
                      transition: "opacity 0.1s, stroke-width 0.05s",
                    }}
                  />
                </g>
              );
            })}

            {/* String labels */}
            {STRING_DATA.map((s, i) => {
              const x = 78 + i * 22;
              return (
                <g key={`slbl-${i}`}>
                  <rect x={x - 10} y={390} width={20} height={14} rx={7}
                    fill={`${s.color}1A`} stroke={`${s.color}4D`} strokeWidth="1" />
                  <text x={x} y={400} textAnchor="middle" fontSize="9"
                    fill={s.color} fontFamily="'DM Sans', sans-serif">{s.note}</text>
                </g>
              );
            })}

            {/* Ripple rings */}
            {Array.from(vibratingStrings).map((idx) => {
              const cx = 78 + idx * 22;
              return [0, 1, 2].map((ring) => (
                <motion.circle
                  key={`ripple-${idx}-${ring}-${displayCount}`}
                  cx={cx} cy={220}
                  initial={{ r: 0, opacity: 0.6 }}
                  animate={{ r: 50, opacity: 0 }}
                  transition={{ duration: 0.8, delay: ring * 0.12, ease: "easeOut" }}
                  fill="none"
                  stroke={STRING_DATA[idx].color}
                  strokeWidth="1"
                />
              ));
            })}

            {/* Fret glow on chord */}
            {activeChordFrets && activeChordFrets.map((fretY, i) => (
              <motion.circle
                key={`fglow-${i}`}
                cx={78 + i * 22} cy={fretY}
                r={4}
                fill={STRING_DATA[i].color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 0.8], opacity: [0, 0.8, 0] }}
                transition={{ type: "tween", duration: 0.6, times: [0, 0.5, 1], ease: "easeInOut" }}
              />
            ))}
          </svg>

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

        <button
          onClick={() => { noteCountRef.current = 0; setDisplayCount(0); particlesRef.current = []; }}
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

    {/* Milestone overlay */}
    <AnimatePresence>
      {milestoneMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.4 }}
            style={{
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(212,83,126,0.4)',
              borderRadius: 20,
              padding: '32px 48px',
              textAlign: 'center',
              maxWidth: '80vw',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              color: 'white',
              fontWeight: 300,
              marginBottom: 8,
            }}>
              {milestoneMessage.title}
            </div>
            <div style={{
              fontFamily: 'var(--font-script)',
              fontStyle: 'italic',
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.65)',
            }}>
              {milestoneMessage.subtitle}
            </div>
          </motion.div>
        </motion.div>
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
