import { dateOf } from '../core/calendar';
import { TL, type Money } from '../core/money';
import { rand } from '../core/rng';
import type { AgendaItem, AgendaOption, BoardMember, DeptState, Exec, GameEvent, GameState, Goal, GoalResult, MgmtState, YearReport } from '../core/types';
import { BANKS } from '../data';
import { eventScale, applyEffect } from './events';
import { netWorth } from './finance';
import { debtTotal, quoteLoan, repayLoan, takeLoan } from './loans';
import { post } from './ledger';
import { logDecision } from './control';
import { isUnlocked } from './unlock';

/**
 * Yönetim Merkezi: genel müdür, yönetim kurulu (çeyreklik toplantı ve oylama), yıllık hedefler ve 7 departman.
 * Etkiler gerçek sistemlere bağlıdır: satış akışı, şantiye hızı, ihale puanı, malzeme fiyatı, kredi faizi, moral, gecikme cezaları.
 * Rastgelelik yalnızca genel müdürün aylık kararlarında ('events' akışı); adaylar ve kurul üyeleri deterministik türetilir.
 */
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hashStr = (s: string): number => { let a = 2166136261; for (let i = 0; i < s.length; i++) { a ^= s.charCodeAt(i); a = Math.imul(a, 16777619); } return a >>> 0; };
const FIRST = ['Ayhan', 'Burcu', 'Cengiz', 'Dilek', 'Emre', 'Funda', 'Gökhan', 'Hülya', 'İlker', 'Jale', 'Kaan', 'Leyla', 'Mert', 'Nesrin', 'Oğuz', 'Pelin', 'Rüstem', 'Sibel', 'Tarık', 'Ülkü', 'Volkan', 'Yeşim', 'Zafer', 'Ceren'];
const LAST = ['Aksoy', 'Bulut', 'Candan', 'Demirel', 'Ertürk', 'Fidan', 'Gürel', 'Hazar', 'Işık', 'Karahan', 'Limon', 'Metin', 'Narin', 'Orhan', 'Pamuk', 'Sezer', 'Tekin', 'Uslu', 'Vural', 'Yaman'];
const STYLES: Exec['style'][] = ['temkinli', 'dengeli', 'atilgan'];
export const STYLE_TR: Record<Exec['style'], string> = { temkinli: 'Temkinli', dengeli: 'Dengeli', atilgan: 'Atılgan' };

