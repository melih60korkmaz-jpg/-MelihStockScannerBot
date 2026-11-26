/** Şube uyarıları (stok, vardiya, hijyen, şikâyet, kuyruk). */
import { INGREDIENTS } from '../data/catalog';
import { dayOf } from '../core/sim';
import { minLevel } from '../core/supply';
import { gaps } from '../core/hr';
import { dateOf } from '../core/calendar';
import type { Branch, GameState } from '../core/types';
export interface Uyari { ik: string; m: string }
export function uyarilar(s: GameState, b: Branch): Uyari[] {
  const u: Uyari[] = []; const az = INGREDIENTS.filter((i) => i.id !== 'clean' && !b.siparisler.some((o) => o.ing === i.id) && (b.stok[i.id] ?? 0) < Math.max(minLevel(b, i.id), 1));
  if (!b.acik) u.push({ ik: '⏸', m: 'Kapalı' }); if (az.length) u.push({ ik: '📦', m: `Stok: ${az.slice(0, 2).map((i) => i.ad).join(', ')}` }); const g = gaps(b, dateOf(dayOf(s)).haftaGun, dayOf(s)).length; if (g) u.push({ ik: '🗓️', m: `${g} saat vardiya boş` });
  if (b.hijyen < 45) u.push({ ik: '🧽', m: 'Hijyen düşük' }); if (b.sikayetler.length) u.push({ ik: '😠', m: `${b.sikayetler.length} şikâyet` }); if (b.backlog > 400) u.push({ ik: '⏱️', m: 'Kuyruk uzun' }); if (!b.staff.length) u.push({ ik: '🚪', m: 'Personel yok' });
  return u;
}
