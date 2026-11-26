import { STAFF_TYPE, STAFF_TYPES, type StaffTypeId } from '../data/catalog';
import { dateOf, dayOf } from './calendar';
import { pick, rand, randInt } from './rng';
import type { Branch, Employee, GameState, Ilan, Sikayet, Vardiya } from './types';

/* ===================== Personel: özellikler, vardiya, yorgunluk, ilan, eğitim ===================== */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
let uid = 1;
export const bumpUid = (n: number) => { if (n >= uid) uid = n + 1; };
const FN = ['Ayşe', 'Mehmet', 'Elif', 'Can', 'Zeynep', 'Burak', 'Selin', 'Emre', 'Derya', 'Kerem', 'Merve', 'Onur', 'Gül', 'Barış', 'İpek', 'Tolga', 'Yasemin', 'Cem', 'Nur', 'Deniz', 'Ece', 'Murat', 'Pelin', 'Serkan'];
const LN = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Koç', 'Kurt', 'Polat', 'Aksoy', 'Erdem', 'Güneş'];
export const SHIFT_NAME: Record<Vardiya, string> = { sabah: 'Sabah', ogle: 'Öğle', aksam: 'Akşam', tam: 'Tam gün', yok: 'Atanmadı' };
export const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
/** Piyasa maaşı: tip, tecrübe ve şehir maliyetine göre. */
export const marketWage = (tip: StaffTypeId, tecrube: number, enf: number, maliyet = 1): number => Math.round(STAFF_TYPE[tip].maas * (0.9 + tecrube * 0.035) * enf * (0.92 + 0.12 * maliyet) / 500) * 500;
export function makeEmployee(s: GameState, tip: StaffTypeId, tecrubeMin = 0, maliyet = 1): Employee {
  const tecrube = randInt(s.rng, 'misc', tecrubeMin, 9), beceri = clamp(30 + tecrube * 6 + (rand(s.rng, 'misc') - 0.3) * 30, 20, 98), hiz = 0.72 + tecrube * 0.06 + rand(s.rng, 'misc') * 0.3;
  const bek = marketWage(tip, tecrube, s.market.fiyat, maliyet) * (0.94 + 0.14 * (beceri / 100));
  return { id: uid++, ad: `${pick(s.rng, 'misc', FN)} ${pick(s.rng, 'misc', LN)}`, tip, maas: Math.round(bek / 500) * 500, maasBeklenti: Math.round(bek / 500) * 500, tecrube, beceri: Math.round(beceri), hiz: Math.round(hiz * 100) / 100, iliski: randInt(s.rng, 'misc', 35, 92), disiplin: randInt(s.rng, 'misc', 35, 95), motivasyon: 72, memnuniyet: 72, performans: 70, yorgunluk: 8, devam: 92, vardiya: 'yok', izin: -1, mesai: false, egitim: null, degerlendirme: null, sikayet: 0, prim: 0, hasta: 0, gorunum: randInt(s.rng, 'misc', 0, 9999), ise: dayOf(s) };
}
export const staffOf = (b: Branch, tip: StaffTypeId): Employee[] => b.staff.filter((e) => e.tip === tip);

