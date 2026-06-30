"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { STRING_DATA, getStringX } from "@/lib/constants";

export interface UkuleleSVGProps {
  stringPaths: string[];
  vibratingStrings: Set<number>;
  activeChordFrets: number[] | null;
  isMobile: boolean;
  displayCount: number;
  onStrumPointerDown: (e: React.PointerEvent<SVGRectElement>) => void;
  onStrumPointerMove: (e: React.PointerEvent<SVGRectElement>) => void;
  onStrumPointerUp: (e: React.PointerEvent<SVGRectElement>) => void;
  onStrumPointerCancel: React.PointerEventHandler<SVGRectElement>;
}

const UkuleleSVG = forwardRef<SVGSVGElement, UkuleleSVGProps>(
  function UkuleleSVG(
    { stringPaths, vibratingStrings, activeChordFrets, isMobile, displayCount, onStrumPointerDown, onStrumPointerMove, onStrumPointerUp, onStrumPointerCancel },
    ref
  ) {
    return (
      <svg ref={ref} viewBox="0 0 260 500" className="w-full h-full" style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))" }}>
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
          const x = getStringX(i);
          return (
            <g key={`string-${i}`}>
              <rect
                x={x - hitW / 2} y={55} width={hitW} height={320}
                fill="transparent"
                style={{ pointerEvents: "none" }}
              />
              <path
                d={stringPaths[i]}
                fill="none"
                stroke={s.color}
                strokeWidth={isVib ? 3.2 : 2.2}
                opacity={isVib ? 1 : 0.75}
                strokeLinecap="round"
                style={{
                  filter: isVib ? `drop-shadow(0 0 4px ${s.color})` : "none",
                  transition: "opacity 0.1s, stroke-width 0.05s",
                }}
              />
            </g>
          );
        })}

        {/* Strum overlay — captures all pointer events across the string area */}
        <rect
          x={89} y={55} width={81} height={320}
          fill="transparent"
          cursor="pointer"
          style={{ pointerEvents: "all", touchAction: "none" }}
          onPointerDown={onStrumPointerDown}
          onPointerMove={onStrumPointerMove}
          onPointerUp={onStrumPointerUp}
          onPointerCancel={onStrumPointerCancel}
        />

        {/* String labels */}
        {STRING_DATA.map((s, i) => {
          const x = getStringX(i);
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
          const cx = getStringX(idx);
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
            cx={getStringX(i)} cy={fretY}
            r={4}
            fill={STRING_DATA[i].color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 0.8], opacity: [0, 0.8, 0] }}
            transition={{ type: "tween", duration: 0.6, times: [0, 0.5, 1], ease: "easeInOut" }}
          />
        ))}
      </svg>
    );
  }
);

export default UkuleleSVG;
