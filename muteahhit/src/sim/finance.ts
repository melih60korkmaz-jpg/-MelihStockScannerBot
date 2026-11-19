import { monthKey } from '../core/calendar';
import { contractAssets } from './tenders';
import { debtTotal } from './loans';
import { TL, mul, type Money } from '../core/money';
import type { GameState } from '../core/types';
import { MATERIALS, STAGES, branchCost, ledgerCat, officeFor } from '../data';
const MAT_BASE = new Map(MATERIALS.map((m) => [m.id, TL(m.priceTL)]));
import { landAssetValue } from './land';
import { advancesTotal, receivablesTotal, unsoldValue } from './sales';
import { machineAssetValue, machineMonthlyMaint } from './machines';

/** Her ay yapılan sabit giderler. Hem motor (ödeme) hem arayüz (beklenen gider) bunu kullanır → tek doğru. */
export function monthlyCosts(s: GameState): { cat: string; amount: Money; memo: string }[] {
  const c = s.company; if (!c) return [];
  const wages = s.staff.reduce((a, x) => a + x.salary, 0);
  const off = officeFor(c.level), ci = s.costIndex;
  const out: { cat: string; amount: Money; memo: string }[] = [];
  if (wages > 0) out.push({ cat: 'maas', amount: wages, memo: `${s.staff.length} çalışan` });
  const sp = c.safety === 'dusuk' ? 0.005 : c.safety === 'yuksek' ? 0.06 : 0.02;
  out.push({ cat: 'sigorta', amount: Math.round(wages * sp) + mul(TL(4000), ci), memo: `İş güvenliği (${c.safety})` });
  const branches = s.openCities.filter((id) => id !== c.startCity); if (branches.length) out.push({ cat: 'ofis', amount: Math.round(branches.reduce((a, id) => a + TL(branchCost(id)) * 0.012, 0) * ci), memo: `${branches.length} şube giderleri` });
  const maint = machineMonthlyMaint(s); if (maint > 0) out.push({ cat: 'makine', amount: maint, memo: `${s.machines.length} makine bakımı` });
  out.push({ cat: 'kira', amount: mul(TL(off.monthlyRentTL), ci), memo: off.label });
  out.push({ cat: 'ofis', amount: mul(TL(12000) + TL(1500) * s.staff.length, ci), memo: 'Elektrik, internet, kırtasiye' });
  return out;
}

export const projectedMonthlyCost = (s: GameState): Money => monthlyCosts(s).reduce((a, x) => a + x.amount, 0);

export interface MonthRow { key: string; income: Money; expense: Money; tax: Money; net: Money; byCat: Record<string, Money>; operating: Money; investing: Money; financing: Money; capital: Money; endCash: Money }

