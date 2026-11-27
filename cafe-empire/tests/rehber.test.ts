import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/actions';
import { deserialize, serialize } from '../src/core/save';
import { OGR, Og, ogrAtla, ogrDurum, ogrEylem, ogrGorunur, ogrKapat, ogrKontrol, ogrYenidenAc, type OgrUi } from '../src/core/ogretici';
import { YARDIM_KONULARI, YOK_LISTESI } from '../src/data/yardim';
import { zaferMaddeleri } from '../src/core/derin';
import { NAV, GRUPLAR, PANELS, grupOf } from '../src/ui/panels';
import { PAGES } from '../src/ui/pages';
import { PRODUCTS } from '../src/data/catalog';

const yeni = (bos = false) => newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 7, bos } as never).s;
const ui = (tab = 'ana', subeAcik: number | null = null, subeSekme = 'ozet'): OgrUi => ({ tab, subeAcik, subeSekme });

describe('ilk adımlar rehberi', () => {
  it('8 adım; kimlikler benzersiz; her adımın bir tamamlanma yolu var', () => {
    expect(OGR.length).toBe(8); expect(new Set(OGR.map((a) => a.id)).size).toBe(8);
    for (const a of OGR) { expect(a.ad.length).toBeGreaterThan(5); expect(a.ac.length).toBeGreaterThan(20); expect(a.ok || a.eylemler?.length).toBeTruthy(); expect(a.git || a.eylem).toBeTruthy(); }
  });
  it('şubesiz başlangıçta ilk adım "Kafeni kur"; hiçbir şey otomatik tamamlanmaz', () => {
    const s = yeni(true); const o = ogrDurum(s); expect(o.siradaki?.id).toBe('kur'); expect(o.yapilan).toBe(0); expect(ogrKontrol(s, ui(), 0)).toEqual([]); expect(ogrGorunur(s)).toBe(true);
  });
  it('dükkân kurulunca "kur" tamamlanır; "tani" yalnızca dükkân detayı açılınca', () => {
    const s = yeni(false); expect(ogrKontrol(s, ui('ana'), 1)).toEqual(['Kafeni kur']); expect(ogrDurum(s).siradaki?.id).toBe('tani');
    expect(ogrKontrol(s, ui('subeler', null), 1)).toEqual([]); expect(ogrKontrol(s, ui('subeler', s.subeler[0]!.id), 2)).toEqual(['Kafeni tanı']); expect(Og(s).adim.tani).toBe(2);
  });
  it('personel: başlangıç sayısı kaydedilir, sayı artınca tamamlanır; ürün/stok/fiyat eylemle tamamlanır', () => {
    const s = yeni(false); ogrKontrol(s, ui(), 0); const b = s.subeler[0]!; expect(Og(s).baz.personel).toBe(b.staff.length); expect(Og(s).adim.ise).toBeUndefined();
    b.staff.push({ ...b.staff[0]!, id: 9999 }); expect(ogrKontrol(s, ui(), 3)).toContain('Yeni bir çalışan işe al');
    expect(ogrEylem(s, 'urun', 3)).toEqual(['Menüye ürün ekle']); expect(ogrEylem(s, 'siparis', 3)).toEqual(['İlk stok siparişini ver']); expect(ogrEylem(s, 'fiyatTl', 3)).toEqual(['Satış fiyatlarını belirle']);
    expect(ogrEylem(s, 'urun', 4)).toEqual([]);   // ikinci kez ödül/bildirim yok
  });
  it('gelir ve memnuniyet sayfaları açılınca tamamlanır; hepsi bitince rehber kendiliğinden kapanır', () => {
    const s = yeni(false); ogrKontrol(s, ui('ana'), 0); for (const e of ['hire', 'urun', 'siparis', 'fiyat']) ogrEylem(s, e, 1); Og(s).baz.personel = 0;
    ogrKontrol(s, ui('subeler', s.subeler[0]!.id), 1); expect(ogrGorunur(s)).toBe(true); ogrKontrol(s, ui('finans'), 2); ogrKontrol(s, ui('musteri'), 3);
    expect(ogrDurum(s).yapilan).toBe(8); expect(Og(s).bitti).toBe(true); expect(ogrGorunur(s)).toBe(false);
  });
  it('atla, kapat ve yeniden aç', () => {
    const s = yeni(true); ogrAtla(s); expect(ogrDurum(s).siradaki?.id).toBe('tani'); expect(ogrDurum(s).atlanan).toBe(1);
    ogrKapat(s); expect(ogrGorunur(s)).toBe(false); ogrYenidenAc(s); expect(ogrGorunur(s)).toBe(true); expect(ogrDurum(s).siradaki?.id).toBe('kur');
  });
  it('ilerleme kayda yazılır; eski kayıtta (rehber alanı yok) sorunsuz açılır', () => {
    const s = yeni(false); ogrKontrol(s, ui(), 5); ogrEylem(s, 'urun', 5); const g = deserialize(serialize(s)); expect(Og(g).adim).toEqual(Og(s).adim);
    const eski = JSON.parse(serialize(yeni(false))); delete eski.derin.ogr; const e = deserialize(JSON.stringify(eski)); expect(ogrDurum(e).yapilan).toBe(0); expect(ogrGorunur(e)).toBe(true);
  });
});

