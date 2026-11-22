import { TL, type Money } from '../core/money';
import { pick, rand } from '../core/rng';
import type { GameEvent, GameState, PendingEvent } from '../core/types';
import { EVENTS, cityData, eventDef, type EffectTuple, type EventDef } from '../data';
import { createStaff, traitOf } from './staff';
import { netWorth } from './finance';
import { post } from './ledger';
import { aliveRivals } from './rivals';
import { fairValue } from './land';
import { logDecision } from './control';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const DECISION_TIMEOUT = 20, COOLDOWN = 300;
/** Rakibe satılabilecek boş arsa: en az 120 gündür elde, projesiz, kat karşılığı/yıkım dışında. Hemen al-sat kârı engellenir. */
export const sellableIdle = (s: GameState, p: GameState['parcels'][number]): boolean => p.owner === 'player' && !p.clientLand && p.projectId === undefined && !p.kat && !(p.demolishUntil && p.demolishUntil > s.clock.day) && s.clock.day - (p.boughtDay ?? -999) >= 120 && !(p.oldBuilding && s.clock.day - (p.boughtDay ?? 0) < 180);

/** Olay tutarları 20 M₺'lik bir firma için yazılmıştır; firma büyüdükçe ölçeklenir. */
export const eventScale = (s: GameState): number => clamp(Math.max(0, netWorth(s)) / TL(20_000_000), 0.4, 8) ** 0.8;

function eligible(s: GameState, d: EventDef): boolean {
  const c = s.company!, day = s.clock.day, last = s.evtLast[d.id];
  if (last !== undefined && day - last < COOLDOWN) return false;
  const nw = netWorth(s);
  for (const n of d.need) {
    const [k, v] = n.split(/[:<>]/); const num = Number(n.replace(/^[a-z]+[:<>]/, ''));
    if (n === 'chain') return false; // hikâye devam olayları yalnızca zincirle gelir
    if (n === 'project' && !s.projects.some((p) => p.status === 'insaat')) return false;
    if (n === 'staff' && s.staff.length === 0) return false;
    if (n === 'land' && !s.parcels.some((p) => p.owner === 'player' && !p.clientLand)) return false;
    if (n === 'open' && s.openCities.length === 0) return false;
    if (n === 'rivals' && aliveRivals(s).length === 0) return false;
    if (n === 'idleland' && !s.parcels.some((p) => sellableIdle(s, p))) return false;
    if (n === 'ally' && !aliveRivals(s).some((r) => (r.rel ?? 0) >= 30)) return false;
    if (n === 'enemy' && !aliveRivals(s).some((r) => (r.rel ?? 0) <= -30)) return false;
    if (n === 'sold>0' && c.stats.sold <= 0) return false;
    if (k === 'trait' && !s.staff.some((x) => traitOf(x).id === v)) return false;
    if (n.startsWith('staff>') && s.staff.length <= num) return false;
    if (k === 'regime' && s.macro.regime !== v) return false;
    if (k === 'noregime' && s.macro.regime === v) return false;
    if (n.startsWith('cash>') && c.cash < TL(num)) return false;
    if (n.startsWith('rep>') && c.reputation <= num) return false;
    if (n.startsWith('score<') && c.creditScore >= num) return false;
    if (n.startsWith('month:') && s.clock.day < num * 30) return false;
  }
  void nw; return true;
}

