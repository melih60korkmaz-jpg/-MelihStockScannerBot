/** WebAudio ile üretilen kısa ses efektleri (dosya yok). Kapatılabilir; ilk dokunuştan sonra çalışır. */
let ctx: AudioContext | null = null, acik = true; let sayac = 0;
try { acik = localStorage.getItem('fk_ses') !== '0'; } catch { /* yok */ }
export const sesAcik = (): boolean => acik;
export function sesAyarla(v: boolean): void { acik = v; try { localStorage.setItem('fk_ses', v ? '1' : '0'); } catch { /* yok */ } }
export const sesSayac = (): number => sayac;
function ac(): AudioContext | null { if (!acik) return null; try { const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!C) return null; ctx ??= new C(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; } }
function ton(f0: number, f1: number, sure: number, tip: OscillatorType = 'sine', ses = 0.12, gec = 0): void { const c = ac(); if (!c) return; sayac++; const t = c.currentTime + gec, o = c.createOscillator(), g = c.createGain(); o.type = tip; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + sure); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ses, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + sure); o.connect(g).connect(c.destination); o.start(t); o.stop(t + sure + 0.02); }
function gurultu(sure: number, ses = 0.08, gec = 0): void { const c = ac(); if (!c) return; sayac++; const n = Math.floor(c.sampleRate * sure), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(), g = c.createGain(); g.gain.value = ses; s.buffer = b; s.connect(g).connect(c.destination); s.start(c.currentTime + gec); }
export type SesAdi = 'tik' | 'sut' | 'gol' | 'kacti' | 'dudukBasla' | 'dudukBitis' | 'basari' | 'para' | 'hata';
export function cal(ad: SesAdi): void {
  switch (ad) {
    case 'tik': ton(620, 520, 0.05, 'triangle', 0.05); break;
    case 'sut': ton(180, 70, 0.14, 'sine', 0.2); gurultu(0.06, 0.05); break;
    case 'gol': gurultu(1.1, 0.07); ton(523, 523, 0.18, 'triangle', 0.12); ton(659, 659, 0.18, 'triangle', 0.12, 0.16); ton(784, 784, 0.4, 'triangle', 0.14, 0.32); break;
    case 'kacti': ton(300, 150, 0.35, 'sawtooth', 0.06); break;
    case 'dudukBasla': ton(2100, 2100, 0.12, 'square', 0.05); ton(2100, 2100, 0.3, 'square', 0.05, 0.18); break;
    case 'dudukBitis': for (let i = 0; i < 3; i++) ton(2100, 2000, 0.25, 'square', 0.05, i * 0.32); break;
    case 'basari': ton(660, 990, 0.18, 'triangle', 0.1); break;
    case 'para': ton(1200, 1600, 0.08, 'square', 0.04); ton(1600, 2000, 0.1, 'square', 0.04, 0.08); break;
    case 'hata': ton(200, 140, 0.18, 'square', 0.06); break;
  }
}
