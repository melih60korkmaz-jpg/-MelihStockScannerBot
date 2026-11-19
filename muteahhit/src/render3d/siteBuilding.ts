import * as THREE from 'three';

export interface BuildingSpec { type: string; quality: string; seed: number; floors: number; footprint: number; plotW: number; plotD: number }
export const FH = { konut: 3.0, ticari: 3.6, sanayi: 6.0 };
const Y = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const M = (x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromAxisAngle(Y, ry), _s.set(sx, sy, sz));
export const ramp = (u: number, a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const PALETTES = [
  { wall: '#f2e6cf', accent: '#c0562b', roof: '#9a3a22', glass: '#5ea4cf' }, { wall: '#dfe4e8', accent: '#2c4a6b', roof: '#3d4651', glass: '#4f8fbf' },
  { wall: '#f6f1e4', accent: '#d9a406', roof: '#7a5a3a', glass: '#7cc0d8' }, { wall: '#d9b48c', accent: '#8a3b22', roof: '#6a3d2a', glass: '#5f9bbd' },
  { wall: '#c7d0d4', accent: '#1d3550', roof: '#2a3a48', glass: '#3f88b5' }, { wall: '#efd8c0', accent: '#2f8a6e', roof: '#2f5a5a', glass: '#7ec3c9' },
  { wall: '#e9c8c0', accent: '#a63d4a', roof: '#6a2f35', glass: '#6aa6c9' }, { wall: '#cfe0c8', accent: '#4a7a3a', roof: '#5a4a35', glass: '#78b5c4' },
];
export type FacadeStyle = 'serit' | 'balkon' | 'cam' | 'tugla' | 'tas' | 'metal';
export type RoofKind = 'teras' | 'egimli' | 'tac' | 'sanayi';

/** Tasarım tohumundan tip + kaliteye göre cephe stili, çatı ve renk paleti seçer: her proje farklı görünür. */
export function designOf(spec: BuildingSpec) {
  const r = rng(spec.seed), t = spec.type, pal = PALETTES[Math.floor(r() * PALETTES.length)]!;
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!;
  let style: FacadeStyle, roof: RoofKind;
  if (t === 'fabrika' || t === 'depo') { style = 'metal'; roof = 'sanayi'; }
  else if (t === 'ofis' || t === 'is_merkezi') { style = pick<FacadeStyle>(['cam', 'cam', 'serit']); roof = t === 'is_merkezi' ? 'tac' : 'teras'; }
  else if (t === 'rezidans') { style = pick<FacadeStyle>(['cam', 'balkon']); roof = 'tac'; }
  else if (t === 'luks') { style = pick<FacadeStyle>(['cam', 'tas', 'balkon']); roof = pick<RoofKind>(['teras', 'tac']); }
  else if (t === 'villa') { style = pick<FacadeStyle>(['tas', 'tugla']); roof = 'egimli'; }
  else if (t === 'mustakil') { style = pick<FacadeStyle>(['tugla', 'serit']); roof = 'egimli'; }
  else { style = pick<FacadeStyle>(['balkon', 'serit', 'tugla']); roof = spec.floors <= 3 && r() < 0.5 ? 'egimli' : 'teras'; }
  const aspect = 1 + r() * 0.7, blocks = t === 'site' ? 2 + Math.floor(r() * 2) : 1;
  const wallMat = r() < 0.5 ? '#b0623a' : '#d9d4c4'; // kaba duvar: tuğla / gazbeton
  return { pal, style, roof, aspect, blocks, wallMat, tall: spec.floors >= 8, kalite: spec.quality };
}

const mat = (c: string | number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o });
const BOX = new THREE.BoxGeometry(1, 1, 1);

function inst(geo: THREE.BufferGeometry, m: THREE.Material, mats: THREE.Matrix4[], shadow = true, colors?: THREE.Color[]) {
  const im = new THREE.InstancedMesh(geo, m, Math.max(1, mats.length));
  mats.forEach((x, i) => { im.setMatrixAt(i, x); if (colors) im.setColorAt(i, colors[i]!); });
  im.count = 0; im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; return im;
}

