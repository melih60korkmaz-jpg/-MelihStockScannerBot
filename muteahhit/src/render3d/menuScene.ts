import * as THREE from 'three';
import type { Quality } from '../platform/settings';

export type Mood = 'menu' | 'setup' | 'calm';
type Tier = Exclude<Quality, 'auto'>;

const MOODS: Record<Mood, { r: number; h: number; lookY: number; fov: number }> = {
  menu: { r: 120, h: 34, lookY: 31, fov: 46 },
  setup: { r: 80, h: 15, lookY: 27, fov: 46 },
  calm: { r: 135, h: 50, lookY: 24, fov: 46 },
};
const TIER = {
  low: { pr: 1, shadows: false, dust: 0, cityFrac: 0.4, fpsCap: 30 },
  mid: { pr: 1.5, shadows: false, dust: 60, cityFrac: 0.75, fpsCap: 60 },
  high: { pr: 2, shadows: true, dust: 140, cityFrac: 1, fpsCap: 60 },
};

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

interface Crane { group: THREE.Group; jib: THREE.Group; trolley: THREE.Group; cable: THREE.Mesh; load: THREE.Group; beacon: THREE.Mesh; jibLen: number; h: number; phase: number }

/**
 * Menü sahnesi: altın saatte şehir, yarım kalmış kule, dönen vinçler, kamyonlar, toz.
 * Düşük/orta/yüksek kalite kademeleri çalışma anında uygulanır. Görünür değilken RAF durur.
 */