export interface DeptDef { id: string; label: string; ico: string; level: number; baseTL: number; openTL: number; effect: string }
export const DEPTS: DeptDef[] = [
  { id: 'insaat', label: 'İnşaat operasyonları', ico: '🏗️', level: 2, baseTL: 120_000, openTL: 500_000, effect: 'Şantiye hızı +%6, kaza riski −%10' },
  { id: 'satis', label: 'Satış ve pazarlama', ico: '🏷️', level: 2, baseTL: 110_000, openTL: 400_000, effect: 'Alıcı akışı +%10' },
  { id: 'finans', label: 'Finans', ico: '💳', level: 3, baseTL: 100_000, openTL: 450_000, effect: 'Kredi faizi −0,4 puan' },
  { id: 'ik', label: 'İnsan kaynakları', ico: '👥', level: 3, baseTL: 90_000, openTL: 350_000, effect: 'Moral hedefi +3' },
  { id: 'satinalma', label: 'Satın alma', ico: '🧱', level: 3, baseTL: 90_000, openTL: 350_000, effect: 'Malzeme fiyatı −%5' },
  { id: 'hukuk', label: 'Hukuk', ico: '⚖️', level: 4, baseTL: 100_000, openTL: 500_000, effect: 'Gecikme cezası ve tazminatlar −%30' },
  { id: 'strateji', label: 'Yatırım ve strateji', ico: '📈', level: 5, baseTL: 140_000, openTL: 700_000, effect: 'İhale puanı +4, fırsat ilanı indirimi' },
];
export const deptDef = (id: string) => DEPTS.find((d) => d.id === id);
export const BUDGET_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function makeExec(seed: number, role: string, ci: number, day: number): Exec {
  const h = hashStr(`${role}|${seed}`), skill = 35 + (h % 55), exp = (h >>> 8) % 70, style = STYLES[(h >>> 14) % 3]!;
  const salary = Math.round(TL(150_000 + skill * 5_500 + exp * 1_800) * ci);
  return { id: seed * 100 + (h % 97), name: `${FIRST[(h >>> 3) % FIRST.length]} ${LAST[(h >>> 11) % LAST.length]}`, role, skill, exp, salary, style, since: day, mistakes: 0 };
}
const BOARD_SEED: [string, number, number][] = [['Yatırımcı temsilcisi', 0.7, 0.5], ['Banka temsilcisi', -0.3, -0.7], ['Sektör uzmanı', 0.3, 0.1], ['Bağımsız üye', 0, -0.2], ['Aile üyesi', -0.4, -0.4]];
export function getMgmt(s: GameState): MgmtState {
  if (s.mgmt) return s.mgmt; const c = s.company, h = hashStr(c?.name ?? 'x');
  const board: BoardMember[] = BOARD_SEED.map(([role, g, r], i) => ({ id: i + 1, name: `${FIRST[(h >>> (i * 3)) % FIRST.length]} ${LAST[(h >>> (i * 3 + 5)) % LAST.length]}`, role, growth: g, risk: r, loyalty: 60 }));
  const depts: Record<string, DeptState> = {}; for (const d of DEPTS) depts[d.id] = { open: false, budget: 1, mgr: null, staff: 0 };
  s.mgmt = { gm: null, cands: [], candDay: -999, board, trust: 60, meeting: null, lastMeetingQ: -1, goals: null, goalHist: [], depts }; return s.mgmt;
}
export const quarterOf = (day: number) => { const d = dateOf(day); return d.year * 4 + Math.floor((d.month - 1) / 3); };
/** Genel müdür adayları üç ayda bir yenilenir (deterministik). */
export function refreshCands(s: GameState): void {
  const m = getMgmt(s); if (s.clock.day - m.candDay < 90 && m.cands.length) return; const q = quarterOf(s.clock.day);
  m.cands = [0, 1, 2, 3].map((i) => makeExec(q * 10 + i, 'Genel müdür', s.costIndex, s.clock.day)); m.candDay = s.clock.day;
}
export function deptCandidates(s: GameState, dept: string): Exec[] {
  const q = quarterOf(s.clock.day), k = DEPTS.findIndex((d) => d.id === dept) + 1; return [0, 1, 2].map((i) => makeExec(q * 100 + k * 10 + i, `${deptDef(dept)?.label ?? dept} müdürü`, s.costIndex, s.clock.day));
}

// ---- genel müdür ve departman etkileri ----
export function gmQ(s: GameState): number { const g = s.mgmt?.gm; if (!g) return 0; return clamp((g.skill / 100) * (0.8 + 0.4 * Math.min(1, g.exp / 100)) * (g.style === 'atilgan' ? 1.05 : g.style === 'temkinli' ? 0.97 : 1), 0, 1.15); }
export function deptPerf(s: GameState, id: string): number {
  const d = s.mgmt?.depts[id]; if (!d?.open) return 0;
  return Math.round(clamp(20 + (d.mgr?.skill ?? 0) * 0.35 + (d.budget <= 1 ? d.budget * 20 : 20 + (d.budget - 1) * 10) + Math.min(8, d.staff) * 2.5, 0, 100));
}
/** Departman etkisi: performans 40'ta nötr, 100'de tam; genel müdür +%15'e kadar güçlendirir. */
export function deptEffect(s: GameState, id: string): number { if (!s.mgmt?.depts[id]?.open) return 0; return clamp((deptPerf(s, id) - 40) / 60, -0.2, 1) * (1 + 0.15 * gmQ(s)); }
export const modeId = (s: GameState): 'buyume' | 'tasarruf' | 'denge' => { const m = s.mgmt?.mode; return m && m.until > s.clock.day ? m.id : 'denge'; };
export const mgmtSaleMult = (s: GameState): number => (1 + 0.1 * deptEffect(s, 'satis')) * (1 + 0.05 * gmQ(s)) * (modeId(s) === 'buyume' ? 1.06 : modeId(s) === 'tasarruf' ? 0.97 : 1);
export const mgmtBuildMult = (s: GameState): number => (1 + 0.06 * deptEffect(s, 'insaat')) * (1 + 0.03 * gmQ(s)) * (modeId(s) === 'buyume' ? 1.03 : 1);
export const mgmtRiskMult = (s: GameState): number => 1 - 0.1 * deptEffect(s, 'insaat');
export const mgmtTender = (s: GameState): number => 4 * deptEffect(s, 'strateji') + 3 * gmQ(s) + (modeId(s) === 'buyume' ? 2 : 0);
export const mgmtMatMult = (s: GameState): number => 1 - 0.05 * deptEffect(s, 'satinalma');
export const mgmtRateDelta = (s: GameState): number => -0.4 * deptEffect(s, 'finans');
export const mgmtMorale = (s: GameState): number => 3 * deptEffect(s, 'ik') - (modeId(s) === 'tasarruf' ? 2 : 0);
export const mgmtPenaltyMult = (s: GameState): number => 1 - 0.3 * deptEffect(s, 'hukuk');
export const mgmtDealDiscount = (s: GameState): number => 0.03 * deptEffect(s, 'strateji');
export function sectorDiscount(s: GameState, sector: string): number { const d = s.mgmt?.discount?.[sector]; return d && d.until > s.clock.day ? d.pct : 0; }

