import * as THREE from 'three';
import { rng } from './siteBuilding';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const std = (c: string | number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true, ...o });
const YEL = std('#F5C542', { roughness: 0.6 }), DARK = std('#3a3f4a', { roughness: 0.8 });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, shadow = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = shadow; o.receiveShadow = true; return o; };

/** Kule vinç: yükseklik değişebilir (bina yükseldikçe vinç de yükselir). */
export class TowerCrane {
  group = new THREE.Group(); private jib = new THREE.Group(); private trolley = new THREE.Group(); private cable: THREE.Mesh; private load = new THREE.Group(); private posts: THREE.Mesh[] = []; private struts: THREE.InstancedMesh; private beacon: THREE.Mesh; private head = new THREE.Group();
  private H = 20; private jibLen: number; phase: number;
  constructor(jibLen: number, phase = 0) {
    this.jibLen = jibLen; this.phase = phase;
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]] as const) { const p = mesh(BOX, YEL, dx, 0.5, dz, 0.35, 1, 0.35); this.posts.push(p); this.group.add(p); }
    this.struts = new THREE.InstancedMesh(BOX, YEL, 220); this.struts.castShadow = true; this.group.add(this.struts);
    this.group.add(this.head); this.head.add(this.jib);
    this.jib.add(mesh(BOX, YEL, (jibLen - 12) / 2, 0, 0, jibLen + 12, 0.85, 1.1), mesh(BOX, YEL, 0, 3, 0, 1.1, 6, 1.1), mesh(BOX, DARK, -9, -1.1, 0, 4, 2.2, 2), mesh(BOX, DARK, 2, -1.5, 1.2, 1.8, 1.8, 1.8));
    this.beacon = mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b2a' }), jibLen + 0.2, 0.7, 0, 1, 1, 1, false); this.jib.add(this.beacon);
    this.jib.add(this.trolley); this.trolley.add(mesh(BOX, DARK, 0, 0, 0, 1.5, 0.5, 1.3));
    this.cable = mesh(BOX, DARK, 0, -3, 0, 0.07, 1, 0.07, false); this.trolley.add(this.cable); this.trolley.add(this.load);
    this.load.add(mesh(BOX, YEL, 0, 0, 0, 0.7, 0.7, 0.7), mesh(BOX, std('#8b6b4a'), 0, -1.3, 0, 3, 1, 1.3));
    this.setHeight(20);
  }
  setHeight(h: number) {
    h = Math.max(10, h); if (Math.abs(h - this.H) < 0.01 && this.struts.count) return; this.H = h;
    for (const p of this.posts) { p.scale.y = h; p.position.y = h / 2; }
    let n = 0; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (let y = 2; y < h && n < 216; y += 3) for (const [rot, px, pz] of [[0, 0, -0.8], [0, 0, 0.8], [Math.PI / 2, -0.8, 0], [Math.PI / 2, 0.8, 0]] as const) { if (n >= 220) break; this.struts.setMatrixAt(n++, m.compose(p.set(px, y, pz), q.setFromAxisAngle(Y, rot), s.set(1.7, 0.16, 0.16))); }
    this.struts.count = n; this.struts.instanceMatrix.needsUpdate = true; this.head.position.y = h + 1.2;
  }
  animate(t: number, working: boolean, dt: number) {
    const tt = t + this.phase;
    const target = working ? Math.sin(tt * 0.22) * 1.2 + this.phase : this.jib.rotation.y; this.jib.rotation.y += (target - this.jib.rotation.y) * Math.min(1, dt * 2);
    const tr = working ? 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(tt * 0.45)) : this.trolley.position.x / this.jibLen; this.trolley.position.x += (this.jibLen * tr - this.trolley.position.x) * Math.min(1, dt * 2);
    const cl = Math.max(4, working ? 6 + this.H * 0.45 * (0.5 + 0.5 * Math.sin(tt * 0.38 + 1)) : 6);
    this.cable.scale.y = cl; this.cable.position.y = -cl / 2; this.load.position.y = -cl - 0.4; this.load.rotation.z = working ? Math.sin(tt * 1.3) * 0.05 : 0; this.load.visible = working;
    (this.beacon.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.2, 0.1).multiplyScalar(Math.sin(t * 4) > 0 ? 1 : 0.25);
  }
}