/** Tek blok: tüm katmanlar `update(u)` ile aşama ilerlemesine göre görünür olur. */
class Block {
  group = new THREE.Group();
  private cols: THREE.InstancedMesh; private slabs: THREE.InstancedMesh; private walls: THREE.InstancedMesh; private insul: THREE.InstancedMesh; private clad: THREE.InstancedMesh;
  private winD: THREE.InstancedMesh; private winL: THREE.InstancedMesh; private mull: THREE.InstancedMesh | null; private balc: THREE.InstancedMesh | null; private rail: THREE.InstancedMesh | null;
  private scaf: THREE.InstancedMesh; private core: THREE.Mesh; private formwork: THREE.Mesh; private holo: THREE.LineSegments; private holoFill: THREE.Mesh;
  private pit = new THREE.Group(); private pitWalls: THREE.Mesh[] = []; private pitBottom: THREE.Mesh; private radye: THREE.Mesh; private rebar: THREE.InstancedMesh;
  private roofTop = new THREE.Group(); private roofParts: THREE.Mesh[] = [];
  private nc: number; private nW: number; private per: Record<string, number> = {};
  readonly topH: number; glassLit: THREE.MeshStandardMaterial; winLitCount = 0;
  constructor(public w: number, public d: number, public x: number, public z: number, public F: number, public fh: number, design: ReturnType<typeof designOf>, private seed: number, shared: { glass: THREE.Material; lit: THREE.MeshStandardMaterial; concrete: THREE.Material }) {
    const r = rng(seed), { pal, style, roof } = design, nx = Math.max(2, Math.round(w / 3.4)), nz = Math.max(2, Math.round(d / 3.4)), g = this.group;
    g.position.set(x, 0, z); this.topH = F * fh; this.glassLit = shared.lit;
    const hw = w / 2, hd = d / 2;
    // sütunlar (kat-major) ve döşemeler
    const cm: THREE.Matrix4[] = [], sm: THREE.Matrix4[] = [];
    for (let f = 0; f < F; f++) {
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) { const edge = i === 0 || j === 0 || i === nx || j === nz; if (!edge && (i + j) % 2) continue; cm.push(M(-hw + (i * w) / nx, f * fh + fh / 2, -hd + (j * d) / nz, 0.55, fh, 0.55)); }
      sm.push(M(0, f * fh + fh, 0, w + 0.9, 0.32, d + 0.9));
    }
    this.nc = cm.length / F; this.per.cols = this.nc;
    this.cols = inst(BOX, shared.concrete, cm); this.slabs = inst(BOX, shared.concrete, sm);
    // çekirdek (asansör kovası), kalıp, filiz demirleri
    this.core = new THREE.Mesh(BOX, shared.concrete); this.core.castShadow = true; g.add(this.core);
    this.formwork = new THREE.Mesh(BOX, mat('#9c7a4a', { transparent: true, opacity: 0.5 })); g.add(this.formwork);
    // duvar / yalıtım / cephe: her kat her kenar için bir kutu (kat-major)
    const sides = [{ l: w, n: nx, ox: 0, oz: hd, ry: 0 }, { l: w, n: nx, ox: 0, oz: -hd, ry: Math.PI }, { l: d, n: nz, ox: hw, oz: 0, ry: Math.PI / 2 }, { l: d, n: nz, ox: -hw, oz: 0, ry: -Math.PI / 2 }];
    const wm: THREE.Matrix4[] = [], im: THREE.Matrix4[] = [], cmx: THREE.Matrix4[] = [], dm: THREE.Matrix4[] = [], lm: THREE.Matrix4[] = [], mm: THREE.Matrix4[] = [], bm: THREE.Matrix4[] = [], rm: THREE.Matrix4[] = [], scm: THREE.Matrix4[] = [];
    const wf = style === 'cam' ? 0.9 : style === 'serit' ? 0.86 : 0.55, hf = style === 'cam' ? 0.9 : style === 'serit' ? 0.42 : 0.58, litP = 0.35;
    for (let f = 0; f < F; f++) {
      const y0 = f * fh + fh / 2;
      for (const s of sides) {
        const off = (a: number) => [s.ox + (s.ry === 0 ? 0 : s.ry === Math.PI ? 0 : Math.sign(s.ox) * a), s.oz + (s.ry === 0 ? a : s.ry === Math.PI ? -a : 0)] as const;
        const [wx, wz] = off(0), [ix, iz] = off(0.2), [cx, cz] = off(0.32);
        wm.push(M(wx, y0, wz, s.l, fh - 0.3, 0.3, s.ry)); im.push(M(ix, y0, iz, s.l, fh - 0.3, 0.09, s.ry));
        cmx.push(M(cx, y0, cz, s.l + 0.1, fh - 0.3, 0.12, s.ry));
        const bw = s.l / s.n;
        for (let b = 0; b < s.n; b++) {
          const lx = -s.l / 2 + bw * (b + 0.5), cs = Math.cos(s.ry), sn = Math.sin(s.ry);
          const px = s.ox + lx * cs + (s.ry === 0 ? 0 : s.ry === Math.PI ? 0 : Math.sign(s.ox) * 0.4), pz = s.oz - lx * sn + (s.ry === 0 ? 0.4 : s.ry === Math.PI ? -0.4 : 0);
          const pane = M(px, y0 + (style === 'serit' ? 0.2 : 0), pz, bw * wf, (fh - 0.3) * hf, 0.16, s.ry);
          (r() < litP ? lm : dm).push(pane);
          if (style === 'cam') mm.push(M(s.ox + (-s.l / 2 + bw * b) * cs + (s.ry === 0 ? 0 : s.ry === Math.PI ? 0 : Math.sign(s.ox) * 0.42), y0, s.oz - (-s.l / 2 + bw * b) * sn + (s.ry === 0 ? 0.42 : s.ry === Math.PI ? -0.42 : 0), 0.14, fh - 0.2, 0.14, s.ry));
          if (style === 'balkon' && f > 0 && (s.ry === 0 || s.ry === Math.PI) && b % 2 === 0) {
            const k = s.ry === 0 ? 1 : -1; bm.push(M(px, f * fh + 0.12, pz + k * 0.7, bw * 0.78, 0.2, 1.4, 0)); rm.push(M(px, f * fh + 0.7, pz + k * 1.35, bw * 0.78, 0.9, 0.06, 0));
          }
        }
        // iskele: kenar boyunca dikme + korkuluk (kat başına)
        const m = Math.max(2, Math.round(s.l / 2.2)); for (let k = 0; k <= m; k++) { const lx = -s.l / 2 + (s.l * k) / m, cs = Math.cos(s.ry), sn = Math.sin(s.ry); scm.push(M(s.ox + lx * cs + (s.ry === 0 ? 0 : s.ry === Math.PI ? 0 : Math.sign(s.ox) * 1.3), y0, s.oz - lx * sn + (s.ry === 0 ? 1.3 : s.ry === Math.PI ? -1.3 : 0), 0.07, fh, 0.07, 0)); }
        const [rx, rz] = off(1.3); scm.push(M(rx, f * fh + fh * 0.5, rz, s.l, 0.07, 0.07, s.ry), M(rx, f * fh + fh * 0.95, rz, s.l, 0.07, 0.07, s.ry));
      }
    }
    const nPer = (arr: THREE.Matrix4[]) => arr.length / F;
    this.nW = nPer(wm); this.per.walls = this.nW; this.per.insul = nPer(im); this.per.clad = nPer(cmx); this.per.winD = nPer(dm); this.per.winL = nPer(lm); this.per.mull = nPer(mm); this.per.balc = nPer(bm); this.per.scaf = nPer(scm);
    const wallColor = design.wallMat;
    this.walls = inst(BOX, mat(wallColor), wm); this.insul = inst(BOX, mat('#e3d9a6'), im, false);
    const cladColor = style === 'tugla' ? '#a9553a' : style === 'tas' ? '#d8cdb6' : style === 'metal' ? '#9ea8b3' : style === 'cam' ? pal.accent : pal.wall;
    this.clad = inst(BOX, mat(cladColor, { roughness: style === 'metal' ? 0.5 : 0.9, metalness: style === 'metal' ? 0.4 : 0 }), cmx);
    this.winD = inst(BOX, shared.glass, dm, false); this.winL = inst(BOX, shared.lit, lm, false);
    this.mull = mm.length ? inst(BOX, mat('#1d2630'), mm, false) : null; this.balc = bm.length ? inst(BOX, mat(pal.wall), bm) : null; this.rail = rm.length ? inst(BOX, new THREE.MeshStandardMaterial({ color: '#cfe4ee', transparent: true, opacity: 0.45, roughness: 0.2 }), rm, false) : null;
    this.scaf = inst(BOX, mat('#d9a400', { roughness: 0.6 }), scm, false);
    for (const m of [this.cols, this.slabs, this.walls, this.insul, this.clad, this.winD, this.winL, this.scaf]) g.add(m);
    for (const m of [this.mull, this.balc, this.rail]) if (m) g.add(m);
    // çukur + radye + filiz
    const earth = mat('#6b4e35'), pitW = w + 5, pitD = d + 5; g.add(this.pit);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(BOX, earth); m.receiveShadow = true; this.pitWalls.push(m); this.pit.add(m); }
    this.pitBottom = new THREE.Mesh(BOX, mat('#4a3626')); this.pitBottom.scale.set(pitW, 0.3, pitD); this.pit.add(this.pitBottom);
    this.radye = new THREE.Mesh(BOX, shared.concrete); this.radye.castShadow = true; this.radye.receiveShadow = true; g.add(this.radye);
    const rb: THREE.Matrix4[] = []; for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) for (let k = 0; k < 3; k++) rb.push(M(-hw + (i * w) / nx + (k - 1) * 0.15, 1.1, -hd + (j * d) / nz, 0.06, 2.2, 0.06));
    this.rebar = inst(BOX, mat('#6b5a4a'), rb, false); g.add(this.rebar);
    // hologram (proje görseli)
    this.holoFill = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#3E7BFA', transparent: true, opacity: 0.08, depthWrite: false })); this.holoFill.scale.set(w, this.topH, d); this.holoFill.position.y = this.topH / 2;
    this.holo = new THREE.LineSegments(new THREE.EdgesGeometry(BOX), new THREE.LineBasicMaterial({ color: '#7fb0ff', transparent: true, opacity: 0.8 })); this.holo.scale.copy(this.holoFill.scale); this.holo.position.copy(this.holoFill.position); g.add(this.holoFill, this.holo);
    // çatı
    g.add(this.roofTop); const rm2 = mat(pal.roof, { roughness: 0.8 });
    const add = (m: THREE.Mesh) => { m.castShadow = true; this.roofParts.push(m); this.roofTop.add(m); return m; };
    if (roof === 'egimli' || roof === 'sanayi') {
      const rh = roof === 'sanayi' ? Math.min(w, d) * 0.07 : Math.min(w, d) * 0.3, alongX = w >= d, L = (alongX ? w : d) + 1.2, Wd = (alongX ? d : w) + 1.2;
      const shape = new THREE.Shape([new THREE.Vector2(-Wd / 2, 0), new THREE.Vector2(Wd / 2, 0), new THREE.Vector2(0, rh)]); const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
      const m = add(new THREE.Mesh(geo, roof === 'sanayi' ? mat('#8d98a3', { metalness: 0.5, roughness: 0.5 }) : rm2)); if (alongX) m.rotation.y = Math.PI / 2; m.position.y = this.topH + 0.16;
      if (roof === 'sanayi') for (let i = 0; i < 2; i++) { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 5, 8), mat('#6b7580'))); c.position.set(-hw * 0.4 + i * hw * 0.5, this.topH + 2.6, hd * 0.3); }
    } else {
      for (const [sx, sz, ox, oz] of [[w + 0.9, 0.3, 0, hd + 0.45], [w + 0.9, 0.3, 0, -hd - 0.45], [0.3, d + 0.9, hw + 0.45, 0], [0.3, d + 0.9, -hw - 0.45, 0]] as const) { const m = add(new THREE.Mesh(BOX, mat(pal.wall))); m.scale.set(sx, 0.9, sz); m.position.set(ox, this.topH + 0.6, oz); }
      const m1 = add(new THREE.Mesh(BOX, mat('#8d98a3', { metalness: 0.4 }))); m1.scale.set(w * 0.3, 1.6, d * 0.25); m1.position.set(-w * 0.2, this.topH + 1.1, d * 0.12);
      const tank = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10), mat('#c9ced4'))); tank.position.set(w * 0.22, this.topH + 1.1, -d * 0.15);
      if (roof === 'tac') { const crown = add(new THREE.Mesh(BOX, mat(pal.accent))); crown.scale.set(w * 0.6, fh * 1.4, d * 0.6); crown.position.y = this.topH + fh * 0.7 + 0.2; const ant = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 8, 6), mat('#cfd3d8'))); ant.position.y = this.topH + fh * 1.4 + 4; }
    }
    // çatı grubu kat hizasında pivotlanır: ölçek yukarı doğru büyür
    for (const p of this.roofParts) p.position.y -= this.topH; this.roofTop.position.y = this.topH; this.roofTop.visible = false;
  }

  /** Bu bloğun şantiyedeki ground-hole dikdörtgeni (x,z merkez; w,d). */
  get hole() { return { x: this.x, z: this.z, w: this.w + 5, d: this.d + 5 }; }
  get topY() { return this.topH; }

  update(u: number, time: number, night: number, design: ReturnType<typeof designOf>, occ = 0) {
    const F = this.F, fh = this.fh, w = this.w, d = this.d;
    const dig = ramp(u, 6, 7), back = ramp(u, 7.6, 8.0), depth = 4.5 * dig * (1 - back);
    // çukur
    this.pit.visible = depth > 0.02; const pw = w + 5, pd = d + 5;
    if (this.pit.visible) {
      const th = 0.6; const c = [[pw, th, 0, pd / 2], [pw, th, 0, -pd / 2], [th, pd, pw / 2, 0], [th, pd, -pw / 2, 0]] as const;
      this.pitWalls.forEach((m, i) => { const [sx, sz, ox, oz] = c[i]!; const horiz = i < 2; m.scale.set(horiz ? pw : th, depth, horiz ? th : pd); m.position.set(ox, -depth / 2, oz); void sx; void sz; });
      this.pitBottom.position.set(0, -depth, 0);
    }
    // radye + filiz
    const slab = ramp(u, 7, 7.6); this.radye.visible = slab > 0.01; if (this.radye.visible) { const top = Math.max(0.35, -depth + 1.0); this.radye.scale.set(w + 1.6, Math.max(0.3, (top + depth)) * Math.min(1, slab * 1.4), d + 1.6); this.radye.position.set(0, -depth + this.radye.scale.y / 2, 0); }
    this.rebar.count = Math.floor(this.rebar.instanceMatrix.count * ramp(u, 7.15, 7.5)); this.rebar.visible = u < 9.1 && u > 7.1;
    // taşıyıcı: kat sayısı (kesirli)
    const f = ramp(u, 8, 9) * 1 + ramp(u, 9, 10) * (F - 1), fi = Math.floor(f), fr = f - fi;
    this.cols.count = Math.min(F * this.nc, Math.floor(f * this.nc)); this.slabs.count = Math.max(0, Math.min(F, Math.floor(f + 0.65))); // kat %35 olunca döşemesi görünür; asla geri gitmez
    void fr;
    const coreH = Math.max(0, Math.min(F, f + 0.6)) * fh; this.core.visible = coreH > 0.1; this.core.scale.set(Math.min(w, d) * 0.3, coreH, Math.min(w, d) * 0.3); this.core.position.set(w * 0.15, coreH / 2, 0);
    const inKatlar = u >= 8 && u < 10; this.formwork.visible = inKatlar; if (inKatlar) { this.formwork.scale.set(w + 1.2, fh * 0.8, d + 1.2); this.formwork.position.set(0, Math.min(F - 1, fi) * fh + fh * 0.95, 0); }
    // duvar / yalıtım / cephe / pencere / iskele
    const ct = (m: THREE.InstancedMesh, per: number, frac: number) => (m.count = Math.min(m.instanceMatrix.count, Math.floor(frac * F * per)));
    ct(this.walls, this.per.walls!, ramp(u, 10, 11)); ct(this.insul, this.per.insul!, ramp(u, 12, 13)); ct(this.clad, this.per.clad!, ramp(u, 13, 14));
    const win = ramp(u, 14, 15); ct(this.winD, this.per.winD!, win); ct(this.winL, this.per.winL!, win);
    if (this.mull) ct(this.mull, this.per.mull!, ramp(u, 14, 14.8)); if (this.balc) ct(this.balc, this.per.balc!, ramp(u, 13.4, 14.2)); if (this.rail) ct(this.rail, this.per.balc!, ramp(u, 14, 15));
    const scafUp = ramp(u, 10, 11), scafDown = ramp(u, 16, 16.7); this.scaf.visible = u > 10 && u < 16.7; ct(this.scaf, this.per.scaf!, scafUp * (1 - scafDown));
    // çatı
    const roofShow = ramp(u, 13, 14); this.roofTop.visible = roofShow > 0.02; this.roofTop.scale.setScalar(1); this.roofTop.scale.y = Math.max(0.01, roofShow);
    // hologram
    const holo = ramp(u, 2, 3) * (1 - ramp(u, 8, 9.2)); this.holo.visible = this.holoFill.visible = holo > 0.01; if (this.holo.visible) { const pulse = 0.65 + 0.2 * Math.sin(time * 2); (this.holo.material as THREE.LineBasicMaterial).opacity = holo * pulse; (this.holoFill.material as THREE.MeshBasicMaterial).opacity = holo * 0.09; }
    // gece pencere ışığı: iç işler başladıkça artar
    const interior = ramp(u, 14.5, 16.5); this.glassLit.emissiveIntensity = (0.12 + night * 2.2) * interior * (0.3 + 0.7 * occ); void design;
  }
}

