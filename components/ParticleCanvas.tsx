"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { STRING_DATA } from "@/lib/constants";

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

export interface ParticleCanvasHandle {
  emit(stringIdx: number, originX: number, originY: number): void;
  clearParticles(): void;
}

export interface ParticleCanvasProps {
  mounted: boolean;
  onMouseMove?: (x: number, y: number) => void;
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

const ParticleCanvas = forwardRef<ParticleCanvasHandle, ParticleCanvasProps>(
  function ParticleCanvas({ mounted, onMouseMove }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const ambientRef = useRef<AmbientDot[]>([]);
    const animFrameRef = useRef<number>(0);
    const onMouseMoveRef = useRef(onMouseMove);
    useEffect(() => { onMouseMoveRef.current = onMouseMove; }, [onMouseMove]);

    useImperativeHandle(ref, () => ({
      emit(stringIdx: number, originX: number, originY: number) {
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
      },
      clearParticles() {
        particlesRef.current = [];
      },
    }), []);

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
        onMouseMoveRef.current?.(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
      };
      window.addEventListener("mousemove", handleMouse);

      let time = 0;
      const animate = () => {
        time += 1 / 60;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const swayX = Math.sin(time * 0.785) * 30;
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

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
  }
);

export default ParticleCanvas;