export class Excavator {
  group = new THREE.Group(); private boom = new THREE.Group(); private arm = new THREE.Group(); private bucket: THREE.Mesh; private body = new THREE.Group();
  constructor() {
    const o = std('#f08a24', { roughness: 0.6 });
    this.group.add(mesh(BOX, DARK, 0, 0.5, 0, 4, 1, 2.6)); this.group.add(this.body); this.body.position.y = 1;
    this.body.add(mesh(BOX, o, 0, 0.6, 0, 3, 1.2, 2.2), mesh(BOX, std('#9fc3d6', { metalness: 0.5 }), 0.6, 1.5, 0, 1.2, 1, 1.4));
    this.body.add(this.boom); this.boom.position.set(-1.4, 0.8, 0); this.boom.add(mesh(BOX, o, -2, 1, 0, 4.4, 0.5, 0.5)); this.boom.rotation.z = -0.5;
    this.boom.add(this.arm); this.arm.position.set(-4.2, 2, 0); this.arm.add(mesh(BOX, o, -1.4, 0, 0, 3, 0.4, 0.4)); this.arm.rotation.z = 0.9;
    this.bucket = mesh(BOX, DARK, -3, 0, 0, 1, 0.7, 1.1); this.arm.add(this.bucket);
  }
  animate(t: number, working: boolean) { if (working) { this.body.rotation.y = Math.sin(t * 0.5) * 0.6; this.boom.rotation.z = -0.5 + Math.sin(t * 0.9) * 0.18; this.arm.rotation.z = 0.9 + Math.sin(t * 0.9 + 1) * 0.35; } }
}

export function makeTruck(kind: 'dump' | 'mixer' | 'lorry', color: string) {
  const g = new THREE.Group(), body = std(color, { roughness: 0.6 });
  g.add(mesh(BOX, body, 0, 1.7, 3.4, 2.4, 2.2, 2.2), mesh(BOX, DARK, 0, 0.7, 0, 2.4, 0.5, 8));
  const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 8); wheel.rotateZ(Math.PI / 2);
  for (const z of [3.2, 0.2, -2.8]) for (const x of [-1.2, 1.2]) g.add(mesh(wheel, DARK, x, 0.55, z, 1, 1, 1, false));
  g.add(mesh(BOX, new THREE.MeshBasicMaterial({ color: '#fff2c4' }), 0, 1.1, 4.52, 1.8, 0.28, 0.1, false));
  let drum: THREE.Mesh | undefined;
  if (kind === 'dump') g.add(mesh(BOX, std('#FFB15C'), 0, 2.2, -1.4, 2.5, 1.8, 4.6));
  else if (kind === 'mixer') { drum = mesh(new THREE.CylinderGeometry(1.2, 1.4, 4.8, 10), std('#e4e4e0'), 0, 2.5, -1.2, 1, 1, 1); drum.rotation.x = Math.PI / 2 + 0.25; g.add(drum); }
  else { g.add(mesh(BOX, std('#d9d4c8'), 0, 2.2, -1.4, 2.5, 2.2, 4.8)); }
  return { group: g, drum };
}