export class MenuScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(46, 1, 0.5, 1500);
  private sun!: THREE.DirectionalLight; private sky!: THREE.Mesh;
  private cityMesh!: THREE.InstancedMesh; private cityTotal = 0;
  private dust!: THREE.Points; private dustMax = 0;
  private cranes: Crane[] = [];
  private trucks: { g: THREE.Group; off: number; speed: number }[] = [];
  private windowGlow = { value: 0.9 };
  private shadowMats: THREE.Material[] = [];
  private raf = 0; private running = false; private last = 0; private t = 0; private acc = 0;
  private mood: Mood = 'menu';
  private cur = { ...MOODS.menu }; private angle = 0.55;
  private ptr = { x: 0, y: 0 };
  private tierSetting: Quality = 'auto'; private tier: Tier = 'mid';
  private reduced = false;
  private fpsFrames = 0; private fpsTime = 0; private autoChecks = 0; private warm = 0;
  contextLost = false;
  onContextChange?: (lost: boolean) => void;
  onTier?: (t: Tier) => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; this.onContextChange?.(true); this.stop(); });
    canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.onContextChange?.(false); this.start(); });
    addEventListener('pointermove', (e) => { this.ptr.x = (e.clientX / innerWidth) * 2 - 1; this.ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    this.build();
    // Başlangıç tahmini: dokunmatik/dar ekran → orta, masaüstü → yüksek. Sonra FPS ölçümü düşürür.
    const coarse = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
    this.tier = coarse ? 'mid' : 'high';
    this.applyTier();
    this.resize();
  }

  // ---------- Kontrol ----------
  setMood(m: Mood) { this.mood = m; }
  setReduced(b: boolean) { this.reduced = b; }
  setQuality(q: Quality) { this.tierSetting = q; if (q !== 'auto') this.tier = q; this.autoChecks = q === 'auto' ? 0 : 99; this.applyTier(); }
  get activeTier(): Tier { return this.tier; }
  start() { if (this.running || this.contextLost) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  resize() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TIER[this.tier].pr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Yatay ekranda sol menü paneli için sahneyi sağa kaydır (kule panelin altında kalmasın).
    if (w > h * 1.2) this.camera.setViewOffset(w, h, -w * 0.17, 0, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
  dispose() { this.stop(); this.scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); }); this.renderer.dispose(); }

  private applyTier() {
    const T = TIER[this.tier];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, T.pr));
    this.renderer.shadowMap.enabled = T.shadows;
    this.sun.castShadow = T.shadows;
    for (const m of this.shadowMats) m.needsUpdate = true;
    this.cityMesh.count = Math.floor(this.cityTotal * T.cityFrac);
    this.dust.visible = T.dust > 0 && !this.reduced;
    this.dust.geometry.setDrawRange(0, Math.min(T.dust, this.dustMax));
    this.resize();
  }

  // ---------- Döngü ----------
  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const T = TIER[this.tier];
    const minDt = 1000 / T.fpsCap - 2;
    if (now - this.last < minDt) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.monitor(dt);
  };

  /** Otomatik kalite: ilk saniyelerde FPS düşükse bir kademe aşağı. */
  private monitor(dt: number) {
    this.warm += dt; if (this.warm < 1.5 || this.tierSetting !== 'auto' || this.autoChecks >= 3) return;
    this.fpsFrames++; this.fpsTime += dt;
    if (this.fpsTime >= 2) {
      const fps = this.fpsFrames / this.fpsTime; this.fpsFrames = 0; this.fpsTime = 0; this.autoChecks++;
      const cap = TIER[this.tier].fpsCap;
      if (fps < Math.min(40, cap * 0.7)) { this.tier = this.tier === 'high' ? 'mid' : 'low'; this.applyTier(); this.onTier?.(this.tier); }
    }
  }

  private update(dt: number) {
    const k = this.reduced ? 0 : 1;
    this.t += dt * k;
    // kamera: mood'a yumuşak geçiş, yavaş yörünge, imleç paralaksı
    const m = MOODS[this.mood]; const f = 1 - Math.exp(-dt * 1.8);
    this.cur.r = lerp(this.cur.r, m.r, f); this.cur.h = lerp(this.cur.h, m.h, f); this.cur.lookY = lerp(this.cur.lookY, m.lookY, f);
    const aspect = this.camera.aspect;
    const fit = aspect < 1 ? Math.min(1.9, 1.15 / aspect) : 1; // dikey ekranda kule sığsın
    const base = this.mood === 'setup' ? 0.9 : 0.55;
    const target = base + (this.reduced ? 0 : Math.sin(this.t * 0.045) * 0.38) + this.ptr.x * 0.05;
    this.angle = lerp(this.angle, target, f);
    const r = this.cur.r * fit;
    this.camera.position.set(Math.sin(this.angle) * r, this.cur.h + this.ptr.y * -1.5, Math.cos(this.angle) * r);
    this.camera.lookAt(0, this.cur.lookY, 0);
    this.sky.position.copy(this.camera.position); // kubbe kameraya bağlı: uzaklaşınca kırpılmaz

    for (const c of this.cranes) this.animateCrane(c);
    for (const tr of this.trucks) this.animateTruck(tr);
    const glow = 0.85 + Math.sin(this.t * 0.2) * 0.06; this.windowGlow.value = glow;
    if (this.dust.visible) this.animateDust(dt * k);
  }

  private animateCrane(c: Crane) {
    const t = this.t + c.phase;
    c.jib.rotation.y = Math.sin(t * 0.09) * 1.1 + c.phase;
    const tr = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.21));
    c.trolley.position.x = c.jibLen * tr;
    const cableLen = 6 + (c.h * 0.45) * (0.5 + 0.5 * Math.sin(t * 0.17 + 1));
    c.cable.scale.y = cableLen; c.cable.position.y = -cableLen / 2;
    c.load.position.y = -cableLen - 0.6;
    c.load.rotation.z = Math.sin(t * 0.6) * 0.04;
    (c.beacon.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.15 + 0.15 * Math.sin(this.t * 4), 0.1).multiplyScalar(0.6 + 0.4 * (Math.sin(this.t * 4) > 0 ? 1 : 0.2));
  }

  private animateTruck(tr: { g: THREE.Group; off: number; speed: number }) {
    const L = 120, p = ((this.t * tr.speed + tr.off) % 1);
    const s = p * 4; const side = Math.floor(s), u = s - side; const R = 36;
    const pts: [number, number, number][] = [[-R, R, 0], [R, R, Math.PI / 2], [R, -R, Math.PI], [-R, -R, -Math.PI / 2]];
    const a = pts[side % 4]!, b = pts[(side + 1) % 4]!;
    tr.g.position.set(lerp(a[0], b[0], u), 0, lerp(a[1], b[1], u));
    tr.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); void L;
  }

  private animateDust(dt: number) {
    const pos = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.dustMax; i++) {
      pos.setY(i, pos.getY(i) + dt * (0.4 + (i % 7) * 0.08));
      pos.setX(i, pos.getX(i) + dt * 0.5);
      if (pos.getY(i) > 50) pos.setY(i, 1);
      if (pos.getX(i) > 70) pos.setX(i, -70);
    }
    pos.needsUpdate = true;
  }

  // ---------- Sahne kurulumu ----------
  private build() {
    const R = rng(2027);
    const S = this.scene;
    const horizon = new THREE.Color('#e8965a');
    S.fog = new THREE.Fog(horizon.clone().lerp(new THREE.Color('#3a3a5c'), 0.35), 90, 340);

    // Gökyüzü (gradyan küre)
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#14213f') }, mid: { value: new THREE.Color('#7a4f7a') }, hor: { value: new THREE.Color('#f2a35e') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 hor; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.18,0.7,h)); gl_FragColor = vec4(c,1.0);} ',
    }));
    this.sky = sky; S.add(sky);
    // Güneş hâlesi
    const glowTex = radialTexture('rgba(255,214,150,1)', 'rgba(255,160,80,0)');
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    sunSprite.scale.set(420, 420, 1); sunSprite.position.set(-260, 60, -520); S.add(sunSprite);

    // Işıklar
    S.add(new THREE.HemisphereLight(0x8fa6dc, 0x30262a, 1.0));
    this.sun = new THREE.DirectionalLight(0xffb67a, 3.2);
    this.sun.position.set(-70, 36, 50); this.sun.target.position.set(0, 10, 0);
    const sc = this.sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 220;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.4;
    S.add(this.sun, this.sun.target);

    // Zemin + yollar
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: '#242a3a', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; S.add(ground);
    this.shadowMats.push(ground.material as THREE.Material);
    const roadMat = new THREE.MeshStandardMaterial({ color: '#34394a', roughness: 0.95 });
    const roads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 1), roadMat, 64);
    const m4 = new THREE.Matrix4(); let ri = 0;
    for (let i = -14; i <= 14; i++) {
      m4.compose(new THREE.Vector3(i * 9 + 4.5, 0.03, 0), new THREE.Quaternion(), new THREE.Vector3(2.2, 1, 340)); roads.setMatrixAt(ri++, m4);
      m4.compose(new THREE.Vector3(0, 0.03, i * 9 + 4.5), new THREE.Quaternion(), new THREE.Vector3(340, 1, 2.2)); roads.setMatrixAt(ri++, m4);
    }
    roads.count = ri; roads.receiveShadow = true; S.add(roads);

    // Şehir: pencereleri akşam ışığında yanan bloklar
    const bMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85, metalness: 0.05 });
    const glow = this.windowGlow;
    bMat.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = glow;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vNo;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 wp4 = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp4 = instanceMatrix * wp4;
          #endif
          vWp = (modelMatrix * wp4).xyz; vNo = normal;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
          varying vec3 vWp; varying vec3 vNo; uniform float uGlow;
          float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float side = 1.0 - step(0.5, abs(vNo.y));
          float ax = step(0.5, abs(vNo.x));
          float u = mix(vWp.x, vWp.z, ax);
          vec2 cell = vec2(floor(u / 1.7), floor(vWp.y / 1.6));
          vec2 f = vec2(fract(u / 1.7), fract(vWp.y / 1.6));
          float win = step(0.18, f.x) * step(f.x, 0.78) * step(0.22, f.y) * step(f.y, 0.72);
          float lit = step(0.5, h21(cell + floor(vWp.xz * 0.37) * 1.7));
          totalEmissiveRadiance += side * win * lit * vec3(1.0, 0.72, 0.38) * 1.5 * uGlow;
          diffuseColor.rgb *= 1.0 - side * win * 0.3;`);
    };
    this.shadowMats.push(bMat);
    const cells: { x: number; z: number; d: number }[] = [];
    for (let gx = -14; gx <= 14; gx++) for (let gz = -14; gz <= 14; gz++) {
      const x = gx * 9, z = gz * 9; const d = Math.hypot(x, z);
      if (d < 38) continue; // şantiye boşluğu
      if (R() < 0.12) continue;
      cells.push({ x, z, d });
    }
    cells.sort((a, b) => a.d - b.d); // yakından uzağa → düşük kalitede en yakın bloklar kalır
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const city = new THREE.InstancedMesh(geo, bMat, cells.length);
    const palette = ['#5b6478', '#6b6f82', '#7a6e78', '#4f5a70', '#8a7a72', '#566a7a', '#6d5f6e'].map((c) => new THREE.Color(c));
    const col = new THREE.Color();
    cells.forEach((c, i) => {
      const w = 4.2 + R() * 3.2, dd = 4.2 + R() * 3.2;
      // Kameranın baktığı taraf alçak (kule görünsün); gökdelenler arka plan siluetinde.
      const camDir = [Math.sin(0.7), Math.cos(0.7)] as const;
      const back = -((c.x * camDir[0] + c.z * camDir[1]) / (c.d || 1));
      const tall = back > -0.15 ? Math.min(1, (c.d - 60) / 60) * Math.min(1, (back + 0.15) * 1.6) : 0;
      const hgt = 5 + R() * 9 + tall * R() * 52;
      m4.compose(new THREE.Vector3(c.x + (R() - 0.5) * 1.2, 0, c.z + (R() - 0.5) * 1.2), new THREE.Quaternion(), new THREE.Vector3(w, hgt, dd));
      city.setMatrixAt(i, m4);
      col.copy(palette[Math.floor(R() * palette.length)]!).multiplyScalar(0.85 + R() * 0.3); city.setColorAt(i, col);
    });
    city.castShadow = true; city.receiveShadow = true; S.add(city);
    this.cityMesh = city; this.cityTotal = cells.length;

    // Ana kule + ikinci şantiye
    this.makeTower(S, { x: 0, z: 0, w: 13, floors: 22, glass: 12, struct: 18, cols: 3 }, R);
    this.makeTower(S, { x: -33, z: 14, w: 9, floors: 11, glass: 0, struct: 7, cols: 2 }, R);
    this.cranes.push(this.makeCrane(S, 0, 0, 74, 34, 0.0));
    this.cranes.push(this.makeCrane(S, -33 - 8, 14 + 8, 40, 22, 1.8));
    this.makeSite(S, R);

    // Kamyonlar
    for (let i = 0; i < 2; i++) { const g = this.makeTruck(i ? '#d9d4c8' : '#f08a24'); S.add(g); this.trucks.push({ g, off: i * 0.5, speed: 0.012 }); }

    // Toz parçacıkları
    this.dustMax = 140;
    const dp = new Float32Array(this.dustMax * 3);
    for (let i = 0; i < this.dustMax; i++) { dp[i * 3] = (R() - 0.5) * 140; dp[i * 3 + 1] = R() * 50; dp[i * 3 + 2] = (R() - 0.5) * 120; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.9, map: radialTexture('rgba(255,225,170,0.9)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, fog: true }));
    S.add(this.dust);
  }

  private makeTower(S: THREE.Scene, o: { x: number; z: number; w: number; floors: number; glass: number; struct: number; cols: number }, R: () => number) {
    const fh = 3.2, half = o.w / 2, n = o.cols;
    const concrete = new THREE.MeshStandardMaterial({ color: '#a7aaa6', roughness: 0.95, flatShading: true });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.18, transparent: true, opacity: 0.62, emissive: new THREE.Color('#ffb870'), emissiveIntensity: 0.22 });
    this.shadowMats.push(concrete, glassMat);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const colCount = n * n * o.struct;
    const cols = new THREE.InstancedMesh(box, concrete, colCount), slabs = new THREE.InstancedMesh(box, concrete, o.struct + 1);
    const glass = new THREE.InstancedMesh(box, glassMat, Math.max(1, o.glass));
    const m = new THREE.Matrix4(); let ci = 0;
    const g0 = new THREE.Color('#5ea6c8'), g1 = new THREE.Color('#e9b97a'), c = new THREE.Color();
    for (let f = 0; f < o.struct; f++) {
      const y = f * fh;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const px = o.x - half + (n === 1 ? half : (i * o.w) / (n - 1)), pz = o.z - half + (n === 1 ? half : (j * o.w) / (n - 1));
        m.compose(new THREE.Vector3(px, y + fh / 2, pz), new THREE.Quaternion(), new THREE.Vector3(0.9, fh, 0.9)); cols.setMatrixAt(ci++, m);
      }
      const partial = f === o.struct - 1;
      m.compose(new THREE.Vector3(o.x, y + fh, o.z), new THREE.Quaternion(), new THREE.Vector3(o.w + 1, 0.3, partial ? o.w * 0.55 : o.w + 1));
      slabs.setMatrixAt(f, m);
      if (f < o.glass) {
        m.compose(new THREE.Vector3(o.x, y + fh * 0.5 + 0.1, o.z), new THREE.Quaternion(), new THREE.Vector3(o.w - 0.1, fh - 0.45, o.w - 0.1)); glass.setMatrixAt(f, m);
        c.copy(g0).lerp(g1, R() < 0.35 ? 0.6 : 0); glass.setColorAt(f, c);
      }
    }
    // zemin plak
    m.compose(new THREE.Vector3(o.x, 0.2, o.z), new THREE.Quaternion(), new THREE.Vector3(o.w + 4, 0.5, o.w + 4)); slabs.setMatrixAt(o.struct, m);
    cols.count = ci; glass.count = o.glass;
    for (const mesh of [cols, slabs, glass]) { mesh.castShadow = true; mesh.receiveShadow = true; S.add(mesh); }
    // çekirdek (asansör kovası) bir adım önde yükselir
    const core = new THREE.Mesh(box, concrete); core.scale.set(o.w * 0.3, (o.struct + 2) * fh, o.w * 0.3); core.position.set(o.x, core.scale.y / 2, o.z); core.castShadow = true; S.add(core);
    // filiz demirleri (en üst kat)
    const rebarMat = new THREE.MeshStandardMaterial({ color: '#6b5a4a', roughness: 0.8 });
    const rebar = new THREE.InstancedMesh(box, rebarMat, n * n * 3);
    let ri = 0; const top = o.struct * fh;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < 3; k++) {
      const px = o.x - half + (n === 1 ? half : (i * o.w) / (n - 1)) + (k - 1) * 0.22, pz = o.z - half + (n === 1 ? half : (j * o.w) / (n - 1));
      m.compose(new THREE.Vector3(px, top + 1.2, pz), new THREE.Quaternion(), new THREE.Vector3(0.07, 2.4, 0.07)); rebar.setMatrixAt(ri++, m);
    }
    S.add(rebar);
    // emniyet korkulukları (turuncu) son 3 kat
    const rail = new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.7 });
    const rails = new THREE.InstancedMesh(box, rail, 12); let k2 = 0;
    for (let f = Math.max(0, o.struct - 3); f < o.struct; f++) for (const [dx, dz, sx, sz] of [[0, 1, 1, 0], [0, -1, 1, 0], [1, 0, 0, 1], [-1, 0, 0, 1]] as const) {
      m.compose(new THREE.Vector3(o.x + dx * (half + 0.55), f * fh + fh + 0.7, o.z + dz * (half + 0.55)), new THREE.Quaternion(), new THREE.Vector3(sx ? o.w + 1 : 0.06, 0.08, sz ? o.w + 1 : 0.06)); if (k2 < 12) rails.setMatrixAt(k2++, m);
    }
    rails.count = k2; S.add(rails);
  }

  private makeCrane(S: THREE.Scene, x: number, z: number, h: number, jibLen: number, phase: number): Crane {
    const yel = new THREE.MeshStandardMaterial({ color: '#F5B700', roughness: 0.6, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.8 });
    this.shadowMats.push(yel, dark);
    const g = new THREE.Group(); g.position.set(x + 11, 0, z - 11);
    const post = new THREE.BoxGeometry(0.4, h, 0.4);
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]] as const) { const p = new THREE.Mesh(post, yel); p.position.set(dx, h / 2, dz); p.castShadow = true; g.add(p); }
    const strut = new THREE.BoxGeometry(2.2, 0.18, 0.18);
    for (let y = 2; y < h; y += 3) for (const [rot, px, pz] of [[0, 0, -0.9], [0, 0, 0.9], [Math.PI / 2, -0.9, 0], [Math.PI / 2, 0.9, 0]] as const) {
      const s = new THREE.Mesh(strut, yel); s.position.set(px, y, pz); s.rotation.y = rot; g.add(s);
    }
    const jib = new THREE.Group(); jib.position.y = h + 1.4; g.add(jib);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(jibLen + 12, 0.9, 1.2), yel); beam.position.x = (jibLen - 12) / 2; beam.castShadow = true; jib.add(beam);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 1.2), yel); top.position.set(0, 3.2, 0); jib.add(top);
    const cw = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 2.2), dark); cw.position.set(-9, -1.2, 0); jib.add(cw);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), dark); cab.position.set(2.2, -1.5, 1.3); jib.add(cab);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b2a' })); beacon.position.set(jibLen + 0.2, 0.7, 0); jib.add(beacon);
    const trolley = new THREE.Group(); jib.add(trolley);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.4), dark); trolley.add(tb);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), dark); cable.position.y = -3; trolley.add(cable);
    const load = new THREE.Group(); trolley.add(load);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), yel); load.add(hook);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: '#8b6b4a', roughness: 0.9, flatShading: true })); pack.position.y = -1.4; pack.castShadow = true; load.add(pack);
    S.add(g);
    return { group: g, jib, trolley, cable, load, beacon, jibLen, h, phase };
  }

  private makeSite(S: THREE.Scene, R: () => number) {
    const mats = ['#2f7f9f', '#c4552b', '#7a8a3a', '#d8b13a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }));
    const box = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4, rr = 23 + R() * 5;
      const c = new THREE.Mesh(box, mats[i % 4]!); c.scale.set(5, 2.4, 2.3); c.position.set(Math.cos(a) * rr, 1.2, Math.sin(a) * rr); c.rotation.y = a + Math.PI / 2; c.castShadow = true; c.receiveShadow = true; S.add(c);
    }
    // çit
    const fence = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.6 }), 64); const m = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, rr = 20; m.compose(new THREE.Vector3(Math.cos(a) * rr, 0.8, Math.sin(a) * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0)), new THREE.Vector3(0.12, 1.6, 2)); fence.setMatrixAt(n++, m); }
    S.add(fence);
    // aydınlatma direkleri
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd89a' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2, p = new THREE.Group(); p.position.set(Math.cos(a) * 19, 0, Math.sin(a) * 19);
      const pole = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: '#555b66' })); pole.scale.set(0.2, 6, 0.2); pole.position.y = 3; p.add(pole);
      const lamp = new THREE.Mesh(box, lampMat); lamp.scale.set(0.9, 0.3, 0.9); lamp.position.y = 6.1; p.add(lamp); S.add(p);
    }
  }

  private makeTruck(color: string): THREE.Group {
    const g = new THREE.Group(); const box = new THREE.BoxGeometry(1, 1, 1);
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true });
    const dk = new THREE.MeshStandardMaterial({ color: '#23262d', roughness: 0.9 });
    const add = (mat: THREE.Material, sx: number, sy: number, sz: number, px: number, py: number, pz: number) => { const m = new THREE.Mesh(box, mat); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
    add(body, 2.4, 2.2, 2.2, 0, 1.7, 3.4); add(dk, 2.4, 0.5, 8, 0, 0.7, 0); add(new THREE.MeshStandardMaterial({ color: '#cfd3d9', roughness: 0.5 }), 2.5, 2.4, 4.6, 0, 2.2, -1.4);
    const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 8); wheel.rotateZ(Math.PI / 2);
    for (const z of [3.2, 0.2, -2.8]) for (const x of [-1.2, 1.2]) { const w = new THREE.Mesh(wheel, dk); w.position.set(x, 0.55, z); g.add(w); }
    add(new THREE.MeshBasicMaterial({ color: '#fff2c4' }), 1.8, 0.28, 0.1, 0, 1.1, 4.52);
    return g;
  }
}

function radialTexture(inner: string, outer: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
