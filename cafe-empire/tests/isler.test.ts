/** Kavurmahane, kurye/bulut mutfak, mülk, sadakat, basın, anket/A-B, mevzuat, sürdürülebilirlik, sigorta/afet. */
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/actions';
import { step, dayOf, resolveEvent } from '../src/core/sim';
import { oyna } from './bot';
import '../src/core/pricing'; import '../src/core/franchise'; import '../src/core/merkez';
import { D, harman } from '../src/core/derin';
import { K, KAV_SEVIYE, kavNeden, kavYukselt, kavToptan, karsilama } from '../src/core/kavurma';
import { Kr, kuryeAyarla, bulutKur, bulutKapat } from '../src/core/kurye';
import { M, mulkAl, mulkSat, deger, sahip, alisFiyati, toplamDeger } from '../src/core/mulk';
import { sirketDegeri } from '../src/core/yatirim';
import { Sd, sadKur, sadPuan, sadKampanya, etki as sadEtki } from '../src/core/sadakat';
import { B, bulten, adaylariYenile, influencerAnlas, imajEtki } from '../src/core/basin';
import { A, anketYap, abBaslat, abSonuc, AB_GUN } from '../src/core/anket';
import { Mv, ruhsatBit, ruhsatKalan, ruhsatYenile, muhasebeci, tesvikBasvur } from '../src/core/mevzuat';
import { Sr, skor, programKur } from '../src/core/surdur';
import { Af, planDegistir, jeneratorAl, risk, varlik, TURLER } from '../src/core/afet';
import { genelGider } from '../src/core/denge';

const yeni = (seed = 1) => newGame({ ad: 'Test', sehir: 34, tip: 'cadde', seed, ilce: '34:Kadıköy' }).s;
const gunGit = (s: ReturnType<typeof yeni>, hedef: number): void => { while (dayOf(s) < hedef && !s.oyunBitti) { s.bekleyen.length = 0; step(s, 1440); } };
const klon = (s: ReturnType<typeof yeni>, n: number): void => { for (let i = 0; i < n; i++) { const c = JSON.parse(JSON.stringify(s.subeler[0])); c.id = 300 + i; c.ilce = 'k' + i; s.subeler.push(c); } };

