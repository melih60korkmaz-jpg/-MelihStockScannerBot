import { newGameState } from '../core/state';
import { dispatch } from '../core/commands';
import { BUILDING_TYPES, QUALITIES, CITY_DATA } from '../data';
import { askPrice, marketParcels } from '../sim/land';
import { planProject } from '../sim/projects';

/** Arsa/proje denge raporu: `npm run sim:land -- [tohum sayısı]` — asking fiyatından alınıp en iyi tip/kalite ile yapılırsa marj dağılımı. */
const N = Number(process.argv[2] ?? 40);
const best: number[] = [], all: number[] = []; const byDist = new Map<string, number[]>(), byType = new Map<string, number[]>(); let noBuildable = 0, total = 0, loss = 0; const wins = new Map<string, number>(), starter = new Map<string, number[]>();
for (let i = 0; i < N; i++) {
  const s = newGameState(2000 + i); dispatch(s, 'CreateCompany', { name: 'T', founderBackground: 'emlakci', startCity: 'ankara' });
  for (const p of marketParcels(s)) {
    total++; let top = -Infinity, topT = '';
    for (const t of BUILDING_TYPES) for (const q of QUALITIES) {
      const pl = planProject(s, p, t.id, q.id); if (!pl.ok) continue;
      all.push(pl.margin); if (pl.margin > top) { top = pl.margin; topT = `${t.id}/${q.id}`; }
      const k = `${t.id}/${q.id}`; byType.set(k, [...(byType.get(k) ?? []), pl.margin]);
    }
    if (top === -Infinity) { noBuildable++; continue; }
    best.push(top); if (top < 0) loss++; const tt = topT.split('/')[0]!; wins.set(tt, (wins.get(tt) ?? 0) + 1);
    if (p.area <= 280 && p.zoning === 'konut') for (const t of BUILDING_TYPES) { const pl = planProject(s, p, t.id, 'standart'); if (pl.ok) starter.set(t.id, [...(starter.get(t.id) ?? []), pl.margin]); }
    const k = `${p.city}/${p.district}`; byDist.set(k, [...(byDist.get(k) ?? []), top]); void topT;
  }
}
const q = (a: number[], f: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * f))]!;
const pct = (x: number) => `%${(x * 100).toFixed(1)}`;
console.log(`${total} ilan (${N} tohum) · hiçbir tip yapılamayan %${(noBuildable / total * 100).toFixed(1)} · en iyi seçenekle bile zarar eden %${(loss / best.length * 100).toFixed(1)}`);
console.log(`En iyi seçenek marjı: p10 ${pct(q(best, 0.1))} · medyan ${pct(q(best, 0.5))} · p90 ${pct(q(best, 0.9))}`);
console.log(`Tüm geçerli kombinasyonlar: medyan ${pct(q(all, 0.5))} · zarar eden %${(all.filter((x) => x < 0).length / all.length * 100).toFixed(0)}`);
console.log('Bölge (en iyi marj medyanı):', [...byDist].map(([k, v]) => `${k.split('/')[1]} ${pct(q(v, 0.5))}`).join(' · '));
console.log('Tip/kalite medyanı (standart):', BUILDING_TYPES.map((t) => { const v = byType.get(`${t.id}/standart`) ?? []; return v.length ? `${t.id} ${pct(q(v, 0.5))}` : ''; }).filter(Boolean).join(' · '));
console.log('En iyi seçenek olma payı:', BUILDING_TYPES.map((t) => `${t.id} %${((wins.get(t.id) ?? 0) / best.length * 100).toFixed(0)}`).join(' · '));
console.log('Küçük başlangıç arsalarında (≤280 m², konut) tip medyanı:', [...starter].map(([k, v]) => `${k} ${pct(q(v, 0.5))}`).join(' · '));
void CITY_DATA;
