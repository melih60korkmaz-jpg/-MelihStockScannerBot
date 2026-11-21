import { TL, type Money } from '../core/money';
import { pick, rand, randInt } from '../core/rng';
import type { GameEvent, GameState, Parcel, Project, Tender } from '../core/types';
import { buildingType, cityData, STAGES } from '../data';
import { post } from './ledger';
import { winInfra } from './infra';
import { tenderRivals } from './rivals';
import { newDesignSeed, planProject } from './projects';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const EVAL_DAYS = 30, MAX_OPEN = 8;

interface Kind { id: string; label: string; type: string; quality: string; client: 'kamu' | 'ozel'; area: number; zoning: Parcel['zoning']; taks: number; kaks: number; floors: number; req: Tender['req']; bondPct: number; names: string[] }
export const KINDS: Kind[] = [
  { id: 'okul', label: 'İlkokul binası', type: 'ofis', quality: 'standart', client: 'kamu', area: 1800, zoning: 'ticaret', taks: 0.35, kaks: 1.05, floors: 3, req: { rep: 8, score: 350, completed: 0, staff: 4, machines: 0 }, bondPct: 0.03, names: ['Atatürk', 'Cumhuriyet', 'Fatih', 'Yunus Emre', 'Mimar Sinan'] },
  { id: 'belediye', label: 'Belediye hizmet binası', type: 'is_merkezi', quality: 'standart', client: 'kamu', area: 2200, zoning: 'ticaret', taks: 0.4, kaks: 1.6, floors: 4, req: { rep: 14, score: 420, completed: 1, staff: 6, machines: 1 }, bondPct: 0.03, names: ['Merkez', 'Kent', 'Çarşı', 'Yeni Mahalle', 'İlçe'] },
  { id: 'hastane', label: 'Devlet hastanesi eki', type: 'is_merkezi', quality: 'premium', client: 'kamu', area: 3500, zoning: 'ticaret', taks: 0.4, kaks: 2.0, floors: 5, req: { rep: 30, score: 520, completed: 2, staff: 10, machines: 2 }, bondPct: 0.04, names: ['Şehir', 'Devlet', 'Eğitim ve Araştırma', 'Kadın Doğum', 'Çocuk'] },
  { id: 'fabrika', label: 'Sanayi tesisi', type: 'fabrika', quality: 'standart', client: 'ozel', area: 3000, zoning: 'sanayi', taks: 0.5, kaks: 1.0, floors: 2, req: { rep: 10, score: 380, completed: 1, staff: 5, machines: 1 }, bondPct: 0.02, names: ['Gıda', 'Tekstil', 'Plastik', 'Makine', 'Mobilya'] },
  { id: 'konut', label: 'Büyük konut projesi', type: 'site', quality: 'standart', client: 'ozel', area: 6000, zoning: 'konut', taks: 0.3, kaks: 1.5, floors: 6, req: { rep: 22, score: 480, completed: 2, staff: 8, machines: 2 }, bondPct: 0.03, names: ['Toplu Konut', 'Kooperatif', 'Kentsel Dönüşüm', 'Vadi', 'Park'] },
];

const mkParcel = (s: GameState, cityId: string, k: Kind, scale: number): Parcel => {
  const dist = cityData(cityId)!.districts; const d = dist[randInt(s.rng, 'misc', 0, dist.length - 1)]!;
  return { id: -1, city: cityId, district: d.id, hood: 'İhale Sahası', area: Math.round(k.area * scale), zoning: k.zoning, taks: k.taks, kaks: k.kaks, maxFloors: k.floors + 2, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 85, growth: 0.03, growthKnown: true, unitBase: TL(2000), askMult: 1, reserveMult: 1, negoLockUntil: 0, owner: 'player', clientLand: true, costBasis: 0 };
};