export const deptCost = (s: GameState, id: string): Money => {
  const d = s.mgmt?.depts[id], def = deptDef(id); if (!d?.open || !def) return 0;
  return Math.round((TL(def.baseTL) * d.budget * (modeId(s) === 'tasarruf' ? 0.8 : 1) + (d.mgr?.salary ?? 0) / s.costIndex * 0 + d.staff * TL(32_000)) * s.costIndex + (d.mgr?.salary ?? 0));
};
/** Aylık sabit yönetim giderleri (monthlyCosts'a eklenir; projeksiyon ve gerçek tahakkuk aynı hesabı kullanır). */
export function mgmtMonthlyCosts(s: GameState): { cat: string; amount: Money; memo: string }[] {
  const m = s.mgmt; if (!m) return []; const out: { cat: string; amount: Money; memo: string }[] = [];
  if (m.gm) out.push({ cat: 'yonetim', amount: m.gm.salary, memo: `Genel müdür: ${m.gm.name}` });
  for (const d of DEPTS) { const c = deptCost(s, d.id); if (c > 0) out.push({ cat: 'yonetim', amount: c, memo: d.label }); }
  if (modeId(s) === 'buyume') out.push({ cat: 'yonetim', amount: Math.round(TL(150_000) * s.costIndex), memo: 'Büyüme planı giderleri' });
  return out;
}

// ---- komut mantığı ----
export function hireGM(s: GameState, candId: number): string | null {
  const m = getMgmt(s), c = m.cands.find((x) => x.id === candId); if (!c) return 'Aday bulunamadı.'; if (m.gm) return 'Önce mevcut genel müdürü görevden alın.';
  if (!isUnlocked(s, 'yonetim')) return 'Yönetim Merkezi henüz açılmadı.'; const sign = c.salary * 2; if (s.company!.cash < sign) return 'İşe giriş masrafı (2 maaş) için yeterli nakit yok.';
  post(s, 'yonetim', -sign, { memo: `Genel müdür işe giriş: ${c.name}` }); m.gm = { ...c, since: s.clock.day }; m.cands = m.cands.filter((x) => x.id !== candId);
  logDecision(s, 'yonetim', `Genel müdür: ${c.name}`, `Beceri ${c.skill}, tecrübe ${c.exp}, maaş ${(c.salary / 100 / 1000).toFixed(0)} B₺/ay`); return null;
}
export function fireGM(s: GameState): string | null {
  const m = getMgmt(s); if (!m.gm) return 'Genel müdür yok.'; const sev = m.gm.salary * 4; if (s.company!.cash < sev) return 'Kıdem tazminatı (4 maaş) için yeterli nakit yok.';
  post(s, 'yonetim', -sev, { memo: `Kıdem tazminatı: ${m.gm.name}` }); logDecision(s, 'yonetim', `Genel müdür görevden alındı: ${m.gm.name}`, 'Tazminat 4 maaş.'); m.gm = null; return null;
}
export function openDept(s: GameState, id: string): string | null {
  const def = deptDef(id), m = getMgmt(s); if (!def) return 'Geçersiz departman.'; if (m.depts[id]!.open) return 'Departman zaten açık.'; if (s.company!.level < def.level) return `Departman için şirket seviyesi ${def.level} gerekir.`;
  const c = Math.round(TL(def.openTL) * s.costIndex); if (s.company!.cash < c) return 'Kuruluş masrafı için yeterli nakit yok.';
  post(s, 'yonetim', -c, { memo: `${def.label} departmanı kuruldu` }); m.depts[id]!.open = true; logDecision(s, 'yonetim', `Departman: ${def.label}`, def.effect); return null;
}
export function hireDeptMgr(s: GameState, id: string, candId: number): string | null {
  const m = getMgmt(s), d = m.depts[id]; if (!d?.open) return 'Önce departmanı kurun.'; const c = deptCandidates(s, id).find((x) => x.id === candId); if (!c) return 'Aday bulunamadı.';
  const sign = c.salary * 2; if (s.company!.cash < sign) return 'İşe giriş masrafı için yeterli nakit yok.'; post(s, 'yonetim', -sign, { memo: `${deptDef(id)!.label} müdürü: ${c.name}` }); d.mgr = { ...c, since: s.clock.day }; return null;
}
export function setDeptStaff(s: GameState, id: string, delta: number): string | null {
  const d = getMgmt(s).depts[id]; if (!d?.open) return 'Önce departmanı kurun.'; const n = d.staff + delta; if (n < 0 || n > 12) return 'Personel sayısı 0–12 arasında olmalı.'; d.staff = n; return null;
}

