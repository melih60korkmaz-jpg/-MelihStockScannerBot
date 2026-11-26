/** Çizimler (satır içi SVG, harici dosya yok): fincan, çekirdek, barista, esnaf vitrini, rakip rozeti, madalya, fuar çadırı, latte art. CSS ile canlandırılır. */
import { h32 } from '../core/derin';

const SUT = ['#f3e3c6', '#e8d6a8', '#f6eddc', ''], SUP = ['', '#f5d77a', '#c8792a', '#a8723a', '#a98bd6'], SOS = ['', '#4a2a1a', '#f6efe6'];
export interface FincanT { sut: number; sup: number; sos: number; soguk: boolean; shot: number }
/** Tarifin canlı önizlemesi: katmanlar, buhar (sıcak) ya da buz (soğuk). */
export function fincan(t: FincanT, boy = 120): string {
  const w = boy, h = boy * 1.15, id = `f${h32(t.sut, t.sup, t.sos, t.soguk ? 1 : 0, t.shot)}`;
  const kat = [{ c: '#3b2314', y: 0.22 * t.shot }, ...(t.sut < 3 ? [{ c: SUT[t.sut]!, y: 0.5 - 0.1 * t.shot }] : [{ c: '#2c1a0f', y: 0.3 }])];
  const toplam = kat.reduce((a, k) => a + k.y, 0); let y = 118; const rects = kat.map((k) => { const hh = (k.y / toplam) * 70; y -= hh; return `<rect x="30" y="${y.toFixed(1)}" width="60" height="${hh.toFixed(1)}" fill="${k.c}"/>`; }).join('');
  const sup = t.sup > 0 ? `<path d="M34 ${y + 6} q8 10 16 0 t16 0 t16 0" fill="none" stroke="${SUP[t.sup]}" stroke-width="3" stroke-linecap="round" class="damla"/>` : '';
  const sos = t.sos > 0 ? `<path d="M36 ${y + 1} q6 -6 12 0 t12 0 t12 0 t12 0" fill="none" stroke="${SOS[t.sos]}" stroke-width="3.2" stroke-linecap="round"/>` : '';
  const govde = t.soguk ? `<path d="M26 44 h68 l-6 80 q-1 6 -7 6 h-42 q-6 0 -7 -6 z" fill="rgba(200,230,240,.12)" stroke="rgba(220,240,250,.7)" stroke-width="2"/>` : `<path d="M26 54 h68 v46 q0 28 -34 28 q-34 0 -34 -28 z" fill="rgba(255,255,255,.07)" stroke="rgba(255,235,210,.75)" stroke-width="2"/><path d="M94 66 q22 0 22 20 q0 20 -22 20" fill="none" stroke="rgba(255,235,210,.75)" stroke-width="5" stroke-linecap="round"/>`;
  const ust = t.soguk ? 44 : 54;
  const ek = t.soguk ? `<g class="buz"><rect x="42" y="${ust + 8}" width="14" height="14" rx="3" fill="rgba(210,240,255,.55)"/><rect x="60" y="${ust + 18}" width="13" height="13" rx="3" fill="rgba(210,240,255,.45)"/></g><rect x="72" y="14" width="5" height="62" rx="2.5" fill="#d96a6a" transform="rotate(14 74 40)"/>` : `<g class="buhar" fill="none" stroke="rgba(255,240,225,.7)" stroke-width="3" stroke-linecap="round"><path d="M44 40 q-8 -10 0 -18 t0 -16"/><path d="M60 38 q-8 -10 0 -18 t0 -16" style="animation-delay:.5s"/><path d="M76 40 q-8 -10 0 -18 t0 -16" style="animation-delay:1s"/></g>`;
  return `<svg class="fincan" viewBox="0 0 120 138" width="${w}" height="${h}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${t.soguk ? 'M28 46 h64 l-6 76 q-1 5 -6 5 h-40 q-5 0 -6 -5 z' : 'M28 56 h64 v44 q0 26 -32 26 q-32 0 -32 -26 z'}"/></clipPath></defs><g clip-path="url(#${id})">${rects}${sup}${sos}</g>${govde}${ek}</svg>`;
}

