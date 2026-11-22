import { TL, type Money } from '../core/money';
import { pick, rand, randInt } from '../core/rng';
import type { GameEvent, GameState, InfraJob, Tender } from '../core/types';
import { cityData, material } from '../data';
import { focusId } from './control';
import { mgmtPenaltyMult, deptEffect } from './mgmt';
import { post } from './ledger';
import { placeOrder, freeSpace, incomingQty, unitPrice } from './materials';
import { tenderRivals } from './rivals';
import { traitEff } from './staff';

/**
 * Altyapı ve taahhüt: kamu ihaleleriyle kazanılan büyük işler. İlerleme makine parkına ve saha ekibine bağlıdır; malzeme gerçek stoktan tüketilir (eksikse iş yavaşlar,
 * otomatik satın alma açıksa sipariş verilir). Her %10 ilerleme bir hakediş doğurur; iş bitince geçici kabul denetimi, ardından 180 günlük garanti ve kesin kabul gelir
 * (tutulan %5 teminat ve kalan banka teminatı kesin kabulde çözülür). İş sürerken maliyet aşımı, teknik sorun ve kamu denetimleri çıkabilir.
 */
interface InfraKind { id: string; label: string; ico: string; level: number; ref: [number, number]; months: [number, number]; req: Tender['req']; bondPct: number; names: string[]; mats: [string, number][]; risk: number }
export const INFRA_KINDS: InfraKind[] = [
  { id: 'icme_suyu', label: 'İçme suyu hattı', ico: '🚰', level: 5, ref: [30, 70], months: [8, 14], req: { rep: 22, score: 460, completed: 2, staff: 9, machines: 3 }, bondPct: 0.03, names: ['Merkez', 'Yeni Yerleşim', 'Köy Grubu'], mats: [['boru', 0.55], ['kum', 0.2], ['cimento', 0.1], ['beton', 0.15]], risk: 0.5 },
  { id: 'kanalizasyon', label: 'Kanalizasyon hattı', ico: '🚿', level: 5, ref: [40, 90], months: [10, 16], req: { rep: 25, score: 480, completed: 2, staff: 10, machines: 3 }, bondPct: 0.03, names: ['Merkez', 'Sanayi Bölgesi', 'Sahil'], mats: [['boru', 0.5], ['kum', 0.2], ['cimento', 0.1], ['beton', 0.2]], risk: 0.6 },
  { id: 'sebeke', label: 'Su ve kanalizasyon şebekesi', ico: '🚰', level: 5, ref: [40, 90], months: [10, 16], req: { rep: 25, score: 480, completed: 2, staff: 10, machines: 3 }, bondPct: 0.03, names: ['Merkez', 'Yeni Yerleşim', 'Sanayi Bölgesi'], mats: [['boru', 0.55], ['kum', 0.2], ['cimento', 0.1], ['beton', 0.15]], risk: 0.5 },
  { id: 'yol', label: 'Şehir içi yol', ico: '🛣️', level: 5, ref: [70, 130], months: [14, 22], req: { rep: 30, score: 520, completed: 3, staff: 12, machines: 4 }, bondPct: 0.03, names: ['Çevre Yolu', 'Bağlantı Yolu', 'Kavşak ve Yan Yol'], mats: [['cakil', 0.35], ['kum', 0.25], ['cimento', 0.2], ['boya', 0.05], ['demir', 0.15]], risk: 0.6 },
  { id: 'kopru', label: 'Köprü', ico: '🌉', level: 6, ref: [180, 400], months: [24, 36], req: { rep: 40, score: 600, completed: 5, staff: 18, machines: 6 }, bondPct: 0.03, names: ['Nehir Köprüsü', 'Vadi Köprüsü', 'Kentsel Köprü'], mats: [['demir', 0.35], ['beton', 0.4], ['cimento', 0.15], ['boya', 0.05], ['yalitim', 0.05]], risk: 1 },
  { id: 'viyadut', label: 'Viyadük', ico: '🛤️', level: 6, ref: [300, 700], months: [30, 42], req: { rep: 48, score: 630, completed: 6, staff: 22, machines: 7 }, bondPct: 0.035, names: ['Kavşak Viyadüğü', 'Vadi Viyadüğü', 'Kent Geçişi'], mats: [['demir', 0.35], ['beton', 0.4], ['cimento', 0.12], ['boya', 0.05], ['yalitim', 0.08]], risk: 1.1 },
  { id: 'demiryolu', label: 'Demiryolu hattı', ico: '🚆', level: 6, ref: [500, 1200], months: [36, 52], req: { rep: 52, score: 650, completed: 7, staff: 28, machines: 8 }, bondPct: 0.035, names: ['Hızlı Tren Hattı', 'Banliyö Hattı', 'Yük Hattı'], mats: [['demir', 0.35], ['cakil', 0.3], ['beton', 0.2], ['kablo', 0.15]], risk: 1.1 },
  { id: 'tunel', label: 'Tünel', ico: '🚇', level: 7, ref: [260, 600], months: [30, 44], req: { rep: 50, score: 640, completed: 6, staff: 22, machines: 7 }, bondPct: 0.035, names: ['Dağ Geçişi', 'Kent Tüneli', 'Karayolu Tüneli'], mats: [['beton', 0.4], ['demir', 0.3], ['cimento', 0.1], ['kablo', 0.1], ['yalitim', 0.1]], risk: 1.6 },
  { id: 'baraj', label: 'Baraj ve gölet', ico: '🏞️', level: 7, ref: [320, 800], months: [36, 48], req: { rep: 55, score: 660, completed: 7, staff: 26, machines: 8 }, bondPct: 0.035, names: ['Sulama Barajı', 'İçme Suyu Göleti', 'Taşkın Barajı'], mats: [['beton', 0.5], ['cimento', 0.25], ['demir', 0.15], ['cakil', 0.1]], risk: 1.3 },
  { id: 'liman', label: 'Liman', ico: '⚓', level: 7, ref: [700, 1600], months: [42, 56], req: { rep: 58, score: 680, completed: 8, staff: 32, machines: 10 }, bondPct: 0.035, names: ['Konteyner Limanı', 'Yolcu Limanı', 'Balıkçı Limanı'], mats: [['beton', 0.4], ['demir', 0.25], ['cimento', 0.15], ['kum', 0.1], ['boya', 0.1]], risk: 1.4 },
  { id: 'otoyol', label: 'Otoyol', ico: '🛣️', level: 8, ref: [600, 1400], months: [40, 56], req: { rep: 55, score: 660, completed: 7, staff: 30, machines: 8 }, bondPct: 0.035, names: ['Otoyol Kesimi', 'Çevre Otoyolu', 'Ulaşım Aksı'], mats: [['cakil', 0.3], ['kum', 0.2], ['cimento', 0.2], ['demir', 0.2], ['boya', 0.1]], risk: 1.2 },
  { id: 'metro', label: 'Metro hattı', ico: '🚊', level: 8, ref: [900, 2200], months: [48, 60], req: { rep: 60, score: 700, completed: 8, staff: 34, machines: 10 }, bondPct: 0.04, names: ['Metro Hattı', 'Hafif Raylı Sistem', 'Banliyö Metrosu'], mats: [['beton', 0.4], ['demir', 0.3], ['kablo', 0.15], ['yalitim', 0.1], ['cimento', 0.05]], risk: 1.8 },
  { id: 'havalimani', label: 'Havalimanı altyapısı', ico: '✈️', level: 8, ref: [1200, 3000], months: [48, 60], req: { rep: 62, score: 720, completed: 9, staff: 40, machines: 12 }, bondPct: 0.04, names: ['Pist ve Apron', 'Terminal Altyapısı', 'Yer Hizmetleri'], mats: [['beton', 0.3], ['demir', 0.25], ['cakil', 0.2], ['kablo', 0.15], ['yalitim', 0.1]], risk: 1.5 },
];
export const infraKind = (id: string) => INFRA_KINDS.find((k) => k.id === id);
export const INFRA_MIN_LEVEL = 5, MAX_INFRA_OPEN = 3, MAT_SHARE = 0.35, RETENTION = 0.05, ACCEPT_DAYS = 25, WARRANTY_DAYS = 180;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const FIELD = new Set(['isci', 'usta', 'kalipci', 'demirci', 'elektrikci', 'tesisatci', 'santiye_sefi', 'operator']);
const HEAVY: Record<string, number> = { ekskavator: 1, dozer: 1, kamyon: 0.7, damperli_kamyon: 0.8, kepce: 0.8, beton_mikseri: 0.7, beton_pompasi: 0.6, kule_vinc: 0.9, mobil_vinc: 0.7, kompresor: 0.5, jenerator: 0.3, forklift: 0.3, iskele: 0.2, silindir: 0.6 };
const note = (j: InfraJob, day: number, text: string) => { (j.events ??= []).push({ day, text }); if (j.events.length > 12) j.events.shift(); };

