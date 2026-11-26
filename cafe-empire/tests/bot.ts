/** Basit oyuncu botu: insan gibi menülerden yönetir (fiyat, vardiya, personel, kampanya, yatırım, genişleme). */
import { subeAc, ilanVer, iseAl, staffLimit, invest, setPromo, toggleProduct } from '../src/core/actions';
import { step, resolveEvent, dayOf, levelOf } from '../src/core/sim';
import { priceAdvice, applyAdvice } from '../src/core/pricing';
import { autoPlan, weekGaps, maaslariGuncelle, resolveComplaint } from '../src/core/hr';
import { subeTahmini } from '../src/core/pricing';
import { ilceAc, ilceDurum, ilAc, ilDurum, ilceCost } from '../src/core/region';
import { ILCELER, ilceKey, ilcelerOf } from '../src/data/regions';
import { CITIES } from '../src/data/turkey';
import { franchiseVer, franchiseNeden } from '../src/core/franchise';
import { merkezYukselt } from '../src/core/merkez';
import type { GameState } from '../src/core/types';
import { PRODUCTS } from '../src/data/catalog';

export function botGun(s: GameState): void {
  const gun = dayOf(s);
  while (s.bekleyen.length) resolveEvent(s, s.bekleyen[0]!.id, 0);
  if (gun % 7 === 1) for (const b of s.subeler) {
    applyAdvice(b, priceAdvice(s, b)); if (weekGaps(b, gun) > 0) autoPlan(b);
    for (const q of [...b.sikayetler]) resolveComplaint(s, b, q.id, 'dinle'); maaslariGuncelle(s, b);
    if (b.hijyen < 60 && !b.staff.some((e) => e.tip === 'temizlik') && !b.ilanlar.some((i) => i.tip === 'temizlik')) ilanVer(s, b, 'temizlik', 28000);
    for (const c of b.adaylar) if (c.tip === 'temizlik' && b.staff.length < staffLimit(b)) iseAl(s, b, c.id, c.maasBeklenti);
    if (b.backlog > 250 && b.staff.length < staffLimit(b) && !b.ilanlar.length) ilanVer(s, b, 'barista', 40000);
    for (const c of b.adaylar.slice(0, 1)) if (b.staff.length < staffLimit(b)) iseAl(s, b, c.id, c.maasBeklenti);
    if (s.kasa > 250000) { setPromo(s, b, 'sabah') && 0; if (!b.promo?.sabah) setPromo(s, b, 'sabah'); if (!b.promo?.mutlu) setPromo(s, b, 'mutlu'); }
    if (levelOf(s) >= 2 && s.kasa > 600000 && !b.promo?.kart) setPromo(s, b, 'kart');
    for (const p of PRODUCTS) if (!b.menu[p.id].aktif && p.kurulum > 0 && p.kurulum * s.market.fiyat < s.kasa * 0.02 && levelOf(s) >= p.seviye) toggleProduct(s, b, p.id);
  }
  if (gun % 10 === 3) { for (const b of s.subeler) for (const id of ['espresso', 'pos', 'enerji', 'mutfak', 'soguk', 'arge', 'kurumsal'] as const) if (s.kasa > 900000) invest(s, b, id); }
  if (gun % 5 === 2) genislet(s);
  if (gun % 20 === 4 && levelOf(s) >= 4) { merkezYukselt(s, 'depo'); merkezYukselt(s, 'mutfak'); }
  if (gun % 15 === 6 && levelOf(s) >= 5) for (const d of ILCELER) { if (s.franchise.length >= 4) break; if (franchiseNeden(s, d.id, 'cadde') === null) franchiseVer(s, d.id, 'cadde'); }
}
function genislet(s: GameState): void {
  const lv = levelOf(s); const rezerv = 250000 + 60000 * s.subeler.length;
  // ilçesi açık ama şubesiz yer varsa önce şube
  for (const d of ILCELER) { const k = ilceKey(d); if (s.bolge.ilce[k] !== undefined && !s.subeler.some((b) => b.ilce === k) && s.subeler.length < 14) { const tip = s.kasa > 1.2e6 ? 'cadde' : 'mahalle'; if (subeTahmini(s, d.id, tip).net > 6000 && s.kasa > rezerv + 450000 && subeAc(s, d.il, tip, undefined, k).ok) return; } }
  // yeni ilçe: açık illerde en ucuz satılık
  let best: { d: typeof ILCELER[number]; c: number } | null = null; for (const il of Object.keys(s.bolge.il)) for (const d of ilcelerOf(+il)) { if (ilceDurum(s, d).d !== 'satilik') continue; const c = ilceCost(s, d); if (!best || c < best.c) best = { d, c }; }
  if (best && s.kasa > rezerv + best.c + 450000) { ilceAc(s, best.d); return; }
  // yeni il
  let bi: { id: number; c: number } | null = null; for (const c of CITIES) { const st = ilDurum(s, c.id, lv); if (st.d === 'satilik' && (!bi || st.bedel < bi.c)) bi = { id: c.id, c: st.bedel }; }
  if (!best && bi && s.kasa > rezerv + bi.c + 600000) ilAc(s, bi.id, lv);
}
export function oyna(s: GameState, gun: number): void { for (let i = 0; i < gun && !s.oyunBitti; i++) { botGun(s); step(s, 1440); } }
