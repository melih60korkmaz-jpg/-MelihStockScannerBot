/** Derin sistemler: çekirdek/kavurma, tarif lab, barista, müdavim, semt olayları, esnaf, krizler, sözleşme, fuar, hikâye, rakipler. */
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/actions';
import { step, dayOf, resolveEvent } from '../src/core/sim';
import { dateOf } from '../src/core/calendar';
import { oyna } from './bot';
import { serialize, deserialize } from '../src/core/save';
import '../src/core/pricing'; import '../src/core/franchise'; import '../src/core/merkez';
import { D, CEKIRDEKLER, harman, cekirdekAyarla, tarifOlustur, tarifTat, tarifImza, tarifTahmin, gercekBegeni, ustaOf, ustaYetenek, ustaSeviye, ustaPuan, sampiyonaKatil, semtOlaylari, semtCarpan, takvim, esnafOf, esnafZiyaret, ortakKampanya, esnafIliski, karakterOf, fuarDurum, fuarKayit, kimlik, musteriTipleri, casusluk, yenile, OLAYLAR, h32 } from '../src/core/derin';
import { franchiseVer } from '../src/core/franchise';
import { SOZLESME } from '../src/core/derin';

const yeni = (seed = 1) => newGame({ ad: 'Test', sehir: 34, tip: 'cadde', seed, ilce: '34:Kadıköy' }).s;
const gunGit = (s: ReturnType<typeof yeni>, hedef: number): void => { while (dayOf(s) < hedef && !s.oyunBitti) { s.bekleyen.length = 0; step(s, 1440); } };

describe('çekirdek ve kavurma', () => {
  it('harman kalite/maliyet hesabı: etiyopya pahalı ve kaliteli, robusta ucuz ve zayıf', () => {
    const s = yeni(); const base = harman(s); cekirdekAyarla(s, { ana: 'etiyopya' }); const et = harman(s);
    expect(et.kal).toBeGreaterThan(base.kal * 0.95); expect(et.mal).toBeGreaterThan(1.1);
    s.derin!.cek.gecis = 0; cekirdekAyarla(s, { ana: 'robusta' }); s.derin!.cek.gecis = 0; const ro = harman(s); expect(ro.kal).toBeLessThan(1); expect(ro.mal).toBeLessThan(0.9);
  });
  it('uyumlu harman bonus verir; çatışan harman ceza', () => {
    const s = yeni(); cekirdekAyarla(s, { ana: 'brezilya', ikinci: 'etiyopya', oran: 0.3 }); s.derin!.cek.gecis = 0; const a = harman(s).uyum;
    cekirdekAyarla(s, { ana: 'etiyopya', ikinci: 'guatemala', oran: 0.3 }); s.derin!.cek.gecis = 0; const b = harman(s).uyum; expect(a).toBeGreaterThan(0); expect(b).toBeLessThan(0);
  });
  it('değişiklik para ve 3 günlük geçiş maliyeti getirir; kasa yetmezse reddeder', () => {
    const s = yeni(); const k0 = s.kasa; const r = cekirdekAyarla(s, { ana: 'kolombiya' }); expect(r.ok).toBe(true); expect(s.kasa).toBeLessThan(k0); expect(s.derin!.cek.gecis).toBe(3);
    s.kasa = 10; expect(cekirdekAyarla(s, { ana: 'guatemala' }).ok).toBe(false);
  });
  it('kaliteli çekirdek memnuniyeti artırır, kasayı ödenen maliyetle azaltır (günlük raporlar sonlu)', () => {
    const a = yeni(3), b = yeni(3); cekirdekAyarla(b, { ana: 'etiyopya', kavurma: 0 }); gunGit(a, 30); gunGit(b, 30);
    expect(b.derin!.kalB[b.subeler[0]!.id]!).toBeGreaterThan(a.derin!.kalB[a.subeler[0]!.id]!); expect(b.subeler[0]!.memnuniyet).toBeGreaterThanOrEqual(a.subeler[0]!.memnuniyet - 4); for (const r of b.rapor) expect(Number.isFinite(r.kar)).toBe(true); expect(CEKIRDEKLER.length).toBe(5);
  });
});