export function generateInfraTender(s: GameState, cityId: string): Tender | null {
  const lvl = s.company?.level ?? 1, pool = INFRA_KINDS.filter((k) => k.level <= lvl && k.id !== 'sebeke'); if (!pool.length) return null;
  const k = pick(s.rng, 'misc', pool), scale = rand(s.rng, 'misc'); const label = cityData(cityId)?.label; if (!label) return null;
  const ref = Math.round(TL((k.ref[0] + (k.ref[1] - k.ref[0]) * scale) * 1_000_000) * s.costIndex), trueCost = Math.round(ref / 1.2), day = s.clock.day, months = randInt(s.rng, 'misc', k.months[0], k.months[1]);
  const name = pick(s.rng, 'misc', k.names), rivals = tenderRivals(s, randInt(s.rng, 'misc', 3, 4), ref);
  return { id: s.nextId++, infra: true, kind: k.id, title: `${label} ${name} ${k.label}`, city: cityId, client: 'kamu', type: 'altyapi', quality: 'standart', area: 0, months, refCost: ref, trueCost, req: { ...k.req }, bondPct: k.bondPct, openDay: day, evalDay: day + 30, rivals, status: 'acik' };
}

/** Her ay: seviye 5 ve üzeri şirketlere altyapı ihaleleri açılır (en çok 3 açık); iş sürerken maliyet aşımı, teknik sorun ve denetim olayları işler. */
export function infraMonthly(s: GameState, events: GameEvent[] = []): void {
  const c = s.company; if (!c || c.level < INFRA_MIN_LEVEL || !s.openCities.length) return;
  if (s.tenders.filter((t) => t.infra && t.status === 'acik').length < MAX_INFRA_OPEN && rand(s.rng, 'misc') <= 0.45) { const t = generateInfraTender(s, pick(s.rng, 'misc', s.openCities)); if (t) s.tenders.push(t); }
  const day = s.clock.day;
  for (const j of s.infra) {
    if (j.status !== 'devam') continue; const k = infraKind(j.kind); if (!k) continue; const hukuk = deptEffect(s, 'hukuk');
    // maliyet aşımı: zemin, fiyat ve tasarım değişikliği; kurum ek iş talebinin bir kısmını karşılar
    if (rand(s.rng, 'misc') < 0.03 * k.risk) {
      const over = Math.round(j.price * (0.02 + rand(s.rng, 'misc') * 0.04) * k.risk), claim = Math.round(over * clamp(0.3 + 0.4 * hukuk, 0.3, 0.7));
      j.trueCost += over; j.overrun = (j.overrun ?? 0) + over; if (claim > 0) { j.pending.push({ day: day + 60, amount: claim }); j.claimed = (j.claimed ?? 0) + claim; }
      note(j, day, `Maliyet aşımı ${(over / 100 / 1e6).toFixed(1)} M₺ (ek iş talebi ${(claim / 100 / 1e6).toFixed(1)} M₺ karşılanacak)`); events.push({ type: 'INFRA_OVERRUN', day, data: { id: j.id, name: j.name, over, claim } });
    }
    // teknik sorun: zemin suyu, tasarım hatası, ruhsat; iş bir süre durur
    if (rand(s.rng, 'misc') < 0.025 * k.risk && (j.techUntil ?? 0) <= day) { const d = randInt(s.rng, 'misc', 6, 20); j.techUntil = day + d; note(j, day, `Teknik sorun: iş ${d} gün durdu`); events.push({ type: 'INFRA_TECH', day, data: { id: j.id, name: j.name, days: d } }); }
    // kamu denetimi: üç ayda bir; malzeme kalitesi ve ekip düzeyine bağlı
    if (day - j.startDay > 60 && (day - j.startDay) % 90 < 30 && (j.inspections ?? 0) < Math.floor((day - j.startDay) / 90) + 1) {
      j.inspections = (j.inspections ?? 0) + 1; const q = jobQuality(j), pass = rand(s.rng, 'misc') < clamp(0.72 + q * 0.2 + hukuk * 0.05, 0.3, 0.97);
      if (pass) { c.reputation = clamp(c.reputation + 0.5, 0, 100); note(j, day, 'Kamu denetimi: uygun'); events.push({ type: 'INFRA_INSPECTION', day, data: { id: j.id, name: j.name, ok: true } }); }
      else { const fine = Math.round(j.price * 0.004 * mgmtPenaltyMult(s)); post(s, 'garanti', -fine, { memo: `${j.name}: denetim cezası` }); j.failedInsp = (j.failedInsp ?? 0) + 1; j.techUntil = Math.max(j.techUntil ?? 0, day + 10); c.reputation = clamp(c.reputation - 1.5, 0, 100); note(j, day, `Kamu denetimi: eksiklik, ceza ${(fine / 100 / 1e6).toFixed(2)} M₺, 10 gün düzeltme`); events.push({ type: 'INFRA_INSPECTION', day, data: { id: j.id, name: j.name, ok: false, fine } }); }
    }
  }
}
/** Eski, tamamen tahsil edilmiş işler listeden düşer (kayıt boyutu). */
export function infraPrune(s: GameState): void { s.infra = s.infra.filter((j) => j.status !== 'bitti' || j.pending.length > 0 || !j.result || s.clock.day - j.result.day < 365); }
export const jobQuality = (j: InfraJob): number => (j.qW && j.qW > 0 ? clamp((j.qSum ?? 0) / j.qW, -1, 1) : 0);