/** Her ay %55 olasılıkla (ilk 2 ay yok) uygun olaylardan biri ağırlıklı seçilir. */
export function eventsMonthly(s: GameState, events: GameEvent[]): void {
  trendsMonthly(s, events);
  if (!s.company || s.pending || s.clock.day < 60 || rand(s.rng, 'events') > 0.55) return;
  const pool = EVENTS.filter((d) => eligible(s, d)); if (!pool.length) return;
  let r = rand(s.rng, 'events') * pool.reduce((a, d) => a + d.w, 0), d = pool[0]!;
  for (const x of pool) { r -= x.w; if (r <= 0) { d = x; break; } }
  const pend: PendingEvent = { id: d.id, day: s.clock.day };
  if (d.need.includes('project') || d.x.includes('{proje}')) { const act = s.projects.filter((p) => p.status === 'insaat'); if (act.length) { const p = pick(s.rng, 'events', act); pend.projectId = p.id; pend.city = p.cityId; } }
  if (!pend.city) pend.city = pick(s.rng, 'events', s.openCities.length ? s.openCities : ['istanbul']);
  if (d.x.includes('{rakip}') || d.t.includes('{rakip}')) { const al = aliveRivals(s), pool = d.need.includes('ally') ? al.filter((r) => (r.rel ?? 0) >= 30) : d.need.includes('enemy') ? al.filter((r) => (r.rel ?? 0) <= -30) : al; if (pool.length) pend.rivalId = pick(s.rng, 'events', pool).id; }
  const tn = d.need.find((n) => n.startsWith('trait:'));
  if (tn) { const ts = s.staff.filter((x) => traitOf(x).id === tn.slice(6)); if (ts.length) pend.staffId = pick(s.rng, 'events', ts).id; }
  else if (d.x.includes('{kisi}') && s.staff.length) pend.staffId = pick(s.rng, 'events', s.staff).id;
  s.pending = pend; s.evtLast[d.id] = s.clock.day;
  events.push({ type: 'EVENT_DECISION', day: s.clock.day, pause: true, data: { id: d.id } });
}

const TRENDS: [string, string, number][] = [['{c}\'de konut talebi artıyor: yeni alıcılar piyasaya girdi.', 'ok', 1.2], ['{c}\'de satışlar yavaşladı; alıcılar bekle-gör modunda.', 'warn', -1.2], ['{c}\'de arsa fiyatları hareketli: yatırımcı ilgisi artıyor.', 'ok', 1.0], ['{c}\'de konut stoğu birikiyor; fiyatlar baskı altında.', 'warn', -1.0]];
/** Dinamik piyasa: ara sıra bir ilde gerçek bir talep dalgası (haber + endeks etkisi). */
export function trendsMonthly(s: GameState, events: GameEvent[]): void {
  if (!s.openCities.length || rand(s.rng, 'market') > 0.3) return;
  const city = pick(s.rng, 'market', s.openCities), [txt, tone, d] = pick(s.rng, 'market', TRENDS), cm = s.cityMarket[city]; if (!cm) return;
  cm.housingIndex = Math.max(0.3, cm.housingIndex * (1 + d / 100)); cm.landIndex = Math.max(0.3, cm.landIndex * (1 + (d * 0.8) / 100));
  const text = txt.replace('{c}', cityData(city)?.label ?? city); s.news.unshift({ day: s.clock.day, text, tone: tone as never }); if (s.news.length > 30) s.news.length = 30;
  events.push({ type: 'MACRO_NEWS', day: s.clock.day, data: { regime: s.macro.regime, text, tone } });
}

/** Karar süresi dolarsa varsayılan seçim (genellikle "hiçbir şey yapma") uygulanır. */
export function eventsDaily(s: GameState, events: GameEvent[]): void {
  // Hikâye zinciri: vakti gelen devam olayı (başka karar bekliyorsa bekler; kişi ayrıldıysa atlanır)
  const q = s.evtQueue;
  if (q?.length && !s.pending) {
    const i = q.findIndex((x) => x.day <= s.clock.day);
    if (i >= 0) {
      const [it] = q.splice(i, 1) as [NonNullable<GameState['evtQueue']>[number]]; const d = eventDef(it.id);
      if (d && (it.staffId === undefined || s.staff.some((x) => x.id === it.staffId))) {
        s.pending = { id: it.id, day: s.clock.day, ...(it.projectId !== undefined ? { projectId: it.projectId } : {}), ...(it.city ? { city: it.city } : {}), ...(it.staffId !== undefined ? { staffId: it.staffId } : {}), ...(it.rivalId !== undefined ? { rivalId: it.rivalId } : {}) };
        s.evtLast[it.id] = s.clock.day; events.push({ type: 'EVENT_DECISION', day: s.clock.day, pause: true, data: { id: it.id } });
      }
    }
  }
  const p = s.pending; if (!p || s.clock.day - p.day < DECISION_TIMEOUT) return; const d = eventDef(p.id);
  resolveEvent(s, d ? (d.def ?? d.ch.length - 1) : 0, events, true);
}