export function generateTender(s: GameState, cityId: string): Tender | null {
  const k = pick(s.rng, 'misc', KINDS), scale = 0.85 + rand(s.rng, 'misc') * 0.5; const pc = mkParcel(s, cityId, k, scale);
  const plan = planProject(s, pc, k.type, k.quality, 0); if (!plan.ok) return null;
  const trueCost = plan.cost.total - plan.cost.designFee; const ref = Math.round(trueCost * 1.2), day = s.clock.day;
  const name = pick(s.rng, 'misc', k.names), prov = cityData(cityId)!.label;
  const rivals = tenderRivals(s, randInt(s.rng, 'misc', 3, 4), ref);
  return {
    id: s.nextId++, kind: k.id, title: `${prov} ${name} ${k.label}`, city: cityId, client: k.client, type: k.type, quality: k.quality, area: pc.area, months: Math.round((plan.months.min + plan.months.max) / 2),
    refCost: ref, trueCost, req: { ...k.req, rep: Math.min(80, Math.round(k.req.rep * (0.9 + plan.cost.total / TL(400_000_000)))) }, bondPct: k.bondPct, openDay: day, evalDay: day + EVAL_DAYS, rivals, status: 'acik',
  };
}

export interface Eligibility { ok: boolean; checks: { label: string; need: number; have: number; ok: boolean }[] }
export function eligibility(s: GameState, t: Tender): Eligibility {
  const c = s.company!, r = t.req;
  const checks = [
    { label: 'İtibar', need: r.rep, have: Math.round(c.reputation), ok: c.reputation >= r.rep },
    { label: 'Kredi notu', need: r.score, have: Math.round(c.creditScore), ok: c.creditScore >= r.score },
    { label: 'Tamamlanan proje', need: r.completed, have: c.stats.completed, ok: c.stats.completed >= r.completed },
    { label: 'Çalışan', need: r.staff, have: s.staff.length, ok: s.staff.length >= r.staff },
    { label: 'Makine', need: r.machines, have: s.machines.length, ok: s.machines.length >= r.machines },
  ];
  return { ok: checks.every((x) => x.ok), checks };
}
export const bondOf = (t: Tender, price: Money): Money => Math.round(price * t.bondPct);
/** Teklif aralığı: ihale yaklaşık maliyetinin %80'i altı olağan dışı düşük (elenir); kamuda yaklaşık maliyet üstü geçersiz. */
export const bidLimits = (t: Tender) => ({ min: Math.round(t.refCost * 0.8), max: Math.round(t.refCost * (t.client === 'kamu' ? 1.0 : 1.12)) });

export function bidError(s: GameState, t: Tender | undefined, price: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.'; if (!t) return 'İhale bulunamadı.'; if (t.status !== 'acik') return 'İhale kapandı.'; if (t.bid) return 'Bu ihaleye zaten teklif verdiniz.';
  if (!s.openCities.includes(t.city)) return 'Bu ilde şubeniz yok.';
  if (!(price > 0)) return 'Geçersiz teklif.'; const el = eligibility(s, t); if (!el.ok) return 'Şartları sağlamıyorsunuz: ' + el.checks.filter((x) => !x.ok).map((x) => x.label).join(', ') + '.';
  const { max } = bidLimits(t); if (price > max) return 'Teklif, yaklaşık maliyet sınırını aşıyor.';
  if (c.cash < bondOf(t, price)) return 'Teminat için yeterli nakit yok.';
  return null;
}
export function placeBid(s: GameState, t: Tender, price: Money, events: GameEvent[]): void {
  const bond = bondOf(t, price); post(s, 'teminat', -bond, { memo: `İhale teminatı: ${t.title}` }); t.bid = { price, day: s.clock.day, bond };
  events.push({ type: 'BID_PLACED', day: s.clock.day, data: { tenderId: t.id, price } });
}

function playerScores(s: GameState, t: Tender) {
  const c = s.company!, techBase = clamp(35 + c.stats.completed * 4 + s.staff.length * 1.5 + s.machines.length * 3 + (c.satisfaction - 60) * 0.3, 0, 100);
  return { tech: techBase, rep: c.reputation };
}
function score(price: number, minPrice: number, tech: number, rep: number, credit: number, cap: number): number {
  return 40 * (minPrice / price) + 25 * (tech / 100) + 15 * (rep / 100) + 10 * clamp(credit / 800, 0, 1) + 10 * clamp(cap, 0, 1);
}