/** İhale kazanılınca: proje yerine altyapı işi; %10 avans. */
export function winInfra(s: GameState, t: Tender, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day, price = t.bid!.price, advance = Math.round(price * 0.1);
  const job: InfraJob = { id: s.nextId++, tenderId: t.id, kind: t.kind, name: t.title, city: t.city, price, advance, bond: t.bid!.bond, trueCost: t.trueCost, startDay: day, deadline: day + t.months * 30 + 90, months: t.months, progress: 0, spent: 0, doneShare: 0, pending: [], status: 'devam', stalled: null, retention: 0, qSum: 0, qW: 0 };
  s.infra.push(job); post(s, 'altyapi_gelir', advance, { memo: `${t.title}: avans` }); c.reputation = clamp(c.reputation + 2, 0, 100);
  events.push({ type: 'TENDER_WON', day, pause: true, data: { tenderId: t.id, projectId: -job.id, price, infra: true } });
}

/** Saha ekibi ve makine parkından günlük kapasite çarpanı (1 = sözleşme hızı). Kapasite, aktif iş sayısına bölünür. */
export function infraCapacity(s: GameState, job: InfraJob): { machine: number; crew: number; cap: number } {
  const k = infraKind(job.kind)!, active = Math.max(1, s.infra.filter((j) => j.status === 'devam').length + s.projects.filter((p) => p.status === 'insaat').length);
  const mScore = s.machines.filter((m) => m.brokenUntil <= s.clock.day && !(m.rentedOut && m.rentedOut.until > s.clock.day)).reduce((a, m) => a + (HEAVY[m.type] ?? 0.2) * (0.6 + 0.4 * ((m.cond ?? 85) / 100)), 0) / active, mNeed = k.req.machines * 0.85;
  const crew = s.staff.filter((x) => FIELD.has(x.type)).reduce((a, x) => a + (0.8 + 0.4 * (x.experience / 100)) * (0.85 + 0.3 * (x.morale / 100)) * traitEff(x), 0) / active, cNeed = k.req.staff * 0.6;
  const machine = mScore / mNeed, crewF = crew / cNeed; return { machine, crew: crewF, cap: clamp(Math.min(machine, crewF), 0, 1.25) };
}
/** Bir gün için işin malzeme ihtiyacı (miktar): ilerleme payı × gerçek maliyetin malzeme kısmı ÷ birim fiyat. */
export function jobNeeds(s: GameState, j: InfraJob, dp: number): [string, number][] {
  const k = infraKind(j.kind)!; return k.mats.map(([id, f]) => [id, (dp * j.trueCost * MAT_SHARE * f) / Math.max(1, unitPrice(s, id, 'yerel'))] as [string, number]);
}
/** Otomatik satın alma açıksa iki haftalık ihtiyaç kadar eksik malzeme sipariş edilir (depo ve nakit elverdiğince). */
function infraAutoBuy(s: GameState, j: InfraJob, cap: number, events: GameEvent[]): void {
  const c = s.company!; if (!c.procurement.auto) return; const dpDay = Math.min(1 - j.progress, cap / (j.months * 30)), sup = c.procurement.supplier;
  for (const [id, perDay] of jobNeeds(s, j, dpDay)) {
    const have = (s.stock[id]?.qty ?? 0) + incomingQty(s, id), want = perDay * 15; if (have >= perDay * 8) continue; const sp = material(id)!.space; let qty = want - have; if (sp > 0) qty = Math.min(qty, Math.floor(freeSpace(s) / sp * 1000) / 1000); if (qty <= 1e-6) continue;
    placeOrder(s, id, Math.ceil(qty * 1000) / 1000, sup, events);
  }
}