/* ----- vardiya pencereleri ----- */
export function shiftWindow(b: Branch, v: Vardiya): [number, number] | null {
  const { aci, kapa } = b.mesai, len = kapa - aci;
  switch (v) { case 'sabah': return [aci, Math.min(kapa, aci + Math.min(8, Math.round(len * 0.55)))]; case 'ogle': return [aci + Math.round(len * 0.25), Math.min(kapa, aci + Math.round(len * 0.25) + 8)]; case 'aksam': return [Math.max(aci, kapa - 8), kapa]; case 'tam': return [aci, kapa]; default: return null; }
}
export const shiftHours = (b: Branch, e: Employee): number => { const w = shiftWindow(b, e.vardiya); return w ? w[1] - w[0] + (e.mesai ? 3 : 0) : 0; };
export function isWorking(b: Branch, e: Employee, hour: number, haftaGun: number, now: number): boolean {
  if (e.hasta > 0 || (e.egitim && e.egitim.bit > now) || e.izin === haftaGun) return false; const w = shiftWindow(b, e.vardiya); if (!w) return false;
  return hour >= w[0] && hour < w[1] + (e.mesai ? 3 : 0) && hour < b.mesai.kapa + (e.mesai ? 3 : 0);
}
export const fatigueMult = (e: Employee) => 1 - 0.5 * Math.max(0, (e.yorgunluk - 40) / 60);
export function eff(e: Employee): number { return e.hiz * (0.6 + 0.4 * e.beceri / 100) * (0.55 + 0.45 * e.performans / 100) * fatigueMult(e); }
export interface Coverage { barista: number; kasiyer: number; servis: number; temizlik: number; sorumlu: boolean; mudur: boolean; sayi: number; iliski: number; disiplin: number }
export function coverage(b: Branch, hour: number, haftaGun: number, now: number): Coverage {
  const c: Coverage = { barista: 0, kasiyer: 0, servis: 0, temizlik: 0, sorumlu: false, mudur: false, sayi: 0, iliski: 0, disiplin: 0 }; let il = 0, di = 0;
  for (const e of b.staff) { if (!isWorking(b, e, hour, haftaGun, now)) continue; c.sayi++; il += e.iliski; di += e.disiplin; const f = eff(e); if (e.tip === 'barista') c.barista += f; else if (e.tip === 'kasiyer') c.kasiyer += f; else if (e.tip === 'servis') c.servis += f; else if (e.tip === 'temizlik') c.temizlik += f; else if (e.tip === 'vardiya_sor') { c.sorumlu = true; c.kasiyer += f * 0.4; } else if (e.tip === 'sube_muduru') { c.mudur = true; c.kasiyer += f * 0.3; } }
  c.iliski = c.sayi ? il / c.sayi : 0; c.disiplin = c.sayi ? di / c.sayi : 0; return c;
}
/** 10 dakikada hazırlanabilen iş (saniye) — bu saatte vardiyada olanlara göre. */
export function capacityAt(s: GameState, b: Branch, hour: number, haftaGun: number, now: number, yat = 1): number {
  const c = coverage(b, hour, haftaGun, now); const bolge = Math.min(0.09, 0.03 * s.subeler.flatMap((x) => x.staff).filter((e) => e.tip === 'bolge_muduru').length);
  return (c.barista + 0.5 * c.kasiyer) * 0.9 * 600 * (c.sorumlu ? 1.05 : 1) * (c.mudur ? 1.06 : 1) * (1 + bolge) * yat;
}
/** Boş saatlerin listesi (barista ya da kasiyer yok) — plan uyarısı için. */
export function gaps(b: Branch, haftaGun: number, now: number): number[] { const g: number[] = []; for (let h = b.mesai.aci; h < b.mesai.kapa; h++) { const c = coverage(b, h + 0.5, haftaGun, now); if (c.barista + c.kasiyer <= 0) g.push(h); } return g; }
export function weekGaps(b: Branch, now: number): number { let t = 0; for (let d = 0; d < 7; d++) t += gaps(b, d, now).length; return t; }

/* ----- otomatik plan ----- */
export function autoPlan(b: Branch): void {
  const order: Vardiya[] = ['ogle', 'sabah', 'aksam', 'ogle', 'sabah', 'aksam']; const per: Partial<Record<StaffTypeId, number>> = {}; let izinK = 0;
  for (const e of b.staff) {
    const k = per[e.tip] ?? 0; per[e.tip] = k + 1;
    if (e.tip === 'sube_muduru') e.vardiya = 'tam'; else if (e.tip === 'bolge_muduru' || e.tip === 'pazarlama') e.vardiya = 'sabah'; else if (e.tip === 'temizlik') e.vardiya = k === 0 ? 'ogle' : 'aksam';
    else if (e.tip === 'kasiyer') e.vardiya = k % 2 === 0 ? 'sabah' : 'aksam'; else e.vardiya = order[k % order.length] ?? 'ogle';
    e.izin = (izinK * 2 + (e.tip === 'sube_muduru' ? 6 : 1)) % 7; izinK++;
  }
  const bars = staffOf(b, 'barista'); if (bars.length === 1) bars[0]!.vardiya = 'tam';
}