/** Değerlendirme: puan = fiyat 40 + teknik 25 + itibar 15 + mali 10 + kapasite 10; olağan dışı düşük teklif elenir. */
export function evaluateTender(s: GameState, t: Tender, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day, min = Math.round(t.refCost * 0.8);
  if (!t.bid) { t.status = 'iptal'; t.result = { winner: '—', scores: [], reason: 'Süresinde teklif verilmedi.' }; return; }
  const entries: { name: string; score: number; me?: boolean }[] = [];
  const valid = [t.bid.price, ...t.rivals.map((r) => r.price)].filter((p) => p >= min); const lowest = Math.min(...valid);
  const ps = playerScores(s, t), cap = (s.staff.length + s.machines.length * 2) / Math.max(1, t.req.staff + t.req.machines * 2) / 1.5;
  if (t.bid.price >= min) entries.push({ name: c.name, me: true, score: +score(t.bid.price, lowest, ps.tech, ps.rep, c.creditScore, cap).toFixed(2) });
  for (const r of t.rivals) if (r.price >= min) entries.push({ name: r.name, score: +score(r.price, lowest, r.tech, r.rep, 400 + r.rep * 5, 0.5 + r.rep / 200).toFixed(2) });
  entries.sort((a, b) => b.score - a.score); const top = entries[0]; const out = { scores: entries.map((e) => ({ name: e.name, score: e.score })) };
  if (t.bid.price < min) {
    t.status = 'elendi'; t.result = { winner: top?.name ?? '—', ...out, reason: 'Olağan dışı düşük teklif: elendiniz.' }; post(s, 'teminat', t.bid.bond, { memo: 'Teminat iadesi' });
    events.push({ type: 'TENDER_LOST', day, data: { tenderId: t.id, reason: 'elendi' } }); return;
  }
  if (top?.me) { t.status = 'kazandi'; t.result = { winner: c.name, ...out }; if (t.infra) winInfra(s, t, events); else winTender(s, t, events); }
  else { const rv = s.rivals.find((r) => r.name === top!.name); if (rv) { rv.wins++; rv.projects++; rv.last = 'ihale'; } t.status = 'kaybetti'; t.result = { winner: top!.name, ...out }; post(s, 'teminat', t.bid.bond, { memo: 'Teminat iadesi' }); c.reputation = clamp(c.reputation, 0, 100); events.push({ type: 'TENDER_LOST', day, data: { tenderId: t.id, winner: top!.name } }); }
}

/** Kazanılan ihale: işveren arsası + sözleşmeli proje; %10 avans; aşama bazlı hakediş (45 gün vadeli). */
function winTender(s: GameState, t: Tender, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day, price = t.bid!.price;
  const pc = mkParcel(s, t.city, { ...KINDS.find((k) => k.id === t.kind)! }, t.area / KINDS.find((k) => k.id === t.kind)!.area); pc.id = s.nextId++; s.parcels.push(pc);
  const plan = planProject(s, pc, t.type, t.quality, 0); const id = s.nextId++, advance = Math.round(price * 0.1);
  const pr: Project = {
    id, parcelId: pc.id, hood: pc.hood, name: t.title, type: t.type, quality: t.quality, designSeed: newDesignSeed(s), status: 'taslak', createdDay: day, cityId: t.city,
    floors: plan.floors, emsal: plan.emsal, brut: plan.brut, satilabilir: plan.satilabilir, matIndexAtPlan: s.macro.materialIndex,
    budget: { base: plan.cost.base, soil: plan.cost.soil, soft: plan.cost.soft, total: plan.cost.total - plan.cost.designFee, designFee: 0 }, expected: { revenue: price, months: t.months },
    contract: { tenderId: t.id, client: t.client === 'kamu' ? 'Kamu idaresi' : 'Özel işveren', price, advance, deadline: day + t.months * 30 + 90, bond: t.bid!.bond, pending: [], doneShare: 0 },
  };
  s.projects.push(pr); pc.projectId = id; post(s, 'hakedis', advance, { projectId: id, memo: `${t.title}: avans` });
  c.reputation = clamp(c.reputation + 2, 0, 100);
  events.push({ type: 'TENDER_WON', day, pause: true, data: { tenderId: t.id, projectId: id, price } });
}

