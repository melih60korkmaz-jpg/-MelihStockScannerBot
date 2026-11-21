import { focusId } from './control';
import { TL, type Money } from '../core/money';
import { pick, rand, randInt } from '../core/rng';
import type { GameEvent, GameState, InfraJob, Tender } from '../core/types';
import { cityData } from '../data';
import { post } from './ledger';
import { tenderRivals } from './rivals';
import { traitEff } from './staff';

/**
 * Altyapı işleri (yol, köprü, tünel, baraj, şebeke): kamu ihaleleriyle kazanılır. Bina projelerinden farklı olarak ilerleme
 * makine parkına ve saha ekibine bağlıdır; her %10'luk ilerleme bir hakediş doğurur (45 gün vadeli), bitişte kalan hakediş ve teminat iade edilir.
 */
interface InfraKind { id: string; label: string; ico: string; ref: [number, number]; months: [number, number]; req: Tender['req']; bondPct: number; names: string[] }
export const INFRA_KINDS: InfraKind[] = [
  { id: 'sebeke', label: 'Kanalizasyon ve içme suyu şebekesi', ico: '🚰', ref: [40, 90], months: [10, 16], req: { rep: 25, score: 480, completed: 2, staff: 10, machines: 3 }, bondPct: 0.03, names: ['Merkez', 'Yeni Yerleşim', 'Sanayi Bölgesi'] },
  { id: 'yol', label: 'Karayolu bağlantısı', ico: '🛣️', ref: [70, 130], months: [14, 22], req: { rep: 30, score: 520, completed: 3, staff: 12, machines: 4 }, bondPct: 0.03, names: ['Çevre Yolu', 'Bağlantı Yolu', 'Kavşak ve Yan Yol'] },
  { id: 'kopru', label: 'Köprü', ico: '🌉', ref: [180, 400], months: [24, 36], req: { rep: 40, score: 600, completed: 5, staff: 18, machines: 6 }, bondPct: 0.03, names: ['Nehir Köprüsü', 'Vadi Köprüsü', 'Kentsel Köprü'] },
  { id: 'tunel', label: 'Tünel', ico: '🚇', ref: [260, 600], months: [30, 44], req: { rep: 50, score: 640, completed: 6, staff: 22, machines: 7 }, bondPct: 0.035, names: ['Dağ Geçişi', 'Kent Tüneli', 'Metro Tüneli'] },
  { id: 'baraj', label: 'Baraj ve gölet', ico: '🏞️', ref: [320, 800], months: [36, 48], req: { rep: 55, score: 660, completed: 7, staff: 26, machines: 8 }, bondPct: 0.035, names: ['Sulama Barajı', 'İçme Suyu Göleti', 'Taşkın Barajı'] },
];
export const infraKind = (id: string) => INFRA_KINDS.find((k) => k.id === id);
export const INFRA_MIN_LEVEL = 5, MAX_INFRA_OPEN = 2;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const FIELD = new Set(['isci', 'usta', 'kalipci', 'demirci', 'elektrikci', 'tesisatci', 'santiye_sefi']);
const HEAVY: Record<string, number> = { ekskavator: 1, dozer: 1, kamyon: 0.7, kepce: 0.8, beton_mikseri: 0.7, beton_pompasi: 0.6, kule_vinc: 0.9, mobil_vinc: 0.7, kompresor: 0.5, jenerator: 0.3, forklift: 0.3, iskele: 0.2 };

export function generateInfraTender(s: GameState, cityId: string): Tender | null {
  const k = pick(s.rng, 'misc', INFRA_KINDS), scale = rand(s.rng, 'misc'); const label = cityData(cityId)?.label; if (!label) return null;
  const ref = Math.round(TL((k.ref[0] + (k.ref[1] - k.ref[0]) * scale) * 1_000_000) * s.costIndex), trueCost = Math.round(ref / 1.2), day = s.clock.day, months = randInt(s.rng, 'misc', k.months[0], k.months[1]);
  const name = pick(s.rng, 'misc', k.names), rivals = tenderRivals(s, randInt(s.rng, 'misc', 3, 4), ref);
  return { id: s.nextId++, infra: true, kind: k.id, title: `${label} ${name} ${k.label}`, city: cityId, client: 'kamu', type: 'altyapi', quality: 'standart', area: 0, months, refCost: ref, trueCost, req: { ...k.req }, bondPct: k.bondPct, openDay: day, evalDay: day + 30, rivals, status: 'acik' };
}

/** Her ay: seviye 5 ve üzeri şirketlere altyapı ihaleleri açılır (en çok 2 açık). */
export function infraMonthly(s: GameState): void {
  const c = s.company; if (!c || c.level < INFRA_MIN_LEVEL || !s.openCities.length) return;
  if (s.tenders.filter((t) => t.infra && t.status === 'acik').length >= MAX_INFRA_OPEN || rand(s.rng, 'misc') > 0.4) return;
  const t = generateInfraTender(s, pick(s.rng, 'misc', s.openCities)); if (t) s.tenders.push(t);
}
/** Eski, tamamen tahsil edilmiş işler listeden düşer (kayıt boyutu). */
export function infraPrune(s: GameState): void { s.infra = s.infra.filter((j) => j.status === 'devam' || j.pending.length > 0 || !j.result || s.clock.day - j.result.day < 365); }