export class SiteBuilding {
  group = new THREE.Group(); blocks: Block[] = []; design: ReturnType<typeof designOf>; fh: number; F: number;
  private glass: THREE.MeshStandardMaterial; private lit: THREE.MeshStandardMaterial;
  holes: { x: number; z: number; w: number; d: number }[] = [];
  constructor(public spec: BuildingSpec, use: 'konut' | 'ticari' | 'sanayi') {
    this.design = designOf(spec); this.fh = FH[use]; this.F = Math.max(1, spec.floors);
    this.glass = new THREE.MeshStandardMaterial({ color: this.design.pal.glass, metalness: 0.55, roughness: 0.18, flatShading: true });
    this.lit = new THREE.MeshStandardMaterial({ color: this.design.pal.glass, metalness: 0.3, roughness: 0.25, emissive: new THREE.Color('#ffc27a'), emissiveIntensity: 0.1, flatShading: true });
    const concrete = mat('#a7aaa6', { roughness: 0.95 });
    const nb = this.design.blocks, perFoot = spec.footprint / nb, asp = this.design.aspect;
    let w = Math.sqrt(perFoot * asp), d = perFoot / w;
    const maxW = spec.plotW - 7, maxD = spec.plotD - 7; const sc = Math.max(0.25, Math.min(1, (maxW - (nb - 1) * 9) / (nb * w), maxD / d)); w *= sc; d *= sc;
    const startX = -((nb - 1) * (w + 9)) / 2;
    for (let i = 0; i < nb; i++) {
      const b = new Block(w, d, startX + i * (w + 9), 0, this.F, this.fh, this.design, spec.seed + i * 977, { glass: this.glass, lit: this.lit, concrete });
      this.blocks.push(b); this.group.add(b.group); this.holes.push(b.hole);
    }
  }
  get topH() { return this.F * this.fh; }
  get extent() { const b = this.blocks[0]!; return { w: this.blocks.length * b.w + (this.blocks.length - 1) * 9, d: b.d }; }
  update(u: number, time: number, night: number, occ = 0) { for (const b of this.blocks) b.update(u, time, night, this.design, occ); }
  /** Şu an yapının en üst noktası (vinç yüksekliği ve işçi konumu için). */
  builtTop(u: number) { const f = ramp(u, 8, 9) * 1 + ramp(u, 9, 10) * (this.F - 1); return Math.max(0, f) * this.fh; }
}