/** Her aşama tamamlandığında hakediş doğar: (fiyat − avans) × aşama payı, 45 gün sonra tahsil. */
export function onStageDone(s: GameState, p: Project, stageIdx: number): void {
  const k = p.contract; if (!k) return; const share = STAGES[stageIdx]!.cost / 100; if (share <= 0) return;
  const amt = Math.round((k.price - k.advance) * share); k.pending.push({ day: s.clock.day + 45, amount: amt }); k.doneShare += share;
}
/** Bitiş: kalan hakediş + teminat iadesi; gecikme cezası (günde %0.1, en çok %10). */
export function finishContract(s: GameState, p: Project, events: GameEvent[]): void {
  const k = p.contract!, c = s.company!, day = s.clock.day, late = Math.max(0, day - k.deadline);
  const rest = Math.max(0, 1 - k.doneShare); if (rest > 0.0001) k.pending.push({ day: day + 45, amount: Math.round((k.price - k.advance) * rest) });
  const penalty = Math.round(k.price * Math.min(0.1, late * 0.001)); if (penalty > 0) post(s, 'garanti', -penalty, { projectId: p.id, memo: 'Sözleşme gecikme cezası' });
  if (!k.bondReturned) { post(s, 'teminat', k.bond, { memo: 'Kesin teminat iadesi' }); k.bondReturned = true; }
  const cost = p.result!.cost, profit = k.price - penalty - cost;
  p.status = 'satildi'; p.result = { ...p.result!, revenue: k.price - penalty, profit, soldDay: day }; c.stats.sold++; c.stats.profit += profit;
  c.reputation = clamp(c.reputation + (late === 0 ? 3 : late < 60 ? 0 : -2), 0, 100); c.creditScore = clamp(c.creditScore + 8, 100, 900);
  events.push({ type: 'CONTRACT_DONE', day, pause: true, data: { projectId: p.id, price: k.price, penalty, profit, late } });
}
/** Net değer: tahsil edilecek hakedişler (+), kazanılmamış avans (−), teminatlar (+). */
export function contractAssets(s: GameState): Money {
  let v = 0;
  for (const t of s.tenders) if (t.status === 'acik' && t.bid) v += t.bid.bond;
  for (const p of s.projects) { const k = p.contract; if (!k) continue; v += k.pending.reduce((a, x) => a + x.amount, 0); if (!k.bondReturned) v += k.bond; if (p.status !== 'satildi') v -= Math.round(k.advance * Math.max(0, 1 - k.doneShare)); }
  return v;
}

export function tendersDaily(s: GameState, events: GameEvent[]): void {
  const day = s.clock.day;
  for (const t of s.tenders) if (t.status === 'acik' && day >= t.evalDay) evaluateTender(s, t, events);
  for (const p of s.projects) { const k = p.contract; if (!k) continue; const due = k.pending.filter((x) => x.day <= day); if (due.length) { for (const d of due) post(s, 'hakedis', d.amount, { projectId: p.id, memo: `${p.name}: hakediş` }); k.pending = k.pending.filter((x) => x.day > day); events.push({ type: 'HAKEDIS', day, data: { projectId: p.id, amount: due.reduce((a, x) => a + x.amount, 0) } }); } }
}
export function tendersMonthly(s: GameState, events: GameEvent[]): void {
  s.tenders = s.tenders.filter((t) => t.status === 'acik' || s.clock.day - t.evalDay < 90);
  let open = s.tenders.filter((t) => t.status === 'acik').length;
  for (const city of s.openCities) { if (open >= MAX_OPEN) break; if (s.tenders.some((t) => t.status === 'acik' && t.city === city) && rand(s.rng, 'misc') < 0.6) continue; if (rand(s.rng, 'misc') < 0.55) { const t = generateTender(s, city); if (t) { s.tenders.push(t); open++; events.push({ type: 'TENDER_NEW', day: s.clock.day, data: { tenderId: t.id } }); } } }
}
