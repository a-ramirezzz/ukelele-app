import { getStringX } from "@/lib/constants";

const VISUAL_FREQS = [22, 18, 20, 24] as const;
const DECAY_RATE = 5;

interface OscState {
  startTime: number;
  amplitude: number;
  angularFreq: number;
}

export interface PathUpdate {
  idx: number;
  path: string;
}

export type PathUpdateCallback = (updates: ReadonlyArray<PathUpdate>) => void;

export class StringOscillator {
  private states: (OscState | null)[] = [null, null, null, null];
  private rafHandle = 0;
  private onUpdate: PathUpdateCallback;

  constructor(onUpdate: PathUpdateCallback) {
    this.onUpdate = onUpdate;
  }

  pluck(idx: number, velocity = 1): void {
    const amplitude = Math.max(4, 9 * velocity);
    this.states[idx] = {
      startTime: performance.now() / 1000,
      amplitude,
      angularFreq: VISUAL_FREQS[idx],
    };
    this.startLoop();
  }

  private startLoop(): void {
    if (this.rafHandle) return;
    const loop = () => {
      const now = performance.now() / 1000;
      let anyActive = false;
      const updates: PathUpdate[] = [];

      for (let i = 0; i < 4; i++) {
        const s = this.states[i];
        if (!s) continue;
        const t = now - s.startTime;
        const disp = s.amplitude * Math.exp(-DECAY_RATE * t) * Math.cos(s.angularFreq * t);
        const x = getStringX(i);
        if (Math.abs(disp) < 0.3) {
          this.states[i] = null;
          updates.push({ idx: i, path: `M${x},55 L${x},355` });
        } else {
          anyActive = true;
          updates.push({ idx: i, path: `M${x},55 Q${x + disp},205 ${x},355` });
        }
      }

      if (updates.length > 0) {
        this.onUpdate(updates);
      }

      if (anyActive) {
        this.rafHandle = requestAnimationFrame(loop);
      } else {
        this.rafHandle = 0;
      }
    };
    this.rafHandle = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = 0;
    }
    this.states = [null, null, null, null];
  }
}