/** Çit + levha + konteyner + malzeme yığınları; ağaçlar peyzaj aşamasında büyür. */
export class SiteProps {
  group = new THREE.Group(); dirt: THREE.Mesh; fence: THREE.InstancedMesh; trees: THREE.InstancedMesh; crowns: THREE.InstancedMesh; grass: THREE.Mesh; lamps: THREE.Mesh[] = []; piles = new THREE.Group(); stakes: THREE.InstancedMesh; sign: THREE.Mesh;
  private treeCount = 0;
  constructor(public plotW: number, public plotD: number, name: string, seed: number) {
    const r = rng(seed), g = this.group, hw = plotW / 2, hd = plotD / 2;
    // çit (gate güney kenarında boşluk)
    const fm: THREE.Matrix4[] = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const seg = 2.4; const add = (x: number, z: number, ry: number) => fm.push(new THREE.Matrix4().compose(p.set(x, 0.9, z), q.setFromAxisAngle(Y, ry), s.set(seg - 0.1, 1.8, 0.1)));
    for (let x = -hw + seg / 2; x < hw; x += seg) { if (Math.abs(x) > 5) add(x, hd, 0); add(x, -hd, 0); }
    for (let z = -hd + seg / 2; z < hd; z += seg) { add(hw, z, Math.PI / 2); add(-hw, z, Math.PI / 2); }
    this.fence = new THREE.InstancedMesh(BOX, std('#c9ccd2', { roughness: 0.5 }), fm.length); fm.forEach((x, i) => this.fence.setMatrixAt(i, x)); this.fence.castShadow = true; g.add(this.fence);
    // levha (proje adı)
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d')!;
    x.fillStyle = '#F5C542'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#1a1300'; x.font = '700 34px sans-serif'; x.fillText('İNŞAAT ALANI', 24, 56); x.font = '700 44px sans-serif'; x.fillText(name.slice(0, 18), 24, 130); x.font = '24px sans-serif'; x.fillText('Yetkisiz girilmez · Baret zorunlu', 24, 200);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.sign = mesh(BOX, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), -8, 2.6, hd + 0.4, 6, 3, 0.15); g.add(this.sign, mesh(BOX, DARK, -10.6, 1.3, hd + 0.4, 0.2, 2.6, 0.2), mesh(BOX, DARK, -5.4, 1.3, hd + 0.4, 0.2, 2.6, 0.2));
    // konteynerler
    const cm = [std('#2f7f9f'), std('#c4552b'), std('#7a8a3a')];
    for (let i = 0; i < 3; i++) g.add(mesh(BOX, cm[i]!, hw - 6, 1.25 + (i === 2 ? 2.5 : 0), -hd + 4 + (i % 2) * 3.2, 5.8, 2.5, 2.4));
    // plan aşaması kazıkları (kırmızı-beyaz bayraklı)
    const sm: THREE.Matrix4[] = []; for (const [sx, sz] of [[-hw + 2, -hd + 2], [hw - 2, -hd + 2], [hw - 2, hd - 2], [-hw + 2, hd - 2]] as const) sm.push(new THREE.Matrix4().compose(p.set(sx, 0.9, sz), q.identity(), s.set(0.08, 1.8, 0.08)));
    this.stakes = new THREE.InstancedMesh(BOX, std('#d64545'), 4); sm.forEach((x2, i) => this.stakes.setMatrixAt(i, x2)); g.add(this.stakes);
    // şantiye toprağı: peyzaj başlayana kadar çimin yerine
    this.dirt = mesh(new THREE.PlaneGeometry(plotW - 0.6, plotD - 0.6), std('#8a7250', { roughness: 1 }), 0, 0.025, 0, 1, 1, 1, false); this.dirt.rotation.x = -Math.PI / 2; g.add(this.dirt);
    // çim ve ağaçlar
    this.grass = mesh(new THREE.PlaneGeometry(plotW - 1, plotD - 1), std('#4d7a3c', { roughness: 1 }), 0, 0.03, 0, 1, 1, 1, false); this.grass.rotation.x = -Math.PI / 2; this.grass.visible = false; g.add(this.grass);
    this.treeCount = Math.min(30, Math.max(6, Math.round(plotW * plotD / 120)));
    this.trees = new THREE.InstancedMesh(BOX, std('#6b4a2f'), this.treeCount); this.crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), std('#3f8a4a'), this.treeCount);
    const tm = new THREE.Matrix4(), cmx = new THREE.Matrix4();
    for (let i = 0; i < this.treeCount; i++) {
      const edge = r(); const tx = (r() - 0.5) * (plotW - 4), tz = edge < 0.5 ? (r() < 0.5 ? -1 : 1) * (hd - 2 - r() * 2.5) : (r() - 0.5) * (plotD - 4), h = 3 + r() * 2.5;
      tm.compose(p.set(tx, h * 0.2, tz), q.identity(), s.set(0.3, h * 0.4, 0.3)); this.trees.setMatrixAt(i, tm); cmx.compose(p.set(tx, h * 0.4 + h * 0.5, tz), q.identity(), s.set(1.3 + r() * 0.8, h, 1.3 + r() * 0.8)); this.crowns.setMatrixAt(i, cmx);
    }
    this.trees.castShadow = this.crowns.castShadow = true; this.trees.count = this.crowns.count = 0; g.add(this.trees, this.crowns);
    // aydınlatma direkleri
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd89a' });
    for (const [lx, lz] of [[-hw + 3, hd - 3], [hw - 3, hd - 3], [hw - 3, -hd + 3], [-hw + 3, -hd + 3]] as const) { g.add(mesh(BOX, DARK, lx, 3.5, lz, 0.18, 7, 0.18)); const l = mesh(BOX, lampMat, lx, 7.1, lz, 0.9, 0.3, 0.9, false); this.lamps.push(l); g.add(l); }
    // malzeme yığınları
    g.add(this.piles); this.buildPiles(r, hw, hd);
  }
  private piles2: { id: string; g: THREE.Group }[] = [];
  private buildPiles(r: () => number, hw: number, hd: number) {
    const mk = (id: string, build: (g: THREE.Group) => void, x: number, z: number) => { const gr = new THREE.Group(); gr.position.set(x, 0, z); build(gr); this.piles.add(gr); this.piles2.push({ id, g: gr }); };
    mk('demir', (g) => { for (let i = 0; i < 4; i++) g.add(mesh(BOX, std('#6b5a4a'), 0, 0.2 + i * 0.28, 0, 6, 0.22, 0.9)); }, -hw + 6, -hd + 5);
    mk('tugla', (g) => { for (let i = 0; i < 3; i++) g.add(mesh(BOX, std('#b0623a'), (i - 1) * 1.7, 0.6, 0, 1.5, 1.2, 1.5)); }, hw - 7, hd - 6);
    mk('boru', (g) => { for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 8), std('#4a6fa5'), 0, 0.2 + i * 0.4, (i % 2) * 0.35 - 0.2)); (g.children as THREE.Mesh[]).forEach((c) => (c.rotation.z = Math.PI / 2)); }, -hw + 5, hd - 7);
    mk('cam', (g) => { for (let i = 0; i < 3; i++) g.add(mesh(BOX, std('#9fc3d6', { metalness: 0.4 }), 0, 0.9, i * 0.4, 3, 1.7, 0.12)); }, hw - 8, -hd + 6);
    mk('beton', (g) => { g.add(mesh(BOX, std('#b9bcb7'), 0, 0.5, 0, 3, 1, 2)); }, 0, -hd + 3);
  }
  /** Aşamaya göre hangi malzeme yığınları görünsün. */
  setStage(u: number) {
    const on: Record<string, boolean> = { demir: u >= 7 && u < 10.5, beton: u >= 7 && u < 10, tugla: u >= 9.5 && u < 12.5, boru: u >= 10.5 && u < 13, cam: u >= 13.5 && u < 15.6 };
    for (const p of this.piles2) p.g.visible = !!on[p.id];
    this.stakes.visible = u >= 1 && u < 7; this.sign.visible = true; this.dirt.visible = u < 16.4;
  }
  setLandscape(f: number) { this.grass.visible = f > 0.02; const n = Math.floor(this.treeCount * f); this.trees.count = this.crowns.count = n; }
}