/* ----- günlük işler ----- */
export function dailyHr(s: GameState, b: Branch, ev: { log: (m: string) => void }): void {
  const now = dayOf(s), hg = dateOf(now).haftaGun;
  for (const e of [...b.staff]) {
    const w = shiftHours(b, e), works = e.izin !== hg && e.hasta <= 0 && !(e.egitim && e.egitim.bit > now);
    if (e.egitim && e.egitim.bit <= now) finishTraining(e, b, ev);
    if (e.hasta > 0) e.hasta--;
    if (works) e.yorgunluk = clamp(e.yorgunluk + w * 0.95 - 5.5 + (e.mesai ? 2 : 0), 0, 100); else e.yorgunluk = clamp(e.yorgunluk - (e.izin === hg ? 28 : 12), 0, 100);
    const p = 0.008 + 0.0007 * Math.max(0, e.yorgunluk - 50) + (100 - e.disiplin) * 0.0003 + (e.memnuniyet < 35 ? 0.03 : 0);
    if (e.izin !== hg && rand(s.rng, 'misc') < p) { e.hasta = 1 + (rand(s.rng, 'misc') < 0.3 ? 1 : 0); e.devam = clamp(e.devam - 4, 0, 100); } else e.devam = clamp(e.devam + 0.3, 0, 100);
    const adil = clamp(e.maas / Math.max(1, marketWage(e.tip, e.tecrube, s.market.fiyat)), 0.6, 1.5), yukPuan = -Math.max(0, e.yorgunluk - 55) * 0.05 - (e.mesai ? 0.6 : 0);
    const mud = staffOf(b, 'sube_muduru').length ? 0.35 : 0, sor = staffOf(b, 'vardiya_sor').length ? 0.2 : 0;
    e.memnuniyet = clamp(e.memnuniyet + (adil - 1) * 3.2 + yukPuan + mud + sor + (b.memnuniyet - 60) * 0.008 - 0.12 - (e.izin < 0 ? 0.3 : 0) - e.sikayet * 0.1, 0, 100);
    e.motivasyon = clamp(e.motivasyon * 0.9 + e.memnuniyet * 0.1, 0, 100);
    e.performans = clamp(38 + e.tecrube * 3 + e.motivasyon * 0.3 + e.beceri * 0.18 + e.disiplin * 0.1, 15, 100);
    if (e.tecrube < 10 && rand(s.rng, 'misc') < 0.0025) e.tecrube++;
    /* şikâyet */
    const open = b.sikayetler.filter((x) => x.emp === e.id).length; if (open < 1 && b.sikayetler.length < 6) {
      const r = rand(s.rng, 'misc'); let t: Sikayet['tip'] | null = null; if (e.yorgunluk > 72 && r < 0.18) t = 'yorgun'; else if (adil < 0.88 && r < 0.12) t = 'maas'; else if (e.mesai && r < 0.1) t = 'mesai'; else if (e.izin < 0 && r < 0.06) t = 'program';
      if (t) b.sikayetler.push({ id: uid++, emp: e.id, tip: t, gun: now, metin: { yorgun: 'Çok yoruldum, dinlenmem gerek.', maas: 'Maaşım piyasanın altında kalıyor.', mesai: 'Fazla mesai çok fazla.', program: 'Haftalık iznim yok.' }[t] });
    }
    for (const x of b.sikayetler.filter((q) => q.emp === e.id && now - q.gun > 6)) { e.memnuniyet = clamp(e.memnuniyet - 1.2, 0, 100); void x; }
    /* ayrılma */
    if ((e.memnuniyet < 22 || e.motivasyon < 20) && rand(s.rng, 'misc') < 0.07) { b.staff = b.staff.filter((x) => x !== e); b.sikayetler = b.sikayetler.filter((q) => q.emp !== e.id); ev.log(`${e.ad} (${STAFF_TYPE[e.tip].ad}) işten ayrıldı; yeni personel gerekiyor.`); }
  }
  /* ilan ve adaylar */
  b.adaylar = b.adaylar.filter((a) => a.son > now); b.ilanlar = b.ilanlar.filter((i) => i.bit > now);
  for (const i of b.ilanlar) {
    const piyasa = marketWage(i.tip, 3, s.market.fiyat), cazip = clamp(i.teklif / piyasa, 0.6, 1.5), p = clamp(0.25 + (cazip - 1) * 0.9 + 0.003 * b.marka, 0.05, 0.85);
    if (b.adaylar.length < 8 && rand(s.rng, 'misc') < p) { const a = makeEmployee(s, i.tip, cazip > 1.1 ? 2 : 0); a.maasBeklenti = Math.round(a.maasBeklenti * (0.92 + 0.16 * rand(s.rng, 'misc')) / 500) * 500; a.maas = a.maasBeklenti; b.adaylar.push({ ...a, ilan: i.id, son: now + 5 }); }
  }
}
function finishTraining(e: Employee, b: Branch, ev: { log: (m: string) => void }): void {
  const t = e.egitim!.tip; e.egitim = null; if (t === 'beceri') { e.beceri = clamp(e.beceri + 7, 0, 100); e.hiz = Math.min(1.7, e.hiz + 0.05); } else if (t === 'musteri') e.iliski = clamp(e.iliski + 9, 0, 100); else if (t === 'disiplin') e.disiplin = clamp(e.disiplin + 9, 0, 100); else { e.beceri = clamp(e.beceri + 4, 0, 100); e.disiplin = clamp(e.disiplin + 4, 0, 100); e.iliski = clamp(e.iliski + 4, 0, 100); }
  e.memnuniyet = clamp(e.memnuniyet + 4, 0, 100); ev.log(`${e.ad} eğitimi tamamladı (${b.ad}).`);
}

