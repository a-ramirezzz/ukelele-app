"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { StringOscillator } from "@/lib/stringOscillator";
import { getStringX } from "@/lib/constants";

const INITIAL_PATHS = Array.from({ length: 4 }, (_, i) => {
  const x = getStringX(i);
  return `M${x},55 L${x},355`;
});

export function useStringOscillator() {
  const [stringPaths, setStringPaths] = useState<string[]>(INITIAL_PATHS);
  const oscillatorRef = useRef<StringOscillator | null>(null);

  useEffect(() => {
    const osc = new StringOscillator((updates) => {
      setStringPaths((prev) => {
        const next = [...prev];
        for (const { idx, path } of updates) next[idx] = path;
        return next;
      });
    });
    oscillatorRef.current = osc;
    return () => {
      osc.destroy();
      oscillatorRef.current = null;
    };
  }, []);

  const animateString = useCallback((idx: number, velocity = 1) => {
    oscillatorRef.current?.pluck(idx, velocity);
  }, []);

  return { stringPaths, animateString };
}