const KAV = ['#b07a45', '#7a4a26', '#3d2314'], ULKE: Record<string, string> = { brezilya: '#3da65a', etiyopya: '#e0b53c', kolombiya: '#d9a02a', guatemala: '#5aa8d9', robusta: '#c8503c' };
/** Çekirdek yığını: kavurma derecesine göre renk; ülke rengiyle çuval şeridi. */
export function cekirdek(id: string, kav = 1, boy = 64): string {
  const c = KAV[kav] ?? KAV[1]!, a = ULKE[id] ?? '#aaa'; const taneler = [[20, 46, -20], [36, 50, 15], [52, 46, 35], [28, 36, 5], [44, 36, -25], [36, 26, 20]].map(([x, y, r], i) => `<g transform="translate(${x} ${y}) rotate(${r})" class="tane" style="animation-delay:${i * 0.15}s"><ellipse rx="9" ry="12" fill="${c}"/><path d="M0 -10 q4 10 0 20" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1.6"/><ellipse rx="3" ry="5" cx="-3" cy="-3" fill="rgba(255,255,255,.14)"/></g>`).join('');
  return `<svg class="bean" viewBox="0 0 72 72" width="${boy}" height="${boy}" aria-hidden="true"><path d="M8 66 q-2 -22 8 -34 h40 q10 12 8 34 z" fill="#c9a574"/><rect x="8" y="50" width="56" height="9" fill="${a}" opacity=".85"/><path d="M16 32 q20 -8 40 0" stroke="#9c7a4c" stroke-width="3" fill="none"/>${taneler}</svg>`;
}

const TEN = ['#f1c9a5', '#e0a97d', '#c68a5c', '#8e5a3a'], SAC = ['#2b1d14', '#5a3a22', '#a8742f', '#1a1a1a', '#7a3a2a'], ONL = ['#e07a3a', '#3aa89a', '#7a5cd6', '#d9534f', '#3a7ac8'];
/** Barista avatarı: tohumdan deterministik; seviye kadar yıldız. */
export function barista(seed: number, seviye = 0, boy = 72): string {
  const t = TEN[h32(seed, 1) % 4]!, s = SAC[h32(seed, 2) % 5]!, o = ONL[h32(seed, 3) % 5]!, uzun = h32(seed, 4) % 2 === 0, gozluk = h32(seed, 5) % 4 === 0, yild = Array.from({ length: Math.min(5, Math.ceil(seviye / 2)) }, (_, i) => `<text x="${24 + i * 9}" y="9" font-size="9" fill="#ffd45c">★</text>`).join('');
  return `<svg class="avatar" viewBox="0 0 72 80" width="${boy}" height="${boy * 1.1}" aria-hidden="true">${yild}<path d="M14 80 q0 -22 22 -22 t22 22z" fill="${o}"/><rect x="26" y="58" width="20" height="22" rx="4" fill="#fff" opacity=".85"/><circle cx="36" cy="38" r="15" fill="${t}"/>${uzun ? `<path d="M21 36 q0 -22 15 -22 t15 22 q-4 -10 -15 -10 t-15 10z" fill="${s}"/><rect x="19" y="34" width="6" height="22" rx="3" fill="${s}"/><rect x="47" y="34" width="6" height="22" rx="3" fill="${s}"/>` : `<path d="M21 36 q0 -22 15 -22 t15 22 q-6 -8 -15 -8 t-15 8z" fill="${s}"/>`}<circle cx="30" cy="40" r="1.8" fill="#222" class="goz"/><circle cx="42" cy="40" r="1.8" fill="#222" class="goz"/><path d="M31 47 q5 4 10 0" stroke="#7a3a2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>${gozluk ? '<g fill="none" stroke="#222" stroke-width="1.4"><circle cx="30" cy="40" r="4.5"/><circle cx="42" cy="40" r="4.5"/><path d="M34.5 40 h3"/></g>' : ''}<path d="M24 20 h24 l-3 -8 h-18z" fill="#fff" opacity=".9"/></svg>`;
}
/** Müdavim: baş harfli, renkli yuvarlak; bağ yüksekse kalp. */
export function muteri(ad: string, bag: number, boy = 44): string {
  const c = ONL[h32(...[...ad].map((x) => x.charCodeAt(0))) % 5]!, harf = (ad.split(' ').pop() ?? ad).charAt(0).toUpperCase();
  return `<svg class="mav" viewBox="0 0 48 48" width="${boy}" height="${boy}" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="${c}"/><circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><text x="24" y="31" text-anchor="middle" font-size="21" font-weight="800" fill="#fff">${harf}</text>${bag >= 70 ? '<text x="38" y="14" font-size="13" class="kalp">💖</text>' : bag < 25 ? '<text x="38" y="14" font-size="12">💤</text>' : ''}</svg>`;
}

