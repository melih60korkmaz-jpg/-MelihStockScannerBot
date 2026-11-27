/** Kademeli açılma, sıradaki adım/yol haritası, karar defteri. */
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/actions';
import { step, dayOf } from '../src/core/sim';
import '../src/core/pricing'; import '../src/core/franchise'; import '../src/core/merkez';
import { grupAcik, tabAcik, acikListe, kilitliListe, kilitNedeni, GRUP_KURAL, TAB_KURAL } from '../src/core/kademe';
import { oneriler, YOL, Yl, yolKontrol, yolDurum } from '../src/core/rehber';
import { Kd, kararKaydet, KARAR_GUN, snap } from '../src/core/karar';
import { GRUPLAR, NAV } from '../src/ui/panels';
import { gorunurGruplar } from '../src/ui/yonet';
import { deserialize, serialize } from '../src/core/save';

const yeni = (seed = 1) => newGame({ ad: 'Test', sehir: 34, tip: 'cadde', seed, ilce: '34:Kadıköy' }).s;
const bos = (seed = 1) => newGame({ ad: 'Test', sehir: 34, tip: 'cadde', seed, bos: true }).s;
const gunGit = (s: ReturnType<typeof yeni>, hedef: number): void => { while (dayOf(s) < hedef && !s.oyunBitti) { s.bekleyen.length = 0; step(s, 1440); } };

