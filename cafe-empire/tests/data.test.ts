import { describe, expect, it } from 'vitest';
import { CITIES, cityById } from '../src/data/turkey';
import { PRODUCTS, INGREDIENTS, SHOP_TYPES } from '../src/data/catalog';

describe('81 il verisi', () => {
  it('81 il, benzersiz plaka ve sınır yolu var', () => {
    expect(CITIES).toHaveLength(81);
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(81);
    for (const c of CITIES) { expect(c.path.length).toBeGreaterThan(30); expect(c.ad.length).toBeGreaterThan(1); }
  });
  it('gerçek coğrafi konumlar mantıklı (Türkiye sınırları)', () => {
    for (const c of CITIES) { expect(c.lon).toBeGreaterThan(25.5); expect(c.lon).toBeLessThan(45); expect(c.lat).toBeGreaterThan(35.8); expect(c.lat).toBeLessThan(42.2); }
    expect(cityById(34).ad).toBe('İstanbul'); expect(cityById(6).ad).toBe('Ankara'); expect(cityById(35).ad).toBe('İzmir');
    expect(cityById(7).lat).toBeLessThan(cityById(61).lat);            // Antalya, Trabzon'un güneyinde
    expect(cityById(61).lon).toBeGreaterThan(cityById(34).lon);        // Trabzon, İstanbul'un doğusunda
  });
  it('göstergeler tutarlı aralıkta ve şehirler arası fark var', () => {
    for (const c of CITIES) {
      expect(c.gelir).toBeGreaterThanOrEqual(0.6); expect(c.gelir).toBeLessThanOrEqual(1.6); expect(c.kira).toBeGreaterThan(0.4); expect(c.rekabet).toBeGreaterThan(0); expect(c.rekabet).toBeLessThanOrEqual(1);
      const p = c.profil; expect(p.ogr + p.cal + p.tur + p.aile + p.emk).toBeCloseTo(1, 5);
    }
    const ist = cityById(34), tok = cityById(60), esk = cityById(26), ant = cityById(7), bur = cityById(16);
    expect(ist.kira).toBeGreaterThan(tok.kira * 2); expect(ist.talep).toBeGreaterThan(tok.talep * 10);
    expect(ant.turizm).toBeGreaterThan(0.9); expect(esk.profil.ogr).toBeGreaterThan(cityById(60).profil.ogr); expect(bur.sanayi).toBeGreaterThan(0.8);
    expect(ist.rekabet).toBeGreaterThan(tok.rekabet);
  });
  it('katalog tutarlı: tarifler bilinen hammaddeleri kullanır', () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id)); expect(PRODUCTS.length).toBeGreaterThanOrEqual(19);
    for (const p of PRODUCTS) for (const k of Object.keys(p.recete)) expect(ids.has(k as never)).toBe(true);
    expect(SHOP_TYPES).toHaveLength(8);
  });
});
