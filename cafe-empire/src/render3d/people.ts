import * as THREE from 'three';
import { box, cyl, mat, type CafeRig, type Seat } from './builder';
import type { Branch, GameState, SimEvent } from '../core/types';

type Tip = 'ogrenci' | 'calisan' | 'turist' | 'aile' | 'cocuklu' | 'arkadas' | 'is' | 'emekli' | 'gecen';
const SKIN = [0xf3d3b8, 0xe8bf9b, 0xd6a37c, 0xb98160, 0x8d5a3c];
const HAIR = [0x1c1410, 0x3a2418, 0x6a4326, 0xb0834a, 0xd9c08a, 0x777777, 0x2a2a30];
const rnd = (seed: number) => { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pickOf = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)] as T;

interface Rig { root: THREE.Group; hips: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group; head: THREE.Group; torso: THREE.Mesh; extra: THREE.Object3D[]; h: number }
function mkLimb(len: number, w: number, m: THREE.Material): THREE.Group { const g = new THREE.Group(); const me = box(w, len, w, m, 0, -len / 2, 0); g.add(me); return g; }
export function makeHuman(tip: Tip, seed: number, child = false, uniform: { color: number } | null = null): Rig {
  const r = rnd(seed), sc = (child ? 0.62 : 0.93 + r() * 0.17) * (tip === 'emekli' ? 0.97 : 1), wide = 0.9 + r() * 0.3;
  const skin = mat(pickOf(r, SKIN), { rough: 0.7 }), hairC = pickOf(r, HAIR), hair = mat(hairC, { rough: 0.9 });
  const bright = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xec7063, 0xf5f5f5];
  let top = pickOf(r, bright), bottom = pickOf(r, [0x2c3e50, 0x34495e, 0x5d6d7e, 0x1b2631, 0x7b5e3a, 0x3b5b92]);
  if (tip === 'is') { top = 0x1d2733; bottom = 0x1d2733; } else if (tip === 'turist') { top = pickOf(r, [0xff7f50, 0x40e0d0, 0xffd700, 0xff69b4]); bottom = pickOf(r, [0xe6d3a3, 0x6fa8dc, 0xf5f5dc]); } else if (tip === 'calisan') { top = pickOf(r, [0xdfe6ee, 0x9fb6d3, 0xb8c7b3, 0xe3d5c0]); bottom = pickOf(r, [0x2c3e50, 0x3a3a3a, 0x4a5568]); } else if (tip === 'emekli') { top = pickOf(r, [0x8b7d6b, 0x7a8f7a, 0x9c8b9f]); bottom = 0x4a4a4a; }
  if (uniform) top = uniform.color;
  const topM = mat(top, { rough: 0.85 }), botM = mat(bottom, { rough: 0.9 }), shoe = mat(0x222222);
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.92; root.add(hips);
  const legL = mkLimb(0.9, 0.13 * wide, botM), legR = mkLimb(0.9, 0.13 * wide, botM); legL.position.set(-0.1 * wide, 0, 0); legR.position.set(0.1 * wide, 0, 0); legL.add(box(0.14, 0.07, 0.26, shoe, 0, -0.9, 0.05)); legR.add(box(0.14, 0.07, 0.26, shoe, 0, -0.9, 0.05)); hips.add(legL, legR);
  const torso = box(0.42 * wide, 0.58, 0.24, topM, 0, 0.3, 0); hips.add(torso);
  const armL = mkLimb(0.55, 0.1, topM), armR = mkLimb(0.55, 0.1, topM); armL.position.set(-0.27 * wide, 0.56, 0); armR.position.set(0.27 * wide, 0.56, 0); armL.add(box(0.09, 0.09, 0.09, skin, 0, -0.58, 0)); armR.add(box(0.09, 0.09, 0.09, skin, 0, -0.58, 0)); hips.add(armL, armR);
  const head = new THREE.Group(); head.position.y = 0.66; head.add(box(0.24, 0.26, 0.24, skin, 0, 0.16, 0)); hips.add(head);
  const style = Math.floor(r() * 4); if (style === 0) head.add(box(0.26, 0.1, 0.26, hair, 0, 0.3, 0)); else if (style === 1) { head.add(box(0.27, 0.1, 0.27, hair, 0, 0.3, 0)); head.add(box(0.27, 0.34, 0.08, hair, 0, 0.12, -0.12)); } else if (style === 2) { head.add(box(0.28, 0.12, 0.28, mat(pickOf(r, bright)), 0, 0.31, 0)); head.add(box(0.28, 0.03, 0.14, mat(0x333333), 0, 0.27, 0.16)); } else head.add(box(0.26, 0.07, 0.26, hair, 0, 0.29, 0));
  head.add(box(0.04, 0.04, 0.02, mat(0x222222), -0.06, 0.2, 0.125, false), box(0.04, 0.04, 0.02, mat(0x222222), 0.06, 0.2, 0.125, false));
  const extra: THREE.Object3D[] = [];
  if (tip === 'ogrenci' || tip === 'arkadas') { const bp = box(0.32, 0.4, 0.14, mat(pickOf(r, [0x2c3e50, 0xc0392b, 0x16a085])), 0, 0.32, -0.19); hips.add(bp); extra.push(bp); }
  if (tip === 'is') { const bc = box(0.34, 0.24, 0.08, mat(0x3a2a1c), 0, -0.52, 0.05); armR.add(bc); extra.push(bc); }
  if (tip === 'calisan') { const bg = box(0.3, 0.22, 0.1, mat(0x1f2d3d), -0.28, 0.12, 0.05); hips.add(bg); extra.push(bg); }
  if (tip === 'turist') { const cm = box(0.14, 0.1, 0.08, mat(0x111111), 0, 0.4, 0.16); hips.add(cm); head.add(box(0.36, 0.03, 0.36, mat(0xf0e6c8), 0, 0.3, 0)); extra.push(cm); }
  root.scale.setScalar(sc); root.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; }); return { root, hips, legL, legR, armL, armR, head, torso, extra, h: 1.75 * sc };
}