const TENT: Record<string, [string, string]> = { firin: ['#d98a3a', '🥖'], kitap: ['#3a7ac8', '📚'], cicek: ['#d9648a', '💐'], spor: ['#3aa89a', '🏋️'], eczane: ['#4fa86a', '💊'], berber: ['#c8503c', '💈'] };
/** Komşu esnaf vitrini: tente, sallanan tabela, yanıp sönen ışıklar. */
export function vitrin(id: string, iliski: number, boy = 96): string {
  const [c, ik] = TENT[id] ?? ['#999', '🏪'], sol = Array.from({ length: 6 }, (_, i) => `<rect x="${12 + i * 12}" y="22" width="12" height="14" fill="${i % 2 ? '#fff' : c}"/>`).join(''), lamba = iliski >= 60 ? '#ffe28a' : '#6b7a82';
  return `<svg class="vitrin" viewBox="0 0 96 84" width="${boy}" height="${boy * 0.875}" aria-hidden="true"><rect x="8" y="34" width="80" height="46" rx="3" fill="#25363d" stroke="rgba(255,255,255,.2)"/><rect x="14" y="42" width="30" height="28" rx="2" fill="${lamba}" opacity=".85" class="isik"/><rect x="52" y="42" width="26" height="38" rx="2" fill="#16242a"/><circle cx="56" cy="62" r="1.8" fill="#ffd45c"/>${sol}<path d="M8 22 h80 l-4 -10 h-72z" fill="${c}"/><g class="tabela"><rect x="30" y="2" width="36" height="14" rx="3" fill="#f4ead4"/><text x="48" y="13" text-anchor="middle" font-size="11">${ik}</text></g></svg>`;
}

const KIS: Record<string, string> = { agresif: '#d9534f', kalite: '#7a5cd6', gelenek: '#c08a3e', franchise: '#2ba3a3' };
/** Rakip zincir rozeti: kalkan, harfler, kişilik rengi. */
export function rozet(ad: string, kisilik: string, boy = 64): string {
  const c = KIS[kisilik] ?? '#999', hf = ad.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('');
  return `<svg class="rozet" viewBox="0 0 64 72" width="${boy}" height="${boy * 1.12}" aria-hidden="true"><path d="M32 3 L58 12 V34 q0 22 -26 34 q-26 -12 -26 -34 V12z" fill="${c}" stroke="rgba(255,255,255,.55)" stroke-width="2.5"/><path d="M32 8 L53 15 V34 q0 17 -21 28 q-21 -11 -21 -28 V15z" fill="rgba(0,0,0,.18)"/><text x="32" y="43" text-anchor="middle" font-size="22" font-weight="900" fill="#fff">${hf}</text><rect x="6" y="3" width="52" height="66" fill="none" class="parla2"/></svg>`;
}

