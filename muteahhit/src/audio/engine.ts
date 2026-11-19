import type { SettingsStore } from '../platform/settings';
import { BAR, buildMusicBus, newMusicState, scheduleBar, type MusicBus, type MusicState } from './music';

export type Sfx = 'click' | 'toggle' | 'confirm' | 'error' | 'clink' | 'stamp';
export type MusicMood = 'menu' | 'off';

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
      if (this.mood === 'menu') this.startLoop();
    } catch { this.failed = true; }
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings.value, t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(s.musicOn ? s.musicVol * 0.9 : 0, t, 0.08);
    this.sfxGain.gain.setTargetAtTime(s.sfxOn ? s.sfxVol : 0, t, 0.03);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume().catch(() => {}); }

  // ---- Müzik ----
  setMood(m: MusicMood) {
    if (m === this.mood) return;
    this.mood = m;
    if (!this.ctx) return; // unlock sonrası başlar
    if (m === 'menu') this.startLoop(); else this.fadeOutAndStop();
  }

  private startLoop() {
    const ctx = this.ctx; if (!ctx || this.timer !== null) return;
    // Her başlangıç farklı tohum: aynı müzik hep baştan aynı başlamasın
    this.st = newMusicState((Date.now() ^ 0x5bd1e995) >>> 0);
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
    }
  }
}