type St = 'walk' | 'look' | 'toDoor' | 'enter' | 'inside' | 'exit' | 'toSeat' | 'sit' | 'photo' | 'leave' | 'done';
class Person {
  rig: Rig; st: St = 'walk'; path: THREE.Vector3[] = []; speed = 1.3; timer = 0; seat: Seat | null = null; act = 0; phase = Math.random() * 6; tip: Tip; plan: { look: boolean; sure: number; paket: boolean; dis: boolean; photo: boolean } | null = null; sitFor = 0; bag: THREE.Mesh | null = null; staff = false; exitTo = 0;
  constructor(tip: Tip, seed: number, child = false, uniform: { color: number } | null = null) { this.tip = tip; this.rig = makeHuman(tip, seed, child, uniform); this.speed = (child ? 0.95 : 1.1) + (seed % 7) * 0.07; }
  get pos(): THREE.Vector3 { return this.rig.root.position; }
}

export class Crowd {
  scene: THREE.Scene; rig: CafeRig; people: Person[] = []; staffP: Person[] = []; doorTimer = 0; private t = 0; speedMul = 1; private uid = 1;
  constructor(scene: THREE.Scene, rig: CafeRig) { this.scene = scene; this.rig = rig; }
  setRig(rig: CafeRig): void { for (const p of this.people.concat(this.staffP)) this.scene.remove(p.rig.root); this.people = []; this.staffP = []; this.rig = rig; }
  get count(): number { return this.people.length; }
  private add(p: Person): void { this.scene.add(p.rig.root); this.people.push(p); }
  private edgeX(dir: number): number { return dir > 0 ? 24 : -24; }
  private sidewalkZ(): number { return 2.55 + Math.random() * 0.45; }
  /** Sim 'musteri' olayını görsel kişilere çevirir. */
  spawnCustomers(ev: Extract<SimEvent, { t: 'musteri' }>): void {
    if (this.people.length > 34) return; const n = ev.grup, tip = ev.tip as Tip, dir = Math.random() < 0.5 ? 1 : -1, freeSeats = this.rig.seats.filter((s) => !s.taken), wantSeat = ev.dis && !ev.paket && freeSeats.length >= 1;
  let seatList: Seat[] = []; if (wantSeat) { const t0 = freeSeats[Math.floor(Math.random() * freeSeats.length)]; if (t0) seatList = this.rig.seats.filter((s) => s.table === t0.table && !s.taken).slice(0, n); }
    for (let i = 0; i < n; i++) {
      const child = tip === 'cocuklu' && i === n - 1, ptip: Tip = tip === 'cocuklu' ? (child ? 'aile' : 'aile') : tip === 'arkadas' ? 'arkadas' : tip, p = new Person(ptip, ev.seed + i * 977 + this.uid++, child);
      p.plan = { look: Math.random() < 0.7, sure: ev.sure, paket: ev.paket, dis: !!seatList[i], photo: tip === 'turist' && Math.random() < 0.7 }; if (seatList[i]) { p.seat = seatList[i]!; p.seat.taken = true; }
      const z = this.sidewalkZ(), sx = this.edgeX(-dir) + (-dir * i * 0.7); p.pos.set(sx, 0, z); p.rig.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; p.st = 'walk'; p.exitTo = dir;
      const dp = this.rig.doorPos; p.path = [new THREE.Vector3(dp.x + (dir > 0 ? -3.2 : 3.2) + (i * 0.3), 0, z), new THREE.Vector3(dp.x + (i - n / 2) * 0.1, 0, 1.0)]; p.timer = 0; this.add(p);
    }
  }
  spawnAmbient(): void {
    if (this.people.length > 30) return; const dir = Math.random() < 0.5 ? 1 : -1, tips: Tip[] = ['gecen', 'calisan', 'ogrenci', 'turist', 'aile', 'emekli'], tip = tips[Math.floor(Math.random() * tips.length)]!;
    const p = new Person(tip === 'gecen' ? 'calisan' : tip, Math.floor(Math.random() * 1e6)); p.pos.set(this.edgeX(-dir), 0, this.sidewalkZ()); p.rig.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; p.st = 'leave'; p.path = [new THREE.Vector3(this.edgeX(dir), 0, p.pos.z)]; this.add(p);
  }
  setStaff(b: Branch): void {
    const want: Array<'servis' | 'temizlik' | 'barista'> = []; if (b.staff.some((e) => e.tip === 'servis')) want.push('servis'); if (b.staff.some((e) => e.tip === 'temizlik')) want.push('temizlik'); if (b.staff.filter((e) => e.tip === 'barista').length >= 2 && !want.includes('servis')) want.push('barista');
    for (const p of this.staffP) this.scene.remove(p.rig.root); this.staffP = [];
    want.forEach((k, i) => { const p = new Person('calisan', 4242 + i * 31, false, { color: k === 'temizlik' ? 0x2f9e6b : 0xc4722a }); p.staff = true; p.act = i; p.pos.set(this.rig.doorPos.x + 0.9 + i * 0.5, 0, 0.9); p.st = 'sit'; p.timer = 2 + Math.random() * 3; p.plan = { look: false, sure: 0, paket: false, dis: false, photo: false }; p.exitTo = k === 'temizlik' ? 2 : 1; this.scene.add(p.rig.root); this.staffP.push(p); });
  }
  private openDoor(): void { this.doorTimer = 1.5; }
  private walk(p: Person, dt: number): boolean {
    const tgt = p.path[0]; if (!tgt) return true; const d = tgt.clone().sub(p.pos); d.y = 0; const dist = d.length(), step = p.speed * dt * this.speedMul;
    if (dist <= step) { p.pos.copy(tgt); p.path.shift(); return p.path.length === 0; } d.normalize(); p.pos.addScaledVector(d, step); const ang = Math.atan2(d.x, d.z); let da = ang - p.rig.root.rotation.y; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; p.rig.root.rotation.y += da * Math.min(1, dt * 9); return false;
  }
  private pose(p: Person, walking: boolean, dt: number): void {
    const r = p.rig; p.phase += dt * (walking ? 7.5 * this.speedMul * (p.speed / 1.3) : 0);
    if (walking) { const s = Math.sin(p.phase) * 0.7; r.legL.rotation.x = s; r.legR.rotation.x = -s; r.armL.rotation.x = -s * 0.8; r.armR.rotation.x = s * 0.8; r.hips.position.y = 0.92 + Math.abs(Math.sin(p.phase)) * 0.025; r.torso.rotation.z = Math.sin(p.phase) * 0.03; }
    else { r.legL.rotation.x *= 0.8; r.legR.rotation.x *= 0.8; r.armL.rotation.x *= 0.85; r.armR.rotation.x *= 0.85; r.hips.position.y += (0.92 - r.hips.position.y) * 0.2; }
  }
  private sitPose(p: Person, dt: number): void {
    const r = p.rig; r.hips.position.y += (0.5 - r.hips.position.y) * 0.25; r.legL.rotation.x += (-Math.PI / 2 - r.legL.rotation.x) * 0.25; r.legR.rotation.x += (-Math.PI / 2 - r.legR.rotation.x) * 0.25; p.phase += dt;
    const a = p.act; if (a === 0) { r.armR.rotation.x = -1.2 + Math.sin(p.phase * 1.5) * 0.5; r.armL.rotation.x = -0.6; r.head.rotation.y = Math.sin(p.phase * 0.7) * 0.15; }   // kahve içer
    else if (a === 1) { r.armL.rotation.x = -1.1; r.armR.rotation.x = -1.1; r.head.rotation.x = 0.3; r.armL.rotation.z = 0.2; r.armR.rotation.z = -0.2; }                               // telefon
    else if (a === 2) { r.head.rotation.y = Math.sin(p.phase * 0.9) * 0.5; r.armR.rotation.x = -0.5 + Math.sin(p.phase * 2.6) * 0.5; r.armL.rotation.x = -0.4; }                           // sohbet
    else { r.armR.rotation.x = -2.6; r.head.rotation.x = -0.1; r.armL.rotation.x = -0.3; }                                                                                                   // fotoğraf
  }
  update(dt: number, speed: number): void {
    this.t += dt; this.speedMul = Math.min(1.8, Math.max(0.7, speed)); const keep: Person[] = [];
    for (const p of this.people) {
      const rr = p.rig.root;
      switch (p.st) {
        case 'walk': { const done = this.walk(p, dt); this.pose(p, true, dt); const dp = this.rig.doorPos; if (p.path.length === 1 && p.plan?.look && Math.abs(p.pos.x - dp.x) < 5) { p.st = 'look'; p.timer = 0.9 + Math.random() * 0.8; } else if (done) p.st = 'toDoor'; break; }
        case 'look': { this.pose(p, false, dt); p.timer -= dt; const dp = this.rig.doorPos; const a = Math.atan2(dp.x - p.pos.x, 3); rr.rotation.y += (a - rr.rotation.y) * 0.1; p.rig.head.rotation.y = Math.sin(this.t * 3) * 0.1; p.rig.head.rotation.x = -0.25; if (p.timer <= 0) { p.rig.head.rotation.x = 0; if (p.plan?.photo) { p.st = 'photo'; p.timer = 1.6; p.act = 3; } else { p.st = 'walk'; } } break; }
        case 'photo': { this.sitPose(p, dt); p.rig.hips.position.y = 0.92; p.rig.legL.rotation.x = 0; p.rig.legR.rotation.x = 0; p.timer -= dt; if (p.timer <= 0) { p.act = 0; p.rig.armR.rotation.x = 0; p.st = 'walk'; } break; }
        case 'toDoor': { const done = this.walk(p, dt); this.pose(p, true, dt); if (done) { p.st = 'enter'; p.timer = 0.5; this.openDoor(); rr.rotation.y = 0; } break; }
        case 'enter': { this.pose(p, true, dt * 0.6); rr.position.z -= dt * 1.4; p.timer -= dt; rr.scale.multiplyScalar(0.985); if (p.timer <= 0) { rr.visible = false; p.st = 'inside'; p.timer = Math.max(2.5, Math.min(10, (p.plan?.sure ?? 15) * 0.28)) / Math.sqrt(this.speedMul); rr.scale.setScalar(1); } break; }
        case 'inside': { p.timer -= dt; if (p.timer <= 0) { rr.visible = true; this.openDoor(); rr.position.copy(this.rig.doorPos).setY(0); rr.position.z = 0.35; rr.rotation.y = 0; if (p.plan?.paket && !p.bag) { p.bag = box(0.22, 0.28, 0.1, mat(0xc4a46a), 0, -0.52, 0.06); p.rig.armL.add(p.bag); } p.st = 'exit'; p.timer = 0.4; } break; }
        case 'exit': { rr.position.z += dt * 1.2; this.pose(p, true, dt); p.timer -= dt; if (p.timer <= 0) { if (p.seat && p.plan?.dis) { p.path = [new THREE.Vector3(this.rig.doorPos.x + (p.seat.pos.x - this.rig.doorPos.x) * 0.0, 0, 1.2), new THREE.Vector3(p.seat.pos.x, 0, Math.max(0.9, p.seat.pos.z + (p.seat.pos.z < 1.5 ? 0.3 : 0)))]; p.path = [new THREE.Vector3(p.seat.pos.x, 0, 1.15), p.seat.pos.clone()]; p.st = 'toSeat'; } else { const dir = p.exitTo || 1; p.path = [new THREE.Vector3(this.rig.doorPos.x, 0, 1.6), new THREE.Vector3(this.edgeX(dir), 0, this.sidewalkZ())]; p.st = 'leave'; } } break; }
        case 'toSeat': { const done = this.walk(p, dt); this.pose(p, true, dt); if (done && p.seat) { rr.position.copy(p.seat.pos); rr.rotation.y = p.seat.face; p.st = 'sit'; p.act = Math.floor(Math.random() * 3); p.sitFor = (3 + (p.plan?.sure ?? 20) * 0.25) / Math.sqrt(this.speedMul); p.timer = p.sitFor; } break; }
        case 'sit': { this.sitPose(p, dt); p.timer -= dt; if (p.timer < p.sitFor * 0.5 && p.act === 0 && Math.random() < 0.002) p.act = 1 + Math.floor(Math.random() * 2); if (p.timer <= 0) { if (p.seat) p.seat.taken = false; p.seat = null; p.rig.hips.position.y = 0.92; p.rig.legL.rotation.x = 0; p.rig.legR.rotation.x = 0; p.rig.armR.rotation.x = 0; p.rig.armL.rotation.x = 0; const dir = p.exitTo || 1; p.path = [new THREE.Vector3(rr.position.x, 0, 2.3), new THREE.Vector3(this.edgeX(dir), 0, this.sidewalkZ())]; p.st = 'leave'; } break; }
        case 'leave': { const done = this.walk(p, dt); this.pose(p, true, dt); if (done) p.st = 'done'; break; }
        default: break;
      }
      if (p.st === 'done') { this.scene.remove(rr); if (p.seat) p.seat.taken = false; } else keep.push(p);
    }
    this.people = keep;
    for (const e of this.staffP) this.staffUpdate(e, dt);
    const open = this.doorTimer > 0; if (open) this.doorTimer -= dt; const target = open ? -1.45 : 0; this.rig.door.rotation.y += (target - this.rig.door.rotation.y) * Math.min(1, dt * 7);
  }
  private staffUpdate(e: Person, dt: number): void {
    const rr = e.rig.root, kind = e.exitTo;                                   // 1: servis/barista, 2: temizlik
    if (e.st === 'sit') { this.pose(e, false, dt); e.timer -= dt; e.rig.head.rotation.y = Math.sin(this.t * 0.8 + e.act) * 0.4; if (e.timer <= 0) {
      if (kind === 2) { const t = this.rig.tables[Math.floor(Math.random() * this.rig.tables.length)]; if (t) { e.path = [new THREE.Vector3(t.x, 0, Math.max(1.0, t.z - 0.9))]; e.st = 'walk'; e.act = 5; } else e.timer = 3; }
      else { const used = this.rig.seats.filter((s) => s.taken); const s = used[Math.floor(Math.random() * used.length)]; if (s) { e.path = [new THREE.Vector3(s.pos.x, 0, Math.max(1.0, s.pos.z - 0.8))]; e.st = 'walk'; e.act = 4; } else e.timer = 3 + Math.random() * 3; } } return; }
    if (e.st === 'walk') { const done = this.walk(e, dt); this.pose(e, true, dt); if (e.act === 4 && !e.bag) { e.bag = box(0.3, 0.04, 0.3, mat(0xdddddd), 0, -0.5, 0.2); e.rig.armR.add(e.bag); } if (done) { e.st = 'look'; e.timer = 2.2; } return; }
    if (e.st === 'look') { this.pose(e, false, dt); e.timer -= dt; if (e.act === 5) e.rig.armR.rotation.x = -1.2 + Math.sin(this.t * 8) * 0.5; else e.rig.armR.rotation.x = -1.0; if (e.timer <= 0) { if (e.bag) { e.rig.armR.remove(e.bag); e.bag = null; } e.rig.armR.rotation.x = 0; e.path = [new THREE.Vector3(this.rig.doorPos.x + 0.9 + e.act * 0.1, 0, 0.9)]; e.st = 'leave'; } return; }
    if (e.st === 'leave') { const done = this.walk(e, dt); this.pose(e, true, dt); if (done) { e.st = 'sit'; e.timer = 3 + Math.random() * 5; rr.rotation.y = 0; } }
  }
}
export function stateHint(s: GameState): number { return s.hiz; }
export type { Seat };
void cyl;
