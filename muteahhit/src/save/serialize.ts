import { SAVE_VERSION } from '../core/state';
import type { GameState } from '../core/types';
import { crc32 } from './crc32';
import { initMarket } from '../sim/land';
import { defaultSales, generateUnits } from '../sim/sales';
import { MATERIALS } from '../data';
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
  // v1 → v2 (Faz 3): makro ekonomi, haberler, geçmiş, maliyet endeksi, vergi devri
  1: (s) => {
    s.macro = { regime: 'normal', regimeSince: s.clock.day, regimeEnd: s.clock.day + 20 * 30, calmUntilDay: s.clock.day + 20 * 30, policyRate: 18, inflation: 14, confidence: 58, materialIndex: 100 };
    s.macroHistory = []; s.news = []; s.history = []; s.costIndex = 1; s.taxLossCarry = 0;
    s.meta.version = 2; return s;
  },
  // v2 → v3 (Faz 4): arsa pazarı, projeler, şehir endeksleri, zamanlanmış işler
  2: (s) => {
    s.parcels = []; s.projects = []; s.cityMarket = {}; s.scheduled = [];
    initMarket(s); s.meta.version = 3; return s;
  },
  // v3 → v4 (Faz 5): inşaat — şirket istatistikleri, proje mahalle adı, hava durumu
  3: (s) => {
    if (s.company) s.company.stats = { completed: 0, sold: 0, profit: 0 };
    for (const pr of s.projects) pr.hood = (s.parcels.find((x: any) => x.id === pr.parcelId)?.hood) ?? '';
    s.weather = { istanbul: 'acik', ankara: 'acik', izmir: 'acik' }; s.meta.version = 4; return s;
  },
  // v4 → v5 (Faz 6): malzeme stoğu/siparişler/fiyatlar, makineler, personel morali/ataması, güvenlik ve satın alma politikaları
  4: (s) => {
    s.stock = {}; s.orders = []; s.machines = []; s.matPrice = Object.fromEntries(MATERIALS.map((m) => [m.id, 1]));
    for (const x of s.staff) x.morale = 70;
    if (s.company) { s.company.safety = 'normal'; s.company.procurement = { auto: true, supplier: 'yerel' }; s.company.lastAccidentDay = -999; }
    s.meta.version = 5; return s;
  },
  // v5 → v6 (Faz 7): daireler, alacaklar, müşteri memnuniyeti; mevcut inşaat/biten projelere satış politikası + daireler
  5: (s) => {
    s.units = []; s.receivables = []; if (s.company) s.company.satisfaction = 60;
    for (const p of s.projects) if (p.status === 'insaat' || p.status === 'tamamlandi') { p.sales = defaultSales(); s.units.push(...generateUnits(s, p)); }
    s.meta.version = 6; return s;
  },
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
  if (!s.macro || typeof s.macro.policyRate !== 'number' || typeof s.macro.inflation !== 'number' || !s.macro.regime) return 'makro eksik';
  if (!Array.isArray(s.macroHistory) || !Array.isArray(s.news) || !Array.isArray(s.history)) return 'geçmiş eksik';
  if (!s.weather) return 'hava durumu eksik';
  if (!Array.isArray(s.units) || !Array.isArray(s.receivables)) return 'daire/alacak verisi eksik';
  if (!s.stock || !Array.isArray(s.orders) || !Array.isArray(s.machines) || !s.matPrice) return 'kaynak verisi eksik';
  if (!Array.isArray(s.parcels) || !Array.isArray(s.projects) || !Array.isArray(s.scheduled) || !s.cityMarket) return 'arsa/proje verisi eksik';
  if (typeof s.costIndex !== 'number' || !Number.isInteger(s.taxLossCarry)) return 'maliyet endeksi bozuk';
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