export function infraDaily(s: GameState, events: GameEvent[]): void {
  if (!s.infra.length) return; const day = s.clock.day, c = s.company!;
  for (const j of s.infra) {
    const due = j.pending.filter((x) => x.day <= day); if (due.length) { for (const d of due) post(s, 'altyapi_gelir', d.amount, { memo: `${j.name}: hakediş` }); j.pending = j.pending.filter((x) => x.day > day); }
  }
  for (const j of s.infra) {
    if (j.status === 'kabul') { if ((j.acceptAt ?? day) <= day) acceptanceCheck(s, j, events); continue; }
    if (j.status === 'garanti') { if ((j.garantiEnd ?? day) <= day) finalAcceptance(s, j, events); continue; }
    if (j.status !== 'devam') continue;
    const { cap } = infraCapacity(s, j), focus = focusId(s) === 'altyapi' ? 1.08 : 1;
    if ((j.techUntil ?? 0) > day) { j.stalled = 'teknik'; continue; }
    if (cap < 0.3) { j.stalled = 'kapasite'; continue; }
    let dp = Math.min(1 - j.progress, (cap * focus) / (j.months * 30)); infraAutoBuy(s, j, cap * focus, events);
    // malzeme: stok yetmiyorsa ilerleme stokla sınırlanır
    const needs = jobNeeds(s, j, dp); let short = '';
    for (const [id, q] of needs) { const have = s.stock[id]?.qty ?? 0; if (q > 0 && have < q) { dp *= have / q; short = id; } }
    if (dp < 1e-6) { j.stalled = 'malzeme'; j.matShort = short; continue; }
    const cost = Math.round(dp * j.trueCost * (1 - MAT_SHARE));
    if (cost > 0 && c.cash < cost) { j.stalled = 'nakit'; continue; }
    j.stalled = null; delete j.matShort; if (cost > 0) post(s, 'altyapi_gider', -cost, { memo: j.name });
    let matVal = 0; for (const [id, q0] of jobNeeds(s, j, dp)) { const it = s.stock[id]; if (!it) continue; const q = Math.min(q0, it.qty); it.qty -= q; matVal += Math.round(q * it.cost); j.qSum = (j.qSum ?? 0) + q * it.cost * (it.qual); j.qW = (j.qW ?? 0) + q * it.cost; }
    j.progress += dp; j.spent += cost + matVal;
    while (j.progress >= j.doneShare + 0.1 - 1e-9 && j.doneShare < 1 - 1e-9 && j.progress < 1 - 1e-9) { j.doneShare = +(j.doneShare + 0.1).toFixed(2); j.pending.push({ day: day + 45, amount: Math.round((j.price - j.advance) * (1 - RETENTION) * 0.1) }); }
    if (j.progress >= 1 - 1e-9) completeInfra(s, j, events);
  }
}

