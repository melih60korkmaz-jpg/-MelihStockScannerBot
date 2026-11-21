import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { EMBLEM_COLORS, EMBLEM_SHAPES } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { pack, unpack } from '../src/save/serialize';
import { BRAND_COLORS, LOGOS, emblemInner } from '../src/ui/emblem';

describe('logo galerisi', () => {
  it('en çok 10 logo; hepsi farklı çizim; sayılar komutla uyumlu', () => {
    expect(LOGOS.length).toBeLessThanOrEqual(10); expect(LOGOS.length).toBe(EMBLEM_SHAPES); expect(BRAND_COLORS.length).toBe(EMBLEM_COLORS); expect(BRAND_COLORS.length).toBe(8);
    expect(new Set(LOGOS.map((l) => l.id)).size).toBe(LOGOS.length); LOGOS.forEach((l, i) => expect(l.id).toBe(i));
    expect(new Set(LOGOS.map((l) => emblemInner(l.id, 0))).size).toBe(LOGOS.length);
    expect(BRAND_COLORS.map((c) => c.name)).toEqual(['Turuncu', 'Yeşil', 'Gümüş', 'Kırmızı', 'Altın', 'Beyaz', 'Mavi', 'Siyah']);
  });
  it('geçersiz logo/renk kimliği çizimde ilk logoya düşer (eski kayıt bozulmaz)', () => {
    expect(emblemInner(99, 99)).toBe(emblemInner(0, 0));
  });
});

describe('kuruluş: kurucu adı, şirket adı, logo ve renk kaydı', () => {
  const create = (extra: object = {}) => { const s = newGameState(5); const r = dispatch(s, 'CreateCompany', { name: 'Korkmaz İnşaat', founderBackground: 'eski_kalfa', startCity: 'ankara', ...extra }); return { s, r }; };
  it('seçilenler şirkete yazılır ve kayıt (pack/unpack) sonrası korunur', () => {
    const { s, r } = create({ founder: ' Melih Korkmaz ', emblem: { shape: 7, color: 6 } });
    expect(r.ok).toBe(true); const c = s.company!;
    expect(c.name).toBe('Korkmaz İnşaat'); expect(c.founder).toBe('Melih Korkmaz'); expect(c.emblem).toEqual({ shape: 7, color: 6 });
    const back = unpack(pack(s)); expect(back.ok).toBe(true);
    if (back.ok) { expect(back.state.company!.founder).toBe('Melih Korkmaz'); expect(back.state.company!.emblem).toEqual({ shape: 7, color: 6 }); expect(back.state.company!.name).toBe('Korkmaz İnşaat'); }
  });
  it('kurucu adı verilmezse "Patron"; çok uzunsa ve geçersiz logo/renk reddedilir', () => {
    expect(create().s.company!.founder).toBe('Patron');
    expect(create({ founder: 'x'.repeat(25) }).r.ok).toBe(false);
    expect(create({ emblem: { shape: 10, color: 0 } }).r.ok).toBe(false);
    expect(create({ emblem: { shape: 0, color: 8 } }).r.ok).toBe(false);
    expect(create({ emblem: { shape: 9, color: 7 } }).r.ok).toBe(true);
  });
});
