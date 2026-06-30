"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBassGain, getMidGain, getTrebleGain,
  setBassGain, setMidGain, setTrebleGain,
} from "@/lib/ukuleleAudio";

interface Band {
  label: string;
  value: number;
  set: (db: number) => void;
  accent: string;
}

function formatDb(v: number): string {
  if (v === 0) return "0 dB";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`;
}

function EqSlider({ band, id }: { band: Band; id: string }) {
  const pct = ((band.value + 12) / 24) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label
          htmlFor={id}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          {band.label}
        </label>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            color: band.value === 0 ? "rgba(255,255,255,0.25)" : band.accent,
            minWidth: 52,
            textAlign: "right",
            transition: "color 0.2s",
          }}
        >
          {formatDb(band.value)}
        </span>
      </div>

      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, height: 3,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
          }}
        />
        {/* Filled portion toward center */}
        <div
          style={{
            position: "absolute",
            height: 3,
            background: band.value === 0 ? "rgba(255,255,255,0.15)" : band.accent,
            borderRadius: 2,
            left: band.value >= 0 ? "50%" : `${pct}%`,
            right: band.value >= 0 ? `${100 - pct}%` : "50%",
            transition: "background 0.2s",
          }}
        />
        <input
          id={id}
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={band.value}
          onChange={(e) => band.set(parseFloat(e.target.value))}
          aria-label={band.label}
          style={{
            position: "absolute",
            left: 0, right: 0,
            width: "100%",
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            cursor: "pointer",
            margin: 0,
            padding: 0,
            height: 20,
            // thumb styles injected via style tag below
          }}
        />
      </div>

      <style>{`
        #${id}::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${band.accent};
          box-shadow: 0 0 6px ${band.accent}88;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        #${id}::-webkit-slider-thumb:hover {
          transform: scale(1.25);
          box-shadow: 0 0 10px ${band.accent}bb;
        }
        #${id}:focus-visible::-webkit-slider-thumb {
          outline: 2px solid ${band.accent};
          outline-offset: 2px;
        }
        #${id}::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: none;
          background: ${band.accent};
          box-shadow: 0 0 6px ${band.accent}88;
          cursor: pointer;
        }
        #${id}:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}

export default function EqualizerPanel() {
  const [open, setOpen] = useState(false);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);

  const bassId = useId().replace(/:/g, "bass-");
  const midId = useId().replace(/:/g, "mid-");
  const trebleId = useId().replace(/:/g, "treble-");

  useEffect(() => {
    setBass(getBassGain());
    setMid(getMidGain());
    setTreble(getTrebleGain());
  }, []);

  const handleBass = (db: number) => { setBass(db); setBassGain(db); };
  const handleMid = (db: number) => { setMid(db); setMidGain(db); };
  const handleTreble = (db: number) => { setTreble(db); setTrebleGain(db); };

  const handleReset = () => {
    handleBass(0);
    handleMid(0);
    handleTreble(0);
  };

  const bands: Band[] = [
    { label: "Bajos", value: bass, set: handleBass, accent: "#FF6B9D" },
    { label: "Medios", value: mid, set: handleMid, accent: "#C77DFF" },
    { label: "Agudos", value: treble, set: handleTreble, accent: "#7DF9FF" },
  ];

  const isActive = bass !== 0 || mid !== 0 || treble !== 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? "Cerrar ecualizador" : "Abrir ecualizador"}
        style={{
          background: open
            ? "rgba(199,125,255,0.15)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(199,125,255,0.4)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 999,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          transition: "background 0.2s, border-color 0.2s",
        }}
      >
        {/* EQ bars icon */}
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden>
          <rect x="0" y="4" width="2" height="8" rx="1" fill={isActive ? "#C77DFF" : "rgba(255,255,255,0.4)"} />
          <rect x="4" y="0" width="2" height="12" rx="1" fill={isActive ? "#FF6B9D" : "rgba(255,255,255,0.4)"} />
          <rect x="8" y="6" width="2" height="6" rx="1" fill={isActive ? "#7DF9FF" : "rgba(255,255,255,0.4)"} />
          <rect x="12" y="2" width="2" height="10" rx="1" fill={isActive ? "#C77DFF" : "rgba(255,255,255,0.4)"} />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: open ? "rgba(199,125,255,0.9)" : "rgba(255,255,255,0.35)",
            transition: "color 0.2s",
          }}
        >
          EQ
        </span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "16px 18px 14px",
              width: "min(280px, calc(100vw - 32px))",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.85rem",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.05em",
                }}
              >
                Ecualizador
              </span>
              <button
                onClick={handleReset}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.2)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
              >
                ↺ Restablecer
              </button>
            </div>

            {bands.map((band, i) => (
              <EqSlider
                key={band.label}
                band={band}
                id={[bassId, midId, trebleId][i]}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