export const fill = (s: GameState, text: string, p: PendingEvent): string => text.replace(/\{kisi\}/g, s.staff.find((x) => x.id === p.staffId)?.name ?? 'Bir çalışanınız').replace('{proje}', s.projects.find((x) => x.id === p.projectId)?.name ?? 'şantiyeniz').replace('{sehir}', cityData(p.city ?? '')?.label ?? 'bir ilde').replace(/\{rakip\}/g, s.rivals.find((r) => r.id === p.rivalId)?.name ?? 'Bir rakip firma');

export function describeEffect(s: GameState, e: EffectTuple): string {
  const k = e[0], v = Number(e[1] ?? 0), f = eventScale(s), m = (x: Money) => `${(Math.abs(x) / 100 / 1e6).toFixed(2).replace('.', ',')} M₺`;
  switch (k) {
    case 'cash': return `Kasa ${v < 0 ? '−' : '+'}${m(Math.round(TL(Math.abs(v)) * f))}`;
    case 'rep': return v ? `İtibar ${v > 0 ? '+' : ''}${v}` : ''; case 'score': return v ? `Kredi notu ${v > 0 ? '+' : ''}${v}` : '';
    case 'morale': return `Moral ${v > 0 ? '+' : ''}${v}`; case 'sat': return `Müşteri memnuniyeti ${v > 0 ? '+' : ''}${v}`;
    case 'housing': return `Konut fiyatları ${v > 0 ? '+' : ''}%${v}`; case 'land': return `Arsa fiyatları ${v > 0 ? '+' : ''}%${v}`; case 'mat': return `Malzeme fiyatı ${v > 0 ? '+' : ''}%${v}`;
    case 'rrel': return `Rakiple ilişki ${v > 0 ? '+' : ''}${v}`; case 'landsale': return `Boş bir arsanız %${v} primle satılır`;
    case 'tmorale': return `Kişinin morali ${v > 0 ? '+' : ''}${v}`; case 'traise': return `Maaşı %${v} artar`; case 'tleave': return 'Çalışan ayrılır';
    case 'stall': return `Şantiye ${v} gün durur`; case 'leave': return 'Bir çalışan ayrılır'; case 'rate': return `Faiz ${v > 0 ? '+' : ''}${v} puan`; case 'machine': return 'Makine kazanılır'; case 'rival': return 'Rakip zayıflar';
    default: return '';
  }
}

function apply(s: GameState, e: EffectTuple, p: PendingEvent, events: GameEvent[]): void {
  const c = s.company!, k = e[0], v = Number(e[1] ?? 0), f = eventScale(s);
  switch (k) {
    case 'cash': post(s, v < 0 ? 'olay_gider' : 'olay_gelir', Math.round(TL(v) * f), { memo: eventDef(p.id)?.t ?? 'Olay' }); break;
    case 'rep': c.reputation = clamp(c.reputation + v, 0, 100); break;
    case 'score': c.creditScore = clamp(c.creditScore + v, 100, 900); break;
    case 'morale': for (const x of s.staff) x.morale = clamp(x.morale + v, 0, 100); break;
    case 'sat': c.satisfaction = clamp(c.satisfaction + v, 0, 100); break;
    case 'housing': { const cm = s.cityMarket[p.city ?? '']; if (cm) cm.housingIndex = Math.max(0.3, cm.housingIndex * (1 + v / 100)); else for (const m of Object.values(s.cityMarket)) m.housingIndex *= 1 + v / 100; break; }
    case 'land': { const cm = s.cityMarket[p.city ?? '']; if (cm) cm.landIndex = Math.max(0.3, cm.landIndex * (1 + v / 100)); break; }
    case 'mat': for (const id of Object.keys(s.matPrice)) s.matPrice[id] = clamp(+(s.matPrice[id]! * (1 + v / 100)).toFixed(4), 0.7, 1.7); break;
    case 'stall': { const pr = s.projects.find((x) => x.id === p.projectId && x.status === 'insaat') ?? s.projects.find((x) => x.status === 'insaat'); if (pr?.build) { pr.build.accidentUntil = Math.max(pr.build.accidentUntil ?? 0, s.clock.day + v); pr.build.stalled = 'kaza'; } break; }
    case 'leave': { const pool = s.staff.filter((q) => traitOf(q).id !== 'sadik'), x = pool.length ? pick(s.rng, 'events', pool) : null; if (x) s.staff = s.staff.filter((q) => q.id !== x.id); break; }
    case 'rrel': { const r = s.rivals.find((q) => q.id === p.rivalId); if (r) r.rel = clamp((r.rel ?? 0) + v, -100, 100); break; }
    case 'landsale': { const pc = s.parcels.filter((x) => sellableIdle(s, x)).sort((a, b) => (a.boughtDay ?? 0) - (b.boughtDay ?? 0))[0]; if (pc) { const amt = Math.round(fairValue(s, pc) * (1 + v / 100)); post(s, 'arsa', amt, { memo: `Arsa satışı (${pc.hood}): ${s.rivals.find((r) => r.id === p.rivalId)?.name ?? 'rakip'}` }); s.parcels = s.parcels.filter((x) => x.id !== pc.id); const r = s.rivals.find((q) => q.id === p.rivalId); if (r) { r.cash -= amt; } } break; }
    case 'tmorale': { const x = s.staff.find((q) => q.id === p.staffId); if (x) x.morale = clamp(x.morale + v, 0, 100); break; }
    case 'traise': { const x = s.staff.find((q) => q.id === p.staffId); if (x) x.salary = Math.round(x.salary * (1 + v / 100)); break; }
    case 'tleave': { s.staff = s.staff.filter((q) => q.id !== p.staffId); break; }
    case 'rate': s.macro.policyRate = clamp(s.macro.policyRate + v, 4, 80); break;
    case 'machine': s.machines.push({ id: s.nextId++, type: 'forklift', boughtDay: s.clock.day, price: TL(650000), brokenUntil: 0, uses: 0 }); break;
    case 'rival': { const r = aliveRivals(s)[0]; if (r) r.cash -= TL(v * 1_000_000); break; }
  }
  void events; void createStaff;
}