describe('kavurmahane', () => {
  it('kurulum şartları, maliyet/kalite etkisi, toptan satış geliri', () => {
    const s = yeni(2); expect(kavNeden(s)).toBeTruthy(); expect(kavYukselt(s).ok).toBe(false); const h0 = harman(s); klon(s, 3); s.kasa = 5e7; (s.marka_puani = 40);
    K(s).seviye = 1; const h1 = harman(s); expect(h1.mal).toBeLessThan(h0.mal); expect(h1.kal).toBeGreaterThan(h0.kal); expect(karsilama(s)).toBeGreaterThan(0);
    K(s).seviye = 3; kavToptan(s, 0); gunGit(s, dayOf(s) + 6); expect(K(s).gelir).toBeGreaterThan(0); expect(K(s).kg).toBeGreaterThan(0); expect(KAV_SEVIYE.length).toBe(4); expect(kavToptan(s, 9).ok).toBe(true); expect(K(s).toptan).toBe(2);
  });
});
describe('kurye ve bulut mutfak', () => {
  it('filo gelir ve gider yaratır; bulut mutfak talebi artırır; sınırlar', () => {
    const s = yeni(3); gunGit(s, 5); s.kasa = 5e7; expect(kuryeAyarla(s, -1).ok).toBe(false); expect(kuryeAyarla(s, 6).ok).toBe(true); const k = Kr(s); gunGit(s, dayOf(s) + 6); const g1 = k.bugun.gelir; expect(g1).toBeGreaterThan(0); expect(s.rapor[s.rapor.length - 1]!.gelir.paket).toBeGreaterThan(0);
    const t1 = k.bugun.talep; expect(bulutKur(s).ok).toBe(true); gunGit(s, dayOf(s) + 3); expect(k.bugun.talep).toBeGreaterThan(t1 * 0.9); expect(bulutKapat(s).ok).toBe(true); expect(bulutKapat(s).ok).toBe(false); for (let i = 0; i < 40; i++) kuryeAyarla(s, 1); expect(k.filo).toBeLessThanOrEqual(24);
  });
});
describe('mülk', () => {
  it('satın al: kira sıfırlanır, değer endekse bağlı, sat: kira geri gelir, değerlemeye girer', () => {
    const s = yeni(4), b = s.subeler[0]!; s.kasa = 5e7; const kira0 = b.kira, v0 = sirketDegeri(s).deger; expect(alisFiyati(s, b)).toBeGreaterThan(kira0 * 12 * 12); expect(mulkAl(s, b.id).ok).toBe(true); expect(b.kira).toBe(0); expect(sahip(s, b)).toBe(true); expect(mulkAl(s, b.id).ok).toBe(false);
    const d0 = deger(s, b); s.market.fiyat *= 1.3; expect(deger(s, b)).toBeGreaterThan(d0); expect(sirketDegeri(s).deger).toBeGreaterThan(v0); gunGit(s, dayOf(s) + 5); expect(M(s).vergi).toBeGreaterThan(0); expect(toplamDeger(s)).toBeGreaterThan(0);
    expect(mulkSat(s, b.id).ok).toBe(true); expect(b.kira).toBeGreaterThan(0); expect(sahip(s, b)).toBe(false); expect(mulkSat(s, b.id).ok).toBe(false);
  });
});
describe('sadakat uygulaması', () => {
  it('kur, üye büyür, talebe katkı, puan maliyeti, kampanya bekleme', () => {
    const s = yeni(5); s.kasa = 5e7; expect(sadKampanya(s, 'push').ok).toBe(false); expect(sadKur(s).ok).toBe(true); expect(sadKur(s).ok).toBe(false); sadPuan(s, 3); gunGit(s, dayOf(s) + 30); const k = Sd(s); expect(k.uye).toBeGreaterThan(80); expect(k.odenen).toBeGreaterThan(0); expect(sadEtki(s)).toBeGreaterThan(0); expect(sadEtki(s)).toBeLessThanOrEqual(0.15);
    expect(sadKampanya(s, 'geri').ok).toBe(true); expect(sadKampanya(s, 'geri').ok).toBe(false); expect(sadKampanya(s, 'yok').ok).toBe(false); expect(s.rapor[s.rapor.length - 1]!.gider.sadakat).toBeGreaterThan(0);
  });
});
describe('basın ve imaj', () => {
  it('bülten bekleme süresi, influencer tek anlaşma, imaj sınırları, aday yenileme', () => {
    const s = yeni(6); s.kasa = 5e7; gunGit(s, 10); expect(B(s).adaylar.length).toBe(3); const b1 = bulten(s); expect(b1.ok).toBe(true); expect(bulten(s).ok).toBe(false); adaylariYenile(s); const id = B(s).adaylar[0]!.id; expect(influencerAnlas(s, id).ok).toBe(true); expect(influencerAnlas(s, B(s).adaylar[0]!.id).ok).toBe(false); expect(influencerAnlas(s, 'yok').ok).toBe(false);
    B(s).imaj = 100; expect(imajEtki(s)).toBeCloseTo(1.05, 5); B(s).imaj = -100; expect(imajEtki(s)).toBeCloseTo(0.95, 5); gunGit(s, dayOf(s) + 60); expect(Math.abs(B(s).imaj)).toBeLessThanOrEqual(100); expect(B(s).haberler.length).toBeLessThanOrEqual(15);
  });
});
describe('anket ve A/B test', () => {
  it('anket 30 gün kuralı; A/B test iki şube ve geçmiş ister, sonuç hesaplanır, geri alma fiyatları eski haline getirir', () => {
    const s = yeni(7); s.kasa = 5e7; gunGit(s, 20); const b = s.subeler[0]!; expect(anketYap(s, b).ok).toBe(true); expect(anketYap(s, b).ok).toBe(false); expect(A(s).sonuc[b.id]!.oneri.length).toBeGreaterThan(0);
    expect(abBaslat(s, b.id, b.id, 'fiyat10').ok).toBe(false); klon(s, 1); const b2 = s.subeler[1]!; const f0 = b2.menu.latte.fiyat; expect(abBaslat(s, b.id, b2.id, 'fiyat10').ok).toBe(true); expect(b2.menu.latte.fiyat).toBeGreaterThan(f0); expect(abBaslat(s, b.id, b2.id, 'sabah').ok).toBe(false);
    gunGit(s, dayOf(s) + AB_GUN + 1); const ab = A(s).ab!; expect(ab.sonuc?.bitti).toBe(true); expect(Number.isFinite(ab.sonuc!.kar)).toBe(true); expect(abSonuc(s, false).ok).toBe(true); expect(b2.menu.latte.fiyat).toBeCloseTo(f0, 5); expect(A(s).ab).toBeNull();
  });
});
describe('mevzuat', () => {
  it('ruhsat penceresi, gecikme cezası, muhasebeci uyumu, teşvik başvurusu', () => {
    const s = yeni(8), b = s.subeler[0]!; s.kasa = 5e7; expect(ruhsatKalan(s, b)).toBeGreaterThan(300); expect(ruhsatYenile(s, b.id).ok).toBe(false); const u0 = Mv(s).uyum; expect(muhasebeci(s).ok).toBe(true); gunGit(s, dayOf(s) + 30); expect(Mv(s).uyum).toBeGreaterThan(u0);
    Mv(s).ruhsat[b.id] = dayOf(s) + 10; expect(ruhsatYenile(s, b.id).ok).toBe(true); expect(ruhsatBit(s, b)).toBeGreaterThan(dayOf(s) + 300); Mv(s).ruhsat[b.id] = dayOf(s) - 60; const k0 = s.kasa; gunGit(s, dayOf(s) + 40); expect(Mv(s).ceza).toBeGreaterThan(0); expect(s.kasa).not.toBe(k0);
    const t = tesvikBasvur(s, b.id); if (t.ok) { gunGit(s, dayOf(s) + 15); expect(['onay', 'red']).toContain(Mv(s).tesvik[b.id]!.durum); } expect(tesvikBasvur(s, b.id).ok).toBe(false);
  });
});
describe('sürdürülebilirlik', () => {
  it('programlar skoru artırır, sıfır atık için dört program ve 3 şube gerekir, talep çarpanı ve tasarruf', () => {
    const s = yeni(9); s.kasa = 5e7; s.marka_puani = 60; expect(skor(s)).toBe(0); expect(programKur(s, 'sifir').ok).toBe(false); for (const p of ['geri', 'fincan', 'yerel', 'gunes']) expect(programKur(s, p).ok).toBe(true); expect(skor(s)).toBe(80); expect(programKur(s, 'sifir').ok).toBe(false);
    klon(s, 2); expect(programKur(s, 'sifir').ok).toBe(true); expect(Sr(s).sertifika).toBe(true); expect(skor(s)).toBe(100); gunGit(s, dayOf(s) + 15); expect(Sr(s).tasarruf).toBeGreaterThan(0); expect(programKur(s, 'geri').ok).toBe(true); expect(Sr(s).prog.geri).toBe(false);
  });
});
describe('sigorta ve afet', () => {
  it('risk sınırlı, plan/jeneratör, afet sigortayla daha ucuz, kapanış etkisi, geçmiş kaydı', () => {
    const s = yeni(10), b = s.subeler[0]!; s.kasa = 5e7; for (const t of Object.keys(TURLER)) { const r = risk(b.city, t); expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(1.1); } expect(planDegistir(s, b.id, 2).ok).toBe(true); expect(jeneratorAl(s, b.id).ok).toBe(true); expect(jeneratorAl(s, b.id).ok).toBe(false); expect(varlik(s, b)).toBeGreaterThan(0);
    const cost = (plan: number): number => { const t = yeni(10); t.kasa = 5e7; Af(t).plan[t.subeler[0]!.id] = plan; D(t).bag[900] = { olay: 'yangin', emp: t.subeler[0]!.id } as never; t.bekleyen.push({ id: 900, tip: 'd_afet', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }], branch: t.subeler[0]!.id }); const k0 = t.kasa; resolveEvent(t, 900, 0); return k0 - t.kasa; };
    expect(cost(0)).toBeGreaterThan(cost(1)); expect(cost(1)).toBeGreaterThan(cost(2)); const t2 = yeni(10); D(t2).bag[901] = { olay: 'deprem', emp: t2.subeler[0]!.id } as never; t2.bekleyen.push({ id: 901, tip: 'd_afet', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }], branch: t2.subeler[0]!.id }); resolveEvent(t2, 901, 1); expect(Af(t2).gecmis.length).toBe(1); expect(Object.keys(D(t2).etki).some((k) => k.endsWith(':afet'))).toBe(true);
  });
});
describe('denge ve bütünlük', () => {
  it('genel gider tek şubede küçük, şube arttıkça yükselir ve sınırlıdır', () => { const s = yeni(11); const g1 = genelGider(s, 100000); klon(s, 14); const g15 = genelGider(s, 100000); expect(g1).toBeLessThan(2000); expect(g15).toBeGreaterThan(g1 * 3); expect(g15).toBeLessThanOrEqual(500 * s.market.fiyat + 100000 * 0.12 + 1); });
  it('tüm yeni sistemler açıkken 200 günlük bot oyunu: iflas yok, sayılar sonlu', () => {
    const s = yeni(12); s.kasa = 3e7; klon(s, 3); for (const b of s.subeler) { b.staff = JSON.parse(JSON.stringify(s.subeler[0]!.staff)); } K(s).seviye = 1; kuryeAyarla(s, 4); sadKur(s); sadPuan(s, 2); programKur(s, 'geri'); programKur(s, 'fincan'); muhasebeci(s); for (const b of s.subeler) planDegistir(s, b.id, 1);
    oyna(s, 200); expect(s.oyunBitti).toBe(false); expect(Number.isFinite(s.kasa)).toBe(true); expect(Number.isFinite(sirketDegeri(s).deger)).toBe(true); for (const r of s.rapor) expect(Number.isFinite(r.kar)).toBe(true);
  }, 300000);
});

