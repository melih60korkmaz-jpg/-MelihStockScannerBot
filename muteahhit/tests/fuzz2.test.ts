import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { consolidate } from '../src/sim/consol';
import { stakesValue } from '../src/sim/invest';
import { venturesValue, ventureValue } from '../src/sim/ventures';
import { debtTotal } from '../src/sim/loans';
import { infraAssets } from '../src/sim/infra';
import { landAssetValue } from '../src/sim/land';
import { machineAssetValue } from '../src/sim/machines';
import { receivablesTotal } from '../src/sim/sales';
import { payablesTotal } from '../src/sim/supply';
import { depositsTotal } from '../src/sim/realestate';
import { contractAssets } from '../src/sim/tenders';
import { projectAssetValue, stockValue } from '../src/sim/finance';
import { ventureCandidates } from '../src/sim/ventures';
import { getMgmt, refreshCands } from '../src/sim/mgmt';
import { eventDef } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Parcel } from '../src/core/types';

/** Büyük genişleme sistemleri (yönetim, tedarik, emlak, makine, altyapı, işletme, enerji, yatırım, iştirak) rastgele komut sırasıyla zorlanır. */
function lcg(seed: number) { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
const MATS = ['cimento', 'demir', 'tugla', 'beton', 'kum', 'cam'], SUPS = ['yerel', 'ucuz', 'premium', 'fabrika', 'bolge', 'ithal'], DIVS = ['insaat', 'isletme', 'enerji', 'altyapi', 'bagli', 'makine', 'gayrimenkul'];
const MK = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Fuzz', area: 700, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000), boughtDay: s.clock.day }; s.parcels.push(p); return p; };
const COV: Record<number, number> = {};
describe('genişleme fuzz', () => {
  const N = Number(process.env.FUZZ_N ?? 5), STEPS = Number(process.env.FUZZ_STEPS ?? 120);
  for (const seed of Array.from({ length: N }, (_, i) => i + 1)) it(`seed ${seed}: rastgele yönetim/yatırım komutları, defter ve konsolidasyon tutarlı`, () => {
    const R = lcg(seed * 104729), s = newGameState(500 + seed); dispatch(s, 'CreateCompany', { name: 'Fuzz Holding', founderBackground: 'emlakci', startCity: 'ankara' });
    const c = s.company!; c.level = 7; c.reputation = 70; c.creditScore = 700; c.cash = TL(3_000_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); for (const x of ['antalya', 'izmir']) s.openCities.push(x);
    for (const t of ['usta', 'isci', 'isci', 'isci', 'santiye_sefi', 'muhendis', 'operator']) dispatch(s, 'HireStaff', { type: t });
    const pick = <T,>(a: T[]): T | undefined => a[Math.floor(R() * a.length)], pc = (a: string[]) => pick(a)!;
    let ran = 0;
    for (let step = 0; step < STEPS; step++) {
      if (s.pending) dispatch(s, 'ResolveEvent', { choice: Math.floor(R() * eventDef(s.pending.id)!.ch.length) });
      const k = Math.floor(R() * 24); const ok = (r: { ok: boolean }) => { if (r.ok) { ran++; COV[k] = (COV[k] ?? 0) + 1; } };
      if (k === 0) { const p = MK(s); const r = dispatch(s, 'CreateProject', { parcelId: p.id, type: pc(['apartman', 'otel', 'avm', 'ofis', 'is_merkezi', 'site']), quality: pc(['standart', 'premium']) }); if (r.ok) dispatch(s, 'StartConstruction', { projectId: s.projects.at(-1)!.id }); }
      else if (k === 1) { const p = pick(s.projects.filter((x) => x.status === 'tamamlandi')); if (p) ok(dispatch(s, 'OperateProject', { projectId: p.id })); }
      else if (k === 2) ok(dispatch(s, 'BuildVenture', { kind: pc(['gunes', 'ruzgar', 'depolama', 'restoran', 'otopark', 'tatil']) as 'gunes', city: pc(['ankara', 'antalya', 'izmir']), tier: Math.floor(R() * 3) }));
      else if (k === 3) { const v = pick(s.ventures); if (v) ok(dispatch(s, 'SetVentureOps', { id: v.id, ...(R() < 0.5 ? { price: +(0.8 + R() * 0.5).toFixed(2) } : {}), ...(R() < 0.5 ? { staff: 1 + Math.floor(R() * 3) } : {}), ...(R() < 0.5 ? { ads: Math.floor(R() * 4) } : {}) })); }
      else if (k === 4) { const v = pick(s.ventures); if (v) { if (R() < 0.5) ok(dispatch(s, 'HireVentureMgr', { id: v.id, candId: pick(ventureCandidates(s, v))!.id })); else ok(dispatch(s, 'FireVentureMgr', { id: v.id })); } }
      else if (k === 5) { const v = pick(s.ventures); if (v) ok(dispatch(s, 'SetPPA', { id: v.id, months: pc(['0', '12', '24']) === '0' ? 0 : R() < 0.5 ? 12 : 24 })); }
      else if (k === 6) { const v = pick(s.ventures); if (v && R() < 0.3) ok(dispatch(s, 'SellVenture', { id: v.id })); }
      else if (k === 7) ok(dispatch(s, 'BuyStake', { rivalId: pick(s.rivals)?.id ?? 0, pct: 1 + Math.floor(R() * 10) }));
      else if (k === 8) { const st = pick(s.stakes ?? []); if (st) ok(dispatch(s, 'SellStake', { rivalId: st.rivalId, pct: 1 + Math.floor(R() * st.pct) })); }
      else if (k === 9) ok(dispatch(s, 'DueDiligence', { rivalId: pick(s.rivals)?.id ?? 0 }));
      else if (k === 10) { if (R() < 0.25) ok(dispatch(s, 'AcquireRival', { rivalId: pick(s.rivals)?.id ?? 0, offer: pick([0.85, 0.9, 0.95, 1, 1.1])! })); }
      else if (k === 11) ok(dispatch(s, 'BuildFactory', { prod: pc(['cimento', 'tugla', 'demir', 'beton']), city: 'ankara', tier: Math.floor(R() * 2) }));
      else if (k === 12) ok(dispatch(s, 'SubTransfer', { div: pc(DIVS), kind: pc(['sermaye', 'borc', 'borc_odeme', 'temettu']) as 'sermaye', amount: Math.round(R() * 2e9) + 1 }));
      else if (k === 13) ok(dispatch(s, 'SetSubBudget', { div: pc(DIVS), budget: Math.round(R() * 1e9) }));
      else if (k === 14) ok(dispatch(s, 'PlaceOrder', { material: pc(MATS), supplier: pc(SUPS), qty: 1 + Math.floor(R() * 200), term: pc(['pesin', 'vade30', 'vade60']) as 'pesin' } as never));
      else if (k === 15) ok(dispatch(s, 'SignContract', { material: pc(MATS), supplier: pc(SUPS), qtyPerMonth: 20 + Math.floor(R() * 200), months: pc(['6', '12']) === '6' ? 6 : 12 }));
      else if (k === 16) ok(dispatch(s, 'UpgradeWarehouse', {}));
      else if (k === 17) ok(dispatch(s, 'BuyMachine', { type: pc(['ekskavator', 'kamyon', 'kule_vinc', 'damperli_kamyon', 'silindir']) }));
      else if (k === 18) { const m = pick(s.machines); if (m) { const q = R(); ok(q < 0.5 ? dispatch(s, 'ServiceMachine', { machineId: m.id, kind: R() < 0.5 ? 'bakim' : 'buyuk' }) : q < 0.8 ? dispatch(s, 'RentOutMachine', { machineId: m.id } as never) : dispatch(s, 'RecallMachine', { machineId: m.id } as never)); } }
      else if (k === 19) ok(dispatch(s, 'OpenDept', { dept: pc(['finans', 'insaat', 'satis', 'tedarik', 'ik', 'teknik', 'hukuk']) }));
      else if (k === 20) { refreshCands(s); const cd = pick(getMgmt(s).cands); if (cd) ok(dispatch(s, 'HireGM', { candId: cd.id })); }
      else if (k === 21) { const it = pick(getMgmt(s).meeting?.items ?? []); if (it) ok(dispatch(s, 'DecideAgenda', { itemId: it.id, option: 0 })); }
      else if (k === 22) { const p = pick(s.projects.filter((x) => x.status === 'tamamlandi')); if (p) ok(dispatch(s, 'ManageSite', { projectId: p.id })); }
      else { const b = pick(s.units.filter((u) => u.rent)); if (b) ok(dispatch(s, 'EvictTenant', { unitId: b.id })); }
      advanceDays(s, 10); if (s.company!.bankrupt) break;
      expect(checkInvariant(s)).toBe(true); if (!Number.isFinite(netWorth(s))) { const bad = Object.entries({ cash: s.company!.cash, st: stakesValue(s), ven: venturesValue(s), debt: debtTotal(s), infra: infraAssets(s), land: landAssetValue(s), proj: projectAssetValue(s), mach: machineAssetValue(s), stock: stockValue(s), rec: receivablesTotal(s), pay: payablesTotal(s), dep: depositsTotal(s), ca: contractAssets(s) }).filter(([, v]) => !Number.isFinite(v)); throw new Error(`NaN adım ${step} k=${k} ${JSON.stringify(bad)} ${JSON.stringify(s.ventures.filter((v) => !Number.isFinite(ventureValue(s, v))).map((v) => [v.kind, v.capex, v.openedDay, v.ci0, v.size]))}`); } const cons = consolidate(s); expect(cons.ok, `konsolidasyon adım ${step}`).toBe(true);
      for (const v of s.ventures) { expect(Number.isFinite(v.last.revenue)).toBe(true); expect(Number.isFinite(v.capex)).toBe(true); }
      if (step % 40 === 39) { const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) expect(JSON.stringify(r.state)).toBe(JSON.stringify(s)); }
    }
    expect(ran).toBeGreaterThan(5);
  }, 600000);
  it('kapsam: yeni komutların çoğu en az bir kez başarıyla uygulandı', () => { const hit = Object.keys(COV).length; console.log("COV", JSON.stringify(COV)); expect(hit, JSON.stringify(COV)).toBeGreaterThanOrEqual(14); for (const k of [2, 3, 7, 12, 14, 17]) expect(COV[k] ?? 0, `k=${k}`).toBeGreaterThan(0); });
});
