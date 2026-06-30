export const STRING_DATA = [
  { note: "G", freq: 392.0, color: "#FF6B9D", type: "heart" as const },
  { note: "C", freq: 261.63, color: "#C77DFF", type: "star" as const },
  { note: "E", freq: 329.63, color: "#FFB347", type: "note" as const },
  { note: "A", freq: 440.0, color: "#7DF9FF", type: "bubble" as const },
];

export function getStringX(i: number): number {
  return 104 + i * 17;
}

export function getStringIdxFromSvgX(svgX: number): number | null {
  const idx = Math.round((svgX - 104) / 17);
  if (idx < 0 || idx > 3) return null;
  return idx;
}
