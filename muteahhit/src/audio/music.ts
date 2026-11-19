/**
 * Prosedürel menü müziği: "ciddi, sinematik, siyasi/stratejik" yerine burada MÜTEAHHİT teması:
 * re minör, 72 BPM, geniş pad + sub bas + ayrık arpej + seyrek melodi + 4 barda bir yumuşak vuruş/yükseliş.
 * Aynı koda hem gerçek zamanlı (lookahead) hem OfflineAudioContext (test/render) ile çalışır.
 * Sonsuz üretken yapı: dosya döngüsü yok → döngü dikişi yok; her tur melodi/arpej değişir.
 */
export type Ctx = BaseAudioContext;

const BPM = 72;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// 8 barlık dizi: Dm | Bb | Gm | A | Dm | F | Bb | A   (MIDI notaları)
const CHORDS: { root: number; tones: number[] }[] = [
  { root: 38, tones: [50, 53, 57, 62] }, // Dm
  { root: 34, tones: [46, 50, 53, 58] }, // Bb
  { root: 43, tones: [55, 58, 62, 65] }, // Gm
  { root: 33, tones: [49, 52, 57, 61] }, // A
  { root: 38, tones: [50, 53, 57, 62] }, // Dm
  { root: 41, tones: [53, 57, 60, 65] }, // F
  { root: 34, tones: [46, 50, 53, 58] }, // Bb
  { root: 33, tones: [49, 52, 57, 64] }, // A (9)
];
// Alternatif ilerleme (tek turda bir): Dm | Gm | Bb | A | Dm | Bb | F | A — her tur farklı bir hikâye anlatır.
const ALT: Record<number, number> = { 1: 2, 2: 1, 5: 1, 6: 5 };
const SCALE = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77]; // re doğal minör, ~2 oktav

/** Tohumlu küçük RNG: müzik oyun rastgeleliğinden bağımsız (kaydı etkilemez). */
export function musicRng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeImpulse(ctx: Ctx, seconds = 2.8, decay = 2.6, rnd = musicRng(7)): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export interface MusicBus { input: AudioNode; delay: AudioNode }

/** Müzik zinciri: kuru + reverb → çıkış; `delay` arpej için ek yankı gönderimi. */
export function buildMusicBus(ctx: Ctx, out: AudioNode): MusicBus {
  const input = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 0.8;
  const wet = ctx.createGain(); wet.gain.value = 0.38;
  const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx);
  // Yankıdan kasvetli çamur birikmesin: düşük frekansı kıs
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
  input.connect(dry).connect(out);
  input.connect(hp).connect(conv).connect(wet).connect(out);
  // arpej için noktalı sekizlik yankı
  const delay = ctx.createGain();
  const dl = ctx.createDelay(2); dl.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const dlf = ctx.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2200;
  const dlOut = ctx.createGain(); dlOut.gain.value = 0.35;
  delay.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(dlOut).connect(input);
  return { input, delay };
}

function env(g: GainNode, t: number, a: number, peak: number, hold: number, r: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
}

function pad(ctx: Ctx, bus: AudioNode, t: number, dur: number, notes: number[], gain: number, cutoff: number) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
  lp.frequency.setValueAtTime(cutoff * 0.6, t); lp.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.55); lp.frequency.linearRampToValueAtTime(cutoff * 0.7, t + dur + 1.5);
  const g = ctx.createGain(); env(g, t, 1.6, gain, Math.max(0, dur - 1.6), 2.2);
  lp.connect(g).connect(bus);
  const stop = t + dur + 2.4;
  for (const n of notes) for (const det of [-7, 7]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
    const og = ctx.createGain(); og.gain.value = 1 / (notes.length * 2);
    o.connect(og).connect(lp); o.start(t); o.stop(stop);
  }
}

function bass(ctx: Ctx, bus: AudioNode, t: number, dur: number, root: number, gain: number) {
  const g = ctx.createGain(); env(g, t, 0.35, gain, Math.max(0, dur - 0.6), 1.1);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
  lp.connect(g).connect(bus);
  for (const [type, oct, lv] of [['sine', 0, 1], ['triangle', 12, 0.18]] as const) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(root + oct);
    const og = ctx.createGain(); og.gain.value = lv; o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 1.2);
  }
}

function pluck(ctx: Ctx, bus: MusicBus, t: number, midi: number, vel: number) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(midi);
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(midi + 12);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.5);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  const g2 = ctx.createGain(); g2.gain.value = 0.25;
  o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g); g.connect(bus.input); g.connect(bus.delay);
  o.start(t); o2.start(t); o.stop(t + 0.8); o2.stop(t + 0.8);
}

function lead(ctx: Ctx, bus: AudioNode, t: number, dur: number, midi: number, vel: number) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(midi);
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(midi); o2.detune.value = 5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.value = 6; // vibrato (cent)
  lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
  const g = ctx.createGain(); env(g, t, 0.18, vel, Math.max(0, dur - 0.3), 0.9);
  const g2 = ctx.createGain(); g2.gain.value = 0.3;
  o.connect(g); o2.connect(g2).connect(g); g.connect(bus);
  const stop = t + dur + 1.1; o.start(t); o2.start(t); lfo.start(t); o.stop(stop); o2.stop(stop); lfo.stop(stop);
}