/** İşçiler: ekip büyüklüğüne göre; yatay yürür, durup çalışır; iş durursa grup halinde bekler. */
export class Workers {
  mesh: THREE.InstancedMesh; heads: THREE.InstancedMesh; private st: { x: number; z: number; y: number; tx: number; tz: number; ty: number; wait: number; top: boolean }[] = []; private max = 24; n = 0; private r = rng(99);
  constructor() {
    this.mesh = new THREE.InstancedMesh(BOX, std('#ff7a1a'), this.max); this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 5), std('#f5d90a'), this.max);
    this.mesh.castShadow = this.heads.castShadow = true; this.mesh.frustumCulled = this.heads.frustumCulled = false; this.mesh.count = this.heads.count = 0;
    for (let i = 0; i < this.max; i++) this.st.push({ x: 0, z: 0, y: 0, tx: 0, tz: 0, ty: 0, wait: 0, top: false });
  }
  setCount(n: number, hw: number, hd: number) { n = Math.max(0, Math.min(this.max, n)); if (n > this.n) for (let i = this.n; i < n; i++) { const s = this.st[i]!; s.x = s.tx = (this.r() - 0.5) * hw; s.z = s.tz = hd + 2; } this.n = n; this.mesh.count = this.heads.count = n; }
  /** `stage`: aktif aşama (u). Görev aşamaya göre değişir: kazıda çukurda, betonda pompa çevresinde, cephede binanın dibinde, peyzajda dış alanda. */
  update(dt: number, t: number, active: boolean, hw: number, hd: number, topY: number, working: boolean, stage = 9, focus?: { x: number; z: number }) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.n; i++) {
      const w = this.st[i]!;
      if (working && active) {
        w.wait -= dt;
        if (w.wait <= 0) {
          w.top = i % 4 === 0 && topY > 4 && stage >= 8; const a = this.r() * Math.PI * 2; let rx = hw * 0.5 + 2 + this.r() * 4, rz = hd * 0.5 + 2 + this.r() * 4; w.wait = 3 + this.r() * 6;
          if (stage < 7.3) { w.tx = (this.r() - 0.5) * hw * 0.6; w.tz = (this.r() - 0.5) * hd * 0.6; w.ty = stage >= 6.1 ? -1.1 : 0; w.top = false; }               // kazı: çukur içinde
          else if (stage < 10.4 && focus && i % 3 !== 0) { w.tx = focus.x + (this.r() - 0.5) * 5; w.tz = focus.z + (this.r() - 0.5) * 5; w.ty = 0; w.top = false; }  // beton: pompa çevresinde
          else if (stage >= 11 && stage < 16) { rx = hw * 0.5 + 0.8 + this.r() * 1.6; rz = hd * 0.5 + 0.8 + this.r() * 1.6; w.tx = Math.cos(a) * rx; w.tz = Math.sin(a) * rz; w.ty = w.top ? topY * (0.3 + this.r() * 0.7) : 0; }   // cephe/iç: bina dibinde, bir kısmı iskelede
          else if (stage >= 16) { rx = hw * 0.9 + 2 + this.r() * 5; rz = hd * 0.9 + 2 + this.r() * 5; w.tx = Math.cos(a) * rx; w.tz = Math.sin(a) * rz; w.ty = 0; w.top = false; }  // peyzaj: dış alan
          else { w.tx = Math.cos(a) * rx; w.tz = Math.sin(a) * rz; w.ty = w.top ? topY : 0; }
        }
        const dx = w.tx - w.x, dz = w.tz - w.z, dist = Math.hypot(dx, dz), sp = Math.min(dist, 1.3 * dt); if (dist > 0.05) { w.x += (dx / dist) * sp; w.z += (dz / dist) * sp; }
        w.y += (w.ty - w.y) * Math.min(1, dt * 1.2);
      } else { // bekle: kapı yakınında dağıl
        const gx = -3 + (i % 6) * 1.2, gz = hd + 2.5 + Math.floor(i / 6) * 1.1; w.x += (gx - w.x) * Math.min(1, dt); w.z += (gz - w.z) * Math.min(1, dt); w.y += (0 - w.y) * Math.min(1, dt);
      }
      const bob = working && active ? Math.abs(Math.sin(t * 5 + i)) * 0.08 : 0, sit = !working || !active ? 0.25 : 0;
      this.mesh.setMatrixAt(i, m.compose(p.set(w.x, w.y + 0.5 - sit * 0.3 + bob, w.z), q.setFromAxisAngle(Y, i), s.set(0.5, 0.95 - sit, 0.32)));
      this.heads.setMatrixAt(i, m.compose(p.set(w.x, w.y + 1.15 - sit * 0.6 + bob, w.z), q.identity(), s.set(1, 1, 1)));
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.heads.instanceMatrix.needsUpdate = true;
  }
}