// ---- yönetim kurulu ----
const UNLOCK_SECTORS: [string, string][] = [['enerji', 'Güneş ve rüzgâr enerjisi'], ['altyapi', 'Altyapı taahhüdü']];
export function buildAgenda(s: GameState): AgendaItem[] {
  const q = quarterOf(s.clock.day), c = s.company!, m = getMgmt(s), sc = eventScale(s), all: AgendaItem[] = [];
  all.push({ id: 'buyume', kind: 'buyume', title: 'Büyüme mi, tasarruf mu?', text: 'Önümüzdeki iki çeyrek için yönetim duruşunu belirleyin. Büyüme planı satışı ve şantiyeleri hızlandırır ama gider yaratır; tasarruf giderleri keser.', options: [
    { l: 'Büyüme planı', d: 'Satış +%6, şantiye +%3, ihale +2 puan; aylık ek gider. 180 gün.', eff: [['cash', -900_000], ['rep', 1]], g: 1, r: 0.6, act: { kind: 'mode', id: 'buyume', days: 180 } },
    { l: 'Dengeli ilerle', d: 'Mevcut politika sürer.', eff: [], g: 0, r: 0, act: { kind: 'mode', id: 'denge', days: 180 } },
    { l: 'Tasarruf programı', d: 'Departman giderleri −%20; moral −2, satış −%3. 180 gün.', eff: [['cash', 500_000]], g: -0.8, r: -0.5, act: { kind: 'mode', id: 'tasarruf', days: 180 } }] });
  all.push({ id: 'borc', kind: 'borc', title: 'Borç politikası', text: `Mevcut borç ${(debtTotal(s) / 100 / 1e6).toFixed(1)} M₺. Kurul, finansman yapısını görüşüyor.`, options: [
    { l: 'Yeni kredi çek', d: 'Bankadan ticari kredi: nakit girer, taksit ve faiz yükü doğar.', eff: [], g: 0.8, r: 0.9, act: { kind: 'loan' } },
    { l: 'Borç azalt', d: 'Nakdin bir kısmıyla kredileri erken öde (faiz yükü düşer).', eff: [['score', 6]], g: -0.5, r: -0.8, act: { kind: 'repay' } },
    { l: 'Olduğu gibi bırak', d: 'Değişiklik yok.', eff: [], g: 0, r: 0 }] });
  const sec = UNLOCK_SECTORS.find(([id]) => isUnlocked(s, id) && sectorDiscount(s, id) === 0) ?? UNLOCK_SECTORS[0]!;
  all.push({ id: 'sektor', kind: 'sektor', title: `Yeni sektör: ${sec[1]}`, text: 'Kurul, yeni bir sektöre girişi fizibilite çalışmasıyla desteklemeyi öneriyor. Rapor, yatırım maliyetinde (enerji kurulumu / ihale teminatı) %8 avantaj sağlar.', options: [
    { l: 'Fizibilite çalıştır', d: 'Bu sektörde %8 maliyet avantajı (12 ay).', eff: [['cash', -1_000_000]], g: 0.9, r: 0.6, act: { kind: 'discount', sector: sec[0] } },
    { l: 'Şimdilik beklemeye al', d: 'Maliyet yok.', eff: [], g: -0.2, r: -0.3 }] });
  all.push({ id: 'temettu', kind: 'temettu', title: 'Kâr dağıtımı', text: 'Son çeyreğin kârının dağıtımı konuşuluyor. Dağıtım ortakları ve ekibi memnun eder, ama kasayı küçültür.', options: [
    { l: 'Kâr payı ve prim dağıt', d: 'Moral +4, itibar +1, kasadan çıkış.', eff: [['cash', -1_200_000], ['morale', 4], ['rep', 1]], g: 0.2, r: 0.4 },
    { l: 'Kârı şirkette tut', d: 'Kredi notu +4.', eff: [['score', 4]], g: -0.3, r: -0.5 }] });
  all.push({ id: 'gm', kind: 'gm', title: m.gm ? `Genel müdür değerlendirmesi: ${m.gm.name}` : 'Genel müdür ihtiyacı', text: m.gm ? `Beceri ${m.gm.skill}, tecrübe ${Math.round(m.gm.exp)}, ${m.gm.mistakes} hatalı karar.` : 'Şirketin genel müdürü yok; yönetim yükü sizin üzerinizde.', options: m.gm ? [
    { l: 'Performans primi', d: 'Genel müdür 1 maaş prim alır; tecrübe +3.', eff: [['cash', -400_000]], g: 0.3, r: 0, act: { kind: 'gmprime' } },
    { l: 'Görevden al', d: 'Tazminat 4 maaş.', eff: [], g: 0, r: 0.2, act: { kind: 'gmfire' } },
    { l: 'Devam', d: 'Değişiklik yok.', eff: [], g: 0, r: 0 }] : [
    { l: 'Aday araştırması başlat', d: 'Sekme: Genel Müdür.', eff: [['cash', -200_000]], g: 0.4, r: 0 }, { l: 'Gerek yok', d: '', eff: [], g: 0, r: 0 }] });
  const weak = DEPTS.filter((d) => m.depts[d.id]?.open).sort((a, b) => deptPerf(s, a.id) - deptPerf(s, b.id))[0];
  all.push({ id: 'butce', kind: 'butce', title: weak ? `Departman bütçesi: ${weak.label}` : 'Departman kurulumu', text: weak ? `${weak.label} performansı ${deptPerf(s, weak.id)}. Bütçeyi artırmak performansı yükseltir ama aylık gideri büyütür.` : 'Henüz departman kurulmadı. Departmanlar şirketin satış, şantiye ve finans performansını artırır.', options: weak ? [
    { l: 'Bütçeyi %50 artır', d: 'Aylık gider artar; performans yükselir.', eff: [], g: 0.6, r: 0.2, act: { kind: 'deptbudget', dept: weak.id } }, { l: 'Bütçe aynı kalsın', d: '', eff: [], g: 0, r: 0 }] : [
    { l: 'Departman kurmayı planla', d: 'Yönetim Merkezi › Departmanlar.', eff: [], g: 0.2, r: 0 }, { l: 'Gerek yok', d: '', eff: [], g: 0, r: 0 }] });
  const order = ['buyume', 'borc', 'gm', 'sektor', 'temettu', 'butce'], start = q % order.length, pickIds = [order[start]!, order[(start + 2) % order.length]!, order[(start + 4) % order.length]!];
  void c; void sc; return pickIds.map((id) => all.find((a) => a.id === id)!);
}
const prefer = (b: BoardMember, o: AgendaOption) => b.growth * o.g + b.risk * o.r;
export function boardVotes(s: GameState, item: AgendaItem): number[] { const m = getMgmt(s); return m.board.map((b) => { let best = 0, bv = -Infinity; item.options.forEach((o, i) => { const v = prefer(b, o); if (v > bv + 1e-9) { bv = v; best = i; } }); return best; }); }
export function majorityOf(votes: number[], n: number): number { const cnt = new Array(n).fill(0); for (const v of votes) cnt[v]++; let best = 0; cnt.forEach((c, i) => { if (c > cnt[best]!) best = i; }); return best; }

