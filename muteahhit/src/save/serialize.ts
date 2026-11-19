import { SAVE_VERSION } from '../core/state';
import type { GameState } from '../core/types';
import { crc32 } from './crc32';
import { STREAMS } from '../core/rng';

export interface SaveEnvelope {
  format: 'muteahhit-save';
  version: number;
  savedAt: number;       // gerçek zaman (ms) — yalnızca bilgi
  summary: { company: string; day: number; cash: number }; // kayıt listesi için, yüklemeden okunur
  checksum: number;      // payload'ın CRC32'si
  payload: string;       // JSON(GameState)
}

export type LoadResult =
  | { ok: true; state: GameState; migrated: boolean }
  | { ok: false; reason: 'bozuk' | 'sağlama' | 'gelecek-sürüm' | 'yapı'; detail: string };

/** v(n) → v(n+1) dönüştürücüler. Şema değişince buraya eklenir; eski kayıtlar açılabilir kalır. */
export const MIGRATIONS: Record<number, (s: any) => any> = {
  // 1: (s) => { ...; s.meta.version = 2; return s; },
};

export function pack(state: GameState, now = Date.now()): string {
  const payload = JSON.stringify(state);
  const env: SaveEnvelope = {
    format: 'muteahhit-save', version: state.meta.version, savedAt: now,
    summary: { company: state.company?.name ?? '', day: state.clock.day, cash: state.company?.cash ?? 0 },
    checksum: crc32(payload), payload,
  };
  return JSON.stringify(env);
}

/** Yapısal doğrulama: eksik/yanlış tipli kayıt oyuna girmeden yakalanır. */
export function validateState(s: any): string | null {
  if (!s || typeof s !== 'object') return 'durum nesnesi yok';
  if (!s.meta || typeof s.meta.seed !== 'number') return 'meta eksik';
  if (!s.clock || !Number.isInteger(s.clock.day) || s.clock.day < 0) return 'saat bozuk';
  if (!s.rng || STREAMS.some((k) => typeof s.rng[k] !== 'number')) return 'rng eksik';
  if (!Number.isInteger(s.nextId)) return 'nextId bozuk';
  if (!Array.isArray(s.staff) || !Array.isArray(s.ledger)) return 'liste eksik';
  if (!Number.isInteger(s.ledgerBase)) return 'ledgerBase bozuk';
  if (s.company) {
    if (!Number.isInteger(s.company.cash)) return 'kasa bozuk';
    const sum = s.ledger.reduce((a: number, e: any) => a + e.amount, 0);
    if (s.company.cash !== s.ledgerBase + sum) return 'ekonomi tutarsız (kasa ≠ defter)';
  }
  return null;
}

export function unpack(text: string): LoadResult {
  let env: SaveEnvelope;
  try { env = JSON.parse(text); } catch { return { ok: false, reason: 'bozuk', detail: 'JSON okunamadı' }; }
  if (env?.format !== 'muteahhit-save' || typeof env.payload !== 'string') return { ok: false, reason: 'bozuk', detail: 'kayıt biçimi tanınmadı' };
  if (crc32(env.payload) !== env.checksum) return { ok: false, reason: 'sağlama', detail: 'sağlama toplamı uyuşmuyor' };
  if (env.version > SAVE_VERSION) return { ok: false, reason: 'gelecek-sürüm', detail: `kayıt v${env.version}, oyun v${SAVE_VERSION}` };
  let state: any;
  try { state = JSON.parse(env.payload); } catch { return { ok: false, reason: 'bozuk', detail: 'içerik okunamadı' }; }
  let migrated = false;
  while (state.meta?.version < SAVE_VERSION) {
    const m = MIGRATIONS[state.meta.version];
    if (!m) return { ok: false, reason: 'yapı', detail: `v${state.meta.version} için migrasyon yok` };
    state = m(state); migrated = true;
  }
  const bad = validateState(state);
  if (bad) return { ok: false, reason: 'yapı', detail: bad };
  return { ok: true, state: state as GameState, migrated };
}
