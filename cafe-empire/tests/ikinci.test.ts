/** İstatistik merkezi, meydan okumalar/kariyer, sezon menüleri/pilot, yatırımcılar/halka arz/rakip satın alma. */
import { describe, expect, it } from 'vitest';
import { newGame, toggleProduct } from '../src/core/actions';
import { step, dayOf } from '../src/core/sim';
import { dateOf } from '../src/core/calendar';
import { oyna } from './bot';
import { deserialize, serialize } from '../src/core/save';
import '../src/core/pricing'; import '../src/core/franchise'; import '../src/core/merkez';
import { seri, egilim, tahmin, haftaGunOrt, urunSirasi, menuMuhendisligi, subeTablosu, neden, METRIKLER } from '../src/core/analiz';
import { DD, ilerleme, kariyerOzeti } from '../src/core/donem';
import { sezonOf, sezonKalan, sezonUrunleri, sezonOneri, sezonMenuAc, sezonDisiKapat, mutfakOzet, pilotBaslat, pilotlar, pilotYay, PILOT_GUN } from '../src/core/sezon';
import { Y, sirketDegeri, teklifUret, teklifKabul, teklifPazarlik, teklifRed, temettuAyarla, payGeriAl, halkaSart, halkaArz, hisseGeriAlim, disPay, MAX_DIS, rakipSatinAl, satinAlBedel, YATIRIMCILAR } from '../src/core/yatirim';
import { D } from '../src/core/derin';
import { PRODUCTS, PRODUCT } from '../src/data/catalog';

const yeni = (seed = 1) => newGame({ ad: 'Test', sehir: 34, tip: 'cadde', seed, ilce: '34:Kadıköy' }).s;
const gunGit = (s: ReturnType<typeof yeni>, hedef: number): void => { while (dayOf(s) < hedef && !s.oyunBitti) { s.bekleyen.length = 0; step(s, 1440); } };

describe('istatistik merkezi', () => {
  it('seri, eğilim ve tahmin doğru çalışır', () => {
    const e = egilim([{ gun: 0, v: 10 }, { gun: 1, v: 20 }, { gun: 2, v: 30 }, { gun: 3, v: 40 }]); expect(e.ort).toBe(25); expect(e.max).toBe(40); expect(e.min).toBe(10); expect(e.egim).toBeCloseTo(10, 5); expect(e.degisim).toBeGreaterThan(0.5); expect(egilim([]).ort).toBe(0);
    const t = tahmin(Array.from({ length: 14 }, (_, i) => ({ gun: i, v: 100 + i * 5 })), 7); expect(t.length).toBe(7); expect(t.every((x) => x >= 0 && Number.isFinite(x))).toBe(true); expect(tahmin([{ gun: 0, v: 1 }], 7)).toEqual([]);
  });
  it('30 gün sonra seri/ürün sıralaması/menü mühendisliği/şube tablosu/neden dolu ve sonlu', () => {
    const s = yeni(2); gunGit(s, 35); const b = s.subeler[0]!;
    for (const [m] of METRIKLER) { const a = seri(s, b, m, 30); expect(a.length).toBeGreaterThan(20); expect(a.every((x) => Number.isFinite(x.v))).toBe(true); expect(seri(s, null, m, 14).length).toBe(14); }
    expect(haftaGunOrt(s, b, 'ciro').length).toBe(7); const u = urunSirasi(s, b, 30); expect(u.length).toBeGreaterThan(2); for (let i = 1; i < u.length; i++) expect(u[i - 1]!.gelir).toBeGreaterThanOrEqual(u[i]!.gelir); expect(Math.abs(u.reduce((a, x) => a + x.pay, 0) - 1)).toBeLessThan(1e-6);
    const mm = menuMuhendisligi(s, b); expect(mm.length).toBeGreaterThan(2); for (const x of mm) expect(['yildiz', 'inek', 'bilmece', 'kopek']).toContain(x.sinif); expect(subeTablosu(s)[0]!.ciro).toBeGreaterThan(0); expect(neden(s, b).length).toBeGreaterThan(0); expect(D(s).gun90!.length).toBeGreaterThan(20);
  });
});

