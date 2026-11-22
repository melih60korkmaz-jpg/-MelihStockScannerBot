import { TL, type Money } from '../core/money';
import { pick, rand, randInt } from '../core/rng';
import type { Deal, GameEvent, GameState, Parcel, Project } from '../core/types';
import { STAGES, buildingType, cityData } from '../data';
import { post } from './ledger';
import { TAPU_HARCI, askPrice, fairValue, generateParcel } from './land';
import { newDesignSeed, planProject } from './projects';
import { defaultSales, generateUnits, unitsOf } from './sales';
import { startConstruction } from './construction';
import { mgmtDealDiscount } from './mgmt';

/**
 * Fırsat ilanları: rakiplerden indirimli bitmiş bina, yarım kalmış inşaat, yıkılacak eski bina arsası ve arsa sahiplerinden kat karşılığı teklifleri.
 * Her ay yeni bir fırsat çıkabilir; süre dolunca kaçar. Kabul edilen fırsatın arsası/projesi ancak o zaman oyuna girer.
 */
export const DEAL_DAYS = 75, MAX_DEALS = 6, DEMO_DAYS = 21, DEALS_MIN_LEVEL = 2;
export const KIND_LABEL: Record<Deal['kind'], string> = { bina: 'Bitmiş bina', harap: 'Yenileme gerektiren bina', yarim: 'Yarım kalmış inşaat', eski: 'Eski bina arsası', kat: 'Kat karşılığı' };
export const KIND_ICO: Record<Deal['kind'], string> = { bina: '🏢', harap: '🛠️', yarim: '🏗️', eski: '🏚️', kat: '🤝' };
const OWNERS = ['Hasan Bey', 'Fatma Hanım', 'Kemal Amca', 'Naciye Teyze', 'Rıza Bey', 'Aysel Hanım', 'Mehmet Efendi', 'Şükran Hanım'];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const dealsOpen = (s: GameState): Deal[] => (s.deals ?? []).filter((d) => d.until > s.clock.day);
export const dealDiscount = (d: Deal): number => (d.fair > 0 ? 1 - (d.price + d.demo) / d.fair : 0);

/** Tahmini kâr (kaba): planın gelir/maliyet tahmininden. */
export function dealProfit(s: GameState, d: Deal): Money {
  const pc: Parcel = { ...d.parcel, ...(d.kind === 'kat' ? { kat: { share: d.share, owner: d.seller } } : {}) };
  const plan = planProject(s, pc, d.type, d.quality, 0);
  if (d.kind === 'bina') return Math.round(d.fair * 0.96) - d.price - Math.round(d.fair * 0.02); // peşin iskonto + komisyon
  if (d.kind === 'harap') return Math.round(d.fair * 1.0) - d.price - Math.round(d.fair * 0.16); // yenileme sonrası değer − yenileme gideri ve masraf
  const doneFrac = d.kind === 'yarim' ? STAGES.slice(1, d.stage).reduce((a, x) => a + x.cost, 0) / 100 : 0;
  return plan.revenue.mid - Math.round(plan.cost.total * (1 - doneFrac)) - d.price - d.demo;
}

function seller(s: GameState): { name: string; failed: boolean } {
  const rv = s.rivals.filter((r) => r.last !== 'satin_alindi'); if (!rv.length) return { name: 'Bir müteahhit', failed: false };
  const r = pick(s.rng, 'misc', rv); return { name: r.name, failed: r.failed };
}

