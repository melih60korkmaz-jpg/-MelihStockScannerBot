/** Karar defteri: oyuncunun önemli kararlarını kaydeder, 7 gün sonra ciro/kâr/müşteri/memnuniyet farkını gösterir ("yönettiğini hissettir"). */
import { hooks } from './sim';
import { dayOf } from './calendar';
import { D } from './derin';
import type { Branch, GameState } from './types';

export interface Snap { ciro: number; kar: number; musteri: number; memn: number }
export interface KararKayit { id: number; gun: number; bit: number; ad: string; sube?: number; once: Snap; sonra?: Snap; fark?: { ciro: number; kar: number; musteri: number; memn: number }; hukum?: 'iyi' | 'kotu' | 'nötr' }
export interface KararDefteri { liste: KararKayit[]; sayac: number; yeni: string[] }
export const KARAR_GUN = 7;
export function Kd(s: GameState): KararDefteri { const d = D(s); return (d.karar ??= { liste: [], sayac: 0, yeni: [] }); }
export function snap(s: GameState, b?: Branch): Snap {
  const l = (b ? b.gecmis : s.rapor).slice(-KARAR_GUN), n = Math.max(1, l.length);
  return { ciro: l.reduce((a, r) => a + r.toplamGelir, 0) / n, kar: l.reduce((a, r) => a + r.kar, 0) / n, musteri: l.reduce((a, r) => a + r.musteri, 0) / n, memn: l.length ? l.reduce((a, r) => a + r.memnuniyet, 0) / n : 0 };
}
/** Bir kararı kaydeder. Aynı karar 3 gün içinde tekrarlanırsa ayrı kayıt açılmaz (sürekli tıklamayı önler). */
export function kararKaydet(s: GameState, ad: string, bid?: number): void {
  if (!s.subeler.length) return; const k = Kd(s), now = dayOf(s); if (k.liste.some((x) => x.ad === ad && now - x.gun < 3)) return; const b = bid !== undefined ? s.subeler.find((x) => x.id === bid) : undefined;
  k.liste.unshift({ id: ++k.sayac, gun: now, bit: now + KARAR_GUN, ad, sube: b?.id, once: snap(s, b) }); if (k.liste.length > 30) k.liste.length = 30;
}
export const yuzde = (a: number, z: number): number => (z ? (a - z) / Math.abs(z) : 0);
hooks.gunOnce.push((s) => {
  const k = D(s).karar; if (!k) return; const now = dayOf(s);
  for (const x of k.liste) { if (x.sonra || now < x.bit) continue; const b = x.sube !== undefined ? s.subeler.find((y) => y.id === x.sube) : undefined; x.sonra = snap(s, b); x.fark = { ciro: yuzde(x.sonra.ciro, x.once.ciro), kar: yuzde(x.sonra.kar, x.once.kar), musteri: yuzde(x.sonra.musteri, x.once.musteri), memn: x.sonra.memn - x.once.memn };
    x.hukum = x.fark.kar > 0.03 ? 'iyi' : x.fark.kar < -0.03 ? 'kotu' : 'nötr'; const m = `📊 "${x.ad}" kararının etkisi (7 gün): ciro ${x.fark.ciro >= 0 ? '+' : ''}${Math.round(x.fark.ciro * 100)}%, kâr ${x.fark.kar >= 0 ? '+' : ''}${Math.round(x.fark.kar * 100)}%.`; s.log.unshift(m); k.yeni.push(m); }
});