/** Her çeyrek başında yeni toplantı açılır; 45 günde karara bağlanmazsa ertelenir ve kurul güveni düşer. */
export function mgmtMonthly(s: GameState, events: GameEvent[]): void {
  const c = s.company; if (!c) return; const m = getMgmt(s), day = s.clock.day, d = dateOf(day);
  refreshCands(s);
  if (m.meeting && day - m.meeting.day > 45) { for (const b of m.board) b.loyalty = clamp(b.loyalty - 3, 0, 100); m.meeting = null; events.push({ type: 'MEETING_MISSED', day }); }
  if (isUnlocked(s, 'kurul') && !m.meeting && [1, 4, 7, 10].includes(d.month) && day >= 80 && quarterOf(day) !== m.lastMeetingQ) {
    m.meeting = { id: s.nextId++, day, items: buildAgenda(s) }; m.lastMeetingQ = quarterOf(day); events.push({ type: 'MEETING_NEW', day, data: { id: m.meeting.id } });
  }
  m.trust = Math.round(m.board.reduce((a, b) => a + b.loyalty, 0) / m.board.length);
  if (m.trust < 25) { c.reputation = clamp(c.reputation - 1, 0, 100); if (day % 90 < 31) { s.news.unshift({ day, text: 'Yönetim kurulunda güven krizi: üyeler şirketin yönünden memnun değil.', tone: 'bad' as never }); if (s.news.length > 30) s.news.length = 30; } }
  if (m.trust >= 70 && day % 90 < 31) c.creditScore = clamp(c.creditScore + 1, 100, 900);
  // genel müdür: aylık karar kalitesi, tecrübe
  if (m.gm) {
    const q = gmQ(s), roll = rand(s.rng, 'events'), sc = eventScale(s); m.gm.exp = Math.min(100, m.gm.exp + 0.8);
    if (roll < clamp(0.22 - 0.25 * q, 0.02, 0.2)) { const amt = Math.round(TL(800_000 + rand(s.rng, 'events') * 1_200_000) * sc); post(s, 'yonetim', -amt, { memo: 'Genel müdürün hatalı kararı' }); m.gm.mistakes++; logDecision(s, 'yonetim', 'Genel müdürün hatalı kararı', `Maliyet ${(amt / 100 / 1e6).toFixed(2)} M₺`); events.push({ type: 'GM_MISTAKE', day, data: { amount: amt } }); }
    else if (roll > 1 - (0.06 + 0.12 * q)) { const amt = Math.round(TL(600_000 + rand(s.rng, 'events') * 900_000) * sc); post(s, 'olay_gelir', amt, { memo: 'Genel müdürün iyi anlaşması' }); events.push({ type: 'GM_GOOD', day, data: { amount: amt } }); }
  }
  if (m.mode && m.mode.until <= day) delete m.mode;
}
export function decideAgenda(s: GameState, itemId: string, option: number, events: GameEvent[]): string | null {
  const m = getMgmt(s), it = m.meeting?.items.find((x) => x.id === itemId); if (!m.meeting || !it) return 'Toplantı gündemi bulunamadı.'; if (it.picked !== undefined) return 'Bu madde karara bağlandı.'; const o = it.options[option]; if (!o) return 'Geçersiz seçenek.';
  const votes = boardVotes(s, it), maj = majorityOf(votes, it.options.length); it.votes = votes; it.majority = maj; it.picked = option;
  const sc = { id: 'kurul', day: s.clock.day } as never;
  for (const e of o.eff) applyEffect(s, e, sc, events);
  if (o.act) executeAct(s, o.act, events);
  m.board.forEach((b, i) => { b.loyalty = clamp(b.loyalty + (votes[i] === option ? 3 : option === maj ? -1 : -3), 0, 100); });
  logDecision(s, 'kurul', `Kurul: ${it.title}`, `${o.l} (${votes.filter((v) => v === option).length}/${votes.length} üye aynı görüşte${option === maj ? '' : '; kurul çoğunluğunun görüşü farklıydı'})`);
  if (m.meeting.items.every((x) => x.picked !== undefined)) { m.meeting = null; events.push({ type: 'MEETING_DONE', day: s.clock.day }); }
  events.push({ type: 'AGENDA_DECIDED', day: s.clock.day, data: { itemId, option } }); return null;
}
function executeAct(s: GameState, act: NonNullable<AgendaOption['act']>, events: GameEvent[]): void {
  const m = getMgmt(s), c = s.company!;
  switch (act.kind) {
    case 'mode': m.mode = { id: act.id, until: s.clock.day + act.days }; break;
    case 'discount': (m.discount ??= {})[act.sector] = { pct: 0.08, until: s.clock.day + 365 }; break;
    case 'gmprime': if (m.gm) { post(s, 'yonetim', -m.gm.salary, { memo: 'Genel müdür primi' }); m.gm.exp = Math.min(100, m.gm.exp + 3); } break;
    case 'gmfire': fireGM(s); break;
    case 'deptbudget': { const d = m.depts[act.dept]; if (d) d.budget = Math.min(2, +(d.budget * 1.5).toFixed(2)); break; }
    case 'repay': { let left = Math.round(Math.min(c.cash * 0.3, debtTotal(s) * 0.3)); for (const l of s.loans.slice().sort((a, b) => b.rate - a.rate)) { if (left <= 0) break; const r = repayLoan(s, l.id, Math.min(left, l.balance)); left -= r.paid ?? 0; } break; }
    case 'loan': {
      const amt = clamp(Math.round(netWorth(s) * 0.12), TL(2_000_000), TL(60_000_000));
      for (const b of BANKS) { const q = quoteLoan(s, { kind: 'ticari', bank: b.id, amount: amt }); if (q.ok) { takeLoan(s, { kind: 'ticari', bank: b.id, amount: amt }, events); return; } }
      logDecision(s, 'kurul', 'Kredi alınamadı', 'Hiçbir banka istenen krediyi vermedi.'); break;
    }
  }
}

