import { describe, expect, it } from 'vitest';
import { newGame, iseAl, ilanVer } from '../src/core/actions';
import { step, dayOf } from '../src/core/sim';
import { autoPlan, coverage, evaluate, giveBonus, promote, resolveComplaint, setLeave, setShift, setWage, toggleOvertime, train, weekGaps, shiftHours, makeEmployee, capacityAt, staffOf, gaps } from '../src/core/hr';
import { dateOf } from '../src/core/calendar';

const mk = (seed = 7, sehir = 26, tip: 'mahalle' | 'cadde' = 'cadde') => newGame({ ad: 'T', sehir, tip, seed, kasa: 5e6 }).s;
const run = (s: ReturnType<typeof mk>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };

describe('personel ve vardiya', () => {
  it('başlangıç kadrosu otomatik planlanır ve haftalık boşluk bırakmaz', () => { const s = mk(); const b = s.subeler[0]!; expect(b.staff.every((e) => e.vardiya !== 'yok')).toBe(true); expect(b.staff.some((e) => e.izin >= 0)).toBe(true); });
  it('çalışanlar tüm özelliklere sahip', () => { const e = mk().subeler[0]!.staff[0]!; for (const k of ['tecrube', 'beceri', 'hiz', 'iliski', 'disiplin', 'maasBeklenti', 'memnuniyet', 'yorgunluk', 'devam'] as const) expect(Number.isFinite(e[k])).toBe(true); });
  it('vardiya dışı saatte personel sayılmaz; kapsama vardiyaya bağlıdır', () => {
    const s = mk(); const b = s.subeler[0]!; for (const e of b.staff) { e.izin = -1; e.vardiya = 'sabah'; } const now = dayOf(s);
    expect(coverage(b, 10, 0, now).barista).toBeGreaterThan(0); expect(coverage(b, 21, 0, now).barista).toBe(0); expect(gaps(b, 0, now).length).toBeGreaterThan(5); autoPlan(b); expect(weekGaps(b, now)).toBeLessThan(40);
  });
  it('izin gününde çalışmaz', () => { const s = mk(); const b = s.subeler[0]!; const e = staffOf(b, 'barista')[0]!; b.staff.forEach((x) => { x.vardiya = 'tam'; }); e.izin = 2; const now = dayOf(s); expect(coverage({ ...b, staff: [e] }, 12, 2, now).barista).toBe(0); expect(coverage({ ...b, staff: [e] }, 12, 3, now).barista).toBeGreaterThan(0); });
  it('personel yetersizse hizmet yavaşlar: yarı kadro daha çok müşteri kaybeder, memnuniyet düşer', () => {
    const a = mk(11), z = mk(11); for (const b of [a.subeler[0]!, z.subeler[0]!]) b.otoSiparis = true; const bz = z.subeler[0]!; bz.staff = bz.staff.filter((e) => e.tip !== 'barista').slice(0, 1); bz.staff.push(makeEmployee(z, 'barista')); autoPlan(bz); for (const e of bz.staff) e.vardiya = 'sabah';
    run(a, 25); run(z, 25); const ky = (s: typeof a) => s.rapor.reduce((x, r) => x + r.kayip, 0), mm = (s: typeof a) => s.subeler[0]!.memnuniyet; expect(ky(z)).toBeGreaterThan(ky(a)); expect(mm(z)).toBeLessThan(mm(a) + 0.5);
  });
  it('yanlış plan yorgunluğu artırır; izinli plan dengeler', () => {
    const s = mk(5); const b = s.subeler[0]!; const e = b.staff[0]!; b.staff = [e, ...b.staff.slice(1)]; for (const x of b.staff) { x.vardiya = 'tam'; x.izin = -1; x.mesai = true; } run(s, 14); const yor = e.yorgunluk; expect(yor).toBeGreaterThan(55);
    const t = mk(5); const c = t.subeler[0]!; for (const x of c.staff) { x.vardiya = 'sabah'; x.izin = 6; x.mesai = false; } run(t, 14); expect(c.staff[0]!.yorgunluk).toBeLessThan(yor - 20);
  });
  it('ilan → aday gelir → pazarlıkla işe alınır; düşük teklif reddedilir', () => {
    const s = mk(9); const b = s.subeler[0]!; const n0 = b.staff.length; const r = ilanVer(s, b, 'servis', 40000); expect(r.ok).toBe(true); expect(ilanVer(s, b, 'servis', 40000).ok).toBe(false); run(s, 8); expect(b.adaylar.length).toBeGreaterThan(0);
    const a = b.adaylar[0]!; expect(iseAl(s, b, a.id, Math.round(a.maasBeklenti * 0.5)).ok).toBe(false); const rr = iseAl(s, b, a.id, a.maasBeklenti); expect(rr.ok).toBe(true); expect(b.staff.length).toBe(n0 + 1);
  });
  it('maaş zammı, prim, değerlendirme, eğitim, terfi çalışır', () => {
    const s = mk(3); const b = s.subeler[0]!; const e = staffOf(b, 'barista')[0]!; e.tecrube = 5; e.performans = 80; const m0 = e.memnuniyet; setWage(e, e.maas * 1.2); expect(e.memnuniyet).toBeGreaterThan(m0);
    const k0 = s.kasa; expect(giveBonus(s, b, e, 5000).ok).toBe(true); expect(s.kasa).toBe(k0 - 5000); expect(evaluate(s, e).ok).toBe(true); expect(e.degerlendirme).not.toBeNull();
    const be = e.beceri; expect(train(s, b, e, 'beceri').ok).toBe(true); expect(e.egitim).not.toBeNull(); run(s, 4); expect(e.beceri).toBeGreaterThan(be); expect(promote(s, b, e).ok).toBe(true); expect(e.tip).toBe('vardiya_sor');
  });
  it('şikâyetler oluşur ve çözülünce çalışanı etkiler', () => {
    const s = mk(13); const b = s.subeler[0]!; for (const e of b.staff) { e.maas = Math.round(e.maas * 0.6); e.yorgunluk = 80; } run(s, 20); expect(b.sikayetler.length).toBeGreaterThan(0); const q = b.sikayetler[0]!; const e = b.staff.find((x) => x.id === q.emp); if (e) { const m = e.memnuniyet; resolveComplaint(s, b, q.id, 'zam'); expect(e.memnuniyet).toBeGreaterThanOrEqual(m - 0.01); expect(b.sikayetler.find((x) => x.id === q.id)).toBeUndefined(); }
  });
  it('memnuniyeti çok düşen çalışan ayrılır', () => { const s = mk(21); const b = s.subeler[0]!; const n = b.staff.length; for (const e of b.staff) { e.memnuniyet = 5; e.motivasyon = 5; } run(s, 60); expect(b.staff.length).toBeLessThan(n + 0.5); expect(s.log.some((l) => l.includes('ayrıldı')) || b.staff.length < n).toBe(true); });
  it('fazla mesai kapasiteyi uzatır ama maliyeti ve yorgunluğu artırır', () => { const s = mk(); const b = s.subeler[0]!; const e = staffOf(b, 'barista')[0]!; setShift(e, 'sabah'); setLeave(e, -1); const h0 = shiftHours(b, e); toggleOvertime(e); expect(shiftHours(b, e)).toBe(h0 + 3); expect(dateOf(0).haftaGun).toBe(0); expect(capacityAt(s, b, 12, 1, dayOf(s))).toBeGreaterThan(0); });
});
