import * as THREE from 'three';
import type { Region } from '../data/geo';
import { rng } from './siteBuilding';
import { applyWindows } from './windowShader';

export interface SurroundSpec { plotW: number; plotD: number; roads: number; region: Region; density: number; seed: number }
type Q = 'low' | 'mid' | 'high';
const QUAL = { low: { radius: 78, trees: 0.4, cars: 8, clouds: 0, hills: 8 }, mid: { radius: 104, trees: 0.7, cars: 16, clouds: 5, hills: 14 }, high: { radius: 132, trees: 1, cars: 26, clouds: 9, hills: 20 } };

/** Bölge görünümü: zemin/ağaç/dağ renkleri ve bitki örtüsü türü. */
const BIOME: Record<Region, { grass: string; grass2: string; leaf: string[]; tree: 'broad' | 'conifer' | 'palm' | 'sparse'; treeDensity: number; hill: string; snow: boolean; ground: string }> = {
  'Marmara': { grass: '#5f9b45', grass2: '#74ad55', leaf: ['#3f8a47', '#4f9a4f', '#5aa356'], tree: 'broad', treeDensity: 1, hill: '#6a9a5a', snow: false, ground: '#6e9a52' },
  'Ege': { grass: '#86a24e', grass2: '#9ab45c', leaf: ['#6f8f4a', '#7f9b52', '#5f7f45'], tree: 'broad', treeDensity: 0.8, hill: '#a3a468', snow: false, ground: '#93a35a' },
  'Akdeniz': { grass: '#6fa84a', grass2: '#86b858', leaf: ['#3f9a4a', '#58aa52', '#2f8a46'], tree: 'palm', treeDensity: 0.9, hill: '#a8a070', snow: false, ground: '#8aae58' },
  'İç Anadolu': { grass: '#a9a463', grass2: '#bdb572', leaf: ['#7d8f4a', '#8a9a55'], tree: 'sparse', treeDensity: 0.35, hill: '#b09a6a', snow: true, ground: '#b3aa6c' },
  'Karadeniz': { grass: '#3f8f4a', grass2: '#4fa056', leaf: ['#2a6b3a', '#2f7a42', '#245f35'], tree: 'conifer', treeDensity: 1.5, hill: '#3d7a4a', snow: true, ground: '#4a8f50' },
  'Doğu Anadolu': { grass: '#8c9a5a', grass2: '#a0ac68', leaf: ['#6f8a4a', '#5f7a45'], tree: 'sparse', treeDensity: 0.4, hill: '#8a8f7a', snow: true, ground: '#97a064' },
  'Güneydoğu Anadolu': { grass: '#b0a468', grass2: '#c4b87a', leaf: ['#7a8a45', '#6a7a40'], tree: 'sparse', treeDensity: 0.3, hill: '#b89a68', snow: false, ground: '#bcae72' },
};
const FACADES = ['#f2e6cf', '#dfe4e8', '#f6f1e4', '#d9b48c', '#c7d0d4', '#efd8c0', '#e9c8c0', '#cfe0c8', '#e8d4a8', '#bcd3e0'].map((c) => new THREE.Color(c));
const ROOFS = ['#9a3a22', '#7a3a2a', '#5a4a40', '#3d4651', '#8a5a3a', '#4a5a6a'].map((c) => new THREE.Color(c));
const CARS = ['#d9d9d9', '#2b2f36', '#b02a2a', '#2d5fa8', '#e8e8e8', '#FFB15C', '#3f7f4f', '#7a7f88'].map((c) => new THREE.Color(c));
const BOX = new THREE.BoxGeometry(1, 1, 1);
const M4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz));

function speckle(base: string, a: string, b: string, size = 128, n = 700, r: () => number = Math.random): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d')!; x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) { x.fillStyle = r() < 0.5 ? a : b; x.globalAlpha = 0.18 + r() * 0.3; const s = 1 + r() * 3.2; x.fillRect(r() * size, r() * size, s, s); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function asphalt(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d')!; x.fillStyle = '#4b5059'; x.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 220; i++) { x.fillStyle = Math.random() < 0.5 ? '#5a6068' : '#3e434b'; x.globalAlpha = 0.5; x.fillRect(Math.random() * 256, Math.random() * 64, 2, 2); } x.globalAlpha = 1;
  x.fillStyle = '#f2f2ee'; for (let k = 0; k < 4; k++) x.fillRect(k * 64 + 8, 30, 36, 4); x.fillStyle = '#d9d9d2'; x.fillRect(0, 2, 256, 2); x.fillRect(0, 60, 256, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function soft(inner: string, outer: string): THREE.CanvasTexture { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

function gableGeo(): THREE.BufferGeometry { const sh = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5)]); const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g; }