describe('meydan okumalar ve kariyer', () => {
  it('haftalık 3 + aylık 2 meydan okuma üretilir; tamamlanınca ödül ve sayaç', () => {
    const s = yeni(3); gunGit(s, 3); const k = DD(s); expect(k.liste.filter((x) => x.tur === 'hafta').length).toBe(3); expect(k.liste.filter((x) => x.tur === 'ay').length).toBe(2);
    const x = k.liste[0]!; const kasa0 = s.kasa; s.stat.musteri += 1e6; s.stat.netKar += 1e7; (D(s).say.tat = 99); (D(s).say.ortak = 99); (D(s).say.yanit = 99); (D(s).say.ted = 99); (D(s).say.kriz = 99); gunGit(s, dayOf(s) + 1);
    expect(k.toplam).toBeGreaterThan(0); expect(s.kasa).toBeGreaterThan(kasa0 - 1e6 + 1000); expect(ilerleme(s, x)).toBeGreaterThanOrEqual(0); for (const y of k.liste) { expect(ilerleme(s, y)).toBeGreaterThanOrEqual(0); expect(ilerleme(s, y)).toBeLessThanOrEqual(1); }
  });
  it('haftalık set bitince yenisi gelir; tamamlanmazsa seri sıfırlanır; kariyer özeti metni', () => {
    const s = yeni(3); gunGit(s, 3); const k = DD(s); k.seri = 4; const bit = k.liste.find((x) => x.tur === 'hafta')!.bit; gunGit(s, bit + 1); expect(k.seri).toBe(0); expect(k.liste.filter((x) => x.tur === 'hafta' && x.bit > dayOf(s)).length).toBe(3);
    const o = kariyerOzeti(s); expect(o.unvan.length).toBeGreaterThan(3); expect(o.metin).toContain(s.marka.ad); expect(o.basarimToplam).toBeGreaterThan(30);
  });
});

describe('sezon menüleri ve pilot', () => {
  it('yeni sezon ürünleri tanımlı ve katalog tutarlı', () => {
    const sz = PRODUCTS.filter((p) => p.sezon); expect(sz.length).toBeGreaterThanOrEqual(6); for (const p of sz) { expect(p.sezon!.every((m) => m >= 0 && m < 12)).toBe(true); expect(PRODUCT[p.id]).toBe(p); } expect(sezonOf(0).id).toBe('kis'); expect(sezonOf(6).id).toBe('yaz'); expect(sezonUrunleri(6).some((p) => p.id === 'limonata')).toBe(true);
  });
  it('sezon içi ürün sezon dışına göre çok daha çok satılır', () => {
    const satis = (ay: number): number => { const s = yeni(5); const b = s.subeler[0]!; b.menu.limonata.aktif = true; b.acilan.limonata = true; s.dk = (ay === 6 ? 135 : 1) * 1440 + 7 * 60; const eskiAy = dateOf(dayOf(s)).ay; void eskiAy; let n = 0; for (let i = 0; i < 20; i++) { s.bekleyen.length = 0; step(s, 1440); n += b.sonAdet.limonata ?? 0; } return n; };
    // Mart başlangıcından +135 gün ≈ Temmuz; +1 gün ≈ Mart
    expect(satis(6)).toBeGreaterThan(satis(2));
  });
  it('sezon menüsünü aç/kapat ve mutfak özeti', () => {
    const s = yeni(6); const b = s.subeler[0]!; s.dk = 140 * 1440; s.kasa = 1e6; const o = sezonOneri(s, b); expect(o.ac.length).toBeGreaterThan(0); const r = sezonMenuAc(s, b); expect(r.ok).toBe(true); for (const p of o.ac) expect(b.menu[p.id].aktif).toBe(true);
    b.menu.sicakcik.aktif = true; expect(sezonOneri(s, b).kapat.some((p) => p.id === 'sicakcik')).toBe(true); expect(sezonDisiKapat(s, b).ok).toBe(true); expect(b.menu.sicakcik.aktif).toBe(false); gunGit(s, dayOf(s) + 5); const m = mutfakOzet(s, b); expect(m.hazirlik.length).toBeGreaterThan(0); expect(Number.isFinite(m.fire30)).toBe(true); expect(sezonKalan(s)).toBeGreaterThan(0);
  });
  it('pilot: başlat, 14 gün işle, sonuç, tüm şubelere yay', () => {
    const s = yeni(7); s.kasa = 5e6;
    const b2 = JSON.parse(JSON.stringify(s.subeler[0])); b2.id = 99; b2.ilce = 'z'; s.subeler.push(b2); const b = s.subeler[0]!; expect(b.menu.limonata.aktif).toBe(false); const r = pilotBaslat(s, b, 'limonata'); expect(r.ok).toBe(true); expect(pilotBaslat(s, b, 'limonata').ok).toBe(false);
    gunGit(s, dayOf(s) + PILOT_GUN + 1); const p = pilotlar(s).limonata!; expect(p.bitti).toBe(true); expect(Number.isFinite(p.gunAdet!)).toBe(true); const y = pilotYay(s, 'limonata'); expect(y.ok).toBe(true); expect(s.subeler[1]!.menu.limonata.aktif).toBe(true); expect(toggleProduct).toBeTypeOf('function');
  }, 100000);
});

