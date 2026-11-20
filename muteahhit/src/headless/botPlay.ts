/**
 * Faz 12 bot oyuncu: N tohum × Y yıl boyunca basit bir stratejiyle oynar; çökme, NaN, defter tutarsızlığı, iflas oranı,
 * servet dağılımı ve adım süresini raporlar. `npm run sim:bot -- [tohum] [yıl] [strateji: tutucu|dengeli|agresif]`
 */
import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { TL } from '../core/money';
import { advanceDays } from '../sim/engine';
import { checkInvariant } from '../sim/ledger';
import { netWorth } from '../sim/finance';
import { planProject } from '../sim/projects';
import { askPrice, TAPU_HARCI } from '../sim/land';
import { eligibility } from '../sim/tenders';
import { creditCapacity, quoteLoan } from '../sim/loans';
import { eventDef } from '../data';
import type { GameState } from '../core/types';

const N = Number(process.argv[2] ?? 20), YEARS = Number(process.argv[3] ?? 10), STRAT = (process.argv[4] ?? 'dengeli') as 'tutucu' | 'dengeli' | 'agresif' | 'usta';
const TYPES = ['apartman', 'site', 'mustakil', 'villa', 'ofis'];
const PARAM = { tutucu: { minMargin: 0.14, maxActive: 1, loan: false, reserve: 2.5 }, dengeli: { minMargin: 0.1, maxActive: 2, loan: true, reserve: 3 }, agresif: { minMargin: 0.06, maxActive: 4, loan: true, reserve: 2 }, usta: { minMargin: 0.1, maxActive: 2, loan: true, reserve: 2 } }[STRAT];

function crew(s: GameState) {
  if (STRAT === 'usta' && !s.projects.some((p) => p.status === 'insaat')) { for (const x of [...s.staff]) if (s.staff.length > 1) dispatch(s, 'FireStaff', { staffId: x.id }); return; }
  const need = Math.max(4, Math.round(s.projects.filter((p) => p.status === 'insaat' || p.status === 'taslak').reduce((a, p) => a + p.brut / 70, 0) * 0.8));
  const want: [string, number][] = [['usta', 1], ['isci', Math.min(12, need)], ['santiye_sefi', 1]];
  dispatch(s, 'UpgradeOffice', {});
  for (const [t, n] of want) while (s.staff.filter((x) => x.type === t).length < n) { const r = dispatch(s, 'HireStaff', { type: t }); if (!r.ok) break; }
}
const NEGO = new Map<number, number>();
function act(s: GameState) {
  const c = s.company!; if (c.bankrupt) return;
  if (s.pending) { const d = eventDef(s.pending.id); dispatch(s, 'ResolveEvent', { choice: d ? (d.def ?? 0) : 0 }); }
  crew(s);
  const active = s.projects.filter((p) => p.status === 'insaat' || p.status === 'taslak').length;
  for (const p of s.projects) {
    if (p.status === 'taslak' && !p.contract) { if (c.cash > p.budget.total * 0.25 || PARAM.loan) { if (PARAM.loan && c.cash < p.budget.total * 0.4) dispatch(s, 'TakeInvestor', { projectId: p.id, pct: 40 }); if (PARAM.loan && c.cash < p.budget.total * 0.5) dispatch(s, 'TakeLoan', { kind: 'insaat', bank: 'ozel', amount: Math.round((p.budget.total - p.budget.designFee) * 0.5), projectId: p.id }); dispatch(s, 'StartConstruction', { projectId: p.id }); } }
    if (p.status === 'taslak' && p.contract) dispatch(s, 'StartConstruction', { projectId: p.id });
    if (p.status === 'tamamlandi' && p.result && s.clock.day - (p.build?.doneDay ?? s.clock.day) > 150) dispatch(s, 'SellProjectBulk', { projectId: p.id });
  }
  if (active < PARAM.maxActive) { // en iyi marjlı arsa+proje
    let best: { id: number; type: string; q: string; m: number; cost: number; budget: number } | null = null;
    for (const pc of s.parcels) { if (pc.owner !== 'market' || !s.openCities.includes(pc.city)) continue;
      for (const t of TYPES) { try { const pl = planProject(s, pc, t, 'standart', Math.round(askPrice(s, pc) * (1 + TAPU_HARCI))); if (!pl.ok || pl.brut > 1500 || pl.cost.total > c.cash * 2.2) continue; if (pl.landCost + pl.cost.designFee + pl.cost.total * (PARAM.loan ? 0.15 : 0.35) + TL(PARAM.reserve * 1_000_000) > c.cash) continue; if (!best || pl.margin > best.m) best = { id: pc.id, type: t, q: 'standart', m: pl.margin, cost: pl.landCost + pl.cost.designFee, budget: pl.cost.total }; } catch { /* uygun değil */ } } }
    if (best && best.m >= PARAM.minMargin && c.cash > best.cost + best.budget * (PARAM.loan ? 0.15 : 0.35) + TL(PARAM.reserve * 1_000_000)) { const owned = () => s.parcels.find((x) => x.id === best!.id)?.owner === 'player'; const off = Math.min(1, NEGO.get(best.id) ?? 0.86); let r = dispatch(s, 'BuyLand', { parcelId: best.id, offerPct: off }); if (!owned()) NEGO.set(best.id, off + 0.03); const r2 = owned() ? r : { ok: false as const, error: 'reddedildi' }; const r3 = r2.ok ? dispatch(s, 'CreateProject', { parcelId: best.id, type: best.type, quality: best.q }) : r2; if (process.env.DBG) console.log('  satın alma:', best.type, best.m.toFixed(2), r.ok, r2.ok, r3.ok, !r3.ok ? (r3 as { error: string }).error : ''); }
  }
  for (const t of s.tenders) if (t.status === 'acik' && !t.bid && eligibility(s, t).ok && STRAT !== 'tutucu') dispatch(s, 'PlaceBid', { tenderId: t.id, price: Math.round(t.refCost * 0.93) });
  if (c.cash < TL(1_000_000) && PARAM.loan) { const q = quoteLoan(s, { kind: 'ticari', bank: 'ozel', amount: Math.min(creditCapacity(s).available, TL(5_000_000)) }); if (q.ok) dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: Math.min(creditCapacity(s).available, TL(5_000_000)), term: 36 }); }
  if (PARAM.loan && s.projects.some((p) => p.build?.stalled === 'nakit')) { const amt = Math.min(creditCapacity(s).available, TL(6_000_000)); if (amt > TL(300_000) && quoteLoan(s, { kind: 'ticari', bank: 'ozel', amount: amt }).ok) dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: amt, term: 36 }); else if (c.cash < TL(500_000)) for (const p of s.projects) if (p.status === 'tamamlandi') dispatch(s, 'SellProjectBulk', { projectId: p.id }); }
  for (const l of s.loans) if (l.kind === 'ticari' && c.cash > l.balance + TL(15_000_000)) dispatch(s, 'RepayLoan', { loanId: l.id, amount: l.balance });
}

