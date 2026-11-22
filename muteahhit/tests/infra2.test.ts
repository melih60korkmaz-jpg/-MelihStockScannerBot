import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { INFRA_KINDS, MAT_SHARE, RETENTION, generateInfraTender, infraAssets, infraMonthly, jobNeeds } from '../src/sim/infra';
import { createStaff } from '../src/sim/staff';
import { evaluateTender, placeBid, winOdds } from '../src/sim/tenders';
import { stockQty } from '../src/sim/materials';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Tender } from '../src/core/types';

function setup(level = 8): GameState {
  const s = newGameState(91); dispatch(s, 'CreateCompany', { name: 'Altyapı Holding', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = level; c.reputation = 85; c.creditScore = 850; c.stats.completed = 12; c.cash = TL(6_000_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; s.warehouse = { level: 3 };
  for (let i = 0; i < 40; i++) createStaff(s, i % 3 ? 'isci' : 'usta'); s.staff.forEach((x) => { x.experience = 60; x.morale = 80; });
  for (let i = 0; i < 18; i++) dispatch(s, 'BuyMachine', { type: ['ekskavator', 'dozer', 'kamyon', 'kepce', 'beton_mikseri', 'kule_vinc', 'kompresor', 'beton_pompasi', 'damperli_kamyon'][i % 9]! }); return s;
}
function win(s: GameState, kind: string): { t: Tender; j: NonNullable<GameState['infra'][number]> } {
  let t: Tender | null = null; for (let i = 0; i < 80 && (!t || t.kind !== kind); i++) t = generateInfraTender(s, 'ankara'); expect(t!.kind).toBe(kind); s.tenders.push(t!); placeBid(s, t!, Math.round(t!.refCost * 0.9), []); t!.rivals = []; evaluateTender(s, t!, []);
  expect(t!.status).toBe('kazandi'); return { t: t!, j: s.infra.at(-1)! };
}
describe('altyapı ve taahhüt: kapsam', () => {
  it('12 kategori + eski şebeke: seviyeye göre açılır; ihalenin gereksinimleri, süre, teminat ve rakipleri vardır', () => {
    const ids = INFRA_KINDS.map((k) => k.id); for (const id of ['otoyol', 'yol', 'kopru', 'viyadut', 'tunel', 'metro', 'demiryolu', 'icme_suyu', 'kanalizasyon', 'baraj', 'liman', 'havalimani']) expect(ids).toContain(id);
    const s5 = setup(5); for (let i = 0; i < 60; i++) { const t = generateInfraTender(s5, 'ankara')!; expect(INFRA_KINDS.find((k) => k.id === t.kind)!.level).toBeLessThanOrEqual(5); }
    const s8 = setup(8); const kinds = new Set<string>(); for (let i = 0; i < 400; i++) kinds.add(generateInfraTender(s8, 'ankara')!.kind); expect(kinds.size).toBeGreaterThanOrEqual(10);
    const t = generateInfraTender(s8, 'ankara')!; expect(t.req.machines).toBeGreaterThan(0); expect(t.rivals.length).toBeGreaterThanOrEqual(3); expect(t.bondPct).toBeGreaterThan(0); expect(t.months).toBeGreaterThan(5);
  });
  it('teklif ihtimali: düşük fiyat daha yüksek ihtimal, çok düşük fiyat elenir; kâr marjı hesaplanır', () => {
    const s = setup(); const t = generateInfraTender(s, 'ankara')!; const lo = winOdds(s, t, Math.round(t.refCost * 0.86)), hi = winOdds(s, t, Math.round(t.refCost * 0.99)); expect(lo.odds).toBeGreaterThanOrEqual(hi.odds); expect(hi.margin).toBeGreaterThan(lo.margin);
    expect(winOdds(s, t, Math.round(t.refCost * 0.5)).odds).toBe(0); expect(winOdds(s, t, Math.round(t.refCost * 0.9))).toEqual(winOdds(s, t, Math.round(t.refCost * 0.9)));
  });
});
describe('altyapı ve taahhüt: yürütme', () => {
  it('malzeme gerçek stoktan tüketilir; otomatik alım kapalı ve stok yoksa iş malzeme yüzünden durur', () => {
    const s = setup(); s.company!.procurement.auto = false; const { j } = win(s, 'yol'); advanceDays(s, 5); expect(j.stalled).toBe('malzeme'); expect(j.progress).toBe(0);
    for (const [id, q] of jobNeeds(s, j, 0.2)) s.stock[id] = { qty: q * 3, qual: 0, cost: TL(1000) }; const before = Object.fromEntries(Object.keys(s.stock).map((k) => [k, stockQty(s, k)])); advanceDays(s, 20);
    expect(j.progress).toBeGreaterThan(0); expect(Object.keys(before).some((k) => stockQty(s, k) < before[k]! - 1e-6)).toBe(true); expect(MAT_SHARE).toBeGreaterThan(0);
  });
  it('otomatik alım açıkken malzeme sipariş edilir ve iş ilerler', () => {
    const s = setup(); const { j } = win(s, 'icme_suyu'); const evs: GameEvent[] = []; for (let d = 0; d < 60; d += 5) evs.push(...advanceDays(s, 5)); expect(s.ledger.some((e) => e.cat === 'malzeme' && e.amount < 0)).toBe(true); expect(j.progress).toBeGreaterThan(0.02); expect(checkInvariant(s)).toBe(true);
  });
  it('kabul süreci: bitiş → geçici kabul → 180 gün garanti → kesin kabul; teminat ve tutulan bedel çözülür; toplam tahsilat sözleşme + ek iş', () => {
    const s = setup(); const { j } = win(s, 'icme_suyu'); const cash0 = s.company!.cash; const seen = new Set<string>();
    for (let d = 0; d < j.months * 30 + 1200 && j.status !== 'bitti'; d += 10) { advanceDays(s, 10); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); seen.add(j.status); }
    expect(j.status).toBe('bitti'); expect(seen.has('kabul')).toBe(true); expect(seen.has('garanti')).toBe(true); expect(j.bondReturned).toBe(true); expect(j.retention ?? 0).toBe(0); advanceDays(s, 60); expect(j.pending.length).toBe(0);
    const cashIn = s.ledger.filter((e) => e.cat === 'altyapi_gelir').reduce((a, e) => a + e.amount, 0); expect(Math.abs(cashIn - (j.price + (j.claimed ?? 0)))).toBeLessThan(200); // 10'lu dilimlerde kuruş yuvarlaması expect(j.result!.profit).toBe(j.price + (j.claimed ?? 0) - j.spent); expect(RETENTION).toBe(0.05); expect(checkInvariant(s)).toBe(true); void cash0;
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) expect(r.state.infra[0]!.status).toBe('bitti');
  });
  it('geçici kabulde net varlık hakedişleri ve tutulan teminatı içerir; aylık olaylar (maliyet aşımı, teknik sorun, denetim) zamanla görülür', () => {
    const s = setup(); const { j } = win(s, 'tunel'); const evs: GameEvent[] = []; for (let i = 0; i < 70; i++) { evs.push(...advanceDays(s, 30)); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); if (j.status === 'bitti') break; }
    const types = new Set(evs.map((e) => e.type)); expect(types.has('INFRA_INSPECTION')).toBe(true); expect(['INFRA_OVERRUN', 'INFRA_TECH'].some((x) => types.has(x))).toBe(true); expect(Number.isFinite(infraAssets(s))).toBe(true);
    const k2 = setup(); const w2 = win(k2, 'metro'); const over0 = w2.j.trueCost; for (let i = 0; i < 400; i++) { infraMonthly(k2, []); } expect(w2.j.trueCost).toBeGreaterThan(over0); expect(w2.j.overrun!).toBeGreaterThan(0); expect(w2.j.claimed!).toBeGreaterThan(0);
  });
});