/** Parselin çevresi: yollar, kaldırım, komşu konutlar/apartmanlar/parklar, ağaçlar, arabalar, sokak lambaları, dağlar, bulutlar. */
export class Surroundings {
  group = new THREE.Group();
  private B; private tier: Q = 'mid'; private trees: { m: THREE.InstancedMesh; n: number }[] = []; private carsB!: THREE.InstancedMesh; private carsC!: THREE.InstancedMesh; private cars: { lane: number; t: number; sp: number; axis: 'x' | 'z'; at: number }[] = [];
  private lampHeads!: THREE.InstancedMesh; private lampMat = new THREE.MeshBasicMaterial({ color: '#ffe8b0' }); private clouds: THREE.Sprite[] = []; private yardMats: THREE.MeshStandardMaterial[] = []; private groundMat: THREE.MeshStandardMaterial; private groundTex: THREE.CanvasTexture;
  private lots: { x: number; z: number; kind: 'apt' | 'house' | 'park' | 'garden'; d: number }[] = []; private groups: Record<string, THREE.Object3D[]> = { low: [], mid: [], high: [] };
  private ptsAll: { x: number; z: number; kind: 'broad' | 'conifer' | 'palm' | 'shrub'; h: number; s: number; col: THREE.Color; d: number }[] = [];
  constructor(private spec: SurroundSpec, private glow: { value: number }, groundMat: THREE.MeshStandardMaterial) {
    const r = rng(spec.seed ^ 0xabc1234), B = (this.B = BIOME[spec.region]); this.groundMat = groundMat;
    this.groundTex = speckle(B.ground, B.grass, B.grass2, 128, 900, r); this.groundTex.repeat.set(1 / 9, 1 / 9); groundMat.map = this.groundTex; groundMat.color.set('#ffffff'); groundMat.needsUpdate = true;
    this.layout(r); this.buildRoads(); this.buildLots(r); this.buildTrees(r); this.buildCars(r); this.buildLamps(); this.buildHills(r); this.buildClouds(r); this.setTier('mid');
  }
  private zFront() { return this.spec.plotD / 2 + 9; } private xRight() { return this.spec.plotW / 2 + 9; } private zBack() { return -this.spec.plotD / 2 - 9; }
  private onRoad(x: number, z: number, pad = 8) { const s = this.spec; return Math.abs(z - this.zFront()) < pad || (s.roads >= 2 && Math.abs(x - this.xRight()) < pad) || (s.roads >= 3 && Math.abs(z - this.zBack()) < pad); }