function swell(ctx: Ctx, bus: AudioNode, t: number, dur: number, rnd: () => number) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(bus); src.start(t);
}

function hit(ctx: Ctx, bus: AudioNode, t: number, gain: number) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g).connect(bus); o.start(t); o.stop(t + 1.2);
}

const ARP_PATTERNS = [[0, 1, 2, 3, 2, 1, 2, 1], [0, 2, 1, 3, 1, 2, 3, 2], [3, 2, 1, 0, 1, 2, 1, 2]];

/** menu: tam sinematik; game: oyun içi arka plan (daha ince, seyrek); tense: kriz/borç baskısı (koyu, vuruşlu). */
export type MusicMode = 'menu' | 'game' | 'tense';
export interface MusicState { bar: number; rnd: () => number; arpPattern: number; variantOffset: number; mode: MusicMode }
export const newMusicState = (seed: number, mode: MusicMode = 'menu'): MusicState => { const rnd = musicRng(seed); return { bar: 0, rnd, arpPattern: 0, variantOffset: rnd() < 0.5 ? 0 : 1, mode }; };

/** [bar başlangıcı] için o barın tüm notalarını zamanlar ve bar sayacını ilerletir. */
export function scheduleBar(ctx: Ctx, mb: MusicBus, t: number, st: MusicState): void {
  const bus = mb.input;
  const bi = st.bar % 8, cycle = Math.floor(st.bar / 8);
  const alt = (cycle + st.variantOffset) % 2 === 1;
  const c = CHORDS[alt && ALT[bi] !== undefined ? ALT[bi]! : bi]!;
  const rnd = st.rnd;
  const mode = st.mode ?? 'menu', game = mode === 'game', tense = mode === 'tense';
  pad(ctx, bus, t, BAR, tense ? [...c.tones.slice(0, 3), c.tones[0]! + 1] : c.tones, game ? 0.1 : tense ? 0.15 : 0.17, tense ? 520 : game ? 700 + (cycle % 2) * 200 : 900 + (cycle % 2) * 250);
  bass(ctx, bus, t, BAR, c.root, game ? 0.22 : 0.34);
  if (tense) { if (bi % 2 === 0) hit(ctx, bus, t, 0.2); hit(ctx, bus, t + BEAT * 2, 0.08); }
  else if (bi === 0 && !game) { hit(ctx, bus, t, cycle === 0 ? 0.16 : 0.22); }
  if ((bi === 3 || bi === 7) && !game) swell(ctx, bus, t + BAR * 0.2, BAR * 0.8, rnd); // yeni tura/geçişe doğru yükseliş
  // Arpej: ilk tur sadeleştirilmiş (giriş), sonra tam
  if ((cycle > 0 || bi >= 2) && (!game || bi % 2 === 1) && !(tense && bi % 4 === 3)) {
    if (bi % 2 === 0) st.arpPattern = Math.floor(rnd() * ARP_PATTERNS.length);
    const pat = ARP_PATTERNS[st.arpPattern]!;
    pat.forEach((ti, i) => {
      if (rnd() < (game ? 0.35 : tense ? 0.05 : 0.12)) return; // doğal boşluk
      const midi = c.tones[ti]! + (tense ? 0 : 12);
      pluck(ctx, mb, t + i * (BEAT / 2) + (rnd() - 0.5) * 0.012, midi, (0.05 + rnd() * 0.035 + (i % 4 === 0 ? 0.02 : 0)) * (game ? 0.7 : 1));
    });
  }
  // Seyrek melodi (ilk turda yok)
  if (cycle > 0 && !tense && rnd() < (game ? 0.3 : 0.62)) {
    const target = c.tones[1 + Math.floor(rnd() * 2)]! + 12;
    const pool = SCALE.filter((n) => Math.abs(n - target) <= 5);
    const n1 = pool[Math.floor(rnd() * pool.length)] ?? target;
    const start = t + BEAT * (rnd() < 0.5 ? 0 : 1);
    lead(ctx, bus, start, BEAT * (2 + Math.floor(rnd() * 2)), n1, 0.075);
    if (rnd() < 0.5) { const n2 = pool[Math.floor(rnd() * pool.length)] ?? n1; lead(ctx, bus, start + BEAT * 2.5, BEAT * 1.4, n2, 0.06); }
  }
  st.bar++;
}

/** Çevrimdışı render (test/analiz): bar sayısı kadar müzik üretir. */
export function scheduleBars(ctx: Ctx, bus: MusicBus, t0: number, bars: number, st: MusicState): void {
  for (let i = 0; i < bars; i++) scheduleBar(ctx, bus, t0 + i * BAR, st);
}