/** Madalya: derece 1 altın, 2 gümüş, 3 bronz; parlama süpürmesi. */
export function madalya(derece: number, boy = 64): string {
  const [a, b] = derece === 1 ? ['#ffd45c', '#c48a14'] : derece === 2 ? ['#e6edf2', '#8e9aa5'] : derece === 3 ? ['#e0a070', '#8a5326'] : ['#8fa6b0', '#4a5c66'];
  return `<svg class="madalya" viewBox="0 0 64 84" width="${boy}" height="${boy * 1.3}" aria-hidden="true"><defs><linearGradient id="md${derece}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><clipPath id="mc${derece}"><circle cx="32" cy="50" r="22"/></clipPath></defs><path d="M16 2 h14 l8 30 h-14z" fill="#d9534f"/><path d="M48 2 h-14 l-8 30 h14z" fill="#3a7ac8"/><circle cx="32" cy="50" r="24" fill="url(#md${derece})" stroke="rgba(255,255,255,.6)" stroke-width="2"/><circle cx="32" cy="50" r="17" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/><text x="32" y="57" text-anchor="middle" font-size="20" font-weight="900" fill="rgba(0,0,0,.45)">${derece <= 3 ? derece : '★'}</text><g clip-path="url(#mc${derece})"><g transform="rotate(25 32 50)"><rect class="sweep" x="-30" y="20" width="14" height="60" fill="rgba(255,255,255,.55)"/></g></g></svg>`;
}

/** Fuar çadırı: dalgalanan bayraklar. */
export function cadir(boy = 120): string {
  const bay = [['#d9534f', 14], ['#e0b53c', 40], ['#3aa89a', 66], ['#7a5cd6', 92]].map(([c, x], i) => `<g transform="translate(${x} ${i % 2 ? 22 : 14})"><rect x="-1" y="0" width="2" height="16" fill="#e8d6a8"/><g class="bayrak" style="animation-delay:${i * 0.2}s"><path d="M1 0 h12 l-3 4 l3 4 h-12z" fill="${c}"/></g></g>`).join('');
  return `<svg class="cadir" viewBox="0 0 120 100" width="${boy}" height="${boy * 0.83}" aria-hidden="true"><path d="M10 52 L60 12 L110 52z" fill="#e8d6a8"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${10 + i * 20} 52 L60 12 L${30 + i * 20} 52z" fill="${i % 2 ? '#d9534f' : '#f4ead4'}" opacity=".95"/>`).join('')}<rect x="14" y="52" width="92" height="38" fill="#2a3b43"/><rect x="20" y="58" width="80" height="12" fill="#c08a3e"/><text x="60" y="68" text-anchor="middle" font-size="9" fill="#2a1a0e" font-weight="800">KAHVE FUARI</text><text x="38" y="86" font-size="14">☕</text><text x="62" y="86" font-size="14">🫘</text><text x="82" y="86" font-size="14">🏆</text>${bay}</svg>`;
}

/** Latte art (üstten görünüm): skor 0–1 arttıkça desen belirginleşir. */
export function latteArt(skor: number, boy = 140): string {
  const o = Math.max(0.12, Math.min(1, skor));
  return `<svg class="latte" viewBox="0 0 140 140" width="${boy}" height="${boy}" aria-hidden="true"><circle cx="70" cy="70" r="64" fill="#f4ead4" stroke="#d9c9a8" stroke-width="3"/><circle cx="70" cy="70" r="52" fill="#9a6a3c"/><circle cx="70" cy="70" r="46" fill="#b5834d"/><g opacity="${o}" fill="none" stroke="#fff6e4" stroke-width="5" stroke-linecap="round"><path d="M70 100 V44"/><path d="M70 92 q-24 -4 -24 -22 q22 2 24 22"/><path d="M70 76 q-18 -4 -18 -18 q16 2 18 18"/><path d="M70 92 q24 -4 24 -22 q-22 2 -24 22"/><path d="M70 76 q18 -4 18 -18 q-16 2 -18 18"/><path d="M70 60 q-10 -2 -10 -12 q10 2 10 12"/><path d="M70 60 q10 -2 10 -12 q-10 2 -10 12"/></g></svg>`;
}
/** Takvim ikonu (animasyon için kapsayıcı). */
export const hareketli = (ik: string, sinif = 'zip'): string => `<span class="${sinif}">${ik}</span>`;
