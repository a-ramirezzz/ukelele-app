export function playUkuleleNote(frequency: number, duration = 1.2) {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 0.7);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
  osc2.stop(ctx.currentTime + duration * 0.7);

  setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
}
