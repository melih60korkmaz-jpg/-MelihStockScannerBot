import * as THREE from 'three';
import type { Quality } from '../platform/settings';
import { SiteBuilding, designOf, ramp, rng, type BuildingSpec } from './siteBuilding';
import { Surroundings } from './siteSurroundings';
import { newQuality, qualityStep } from './quality';
import type { Region } from '../data/geo';
import { ConcretePump, Dust, Excavator, SiteProps, TowerCrane, Weather, Workers, makeGlow, makeTruck } from './siteProps';

export interface SiteSpec extends BuildingSpec { use: 'konut' | 'ticari' | 'sanayi'; name: string; roads: number; corner: boolean; region?: Region; density?: number }
export interface SiteState { u: number; stalled: boolean; weather: 'acik' | 'yagmur' | 'kar'; workers: number; done: boolean; occupancy?: number }
type Tier = Exclude<Quality, 'auto'>; // quality.ts ile aynı küme
const TIER = { low: { pr: 1, shadows: false, workers: 8, fps: 30, rain: false, dust: 0, flood: 0 }, mid: { pr: 1.5, shadows: false, workers: 16, fps: 60, rain: true, dust: 50, flood: 1 }, high: { pr: 2, shadows: true, workers: 24, fps: 60, rain: true, dust: 90, flood: 2 } };
export type CamPreset = 'kus' | 'yan' | 'on' | 'yakin' | 'ust';
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Aktif şantiye sahnesi: sim durumundan (aşama ilerlemesi) üretilen bina + makineler + işçiler + hava + gün/gece. */
export class SiteScene {
  private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2500);
  private sun = new THREE.DirectionalLight(0xffffff, 3); private hemi = new THREE.HemisphereLight(0x9bb8e0, 0x3a3228, 1);
  private sky: THREE.Mesh; private skyU: { top: { value: THREE.Color }; hor: { value: THREE.Color } };
  private building!: SiteBuilding; private props!: SiteProps; private crane!: TowerCrane; private crane2: TowerCrane | null = null; private excavator = new Excavator(); private workers = new Workers(); private weather = new Weather(); private dust = new Dust(90); private pump = new ConcretePump(); private glows: THREE.Sprite[] = []; private flood = [new THREE.SpotLight(0xfff0d0, 0, 120, 0.85, 0.7, 1.2), new THREE.SpotLight(0xfff0d0, 0, 120, 0.85, 0.7, 1.2)];
  private trucks: { g: THREE.Group; kind: string; off: number; speed: number; drum?: THREE.Mesh }[] = []; private ground!: THREE.Mesh; private world = new THREE.Group(); private surround: Surroundings | null = null;
  private nightGlow = { value: 0 }; private covers: THREE.Mesh[] = []; private spec!: SiteSpec; private disposed = false; private moon = new THREE.DirectionalLight(0x9aa6b8, 0); private plotW = 40; private plotD = 30;
  private state: SiteState = { u: 1, stalled: false, weather: 'acik', workers: 3, done: false }; private u = 1; private time = 0; private tod = 0.6; private speed = 0; private reduced = false;
  private tierSetting: Quality = 'auto'; private tier: Tier = 'mid'; private raf = 0; private running = false; private last = 0;
  private cam = { yaw: 0.7, pitch: 0.55, dist: 80, tx: 0, ty: 12, tz: 0 }; private goal = { ...this.cam }; private idle = 0; private R = 40; private orbitAuto = false;
  private ptrs = new Map<number, { x: number; y: number }>(); private pinch = 0; private lastTap = 0;
  private ac = new AbortController(); private on = (type: string, f: (e: any) => void, o: AddEventListenerOptions = {}) => this.canvas.addEventListener(type, f, { ...o, signal: this.ac.signal });
  contextLost = false; onContext?: (lost: boolean) => void;
  private warm = 0; private q = newQuality('high'); private fpsT = 0; private fpsN = 0; private checks = 0; onTier?: (t: Tier) => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.style.touchAction = 'none';
    this.on('webglcontextlost', (e) => { e.preventDefault(); if (this.disposed) return; this.contextLost = true; this.onContext?.(true); this.stop(); });
    this.on('webglcontextrestored', () => { this.contextLost = false; this.onContext?.(false); this.start(); });
    this.bindControls();
    this.skyU = { top: { value: new THREE.Color('#4f8fd0') }, hor: { value: new THREE.Color('#cfe3f2') } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 14), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: this.skyU.top, hor: this.skyU.hor },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 hor; void main(){ float h = clamp(vP.y,0.0,1.0); gl_FragColor = vec4(mix(hor, top, smoothstep(0.0,0.6,h)),1.0);} ' }));
    for (const f of this.flood) { f.castShadow = false; this.scene.add(f, f.target); }
    this.moon.position.set(-60, 80, -40); this.scene.add(this.sky, this.hemi, this.sun, this.sun.target, this.moon, this.world, this.weather.rain, this.weather.snow);
    this.scene.fog = new THREE.Fog(0xcfe3f2, 140, 700);
    const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.4;
    const coarse = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600; this.tier = coarse ? 'mid' : 'high'; this.q = newQuality(this.tier);
  }

  // ---------- Kurulum ----------
  setSpec(spec: SiteSpec) {
    this.spec = spec; const r = rng(spec.seed ^ 0x9e3779b9), asp = 1 + r() * 0.5;
    const plotArea = Math.max(spec.footprint * 1.9, spec.footprint + 160); this.plotW = Math.sqrt(plotArea * asp); this.plotD = plotArea / this.plotW;
    this.world.clear(); this.trucks = []; this.world.add(this.dust.points);
    this.building = new SiteBuilding({ ...spec, plotW: this.plotW, plotD: this.plotD }, spec.use); this.world.add(this.building.group);
    this.props = new SiteProps(this.plotW, this.plotD, spec.name, spec.seed); this.world.add(this.props.group);
    const ext = this.building.extent, reach = Math.max(ext.w, ext.d) * 0.75 + 14;
    this.crane = new TowerCrane(reach, 0); this.crane.group.position.set(ext.w / 2 + 3.5, 0, -(ext.d / 2 + 3.5)); this.world.add(this.crane.group);
    this.crane2 = this.building.blocks.length > 1 ? new TowerCrane(reach * 0.8, 2) : null; if (this.crane2) { this.crane2.group.position.set(-(ext.w / 2 + 3.5), 0, ext.d / 2 + 3.5); this.world.add(this.crane2.group); }
    this.excavator.group.position.set(ext.w / 2 + 6, 0, ext.d / 4); this.world.add(this.excavator.group, this.workers.mesh, this.workers.heads);
    const kinds: ['dump' | 'mixer' | 'lorry', string][] = [['dump', '#d9d4c8'], ['dump', '#f08a24'], ['mixer', '#e8e8e4'], ['mixer', '#e8e8e4'], ['lorry', '#2f7f9f']];
    this.glows = [];
    kinds.forEach(([k, c], i) => { const t = makeTruck(k, c); this.world.add(t.group); this.trucks.push({ g: t.group, kind: k, off: i / kinds.length, speed: 0.016 + (i % 2) * 0.004, ...(t.drum ? { drum: t.drum } : {}) });
      for (const x of [-0.8, 0.8]) { const g = makeGlow('#ffe9b0', 5); g.position.set(x, 1.1, 5.2); t.group.add(g); this.glows.push(g); } });
    { const g = makeGlow('#ffe9b0', 9); g.position.set(-3, 3.2, 0); this.excavator.group.add(g); this.glows.push(g); }
    this.world.add(this.pump.group); { const ext2 = this.building.extent; this.pump.group.position.set(-(ext2.w / 2 + 9), 0, ext2.d / 2 + 2); this.pump.group.rotation.y = Math.PI / 2; }
    this.buildGround(); this.R = Math.max(ext.w, ext.d, this.building.topH * 0.85, 22);
    this.preset('kus', true); this.setState(this.state, true); this.applyTier();
  }

  private buildGround() {
    if (this.ground) { this.ground.geometry.dispose(); this.scene.remove(this.ground); }
    const S = 700, shape = new THREE.Shape([new THREE.Vector2(-S, -S), new THREE.Vector2(S, -S), new THREE.Vector2(S, S), new THREE.Vector2(-S, S)]);
    for (const h of this.building.holes) shape.holes.push(new THREE.Path([new THREE.Vector2(h.x - h.w / 2, -(h.z - h.d / 2)), new THREE.Vector2(h.x + h.w / 2, -(h.z - h.d / 2)), new THREE.Vector2(h.x + h.w / 2, -(h.z + h.d / 2)), new THREE.Vector2(h.x - h.w / 2, -(h.z + h.d / 2))].reverse()));
    for (const c of this.covers) { this.scene.remove(c); c.geometry.dispose(); } this.covers = [];
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 })); this.ground.receiveShadow = true; this.scene.add(this.ground);
    // Çukur kapalıyken delik görünmesin: zemin rengiyle kapak
    for (const h of this.building.holes) { const pg = new THREE.PlaneGeometry(h.w, h.d); const uv = pg.getAttribute('uv') as THREE.BufferAttribute, ps = pg.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, h.x + ps.getX(i), -(h.z - ps.getY(i))); const c = new THREE.Mesh(pg, this.ground.material); c.rotation.x = -Math.PI / 2; c.position.set(h.x, 0.01, h.z); c.receiveShadow = true; this.covers.push(c); this.scene.add(c); }
    // Çevre: yollar, kaldırım, komşu konut/apartman/park, ağaçlar, arabalar, lambalar, dağlar, bulutlar (bölgeye göre)
    if (this.surround) { this.scene.remove(this.surround.group); this.surround.dispose(); }
    this.surround = new Surroundings({ plotW: this.plotW, plotD: this.plotD, roads: this.spec.roads, region: this.spec.region ?? 'Marmara', density: this.spec.density ?? 60, seed: this.spec.seed }, this.nightGlow, this.ground.material as THREE.MeshStandardMaterial);
    this.scene.add(this.surround.group); this.surround.setTier(this.tier);
  }

  // ---------- Kontrol ----------
  setState(st: SiteState, snap = false) { this.state = st; if (snap) this.u = st.u; }
  setSpeed(s: number) { this.speed = s; }
  setReduced(b: boolean) { this.reduced = b; }
  setQuality(q: Quality) { this.tierSetting = q; if (q !== 'auto') this.tier = q; this.checks = q === 'auto' ? 0 : 99; if (this.spec) this.applyTier(); }
  get activeTier() { return this.tier; }
  setAutoOrbit(b: boolean) { this.orbitAuto = b; }
  preset(p: CamPreset, snap = false) {
    const R = this.R, g = this.goal, c = this.building ? this.building.topH * 0.4 : 10;
    const set = (yaw: number, pitch: number, dist: number, ty = c) => Object.assign(g, { yaw, pitch, dist, tx: 0, ty, tz: 0 });
    if (p === 'kus') set(0.7, 0.85, R * 3.1); else if (p === 'yan') set(0.5, 0.2, R * 2.6, this.building ? this.building.topH * 0.45 : 12); else if (p === 'on') set(0, 0.3, R * 2.4); else if (p === 'yakin') set(0.9, 0.42, R * 1.45); else set(0.3, 1.38, R * 2.4, 0);
    if (snap) Object.assign(this.cam, g);
  }
  resize() { const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight); this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TIER[this.tier].pr)); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  start() { if (this.running || this.contextLost) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  /** Tüm GPU/CPU kaynaklarını bırakır: geometri, malzeme, dokular, örnekli ağlar; sahne boşaltılır, referanslar kopar. */
  dispose() {
    this.disposed = true; this.stop(); this.ac.abort(); const seen = new Set<unknown>();
    const killMat = (m: THREE.Material) => { if (seen.has(m)) return; seen.add(m); for (const v of Object.values(m)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); m.dispose(); }; // paylaşılan (modül düzeyi) dokular da bırakılır: three yeniden yükler; bırakılmazsa eski GL bağlamına tutunur
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && !seen.has(m.geometry)) { seen.add(m.geometry); m.geometry.dispose(); } const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(killMat); (o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).dispose(); });
    this.scene.clear(); this.world.clear(); this.trucks = []; this.glows = []; this.covers = []; this.surround = null;
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }
  private applyTier() { const T = TIER[this.tier]; this.surround?.setTier(this.tier); this.renderer.shadowMap.enabled = T.shadows; this.sun.castShadow = T.shadows; this.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.needsUpdate = true; }); this.resize(); }

  private bindControls() {
    const c = this.canvas;
    this.on('pointerdown', (e) => { c.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.idle = 0; this.orbitAuto = false; if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); }
      const now = performance.now(); if (this.ptrs.size === 1 && now - this.lastTap < 280) this.preset('kus'); this.lastTap = now; });
    this.on('pointermove', (e) => {
      const p = this.ptrs.get(e.pointerId); if (!p) return; this.idle = 0; const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (this.ptrs.size === 1) { this.goal.yaw -= dx * 0.006; this.goal.pitch = clamp(this.goal.pitch + dy * 0.005, 0.05, 1.45); }
      else if (this.ptrs.size === 2) { const o = [...this.ptrs.entries()].find(([id]) => id !== e.pointerId)![1]; const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (d0 > 0) this.goal.dist = clamp(this.goal.dist * (d0 / d1), this.R * 0.6, this.R * 6);
        const k = this.goal.dist * 0.0016, sy = Math.sin(this.goal.yaw), cy = Math.cos(this.goal.yaw); this.goal.tx = clamp(this.goal.tx - (dx * cy) * k * 0.5, -this.R, this.R); this.goal.tz = clamp(this.goal.tz + (dx * sy) * k * 0.5, -this.R, this.R); this.goal.ty = clamp(this.goal.ty + dy * k * 0.5, 0, this.R * 2); }
      p.x = e.clientX; p.y = e.clientY; });
    const up = (e: PointerEvent) => { this.ptrs.delete(e.pointerId); };
    this.on('pointerup', up); this.on('pointercancel', up);
    this.on('wheel', (e) => { e.preventDefault(); this.goal.dist = clamp(this.goal.dist * Math.exp(e.deltaY * 0.001), this.R * 0.6, this.R * 6); this.idle = 0; }, { passive: false });
  }

  // ---------- Döngü ----------
  private frame = (now: number) => {
    if (!this.running) return; this.raf = requestAnimationFrame(this.frame);
    const T = TIER[this.tier]; if (now - this.last < 1000 / T.fps - 2) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.update(dt); this.renderer.render(this.scene, this.camera); this.monitor(dt);
  };
  /**
   * Otomatik kalite (yalnızca 'auto'): 2 sn'lik pencerelerle FPS ölçülür. Düşük FPS iki pencere üst üste → bir kademe düşer.
   * Yüksek FPS 5 pencere (10 sn) sürerse ve tavan (cihazın başlangıç kademesi) altındaysak bir kademe yükselir; yükselince tekrar düşerse
   * (2 başarısız deneme) yükseltme bırakılır → salınım olmaz.
   */
  private monitor(dt: number) {
    this.warm += dt; if (this.warm < 1.5 || this.tierSetting !== 'auto') return; this.fpsN++; this.fpsT += dt; if (this.fpsT < 2) return;
    const fps = this.fpsN / this.fpsT; this.fpsN = 0; this.fpsT = 0; this.q.tier = this.tier; const next = qualityStep(this.q, fps);
    if (next) { this.tier = next; this.applyTier(); this.onTier?.(this.tier); }
  }

  private update(dt: number) {
    const anim = !this.reduced, T = TIER[this.tier], st = this.state;
    if (anim) this.time += dt;
    // görsel ilerleme hedefe yumuşak yaklaşır (simülasyon günlük adım atar)
    const diff = st.u - this.u; this.u += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.25, Math.abs(diff) * 2.5) * dt);
    const u = this.u;
    // gün/gece: oyun akarken döner (gerçek zamanlı 45 sn / tur), duraklayınca durur; hareket azaltmada sabit akşamüstü
    if (anim && this.speed > 0) this.tod = (this.tod + dt / 45) % 1; else if (!anim) this.tod = 0.62;
    const ang = (this.tod - 0.25) * Math.PI * 2, sunY = Math.sin(ang), day = clamp(sunY * 1.5 + 0.25, 0, 1), night = 1 - clamp(sunY * 3 + 0.5, 0, 1), gold = clamp(1 - Math.abs(sunY) * 2.6, 0, 1) * (sunY > -0.15 ? 1 : 0);
    const w = st.weather, wd = w === 'yagmur' ? 0.62 : w === 'kar' ? 0.78 : 1;
    this.sun.position.set(Math.cos(ang) * 90, Math.max(8, sunY * 90), 40); this.sun.target.position.set(0, 0, 0);
    this.sun.color.setRGB(1, 0.85 - gold * 0.25, 0.7 - gold * 0.35 + (1 - gold) * 0.2); this.sun.intensity = (0.1 + 3.2 * day) * wd; this.hemi.intensity = (0.62 + 0.55 * day) * (w === 'acik' ? 1 : 0.9); this.moon.intensity = 1.1 * night * (w === 'acik' ? 1 : 0.7);
    const top = new THREE.Color('#0d0f12').lerp(new THREE.Color(w === 'acik' ? '#4f8fd0' : '#7d8794'), day), hor = new THREE.Color('#1d2026').lerp(new THREE.Color(w === 'acik' ? '#cfe3f2' : '#a9b2ba'), day).lerp(new THREE.Color('#f2a35e'), gold * 0.7 * (w === 'acik' ? 1 : 0.3));
    this.skyU.top.value.copy(top); this.skyU.hor.value.copy(hor); (this.scene.fog as THREE.Fog).color.copy(hor); { const mist = w === 'acik' ? Math.max(0, 1 - Math.abs(this.tod - 0.28) / 0.1) : 0; (this.scene.fog as THREE.Fog).near = (w === 'acik' ? 140 : 70) * (1 - 0.55 * mist); (this.scene.fog as THREE.Fog).far = (w === 'acik' ? 700 : 380) * (1 - 0.4 * mist); } // sabah sisi: gün doğumunda kısa süre
    this.renderer.toneMappingExposure = 1.1 - 0.2 * day;
    this.surround?.update(dt, this.time, night, w, anim);
    this.sky.position.copy(this.camera.position);
    // bina
    this.building.update(u, this.time, night, st.occupancy ?? 0); this.nightGlow.value = night * 0.95; for (const c of this.covers) c.visible = !(u > 6.01 && u < 8.0);
    this.props.setStage(u); this.props.setLandscape(ramp(u, 16, 17)); for (const l of this.props.lamps) l.visible = night > 0.25;
    const hw = this.building.extent.w / 2, hd = this.building.extent.d / 2, top2 = this.building.builtTop(u);
    // vinç(ler): yükseklik bina ile yükselir; sökülürken iner
    const craneOn = u >= 7.2 && u < 16.9, working = !st.stalled && anim && u >= 6 && u < 17.9;
    const craneH = ramp(u, 16, 16.8) > 0 ? lerp(Math.max(14, top2 + 8), 10, ramp(u, 16, 16.8)) : Math.max(14, top2 + 8);
    this.crane.group.visible = craneOn; if (craneOn) { this.crane.setHeight(craneH); this.crane.animate(this.time, working, dt); }
    if (this.crane2) { this.crane2.group.visible = craneOn; if (craneOn) { this.crane2.setHeight(craneH - 2); this.crane2.animate(this.time, working, dt); } }
    { // beton pompası: beton aşamalarında (temel → katlar) çalışırken bom binaya uzanır
      const pouring = u >= 7.4 && u < 10.4 && !st.stalled && anim, topY = Math.max(2, top2);
      const tgt = this.pump.group.worldToLocal(new THREE.Vector3(0, topY + 2.6, 0).applyMatrix4(this.world.matrixWorld)); this.pump.update(pouring, tgt, Math.max(0.3, topY), this.time);
    }
    for (const g of this.glows) (g.material as THREE.SpriteMaterial).opacity = (T.dust > 0 ? 1 : 0) * clamp(night * 1.3 - 0.15, 0, 0.85) * (g.parent && g.parent.visible ? 1 : 0);
    { // şantiye projektörleri: gece ve kalite izin verirse (orta: 1, yüksek: 2); fabrika gibi aydınlık aşamalarda kapalı
      const fOn = u >= 1.5 && u < 17.9 && !st.stalled; this.flood.forEach((f, i) => { f.position.set((i ? -1 : 1) * (this.plotW / 2 + 4), 24, (i ? 1 : -1) * (this.plotD / 2 + 4)); f.target.position.set(0, 0, 0); f.intensity = i < T.flood && fOn ? night * 240 : 0; });
    }
    this.excavator.group.visible = u >= 6 && u < 8.3; if (this.excavator.group.visible) this.excavator.animate(this.time, working && u < 7);
    // kamyonlar: aşamaya göre
    const L = this.plotW + 28, Dp = this.plotD + 28;
    for (const tr of this.trucks) {
      const on = tr.kind === 'dump' ? u >= 6 && u < 7.7 : tr.kind === 'mixer' ? u >= 7 && u < 10 : u >= 10 && u < 16.6; tr.g.visible = on && !st.stalled;
      if (!tr.g.visible) continue; const p = ((this.time * tr.speed + tr.off) % 1) * 4, side = Math.floor(p), k = p - side; const pts: [number, number, number][] = [[-L / 2, Dp / 2, 0], [L / 2, Dp / 2, Math.PI / 2], [L / 2, -Dp / 2, Math.PI], [-L / 2, -Dp / 2, -Math.PI / 2]];
      const a = pts[side % 4]!, b = pts[(side + 1) % 4]!; tr.g.position.set(lerp(a[0], b[0], k), 0, lerp(a[1], b[1], k)); tr.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); if (tr.drum) tr.drum.rotation.y += dt * 1.5;
    }
    // işçiler
    const wc = u < 1.5 ? 0 : Math.min(T.workers, Math.max(2, st.workers)); this.workers.setCount(st.done ? 0 : wc, hw * 1.6, hd * 1.6);
    this.workers.update(dt, this.time, anim, hw * 1.6, hd * 1.6, Math.max(0, top2 - 1), !st.stalled && u >= 1.5 && u < 17.9, u, { x: this.pump.group.position.x, z: this.pump.group.position.z });
    this.weather.update(dt, T.rain && anim ? w : 'acik', T.rain && anim, (w === 'yagmur' ? 1 : w === 'kar' ? 0.5 : 0) * (0.7 + 0.3 * Math.sin(this.time * 0.6)));
    this.dust.update(dt, anim && T.dust > 0 && !st.stalled && w === 'acik' && u >= 1.5 && u < 17.9, hw * 1.15, hd * 1.15);
    // kamera
    const g = this.goal, c = this.cam, k = 1 - Math.exp(-dt * 7);
    if (this.orbitAuto && anim) g.yaw += dt * 0.18; else if (!this.ptrs.size && anim && this.speed === 0) { this.idle += dt; }
    c.yaw = lerp(c.yaw, g.yaw, k); c.pitch = lerp(c.pitch, g.pitch, k); c.dist = lerp(c.dist, g.dist, k); c.tx = lerp(c.tx, g.tx, k); c.ty = lerp(c.ty, g.ty, k); c.tz = lerp(c.tz, g.tz, k);
    this.camera.position.set(c.tx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, c.ty + Math.sin(c.pitch) * c.dist, c.tz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist); this.camera.lookAt(c.tx, c.ty, c.tz);
  }
}
void designOf;