export function makeDeal(s: GameState, kind: Deal['kind']): Deal | null {
  const open = s.openCities.filter((c) => cityData(c)); if (!open.length) return null;
  const city = pick(s.rng, 'misc', open), cd = cityData(city)!, dist = pick(s.rng, 'misc', cd.districts);
  const forceZ = kind === 'eski' || kind === 'kat' ? undefined : { zoning: 'konut' as const, area: randInt(s.rng, 'misc', 400, 1400) };
  const parcel = generateParcel(s, city, dist.id, forceZ); parcel.owner = 'market';
  let type = 'apartman', quality = 'standart'; const pool: [string, string][] = [['apartman', 'standart'], ['site', 'standart'], ['apartman', 'premium']];
  let plan = null as ReturnType<typeof planProject> | null;
  for (const [t, q] of [pool[randInt(s.rng, 'misc', 0, 2)]!, ...pool]) { if (!buildingType(t)) continue; const pl = planProject(s, parcel, t, q, 0); if (pl.ok) { type = t; quality = q; plan = pl; break; } }
  if (!plan) return null;
  const sl = seller(s), fairRev = plan.revenue.mid, id = s.nextId++, day = s.clock.day, owner = pick(s.rng, 'misc', OWNERS);
  const base = { id, kind, city, day, until: day + DEAL_DAYS, type, quality, parcel, qscore: randInt(s.rng, 'misc', 62, 90), stage: 0, share: 0, demo: 0 as Money };
  const lbl = `${dist.label} · ${buildingType(type)?.label ?? type}`;
  if (kind === 'harap') {
    const q = 36 + (id % 17), fq = Math.round(fairRev * (1 + (74 - 74) * 0.004)), disc = 0.5 + rand(s.rng, 'misc') * 0.1; base.qscore = q;
    return { ...base, seller: sl.name, title: `${lbl} · yenileme gerektiren bina`, fair: fq, price: Math.round(fq * disc), story: `${sl.name}, bakımsız kalmış binayı düşük fiyata satıyor (durum ${q}/100). Cephe, tesisat ve ortak alanları yenilersen değeri ve kirası ciddi artar.` };
  }
  if (kind === 'bina') {
    const disc = sl.failed ? 0.72 + rand(s.rng, 'misc') * 0.12 : 0.84 + rand(s.rng, 'misc') * 0.11, fq = Math.round(fairRev * (1 + (base.qscore - 74) * 0.004)); // kalite puanı değeri etkiler
    return { ...base, seller: sl.name, title: `${lbl} · bitmiş bina`, fair: fq, price: Math.round(fq * disc), story: sl.failed ? `${sl.name} iflas etti; bitmiş binasını tasfiye ediyor.` : `${sl.name} nakit sıkıştı ve bitmiş binasını acele satıyor.` };
  }
  if (kind === 'yarim') {
    const st = randInt(s.rng, 'misc', 7, 12), frac = STAGES.slice(1, st).reduce((a, x) => a + x.cost, 0) / 100, land = Math.round(fairValue(s, parcel) * 0.88);
    const built = Math.round(plan.cost.total * frac), price = Math.round(built * (sl.failed ? 0.58 + rand(s.rng, 'misc') * 0.12 : 0.7 + rand(s.rng, 'misc') * 0.12)) + land;
    return { ...base, stage: st, seller: sl.name, title: `${lbl} · yarım inşaat`, fair: Math.round(fairValue(s, parcel) + built), price, story: `${sl.name} inşaatı ${STAGES[st]!.label} aşamasında bıraktı${sl.failed ? ' (iflas)' : ''}. Devralıp bitirirsen büyük kâr var, ama işi yarım kalmış ekibin devamı sende.` };
  }
  const fair = fairValue(s, parcel); parcel.oldBuilding = true;
  if (kind === 'eski') {
    const price = Math.round(askPrice(s, parcel) * (0.6 + rand(s.rng, 'misc') * 0.15)), demo = Math.round(fair * (0.1 + rand(s.rng, 'misc') * 0.06));
    return { ...base, seller: owner, title: `${dist.label} · eski bina arsası`, fair: Math.round(fair * 1.06), price, demo, story: `${owner}'in 40 yıllık binası yıkılmayı bekliyor. Yıkım ${DEMO_DAYS} gün sürer; sonra yeni bir proje başlatabilirsin.` };
  }
  const share = +(0.3 + rand(s.rng, 'misc') * 0.2).toFixed(2), demo = Math.round(fair * (0.05 + rand(s.rng, 'misc') * 0.04));
  return { ...base, seller: owner, title: `${dist.label} · kat karşılığı`, fair: Math.round(fair * 1.06), price: 0, demo, share, story: `${owner} arsasını satmak istemiyor: yıkıp yeniden yaparsan yeni binanın %${Math.round(share * 100)}'ini (daireler) kendisi alacak. Arsa bedeli ödemezsin; yıkım masrafı sende.` };
}

/** Aylık: yeni fırsat çıkabilir (seviye 2+, en çok 6 açık), süresi dolanlar temizlenir. */
export function dealsMonthly(s: GameState, events: GameEvent[]): void {
  const c = s.company; if (!c) return;
  s.deals = (s.deals ?? []).filter((d) => d.until > s.clock.day);
  if (c.level < DEALS_MIN_LEVEL || !s.openCities.length || s.deals.length >= MAX_DEALS || rand(s.rng, 'misc') > 0.7) return;
  const r = rand(s.rng, 'misc'), kind: Deal['kind'] = r < 0.3 ? 'eski' : r < 0.55 ? 'kat' : r < 0.8 ? 'bina' : 'yarim';
  if (kind === 'yarim' && c.level < 3) return;
  const d = makeDeal(s, kind === 'bina' && s.nextId % 3 === 0 ? 'harap' : kind); if (!d) return; d.price = Math.round(d.price * (1 - mgmtDealDiscount(s))); // strateji departmanı pazarlıkta indirim sağlar
  s.deals.push(d); events.push({ type: 'DEAL_NEW', day: s.clock.day, data: { dealId: d.id, kind: d.kind } });
}

/** Kabul için gereken nakit (tapu harcı dahil). */
export const dealCash = (d: Deal): Money => (d.kind === 'kat' ? d.demo : Math.round(d.price * (1 + TAPU_HARCI)) + d.demo);