// ---- yıllık hedefler ----
export const GOAL_DEFS: { id: string; label: string; unit: string }[] = [
  { id: 'ciro', label: 'Ciro', unit: 'M₺' }, { id: 'kar', label: 'Net kâr', unit: 'M₺' }, { id: 'proje', label: 'Yeni proje', unit: 'adet' }, { id: 'deger', label: 'Şirket değeri artışı', unit: '%' },
  { id: 'borc', label: 'Borç azaltma', unit: 'M₺' }, { id: 'sehir', label: 'Faaliyet gösterilen şehir', unit: 'adet' }, { id: 'memnuniyet', label: 'Çalışan memnuniyeti', unit: 'puan' }, { id: 'pay', label: 'Pazar payı (net varlık)', unit: '%' },
];
export function marketShare(s: GameState): number { const me = Math.max(0, netWorth(s)), others = s.rivals.filter((r) => !r.failed && r.last !== 'satin_alindi').reduce((a, r) => a + Math.max(0, r.cash) + r.projects * TL(25_000_000), 0); return me + others > 0 ? me / (me + others) : 0; }
export const avgMorale = (s: GameState): number => (s.staff.length ? s.staff.reduce((a, x) => a + x.morale, 0) / s.staff.length : 70);
/** Önerilen hedefler: son rapora göre. Para değerleri kuruş, % hedefleri yüzde puandır. */
export function suggestGoals(s: GameState): Goal[] {
  const last = s.reports?.[s.reports.length - 1], ci = s.costIndex, c = s.company!, debt = debtTotal(s);
  return [
    { id: 'ciro', label: 'Ciro', target: Math.round(Math.max((last?.revenue ?? 0) * 1.15, TL(5_000_000) * ci)), weight: 1 },
    { id: 'kar', label: 'Net kâr', target: Math.round(Math.max((last?.profit ?? 0) * 1.2, TL(1_000_000) * ci)), weight: 1.2 },
    { id: 'proje', label: 'Yeni proje', target: Math.max(1, (last?.completed ?? 0) + 1), weight: 1 },
    { id: 'deger', label: 'Şirket değeri artışı', target: 15, weight: 1 },
    { id: 'borc', label: 'Borç azaltma', target: Math.round(Math.max(debt * 0.1, TL(500_000))), weight: 0.8 },
    { id: 'sehir', label: 'Faaliyet gösterilen şehir', target: s.openCities.length + 1, weight: 0.8 },
    { id: 'memnuniyet', label: 'Çalışan memnuniyeti', target: Math.round(clamp(Math.max(70, avgMorale(s) + 3), 60, 95)), weight: 0.7 },
    { id: 'pay', label: 'Pazar payı (net varlık)', target: Math.round(marketShare(s) * 100 + 2), weight: 0.8 },
  ].map((g) => (c.level < 1 ? g : g));
}
export function setGoals(s: GameState, ids: string[], diff: number): string | null {
  const m = getMgmt(s); if (!isUnlocked(s, 'yonetim')) return 'Yönetim Merkezi henüz açılmadı.'; if (!(diff >= 0.8 && diff <= 1.4)) return 'Zorluk çarpanı 0,8–1,4 arasında olmalı.'; if (!ids.length) return 'En az bir hedef seçin.';
  const year = dateOf(s.clock.day).year; if (m.goals?.year === year) return 'Bu yılın hedefleri zaten belirlendi.';
  const sugg = suggestGoals(s), items = sugg.filter((g) => ids.includes(g.id)).map((g) => ({ ...g, target: g.id === 'sehir' || g.id === 'proje' ? Math.max(1, Math.round(g.target * (1 + (diff - 1) * 0.5))) : Math.round(g.target * diff), weight: +(g.weight * (0.8 + diff * 0.2)).toFixed(2) }));
  if (!items.length) return 'Geçersiz hedef.';
  m.goals = { year, items, diff, base: { nw: netWorth(s), debt: debtTotal(s), started: s.progress.c.started, completed: s.company!.stats.completed } };
  logDecision(s, 'hedef', `${year} hedefleri`, items.map((g) => g.label).join(', ')); return null;
}
export function goalActual(s: GameState, id: string, rep: YearReport): number {
  const g = s.mgmt!.goals!; switch (id) {
    case 'ciro': return rep.revenue; case 'kar': return rep.profit; case 'proje': return s.progress.c.started - g.base.started;
    case 'deger': return g.base.nw > 0 ? ((netWorth(s) - g.base.nw) / g.base.nw) * 100 : 0; case 'borc': return g.base.debt - debtTotal(s);
    case 'sehir': return s.openCities.length; case 'memnuniyet': return avgMorale(s); case 'pay': return marketShare(s) * 100; default: return 0;
  }
}
/** Yıl sonunda hedefleri değerlendirir; sonuç raporla birlikte saklanır, ödül/ceza uygulanır. */
export function evalGoals(s: GameState, rep: YearReport): { year: number; score: number; res: GoalResult[] } | null {
  const m = s.mgmt; if (!m?.goals || m.goals.year !== rep.year) return null; const res: GoalResult[] = []; let w = 0, sc = 0;
  for (const g of m.goals.items) { const actual = goalActual(s, g.id, rep), pct = g.target > 0 ? clamp(actual / g.target, 0, 2) : actual >= 0 ? 1 : 0; res.push({ id: g.id, label: g.label, target: g.target, actual, pct }); w += g.weight; sc += g.weight * Math.min(1.25, pct); }
  const score = w > 0 ? Math.round((sc / w) * 100) : 0, c = s.company!;
  if (score >= 85) { c.reputation = clamp(c.reputation + 3, 0, 100); c.creditScore = clamp(c.creditScore + 10, 100, 900); for (const b of m.board) b.loyalty = clamp(b.loyalty + 8, 0, 100); }
  else if (score >= 60) { c.reputation = clamp(c.reputation + 1, 0, 100); for (const b of m.board) b.loyalty = clamp(b.loyalty + 3, 0, 100); }
  else if (score < 40) { c.reputation = clamp(c.reputation - 1, 0, 100); for (const b of m.board) b.loyalty = clamp(b.loyalty - 8, 0, 100); }
  m.goalHist.push({ year: rep.year, score, res }); if (m.goalHist.length > 15) m.goalHist.shift(); m.goals = null;
  logDecision(s, 'hedef', `${rep.year} hedef sonucu: %${score}`, res.map((r) => `${r.label} %${Math.round(r.pct * 100)}`).join(' · ')); return { year: rep.year, score, res };
}
/** Yıllık: yönetici maaşları enflasyonun %90'ı kadar artar. */
export function mgmtYearly(s: GameState): void { const m = s.mgmt; if (!m) return; const k = 1 + (s.macro.inflation / 100) * 0.9; if (m.gm) m.gm.salary = Math.round(m.gm.salary * k); for (const d of Object.values(m.depts)) if (d.mgr) d.mgr.salary = Math.round(d.mgr.salary * k); }