/** İhale kazanılınca: proje yerine altyapı işi; %10 avans. */
export function winInfra(s: GameState, t: Tender, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day, price = t.bid!.price, advance = Math.round(price * 0.1);
  const job: InfraJob = { id: s.nextId++, tenderId: t.id, kind: t.kind, name: t.title, city: t.city, price, advance, bond: t.bid!.bond, trueCost: t.trueCost, startDay: day, deadline: day + t.months * 30 + 90, months: t.months, progress: 0, spent: 0, doneShare: 0, pending: [], status: 'devam', stalled: null };
  s.infra.push(job); post(s, 'altyapi_gelir', advance, { memo: `${t.title}: avans` }); c.reputation = clamp(c.reputation + 2, 0, 100);
  events.push({ type: 'TENDER_WON', day, pause: true, data: { tenderId: t.id, projectId: -job.id, price, infra: true } });
}

/** Saha ekibi ve makine parkından günlük kapasite çarpanı (1 = sözleşme hızı). Kapasite, aktif iş sayısına bölünür. */
export function infraCapacity(s: GameState, job: InfraJob): { machine: number; crew: number; cap: number } {
  const k = infraKind(job.kind)!, active = Math.max(1, s.infra.filter((j) => j.status === 'devam').length + s.projects.filter((p) => p.status === 'insaat').length);
  const mScore = s.machines.filter((m) => m.brokenUntil <= s.clock.day).reduce((a, m) => a + (HEAVY[m.type] ?? 0.2), 0) / active, mNeed = k.req.machines * 0.85;
  const crew = s.staff.filter((x) => FIELD.has(x.type)).reduce((a, x) => a + (0.8 + 0.4 * (x.experience / 100)) * (0.85 + 0.3 * (x.morale / 100)) * traitEff(x), 0) / active, cNeed = k.req.staff * 0.6;
  const machine = mScore / mNeed, crewF = crew / cNeed; return { machine, crew: crewF, cap: clamp(Math.min(machine, crewF), 0, 1.25) };
}

export function infraDaily(s: GameState, events: GameEvent[]): void {
  if (!s.infra.length) return; const day = s.clock.day, c = s.company!;
  for (const j of s.infra) {
    const due = j.pending.filter((x) => x.day <= day); if (due.length) { for (const d of due) post(s, 'altyapi_gelir', d.amount, { memo: `${j.name}: hakediş` }); j.pending = j.pending.filter((x) => x.day > day); }
  }
  for (const j of s.infra) {
    if (j.status !== 'devam') continue;
    const { cap } = infraCapacity(s, j); const w = s.weather[j.city] === 'kar' ? 0.35 : s.weather[j.city] === 'yagmur' ? 0.6 : 1;
    if (cap < 0.3) { j.stalled = 'kapasite'; continue; }
    const dp = Math.min(1 - j.progress, (cap * w * (focusId(s) === 'altyapi' ? 1.08 : 1)) / (j.months * 30)), cost = Math.round(dp * j.trueCost);
    if (cost > 0 && c.cash < cost) { j.stalled = 'nakit'; continue; }
    j.stalled = null; if (cost > 0) post(s, 'altyapi_gider', -cost, { memo: j.name }); j.progress += dp; j.spent += cost;
    while (j.progress >= j.doneShare + 0.1 - 1e-9 && j.doneShare < 1 - 1e-9 && j.progress < 1 - 1e-9) { j.doneShare = +(j.doneShare + 0.1).toFixed(2); j.pending.push({ day: day + 45, amount: Math.round((j.price - j.advance) * 0.1) }); }
    if (j.progress >= 1 - 1e-9) finishInfra(s, j, events);
  }
}

function finishInfra(s: GameState, j: InfraJob, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day, late = Math.max(0, day - j.deadline), rest = Math.max(0, 1 - j.doneShare);
  if (rest > 0.0001) j.pending.push({ day: day + 45, amount: Math.round((j.price - j.advance) * rest) });
  const penalty = Math.round(j.price * Math.min(0.1, late * 0.001)); if (penalty > 0) post(s, 'garanti', -penalty, { memo: `${j.name}: gecikme cezası` });
  if (!j.bondReturned) { post(s, 'teminat', j.bond, { memo: 'Kesin teminat iadesi' }); j.bondReturned = true; }
  j.progress = 1; j.status = 'bitti'; const profit = j.price - penalty - j.spent; j.result = { profit, late, day };
  c.stats.completed++; c.stats.sold++; c.stats.profit += profit; c.reputation = clamp(c.reputation + (late === 0 ? 4 : late < 60 ? 1 : -2), 0, 100); c.creditScore = clamp(c.creditScore + 8, 100, 900);
  events.push({ type: 'INFRA_DONE', day, pause: true, data: { id: j.id, name: j.name, price: j.price, profit, late } });
}
/** Net değer katkısı: tahsil edilecek hakedişler + teminat − kazanılmamış avans. */
export function infraAssets(s: GameState): Money {
  let v = 0; for (const j of s.infra) { v += j.pending.reduce((a, x) => a + x.amount, 0); if (!j.bondReturned) v += j.bond; if (j.status === 'devam') v -= Math.round(j.advance * Math.max(0, 1 - j.progress)); }
  return v;
}
export const activeInfra = (s: GameState) => s.infra.filter((j) => j.status === 'devam');
