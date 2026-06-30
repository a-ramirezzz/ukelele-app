let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

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

export function playUkuleleNote(frequency: number, duration = 1.2) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(1, now);
  masterGain.connect(ctx.destination);

  // 1. Fundamental — triangle at frequency
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(frequency, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.35, now + 0.008);
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
  gain2.gain.linearRampToValueAtTime(0.15, now + 0.008);
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
  gain3.gain.linearRampToValueAtTime(0.06, now + 0.008);
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
  noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.003);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noiseSource.connect(hpFilter);
  hpFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start(now);
  noiseSource.stop(now + 0.05);
}
