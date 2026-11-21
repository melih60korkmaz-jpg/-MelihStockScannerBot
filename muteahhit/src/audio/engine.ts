import type { SettingsStore } from '../platform/settings';
import { BAR, buildMusicBus, newMusicState, scheduleBar, type MusicBus, type MusicState } from './music';

export type Sfx = 'click' | 'toggle' | 'confirm' | 'error' | 'clink' | 'stamp' | 'coin' | 'bell' | 'alarm' | 'hammer' | 'fanfare' | 'whoosh' | 'drill' | 'beep' | 'crane' | 'mixer' | 'saw';
export type MusicMood = 'menu' | 'game' | 'tense' | 'off';
export interface Ambience { on: boolean; working: boolean; weather: 'acik' | 'yagmur' | 'kar'; /** inşaat aşaması (u); verilirse aşamaya uygun sesler çalar */ stage?: number }

/**
 * Tek AudioContext, tek arka plan müziği (aynı anda ikisi çalamaz: mood değişince eskisi fade-out olur).
 * - Kullanıcı dokunuşu olmadan başlamaz (iOS/Safari kısıtı): unlock() ilk dokunuşta çağrılır.
 * - Sayfa arka plana alınınca askıya alınır, dönünce devam eder.
 * - AudioContext yoksa/başarısızsa tüm çağrılar sessizce no-op: oyun çalışmaya devam eder.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private musicGain!: GainNode; private sfxGain!: GainNode;
  private bus: MusicBus | null = null;
  private mood: MusicMood = 'off';
  private timer: number | null = null;
  private nextBar = 0;
  private st: MusicState = newMusicState(1);
  private moodGain: GainNode | null = null;
  failed = false;

  constructor(private settings: SettingsStore) {
    settings.subscribe(() => this.applyVolumes());
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => (document.hidden ? this.suspend() : this.resume()));
      addEventListener('pagehide', () => this.suspend());
    }
  }

  get state(): string { return this.ctx?.state ?? 'none'; }

  /** İlk kullanıcı dokunuşunda çağır. */
  async unlock(): Promise<void> {
    if (this.failed) return;
    try {
      // iOS 17+: sessiz anahtarı açıkken de çalsın
      const as = (navigator as any).audioSession; if (as) as.type = 'playback';
      if (!this.ctx) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) { this.failed = true; return; }
        this.ctx = new AC({ latencyHint: 'interactive' }) as AudioContext;
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
        this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
        this.musicGain = this.ctx.createGain(); this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.master); this.sfxGain.connect(this.master);
        this.master.connect(comp).connect(this.ctx.destination);
        this.applyVolumes();
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
      if (this.mood !== 'off') this.startLoop();
      this.applyAmbient();
    } catch { this.failed = true; }
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings.value, t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(s.musicOn ? s.musicVol * 0.9 : 0, t, 0.08);
    this.sfxGain.gain.setTargetAtTime(s.sfxOn ? s.sfxVol : 0, t, 0.03); this.applyAmbient();
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume().catch(() => {}); }

  // ---- Müzik ----
  setMood(m: MusicMood) {
    if (m === this.mood) return;
    const was = this.mood; this.mood = m;
    if (!this.ctx) return; // unlock sonrası başlar
    if (m === 'off') { this.fadeOutAndStop(); return; }
    if (was !== 'off' && this.timer !== null) { this.st.mode = m; return; } // aynı döngüde ton değişir, yeniden başlamaz
    this.startLoop();
  }

  private startLoop() {
    const ctx = this.ctx; if (!ctx || this.timer !== null) return;
    // Her başlangıç farklı tohum: aynı müzik hep baştan aynı başlamasın
    this.st = newMusicState((Date.now() ^ 0x5bd1e995) >>> 0, this.mood === 'off' ? 'menu' : this.mood);
    this.moodGain = ctx.createGain(); this.moodGain.gain.value = 0.0001; this.moodGain.connect(this.musicGain);
    this.moodGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.moodGain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5); // fade-in
    this.bus = buildMusicBus(ctx, this.moodGain);
    this.nextBar = ctx.currentTime + 0.15;
    const tick = () => {
      if (!this.ctx || !this.bus) return;
      // 0.6 sn ileriye kadar zamanla (zamanlayıcı kısa süre gecikse bile kesinti olmaz)
      while (this.nextBar < this.ctx.currentTime + BAR + 0.6) { scheduleBar(this.ctx, this.bus, this.nextBar, this.st); this.nextBar += BAR; }
    };
    tick(); this.timer = window.setInterval(tick, 400);
  }

  private fadeOutAndStop() {
    const ctx = this.ctx; if (!ctx) return;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    const g = this.moodGain, bus = this.bus; this.moodGain = null; this.bus = null;
    if (g) { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6); setTimeout(() => { try { g.disconnect(); } catch { /* */ } void bus; }, 4500); }
  }

  // ---- Ortam sesi (şantiye, yağmur) ----
  private amb: Ambience = { on: false, working: false, weather: 'acik' };
  private ambNodes: { rumble: GainNode; rain: GainNode } | null = null; private ambTimer: number | null = null;
  ambient(a: Ambience) { this.amb = a; this.applyAmbient(); }
  private noise(ctx: AudioContext): AudioBufferSourceNode {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let b = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5 + w * 0.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
  }
  private applyAmbient() {
    const ctx = this.ctx; if (!ctx) return;
    if (!this.ambNodes) {
      const mk = (type: BiquadFilterType, f: number) => { const s = this.noise(ctx), fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.0001; s.connect(fl).connect(g).connect(this.sfxGain); s.start(); return g; };
      this.ambNodes = { rumble: mk('lowpass', 260), rain: mk('highpass', 2400) };
    }
    const t = ctx.currentTime, a = this.amb, on = a.on && this.settings.value.sfxOn;
    this.ambNodes.rumble.gain.setTargetAtTime(on ? (a.working ? 0.16 : 0.07) : 0.0001, t, 0.6);
    this.ambNodes.rain.gain.setTargetAtTime(on && a.weather === 'yagmur' ? 0.07 : 0.0001, t, 0.8);
    if (on && a.working && this.ambTimer === null) { const tick = () => { if (this.amb.on && this.amb.working) this.sfx(this.pickSite()); this.ambTimer = window.setTimeout(tick, 1400 + Math.random() * 3200); }; this.ambTimer = window.setTimeout(tick, 800); }
    if ((!on || !a.working) && this.ambTimer !== null) { clearTimeout(this.ambTimer); this.ambTimer = null; }
  }

  /** Aşamaya göre şantiye sesi: kazıda iş makinesi ve geri vites bipi, betonda mikser, yapımda matkap/testere/çekiç, vinç gıcırtısı. */
  private pickSite(): Sfx {
    const st = this.amb.stage, r = Math.random(); if (st === undefined) return r < 0.6 ? 'hammer' : 'clink';
    if (st < 7) return r < 0.45 ? 'beep' : r < 0.8 ? 'mixer' : 'clink';
    if (st < 11) return r < 0.4 ? 'mixer' : r < 0.6 ? 'beep' : r < 0.8 ? 'crane' : 'hammer';
    if (st < 16) return r < 0.28 ? 'drill' : r < 0.5 ? 'hammer' : r < 0.68 ? 'saw' : r < 0.84 ? 'crane' : 'clink';
    return r < 0.4 ? 'saw' : r < 0.7 ? 'clink' : 'beep';
  }

  // ---- Efektler ----
  sfx(kind: Sfx) {
    const ctx = this.ctx; if (!ctx || ctx.state !== 'running' || !this.settings.value.sfxOn) return;
    const t = ctx.currentTime, out = this.sfxGain;
    const tone = (f: number, dur: number, vol: number, type: OscillatorType = 'sine', at = 0, f2?: number) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + at + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(vol, t + at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(out); o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    switch (kind) {
      case 'click': tone(1400, 0.05, 0.16, 'triangle', 0, 900); tone(220, 0.06, 0.1, 'sine'); break;
      case 'toggle': tone(660, 0.07, 0.14, 'triangle'); tone(990, 0.09, 0.1, 'triangle', 0.05); break;
      case 'confirm': tone(523, 0.14, 0.15, 'triangle'); tone(784, 0.22, 0.16, 'triangle', 0.09); tone(1047, 0.3, 0.1, 'sine', 0.18); break;
      case 'error': tone(150, 0.22, 0.2, 'sawtooth', 0, 110); break;
      case 'clink': // metal tınısı: uyumsuz kısmi sesler
        for (const [f, v] of [[1180, 0.12], [1763, 0.08], [2951, 0.05]] as const) tone(f, 0.55, v, 'sine'); break;
      case 'stamp': tone(110, 0.28, 0.35, 'sine', 0, 45); tone(2400, 0.04, 0.1, 'square'); break;
      case 'coin': tone(1568, 0.09, 0.12, 'square'); tone(2093, 0.28, 0.12, 'square', 0.07); tone(3136, 0.35, 0.05, 'sine', 0.07); break;
      case 'bell': tone(880, 0.6, 0.12, 'sine'); tone(1320, 0.5, 0.07, 'sine', 0.01); tone(1760, 0.4, 0.04, 'sine', 0.02); tone(880, 0.6, 0.08, 'sine', 0.35); break;
      case 'alarm': for (let i = 0; i < 3; i++) { tone(520, 0.16, 0.16, 'sawtooth', i * 0.22, 420); tone(390, 0.16, 0.1, 'square', i * 0.22 + 0.01); } break;
      case 'hammer': tone(180, 0.07, 0.12, 'triangle', 0, 90); tone(2200, 0.03, 0.05, 'square'); tone(180, 0.07, 0.08, 'triangle', 0.18, 90); break;
      case 'fanfare': for (const [f, at] of [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]] as const) { tone(f, 0.34, 0.13, 'triangle', at); tone(f * 2, 0.3, 0.04, 'sine', at); } tone(1047, 0.8, 0.12, 'triangle', 0.5); tone(1319, 0.8, 0.08, 'triangle', 0.5); break;
      case 'whoosh': tone(300, 0.14, 0.05, 'sine', 0, 700); break;
      case 'drill': for (let i = 0; i < 7; i++) tone(260 + (i % 2) * 30, 0.07, 0.05, 'sawtooth', i * 0.075, 330); break;
      case 'beep': tone(1000, 0.16, 0.06, 'square'); tone(1000, 0.16, 0.06, 'square', 0.3); tone(1000, 0.16, 0.06, 'square', 0.6); break;
      case 'crane': tone(95, 0.9, 0.06, 'sawtooth', 0, 70); tone(140, 0.8, 0.03, 'triangle', 0.1, 100); break;
      case 'mixer': tone(70, 1.4, 0.08, 'sawtooth', 0, 62); tone(105, 1.3, 0.04, 'triangle', 0.05, 95); break;
      case 'saw': tone(900, 0.5, 0.05, 'sawtooth', 0, 1250); tone(1800, 0.5, 0.025, 'square', 0, 2300); break;
    }
  }
}