export function dealError(s: GameState, id: number): string | null {
  const d = (s.deals ?? []).find((x) => x.id === id); if (!d) return 'Bu fırsat artık yok.'; if (d.until <= s.clock.day) return 'Fırsatın süresi doldu.';
  if (!s.company) return 'Önce şirket kurulmalı.'; if (s.company.cash < dealCash(d)) return 'Bu fırsat için yeterli nakit yok.';
  return null;
}

export function acceptDeal(s: GameState, d: Deal, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day, pc = d.parcel; s.deals = (s.deals ?? []).filter((x) => x.id !== d.id);
  pc.owner = 'player'; pc.boughtDay = day; delete pc.listed;
  const harc = Math.round(d.price * TAPU_HARCI);
  if (d.kind === 'kat') {
    post(s, 'arsa', -d.demo, { memo: `Yıkım: ${d.title}` }); pc.costBasis = d.demo; pc.kat = { share: d.share, owner: d.seller }; pc.demolishUntil = day + DEMO_DAYS; s.parcels.push(pc);
    events.push({ type: 'DEAL_DONE', day, data: { dealId: d.id, kind: d.kind, parcelId: pc.id } }); return;
  }
  if (d.kind === 'eski') {
    post(s, 'arsa', -d.price, { memo: `Arsa alımı: ${d.title}` }); post(s, 'arsa', -harc, { memo: 'Tapu harcı' }); post(s, 'arsa', -d.demo, { memo: `Yıkım: ${d.title}` });
    pc.costBasis = d.price + harc + d.demo; pc.demolishUntil = day + DEMO_DAYS; s.parcels.push(pc);
    events.push({ type: 'DEAL_DONE', day, data: { dealId: d.id, kind: d.kind, parcelId: pc.id } }); return;
  }
  // bina / yarım: proje devralınır
  pc.soilKnown = true; pc.growthKnown = true;
  const plan = planProject(s, pc, d.type, d.quality, 0), id = s.nextId++, label = buildingType(d.type)?.label ?? d.type;
  const pr: Project = {
    id, parcelId: pc.id, hood: pc.hood, name: `${pc.hood} ${label}`, type: d.type, quality: d.quality, designSeed: newDesignSeed(s), status: 'taslak', createdDay: day, cityId: d.city,
    floors: plan.floors, emsal: plan.emsal, brut: plan.brut, satilabilir: plan.satilabilir, matIndexAtPlan: s.macro.materialIndex,
    budget: { base: plan.cost.base, soil: plan.cost.soil, soft: plan.cost.soft, total: plan.cost.total - plan.cost.designFee, designFee: 0 }, expected: { revenue: plan.revenue.mid, months: plan.months.max },
  };
  post(s, 'arsa', -d.price, { memo: `Devralma: ${d.title}` }); post(s, 'arsa', -harc, { memo: 'Tapu harcı' });
  s.parcels.push(pc); pc.projectId = id; s.projects.push(pr);
  if (d.kind === 'bina' || d.kind === 'harap') {
    pc.costBasis = 0; if (d.kind === 'harap') pr.cond = d.qscore; pr.status = 'tamamlandi'; pr.result = { qualityScore: d.qscore, cost: d.price + harc, days: 0, plannedDays: 0 }; pr.budget = { base: d.price + harc, soil: 0, soft: 0, total: d.price + harc, designFee: 0 }; pr.sales = defaultSales(); s.units.push(...generateUnits(s, pr));
  } else {
    pc.costBasis = d.price + harc; pr.budget.total = plan.cost.total - plan.cost.designFee; startConstruction(s, pr); const b = pr.build!;
    b.stage = d.stage; b.stageStarted = false; pr.budget.total = b.stageBudget.slice(d.stage).reduce((a, x) => a + x, 0); const w = STAGES.slice(6, d.stage).reduce((a, x) => a + x.cost, 0); if (w > 0) { b.qualityW = w; b.qualitySum = w * d.qscore; }
  }
  events.push({ type: 'DEAL_DONE', day, data: { dealId: d.id, kind: d.kind, projectId: id } });
  void c;
}

/** Kat karşılığı: yapı başlarken dairelerin arsa sahibine ait payı ayrılır (satılamaz, gelire yazılmaz). */
export function markLandlord(s: GameState, p: Project, parcel: Parcel | undefined): void {
  const share = parcel?.kat?.share; if (!share) return;
  const us = unitsOf(s, p.id).slice().sort((a, b) => a.id - b.id), total = us.reduce((a, u) => a + u.area, 0); let acc = 0;
  for (const u of us) { if (acc + u.area / 2 > total * share) break; acc += u.area; Object.assign(u, { landlord: true, status: 'satildi' as const, price: 0, payment: 'pesin' as const, soldDay: s.clock.day, delivered: true, sat: 70 }); }
}
void TL;
