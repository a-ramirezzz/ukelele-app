let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

interface ProcessingChain {
  lowShelf: BiquadFilterNode;
  midPeaking: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
}

let processingChain: ProcessingChain | null = null;

export function getProcessingChain(): ProcessingChain {
  if (processingChain) return processingChain;

  const ctx = getAudioContext();

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 320;
  lowShelf.gain.value = 0;

  const midPeaking = ctx.createBiquadFilter();
  midPeaking.type = "peaking";
  midPeaking.frequency.value = 1000;
  midPeaking.Q.value = 0.7;
  midPeaking.gain.value = 0;

  const highShelf = ctx.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = 3200;
  highShelf.gain.value = 0;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  lowShelf.connect(midPeaking);
  midPeaking.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(ctx.destination);

  processingChain = { lowShelf, midPeaking, highShelf, compressor };
  return processingChain;
}

function clampDb(db: number): number {
  return Math.max(-12, Math.min(12, db));
}

export function setBassGain(db: number): void {
  const { lowShelf } = getProcessingChain();
  lowShelf.gain.setTargetAtTime(clampDb(db), getAudioContext().currentTime, 0.02);
}

export function setMidGain(db: number): void {
  const { midPeaking } = getProcessingChain();
  midPeaking.gain.setTargetAtTime(clampDb(db), getAudioContext().currentTime, 0.02);
}

export function setTrebleGain(db: number): void {
  const { highShelf } = getProcessingChain();
  highShelf.gain.setTargetAtTime(clampDb(db), getAudioContext().currentTime, 0.02);
}

export function getBassGain(): number {
  return Math.round(getProcessingChain().lowShelf.gain.value * 10) / 10;
}

export function getMidGain(): number {
  return Math.round(getProcessingChain().midPeaking.gain.value * 10) / 10;
}

export function getTrebleGain(): number {
  return Math.round(getProcessingChain().highShelf.gain.value * 10) / 10;
}

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.02); // ~20ms
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

export function playUkuleleNote(frequency: number, duration = 1.2, velocity = 1) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const v = Math.max(0, Math.min(1, velocity));

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(1, now);
  masterGain.connect(getProcessingChain().lowShelf);

  // 1. Fundamental — triangle at frequency
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(frequency, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.35 * v, now + 0.008);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + duration);

  // 2. 2nd harmonic — sine at frequency * 2
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(frequency * 2, now);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.15 * v, now + 0.008);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now);
  osc2.stop(now + duration * 0.7);

  // 3. 3rd harmonic — sine at frequency * 3 (decays fastest)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(frequency * 3, now);
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.linearRampToValueAtTime(0.06 * v, now + 0.008);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.45);
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.start(now);
  osc3.stop(now + duration * 0.45);

  // 4. Pluck transient — highpass-filtered noise burst
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(ctx);
  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = "highpass";
  hpFilter.frequency.setValueAtTime(2000, now);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.12 * v, now + 0.003);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noiseSource.connect(hpFilter);
  hpFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start(now);
  noiseSource.stop(now + 0.05);
}

export function triggerHapticPluck(velocity: number): void {
  if (!("vibrate" in navigator)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ms = Math.round(8 + (velocity - 0.3) / 0.7 * 10);
  try { navigator.vibrate(ms); } catch { /* non-critical, swallow silently */ }
}
