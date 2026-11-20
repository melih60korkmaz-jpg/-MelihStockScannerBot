import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { advanceDays } from '../sim/engine';
import { unitsOf } from '../sim/sales';
import { netWorth } from '../sim/finance';
import type { GameState, Parcel } from '../core/types';
import { TL } from '../core/money';

/** Satış denge raporu: `npm run sim:sales -- [tohum]` — fiyat/emlakçı/taksit stratejilerinin satış süresi ve toplam getirisi. */
const N = Number(process.argv[2] ?? 30);
const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'yenimahalle', hood: 'Bot', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.05, growthKnown: false, unitBase: TL(2000), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_500_000) }; s.parcels.push(p); return p; };
function trial(seed: number, mult: number, agent: boolean, inst: boolean, presale: boolean) {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Bot Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of ['usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  s.company!.cash = TL(80e6); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
  const p = mk(s); dispatch(s, 'CreateProject', { parcelId: p.id, type: 'apartman', quality: 'standart' }); const pr = s.projects[0]!; dispatch(s, 'StartConstruction', { projectId: pr.id }); dispatch(s, 'SetSalesPolicy', { projectId: pr.id, priceMult: mult, agent, installments: inst, presale });
  const nw0 = netWorth(s), d0 = s.clock.day; let done = 0;
  for (let d = 0; d < 1800 && pr.status !== 'satildi'; d++) { advanceDays(s, 1); if (!done && pr.status === 'tamamlandi') done = s.clock.day; if (pr.status === 'tamamlandi' && s.clock.day - done > 540) { dispatch(s, 'SellProjectBulk', { projectId: pr.id }); } }
  const us = unitsOf(s, pr.id); const soldDays = us.map((u) => (u.soldDay ?? s.clock.day) - done).sort((a, b) => a - b);
  return { total: s.clock.day - d0, afterBuild: done ? s.clock.day - done : NaN, med: soldDays[Math.floor(soldDays.length / 2)]!, gain: (netWorth(s) - nw0) / nw0, n: us.length, profit: (pr.result?.profit ?? 0) };
}
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const row = (label: string, m: number, ag: boolean, inst: boolean, pre: boolean) => { const r = Array.from({ length: N }, (_, i) => trial(5000 + i, m, ag, inst, pre)); console.log(`${label.padEnd(30)} daire ${r[0]!.n} · medyan satış ${avg(r.map((x) => x.med)).toFixed(0)} gün (tesliminden) · tamamı ${avg(r.map((x) => x.afterBuild)).toFixed(0)} gün · proje kârı ${(avg(r.map((x) => x.profit)) / 1e8).toFixed(1)} M₺ · net varlık %${(avg(r.map((x) => x.gain)) * 100).toFixed(0)}`); };
row('Fiyat ×0,90', 0.9, false, true, false); row('Adil fiyat ×1,00', 1, false, true, false); row('Fiyat ×1,10', 1.1, false, true, false); row('Fiyat ×1,20', 1.2, false, true, false);
row('×1,00 + emlakçı', 1, true, true, false); row('×1,00 taksitsiz', 1, false, false, false); row('×1,00 + ön satış', 1, false, true, true);