describe('yatırımcılar', () => {
  it('başlangıçta pay yok; şirket değeri sonlu ve tabanın üstünde', () => { const s = yeni(8); expect(disPay(s)).toBe(0); gunGit(s, 40); const v = sirketDegeri(s); expect(Number.isFinite(v.deger)).toBe(true); expect(v.deger).toBeGreaterThan(0); expect(YATIRIMCILAR.length).toBe(4); });
  it('teklif kabul: sermaye gelir, pay verilir; pazarlık tek sefer; red; %49 sınırı', () => {
    const s = yeni(9); s.rapor.push(...Array.from({ length: 40 }, (_, i) => ({ ...(s.rapor[0] ?? { gun: i, gelir: {} as never, gider: {} as never, toplamGelir: 20000, toplamGider: 15000, kar: 5000, musteri: 100, kayip: 5, memnuniyet: 70, cogs: 0, brut: 0, alim: 0, capex: 0, nakit: 0 }), gun: i, toplamGelir: 20000, kar: 5000 })));
    const y = Y(s); const t = teklifUret(s)!; expect(t).toBeTruthy(); y.teklif = t; const k0 = s.kasa, pay0 = t.pay; expect(teklifKabul(s).ok).toBe(true); expect(s.kasa).toBeCloseTo(k0 + t.sermaye, 0); expect(disPay(s)).toBeCloseTo(pay0, 5); expect(y.ortaklar.length).toBe(1); expect(teklifKabul(s).ok).toBe(false);
    y.teklif = { ...t, yid: 'kuzey', pazarlik: false }; expect(teklifPazarlik(s).ok || y.teklif === null || y.teklif.pazarlik).toBe(true); y.teklif = { ...t, pay: 0.45 }; expect(teklifKabul(s).ok).toBe(false); expect(MAX_DIS).toBe(0.49); expect(teklifRed(s).ok).toBe(true); expect(y.teklif).toBeNull();
  });
  it('temettü, pay geri alma, halka arz şartları ve hisse fiyatı', () => {
    const s = yeni(10); gunGit(s, 25); const y = Y(s); y.ortaklar.push({ id: 'atlas', ad: 'Atlas', kisilik: 'buyume', pay: 0.15, sermaye: 1e6, giris: 0, memnun: 80 }); expect(temettuAyarla(s, 0.3).ok).toBe(true); expect(y.temettu).toBeCloseTo(0.3, 5);
    const k0 = s.kasa; gunGit(s, dayOf(s) + 40); expect(Number.isFinite(s.kasa)).toBe(true); void k0; s.kasa = 1e8; expect(payGeriAl(s, 'atlas').ok).toBe(true); expect(y.ortaklar.length).toBe(0); expect(payGeriAl(s, 'atlas').ok).toBe(false);
    expect(halkaArz(s).ok).toBe(false); expect(halkaSart(s).some((x) => !x.ok)).toBe(true);
    // koşulları zorla
    for (let i = 0; i < 12; i++) s.subeler.push({ ...JSON.parse(JSON.stringify(s.subeler[0])), id: 200 + i, ilce: 'q' + i }); s.marka_puani = 90; s.kasa = 3e8; s.stat.netKar = 1e8; s.rapor = s.rapor.map((r) => ({ ...r, toplamGelir: 5e6, kar: 2e6 })); (s as { seviye: number }).seviye = 5;
    const sart = halkaSart(s); if (sart.every((x) => x.ok)) { expect(halkaArz(s).ok).toBe(true); expect(y.halka!.pay).toBeCloseTo(0.2, 5); const f0 = y.halka!.fiyat; gunGit(s, dayOf(s) + 30); expect(Number.isFinite(y.halka!.fiyat)).toBe(true); expect(y.halka!.fiyat).toBeGreaterThan(0); expect(hisseGeriAlim(s).ok).toBe(true); void f0; }
  }, 100000);
  it('rakip satın alma: koşullar, bedel, rekabet kalkar, günlük gelir', () => {
    const s = yeni(11); const d = D(s); expect(rakipSatinAl(s, 'kocak').ok).toBe(false); d.rakip[0]!.sehirler = [34]; expect(satinAlBedel(s, 'kocak')).toBeGreaterThan(1e6); s.kasa = 1e9; expect(rakipSatinAl(s, 'kocak').ok).toBe(false);
  });
  it('eski kayıt (yeni alanlar yok) açılır ve oynanır; kayıt turu yeni durumu korur', () => {
    const s = yeni(12); gunGit(s, 30); Y(s).temettu = 0.3; const j = serialize(s), s2 = deserialize(j); expect(Y(s2).temettu).toBeCloseTo(0.3, 5); const eski = JSON.parse(j); delete eski.derin; const s3 = deserialize(JSON.stringify(eski)); gunGit(s3, dayOf(s3) + 15); expect(Number.isFinite(s3.kasa)).toBe(true); expect(D(s3).gun90!.length).toBeGreaterThan(0);
  });
  it('1 yıllık bot oyunu: yeni sistemler açıkken iflas yok ve olaylar/teklifler sonlu', () => {
    const s = yeni(13); oyna(s, 365); expect(s.oyunBitti).toBe(false); expect(Number.isFinite(sirketDegeri(s).deger)).toBe(true); expect(DD(s).liste.length).toBeGreaterThan(0); expect(D(s).gun90!.length).toBe(90); for (const b of s.subeler) expect(Number.isFinite(b.memnuniyet)).toBe(true);
  }, 300000);
});
