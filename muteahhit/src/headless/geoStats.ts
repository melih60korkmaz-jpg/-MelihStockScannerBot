import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { TL } from '../core/money';
import { BUILDING_TYPES, PROVINCES, provinceData } from '../data';
import { marketParcels } from '../sim/land';
import { buildable, planProject } from '../sim/projects';

/** 81 il denge raporu: her ilde (şube açılmış) ilanların en iyi tip/standart kalite marjı — kademe ve bölge bazında. */
const s = newGameState(11); dispatch(s, 'CreateCompany', { name: 'Harita Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
s.company!.cash = TL(9e9); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
for (const p of PROVINCES) dispatch(s, 'OpenBranch', { cityId: p.id });
const tier = new Map<number, number[]>(), region = new Map<string, number[]>(), prov = new Map<string, number[]>(); let none = 0, all = 0;
for (const p of marketParcels(s)) {
  all++; let best = -Infinity; for (const t of BUILDING_TYPES) { if (buildable(p, t.id).reason) continue; best = Math.max(best, planProject(s, p, t.id, 'standart').margin); }
  if (best === -Infinity) { none++; continue; }
  const pv = provinceData(p.city)!; for (const [m, k] of [[tier, pv.tier], [region, pv.region], [prov, pv.id]] as const) (m as Map<any, number[]>).set(k, [...((m as Map<any, number[]>).get(k) ?? []), best]);
}
const q = (a: number[], f: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * f))]!, pc = (x: number) => `%${(x * 100).toFixed(0)}`;
console.log(`${all} ilan (81 il) · hiçbir tip yapılamayan ${pc(none / all)}`);
for (const [k, v] of [...tier].sort()) console.log(`Kademe ${k}: ilan ${v.length} · en iyi marj p10 ${pc(q(v, 0.1))} · medyan ${pc(q(v, 0.5))} · p90 ${pc(q(v, 0.9))} · kârlı ${pc(v.filter((x) => x > 0).length / v.length)}`);
for (const [k, v] of region) console.log(`  ${k.padEnd(18)} medyan ${pc(q(v, 0.5))} · kârlı ${pc(v.filter((x) => x > 0).length / v.length)}`);
const worst = [...prov].map(([k, v]) => [k, q(v, 0.5), v.filter((x) => x > 0).length / v.length] as const).sort((a, b) => a[1] - b[1]).slice(0, 6);
console.log('En zayıf iller:', worst.map(([k, m, sh]) => `${k} (medyan ${pc(m)}, kârlı ${pc(sh)})`).join(' · '));
