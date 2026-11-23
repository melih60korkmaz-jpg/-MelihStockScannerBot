import type { GameState } from '../core/types';
import { netWorth } from './finance';

/**
 * Açılma sistemi: her sistem şirket seviyesi, itibar ve sermaye koşuluna bağlıdır. Koşullar oyuncuya açıkça gösterilir.
 * Küçük şirket: temel inşaat ve gayrimenkul · Gelişen: tedarik, makine, kiralama · Büyük: altyapı, işletme, enerji · Holding: iştirak, satın alma, borsa.
 */
export interface UnlockDef { id: string; label: string; level: number; rep?: number; nw?: number; tier: 'kucuk' | 'gelisen' | 'buyuk' | 'holding' }
export const UNLOCKS: UnlockDef[] = [
  { id: 'yonetim', label: 'Yönetim Merkezi', level: 2, tier: 'kucuk' },
  { id: 'kurul', label: 'Yönetim kurulu', level: 3, tier: 'gelisen', rep: 20 },
  { id: 'gayrimenkul', label: 'Gayrimenkul Yönetimi', level: 2, tier: 'kucuk' },
  { id: 'tedarik', label: 'Satın Alma ve Tedarik', level: 1, tier: 'kucuk' },
  { id: 'makine', label: 'Makine Parkı', level: 3, tier: 'gelisen' },
  { id: 'altyapi', label: 'Altyapı ve Taahhüt', level: 5, tier: 'buyuk', rep: 35 },
  { id: 'isletme', label: 'İşletmeler', level: 4, tier: 'buyuk' },
  { id: 'fabrika', label: 'Fabrikalar (sanayi üretimi)', level: 4, tier: 'buyuk' },
  { id: 'enerji', label: 'Enerji Şirketi', level: 5, tier: 'buyuk' },
  { id: 'iştirak', label: 'İştirakler ve holding', level: 6, tier: 'holding', nw: 200_000_000 },
  { id: 'borsa', label: 'Yatırım ve Borsa', level: 6, tier: 'holding', rep: 45 },
  { id: 'satinalma', label: 'Şirket satın alma', level: 6, tier: 'holding' },
];
export const unlockDef = (id: string) => UNLOCKS.find((u) => u.id === id);
export interface UnlockState { open: boolean; missing: string[] }
/** Açıklayıcı durum: eksik koşullar metin olarak döner. */
export function unlockState(s: GameState, id: string): UnlockState {
  const d = unlockDef(id), c = s.company; if (!d || !c) return { open: false, missing: ['Şirket yok'] };
  const missing: string[] = [];
  if (c.level < d.level) missing.push(`Şirket seviyesi ${d.level} (şu an ${c.level})`);
  if (d.rep !== undefined && c.reputation < d.rep) missing.push(`İtibar ${d.rep} (şu an ${Math.round(c.reputation)})`);
  if (d.nw !== undefined && netWorth(s) < d.nw * 100) missing.push(`Net varlık ${(d.nw / 1e6).toFixed(0)} M₺`);
  return { open: missing.length === 0, missing };
}
export const isUnlocked = (s: GameState, id: string): boolean => unlockState(s, id).open;
