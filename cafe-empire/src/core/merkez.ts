import { hooks, levelOf } from './sim';
import { merkezDef, merkezGunluk, type MerkezId } from './merkezCore';
import type { GameState } from './types';
export { MERKEZ, merkezIndirim, nakliyeCarpan, merkezRaf, merkezGunluk } from './merkezCore';
export interface MRes { ok: boolean; m: string }
export function merkezBedel(s: GameState, id: MerkezId): number { const d = merkezDef(id), l = s.merkez[id]; return Math.round(d.maliyet[Math.min(l, d.max - 1)]! * s.market.fiyat / 5000) * 5000; }
export function merkezYukselt(s: GameState, id: MerkezId): MRes {
  const d = merkezDef(id), l = s.merkez[id]; if (l >= d.max) return { ok: false, m: 'Zaten en üst seviye.' }; if (levelOf(s) < d.seviye) return { ok: false, m: `Kafe seviyesi ${d.seviye} gerekir.` }; if (s.subeler.length + s.franchise.length < d.sube) return { ok: false, m: `En az ${d.sube} şube/bayi gerekir.` };
  const c = merkezBedel(s, id); if (s.kasa < c) return { ok: false, m: 'Kasa yetersiz.' }; s.kasa -= c; s.capexBugun += c; s.merkez[id] = l + 1; return { ok: true, m: `${d.ad} seviye ${l + 1} (−${Math.round(c)} ₺).` };
}
hooks.gunOnce.push((s, toplam) => { const g = merkezGunluk(s); if (g > 0) { toplam.gider.bakim += g; s.kasa -= g; } });
