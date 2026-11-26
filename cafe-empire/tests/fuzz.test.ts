import { describe, expect, it } from 'vitest';
import { newGame, subeAc, setPrice, toggleProduct, orderIng, startAd, takeLoan, payLoan, upgrade, invest, setPromo, setGununUrunu, closeBranch, ilanVer, iseAl, isCikar, staffLimit } from '../src/core/actions';
import { step, resolveEvent } from '../src/core/sim';
import { PRODUCTS, INGREDIENTS, ADS, UPGRADES, STAFF_TYPES, SHOP_TYPES } from '../src/data/catalog';
import { INVESTS } from '../src/core/invest';
import { ilAc, ilceAc, ilDurum, ilceDurum } from '../src/core/region';
import { ILCELER, ilcelerOf } from '../src/data/regions';
import { CITIES } from '../src/data/turkey';
import { franchiseVer, franchiseDestek, franchiseDenetim, franchiseSonlandir } from '../src/core/franchise';
import { merkezYukselt } from '../src/core/merkez';
import { priceAdvice, applyAdvice, copyMenu } from '../src/core/pricing';
import { setShift, setLeave, toggleOvertime, autoPlan, giveBonus, train, promote, evaluate, transferStaff, TRAININGS } from '../src/core/hr';
import { transferStock } from '../src/core/supply';
import { levelOf } from '../src/core/sim';
import { serialize, deserialize } from '../src/core/save';
import { mulberry } from './util-rng';

