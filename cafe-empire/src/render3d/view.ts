import * as THREE from 'three';
import { buildCafe, type CafeRig } from './builder';
import { Env, type Weather } from './env';
import { Crowd } from './people';
import { hourOf } from '../core/sim';
import { cityById } from '../data/turkey';
import type { Branch, GameState, SimEvent } from '../core/types';

export type CamPreset = 'cephe' | 'sol' | 'sag' | 'sokak' | 'sehir';
const PRESETS: Record<CamPreset, { yaw: number; pitch: number; dist: number; tx: number; ty: number }> = {
  cephe: { yaw: 0.5, pitch: 0.4, dist: 13, tx: 0, ty: 1.7 }, sol: { yaw: -0.95, pitch: 0.3, dist: 12, tx: -1, ty: 1.6 }, sag: { yaw: 1.0, pitch: 0.3, dist: 12, tx: 1, ty: 1.6 },
  sokak: { yaw: 0.2, pitch: 0.12, dist: 8.5, tx: 0, ty: 1.5 }, sehir: { yaw: 0.6, pitch: 0.78, dist: 34, tx: 0, ty: 0 },
};
/** Üç boyutlu dış görünüm. Kamera hiçbir zaman cephenin arkasına/içine geçemez. */
export class CafeView {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; env: Env; rig: CafeRig | null = null; crowd: Crowd | null = null; branchId = -1; private sig = '';
  private yaw = 0.5; private pitch = 0.42; private dist = 15; private tgt = new THREE.Vector3(0, 1.7, 1); private goal: { yaw: number; pitch: number; dist: number; tx: number; ty: number } | null = null;
  private last = performance.now(); private raf = 0; private ambientT = 0; private host: HTMLElement; private ro: ResizeObserver; private running = true; fps = 0; private fpsAcc = 0; private fpsN = 0;
  constructor(host: HTMLElement) {
    this.host = host; const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || innerWidth < 900;
    this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' }); this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.renderer.domElement); this.renderer.domElement.style.touchAction = 'none'; this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160); this.env = new Env(this.scene, mobile);
    this.resize(); this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host); this.bindControls(); this.applyCam(); this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }
  resize(): void { const w = this.host.clientWidth || 800, h = this.host.clientHeight || 400; this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%'; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private applyCam(): void {
    this.yaw = Math.max(-1.25, Math.min(1.25, this.yaw)); this.pitch = Math.max(0.08, Math.min(1.1, this.pitch)); this.dist = Math.max(6, Math.min(42, this.dist)); this.tgt.x = Math.max(-14, Math.min(14, this.tgt.x));
    const cp = Math.cos(this.pitch); this.camera.position.set(this.tgt.x + Math.sin(this.yaw) * this.dist * cp, this.tgt.y + Math.sin(this.pitch) * this.dist, Math.min(17, Math.max(1.2, this.tgt.z + Math.cos(this.yaw) * this.dist * cp))); this.camera.lookAt(this.tgt);
  }
  setPreset(p: CamPreset): void { const g = PRESETS[p], a = this.camera.aspect, k = Math.max(1, 1.55 / Math.max(0.5, a)); this.goal = { ...g, dist: g.dist * k }; }
  private bindControls(): void {
    const el = this.renderer.domElement, ptr = new Map<number, { x: number; y: number }>(); let pinch = 0;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.goal = null; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); } });
    el.addEventListener('pointermove', (e) => {
      const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptr.size === 1) { this.yaw -= dx * 0.006; this.pitch += dy * 0.004; this.applyCam(); } else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a!.x - b!.x, a!.y - b!.y); if (pinch) { this.dist *= pinch / d; this.applyCam(); } pinch = d; }
    });
    const up = (e: PointerEvent) => { ptr.delete(e.pointerId); pinch = 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.dist *= e.deltaY > 0 ? 1.08 : 0.92; this.goal = null; this.applyCam(); }, { passive: false });
    el.addEventListener('dblclick', () => this.setPreset('cephe'));
  }
  zoom(f: number): void { this.dist *= f; this.goal = null; this.applyCam(); }
  /** Şube değiştiğinde ya da geliştirme yapıldığında dükkânı yeniden kurar. */
  show(s: GameState, b: Branch): void {
    const sig = [b.id, b.tip, JSON.stringify(b.facade), s.marka.ad, s.marka.renk, s.marka.renk2, s.marka.logo, b.staff.map((e) => e.tip).join(',')].join('|'); if (sig === this.sig) return;
    const structural = this.branchId !== b.id || this.sig.split('|').slice(0, 7).join('|') !== sig.split('|').slice(0, 7).join('|');
    this.sig = sig; this.branchId = b.id; if (this.rig) this.scene.remove(this.rig.root);
    if (structural || !this.rig) { this.rig = buildCafe(b, s); this.scene.add(this.rig.root); this.env.attach(this.rig); this.env.setBackdrop(cityById(b.city).kiyi && (b.tip === 'sahil')); if (this.crowd) this.crowd.setRig(this.rig); else this.crowd = new Crowd(this.scene, this.rig); this.crowd.setStaff(b); this.tgt.set(0, 1.7, 1); this.setPreset('cephe'); }
    else if (this.rig) { this.rig = buildCafe(b, s); this.scene.add(this.rig.root); this.env.attach(this.rig); this.crowd?.setRig(this.rig); this.crowd?.setStaff(b); }
  }
  handleEvents(ev: SimEvent[]): void { if (!this.crowd) return; for (const e of ev) if (e.t === 'musteri' && e.branch === this.branchId) this.crowd.spawnCustomers(e); }
  private loop(now: number): void {
    this.raf = requestAnimationFrame(this.loop); if (!this.running) return; const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc > 1) { this.fps = Math.round(this.fpsN / this.fpsAcc); this.fpsAcc = 0; this.fpsN = 0; }
    if (this.goal) { const g = this.goal, k = Math.min(1, dt * 4); this.yaw += (g.yaw - this.yaw) * k; this.pitch += (g.pitch - this.pitch) * k; this.dist += (g.dist - this.dist) * k; this.tgt.x += (g.tx - this.tgt.x) * k; this.tgt.y += (g.ty - this.tgt.y) * k; this.applyCam(); }
    this.renderer.render(this.scene, this.camera); this.frameHook?.(dt);
  }
  frameHook: ((dt: number) => void) | null = null;
  /** Oyun durumuyla ilerlet. */
  tick(dt: number, s: GameState): void {
    const hv = s.hiz === 0 ? 0 : s.hiz; const weather = (s.hava[this.branchCity(s)] ?? 'gunesli') as Weather;
    this.env.update(dt, hourOf(s), weather, hv || 1); if (!this.crowd) return; this.crowd.update(dt * (hv ? 1 : 0), hv || 1);
    this.ambientT -= dt * (hv || 0); if (this.ambientT <= 0) { this.crowd.spawnAmbient(); this.ambientT = 2.2 + Math.random() * 3 - Math.min(1.2, hv * 0.3); }
  }
  private branchCity(s: GameState): number { const b = s.subeler.find((x) => x.id === this.branchId); return b ? b.city : 0; }
  setRunning(r: boolean): void { this.running = r; }
  destroy(): void { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
