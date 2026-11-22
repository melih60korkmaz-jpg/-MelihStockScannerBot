import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { eventDef } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Parcel } from '../src/core/types';

/** Yeni komutları rastgele sırayla zorlar: hiçbir durumda istisna, NaN ya da defter/nakit tutarsızlığı çıkmamalı; kayıt-yükleme birebir kalmalı. */
function lcg(seed: number) { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Fuzz', area: 600, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000), boughtDay: s.clock.day }; s.parcels.push(p); return p; };

const STAT: Record<string, number> = {};
describe('komut fuzz', () => {
  const N = Number(process.env.FUZZ_N ?? 6), STEPS = Number(process.env.FUZZ_STEPS ?? 150);
  for (const seed of Array.from({ length: N }, (_, i) => i + 1)) it(`seed ${seed}: 4 yıl rastgele yönetim/satış/fırsat komutları`, () => {
    const R = lcg(seed * 7919), s = newGameState(100 + seed); dispatch(s, 'CreateCompany', { name: 'Fuzz Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
    for (const t of ['usta', 'isci', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi', 'muhendis', 'satis_danismani']) dispatch(s, 'HireStaff', { type: t });
    const c = s.company!; c.level = 5; c.office = 2; c.cash = TL(700_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    const pick = <T,>(a: T[]): T | undefined => a[Math.floor(R() * a.length)];
    for (let step = 0; step < STEPS; step++) {
      if (s.pending) dispatch(s, 'ResolveEvent', { choice: Math.floor(R() * eventDef(s.pending.id)!.ch.length) });
      let k = Math.floor(R() * 20); if (k >= 16) k = k < 18 ? 1 : 4; // teklif kabulü ve daire ayarı daha sık
      if (k === 0) { const pc = mk(s); const r = dispatch(s, 'CreateProject', { parcelId: pc.id, type: pick(['apartman', 'site'])!, quality: pick(['standart', 'premium'])! }); if (r.ok) dispatch(s, 'StartConstruction', { projectId: s.projects.at(-1)!.id }); }
      else if (k === 1) { const o = pick(s.offers ?? []); if (o) dispatch(s, 'AcceptOffer', { offerId: o.id }); }
      else if (k === 2) { const o = pick(s.offers ?? []); if (o) dispatch(s, 'CounterOffer', { offerId: o.id, ratio: +(o.ratio + R() * 0.1).toFixed(3) }); }
      else if (k === 3) { const o = pick(s.offers ?? []); if (o) dispatch(s, 'RejectOffer', { offerId: o.id }); }
      else if (k === 4) { const u = pick(s.units); if (u) dispatch(s, 'SetUnit', { unitId: u.id, ...(R() < 0.4 ? { adj: +(0.8 + R() * 0.5).toFixed(2) } : {}), ...(R() < 0.3 ? { hold: R() < 0.5 } : {}), ...(R() < 0.6 ? { listing: R() < 0.7 ? 'kira' : 'sat' } : {}) } as never); }
      else if (k === 5) { const p = pick(s.projects); if (p?.sales) dispatch(s, 'SetPace', { projectId: p.id, pace: Math.floor(R() * 5) }); }
      else if (k === 6) { const u = pick(s.units); if (u) dispatch(s, 'PromoteUnit', { unitId: u.id }); }
      else if (k === 7) { const d = pick(s.deals ?? []); if (d && dispatch(s, 'AcceptDeal', { dealId: d.id }).ok) STAT.DEAL_DONE = (STAT.DEAL_DONE ?? 0) + 1; }
      else if (k === 8) { const r = pick(s.rivals); if (r) dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: pick(['ortak', 'konsorsiyum', 'makine', 'arsa'])! }); }
      else if (k === 9) { const p = pick(s.projects.filter((x) => x.status === 'insaat')); if (p) dispatch(s, 'IssueOrder', { projectId: p.id, order: (pick(['hizlandir', 'kalite', 'tasarruf', 'guvenlik', null]) ?? null) as string | null }); }
      else if (k === 10) { const p = pick(s.projects.filter((x) => x.status === 'insaat')), x = pick(s.staff); if (p && x) dispatch(s, 'SetManager', { projectId: p.id, staffId: R() < 0.2 ? null : x.id }); }
      else if (k === 11) { dispatch(s, 'BuyDecor', { id: pick(['maket', 'kupa', 'kahve', 'toplanti', 'tablo', 'vitrin'])! }); }
      else if (k === 12) { dispatch(s, 'SetFocus', { id: pick(['denge', 'konut', 'luks', 'altyapi', 'holding'])! }); }
      else if (k === 13) { const p = pick(s.projects.filter((x) => x.sales)); if (p) dispatch(s, 'SetAutoSell', { projectId: p.id, min: R() < 0.3 ? null : +(0.9 + R() * 0.2).toFixed(2) }); }
      else if (k === 14) { const u = pick(s.units.filter((x) => x.rent)); if (u) dispatch(s, 'EndRent', { unitId: u.id }); }
      else { const p = pick(s.projects.filter((x) => x.status === 'tamamlandi')); if (p && R() < 0.3) dispatch(s, 'SellProjectBulk', { projectId: p.id }); }
      for (const e of advanceDays(s, 10)) STAT[e.type] = (STAT[e.type] ?? 0) + 1;
      if (s.company!.bankrupt) break;
      STAT.RENT_STARTED = Math.max(STAT.RENT_STARTED ?? 0, s.units.filter((u) => u.rent).length);
      expect(checkInvariant(s)).toBe(true); expect(Number.isFinite(netWorth(s))).toBe(true);
      for (const u of s.units) { expect(u.status === 'satildi' && u.rent).toBeFalsy(); if (u.rent) expect(Number.isInteger(u.rent.amount)).toBe(true); }
      for (const o of s.offers ?? []) { expect(s.units.some((u) => u.id === o.unitId && u.status !== 'satildi' && !u.rent && !u.hold)).toBe(true); expect(s.projects.some((p) => p.id === o.projectId)).toBe(true); }
      expect((s.offers ?? []).length).toBeLessThanOrEqual(60); expect((s.deals ?? []).length).toBeLessThanOrEqual(6); expect((s.decisions ?? []).length).toBeLessThanOrEqual(80);
      if (step % 50 === 49) { const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) expect(JSON.stringify(r.state)).toBe(JSON.stringify(s)); }
    }
  }, 600000);
  it('fuzz kapsamı: teklif, kira, fırsat ve olaylar gerçekten tetiklendi', () => { for (const k of ['OFFER_NEW', 'UNIT_SOLD', 'RENT_STARTED', 'DEAL_NEW', 'EVENT_DECISION', 'PROJECT_COMPLETED']) expect(STAT[k] ?? 0, k).toBeGreaterThan(0); console.log(JSON.stringify(STAT)); });
});