/** İş bitti: gecikme cezası hesaplanır, geçici kabul denetimi için beklenir (kalan hakediş kabulden sonra ödenir). */
function completeInfra(s: GameState, j: InfraJob, events: GameEvent[]): void {
  const day = s.clock.day, late = Math.max(0, day - j.deadline), penalty = Math.round(j.price * Math.min(0.1, late * 0.001) * mgmtPenaltyMult(s));
  if (penalty > 0) post(s, 'garanti', -penalty, { memo: `${j.name}: gecikme cezası` }); j.late = late; j.progress = 1; j.status = 'kabul'; j.acceptAt = day + ACCEPT_DAYS; j.spent += penalty; j.techUntil = undefined;
  note(j, day, `İş tamamlandı; geçici kabul ${ACCEPT_DAYS} gün içinde${late ? ` (${late} gün gecikme)` : ''}`); events.push({ type: 'INFRA_FINISHED', day, data: { id: j.id, name: j.name, late } });
}
/** Geçici kabul: kalite denetimi. Geçerse kalan hakediş ve teminatın yarısı çözülür, 180 günlük garanti başlar; kalırsa onarım masrafı ve +20 gün. */
function acceptanceCheck(s: GameState, j: InfraJob, events: GameEvent[]): void {
  const day = s.clock.day, c = s.company!, q = jobQuality(j), pass = rand(s.rng, 'misc') < clamp(0.8 + q * 0.18 - (j.failedInsp ?? 0) * 0.05 + deptEffect(s, 'hukuk') * 0.04, 0.35, 0.97);
  if (!pass && (j.rework ?? 0) < j.price * 0.1) { const fix = Math.round(j.price * (0.02 + rand(s.rng, 'misc') * 0.03)); post(s, 'altyapi_gider', -fix, { memo: `${j.name}: kabul eksikleri onarımı` }); j.rework = (j.rework ?? 0) + fix; j.spent += fix; j.acceptAt = day + 20; note(j, day, `Geçici kabul reddedildi: onarım ${(fix / 100 / 1e6).toFixed(2)} M₺, yeni denetim 20 gün sonra`); events.push({ type: 'INFRA_ACCEPT', day, data: { id: j.id, name: j.name, ok: false, fix } }); return; }
  const rest = Math.max(0, 1 - j.doneShare), retention = Math.round((j.price - j.advance) * RETENTION);
  if (rest > 0.0001) j.pending.push({ day: day + 45, amount: Math.round((j.price - j.advance) * (1 - RETENTION) * rest) });
  j.retention = retention; j.status = 'garanti'; j.garantiEnd = day + WARRANTY_DAYS;
  if (!j.bondReturned) { post(s, 'teminat', Math.round(j.bond / 2), { memo: 'Geçici kabulde teminatın yarısı iade' }); j.bond -= Math.round(j.bond / 2); }
  c.reputation = clamp(c.reputation + ((j.late ?? 0) === 0 ? 3 : (j.late ?? 0) < 60 ? 1 : -2), 0, 100); note(j, day, 'Geçici kabul yapıldı; 180 günlük garanti başladı');
  events.push({ type: 'INFRA_ACCEPT', day, data: { id: j.id, name: j.name, ok: true } });
}
/** Kesin kabul: tutulan teminat ve kalan banka teminatı çözülür; iş kapanır. */
function finalAcceptance(s: GameState, j: InfraJob, events: GameEvent[]): void {
  const day = s.clock.day, c = s.company!; if (j.retention) j.pending.push({ day: day + 15, amount: j.retention }); j.retention = 0;
  if (!j.bondReturned) { post(s, 'teminat', j.bond, { memo: 'Kesin teminat iadesi' }); j.bondReturned = true; j.bond = 0; }
  j.status = 'bitti'; const late = j.late ?? 0, profit = j.price + (j.claimed ?? 0) - j.spent; j.result = { profit, late, day };
  c.stats.completed++; c.stats.sold++; c.stats.profit += j.result.profit; c.creditScore = clamp(c.creditScore + 8, 100, 900); note(j, day, 'Kesin kabul: iş kapandı');
  events.push({ type: 'INFRA_DONE', day, pause: true, data: { id: j.id, name: j.name, price: j.price, profit: j.result.profit, late } });
}
/** Net değer katkısı: tahsil edilecek hakedişler + tutulan teminat + banka teminatı − kazanılmamış avans. */
export function infraAssets(s: GameState): Money {
  let v = 0; for (const j of s.infra) { v += j.pending.reduce((a, x) => a + x.amount, 0) + (j.retention ?? 0); if (!j.bondReturned) v += j.bond; if (j.status === 'devam') v -= Math.round(j.advance * Math.max(0, 1 - j.progress)); }
  return v;
}
export const activeInfra = (s: GameState) => s.infra.filter((j) => j.status === 'devam' || j.status === 'kabul' || j.status === 'garanti');
void TL;
