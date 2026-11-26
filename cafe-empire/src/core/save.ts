import type { GameState } from './types';
import { migrateBolge } from './region';
const KEY = 'cafe-empire.save.v1';
export const serialize = (s: GameState): string => JSON.stringify(s);
/** Eski kayıtlara sonradan eklenen alanları güvenle tamamlar. */
export function migrate(s: GameState): GameState {
  for (const b of s.subeler) {
    b.yat ??= {}; b.partiler ??= {}; b.minStok ??= {}; b.tedarikci ??= {}; b.kullanim ??= {}; b.siparisler ??= []; b.ilanlar ??= []; b.adaylar ??= []; b.sikayetler ??= []; b.malKalite ??= 1; b.backlog ??= 0;
    b.mesai ??= { aci: 0, kapa: 0 } as never; b.sonAdet ??= {}; b.otoSiparis ??= true;
    b.mus ??= { ortSiparis: 0, ortBekleme: 0, hizmet: 70, urunKal: 70, fiyatMemn: 70, tekrar: 0, sadik: 0, sikayet: 0 } as never;
    for (const e of b.staff) { e.vardiya ??= 'tam'; e.izin ??= 0; e.mesai ??= false as never; e.yorgunluk ??= 0; e.motivasyon ??= e.memnuniyet ?? 70; e.devam ??= 90; e.hasta ??= 0; e.prim ??= 0; e.sikayet ??= 0; }
  }
  migrateBolge(s); s.capexBugun ??= 0; s.rapor ??= []; for (const r of s.rapor) { r.cogs ??= 0; r.brut ??= 0; r.alim ??= 0; r.capex ??= 0; r.nakit ??= 0; }
  return s;
}
export function deserialize(j: string): GameState { const s = JSON.parse(j) as GameState; if (!s || s.v !== 1 || !Array.isArray(s.subeler)) throw new Error('bozuk kayıt'); return migrate(s); }
export function save(s: GameState): boolean { try { localStorage.setItem(KEY, serialize(s)); return true; } catch { return false; } }
export function load(): GameState | null { try { const j = localStorage.getItem(KEY); return j ? deserialize(j) : null; } catch { return null; } }
export function wipe(): void { try { localStorage.removeItem(KEY); } catch { /* yok say */ } }
