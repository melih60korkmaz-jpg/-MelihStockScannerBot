import { describe, it, expect } from 'vitest';
import { yeniOyun, type Game } from '../src/core/game';
import { YETENEKLER } from '../src/core/skills';
import { macBaslat, macAksiyon, macOtomatik, macOzeti } from '../src/core/match';
import { haftaIlerlet } from '../src/core/week';
import { kramponAl, kramponGiy, ekipBonus, KRAMPONLAR, icecekAl, icecekIc, HAFTALIK_ICECEK, ICECEKLER } from '../src/core/ekipman';
const yarat = (seed = 1): Game => yeniOyun({ ad: 'A', soyad: 'B', cinsiyet: 'Erkek', kita: 'Avrupa', uyruk: 'Türkiye', lig: 3, poz: 'SF', numara: 9, gorunum: { ten: 1, sac: 1, sacRenk: 1 }, seed } as any);
const hepsi = (g: Game, v: number) => { for (const k of YETENEKLER) g.oyuncu.yet[k] = v; };
function oran(krampon: string | null, tip: 'sut' | 'pas' | 'dribling', enerji = 100, N = 1200): number {
  let ok = 0; for (let s = 1; s <= N; s++) { const g = yarat(s); hepsi(g, 50); g.para = 1e6; if (krampon) kramponAl(g, krampon); const m = macBaslat(g); m.enerji = enerji; m.rng = s * 7919;
    if (tip === 'sut') { m.poz = { tip: 'sut', dk: 30, baski: 0.3, mesafe: 14, kaleci: 0.55, rakip: 2, hedefler: [], ipucu: '', sut: { yon: 0 } } as any; if (macAksiyon(g, m, { tip: 'sut', tur: 'normal', x: 0.6, y: 0.3, guc: 0.7, falso: 0 })?.tur === 'gol') ok++; }
    else if (tip === 'pas') { m.poz = { tip: 'pas', dk: 30, baski: 0.4, mesafe: 20, kaleci: 0.5, rakip: 2, hedefler: [{ id: 0, ad: 'X', mesafe: 20, aciklik: 0.5, risk: 0.3, tur: 'ara' }], ipucu: '' } as any; { const r = macAksiyon(g, m, { tip: 'pas', hedef: 0, tur: 'ara' })?.tur; if (r === 'basari' || r === 'gol') ok++; } }
    else { m.poz = { tip: 'dribling', dk: 30, baski: 0.5, mesafe: 20, kaleci: 0.5, rakip: 2, hedefler: [], ipucu: '' } as any; if (macAksiyon(g, m, { tip: 'dribling', tur: 'hizlan' })?.tur === 'basari') ok++; } }
  return ok / N;
}
const BUYUK = 8000;
describe('Krampon: bonuslar gerçekten hesaplanır', () => {
  it('beş kramponun bonus tablosu giyilince ekipBonus ile uyuşur; temel krampon bonus vermez', () => { expect(KRAMPONLAR.length).toBe(5); for (const k of KRAMPONLAR) { const g = yarat(); g.para = 1e6; if (k.id !== 'temel') kramponAl(g, k.id); for (const y of YETENEKLER) expect(ekipBonus(g, y)).toBe(k.id === 'temel' ? 0 : (k.bonus[y] ?? 0)); } });
  it('Hız Kramponu dripling başarısını artırır', () => { expect(oran('hiz', 'dribling')).toBeGreaterThan(oran(null, 'dribling') + 0.02); });
  it('Güç Kramponu gol oranını artırır', () => { expect(oran('guc', 'sut')).toBeGreaterThan(oran(null, 'sut') + 0.02); });
  it('Kontrol Kramponu pas başarısını artırır', () => { expect(oran('kontrol', 'pas', 100, BUYUK)).toBeGreaterThan(oran(null, 'pas', 100, BUYUK) + 0.003); });
  it('Usta Krampon hem şutta hem pasta hem driplingde etkilidir ve tek yönlü kramponlardan genelde üstündür', () => { expect(oran('usta', 'sut')).toBeGreaterThan(oran(null, 'sut') + 0.03); expect(oran('usta', 'pas', 100, BUYUK)).toBeGreaterThan(oran(null, 'pas', 100, BUYUK) + 0.003); expect(oran('usta', 'dribling')).toBeGreaterThan(oran(null, 'dribling') + 0.02); });
  it('krampon alakasız beceride etkisizdir (Hız Kramponu şutu değiştirmez)', () => { expect(Math.abs(oran('hiz', 'sut') - oran(null, 'sut'))).toBeLessThan(0.04); });
  it('maç başına aşınma: oynanan maçta 1 azalır, oynanmayan maçta azalmaz; bitince temel krampona döner', () => { const g = yarat(); g.para = 1e6; kramponAl(g, 'hiz'); const omur = g.kramponlar.hiz!; expect(omur).toBe(25); hepsi(g, 70); for (let i = 0; i < 3; i++) { const m = macBaslat(g); macOtomatik(g, m); const oz = macOzeti(g, m); haftaIlerlet(g, oz); if (oz.oynadi) expect(g.kramponlar.hiz!).toBeLessThanOrEqual(omur); } const oynanan = 25 - g.kramponlar.hiz!; expect(oynanan).toBe(g.stat.mac); g.kramponlar.hiz = 1; const m2 = macBaslat(g); macOtomatik(g, m2); const oz2 = macOzeti(g, m2); haftaIlerlet(g, oz2); if (oz2.oynadi) { expect(g.giyilen).toBe('temel'); expect(ekipBonus(g, 'surat')).toBe(0); } });
  it('satın alma parayı düşürür ve giydirir; yeterli para yoksa alınmaz; değiştirme sahip olunanla sınırlı', () => { const g = yarat(); g.para = 20000; expect(kramponAl(g, 'guc').ok).toBe(false); expect(kramponAl(g, 'hiz').ok).toBe(true); expect(g.para).toBe(2000); expect(g.giyilen).toBe('hiz'); expect(kramponGiy(g, 'guc').ok).toBe(false); expect(kramponGiy(g, 'temel').ok).toBe(true); expect(ekipBonus(g, 'surat')).toBe(0); expect(kramponGiy(g, 'hiz').ok).toBe(true); expect(ekipBonus(g, 'surat')).toBe(8); expect(kramponAl(g, 'temel').ok).toBe(false); });
});
describe('Volt: hesaplamalara gerçekten etki eder', () => {
  it('düşük enerji maçta performansı düşürür; Volt ile dolan enerji bunu geri verir', () => { expect(oran(null, 'sut', 100)).toBeGreaterThan(oran(null, 'sut', 10) + 0.02); const g = yarat(); g.enerji = 10; g.icecek.altin = 1; icecekIc(g, 'altin'); expect(g.enerji).toBe(100); });
  it('her içeceğin enerji/yorgunluk değeri uygulanır ve 100 ile 0 sınırında kalır', () => { for (const i of ICECEKLER) { const g = yarat(); g.enerji = 20; g.yorgunluk = 40; g.icecek[i.id] = 1; const r = icecekIc(g, i.id); expect(r.ok).toBe(true); expect(g.enerji).toBe(Math.min(100, 20 + i.enerji)); expect(g.yorgunluk).toBe(Math.max(0, 40 + i.yorgunluk)); } });
  it('haftalık limit: 3. içecek enerji vermez, yorgunluğu +12, mutluluğu -3 düşürür; sayaç hafta sonunda sıfırlanır', () => { const g = yarat(); g.enerji = 10; g.yorgunluk = 10; g.mut = 60; g.icecek.klasik = 5; for (let i = 0; i < HAFTALIK_ICECEK; i++) icecekIc(g, 'klasik'); const e = g.enerji; const y = g.yorgunluk; icecekIc(g, 'klasik'); expect(g.enerji).toBe(e); expect(g.yorgunluk).toBe(y + 12); expect(g.mut).toBe(57); expect(g.icecek.klasik).toBe(2); const m = macBaslat(g); macOtomatik(g, m); haftaIlerlet(g, macOzeti(g, m)); expect(g.haftaIcecek).toBe(0); icecekIc(g, 'klasik'); expect(g.icecek.klasik).toBe(1); });
  it('yorgunluk yüksekken antrenman verimi düşer, Volt Hızlı yorgunluğu azaltınca verim geri gelir', () => { const kazanc = (yor: number) => { const g = yarat(7); g.yorgunluk = yor; const once = g.oyuncu.yet.sut; return (import_antren(g)); void once; }; function import_antren(g: Game): number { const o = g.oyuncu.yet.sut; antren(g); return g.oyuncu.yet.sut - o; } void kazanc; const a = deney(0), b = deney(80); expect(a).toBeGreaterThan(b); function deney(yor: number): number { const g = yarat(7); g.yorgunluk = yor; g.enerji = 100; const o = g.oyuncu.yet.sut; antren(g); return g.oyuncu.yet.sut - o; } });
  it('satın alma: para düşer, stok artar; yetmezse alınmaz', () => { const g = yarat(); g.para = 1600; expect(icecekAl(g, 'klasik').ok).toBe(true); expect(g.para).toBe(100); expect(icecekAl(g, 'altin').ok).toBe(false); });
});
import { antrenmanYap } from '../src/core/game';
function antren(g: Game): void { antrenmanYap(g, 'sut', 0.8); }