describe('kademeli açılma', () => {
  it('şubesiz başlangıçta yalnız temel gruplar; şube ve gün ilerledikçe açılır', () => {
    const s = bos(); const ids = GRUPLAR.map((g) => g.id).filter((id) => grupAcik(s, id)); expect(ids.sort()).toEqual(['ana', 'ayar', 'dunya', 'isletme'].sort()); expect(gorunurGruplar(s).map((g) => g.id)).toEqual(['ana', 'isletme', 'dunya']);
    const t = yeni(); for (const id of ['finans', 'pazarlama', 'gelisim']) expect(grupAcik(t, id)).toBe(true); expect(grupAcik(t, 'atolye')).toBe(false); expect(tabAcik(t, 'takvim')).toBe(false); expect(gorunurGruplar(t).map((g) => g.id)).toEqual(['ana', 'isletme', 'finans', 'pazarlama', 'gelisim', 'dunya']); expect(tabAcik(t, 'yatirim')).toBe(false); expect(kilitNedeni(t, 'yatirim').length).toBeGreaterThan(3);
    gunGit(t, 12); expect(grupAcik(t, 'atolye')).toBe(true); expect(grupAcik(t, 'gelisim')).toBe(true); expect(tabAcik(t, 'donem')).toBe(true); expect(tabAcik(t, 'mevzuat')).toBe(false);
    gunGit(t, 46); expect(tabAcik(t, 'mevzuat')).toBe(true); expect(tabAcik(t, 'mulk')).toBe(true); expect(kilitliListe(t).length).toBeLessThan(kilitliListe(yeni()).length);
  });
  it('her kural geçerli bir sayfa ya da gruba ait; tüm sayfalar açılabilir bir duruma gelir', () => {
    const idler = new Set(NAV.map((n) => n[0])); for (const k of Object.keys(TAB_KURAL)) expect(idler.has(k)).toBe(true); for (const k of Object.keys(GRUP_KURAL)) expect(GRUPLAR.some((g) => g.id === k)).toBe(true);
    const s = yeni(2); s.marka_puani = 100; for (let i = 0; i < 6; i++) s.subeler.push({ ...JSON.parse(JSON.stringify(s.subeler[0])), id: 400 + i, ilce: 'k' + i }); s.dk = 100 * 1440; expect(kilitliListe(s).length).toBeLessThanOrEqual(2); expect(acikListe(s).length).toBeGreaterThan(30);
  });
  it('eski (ilerlemiş) kayıtta her şey açık', () => { const s = yeni(3); gunGit(s, 5); s.dk = 120 * 1440; const j = deserialize(serialize(s)); expect(tabAcik(j, 'rakipler')).toBe(true); expect(tabAcik(j, 'kariyer')).toBe(true); });
});
describe('sıradaki adım ve yol haritası', () => {
  it('şubesizken ilk öneri şube açmak; şubeyle öneriler öncelik sırasında', () => {
    const s = bos(); expect(oneriler(s)[0]!.id).toBe('ilk'); const t = yeni(); gunGit(t, 3); const l = oneriler(t); expect(l.length).toBeGreaterThan(0); for (let i = 1; i < l.length; i++) expect(l[i - 1]!.oncelik).toBeGreaterThanOrEqual(l[i]!.oncelik); expect(l.some((o) => o.id === 'fiyat')).toBe(true);
  });
  it('yol haritası adımları tamamlanınca bir kez ödül verir; hepsi bitince bonus', () => {
    const s = yeni(4); const k0 = s.kasa; s.stat.fiyatDeg = 1; const a = yolKontrol(s); expect(a).toContain('Fiyat danışmanını dene'); expect(s.kasa).toBeGreaterThan(k0); const k1 = s.kasa; expect(yolKontrol(s)).toEqual([]); expect(s.kasa).toBe(k1);
    expect(YOL.length).toBe(10); expect(yolDurum(s).yapilan).toBeGreaterThanOrEqual(2); for (const x of YOL) Yl(s).adim[x.id] = 1; const b0 = s.kasa; yolKontrol(s); expect(Yl(s).bitti).toBe(true); expect(s.kasa).toBeGreaterThan(b0);
  });
});
describe('karar defteri', () => {
  it('karar kaydı tekrarsız; 7 gün sonra etki farkı hesaplanır ve bildirim kuyruğuna düşer', () => {
    const s = yeni(5); gunGit(s, 10); kararKaydet(s, 'Fiyat değişikliği'); kararKaydet(s, 'Fiyat değişikliği'); const k = Kd(s); expect(k.liste.length).toBe(1); expect(k.liste[0]!.once.ciro).toBeGreaterThan(0); expect(snap(s).musteri).toBeGreaterThan(0);
    gunGit(s, dayOf(s) + KARAR_GUN + 1); const x = k.liste[0]!; expect(x.sonra).toBeTruthy(); expect(Number.isFinite(x.fark!.kar)).toBe(true); expect(['iyi', 'kotu', 'nötr']).toContain(x.hukum); expect(k.yeni.length).toBe(1); expect(s.log.some((m) => m.includes('kararının etkisi'))).toBe(true);
    for (let i = 0; i < 40; i++) { gunGit(s, dayOf(s) + 4); kararKaydet(s, 'Karar ' + i); } expect(k.liste.length).toBeLessThanOrEqual(30);
  });
  it('kayıt/yükleme yeni durumu korur; alanı olmayan eski kayıt açılır', () => {
    const s = yeni(6); gunGit(s, 8); kararKaydet(s, 'X'); Yl(s).adim.sube = 0; const j = deserialize(serialize(s)); expect(Kd(j).liste.length).toBe(1); expect(Yl(j).adim.sube).toBe(0);
    const eski = JSON.parse(serialize(s)); delete eski.derin.karar; delete eski.derin.yol; delete eski.derin.acilan; const e = deserialize(JSON.stringify(eski)); gunGit(e, dayOf(e) + 3); expect(Number.isFinite(e.kasa)).toBe(true);
  });
});

describe('menü düzeni geçişi', () => {
  it('eski düzenden kalan kayıtta yeni kategoriler bildirim yağdırmaz; sonradan açılanlar yine bildirilir', async () => {
    const { acilisKontrol } = await import('../src/ui/yonet'); const { D } = await import('../src/core/derin');
    const s = yeni(5); gunGit(s, 12); const d = D(s); d.acilan = { depo: 0, tanitim: 0, kasa: 0, semt: 0, subeler: 0 };   // eski sürümün kaydı
    expect(acilisKontrol(s)).toEqual([]); expect(acilisKontrol(s)).toEqual([]);
    gunGit(s, 46); expect(acilisKontrol(s).length).toBeGreaterThan(0);   // 45. gün: Mevzuat, Mülkler vb. gerçekten yeni
  });
});