  /** Parsel çevresindeki hücreleri konut/apartman/park/bahçe olarak doldurur; parsele yakın hiçbir hücre boş kalmaz. */
  private layout(r: () => number) {
    const s = this.spec, cs = 22, urban = s.density / 100;
    for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
      const x = i * cs + (r() - 0.5) * 2, z = j * cs + (r() - 0.5) * 2; const d = Math.hypot(x, z);
      if (Math.abs(x) < s.plotW / 2 + 15 && Math.abs(z) < s.plotD / 2 + 15) continue;       // parsel + kenar şeridi
      if (this.onRoad(x, z, 8.5) || d > QUAL.high.radius) continue;
      const roll = r(), near = d < 60;
      let kind: 'apt' | 'house' | 'park' | 'garden';
      if (roll < 0.1 + 0.6 * urban) kind = 'apt'; else if (roll < 0.62 + 0.1 * urban) kind = 'house'; else kind = r() < 0.5 ? 'park' : 'garden';
      if (!near && urban < 0.3 && r() < 0.35) continue; // kırsalda uzak hücreler boş (tarla)
      this.lots.push({ x, z, kind, d });
    }
  }
  private buildRoads() {
    const s = this.spec, g = this.group, tex = asphalt(), road = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), walk = new THREE.MeshStandardMaterial({ color: '#b4b1a8', roughness: 0.9 }), curb = new THREE.MeshStandardMaterial({ color: '#d4d1c8' });
    const strip = (x: number, z: number, w: number, d: number, m: THREE.Material, y: number, rep?: [number, number]) => { const geo = new THREE.BoxGeometry(w, 0.1, d); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.receiveShadow = true; g.add(o); void rep; return o; };
    const L = 420;
    const roadH = (z: number) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(L / 16, 1); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); strip(0, z, L, 10, m, 0.04); strip(0, z - 6, L, 2.4, walk, 0.07); strip(0, z + 6, L, 2.4, walk, 0.07); strip(0, z - 5.1, L, 0.3, curb, 0.12); strip(0, z + 5.1, L, 0.3, curb, 0.12); };
    const roadV = (x: number) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(L / 16, 1); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); const o = strip(x, 0, 10, L, m, 0.04); o.rotation.y = Math.PI / 2; o.geometry.dispose(); o.geometry = new THREE.BoxGeometry(L, 0.1, 10); o.rotation.y = Math.PI / 2; strip(x - 6, 0, 2.4, L, walk, 0.07); strip(x + 6, 0, 2.4, L, walk, 0.07); strip(x - 5.1, 0, 0.3, L, curb, 0.12); strip(x + 5.1, 0, 0.3, L, curb, 0.12); };
    roadH(this.zFront()); if (s.roads >= 2) roadV(this.xRight()); if (s.roads >= 3) roadH(this.zBack());
    void road;
  }
  private buildLots(r: () => number) {
    const g = this.group, apt = this.lots.filter((l) => l.kind === 'apt'), houses = this.lots.filter((l) => l.kind === 'house');
    // apartmanlar (pencere gölgelendiricisi)
    const am = new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.85, flatShading: true }); applyWindows(am, this.glow); const ag = new THREE.BoxGeometry(1, 1, 1); ag.translate(0, 0.5, 0);
    const mats: THREE.Matrix4[] = [], cols: THREE.Color[] = [], roofM: THREE.Matrix4[] = [], roofC: THREE.Color[] = [];
    for (const l of apt) { const w = 11 + r() * 5, d = 11 + r() * 4, h = (3 + Math.floor(r() * 5)) * 3, ry = r() < 0.5 ? 0 : Math.PI / 2; mats.push(M4(l.x, 0, l.z, w, h, d, ry)); cols.push(FACADES[Math.floor(r() * FACADES.length)]!.clone().multiplyScalar(0.92 + r() * 0.12)); roofM.push(M4(l.x, h + 0.25, l.z, w + 0.8, 0.5, d + 0.8, ry)); roofC.push(new THREE.Color('#8a8f98')); }
    const aptMesh = new THREE.InstancedMesh(ag, am, Math.max(1, mats.length)); mats.forEach((m, i) => { aptMesh.setMatrixAt(i, m); aptMesh.setColorAt(i, cols[i]!); }); aptMesh.count = mats.length; aptMesh.castShadow = aptMesh.receiveShadow = true; g.add(aptMesh);
    const roofMesh = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: '#8a8f98', roughness: 0.9 }), Math.max(1, roofM.length)); roofM.forEach((m, i) => roofMesh.setMatrixAt(i, m)); roofMesh.count = roofM.length; g.add(roofMesh);
    // müstakil evler: gövde + beşik çatı + bahçe çiti
    const hm = new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.9, flatShading: true }); applyWindows(hm, this.glow); const hg = new THREE.BoxGeometry(1, 1, 1); hg.translate(0, 0.5, 0);
    const bm: THREE.Matrix4[] = [], bc: THREE.Color[] = [], rm: THREE.Matrix4[] = [], rc: THREE.Color[] = [], fm: THREE.Matrix4[] = [];
    for (const l of houses) { const w = 8 + r() * 3, d = 7 + r() * 3, h = r() < 0.5 ? 4.5 : 7.2, ry = Math.floor(r() * 4) * Math.PI / 2; bm.push(M4(l.x, 0, l.z, w, h, d, ry)); bc.push(FACADES[Math.floor(r() * FACADES.length)]!.clone()); rm.push(M4(l.x, h, l.z, w + 1, 3 + r(), d + 1, ry)); rc.push(ROOFS[Math.floor(r() * ROOFS.length)]!.clone());
      for (const [fx, fz, fw, fd] of [[0, 9, 16, 0.2], [0, -9, 16, 0.2], [8, 0, 0.2, 18], [-8, 0, 0.2, 18]] as const) fm.push(M4(l.x + fx, 0.6, l.z + fz, fw, 1.2, fd)); }
    const houseMesh = new THREE.InstancedMesh(hg, hm, Math.max(1, bm.length)); bm.forEach((m, i) => { houseMesh.setMatrixAt(i, m); houseMesh.setColorAt(i, bc[i]!); }); houseMesh.count = bm.length; houseMesh.castShadow = houseMesh.receiveShadow = true; g.add(houseMesh);
    const roofG = gableGeo(); const roof = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.85, flatShading: true }), Math.max(1, rm.length)); rm.forEach((m, i) => { roof.setMatrixAt(i, m); roof.setColorAt(i, rc[i]!); }); roof.count = rm.length; roof.castShadow = true; g.add(roof);
    const fence = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: '#e8e2d2', roughness: 0.8 }), Math.max(1, fm.length)); fm.forEach((m, i) => fence.setMatrixAt(i, m)); fence.count = fm.length; g.add(fence);
    // bahçe/park yaması: hücre zeminini çimle işaretler
    const B = this.B, yard = (c: string) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 1 }); this.yardMats.push(m); return m; };
    const yd = new THREE.PlaneGeometry(1, 1); yd.rotateX(-Math.PI / 2);
    for (const [kind, col, size] of [['house', B.grass2, 19], ['apt', '#8b9187', 20], ['park', B.grass2, 20], ['garden', B.grass, 20]] as const) {
      const ls = this.lots.filter((l) => l.kind === kind); if (!ls.length) continue; const m = new THREE.InstancedMesh(yd, yard(col), ls.length); ls.forEach((l, i) => m.setMatrixAt(i, M4(l.x, 0.03, l.z, size, 1, size))); m.receiveShadow = true; g.add(m);
    }
    // park yolları
    const pm = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: '#c9bfa5' }), Math.max(1, this.lots.length)); let pn = 0; for (const l of this.lots) if (l.kind === 'park') pm.setMatrixAt(pn++, M4(l.x, 0.06, l.z, 1.8, 0.05, 18)); pm.count = pn; g.add(pm);
  }
  private buildTrees(r: () => number) {
    const B = this.B, s = this.spec, pts = this.ptsAll;
    const add = (x: number, z: number, d: number, kind?: 'broad' | 'conifer' | 'palm' | 'shrub') => {
      const k = kind ?? (B.tree === 'sparse' ? (r() < 0.6 ? 'shrub' : 'broad') : B.tree === 'conifer' ? (r() < 0.8 ? 'conifer' : 'broad') : B.tree === 'palm' ? (r() < 0.45 ? 'palm' : 'broad') : 'broad');
      pts.push({ x, z, kind: k, h: 4 + r() * 3.5, s: 0.8 + r() * 0.6, col: new THREE.Color(B.leaf[Math.floor(r() * B.leaf.length)]!).multiplyScalar(0.9 + r() * 0.2), d });
    };
    // parsel yan şeritleri: konut yoksa bile yeşil kalsın (sol, arka, yolsuz sağ)
    const hw = s.plotW / 2, hd = s.plotD / 2, strip = (x0: number, x1: number, z0: number, z1: number, n: number) => { for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (!this.onRoad(x, z, 7)) add(x, z, Math.hypot(x, z), r() < 0.2 ? 'shrub' : undefined); } };
    const dens = Math.max(0.4, B.treeDensity);
    strip(-hw - 15, -hw - 2, -hd - 6, hd + 3, Math.round(16 * dens)); if (s.roads < 3) strip(-hw - 12, hw + 14, -hd - 15, -hd - 2, Math.round(16 * dens)); if (s.roads < 2) strip(hw + 2, hw + 15, -hd - 6, hd + 3, Math.round(14 * dens));
    // yol boyunca ağaçlar (kaldırım dışı)
    for (let x = -150; x < 150; x += 11 / dens) { if (Math.abs(x) > 10) add(x + (r() - 0.5) * 2, this.zFront() + 8.6, Math.abs(x), 'broad'); if (s.roads >= 3) add(x + (r() - 0.5) * 2, this.zBack() - 8.6, Math.abs(x), 'broad'); }
    // hücrelerde: park çok, bahçe orta, ev bahçesi az
    for (const l of this.lots) { const n = l.kind === 'park' ? 8 : l.kind === 'garden' ? 5 : l.kind === 'house' ? 3 : 1; for (let i = 0; i < Math.round(n * dens); i++) add(l.x + (r() - 0.5) * 17, l.z + (r() - 0.5) * 17, l.d); }
    // ağaç türleri için örnekli mesh'ler: gövde + taç(lar)
    const make = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length)); m.castShadow = true; m.count = 0; this.group.add(m); return m; };
    const trunk = make(BOX, new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 })), cBroad = make(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: 0.9 })),
      cCone = make(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true })), cPalm = make(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true })), cShrub = make(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true }));
    this.trees = [{ m: trunk, n: 0 }, { m: cBroad, n: 0 }, { m: cCone, n: 0 }, { m: cPalm, n: 0 }, { m: cShrub, n: 0 }];
    this.rebuildTrees();
  }
  /** Kaliteye göre ağaç sayısı: en yakın ağaçlar önce (sıralı) alınır. */
  private rebuildTrees() {
    const q = QUAL[this.tier], pts = [...this.ptsAll].sort((a, b) => a.d - b.d).filter((p) => p.d <= q.radius + 10); const keep = pts.slice(0, Math.floor(pts.length * Math.min(1, q.trees + 0.15)));
    const [trunk, cB, cC, cP, cS] = this.trees.map((t) => t.m) as THREE.InstancedMesh[]; let t = 0, nb = 0, nc = 0, np = 0, ns = 0;
    for (const p of keep) {
      if (p.kind === 'shrub') { cS!.setMatrixAt(ns, M4(p.x, 0.5 * p.s, p.z, 1.1 * p.s, 0.8 * p.s, 1.1 * p.s)); cS!.setColorAt(ns, p.col); ns++; continue; }
      const th = p.h * 0.45; trunk!.setMatrixAt(t++, M4(p.x, th / 2, p.z, 0.35, th, 0.35));
      if (p.kind === 'broad') { cB!.setMatrixAt(nb, M4(p.x, th + p.h * 0.3, p.z, p.h * 0.42 * p.s, p.h * 0.38 * p.s, p.h * 0.42 * p.s)); cB!.setColorAt(nb, p.col); nb++; }
      else if (p.kind === 'conifer') { cC!.setMatrixAt(nc, M4(p.x, th + p.h * 0.45, p.z, p.h * 0.28 * p.s, p.h * 1.0, p.h * 0.28 * p.s)); cC!.setColorAt(nc, p.col); nc++; }
      else { trunk!.setMatrixAt(t - 1, M4(p.x, p.h * 0.5, p.z, 0.3, p.h, 0.3)); cP!.setMatrixAt(np, M4(p.x, p.h + 0.2, p.z, 2.4, 0.5, 2.4)); cP!.setColorAt(np, p.col); np++; }
    }
    trunk!.count = t; cB!.count = nb; cC!.count = nc; cP!.count = np; cS!.count = ns; for (const m of [trunk, cB, cC, cP, cS]) { m!.instanceMatrix.needsUpdate = true; if (m!.instanceColor) m!.instanceColor.needsUpdate = true; }
  }
  private buildCars(r: () => number) {
    const s = this.spec; const N = QUAL.high.cars;
    this.carsB = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.5, metalness: 0.3 }), N); this.carsC = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: '#2a3340', roughness: 0.3, metalness: 0.5 }), N);
    this.carsB.castShadow = true; this.carsB.frustumCulled = this.carsC.frustumCulled = false; this.group.add(this.carsB, this.carsC);
    for (let i = 0; i < N; i++) { this.carsB.setColorAt(i, CARS[Math.floor(r() * CARS.length)]!); const rd = i % (s.roads >= 3 ? 3 : s.roads >= 2 ? 2 : 1); const axis = rd === 1 ? 'z' : 'x'; const at = rd === 0 ? this.zFront() : rd === 1 ? this.xRight() : this.zBack(); this.cars.push({ lane: i % 2 ? 1 : -1, t: r(), sp: 0.012 + r() * 0.012, axis, at }); }
  }
  private buildLamps() {
    const s = this.spec, ms: THREE.Matrix4[] = [], hs: THREE.Matrix4[] = [];
    const add = (x: number, z: number) => { ms.push(M4(x, 3.2, z, 0.16, 6.4, 0.16)); hs.push(M4(x, 6.5, z, 0.7, 0.25, 0.7)); };
    for (let x = -140; x <= 140; x += 22) { add(x, this.zFront() - 6.6); add(x + 11, this.zFront() + 6.6); if (s.roads >= 3) { add(x, this.zBack() - 6.6); add(x + 11, this.zBack() + 6.6); } }
    if (s.roads >= 2) for (let z = -140; z <= 140; z += 22) { add(this.xRight() - 6.6, z); add(this.xRight() + 6.6, z + 11); }
    const pole = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: '#4a5058' }), ms.length), head = new THREE.InstancedMesh(BOX, this.lampMat, hs.length);
    ms.forEach((m, i) => pole.setMatrixAt(i, m)); hs.forEach((m, i) => head.setMatrixAt(i, m)); this.lampHeads = head; this.group.add(pole, head);
  }
  private buildHills(r: () => number) {
    const B = this.B, N = QUAL.high.hills, g = this.group; const hg = new THREE.ConeGeometry(1, 1, 7); hg.translate(0, 0.5, 0);
    const hm = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: 1 }), N), sm = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: '#f4f7fa', flatShading: true, roughness: 0.9 }), N); let ns = 0;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.25, rad = 330 + r() * 120, h = 55 + r() * 95, w = 70 + r() * 70, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      hm.setMatrixAt(i, M4(x, 0, z, w, h, w * (0.8 + r() * 0.5))); hm.setColorAt(i, new THREE.Color(B.hill).multiplyScalar(0.8 + r() * 0.3));
      if (B.snow && h > 85) { sm.setMatrixAt(ns++, M4(x, h * 0.62, z, w * 0.42, h * 0.38, w * 0.42)); }
    }
    sm.count = ns; g.add(hm, sm);
  }
  private buildClouds(r: () => number) {
    const tex = soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
    for (let i = 0; i < QUAL.high.clouds; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false, fog: false })); sp.position.set((r() - 0.5) * 600, 120 + r() * 60, (r() - 0.5) * 600); sp.scale.set(90 + r() * 90, 36 + r() * 18, 1); this.clouds.push(sp); this.group.add(sp); }
  }

  setTier(q: Q) {
    this.tier = q; const c = QUAL[q];
    this.carsB.count = this.carsC.count = c.cars; this.clouds.forEach((cl, i) => (cl.visible = i < c.clouds)); this.rebuildTrees();
  }
  private wetKey = '';
  update(dt: number, time: number, night: number, weather: 'acik' | 'yagmur' | 'kar', animate: boolean) {
    this.lampMat.color.set('#ffe8b0').multiplyScalar(0.25 + night * 1.6); this.lampHeads.visible = true;
    const snow = weather === 'kar', rain = weather === 'yagmur';
    const wk = snow ? 's' : rain ? 'r' : 'c'; if (wk !== this.wetKey) { this.wetKey = wk; // yalnızca hava değişince (her karede malzeme yeniden derlenmez)
    this.groundMat.map = snow ? null : this.groundTex; this.groundMat.color.set(snow ? '#e8edf2' : rain ? '#8f9a8c' : '#ffffff'); this.groundMat.roughness = rain ? 0.4 : 1; this.groundMat.metalness = rain ? 0.14 : 0; this.groundMat.needsUpdate = true; } // ıslak zemin: koyulaşır, yansıma kazanır
    for (const m of this.yardMats) m.emissive.set(snow ? '#9aa4ae' : '#000000');
    const L = 150, m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    if (animate) for (const c of this.cars) c.t = (c.t + dt * c.sp) % 1;
    const n = this.carsB.count;
    for (let i = 0; i < n; i++) {
      const c = this.cars[i]!, a = (c.t * 2 - 1) * L * (c.lane > 0 ? 1 : -1), lane = c.lane * 2.4;
      const x = c.axis === 'x' ? a : c.at + lane, z = c.axis === 'x' ? c.at + lane : a, yaw = c.axis === 'x' ? (c.lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.lane > 0 ? 0 : Math.PI);
      this.carsB.setMatrixAt(i, m.compose(p.set(x, 0.75, z), q.setFromAxisAngle(Y, yaw), sc.set(1.9, 0.9, 4.2))); this.carsC.setMatrixAt(i, m.compose(p.set(x, 1.5, z), q, sc.set(1.7, 0.7, 2.2)));
    }
    this.carsB.instanceMatrix.needsUpdate = true; this.carsC.instanceMatrix.needsUpdate = true;
    for (const cl of this.clouds) { if (animate) { cl.position.x += dt * 1.4; if (cl.position.x > 320) cl.position.x = -320; } (cl.material as THREE.SpriteMaterial).opacity = (weather === 'acik' ? 0.7 : 0.95) * (1 - night * 0.8); (cl.material as THREE.SpriteMaterial).color.set(weather === 'acik' ? '#ffffff' : '#9aa3ad'); }
    void time;
  }
  dispose() { this.group.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); }); this.groundTex.dispose(); }
}