function kontrol(s: ReturnType<typeof newGame>['s'], neden: string): void {
  const fin = (v: number, a: string): void => { if (!Number.isFinite(v)) throw new Error(`${neden}: ${a} sonlu değil (${v})`); };
  fin(s.kasa, 'kasa'); fin(s.borc, 'borç'); fin(s.marka_puani, 'marka'); if (s.borc < -1) throw new Error(neden + ': borç negatif');
  for (const b of s.subeler) { for (const k of Object.keys(b.stok)) { const v = (b.stok as Record<string, number>)[k]!; fin(v, 'stok ' + k); if (v < -0.001) throw new Error(`${neden}: stok negatif ${k} ${v}`); }
    for (const p of PRODUCTS) { const m = b.menu[p.id]; fin(m.fiyat, 'fiyat'); if (m.fiyat < 0.59 || m.fiyat > 2.01) throw new Error(`${neden}: fiyat aralık dışı ${p.id} ${m.fiyat}`); }
    fin(b.memnuniyet, 'memn'); fin(b.marka, 'marka'); fin(b.kira, 'kira'); fin(b.backlog, 'backlog'); if (b.hijyen < 0 || b.hijyen > 100) throw new Error(neden + ': hijyen');
    for (const e of b.staff) { fin(e.maas, 'maas'); fin(e.yorgunluk, 'yorgunluk'); if (e.maas <= 0) throw new Error(neden + ': maaş<=0'); if (e.yorgunluk < 0 || e.yorgunluk > 100) throw new Error(neden + ': yorgunluk ' + e.yorgunluk); }
    if (!b.staff.length && s.bekleyen.length > 5) throw new Error(neden + ': olay yığılması'); }
  for (const r of s.rapor) { fin(r.toplamGelir, 'gelir'); fin(r.toplamGider, 'gider'); fin(r.kar, 'kar'); fin(r.nakit, 'nakit'); }
  for (const f of s.franchise) { fin(f.kalite, 'fr kalite'); if (f.kalite < 0 || f.kalite > 100) throw new Error(neden + ': fr kalite'); }
  if (s.bekleyen.length > 12) throw new Error(neden + ': bekleyen olay birikti');
}
describe('rastgele eylem dizileri (fuzz)', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) it(`seed ${seed}: 500 gün rastgele yönetim, değişmezler korunur ve kayıt/yükleme tutarlı`, () => {
    const R = mulberry(seed * 7919), pick = <T,>(a: readonly T[]): T => a[Math.floor(R() * a.length)]!;
    const s = newGame({ ad: 'F', sehir: 34, tip: pick(['mahalle', 'cadde', 'uni'] as const), seed, kasa: 3e6, ilce: pick(ilcelerOf(34)).ad ? `34:${pick(ilcelerOf(34)).ad}` : undefined }).s; s.hiz = 1;
    for (let gun = 0; gun < 500 && !s.oyunBitti; gun++) {
      const n = 1 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const b = pick(s.subeler); const a = Math.floor(R() * 34);
        try { switch (a) {
          case 0: setPrice(b, pick(PRODUCTS).id, 0.5 + R() * 2); break; case 1: toggleProduct(s, b, pick(PRODUCTS).id); break; case 2: orderIng(s, b, pick(INGREDIENTS).id, 1 + Math.floor(R() * 8)); break; case 3: startAd(s, b, pick(ADS).id); break;
          case 4: takeLoan(s, 100000 * (1 + Math.floor(R() * 8))); break; case 5: payLoan(s, 50000 * (1 + Math.floor(R() * 10))); break; case 6: upgrade(s, b, pick(UPGRADES).id); break; case 7: invest(s, b, pick(INVESTS).id); break;
          case 8: setPromo(s, b, pick(['sabah', 'ogrenci', 'mutlu', 'kart', 'yetkiFiyat'] as const)); break; case 9: setGununUrunu(s, b, pick(PRODUCTS).id); break;
          case 10: { const c = pick(CITIES); ilAc(s, c.id, levelOf(s)); break; } case 11: { const d = pick(ILCELER); ilceAc(s, d); break; }
          case 12: { const d = pick(ILCELER.filter((x) => s.bolge.ilce[`${x.il}:${x.ad}`] !== undefined)); if (d) subeAc(s, d.il, pick(SHOP_TYPES).id, undefined, `${d.il}:${d.ad}`); break; }
          case 13: { const d = pick(ILCELER); franchiseVer(s, d.id, pick(SHOP_TYPES).id); break; } case 14: if (s.franchise.length) { const f = pick(s.franchise); pick([() => franchiseDestek(s, f.id, R() < 0.5 ? -1 : 1), () => franchiseDenetim(s, f.id), () => (R() < 0.15 ? franchiseSonlandir(s, f.id) : 0)])(); } break;
          case 15: merkezYukselt(s, pick(['depo', 'mutfak'] as const)); break; case 16: { const o = priceAdvice(s, b); if (R() < 0.5) applyAdvice(b, o); break; } case 17: if (s.subeler.length > 1) copyMenu(s, b); break;
          case 18: { const e = pick(b.staff); if (e) setShift(e, pick(['sabah', 'ogle', 'aksam', 'tam'] as const)); break; } case 19: { const e = pick(b.staff); if (e) setLeave(e, Math.floor(R() * 7)); break; } case 20: { const e = pick(b.staff); if (e) toggleOvertime(e); break; }
          case 21: autoPlan(b); break; case 22: { const e = pick(b.staff); if (e) giveBonus(s, b, e, 3000); break; } case 23: { const e = pick(b.staff); if (e) train(s, b, e, pick(TRAININGS).id); break; } case 24: { const e = pick(b.staff); if (e) promote(s, b, e); break; }
          case 25: { const e = pick(b.staff); if (e) evaluate(s, e); break; } case 26: ilanVer(s, b, pick(STAFF_TYPES).id, 30000); break; case 27: { const c = pick(b.adaylar); if (c) iseAl(s, b, c.id, c.maasBeklenti); break; }
          case 28: if (b.staff.length > 3 && R() < 0.4) isCikar(s, b, pick(b.staff).id); break; case 29: if (s.subeler.length > 1) { const to = pick(s.subeler); const e = pick(b.staff); if (e && to !== b) transferStaff(s, b, to, e.id); } break;
          case 30: if (s.subeler.length > 1) { const to = pick(s.subeler); if (to !== b) transferStock(s, b, to, pick(INGREDIENTS).id, 500); } break; case 31: if (s.subeler.length > 2 && R() < 0.1) closeBranch(s, b.id); break;
          case 32: b.otoSiparis = R() < 0.8; break; case 33: b.acik = R() < 0.9; break; default: break; } } catch (e) { throw new Error(`gün ${gun} eylem ${a}: ${(e as Error).message}`); }
      }
      step(s, 1440); while (s.bekleyen.length) { const p = s.bekleyen[0]!; resolveEvent(s, p.id, Math.floor(R() * p.secenek.length)); }
      if (gun % 25 === 0) kontrol(s, `gün ${gun}`);
    }
    kontrol(s, 'son'); const y = deserialize(serialize(s)); expect(y.subeler.length).toBe(s.subeler.length); expect(y.kasa).toBe(s.kasa); expect(y.bolge).toEqual(s.bolge); void ilDurum; void ilceDurum;
  }, 240000);
});