const res: { nw: number; bankrupt: boolean; completed: number; ms: number; level: number; err?: string }[] = [];
for (let seed = 1; seed <= N; seed++) {
  const s = newGameState(7000 + seed); dispatch(s, 'CreateCompany', { name: 'Bot Yapı', founderBackground: ['emlakci', 'eski_kalfa', 'muhendis_mirasci'][seed % 3]!, startCity: ['istanbul', 'ankara', 'izmir'][seed % 3]! });
  NEGO.clear(); const t0 = performance.now(); let err: string | undefined;
  try { for (let d = 0; d < YEARS * 365; d += 10) { advanceDays(s, 10); act(s); if (process.env.DBG && seed === Number(process.env.DBGSEED ?? 1) && d < 1500) console.log(s.clock.day, Math.round(s.company!.cash / 100), Math.round(netWorth(s) / 100), 'st', s.staff.length, 'pr', s.projects.map((p) => p.status.charAt(0) + (p.build ? p.build.stage : '') + (p.build?.stalled ? '!' : '')).join(','), 'loan', s.loans.map((l) => l.kind.charAt(0) + Math.round(l.balance / 1e8)).join(','), 'inv', s.investments.length, s.macro.regime, 'hI', s.cityMarket.ankara ? s.cityMarket.ankara.housingIndex.toFixed(2) : ''); if (s.company!.bankrupt) break; if (!checkInvariant(s)) { err = 'invariant'; break; } if (!Number.isFinite(netWorth(s))) { err = 'NaN'; break; } } } catch (e) { err = String((e as Error).stack?.split('\n').slice(0, 3).join(' | ')); }
  if (process.env.DBG && seed === Number(process.env.DBGSEED ?? 1)) { const by: Record<string, number> = {}; for (const e of s.ledger) by[e.cat] = (by[e.cat] ?? 0) + e.amount; console.log('LEDGER', Object.entries(by).map(([k, v]) => k + ':' + Math.round(v / 1e8 * 10) / 10).join(' ')); for (const p of s.projects) console.log('PROJE', p.type, p.status, 'bütçe', Math.round(p.budget.total / 1e8 * 10) / 10, 'sonuç', JSON.stringify(p.result ?? {}), 'stage', p.build?.stage, 'ay', p.build ? Math.round((s.clock.day - p.build.startDay) / 30) : '-', 'plan', p.expected.months); }
  res.push({ nw: netWorth(s) / 100, bankrupt: !!s.company!.bankrupt, completed: s.company!.stats.completed, ms: performance.now() - t0, level: s.company!.level, ...(err ? { err } : {}) });
}
const q = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!;
const nws = res.map((r) => r.nw), fmt = (x: number) => (x / 1e6).toFixed(1) + ' M₺';
console.log(`Strateji ${STRAT} · ${N} tohum × ${YEARS} yıl`);
console.log(`  iflas %${((res.filter((r) => r.bankrupt).length / N) * 100).toFixed(0)} · hata ${res.filter((r) => r.err).length} · net varlık medyan ${fmt(q(nws, 0.5))} (p10 ${fmt(q(nws, 0.1))}, p90 ${fmt(q(nws, 0.9))})`);
console.log(`  tamamlanan proje medyan ${q(res.map((r) => r.completed), 0.5)} · seviye medyan ${q(res.map((r) => r.level), 0.5)} · süre/oyun medyan ${(q(res.map((r) => r.ms), 0.5) / 1000).toFixed(1)} sn`);
for (const r of res.filter((x) => x.err).slice(0, 3)) console.log('  HATA:', r.err);