describe('oyun rehberi (?) içeriği', () => {
  it('15 başlık + "Oyunda olmayanlar"; kimlikler benzersiz; her başlıkta özet ve en az 3 madde', () => {
    expect(YARDIM_KONULARI.length).toBe(15); expect(new Set(YARDIM_KONULARI.map((k) => k.id)).size).toBe(15);
    for (const k of YARDIM_KONULARI) { expect(k.ad.length).toBeGreaterThan(5); expect(k.ozet.length).toBeGreaterThan(20); expect(k.maddeler.length).toBeGreaterThanOrEqual(3); for (const m of k.maddeler) { expect(m.length).toBeGreaterThan(20); expect(m).not.toMatch(/NaN|undefined|\[object|Infinity/); } }
    expect(YOK_LISTESI.length).toBeGreaterThanOrEqual(3);
  });
  it('"Git" hedefleri gerçek sayfalardır ve bir menü grubunda bulunur', () => {
    const tum = { ...PANELS, ...PAGES }; const nav = new Set(NAV.map((n) => n[0]));
    for (const k of YARDIM_KONULARI) if (k.git) { expect(nav.has(k.git[0])).toBe(true); expect(tum[k.git[0]]).toBeTypeOf('function'); expect(GRUPLAR.some((g) => g.tabs.includes(k.git![0]))).toBe(true); }
    for (const a of OGR) if (a.git) { expect(nav.has(a.git)).toBe(true); expect(GRUPLAR.some((g) => g.tabs.includes(a.git!))).toBe(true); }
  });
  it('sayılar koddaki gerçeklerle uyumlu (ürün sayısı, kahve/yiyecek, zafer hedefleri)', () => {
    const menu = YARDIM_KONULARI.find((k) => k.id === 'menu')!.maddeler.join(' '); const kahve = PRODUCTS.filter((p) => p.kat === 'kahve').length;
    expect(menu).toContain(`${PRODUCTS.length} ürün`); expect(menu).toContain(`${kahve} kahve`); expect(menu).toContain(`${PRODUCTS.length - kahve} yiyecek`);
    const h = Object.fromEntries(zaferMaddeleri(yeni(false)).map((m) => [m.ad, m.h])); const amac = YARDIM_KONULARI[0]!.maddeler[0]!;
    expect(h['Şube sayısı']).toBe(20); expect(h['Açık il']).toBe(8); expect(h['Marka itibarı']).toBe(85); expect(h['Kasa']).toBe(20e6); expect(h['Franchise bayi']).toBe(3);
    expect(amac).toContain('20 şube'); expect(amac).toContain('8 ilde'); expect(amac).toContain('85 marka puanı'); expect(amac).toContain('20 milyon'); expect(amac).toContain('3 franchise');
  });
});

describe('menü gruplaması', () => {
  it('dükkân detayı sayfaları (menü, personel, vardiya, ekipman) Dükkânlar grubuna bağlı sayılır; Müşteriler Dükkânlar\'da', () => {
    for (const t of ['menu', 'personel', 'vardiya', 'gelisim']) expect(grupOf(t).id).toBe('subeler');
    expect(grupOf('musteri').id).toBe('subeler'); expect(grupOf('finans').id).toBe('kasa'); expect(grupOf('ana').id).toBe('ana');
  });
});
