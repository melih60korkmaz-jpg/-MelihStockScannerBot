import * as THREE from 'three';
import { SHOP, type ShopTypeId } from '../data/catalog';
import type { Branch, GameState } from '../core/types';

/**
 * Dışarıdan görünen kafe dükkânı. Kural: iç mekân YOK. Pencereler yarı saydam, buzlu/ışıklı panellerdir; arkalarında model yoktur.
 * Koordinatlar metre. Cephe z=0 düzleminde +z'ye bakar; kaldırım z∈[0,3.2], yol z∈[3.2,9.2].
 */
const M = new Map<string, THREE.Material>();
export function mat(color: number | string, o: Partial<{ rough: number; metal: number; emissive: number | string; ei: number; transparent: boolean; opacity: number; side: THREE.Side }> = {}): THREE.MeshStandardMaterial {
  const key = JSON.stringify([color, o]); const hit = M.get(key); if (hit) return hit as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: o.rough ?? 0.75, metalness: o.metal ?? 0.05, emissive: new THREE.Color(o.emissive ?? 0x000000), emissiveIntensity: o.ei ?? 0, transparent: o.transparent ?? false, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide });
  M.set(key, m); return m;
}
const G = new Map<string, THREE.BufferGeometry>();
export function boxG(w: number, h: number, d: number): THREE.BoxGeometry { const k = `b${w},${h},${d}`; let g = G.get(k); if (!g) { g = new THREE.BoxGeometry(w, h, d); G.set(k, g); } return g as THREE.BoxGeometry; }
export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh { const me = new THREE.Mesh(boxG(w, h, d), m); me.position.set(x, y, z); me.castShadow = shadow; me.receiveShadow = true; return me; }
export function cyl(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 12): THREE.Mesh { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; }