/** Karar uygula: her seçimin sabit etkileri + (varsa) olasılıklı başarı/başarısızlık etkileri. */
export function resolveEvent(s: GameState, choice: number, events: GameEvent[], auto = false): { ok: boolean; error?: string; success?: boolean } {
  const p = s.pending; if (!p) return { ok: false, error: 'Bekleyen karar yok.' }; const d = eventDef(p.id);
  if (!d || !d.ch[choice]) { s.pending = null; return { ok: false, error: 'Geçersiz seçim.' }; }
  const who = s.staff.find((x) => x.id === p.staffId)?.name, ch = d.ch[choice]!; for (const e of ch.e) apply(s, e, p, events);
  let success: boolean | undefined;
  if (ch.p !== undefined) { success = rand(s.rng, 'events') < ch.p; for (const e of (success ? ch.s : ch.f) ?? []) apply(s, e, p, events); }
  const next = ch.n ?? (success === true ? ch.ns : success === false ? ch.nf : undefined);
  if (next && eventDef(next[0])) (s.evtQueue ??= []).push({ id: next[0], day: s.clock.day + next[1], ...(p.projectId !== undefined ? { projectId: p.projectId } : {}), ...(p.city ? { city: p.city } : {}), ...(p.staffId !== undefined ? { staffId: p.staffId } : {}), ...(p.rivalId !== undefined ? { rivalId: p.rivalId } : {}) });
  logDecision(s, d.c === 'kurul' ? 'kurul' : 'olay', d.t.replace(/\{kisi\}/g, who ?? 'Çalışan').replace(/\{rakip\}/g, s.rivals.find((r) => r.id === p.rivalId)?.name ?? 'Rakip'), `${ch.l}${[...ch.e].map((e) => describeEffect(s, e)).filter(Boolean).length ? ' → ' + [...ch.e].map((e) => describeEffect(s, e)).filter(Boolean).join(', ') : ''}${success === undefined ? '' : success ? ' (başarılı)' : ' (olmadı)'}${auto ? ' [süre doldu]' : ''}`);
  s.pending = null; events.push({ type: 'EVENT_RESOLVED', day: s.clock.day, data: { id: d.id, choice, auto, ...(who ? { who } : {}), ...(success !== undefined ? { success } : {}) } });
  return { ok: true, ...(success !== undefined ? { success } : {}) };
}