describe('olay işleyicileri zincirde çalışır (resolveEvent üzerinden)', () => {
  it('yatırım teklifi, pazarlık sonrası yeni teklif, mevzuat denetimi, hisse ve baskı olayları', async () => {
    const { Y, teklifUret } = await import('../src/core/yatirim'); const s = yeni(14); s.rapor.push(...Array.from({ length: 40 }, (_, i) => ({ ...(s.rapor[0] ?? { gun: i, gelir: {} as never, gider: {} as never, toplamGelir: 20000, toplamGider: 15000, kar: 5000, musteri: 100, kayip: 5, memnuniyet: 70, cogs: 0, brut: 0, alim: 0, capex: 0, nakit: 0 }), gun: i, toplamGelir: 20000, kar: 5000 })));
    const y = Y(s); const t = teklifUret(s)!; y.teklif = { ...t, pid: 700 }; s.bekleyen.push({ id: 700, tip: 'd_yat', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }, { ad: '', ac: '' }] }); const k0 = s.kasa; resolveEvent(s, 700, 0); expect(s.kasa).toBeGreaterThan(k0); expect(y.ortaklar.length).toBe(1); expect(s.bekleyen.some((p) => p.id === 700)).toBe(false);
    const m = Mv(s); m.uyum = 10; s.bekleyen.push({ id: 701, tip: 'd_mevvergi', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }] }); const k1 = s.kasa; resolveEvent(s, 701, 0); expect(s.kasa).toBeLessThan(k1); expect(m.ceza).toBeGreaterThan(0);
    y.ortaklar[0]!.memnun = 10; D(s).bag[702] = { olay: y.ortaklar[0]!.id } as never; s.bekleyen.push({ id: 702, tip: 'd_yatbaski', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }, { ad: '', ac: '' }] }); const t0 = y.temettu; resolveEvent(s, 702, 0); expect(y.temettu).toBeGreaterThan(t0); expect(y.ortaklar[0]!.memnun).toBeGreaterThan(10);
    s.bekleyen.push({ id: 703, tip: 'd_hikaye_zafer', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }] }); resolveEvent(s, 703, 0); expect(s.bekleyen.length).toBe(0);
  });
});