export function textTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (g) draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const LOGOS = ['☕', '🥐', '🌿', '⭐', '🔥', '🫘'];
function signTexture(name: string, c1: string, c2: string, logo: number, level: number): THREE.CanvasTexture {
  return textTexture((g, w, h) => {
    g.fillStyle = level >= 2 ? c2 : '#3a2a1c'; g.fillRect(0, 0, w, h); g.fillStyle = c1; g.fillRect(0, h - 14, w, 14); if (level >= 1) { g.fillRect(0, 0, w, 8); }
    g.fillStyle = '#fff'; g.font = `800 ${level >= 3 ? 56 : 50}px "Avenir Next","Trebuchet MS",sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center';
    const t = name.toUpperCase(); let fs = level >= 3 ? 56 : 50; while (fs > 22) { g.font = `800 ${fs}px "Avenir Next","Trebuchet MS",sans-serif`; if (g.measureText(t).width <= w - 150) break; fs -= 2; } g.fillText(t, w / 2 + 34, h / 2 - 4);
    g.font = '58px sans-serif'; g.fillText(LOGOS[logo % LOGOS.length] ?? '☕', 58, h / 2 - 2);
  });
}
function boardTexture(lines: string[]): THREE.CanvasTexture {
  return textTexture((g, w, h) => { g.fillStyle = '#1d2723'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a44'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#efe9d6'; g.font = '700 30px sans-serif'; g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l, 26, 56 + i * 44)); }, 256, 320);
}

export interface Seat { pos: THREE.Vector3; face: number; taken: boolean; table: number }
export interface CafeRig {
  root: THREE.Group; door: THREE.Group; doorPos: THREE.Vector3; seats: Seat[]; width: number; ledMats: THREE.MeshStandardMaterial[]; glowMats: THREE.MeshStandardMaterial[]; lampMats: THREE.MeshStandardMaterial[];
  trees: THREE.Object3D[]; flags: THREE.Object3D[]; tables: THREE.Vector3[]; signMesh: THREE.Mesh; cleanSpot: THREE.Vector3; bounds: { x0: number; x1: number };
}
const WIDTH: Record<ShopTypeId, number> = { mahalle: 7, cadde: 9, avm: 10, uni: 10, sahil: 12, luks: 9, konsept: 14, franchise: 8 };
const HEIGHT: Record<ShopTypeId, number> = { mahalle: 3.8, cadde: 4.2, avm: 4.6, uni: 4.4, sahil: 4.2, luks: 5.6, konsept: 6.2, franchise: 4.2 };
const WALL: Record<ShopTypeId, number> = { mahalle: 0xd8c7a8, cadde: 0xe4ddd0, avm: 0x9aa5ad, uni: 0xb5603f, sahil: 0xf1f1ec, luks: 0x4a4540, konsept: 0x7a5a3a, franchise: 0xe9e4da };

export function buildCafe(b: Branch, s: GameState): CafeRig {
  const f = b.facade, W = WIDTH[b.tip] + (f.cam >= 3 ? 1 : 0), H = HEIGHT[b.tip] + 1.1, root = new THREE.Group(), st = SHOP[b.tip];
  const brand = s.marka, c1 = brand.renk, c2 = brand.renk2, premium = f.premium > 0, wallCol = f.marka ? new THREE.Color(c2).lerp(new THREE.Color(WALL[b.tip]), 0.35) : new THREE.Color(WALL[b.tip]);
  const rig: CafeRig = { root, door: new THREE.Group(), doorPos: new THREE.Vector3(), seats: [], width: W, ledMats: [], glowMats: [], lampMats: [], trees: [], flags: [], tables: [], signMesh: new THREE.Mesh(), cleanSpot: new THREE.Vector3(), bounds: { x0: -W / 2, x1: W / 2 } };
  const D = 8;
  /* gövde */
  root.add(box(W, H, D, mat(premium ? 0x9a9186 : wallCol.getHex(), { rough: premium ? 0.55 : 0.85 }), 0, H / 2, -D / 2));
  if (premium) { root.add(box(W + 0.2, 0.5, 0.4, mat(0xc9a661, { metal: 0.8, rough: 0.3 }), 0, H + 0.05, 0.05)); for (let i = 0; i < 5; i++) root.add(box(0.16, H - 0.9, 0.18, mat(0xc9a661, { metal: 0.8, rough: 0.3 }), -W / 2 + 0.3 + i * (W - 0.6) / 4, H / 2 + 0.3, 0.06)); }
  root.add(box(W + 0.3, 0.3, D + 0.3, mat(0x6a6a6a), 0, H + 0.15, -D / 2));                    // çatı
  if (b.tip === 'konsept') { const roof = box(W + 2, 0.4, D + 2, mat(0x3a2a1c), 0, H + 0.5, -D / 2); roof.rotation.x = -0.05; root.add(roof); }
  root.add(box(W + 0.4, 0.25, 0.6, mat(0x777777, { rough: 0.9 }), 0, 0.125, 0.2));            // kaldırım şeridi
  /* komşu binalar */
  const nb = (x: number, w: number, h: number, col: number) => { root.add(box(w, h, D, mat(col), x, h / 2, -D / 2)); for (let r = 0; r < Math.floor(h / 3.2); r++) for (let i = 0; i < Math.floor(w / 2.4); i++) root.add(box(1.1, 1.3, 0.1, mat(0x9fc2d6, { rough: 0.2, metal: 0.4 }), x - w / 2 + 1.4 + i * 2.4, 3.6 + r * 3.2 + 0.3, 0.02)); };
  nb(-W / 2 - 4.2, 8, 7.5, 0xc9b79c); nb(W / 2 + 4.2, 8, 6.4, 0xb9a89a); nb(-W / 2 - 11, 8, 8.5, 0xbfc7c6); nb(W / 2 + 11, 8, 7, 0xd7cfc1);
  /* cam cephe */
  const glassH = 1.6 + f.cam * 0.25, glassY = 0.95 + glassH / 2, winW = W - 2.8 - (b.tip === 'mahalle' ? 0.4 : 0), doorX = Math.min(-0.2, -W / 2 + 1.4 + (W - 2.8) * 0.78), frameM = mat(f.cam >= 2 ? 0x1c1c1c : 0x6a4a2c, { metal: f.cam >= 2 ? 0.6 : 0.1, rough: 0.4 });
  const glassM = mat(0xcfe6f0, { rough: 0.05, metal: 0.5, transparent: true, opacity: 0.3 }), warm = mat(0xf6e6c4, { emissive: 0xffc070, ei: 0.0, rough: 0.9 });
  rig.glowMats.push(warm as THREE.MeshStandardMaterial);
  const nWin = f.cam >= 3 ? 1 : Math.max(1, Math.round(winW / 3.4));
  const winX0 = -W / 2 + 1.0, winX1 = doorX - 1.15, span = Math.max(1.4, winX1 - winX0), pw = span / nWin;
  for (let i = 0; i < nWin; i++) {
    const cx = winX0 + pw * (i + 0.5);
    root.add(box(pw - 0.1, glassH, 0.06, warm, cx, glassY, -0.02, false));                      // buzlu sıcak panel (içeri gösterme)
    root.add(box(pw - 0.06, glassH, 0.04, glassM, cx, glassY, 0.05, false));                   // cam
    root.add(box(pw, 0.08, 0.14, frameM, cx, glassY + glassH / 2, 0.06)); root.add(box(pw, 0.08, 0.14, frameM, cx, glassY - glassH / 2, 0.06)); root.add(box(0.08, glassH, 0.14, frameM, cx - pw / 2, glassY, 0.06)); root.add(box(0.08, glassH, 0.14, frameM, cx + pw / 2, glassY, 0.06));
    if (f.cam <= 1) root.add(box(0.05, glassH, 0.1, frameM, cx, glassY, 0.06));
    root.add(box(pw - 0.1, 0.5, 0.1, mat(f.marka ? c1 : 0x8a7a68), cx, 0.5, 0.04));                // vitrin altı panel
  }
  if (f.vitrin) { const vx = winX0 + span * 0.5; root.add(box(span * 0.62, 0.7, 0.45, mat(0xf2ece0), vx, 1.28, 0.32)); const items = ['#d9a15a', '#f3d9b0', '#7a3f22', '#e8a2b0', '#b86b2b']; for (let i = 0; i < 7; i++) root.add(box(0.28, 0.2, 0.28, mat(items[i % 5] ?? '#d9a15a'), vx - span * 0.27 + i * (span * 0.54 / 6), 1.74, 0.34)); root.add(box(span * 0.62, 0.04, 0.5, mat(0xd8d8d8, { metal: 0.6 }), vx, 1.66, 0.34)); }
  /* kapı */
  const dW = 1.3 + f.kapi * 0.1, dH = 2.3; const doorFrame = mat(f.kapi >= 1 ? 0x222222 : 0x6a4a2c, { metal: f.kapi >= 1 ? 0.5 : 0.1 });
  root.add(box(dW + 0.3, 0.14, 0.2, doorFrame, doorX, dH + 0.07, 0.08)); root.add(box(0.12, dH, 0.2, doorFrame, doorX - dW / 2 - 0.1, dH / 2, 0.08)); root.add(box(0.12, dH, 0.2, doorFrame, doorX + dW / 2 + 0.1, dH / 2, 0.08));
  root.add(box(dW, dH, 0.05, mat(0x2a1e14), doorX, dH / 2, -0.06, false));                      // kapı boşluğu (içerisi karanlık, görünmez)
  const pivot = new THREE.Group(); pivot.position.set(doorX - dW / 2, 0, 0.1); const panel = box(dW, dH - 0.06, 0.07, f.kapi >= 1 ? mat(0xcfe6f0, { rough: 0.05, metal: 0.4, transparent: true, opacity: 0.55 }) : mat(0x7a4f2a), dW / 2, (dH - 0.06) / 2, 0); pivot.add(panel); pivot.add(box(0.05, 0.5, 0.1, mat(0xcccccc, { metal: 0.9 }), dW - 0.15, 1.05, 0.06)); root.add(pivot);
  rig.door = pivot; rig.doorPos.set(doorX, 0, 0.5);
  /* tabela */
  const sw = Math.min(W - 0.6, 4.2 + f.tabela * 0.9), sh = 0.8 + f.tabela * 0.14, sy = 3.3 + sh / 2 + 0.05;
  const sMat = new THREE.MeshStandardMaterial({ map: signTexture(brand.ad, c1, c2, brand.logo, f.tabela), roughness: 0.5, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0, emissiveMap: null });
  const sg = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.18), [mat(0x222222), mat(0x222222), mat(0x222222), mat(0x222222), sMat, mat(0x222222)]); sg.position.set(-W / 2 + sw / 2 + 0.5, sy, 0.3); sg.castShadow = true; root.add(sg); rig.signMesh = sg;
  rig.glowMats.push(sMat); sMat.emissiveMap = (sMat.map ?? null);
  if (f.tabela >= 2) root.add(box(sw + 0.2, 0.06, 0.34, mat(0xc9a661, { metal: 0.8, rough: 0.3 }), sg.position.x, sy - sh / 2 - 0.05, 0.3));
  /* LED */
  if (f.led) { const led = mat(c1, { emissive: c1, ei: 0.0 }) as THREE.MeshStandardMaterial; rig.ledMats.push(led); root.add(box(W - 0.3, 0.07, 0.07, led, 0, 0.18, 0.28)); root.add(box(sw + 0.1, 0.05, 0.05, led, sg.position.x, sy + sh / 2 + 0.06, 0.32)); root.add(box(0.06, glassH + 0.2, 0.06, led, winX1 + 0.02, glassY, 0.14)); }
  /* tente */
  const aw = f.tente; if (aw > 0) { const colA = aw >= 2 ? c1 : 0xe8e0d0, colB = aw >= 2 ? '#ffffff' : c2, n = 8, aw1 = W - 1; for (let i = 0; i < n; i++) { const seg = box(aw1 / n, 0.06, 1.4 + (aw >= 3 ? 0.5 : 0), mat(i % 2 ? colB : colA, { rough: 0.9 }), -aw1 / 2 + (i + 0.5) * aw1 / n, 2.75 + (aw >= 3 ? 0.1 : 0), 0.7 + (aw >= 3 ? 0.25 : 0)); seg.rotation.x = 0.28; root.add(seg); } }
  /* menü panosu, çöp kutusu, bisiklet */
  const lines = ['☕ Espresso   ' + 75, '🥛 Latte      ' + 105, '🥐 Kruvasan  ' + 85, '🍰 Cheesecake ' + 135]; const bd = box(0.8, 1.1, 0.08, new THREE.MeshStandardMaterial({ map: boardTexture(lines) }), W / 2 - 0.9, 1.35, 0.9); const stand1 = box(0.06, 0.8, 0.06, mat(0x333333), W / 2 - 1.25, 0.4, 0.9), stand2 = stand1.clone(); stand2.position.x += 0.7; root.add(bd, stand1, stand2); bd.rotation.y = -0.25;
  root.add(cyl(0.22, 0.2, 0.7, mat(0x35505a, { metal: 0.3 }), -W / 2 + 0.5, 0.35, 1.6)); root.add(cyl(0.22, 0.2, 0.7, mat(0x2d6a45, { metal: 0.3 }), -W / 2 + 0.95, 0.35, 1.6));
  if (b.tip === 'uni' || b.tip === 'cadde' || b.tip === 'mahalle') { for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 16), mat(0x222222)); w.position.set(-W / 2 - 0.1 + i * 0.28, 0.32, 2.4); w.rotation.y = Math.PI / 2; root.add(w); const w2 = w.clone(); w2.position.z += 0.7; root.add(w2); root.add(box(0.03, 0.04, 0.8, mat(0x222222), w.position.x, 0.5, 2.75)); } }
  /* saksılar ve peyzaj */
  const pots = f.peyzaj + (b.tip === 'luks' ? 1 : 0) + 1; for (let i = 0; i < pots; i++) { const px = -W / 2 + 0.6 + i * 0.95 + (i > 2 ? 3 : 0); if (px > doorX - 1) continue; root.add(cyl(0.22, 0.17, 0.4, mat(0x9a5b36), px, 0.2, 0.7)); const plant = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(0x3d8f4f)); plant.position.set(px, 0.62, 0.7); plant.scale.y = 1.2; plant.castShadow = true; root.add(plant); rig.trees.push(plant); }
  for (let i = 0; i < f.peyzaj; i++) { const tx = W / 2 - 0.3 + 2.0 * i + 1.4; rig.trees.push(tree(root, tx, 2.9, 1 + i * 0.08)); }
  /* dış masa ve sandalyeler */
  const nT = SHOP[b.tip].masa === 0 ? 0 : SHOP[b.tip].masa + 2 * f.oturma, cols = Math.min(nT, Math.max(2, Math.floor((W + 3) / 2.4)));
  const chairM = mat(f.oturma >= 2 ? 0x2b2b2b : 0x8a6a44, { metal: f.oturma >= 2 ? 0.5 : 0.05 }), tableM = mat(f.oturma >= 2 ? 0xe9e1d2 : 0xb98a55, { rough: 0.5 }), umbM = [mat(c1, { rough: 0.9, side: THREE.DoubleSide }), mat(0xe8e0d0, { rough: 0.9, side: THREE.DoubleSide })];
  for (let i = 0; i < nT; i++) {
    const col = i % cols, row = Math.floor(i / cols), tx = -W / 2 + 0.9 + col * 2.35 + (row % 2) * 0.7, tz = 1.45 + row * 1.5 + (tx > doorX - 1.2 && tx < doorX + 1.2 && row === 0 ? 0.9 : 0); if (tz > 3.0) break;
    const t = new THREE.Group(); t.position.set(tx, 0, tz); t.add(cyl(0.45, 0.45, 0.05, tableM, 0, 0.74, 0, 16)); t.add(cyl(0.04, 0.04, 0.74, mat(0x333333), 0, 0.37, 0, 8)); t.add(cyl(0.22, 0.25, 0.04, mat(0x333333), 0, 0.02, 0, 10)); root.add(t); rig.tables.push(new THREE.Vector3(tx, 0, tz));
    const ang = [Math.PI, 0, Math.PI / 2, -Math.PI / 2]; for (let k = 0; k < 4; k++) { if (k >= 2 && f.oturma < 1) break; const a = ang[k] ?? 0, px = tx + Math.sin(a + Math.PI) * 0.78 * (k < 2 ? 1 : 1), pz = tz + Math.cos(a + Math.PI) * 0.78; const chair = new THREE.Group(); chair.position.set(px, 0, pz); chair.rotation.y = a; chair.add(box(0.42, 0.05, 0.42, chairM, 0, 0.46, 0)); chair.add(box(0.42, 0.45, 0.05, chairM, 0, 0.7, -0.2)); for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]] as const) chair.add(box(0.04, 0.46, 0.04, chairM, lx, 0.23, lz, false)); root.add(chair); rig.seats.push({ pos: new THREE.Vector3(px, 0, pz), face: a + Math.PI, taken: false, table: i }); }
    if (f.tente >= 1 && (i % 2 === 0)) { const um = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.5, 8, 1, true), umbM[(i / 2 | 0) % 2]); um.position.set(tx, 2.25, tz); um.castShadow = true; root.add(um); root.add(cyl(0.03, 0.03, 2.2, mat(0x555555), tx, 1.1, tz, 6)); rig.flags.push(um); }
  }
  /* sokak lambaları ve genel çevre */
  for (const lx of [-W / 2 - 1.0, W / 2 + 1.0, 0]) { if (lx === 0 && W < 8) continue; const lamp = new THREE.Group(); lamp.position.set(lx, 0, 3.0); lamp.add(cyl(0.05, 0.07, 4.2, mat(0x2a2a2a, { metal: 0.6 }), 0, 2.1, 0, 8)); const lm = mat(0xfff0c0, { emissive: 0xffd98a, ei: 0 }) as THREE.MeshStandardMaterial; rig.lampMats.push(lm); const head = box(0.5, 0.14, 0.26, lm, 0, 4.25, 0.3); lamp.add(head); lamp.add(box(0.05, 0.05, 0.4, mat(0x2a2a2a), 0, 4.2, 0.12)); root.add(lamp); }
  if (b.tip === 'sahil') { for (let i = 0; i < 3; i++) palm(root, -W / 2 + 1.5 + i * 5.5, 3.1); }
  rig.cleanSpot.set(doorX + 1.5, 0, 1.2); return rig;
}
function tree(root: THREE.Group, x: number, z: number, sc: number): THREE.Group {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); g.add(cyl(0.12, 0.18, 1.6, mat(0x6b4a2c), 0, 0.8, 0, 7)); for (const [dx, dy, dz, r] of [[0, 2.1, 0, 0.9], [0.5, 1.8, 0.2, 0.65], [-0.45, 1.85, -0.1, 0.7]] as const) { const l = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mat(0x3f8f4a)); l.position.set(dx, dy, dz); l.castShadow = true; g.add(l); } root.add(g); return g;
}
function palm(root: THREE.Group, x: number, z: number): void { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(cyl(0.1, 0.16, 3.4, mat(0x8a6a44), 0, 1.7, 0, 7)); for (let i = 0; i < 6; i++) { const leaf = box(0.12, 0.04, 1.5, mat(0x2f8a4a), 0, 3.4, 0); leaf.rotation.set(0.4, (i / 6) * Math.PI * 2, 0); leaf.position.set(Math.sin((i / 6) * Math.PI * 2) * 0.6, 3.35, Math.cos((i / 6) * Math.PI * 2) * 0.6); g.add(leaf); } root.add(g); }