describe('tarif laboratuvarı', () => {
  it('beğeni deterministik; kurallar çalışır (soğuk+karamel > sıcak+karamel+çikolata)', () => {
    const iyi = gercekBegeni(1, { sut: 1, sup: 2, sos: 0, soguk: true, shot: 1 }), kotu = gercekBegeni(1, { sut: 0, sup: 2, sos: 1, soguk: false, shot: 1 });
    expect(iyi).toBe(gercekBegeni(1, { sut: 1, sup: 2, sos: 0, soguk: true, shot: 1 })); expect(iyi).toBeGreaterThan(kotu); expect(iyi).toBeLessThanOrEqual(98);
  });
  it('tarif oluştur, tattır (belirsizlik azalır), imza yap; sınırlar uygulanır', () => {
    const s = yeni(); const r = tarifOlustur(s, 'Bahar Latte', { sut: 2, sup: 1, sos: 0, soguk: false, shot: 1 }); expect(r.ok).toBe(true); const t = s.derin!.tarif[0]!;
    expect(tarifImza(s, t.id).ok).toBe(false); const p0 = tarifTahmin(s, t).pay; tarifTat(s, t.id); tarifTat(s, t.id); tarifTat(s, t.id); expect(tarifTahmin(s, t).pay).toBeLessThan(p0); expect(tarifImza(s, t.id).ok).toBe(true); expect(s.derin!.imza).toBe(t.id);
    for (let i = 0; i < 8; i++) tarifOlustur(s, 'x' + i, { sut: 0, sup: 0, sos: 0, soguk: false, shot: 1 }); expect(s.derin!.tarif.length).toBe(6);
  });
  it('imza içecek satış ve gelir getirir', () => {
    const s = yeni(2); tarifOlustur(s, 'Hit', { sut: 1, sup: 2, sos: 0, soguk: true, shot: 1 }); const t = s.derin!.tarif[0]!; t.begeni = 90; t.test = 2; tarifImza(s, t.id); gunGit(s, 40); expect(t.satis).toBeGreaterThan(20); expect(t.gelir).toBeGreaterThan(0);
  });
});

describe('barista ustalığı ve şampiyona', () => {
  it('deneyim kazanılır, puan harcanır, sınır korunur', () => {
    const s = yeni(); gunGit(s, 70); const e = s.subeler[0]!.staff.find((x) => x.tip === 'barista')!; const u = ustaOf(s, e); expect(u.xp).toBeGreaterThan(30); expect(ustaSeviye(u)).toBeGreaterThanOrEqual(2); expect(ustaPuan(u)).toBeGreaterThan(0);
    expect(ustaYetenek(s, e.id, 'art').ok).toBe(true); expect(u.art).toBe(1); for (let i = 0; i < 20; i++) ustaYetenek(s, e.id, 'art'); expect(u.art).toBeLessThanOrEqual(5); expect(ustaPuan(u)).toBeGreaterThanOrEqual(0);
  });
  it('şampiyona yalnızca Ekim ayında, yılda bir kez', () => {
    const s = yeni(); gunGit(s, 5); const e = s.subeler[0]!.staff.find((x) => x.tip === 'barista')!; expect(sampiyonaKatil(s, e.id).ok).toBe(false);
    let g = dayOf(s); while (dateOf(g).ay !== 9) g++; gunGit(s, g); s.kasa = 1e6; const bb = s.subeler[0]!; if (!bb.staff.some((x) => x.tip === 'barista')) bb.staff.push({ ...e, id: 777, tip: 'barista' }); const e2 = bb.staff.find((x) => x.tip === 'barista')!; const r = sampiyonaKatil(s, e2.id); expect(r.ok).toBe(true); expect(s.derin!.sam.length).toBe(1); expect(sampiyonaKatil(s, e2.id).ok).toBe(false);
  });
});

describe('müdavimler ve müşteri tipleri', () => {
  it('memnun müşteriden müdavim doğar, bağ ve gelir oluşur', () => {
    const s = yeni(4); gunGit(s, 120); const l = s.derin!.mud[s.subeler[0]!.id] ?? []; expect(l.length).toBeGreaterThan(0); for (const m of l) { expect(m.bag).toBeGreaterThanOrEqual(0); expect(m.bag).toBeLessThanOrEqual(100); }
  });
  it('favori ürünü kaldırınca bağ düşer ve müdavim gider', () => {
    const s = yeni(4); gunGit(s, 100); const b = s.subeler[0]!, l = s.derin!.mud[b.id]!; if (!l.length) return; const m = l[0]!; const ad = m.ad; b.menu[m.urun].aktif = false; gunGit(s, dayOf(s) + 40); expect(s.derin!.mud[b.id]!.find((x) => x.ad === ad && x.urun === m.urun)).toBeUndefined();
  });
  it('müşteri tipleri toplam 1; en büyük pay sırada ilk', () => { const s = yeni(); const t = musteriTipleri(s.subeler[0]!); expect(t.reduce((a, x) => a + x.pay, 0)).toBeCloseTo(1, 5); expect(t[0]!.pay).toBeGreaterThanOrEqual(t[1]!.pay); });
});