/* ----- oyuncu eylemleri ----- */
export interface HrResult { ok: boolean; m: string }
const ok = (m: string): HrResult => ({ ok: true, m }), no = (m: string): HrResult => ({ ok: false, m });
export function postJob(s: GameState, b: Branch, tip: StaffTypeId, teklif: number, maliyet = 1): HrResult {
  if (b.ilanlar.filter((i) => i.tip === tip).length) return no('Bu pozisyon için ilan zaten yayında.'); const fee = Math.round(2500 * s.market.fiyat * (0.9 + 0.2 * maliyet)); if (s.kasa < fee) return no('İlan ücreti için kasa yetersiz.');
  s.kasa -= fee; b.bugun.gider.isealim += fee; b.ilanlar.push({ id: uid++, tip, teklif, bas: dayOf(s), bit: dayOf(s) + 10 } as Ilan); return ok(`${STAFF_TYPE[tip].ad} ilanı yayınlandı (−${Math.round(fee)} ₺). Adaylar birkaç gün içinde gelir.`);
}
export function hireCandidate(s: GameState, b: Branch, id: number, maas: number, limit: number): HrResult {
  const a = b.adaylar.find((x) => x.id === id); if (!a) return no('Aday bulunamadı.'); if (b.staff.length >= limit) return no('Şubede daha fazla çalışan çalışamaz.'); if (a.tip === 'sube_muduru' && staffOf(b, 'sube_muduru').length) return no('Zaten şube müdürü var.');
  if (maas < a.maasBeklenti * 0.9) return no(`${a.ad} bu maaşı kabul etmedi (beklenti ${a.maasBeklenti} ₺).`); const fee = maas * 0.25; if (s.kasa < fee) return no('İşe alım bedeli için kasa yetersiz.');
  s.kasa -= fee; b.bugun.gider.isealim += fee; const { ilan, son, ...e } = a; void ilan; void son; e.maas = maas; e.memnuniyet = clamp(72 + (maas / a.maasBeklenti - 1) * 40, 40, 95); e.motivasyon = e.memnuniyet; e.ise = dayOf(s); b.staff.push(e); b.adaylar = b.adaylar.filter((x) => x.id !== id); autoPlanOne(b, e); return ok(`${e.ad} işe alındı.`);
}
function autoPlanOne(b: Branch, e: Employee): void {
  const hg = dateOf(0).haftaGun; void hg; let best: Vardiya = 'ogle', bv = 1e9; for (const v of ['sabah', 'ogle', 'aksam'] as Vardiya[]) { const n = b.staff.filter((x) => x !== e && x.tip === e.tip && x.vardiya === v).length; if (n < bv) { bv = n; best = v; } }
  e.vardiya = e.tip === 'sube_muduru' ? 'tam' : best; const used = new Set(b.staff.filter((x) => x !== e).map((x) => x.izin)); for (let d = 0; d < 7; d++) { const dd = (d + 1) % 7; if (!used.has(dd)) { e.izin = dd; break; } }
}
export const setShift = (e: Employee, v: Vardiya): void => { e.vardiya = v; };
export const setLeave = (e: Employee, d: number): void => { e.izin = d; };
export const toggleOvertime = (e: Employee): void => { e.mesai = !e.mesai; };
export function fireEmp(s: GameState, b: Branch, id: number): HrResult { const e = b.staff.find((x) => x.id === id); if (!e) return no('Çalışan yok.'); if (b.staff.length <= 1) return no('En az bir çalışan kalmalı.'); const t = e.maas * 0.5; s.kasa -= t; b.bugun.gider.maas += 0; b.bugun.gider.isealim += t; b.staff = b.staff.filter((x) => x !== e); b.sikayetler = b.sikayetler.filter((q) => q.emp !== id); for (const o of b.staff) o.memnuniyet = clamp(o.memnuniyet - 3, 0, 100); return ok(`${e.ad} işten çıkarıldı (tazminat ${Math.round(t)} ₺).`); }
export function setWage(e: Employee, maas: number): void { const eski = e.maas; e.maas = Math.round(maas / 500) * 500; e.memnuniyet = clamp(e.memnuniyet + (e.maas - eski) / Math.max(1, eski) * 60, 0, 100); e.sikayet = Math.max(0, e.sikayet - (e.maas > eski ? 1 : 0)); }
export function giveBonus(s: GameState, b: Branch, e: Employee, tutar: number): HrResult { if (s.kasa < tutar) return no('Kasa yetersiz.'); s.kasa -= tutar; b.bugun.gider.prim += tutar; e.prim += tutar; e.memnuniyet = clamp(e.memnuniyet + Math.min(15, tutar / Math.max(1, e.maas) * 30), 0, 100); e.motivasyon = clamp(e.motivasyon + 6, 0, 100); return ok(`${e.ad} için ${Math.round(tutar)} ₺ prim verildi.`); }
export function evaluate(s: GameState, e: Employee): HrResult {
  const puan = Math.round(0.3 * e.performans + 0.2 * e.devam + 0.15 * e.disiplin + 0.15 * e.iliski + 0.2 * e.beceri), not = puan >= 80 ? 'Çok başarılı; terfi ve prim için uygun.' : puan >= 65 ? 'İyi performans.' : puan >= 50 ? 'Gelişime açık; eğitim önerilir.' : 'Zayıf performans; uyarı ya da eğitim gerekir.';
  e.degerlendirme = { gun: dayOf(s), puan, not }; e.memnuniyet = clamp(e.memnuniyet + (puan >= 65 ? 2 : -1), 0, 100); return ok(`${e.ad}: ${puan}/100 — ${not}`);
}
export const TRAININGS: Array<{ id: string; ad: string; maliyet: number; gun: number; ac: string }> = [{ id: 'beceri', ad: 'Barista / servis becerisi', maliyet: 9000, gun: 3, ac: 'Beceri +7, hız artar' }, { id: 'musteri', ad: 'Müşteri ilişkileri', maliyet: 7000, gun: 2, ac: 'Müşteri ilişkileri +9' }, { id: 'disiplin', ad: 'İş disiplini', maliyet: 6000, gun: 2, ac: 'Disiplin +9' }, { id: 'liderlik', ad: 'Liderlik ve temel eğitim', maliyet: 12000, gun: 4, ac: 'Beceri, disiplin ve ilişkiler +4' }];
export function train(s: GameState, b: Branch, e: Employee, id: string): HrResult { const t = TRAININGS.find((x) => x.id === id); if (!t) return no('Eğitim yok.'); if (e.egitim) return no('Zaten eğitimde.'); const c = t.maliyet * s.market.fiyat; if (s.kasa < c) return no('Kasa yetersiz.'); s.kasa -= c; b.bugun.gider.egitim += c; e.egitim = { tip: id, bit: dayOf(s) + t.gun }; return ok(`${e.ad} ${t.gun} günlük eğitime gönderildi (−${Math.round(c)} ₺). Bu sürede vardiyada olmaz.`); }
const PROMO: Partial<Record<StaffTypeId, StaffTypeId>> = { barista: 'vardiya_sor', kasiyer: 'vardiya_sor', servis: 'kasiyer', temizlik: 'servis', vardiya_sor: 'sube_muduru' };
export function promote(s: GameState, b: Branch, e: Employee): HrResult {
  const to = PROMO[e.tip]; if (!to) return no('Bu pozisyon için terfi yolu yok.'); if (e.tecrube < 3 || e.performans < 65) return no('Terfi için en az 3 yıl tecrübe ve 65 performans gerekir.'); if (to === 'sube_muduru' && staffOf(b, 'sube_muduru').length) return no('Zaten şube müdürü var.');
  e.tip = to; e.maas = Math.round(Math.max(e.maas * 1.18, marketWage(to, e.tecrube, s.market.fiyat) * 0.95) / 500) * 500; e.maasBeklenti = e.maas; e.memnuniyet = clamp(e.memnuniyet + 12, 0, 100); e.motivasyon = clamp(e.motivasyon + 12, 0, 100); return ok(`${e.ad}, ${STAFF_TYPE[to].ad} oldu (yeni maaş ${e.maas} ₺).`);
}
export function resolveComplaint(s: GameState, b: Branch, id: number, secim: 'zam' | 'izin' | 'dinle' | 'gec'): HrResult {
  const q = b.sikayetler.find((x) => x.id === id); if (!q) return no('Şikâyet yok.'); const e = b.staff.find((x) => x.id === q.emp); b.sikayetler = b.sikayetler.filter((x) => x.id !== id); if (!e) return ok('Çalışan ayrılmıştı.');
  if (secim === 'zam') { setWage(e, e.maas * 1.1); return ok(`${e.ad}'e %10 zam yapıldı.`); } if (secim === 'izin') { e.yorgunluk = clamp(e.yorgunluk - 30, 0, 100); e.hasta = 1; e.memnuniyet = clamp(e.memnuniyet + 6, 0, 100); return ok(`${e.ad}'e bir gün izin verildi.`); }
  if (secim === 'dinle') { e.memnuniyet = clamp(e.memnuniyet + 3, 0, 100); return ok('Dinlendin; çalışan biraz rahatladı.'); } e.sikayet++; e.memnuniyet = clamp(e.memnuniyet - 4, 0, 100); return ok('Şikâyet yok sayıldı; çalışan memnuniyeti düştü.');
}
export { STAFF_TYPES };
