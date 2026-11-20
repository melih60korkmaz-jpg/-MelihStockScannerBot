/** Kalıcı kullanıcı tercihleri. localStorage erişilemezse (gizli mod) bellekte çalışır. */
export type Quality = 'auto' | 'low' | 'mid' | 'high';
export type Motion = 'full' | 'reduced';
export type Fx = 'full' | 'calm'; // sahne/kutlama yoğunluğu: calm = konfeti ve büyük sahneler yerine sade bildirim

export interface Settings {
  musicOn: boolean; musicVol: number;   // 0–1
  sfxOn: boolean; sfxVol: number;
  haptics: boolean;
  autoResume: boolean;                  // açılışta son kayıttan otomatik devam
  motion: Motion;
  fx: Fx;
  quality: Quality;
}

const KEY = 'muteahhit.settings.v1';
const clamp01 = (n: unknown, d: number) => (typeof n === 'number' && isFinite(n) ? Math.min(1, Math.max(0, n)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function defaults(): Settings {
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* yok say */ }
  return { musicOn: true, musicVol: 0.7, sfxOn: true, sfxVol: 0.8, haptics: true, autoResume: true, motion: reduced ? 'reduced' : 'full', fx: 'full', quality: 'auto' };
}

/** Bozuk/eksik/yabancı veriyi güvenli değerlere çevirir. */
export function sanitize(raw: unknown, base: Settings = defaults()): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    musicOn: bool(r.musicOn, base.musicOn), musicVol: clamp01(r.musicVol, base.musicVol),
    sfxOn: bool(r.sfxOn, base.sfxOn), sfxVol: clamp01(r.sfxVol, base.sfxVol),
    haptics: bool(r.haptics, base.haptics), autoResume: bool(r.autoResume, base.autoResume),
    motion: r.motion === 'full' || r.motion === 'reduced' ? r.motion : base.motion,
    fx: r.fx === 'full' || r.fx === 'calm' ? r.fx : base.fx,
    quality: r.quality === 'auto' || r.quality === 'low' || r.quality === 'mid' || r.quality === 'high' ? r.quality : base.quality,
  };
}

type Listener = (s: Settings, changed: keyof Settings) => void;

export class SettingsStore {
  value: Settings;
  private ls: Pick<Storage, 'getItem' | 'setItem'> | null;
  private listeners = new Set<Listener>();

  constructor(storage?: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.ls = storage === undefined ? (() => { try { return localStorage; } catch { return null; } })() : storage;
    let parsed: unknown = null;
    try { const t = this.ls?.getItem(KEY); if (t) parsed = JSON.parse(t); } catch { /* bozuk → varsayılan */ }
    this.value = sanitize(parsed);
  }
  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  set<K extends keyof Settings>(k: K, v: Settings[K]) {
    this.value = sanitize({ ...this.value, [k]: v }, this.value);
    try { this.ls?.setItem(KEY, JSON.stringify(this.value)); } catch { /* kota/gizli mod: oturum içinde geçerli kalır */ }
    for (const l of this.listeners) l(this.value, k);
  }
  get reduced() { return this.value.motion === 'reduced'; }
  /** Büyük kutlama/sahne gösterilsin mi (hareket azaltma veya sakin mod kapatır). */
  get bigFx() { return this.value.motion === 'full' && this.value.fx === 'full'; }
}