describe('semt olayları', () => {
  it('bayram, sınav, sevgililer günü deterministik ve çarpan sınırlı', () => {
    const s = yeni(); const b = s.subeler[0]!; let bay = 0, sin = 0, sev = 0; for (let g = 0; g < 800; g++) for (const e of semtOlaylari(s, b, g)) { if (e.id === 'bayram') bay++; if (e.id === 'sinav') sin++; if (e.id === 'sevgili') sev++; expect(e.talep).toBeGreaterThan(0.6); expect(e.talep).toBeLessThan(1.6); }
    expect(bay).toBeGreaterThanOrEqual(10); expect(sin).toBeGreaterThan(30); expect(sev).toBeGreaterThanOrEqual(2); expect(semtCarpan(s, b, 8)).toBe(semtCarpan(s, b, 8)); expect(takvim(s, b, 10).length).toBe(10);
  });
  it('hazırlık seçimi etkiyi büyütür / hafifletir', () => {
    const s = yeni(); const b = s.subeler[0]!; const gun = 8; const e = semtOlaylari(s, b, gun).find((x) => x.id === 'bayram')!; expect(e).toBeTruthy(); const once = semtCarpan(s, b, gun); s.derin!.hazir[`${b.id}:bayram:${e.baslangic}`] = 1; const sonra = semtCarpan(s, b, gun); if (e.talep >= 1) expect(sonra).toBeGreaterThan(once); else expect(sonra).toBeGreaterThan(once);
  });
});

describe('komşu esnaf', () => {
  it('ziyaret ilişkiyi artırır; ortak kampanya ilişki ister ve talebi artırır', () => {
    const s = yeni(); const b = s.subeler[0]!, e = esnafOf(s, b)[0]!; expect(esnafOf(s, b).length).toBe(4); expect(ortakKampanya(s, b, e.id).ok).toBe(false);
    for (let i = 0; i < 4; i++) { s.derin!.son[`z${b.id}${e.id}`] = -99; expect(esnafZiyaret(s, b, e.id).ok).toBe(true); } expect(esnafIliski(s, b, e.id)).toBeGreaterThanOrEqual(40);
    yenile(s); const k0 = s.derin!.talepB[b.id]!; expect(ortakKampanya(s, b, e.id).ok).toBe(true); expect(s.derin!.talepB[b.id]!).toBeGreaterThan(k0); expect(ortakKampanya(s, b, e.id).ok).toBe(false);
  });
});

describe('krizler, personel olayları ve sözleşmeler', () => {
  it('her olay tanımının tüm seçenekleri çökmeden çalışır ve sonlu sonuç verir', () => {
    for (const o of OLAYLAR) for (let i = 0; i < o.opt.length; i++) {
      const s = yeni(5); gunGit(s, 3); const b = s.subeler[0]!; const emp = b.staff[0]!; s.derin!.bag[900] = { emp: emp.id, zin: 'Koçak', olay: 'bayram', baslangic: 8, fiyat: 3000 };
      s.bekleyen.push({ id: 900, tip: 'd_' + o.id, baslik: o.ad, metin: '', ikon: o.ik, secenek: o.opt.map((x) => ({ ad: x.ad, ac: x.ac })), branch: b.id }); const m = resolveEvent(s, 900, i); expect(typeof m).toBe('string'); expect(s.bekleyen.length).toBe(0); expect(Number.isFinite(s.kasa)).toBe(true); expect(b.hijyen).toBeGreaterThanOrEqual(0); expect(b.marka).toBeLessThanOrEqual(100);
    }
  });
  it('gıda denetimi: kötü hijyen kapatır, iyi hijyen ödüllendirir', () => {
    const s = yeni(); const b = s.subeler[0]!; b.hijyen = 20; s.bekleyen.push({ id: 901, tip: 'd_denetim', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }], branch: b.id }); const k = s.kasa; resolveEvent(s, 901, 1); expect(s.kasa).toBeLessThan(k); expect(Object.keys(s.derin!.etki).some((x) => x.endsWith(':talep'))).toBe(true);
    const t = yeni(); const c = t.subeler[0]!; c.hijyen = 95; const mk = c.marka; t.bekleyen.push({ id: 902, tip: 'd_denetim', baslik: '', metin: '', ikon: '', secenek: [{ ad: '', ac: '' }, { ad: '', ac: '' }], branch: c.id }); resolveEvent(t, 902, 1); expect(c.marka).toBeGreaterThan(mk);
  });
  it('personel karakterleri atanır ve sabit kalır', () => { const s = yeni(); const e = s.subeler[0]!.staff[0]!; const a = karakterOf(s, e).id; expect(karakterOf(s, e).id).toBe(a); });
  it('franchise sözleşmeleri: premium giriş pahalı/royalty düşük, esnek tersi', () => {
    expect(SOZLESME.premium.giris).toBeGreaterThan(SOZLESME.standart.giris); expect(SOZLESME.premium.royalty).toBeLessThan(SOZLESME.standart.royalty); expect(SOZLESME.esnek.royalty).toBeGreaterThan(SOZLESME.standart.royalty);
    const s = yeni(); void franchiseVer; void s;
  });
});