/** Yağmur (çizgiler) ve kar (noktalar). */
/** Şantiye tozu: çalışırken zeminden yükselen soluk toz bulutçukları (toplamsal karışım → sönerken kaybolur). */
let DUST_TEX: THREE.Texture | null = null; // örnekler arası paylaşılan toz dokusu (her şantiye açılışında yeniden üretilmez)
export class Dust {
  points: THREE.Points; private N: number; private pos: Float32Array; private col: Float32Array; private life: Float32Array; private vx: Float32Array; private vz: Float32Array;
  constructor(n: number) {
    this.N = n; this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.life = new Float32Array(n); this.vx = new Float32Array(n); this.vz = new Float32Array(n);
    for (let i = 0; i < n; i++) this.life[i] = Math.random();
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(this.pos, 3)).setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    let map: THREE.Texture | null = DUST_TEX;
    if (!map) try { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c2 = cv.getContext('2d')!; const gr = c2.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#0000'); c2.fillStyle = gr; c2.fillRect(0, 0, 32, 32); map = DUST_TEX = new THREE.CanvasTexture(cv); map.userData.shared = true; } catch { /* düz nokta */ }
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 3.2, ...(map ? { map } : {}), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    this.points.frustumCulled = false; this.points.visible = false;
  }
  update(dt: number, on: boolean, hw: number, hd: number) {
    this.points.visible = this.N > 0 && (on || this.anyAlive());
    if (!this.points.visible) return;
    for (let i = 0; i < this.N; i++) {
      this.life[i] = this.life[i]! - dt * 0.28;
      if (this.life[i]! <= 0) {
        if (!on) { this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; continue; }
        const a = Math.random() * Math.PI * 2, r = 0.55 + Math.random() * 0.8; this.life[i] = 0.6 + Math.random() * 0.4;
        this.pos[i * 3] = Math.cos(a) * hw * r; this.pos[i * 3 + 1] = 0.3 + Math.random() * 1.2; this.pos[i * 3 + 2] = Math.sin(a) * hd * r; this.vx[i] = (Math.random() - 0.5) * 0.8; this.vz[i] = (Math.random() - 0.5) * 0.8;
      }
      this.pos[i * 3] = this.pos[i * 3]! + this.vx[i]! * dt; this.pos[i * 3 + 1] = this.pos[i * 3 + 1]! + dt * 1.1; this.pos[i * 3 + 2] = this.pos[i * 3 + 2]! + this.vz[i]! * dt;
      const f = Math.max(0, this.life[i]!) * 0.38; this.col[i * 3] = f * 0.9; this.col[i * 3 + 1] = f * 0.82; this.col[i * 3 + 2] = f * 0.66;
    }
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
  private anyAlive() { for (let i = 0; i < this.N; i++) if (this.life[i]! > 0) return true; return false; }
}

export class Weather {
  rain: THREE.LineSegments; snow: THREE.Points; private N = 700; private pos!: Float32Array; private spos!: Float32Array;
  constructor() {
    this.pos = new Float32Array(this.N * 6); this.spos = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) { const x = (Math.random() - 0.5) * 120, y = Math.random() * 60, z = (Math.random() - 0.5) * 120; this.pos.set([x, y, z, x - 0.3, y - 2.2, z], i * 6); this.spos.set([x, y, z], i * 3); }
    this.rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(this.pos, 3)), new THREE.LineBasicMaterial({ color: '#a9c4d8', transparent: true, opacity: 0.5 }));
    this.snow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(this.spos, 3)), new THREE.PointsMaterial({ color: '#ffffff', size: 0.45, transparent: true, opacity: 0.9, depthWrite: false }));
    this.rain.frustumCulled = this.snow.frustumCulled = false; this.rain.visible = this.snow.visible = false;
  }
  update(dt: number, kind: 'acik' | 'yagmur' | 'kar', on: boolean, wind = 0) {
    this.rain.visible = on && kind === 'yagmur'; this.snow.visible = on && kind === 'kar';
    if (this.rain.visible) { for (let i = 0; i < this.N; i++) { let y = this.pos[i * 6 + 1]! - dt * 38, x = this.pos[i * 6]! + dt * wind * 9; if (y < 0) y += 60; if (x > 60) x -= 120; this.pos[i * 6 + 1] = y; this.pos[i * 6] = x; this.pos[i * 6 + 3] = x - 0.3 - wind * 1.1; this.pos[i * 6 + 4] = y - 2.2; } (this.rain.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; }
    if (this.snow.visible) { for (let i = 0; i < this.N; i++) { let y = this.spos[i * 3 + 1]! - dt * 3.2; if (y < 0) y += 60; this.spos[i * 3 + 1] = y; this.spos[i * 3] = this.spos[i * 3]! + Math.sin(y + i) * dt * 0.6 + dt * wind * 3; } (this.snow.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; }
  }
}


/** Yumuşak ışık hâlesi (toplamsal): gece makine farları ve çalışma lambaları. Tek paylaşılan doku. */
let GLOW_TEX: THREE.Texture | null = null;
export function makeGlow(color: string, size: number): THREE.Sprite {
  if (!GLOW_TEX) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d')!, g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#ffffff66'); g.addColorStop(1, '#0000'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); GLOW_TEX = new THREE.CanvasTexture(cv); GLOW_TEX.userData.shared = true; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  s.scale.set(size, size, 1); return s;
}

