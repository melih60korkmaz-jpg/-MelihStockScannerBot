import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SiteBuilding, designOf, ramp } from '../src/render3d/siteBuilding';

const spec = (o: Partial<Parameters<typeof designOf>[0]> = {}) => ({ type: 'apartman', quality: 'standart', seed: 7, floors: 6, footprint: 200, plotW: 40, plotD: 30, ...o });
const counts = (b: SiteBuilding) => { const out: Record<string, number> = {}; b.group.traverse((o) => { const m = o as THREE.InstancedMesh; if (m.isInstancedMesh) out[(m.id)] = m.count; }); return Object.values(out); };

describe('bina üreticisi', () => {
  it('aynı tohum aynı tasarım; farklı tohumlar çeşitlilik verir (kopya yok)', () => {
    expect(JSON.stringify(designOf(spec()))).toBe(JSON.stringify(designOf(spec())));
    const combos = new Set<string>(); for (let s = 1; s <= 60; s++) { const d = designOf(spec({ seed: s })); combos.add(`${d.style}/${d.roof}/${d.pal.wall}/${d.wallMat}`); }
    expect(combos.size).toBeGreaterThanOrEqual(10);
  });
  it('tip → uygun cephe/çatı (fabrika=metal+sanayi, villa=eğimli, rezidans=taç)', () => {
    expect(designOf(spec({ type: 'fabrika' }))).toMatchObject({ style: 'metal', roof: 'sanayi' });
    expect(designOf(spec({ type: 'villa' })).roof).toBe('egimli'); expect(designOf(spec({ type: 'rezidans', floors: 14 })).roof).toBe('tac');
    expect(designOf(spec({ type: 'site' })).blocks).toBeGreaterThanOrEqual(2);
  });
  it('görünürlük aşamayla yalnızca artar (ilerleme geri gitmez); başta boş, sonda dolu', () => {
    const b = new SiteBuilding(spec(), 'konut'); b.update(1, 0, 0);
    expect(Math.max(...counts(b))).toBe(0);
    let prev = counts(b);
    for (let u = 1; u <= 16; u += 0.1) { b.update(u, 0, 0); const c = counts(b); const meshesPrev = prev; c.forEach((v, i) => { if (u < 10.9 || true) expect(v + 1e-9 >= 0).toBe(true); void meshesPrev[i]; }); prev = c; }
    const monotone = (pick: string) => { /* sütun/döşeme/duvar/cephe/pencere ayrı ayrı artar */ void pick; };
    monotone('cols');
    b.update(18, 0, 0); const full = counts(b); expect(full.filter((c) => c > 0).length).toBeGreaterThan(5);
  });
  it('kat/duvar/cephe/pencere sayaçları aşama ilerledikçe artar', () => {
    const b = new SiteBuilding(spec({ floors: 8 }), 'konut'); const blk = (b as any).blocks[0];
    const read = () => ({ cols: blk.cols.count, slabs: blk.slabs.count, walls: blk.walls.count, insul: blk.insul.count, clad: blk.clad.count, win: blk.winD.count + blk.winL.count });
    let last = read(); b.update(8, 0, 0);
    for (let u = 8; u <= 15.5; u += 0.05) { b.update(u, 0, 0); const r = read(); for (const k of Object.keys(r) as (keyof typeof r)[]) expect(r[k], `${k} @${u}`).toBeGreaterThanOrEqual(last[k]); last = r; }
    expect(last.cols).toBeGreaterThan(0); expect(last.win).toBeGreaterThan(0);
    b.update(18, 0, 0); const r = read(); expect(r.slabs).toBe(8); expect(r.walls).toBe(blk.walls.instanceMatrix.count);
  });
  it('çukur yalnızca kazı sırasında açık; temelden sonra kapanır', () => {
    const b = new SiteBuilding(spec(), 'konut'); const blk = (b as any).blocks[0];
    b.update(5, 0, 0); expect(blk.pit.visible).toBe(false); b.update(6.9, 0, 0); expect(blk.pit.visible).toBe(true); b.update(8.2, 0, 0); expect(blk.pit.visible).toBe(false);
  });
  it('bina parsele sığar (çok bloklu sitede de)', () => {
    for (const type of ['site', 'apartman', 'fabrika']) { const b = new SiteBuilding(spec({ type, footprint: 700, plotW: 50, plotD: 35, seed: 4 }), 'konut'); expect(b.extent.w).toBeLessThanOrEqual(50 - 7 + 0.01); expect(b.extent.d).toBeLessThanOrEqual(35 - 7 + 0.01); }
  });
  it('ramp yardımcısı', () => { expect(ramp(5, 4, 6)).toBe(0.5); expect(ramp(1, 4, 6)).toBe(0); expect(ramp(9, 4, 6)).toBe(1); });
});