describe('fuar, hikâye, rakipler, kayıt', () => {
  it('fuar dönemleri ve kayıt kuralları', () => {
    const s = yeni(); let g = 0; while (fuarDurum({ ...s, dk: g * 1440 } as typeof s).asama !== 'kayit') g++; gunGit(s, g); s.kasa = 1e6; expect(fuarKayit(s, 'tarif', 1).ok).toBe(false); const r = fuarKayit(s, 'harman', 0); expect(r.ok).toBe(true); expect(fuarKayit(s, 'harman', 0).ok).toBe(false);
    let f = dayOf(s); while (dateOf(f).ay !== 3 || dateOf(f).ayGun !== 13) f++; gunGit(s, f); expect(s.derin!.fuar.gecmis.length).toBe(1); expect(s.derin!.fuar.kayit).toBeNull();
  });
  it('dükkân kimliği ve dönüm noktaları günlüğe yazılır', () => { const s = yeni(); gunGit(s, 60); expect(kimlik(s, s.subeler[0]!).ad.length).toBeGreaterThan(3); expect((s.derin!.hik[s.subeler[0]!.id] ?? []).length).toBeGreaterThan(0); });
  it('rakip zincirler şehirlere girer ve casusluk çalışır', () => { const s = yeni(6); gunGit(s, 300); expect(s.derin!.rakip.some((r) => r.sehirler.length > 0)).toBe(true); const r = s.derin!.rakip[0]!; s.kasa = 1e6; expect(casusluk(s, r.id).ok).toBe(true); expect(r.casus).toBe(dayOf(s)); });
  it('kayıt/yükleme derin durumu korur; eski kayıt (derin yok) sorunsuz açılır', () => {
    const s = yeni(7); gunGit(s, 50); tarifOlustur(s, 'A', { sut: 0, sup: 0, sos: 0, soguk: false, shot: 1 }); const j = serialize(s), s2 = deserialize(j); expect(s2.derin!.tarif.length).toBe(1);
    const eski = JSON.parse(j); delete eski.derin; const s3 = deserialize(JSON.stringify(eski)); gunGit(s3, dayOf(s3) + 20); expect(s3.derin).toBeTruthy(); expect(Number.isFinite(s3.kasa)).toBe(true); expect(h32(1, 2)).toBe(h32(1, 2));
  });
  it('1 yıllık bot oyunu: derin sistemler açıkken iflas yok, sonlu sayılar, olaylar ve günlük dolu', () => {
    const s = yeni(8); tarifOlustur(s, 'İmza', { sut: 1, sup: 2, sos: 0, soguk: true, shot: 1 }); const t = s.derin!.tarif[0]!; t.test = 3; tarifImza(s, t.id); cekirdekAyarla(s, { ana: 'kolombiya', ikinci: 'brezilya', oran: 0.3 });
    oyna(s, 365); expect(s.oyunBitti).toBe(false); expect(s.kasa).toBeGreaterThan(0); for (const b of s.subeler) { expect(Number.isFinite(b.memnuniyet)).toBe(true); expect(Number.isFinite(s.derin!.talepB[b.id]!)).toBe(true); expect(s.derin!.talepB[b.id]!).toBeGreaterThan(0.2); expect(s.derin!.talepB[b.id]!).toBeLessThan(3); }
    expect(t.satis).toBeGreaterThan(100); expect(Object.keys(s.derin!.hik).length).toBeGreaterThan(0); expect(s.stat.netKar).toBeGreaterThan(0);
  }, 300000);
});
