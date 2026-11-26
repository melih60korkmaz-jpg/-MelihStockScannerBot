import { newGame } from '../core/actions';
import { step } from '../core/sim';
import { cityById } from '../data/turkey';
import type { ShopTypeId } from '../data/catalog';
const cases: Array<[number, ShopTypeId]> = [[26, 'mahalle'], [26, 'uni'], [60, 'mahalle'], [60, 'cadde'], [16, 'cadde'], [34, 'mahalle'], [34, 'cadde'], [7, 'sahil'], [35, 'cadde'], [6, 'avm'], [27, 'cadde']];
console.log('şehir/tür'.padEnd(22), 'ay-kâr(B₺)', 'müşteri/gün', 'memnuniyet', 'kayıp%');
for (const [sehir, tip] of cases) {
  const { s, r } = newGame({ ad: 'Test', sehir, tip, seed: 7 }); if (!r.ok) { console.log(`${cityById(sehir).ad} ${tip}`.padEnd(22), r.m); continue; }
  for (let i = 0; i < 60; i++) step(s, 1440);
  const son = s.rapor.slice(-30), kar = son.reduce((a, x) => a + x.kar, 0), m = son.reduce((a, x) => a + x.musteri, 0) / 30, ky = son.reduce((a, x) => a + x.kayip, 0), mm = son.reduce((a, x) => a + x.musteri, 0);
  console.log(`${cityById(sehir).ad} ${tip}`.padEnd(22), String(Math.round(kar / 1000)).padStart(9), String(Math.round(m)).padStart(12), String(Math.round(s.subeler[0]!.memnuniyet)).padStart(10), String(Math.round(ky / (ky + mm) * 100)).padStart(8));
}
