import { describe, it, expect } from 'vitest';
import { yeniOyun } from '../src/core/game';
import { haftaIlerlet } from '../src/core/week';
import { macBaslat, macOtomatik, macOzeti } from '../src/core/match';
import { ekMacIsle, milliyetOf } from '../src/core/ekmac';
import { dunyaSiralamasi, dunyaGolKrali, yzTransferleri, ovrOf } from '../src/core/dunya';
import { Rng } from '../src/core/rng';
const yeni = (extra = {}) => yeniOyun({ ad: 'A', soyad: 'B', cinsiyet: 'Erkek', kita: 'Avrupa', uyruk: 'Türkiye', lig: 3, poz: 'SF', numara: 9, gorunum: { ten: 1, sac: 1, sacRenk: 1 }, seed: 5, ...extra } as any);
describe('milliyet', () => { it('ayrı seçilir, boşsa uyruk olur', () => { expect(milliyetOf(yeni({ milliyet: 'Brezilya' }))).toBe('Brezilya'); expect(milliyetOf(yeni({ milliyet: '' }))).toBe('Türkiye'); }); });
describe('dünya sıralaması ve yapay zekâ transferleri', () => {
  it('sıralama azalan ovr, oyuncu içinde yer alır', () => { const g = yeni(), d = dunyaSiralamasi(g, 20); expect(d.liste.length).toBe(20); for (let i = 1; i < 20; i++) expect(d.liste[i - 1]!.ovr).toBeGreaterThanOrEqual(d.liste[i]!.ovr); expect(d.benimSiram).toBeGreaterThan(0); expect(d.toplam).toBe(g.kadro.length + 1); expect(dunyaGolKrali(g, 5).length).toBe(5); });
  it('transferler takaslıdır: her kulübün 4 oyuncusu kalır; bazı oyuncular el değiştirir', () => { const g = yeni(); const once = g.kadro.map((f) => f.kulup); let n = 0; for (let s = 0; s < 6; s++) n += yzTransferleri(g, new Rng(100 + s)).length; for (const k of g.kulupler) expect(g.kadro.filter((f) => f.kulup === k.id).length).toBe(4); expect(n).toBeGreaterThan(5); expect(g.kadro.some((f, i) => f.kulup !== once[i])).toBe(true); expect(g.kadro.every((f) => f.ovr! >= 25 && f.ovr! <= 92)).toBe(true); });
  it('oyuncunun kendi kulübü transfere karışmaz', () => { const g = yeni(); for (let s = 0; s < 10; s++) yzTransferleri(g, new Rng(s)); expect(g.kadro.filter((f) => f.kulup === g.kulup).length).toBe(4); });
  it('sezon sonunda çalışır ve haber üretir', () => { const g = yeni(); for (let i = 0; i < 22; i++) { const m = macBaslat(g); macOtomatik(g, m); if (g.ekMac) ekMacIsle(g); haftaIlerlet(g, macOzeti(g, m)); } expect(g.sezon).toBe(2); expect(g.kadro.every((f) => ovrOf(g, f) > 0)).toBe(true); expect(g.haberler.some((h) => h.bas.startsWith('Transfer dünyası'))).toBe(true); });
});