/** Defterden aylık gelir tablosu + nakit akışı. Tek kaynak: ledger. */
export function monthlyRows(s: GameState): MonthRow[] {
  const map = new Map<string, MonthRow>();
  for (const e of s.ledger) {
    const k = monthKey(e.day);
    let r = map.get(k);
    if (!r) { r = { key: k, income: 0, expense: 0, tax: 0, net: 0, byCat: {}, operating: 0, investing: 0, financing: 0, capital: 0, endCash: 0 }; map.set(k, r); }
    const kind = ledgerCat(e.cat)?.kind;
    r.byCat[e.cat] = (r.byCat[e.cat] ?? 0) + e.amount;
    if (kind === 'gelir') { r.income += e.amount; r.operating += e.amount; }
    else if (kind === 'gider') { r.expense += -e.amount; r.operating += e.amount; }
    else if (kind === 'vergi') { r.tax += -e.amount; r.operating += e.amount; }
    else if (kind === 'yatirim') r.investing += e.amount;
    else if (kind === 'finansman') r.financing += e.amount;
    else if (kind === 'sermaye') r.capital += e.amount;
  }
  const rows = [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  let run = s.ledgerBase;
  for (const r of rows) {
    r.net = r.income - r.expense - r.tax;
    run += r.operating + r.investing + r.financing + r.capital; r.endCash = run;
  }
  return rows;
}

/** Net varlık = nakit + varlıklar − borçlar. (Arsa/proje/kredi sistemleri geldikçe genişler.) */
/** Net varlık = nakit + arsalar (piyasa) + inşaat halindeki projelerin ödenen maliyeti + biten/satılmamış binaların tahmini değeri (%90). */
export const projectAssetValue = (s: GameState): Money => s.projects.reduce((a, p) => a + (p.status === 'insaat' ? p.build!.spent + (p.build!.matCost ?? 0) : 0), 0) + unsoldValue(s);
export const stockValue = (s: GameState): Money => Object.entries(s.stock).reduce((a, [id, it]) => a + Math.round(it.qty * (MAT_BASE.get(id) ?? 0) * (s.macro.materialIndex / 100) * (s.matPrice[id] ?? 1)), 0);
/** Yatırımcılara proje sonunda geri ödenecek anapara (kâr payı hariç). */
export const investorLiability = (s: GameState): Money => s.investments.filter((i) => !i.paidOut).reduce((a, i) => a + i.amount, 0);
export const netWorth = (s: GameState): Money => (s.company ? s.company.cash + landAssetValue(s) + projectAssetValue(s) + machineAssetValue(s) + stockValue(s) + receivablesTotal(s) - advancesTotal(s) - debtTotal(s) - investorLiability(s) + contractAssets(s) : 0);

/**
 * Nakit yeterlilik süresi (ay): kasa / aylık net yanma. Yanma = beklenen sabit gider − son 3 tam ayın ort. geliri.
 * Yanma ≤ 0 ise null (sınırsız).
 */
export function runwayMonths(s: GameState): number | null {
  const c = s.company; if (!c) return null;
  const rows = monthlyRows(s).filter((r) => r.key < monthKey(s.clock.day)).slice(-3);
  const avgIncome = rows.length ? rows.reduce((a, r) => a + r.income, 0) / rows.length : 0;
  const burn = projectedMonthlyCost(s) - avgIncome;
  if (burn <= 0) return null;
  return Math.max(0, c.cash) / burn;
}

export interface Alert { tone: 'info' | 'ok' | 'warn' | 'bad'; text: string }
export function alerts(s: GameState, fmt: (m: Money) => string, fmtDate: (d: number) => string): Alert[] {
  const c = s.company; if (!c) return [];
  const out: Alert[] = [];
  const rw = runwayMonths(s);
  if (c.cash < 0) out.push({ tone: 'bad', text: `Kasa eksiye düştü (${fmt(c.cash)}). Gider azaltın, varlık satın ya da finansman bulun.` });
  else if (rw !== null && rw < 3) out.push({ tone: 'bad', text: `Nakit yeterlilik ${rw.toFixed(1)} ay. Acil önlem gerekli.` });
  else if (rw !== null && rw < 6) out.push({ tone: 'warn', text: `Nakit yeterlilik ${rw.toFixed(1)} ay; gelir kaynağı gerekli.` });
  const m = s.macro;
  if (m.regime === 'kriz') out.push({ tone: 'bad', text: 'Ekonomik kriz sürüyor: nakdinizi koruyun, riskli yatırımdan kaçının.' });
  else if (m.regime === 'daralma') out.push({ tone: 'warn', text: 'Piyasa daralıyor: satışlar ve kredi koşulları zorlaşabilir.' });
  else if (m.regime === 'asiri_isinma') out.push({ tone: 'warn', text: 'Piyasa aşırı ısınma işareti veriyor; kaldıraçlı büyüme risklidir.' });
  for (const pr of s.projects) {
    if (pr.status === 'insaat' && pr.build?.stalled) out.push({ tone: 'bad', text: `${pr.name}: nakit yok, inşaat durdu!` });
    else if (pr.status === 'insaat' && pr.build) out.push({ tone: 'info', text: `${pr.name}: ${STAGES[pr.build.stage]?.label ?? ''} (%${Math.round(pr.build.progress * 100)})` });
    if (pr.status === 'tamamlandi') { const left = s.units.filter((u) => u.projectId === pr.id && u.status !== 'satildi').length; out.push({ tone: left ? 'ok' : 'info', text: `${pr.name}: ${left} daire satışta.` }); }
  }
  const idle = s.parcels.filter((p) => p.owner === 'player' && p.projectId === undefined && !p.listed);
  if (idle.length) out.push({ tone: 'info', text: idle.length === 1 ? `Boş arsanız var (${idle[0]!.hood}): proje başlatın ya da satışa koyun.` : `${idle.length} boş arsanız var: proje başlatın ya da satışa koyun.` });
  if (s.staff.length === 0) out.push({ tone: 'info', text: 'Ekibiniz yok. Ekip sekmesinden personel alabilirsiniz.' });
  const cap = officeFor(c.level).capacity;
  if (s.staff.length >= cap) out.push({ tone: 'info', text: `Ofis kapasitesi dolu (${s.staff.length}/${cap}). Büyümek için daha büyük ofis gerekir.` });
  const latest = s.news[0]; if (latest && s.clock.day - latest.day <= 45) out.push({ tone: latest.tone, text: latest.text });
  // sonraki maaş günü
  const next = new Date(Date.UTC(2027, 0, 1) + s.clock.day * 86400000); next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const nextDay = Math.round((next.getTime() - Date.UTC(2027, 0, 1)) / 86400000);
  out.push({ tone: 'info', text: `Sonraki gider günü ${fmtDate(nextDay)}: ${fmt(projectedMonthlyCost(s))}` });
  return out;
}
