import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { advanceDays } from '../sim/engine';
import { askPrice, marketParcels } from '../sim/land';
import { planProject } from '../sim/projects';
import { BUILDING_TYPES } from '../data';
import { netWorth } from '../sim/finance';

/** İnşaat denge raporu: `npm run sim:build -- [tohum] [ekip: kucuk|orta|yok] [bg]`. İlk proje yolu: en ucuz uygun arsa → en kârlı tip → inşaat → toplu satış. */
const N = Number(process.argv[2] ?? 60), crew = process.argv[3] ?? 'orta', bg = process.argv[4] ?? 'eski_kalfa';
const CREW: Record<string, string[]> = { yok: [], kucuk: ['usta', 'isci'], orta: ['usta', 'isci', 'isci', 'isci'], buyuk: ['santiye_sefi', 'usta', 'usta', 'isci', 'isci', 'isci', 'isci'] };
const roi: number[] = [], annual: number[] = [], days: number[] = [], ratio: number[] = [], qual: number[] = [], profit: number[] = [], planned: number[] = []; let stalls = 0, broke = 0, finished = 0, soilHits = 0;
for (let i = 0; i < N; i++) {
  const s = newGameState(7000 + i); dispatch(s, 'CreateCompany', { name: 'Bot', founderBackground: bg, startCity: 'ankara' });
  s.staff.length = 0; for (const t of CREW[crew] ?? CREW.orta!) dispatch(s, 'HireStaff', { type: t });
  const cash0 = s.company!.cash, nw0 = netWorth(s), day0 = s.clock.day;
  const cands = marketParcels(s).filter((p) => askPrice(s, p) * 1.04 < cash0 * 0.5);
  let best: { p: (typeof cands)[number]; t: string; m: number } | null = null;
  for (const p of cands) for (const t of BUILDING_TYPES) { const pl = planProject(s, p, t.id, 'standart'); if (pl.ok && pl.cost.totalHigh + pl.landCost < cash0 * 0.85 && (!best || pl.margin > best.m)) best = { p, t: t.id, m: pl.margin }; }
  if (!best) continue;
  dispatch(s, 'BuyLand', { parcelId: best.p.id, offerPct: 1 }); dispatch(s, 'CreateProject', { parcelId: best.p.id, type: best.t, quality: 'standart' });
  const pr = s.projects[0]; if (!pr) continue; dispatch(s, 'StartConstruction', { projectId: pr.id });
  let d = 0; while (pr.status === 'insaat' && d < 2500) { advanceDays(s, 1); d++; if (s.company!.cash < 0) { broke++; break; } }
  if (pr.build!.stalledDays > 0) stalls++; if (pr.build!.soilExtra > 0) soilHits++;
  if (pr.status !== 'tamamlandi') continue; finished++;
  days.push(pr.result!.days); planned.push(pr.result!.plannedDays); ratio.push((pr.build!.spent + (pr.build!.matCost ?? 0)) / (pr.budget.total - pr.budget.designFee)); qual.push(pr.result!.qualityScore);
  dispatch(s, 'SellProjectBulk', { projectId: pr.id }); profit.push((pr.result!.profit ?? 0) / (pr.result!.revenue ?? 1));
  const g = (netWorth(s) - nw0) / nw0; roi.push(g); annual.push(g * 365 / Math.max(1, s.clock.day - day0));
}
const q = (a: number[], f: number) => a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * f))]! : NaN;
const f = (x: number, d = 1) => x.toFixed(d);
console.log(`Ekip: ${crew} · ${N} deneme · tamamlanan ${finished} · nakitten batan ${broke} · duran inşaat %${f(stalls / N * 100, 0)} · zemin sürprizi %${f(soilHits / N * 100, 0)}`);
console.log(`Süre (gün): medyan ${f(q(days, .5), 0)} (plan ${f(q(planned, .5), 0)}) · p10 ${f(q(days, .1), 0)} · p90 ${f(q(days, .9), 0)}`);
console.log(`Gerçekleşen/bütçe: medyan ${f(q(ratio, .5), 2)} · p10 ${f(q(ratio, .1), 2)} · p90 ${f(q(ratio, .9), 2)}`);
console.log(`Kalite: medyan ${f(q(qual, .5), 0)} · Toplu satış kâr marjı: p10 %${f(q(profit, .1) * 100, 0)} · medyan %${f(q(profit, .5) * 100, 0)} · p90 %${f(q(profit, .9) * 100, 0)}`);
console.log(`ŞİRKET getirisi (maaş+kira dahil, satış sonrası net varlık): proje başına p10 %${f(q(roi, .1) * 100, 0)} · medyan %${f(q(roi, .5) * 100, 0)} · p90 %${f(q(roi, .9) * 100, 0)} · yıllığa çevrilmiş medyan %${f(q(annual, .5) * 100, 0)}`);