/** Beton pompası: sabit pompa kamyonu + eklemli bom; bomun ucundan beton akar (yalnızca beton aşamalarında ve çalışırken). */
export class ConcretePump {
  group = new THREE.Group(); private seg1: THREE.Mesh; private seg2: THREE.Mesh; private stream: THREE.Mesh; private splash: THREE.Mesh; private base = new THREE.Vector3(); private pos = new THREE.Vector3();
  constructor() {
    const t = makeTruck('lorry', '#6b6e78'); this.group.add(t.group);
    const orange = std('#FF8C32', { roughness: 0.55 });
    this.seg1 = mesh(BOX, orange, 0, 0, 0, 0.5, 1, 0.5); this.seg2 = mesh(BOX, orange, 0, 0, 0, 0.4, 1, 0.4);
    this.stream = mesh(new THREE.CylinderGeometry(0.22, 0.34, 1, 8), std('#9a9ea8', { roughness: 0.4 }), 0, 0, 0, 1, 1, 1, false); this.splash = mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.18, 10), std('#8c909a', { roughness: 0.5 }), 0, 0, 0, 1, 1, 1, false);
    this.group.add(this.seg1, this.seg2, this.stream, this.splash); this.base.set(0, 3.6, 0.5);
  }
  private seg(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) { const d = new THREE.Vector3().subVectors(b, a), len = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.y = len; m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
  /** `target`: bomun ucunun (bu grubun yerel uzayında) hedefi; `top`: dökülen döşemenin yüksekliği. */
  update(on: boolean, target: THREE.Vector3, top: number, t: number) {
    this.group.visible = on; if (!on) return;
    const elbow = new THREE.Vector3((this.base.x + target.x) * 0.5, Math.max(this.base.y, target.y) + 3.2, (this.base.z + target.z) * 0.5), end = this.pos.copy(target);
    this.seg(this.seg1, this.base, elbow); this.seg(this.seg2, elbow, end);
    const drop = Math.max(0.5, end.y - top), flick = 0.92 + 0.08 * Math.sin(t * 22);
    this.stream.scale.set(1, drop, 1); this.stream.position.set(end.x, end.y - drop / 2, end.z); (this.stream.scale as THREE.Vector3).x = flick; this.splash.position.set(end.x, top + 0.1, end.z); this.splash.scale.setScalar(0.8 + 0.25 * Math.sin(t * 3));
  }
}
