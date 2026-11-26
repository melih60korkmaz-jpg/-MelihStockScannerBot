import * as THREE from 'three';
import { box, cyl, mat } from './builder';
import type { CafeRig } from './builder';

export type Weather = 'gunesli' | 'bulutlu' | 'yagmur' | 'kar';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const C = (h: number) => new THREE.Color(h);

/** Gökyüzü + ışık + hava + yol + trafik. İç mekân içermez. */
export class Env {
  scene: THREE.Scene; sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; moon: THREE.DirectionalLight;
  cars: Array<{ g: THREE.Group; dir: number; v: number; lights: THREE.MeshStandardMaterial }> = []; rain: THREE.LineSegments; snow: THREE.Points; clouds: THREE.Mesh[] = [];
  street = new THREE.Group(); opposite = new THREE.Group(); private t = 0; night = 0; weather: Weather = 'gunesli'; rig: CafeRig | null = null; private shadowSize: number;
  constructor(scene: THREE.Scene, mobile: boolean) {
    this.scene = scene; this.shadowSize = mobile ? 1024 : 2048;
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a48, 0.8); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2); this.sun.castShadow = true; this.sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
    const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 14; sc.bottom = -10; sc.near = 1; sc.far = 80; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03; scene.add(this.sun); scene.add(this.sun.target);
    this.moon = new THREE.DirectionalLight(0x8fa8ff, 0.0); this.moon.position.set(-8, 14, 12); scene.add(this.moon);
    scene.fog = new THREE.Fog(0xcfe3f5, 38, 90); scene.background = new THREE.Color(0xa8cdf0);
    this.buildStreet(); scene.add(this.street); scene.add(this.opposite);
    const rp = new Float32Array(900 * 6); this.rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: 0xcfe0f2, transparent: true, opacity: 0.55 })); this.rain.visible = false; this.rain.frustumCulled = false; scene.add(this.rain);
    const sp = new Float32Array(700 * 3); this.snow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9 })); this.snow.visible = false; this.snow.frustumCulled = false; scene.add(this.snow);
    for (let i = 0; i < 700; i++) { sp[i * 3] = (Math.random() - 0.5) * 40; sp[i * 3 + 1] = Math.random() * 14; sp[i * 3 + 2] = Math.random() * 24 - 4; }
    for (let i = 0; i < 900; i++) { const x = (Math.random() - 0.5) * 40, y = Math.random() * 14, z = Math.random() * 24 - 4; rp.set([x, y, z, x - 0.05, y - 0.5, z], i * 6); }
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false })); c.scale.set(5 + Math.random() * 4, 1.1, 2); c.position.set(-30 + i * 14, 16 + Math.random() * 4, -14 - Math.random() * 6); scene.add(c); this.clouds.push(c); }
    for (let i = 0; i < 7; i++) this.addCar(i);
  }
  private buildStreet(): void {
    const g = this.street; g.add(box(120, 0.2, 14, mat(0x4a4a4e, { rough: 0.95 }), 0, -0.1, 6.2, false)); g.children[0]!.receiveShadow = true;           // asfalt
    for (let x = -50; x < 50; x += 5) g.add(box(2.2, 0.01, 0.12, mat(0xe8e0c0), x, 0.02, 6.2, false));                                          // şerit çizgisi
    g.add(box(120, 0.22, 3.2, mat(0xb9b3a8, { rough: 0.9 }), 0, 0.01, 1.6)); g.add(box(120, 0.26, 0.2, mat(0x8a8a8a), 0, 0.12, 3.25));           // kaldırım + bordür
    for (let x = -50; x < 50; x += 1.6) g.add(box(0.03, 0.02, 3.2, mat(0x9d978c), x, 0.125, 1.6, false));                                       // kaldırım dokusu
    g.add(box(120, 0.22, 3.0, mat(0xb9b3a8), 0, 0.01, 10.7)); g.add(box(120, 0.26, 0.2, mat(0x8a8a8a), 0, 0.12, 9.2));
    g.add(box(120, 0.1, 30, mat(0x6b8a5a, { rough: 1 }), 0, -0.2, -10, false));                                                               // arka zemin
  }
  /** Karşı sıra: mahallenin görünümü (kafe tipine göre). Sahilde deniz. */
  setBackdrop(kiyi: boolean): void {
    this.opposite.clear(); const o = this.opposite;
    if (kiyi) { o.add(box(120, 0.2, 14, mat(0x1f77b8, { rough: 0.2, metal: 0.4 }), 0, -0.05, 18, false)); for (let i = 0; i < 8; i++) { const palm = new THREE.Group(); palm.position.set(-18 + i * 5, 0, 11.6); palm.add(cyl(0.1, 0.15, 3.2, mat(0x8a6a44), 0, 1.6, 0, 7)); for (let k = 0; k < 6; k++) { const leaf = box(0.12, 0.04, 1.4, mat(0x2f8a4a), 0, 0, 0); leaf.position.set(Math.sin(k) * 0.55, 3.2, Math.cos(k) * 0.55); leaf.rotation.set(0.45, k, 0); palm.add(leaf); } o.add(palm); } return; }
    const cols = [0xcdbfa6, 0xb8a692, 0xe0d6c4, 0xa9b7bd, 0xc9a98a, 0xd8cdb8]; let x = -40;
    for (let i = 0; i < 11; i++) { const w = 6 + (i * 7 % 4), h = 6 + (i * 5 % 6); o.add(box(w, h, 6, mat(cols[i % cols.length] ?? 0xcccccc), x + w / 2, h / 2, 26)); for (let r = 0; r < Math.floor(h / 3); r++) for (let k = 0; k < Math.floor(w / 2.2); k++) o.add(box(1.1, 1.3, 0.1, mat(0x9fc2d6, { rough: 0.2, metal: 0.4, emissive: 0x000000 }), x + 1.2 + k * 2.2, 2 + r * 3, 22.96)); x += w + 0.2; }
    for (let i = 0; i < 6; i++) { const t = new THREE.Group(); t.position.set(-26 + i * 9.5, 0, 10.9); t.add(cyl(0.1, 0.16, 1.5, mat(0x6b4a2c), 0, 0.75, 0, 6)); const l = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6), mat(0x4a9a52)); l.position.y = 2.1; l.castShadow = true; t.add(l); o.add(t); }
  }
  private addCar(i: number): void {
    const colors = [0xc0392b, 0x2c3e50, 0xe8e8e8, 0xf1c40f, 0x2e86c1, 0x27ae60, 0x7f8c8d, 0x111111], g = new THREE.Group(), body = colors[i % colors.length] ?? 0x888888, bus = i === 5, van = i === 2 || i === 6;
    const L = bus ? 7.5 : van ? 4.6 : 4.1, Hh = bus ? 2.6 : van ? 1.9 : 1.15; g.add(box(L, Hh * 0.55, 1.8, mat(bus ? 0xd35400 : body, { rough: 0.35, metal: 0.45 }), 0, 0.55 + Hh * 0.27, 0)); if (!bus) g.add(box(L * (van ? 0.9 : 0.5), Hh * 0.42, 1.65, mat(0x9fc2d6, { rough: 0.1, metal: 0.5 }), van ? 0 : -0.2, 0.55 + Hh * 0.55 + Hh * 0.2, 0)); else g.add(box(L - 0.4, 1.0, 1.82, mat(0x9fc2d6, { rough: 0.1, metal: 0.5 }), 0, 1.9, 0));
    for (const [wx, wz] of [[-L * 0.32, 0.9], [L * 0.32, 0.9], [-L * 0.32, -0.9], [L * 0.32, -0.9]] as const) { const w = cyl(0.34, 0.34, 0.24, mat(0x151515), wx, 0.34, wz, 10); w.rotation.x = Math.PI / 2; g.add(w); }
    const hl = mat(0xfff2c0, { emissive: 0xffe9a0, ei: 0 }) as THREE.MeshStandardMaterial; g.add(box(0.06, 0.18, 0.4, hl, L / 2, 0.75, 0.55, false)); g.add(box(0.06, 0.18, 0.4, hl, L / 2, 0.75, -0.55, false));
    const dir = i % 2 ? 1 : -1; g.position.set(-45 + i * 14, 0, dir > 0 ? 4.8 : 7.6); g.rotation.y = dir > 0 ? 0 : Math.PI; this.scene.add(g); this.cars.push({ g, dir, v: 4 + Math.random() * 3, lights: hl });
  }
  attach(rig: CafeRig): void { this.rig = rig; }
  update(dt: number, hour: number, weather: Weather, simSpeed: number): void {
    this.t += dt; this.weather = weather; const sp = Math.min(2.2, Math.max(0.2, simSpeed));
    /* gün döngüsü */
    const day = Math.max(0, Math.min(1, (hour - 6) / 13)), elev = Math.sin(day * Math.PI), isNight = hour < 5.8 || hour > 20.2, dusk = hour > 18 && hour < 20.4 ? 1 - Math.abs(hour - 19.2) / 1.2 : hour > 5.4 && hour < 7.2 ? 1 - Math.abs(hour - 6.3) / 0.9 : 0;
    const nightF = isNight ? 1 : hour > 19 ? (hour - 19) / 1.2 : hour < 7 ? Math.max(0, (6.4 - hour) / 1.2) : 0; this.night = Math.max(0, Math.min(1, nightF));
    const grey = weather === 'yagmur' || weather === 'kar' ? 0.55 : weather === 'bulutlu' ? 0.25 : 0;
    const dayCol = C(0xa8cdf0).lerp(C(0x9aa7b4), grey), nightCol = C(0x141d3a), duskCol = C(0xf1a56b);
    const sky = dayCol.clone().lerp(duskCol, Math.max(0, dusk) * (1 - grey) * 0.8).lerp(nightCol, this.night); (this.scene.background as THREE.Color).copy(sky); (this.scene.fog as THREE.Fog).color.copy(sky); (this.scene.fog as THREE.Fog).far = weather === 'yagmur' || weather === 'kar' ? 55 : 90;
    this.sun.intensity = lerp(0.1, 2.4, elev) * (1 - this.night) * (1 - grey * 0.65); const az = lerp(-Math.PI * 0.45, Math.PI * 0.45, day); this.sun.position.set(Math.sin(az) * 24, 6 + elev * 22, 10 + Math.cos(az) * 8); this.sun.target.position.set(0, 0, 2); this.sun.color.set(0xfff1d6).lerp(C(0xffb070), Math.max(0, dusk));
    this.hemi.intensity = lerp(0.9, 0.55, this.night) * (1 - grey * 0.2); this.moon.intensity = this.night * 0.9;
    /* ışıklandırmalar */
    const nl = this.night + (grey > 0.4 ? 0.25 : 0); if (this.rig) { for (const m of this.rig.ledMats) m.emissiveIntensity = Math.min(1.4, nl * 1.6) * (0.85 + 0.15 * Math.sin(this.t * 3)); for (const m of this.rig.glowMats) m.emissiveIntensity = Math.min(0.9, nl * 0.9); for (const m of this.rig.lampMats) m.emissiveIntensity = Math.min(1.8, nl * 2); }
    for (const c of this.cars) c.lights.emissiveIntensity = Math.min(1.5, nl * 2);
    /* bulutlar */
    for (const c of this.clouds) { c.position.x += dt * 0.5; if (c.position.x > 40) c.position.x = -40; (c.material as THREE.MeshBasicMaterial).opacity = (weather === 'gunesli' ? 0.55 : 0.9) * (1 - this.night * 0.85); (c.material as THREE.MeshBasicMaterial).color.set(grey > 0.4 ? 0xaab4be : 0xffffff).lerp(C(0x1a2236), this.night * 0.8); }
    /* yağış ve kar */
    this.rain.visible = weather === 'yagmur'; this.snow.visible = weather === 'kar';
    if (this.rain.visible) { const a = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < 900; i++) { let y = a.getY(i * 2) - dt * 16; if (y < 0) y += 14; const x = a.getX(i * 2); a.setXYZ(i * 2, x, y, a.getZ(i * 2)); a.setXYZ(i * 2 + 1, x - 0.05, y - 0.5, a.getZ(i * 2)); } a.needsUpdate = true; }
    if (this.snow.visible) { const a = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < 700; i++) { let y = a.getY(i) - dt * 1.6; if (y < 0) y += 14; a.setXYZ(i, a.getX(i) + Math.sin(this.t + i) * dt * 0.3, y, a.getZ(i)); } a.needsUpdate = true; }
    /* trafik */
    for (const c of this.cars) { c.g.position.x += c.dir * c.v * dt * sp; if (c.g.position.x > 50) c.g.position.x = -50 - Math.random() * 30; if (c.g.position.x < -50) c.g.position.x = 50 + Math.random() * 30; c.g.position.y = 0.02 * Math.sin(this.t * 12 + c.v); }
    /* ağaç ve tente rüzgârı */
    if (this.rig) { for (const [i, o] of this.rig.trees.entries()) { o.rotation.z = Math.sin(this.t * 1.6 + i) * 0.04; o.rotation.x = Math.cos(this.t * 1.3 + i) * 0.03; } for (const [i, f] of this.rig.flags.entries()) f.rotation.z = Math.sin(this.t * 1.2 + i * 2) * 0.03; }
  }
}
