/** Sentezlenmiş ses: harici dosya yok. Kafe uğultusu, hafif generatif müzik ve arayüz sesleri (WebAudio). */
let ac: AudioContext | null = null, master: GainNode | null = null, sfxG: GainNode | null = null, musG: GainNode | null = null, ambG: GainNode | null = null;
let musT = 0, sfxOn = true, musOn = true, vol = 0.6, started = false, lastDoor = 0, lastTick = 0;
const PENT = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
function ctxOk(): AudioContext | null { return ac && ac.state !== 'closed' ? ac : null; }
/** İlk kullanıcı dokunuşunda çağrılır (tarayıcı politikası). */
export function startAudio(): void {
  if (started) { void ctxOk()?.resume(); return; }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return; ac = new AC(); started = true;
    master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); sfxG = ac.createGain(); sfxG.gain.value = sfxOn ? 1 : 0; sfxG.connect(master); musG = ac.createGain(); musG.gain.value = musOn ? 0.35 : 0; musG.connect(master); ambG = ac.createGain(); ambG.gain.value = musOn ? 0.5 : 0; ambG.connect(master);
    // kafe uğultusu: kahverengi gürültü + alçak geçiren filtre + yavaş dalgalanma
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; const g = ac.createGain(); g.gain.value = 0.18; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain); lfo.start(); src.connect(lp); lp.connect(g); g.connect(ambG); src.start();
    scheduleMusic();
  } catch { /* ses desteklenmiyor */ }
}
function note(f: number, t: number, dur: number, g: number, type: OscillatorType, dest: AudioNode): void {
  const c = ctxOk(); if (!c) return; const o = c.createOscillator(), e = c.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(e); e.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function scheduleMusic(): void {
  const c = ctxOk(); if (!c || !musG) return; const t0 = c.currentTime + 0.1; let t = t0; const chord = [0, 2, 4, 1, 3][Math.floor(Math.random() * 5)]!;
  for (let i = 0; i < 8; i++) { const idx = (chord + [0, 2, 4, 2, 5, 4, 2, 1][i]!) % PENT.length; note(PENT[idx]! / 2, t, 1.9, 0.07, 'triangle', musG); if (i % 2 === 0) note(PENT[(chord) % PENT.length]! / 4, t, 3.2, 0.06, 'sine', musG); t += 1.4 + Math.random() * 0.4; }
  musT = window.setTimeout(scheduleMusic, Math.max(1000, (t - c.currentTime) * 1000 - 400));
}
export function setAudio(o: { ses?: boolean; muzik?: boolean; vol?: number }): void {
  if (o.ses !== undefined) sfxOn = o.ses; if (o.muzik !== undefined) musOn = o.muzik; if (o.vol !== undefined) vol = o.vol; const c = ctxOk(); if (!c) return;
  const t = c.currentTime; sfxG?.gain.setTargetAtTime(sfxOn ? 1 : 0, t, 0.05); musG?.gain.setTargetAtTime(musOn ? 0.35 : 0, t, 0.3); ambG?.gain.setTargetAtTime(musOn ? 0.5 : 0, t, 0.3); master?.gain.setTargetAtTime(vol, t, 0.05);
}
export function stopAudio(): void { window.clearTimeout(musT); void ac?.close(); ac = null; started = false; }
const play = (fn: (c: AudioContext, t: number, d: AudioNode) => void): void => { const c = ctxOk(); if (!c || !sfxG || !sfxOn) return; fn(c, c.currentTime, sfxG); };
export const sfx = {
  tick: () => { const n = performance.now(); if (n - lastTick < 60) return; lastTick = n; play((_c, t, d) => note(880, t, 0.06, 0.05, 'sine', d)); },
  coin: () => play((_c, t, d) => { note(988, t, 0.12, 0.09, 'square', d); note(1319, t + 0.07, 0.25, 0.08, 'square', d); }),
  door: () => { const n = performance.now(); if (n - lastDoor < 1800) return; lastDoor = n; play((_c, t, d) => { note(659, t, 0.35, 0.05, 'sine', d); note(523, t + 0.12, 0.45, 0.04, 'sine', d); }); },
  unlock: () => play((_c, t, d) => { [523, 659, 784, 1047].forEach((f, i) => note(f, t + i * 0.09, 0.4, 0.09, 'triangle', d)); }),
  ach: () => play((_c, t, d) => { [784, 988, 1175, 1568].forEach((f, i) => note(f, t + i * 0.1, 0.55, 0.1, 'triangle', d)); note(392, t, 0.9, 0.06, 'sine', d); }),
  warn: () => play((_c, t, d) => { note(330, t, 0.18, 0.08, 'sawtooth', d); note(262, t + 0.16, 0.3, 0.08, 'sawtooth', d); }),
  gun: () => play((_c, t, d) => { note(587, t, 0.5, 0.05, 'sine', d); note(784, t + 0.15, 0.6, 0.04, 'sine', d); }),
  olay: () => play((_c, t, d) => { note(698, t, 0.2, 0.07, 'triangle', d); note(880, t + 0.12, 0.3, 0.07, 'triangle', d); note(1047, t + 0.26, 0.4, 0.06, 'triangle', d); }),
  kriz: () => play((_c, t, d) => { note(220, t, 0.25, 0.09, 'sawtooth', d); note(196, t + 0.22, 0.25, 0.09, 'sawtooth', d); note(165, t + 0.44, 0.5, 0.09, 'sawtooth', d); }),
  madalya: () => play((_c, t, d) => { [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => note(f, t + i * 0.11, 0.5, 0.1, 'triangle', d)); note(262, t, 1.2, 0.07, 'sine', d); }),
  zafer: () => play((_c, t, d) => { [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, t + i * 0.13, 0.9, 0.11, 'triangle', d)); [196, 262, 330].forEach((f, i) => note(f, t + i * 0.2, 1.8, 0.07, 'sine', d)); }),
  kahve: () => play((_c, t, d) => { note(330, t, 0.08, 0.05, 'sine', d); note(392, t + 0.07, 0.1, 0.05, 'sine', d); note(494, t + 0.15, 0.2, 0.05, 'sine', d); }),
  dogru: () => play((_c, t, d) => { note(988, t, 0.1, 0.08, 'triangle', d); note(1319, t + 0.07, 0.2, 0.08, 'triangle', d); }),
  yanlis: () => play((_c, t, d) => note(147, t, 0.25, 0.08, 'square', d)),
  err: () => play((_c, t, d) => note(196, t, 0.2, 0.08, 'square', d)),
};
export const audioDurumu = (): { basladi: boolean; durum: string } => ({ basladi: started, durum: ac?.state ?? 'yok' });
