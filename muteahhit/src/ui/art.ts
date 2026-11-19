/**
 * Görsel varlıklar (tek kaynak): personel portreleri, makine çizimleri, bina küçük resimleri, rozetler, halka göstergeler.
 * Hepsi kendi çizimimiz (SVG, lisans sorunu yok), tema renklerini kullanır, veriden üretilir ve yeniden kullanılır.
 */
export const C = { bg: '#101113', card: '#1D1E22', s2: '#27282D', s3: '#303137', line: '#38383F', acc: '#A83246', acc2: '#C64252', accD: '#8F293B', text: '#F2F0F0', mute: '#A5A1A3', dim: '#737277', ok: '#3FBF8A', warn: '#E0A13A', bad: '#FF4D5A', info: '#8E919B' };
/** Başlık/kategori emojileri (anlamlı yerlerde, tutarlı). */
export const EMOJI = { sirket: '🏢', finans: '💰', personel: '👷', makine: '🚜', malzeme: '🧱', istatistik: '📊', piyasa: '📈', basari: '🏆', uyari: '⚠️', haber: '📰', santiye: '🚧', insaat: '🏗️', anlasma: '🤝', kredi: '🏦', proje: '📐', harita: '🗺️', ihale: '📜' } as const;

const hash = (s: string | number) => { let x = 2166136261; for (const ch of String(s)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0; return x; };
const svg = (w: number, h: number, inner: string, label = '') => `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

// ---------- Personel portreleri ----------
const SKIN = ['#e8bd9a', '#d9a47e', '#c08760', '#a36d4a', '#f0cfb0'];
const ROLE: Record<string, { shirt: string; hat?: string; band?: string; extra?: string }> = {
  isci: { shirt: '#8E919B', hat: '#E0A13A' }, usta: { shirt: '#6b4e3a', hat: '#E07B2A' }, kalipci: { shirt: '#7a6a52', hat: '#E0A13A', extra: 'hammer' }, demirci: { shirt: '#5c6270', hat: '#E0A13A', extra: 'rebar' },
  elektrikci: { shirt: '#2f5aa8', hat: '#3E7BFA', extra: 'bolt' }, tesisatci: { shirt: '#2f7f8a', hat: '#8E919B', extra: 'wrench' }, santiye_sefi: { shirt: '#F2F0F0', hat: '#F2F0F0', band: '#C64252', extra: 'clip' },
  muhendis: { shirt: '#3a3d4a', hat: '#F2F0F0', extra: 'tube' }, mimar: { shirt: '#303137', extra: 'glasses' }, proje_yoneticisi: { shirt: '#27282D', extra: 'tie' }, muhasebeci: { shirt: '#3a3d4a', extra: 'glasses-tie' }, satis_danismani: { shirt: '#A83246', extra: 'headset' }, satin_alma: { shirt: '#2c2d33', extra: 'tie' },
};
/** Meslek ve moral yüzlü portre. mood: 0–100 (gülümseme/üzgün). `id` ten rengi ve ifadeyi çeşitlendirir. */
export function portrait(type: string, id: number, morale = 70): string {
  const r = ROLE[type] ?? ROLE.isci!, skin = SKIN[hash(id) % SKIN.length]!, m = morale >= 65 ? 'M17 31 q7 6 14 0' : morale >= 40 ? 'M18 33 h12' : 'M17 35 q7 -5 14 0';
  let s = `<circle cx="24" cy="24" r="23" fill="${C.s2}" stroke="${C.line}"/><path d="M6 46 q2 -13 18 -13 q16 0 18 13z" fill="${r.shirt}"/><rect x="21" y="29" width="6" height="6" fill="${skin}"/><circle cx="24" cy="21" r="9" fill="${skin}"/>`;
  s += `<circle cx="20.5" cy="20" r="1.2" fill="#1b1b1f"/><circle cx="27.5" cy="20" r="1.2" fill="#1b1b1f"/><path d="${m}" transform="translate(0 -1.5)" fill="none" stroke="#7a3b2e" stroke-width="1.4" stroke-linecap="round"/>`;
  if (r.hat) { s += `<path d="M14 18 q0 -11 10 -11 q10 0 10 11z" fill="${r.hat}"/><rect x="12" y="17" width="24" height="3" rx="1.5" fill="${r.hat}"/>`; if (r.band) s += `<rect x="14" y="13" width="20" height="2.4" fill="${r.band}"/>`; }
  else s += `<path d="M15 19 q0 -9 9 -9 q9 0 9 9 q-4 -5 -9 -5 q-5 0 -9 5z" fill="#2b2118"/>`;
  const x = r.extra ?? '';
  if (x.includes('glasses')) s += `<g fill="none" stroke="#111" stroke-width="1"><circle cx="20.5" cy="20" r="2.6"/><circle cx="27.5" cy="20" r="2.6"/><path d="M23.1 20 h1.8"/></g>`;
  if (x.includes('tie')) s += `<path d="M24 33 l-2.5 3 2.5 9 2.5 -9z" fill="${C.acc2}"/>`;
  if (x === 'bolt') s += `<path d="M34 34 l-3 5 3 0 -2 5 6 -7 -3 0 2 -3z" fill="#E0A13A"/>`;
  if (x === 'wrench') s += `<path d="M33 38 l6 6" stroke="#ccd" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="37" r="2.2" fill="none" stroke="#ccd" stroke-width="1.6"/>`;
  if (x === 'hammer') s += `<path d="M34 44 l5 -7" stroke="#8b6b4a" stroke-width="2"/><rect x="35" y="33" width="7" height="3.4" rx=".8" fill="#9aa"/>`;
  if (x === 'rebar') s += `<path d="M33 45 l8 -9 M36 46 l8 -9" stroke="#b06a3a" stroke-width="1.6"/>`;
  if (x === 'clip') s += `<rect x="31" y="35" width="8" height="10" rx="1" fill="#e7dcc0"/><path d="M33 38 h4 M33 41 h4" stroke="#8a7a50" stroke-width=".8"/>`;
  if (x === 'tube') s += `<rect x="33" y="35" width="3.4" height="11" rx="1.5" fill="#e7dcc0" transform="rotate(20 34 40)"/>`;
  if (x === 'headset') s += `<path d="M13 21 q0 -10 11 -10 q11 0 11 10" fill="none" stroke="#111" stroke-width="1.6"/><rect x="11.5" y="19" width="3" height="6" rx="1.4" fill="#111"/><path d="M13 25 q2 6 8 6" stroke="#111" fill="none" stroke-width="1"/>`;
  return svg(48, 48, s, type);
}

// ---------- Makine çizimleri ----------
const MC = { body: '#C64252', body2: '#8F293B', dark: '#303137', steel: '#8E919B', yellow: '#E0A13A', glass: '#9fc3d6' };
const wheel = (cx: number, cy: number, r = 5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#16171A" stroke="${C.mute}" stroke-width="1.5"/>`;
const MACHINE_ART: Record<string, string> = {
  ekskavator: `<rect x="8" y="42" width="48" height="9" rx="4.5" fill="${MC.dark}"/><rect x="14" y="30" width="30" height="13" fill="${MC.body}"/><rect x="34" y="21" width="12" height="11" fill="${MC.glass}" opacity=".85"/><path d="M16 33 L40 14 L62 22" stroke="${MC.body2}" stroke-width="5" fill="none" stroke-linejoin="round"/><path d="M62 22 L72 40 L80 40 L76 46 L66 46z" fill="${MC.steel}"/>`,
  kule_vinc: `<rect x="44" y="6" width="5" height="46" fill="${MC.yellow}"/><path d="M44 6 L49 6 M44 14 L49 22 M44 22 L49 30 M44 30 L49 38" stroke="#7a5a1c"/><rect x="6" y="6" width="84" height="4" fill="${MC.yellow}"/><rect x="6" y="10" width="14" height="8" fill="${MC.dark}"/><path d="M76 10 V30" stroke="${C.mute}"/><rect x="72" y="30" width="8" height="6" fill="${MC.steel}"/><rect x="38" y="50" width="18" height="4" fill="${MC.dark}"/>`,
  mobil_vinc: `<rect x="6" y="36" width="60" height="10" rx="2" fill="${MC.body2}"/><rect x="10" y="28" width="20" height="10" fill="${MC.body}"/><rect x="14" y="30" width="9" height="5" fill="${MC.glass}"/><path d="M40 34 L86 8" stroke="${MC.yellow}" stroke-width="6" stroke-linecap="round"/><path d="M86 8 V28" stroke="${C.mute}"/>${wheel(20, 48)}${wheel(36, 48)}${wheel(54, 48)}`,
  kepce: `<rect x="22" y="28" width="30" height="14" fill="${MC.yellow}"/><rect x="38" y="20" width="12" height="10" fill="${MC.glass}"/><path d="M22 34 L8 38 L8 46 L22 44z" fill="${MC.steel}"/>${wheel(30, 46, 6)}${wheel(48, 46, 6)}`,
  dozer: `<rect x="22" y="40" width="48" height="9" rx="4.5" fill="${MC.dark}"/><rect x="28" y="26" width="30" height="15" fill="${MC.yellow}"/><rect x="42" y="18" width="12" height="9" fill="${MC.glass}"/><path d="M12 24 L20 24 L22 46 L12 46z" fill="${MC.steel}"/><path d="M20 38 L30 34" stroke="${MC.steel}" stroke-width="3"/>`,
  beton_pompasi: `<rect x="6" y="34" width="58" height="10" rx="2" fill="#6b6e78"/><rect x="10" y="26" width="18" height="9" fill="${MC.body}"/><path d="M34 30 L50 10 L70 18 L88 10" fill="none" stroke="${MC.body}" stroke-width="4" stroke-linejoin="round"/><path d="M88 10 V30" stroke="#9a9ea8" stroke-width="4"/>${wheel(18, 46)}${wheel(46, 46)}${wheel(58, 46)}`,
  beton_mikseri: `<rect x="6" y="38" width="62" height="7" fill="${MC.dark}"/><rect x="8" y="26" width="16" height="12" fill="${MC.body}"/><path d="M28 36 L64 28 L66 14 L34 20z" fill="#e4e4e0" stroke="${C.mute}"/><path d="M36 22 L60 17 M38 28 L62 23" stroke="#b9b9b4"/>${wheel(16, 46)}${wheel(48, 46)}${wheel(60, 46)}`,
  forklift: `<rect x="30" y="30" width="26" height="14" fill="${MC.yellow}"/><rect x="40" y="18" width="12" height="13" fill="none" stroke="${MC.dark}" stroke-width="2"/><rect x="22" y="10" width="4" height="36" fill="${MC.dark}"/><rect x="10" y="40" width="16" height="3" fill="${MC.steel}"/>${wheel(36, 47, 5)}${wheel(52, 47, 5)}`,
  kamyon: `<rect x="6" y="40" width="80" height="6" fill="${MC.dark}"/><rect x="62" y="26" width="22" height="15" fill="${MC.body}"/><rect x="72" y="29" width="9" height="6" fill="${MC.glass}"/><path d="M6 24 L58 24 L52 40 L6 40z" fill="${MC.yellow}" stroke="#7a5a1c"/>${wheel(18, 48)}${wheel(34, 48)}${wheel(72, 48)}`,
  jenerator: `<rect x="14" y="20" width="62" height="26" rx="3" fill="${MC.body2}"/><rect x="20" y="25" width="26" height="12" fill="#16171A"/><path d="M52 26 h16 M52 32 h16 M52 38 h16" stroke="${C.mute}" stroke-width="2"/><path d="M80 20 l4 -8" stroke="${MC.steel}" stroke-width="2"/><rect x="14" y="46" width="62" height="3" fill="${MC.dark}"/>`,
  iskele: `<g stroke="${MC.steel}" stroke-width="2.5" fill="none"><path d="M16 6 V52 M44 6 V52 M72 6 V52"/><path d="M16 16 H72 M16 30 H72 M16 44 H72"/><path d="M16 16 L44 30 L72 16 M16 30 L44 44 L72 30" stroke-width="1.5"/></g><rect x="14" y="14" width="60" height="3" fill="${MC.yellow}"/><rect x="14" y="28" width="60" height="3" fill="${MC.yellow}"/>`,
  kompresor: `<rect x="14" y="18" width="52" height="20" rx="10" fill="${MC.body}"/><rect x="62" y="22" width="14" height="14" fill="${MC.dark}"/><path d="M76 28 q8 0 10 -10" stroke="${C.mute}" fill="none" stroke-width="2"/><circle cx="30" cy="28" r="5" fill="none" stroke="#fff" stroke-opacity=".6"/>${wheel(24, 46)}${wheel(54, 46)}`,
};
export const machineArt = (id: string, state: 'ok' | 'broken' | 'idle' = 'ok'): string => svg(96, 56, `<rect width="96" height="56" rx="8" fill="#16171A"/><rect y="52" width="96" height="4" fill="#101113"/><g opacity="${state === 'idle' ? 0.7 : 1}">${MACHINE_ART[id] ?? MACHINE_ART.kamyon}</g>${state === 'broken' ? `<path d="M70 8 l14 0 -7 12z" fill="${C.bad}"/><text x="77" y="18" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">!</text>` : ''}`, id);

// ---------- Bina küçük resimleri ----------
/** Proje/ihale/galeri küçük resmi: tür, kat sayısı, kalite ve ilerleme (0–1) → yapım halindeki bina (iskele + vinç) ya da bitmiş. */
export function buildingArt(type: string, floors: number, progress = 1, seed = 0, quality = 'standart'): string {
  const W = 120, H = 70, g = 60, r = hash(seed * 7 + type.length);
  const wall = quality === 'premium' ? '#3a2d34' : quality === 'ekonomik' ? '#30323a' : '#2f3138', glass = quality === 'premium' ? '#E07A87' : '#9fb3c6', done = progress >= 0.999;
  const fl = Math.max(1, Math.min(14, floors)), tall = Math.min(g - 6, 12 + fl * 6.2);
  let b = '';
  const windows = (x: number, w: number, hh: number, rows: number, cols: number, build = 1) => { let o = ''; for (let rr = 0; rr < rows; rr++) { if ((rows - rr) / rows > build + 0.0001) continue; for (let c = 0; c < cols; c++) o += `<rect x="${(x + 3 + c * ((w - 6) / cols)).toFixed(1)}" y="${(g - hh + 3 + rr * ((hh - 5) / rows)).toFixed(1)}" width="${(((w - 6) / cols) * 0.55).toFixed(1)}" height="${(((hh - 5) / rows) * 0.5).toFixed(1)}" fill="${glass}" opacity="${((r + rr * 3 + c * 7) % 5 === 0 ? 0.25 : 0.8).toFixed(2)}"/>`; } return o; };
  const body = (x: number, w: number, hh: number, rows: number, cols: number) => { const shown = hh * Math.min(1, progress); return `<rect x="${x}" y="${g - shown}" width="${w}" height="${shown}" fill="${wall}" stroke="${C.line}"/>` + windows(x, w, hh, rows, cols, progress) + (done ? '' : `<path d="M${x - 2} ${g - shown} V${g} M${x + w + 2} ${g - shown} V${g}" stroke="${C.warn}" stroke-width="1" opacity=".7"/>`); };
  if (type === 'mustakil' || type === 'villa') { const w = type === 'villa' ? 62 : 44, x = (W - w) / 2, hh = type === 'villa' ? 24 : 26 * Math.min(1, 0.35 + progress * 0.65); b += `<rect x="${x}" y="${g - hh}" width="${w}" height="${hh}" fill="${wall}" stroke="${C.line}"/>` + (progress > 0.6 ? `<path d="M${x - 4} ${g - hh} L${W / 2} ${g - hh - 14} L${x + w + 4} ${g - hh}z" fill="${C.acc}"/>` : '') + windows(x, w, hh, 2, type === 'villa' ? 5 : 3, progress) + (type === 'villa' && done ? `<rect x="${x + w + 6}" y="${g - 5}" width="22" height="5" rx="2" fill="#3E7BFA" opacity=".55"/>` : ''); }
  else if (type === 'site') { b += body(10, 30, tall * 0.85, Math.max(2, fl - 1), 3) + body(46, 30, tall, fl, 3) + body(82, 30, tall * 0.7, Math.max(2, fl - 2), 3); }
  else if (type === 'fabrika' || type === 'depo') { const w = 84, x = 18, hh = 28; b += `<rect x="${x}" y="${g - hh * Math.min(1, progress)}" width="${w}" height="${hh * Math.min(1, progress)}" fill="${wall}" stroke="${C.line}"/>` + (progress > 0.6 ? `<path d="M${x} ${g - hh} l14 -9 v9 l14 -9 v9 l14 -9 v9 l14 -9 v9 l14 -9 v9 l14 -9 v9" fill="${C.s3}" stroke="${C.line}"/>` : '') + (type === 'fabrika' && done ? `<rect x="${x + w - 14}" y="${g - hh - 22}" width="8" height="22" fill="${C.s3}"/>` : ''); }
  else { const w = type === 'ofis' || type === 'is_merkezi' || type === 'rezidans' || type === 'luks' ? 38 : 46, x = (W - w) / 2; b += body(x, w, tall, fl, type === 'ofis' || type === 'is_merkezi' ? 4 : 3); if (type === 'is_merkezi') b += body(x + w + 4, 24, tall * 0.7, Math.max(2, fl - 3), 2); if (type === 'luks' && done) b += `<rect x="${x - 6}" y="${g - tall * 0.5}" width="${w + 12}" height="3" fill="${C.acc2}"/>`; }
  let cr = ''; if (!done && progress > 0) { const top = Math.max(8, g - (tall * Math.min(1, progress)) - 12); cr = `<g stroke="${MC.yellow}" fill="none" stroke-width="1.4"><path d="M104 ${g} V${top}"/><path d="M84 ${top} H112"/><path d="M92 ${top} V${top + 8}" stroke="${C.mute}"/></g>`; }
  return svg(W, H, `<defs><linearGradient id="bg${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1d24"/><stop offset="1" stop-color="#2a1d24"/></linearGradient></defs><rect width="${W}" height="${H}" rx="8" fill="url(#bg${seed})"/>${b}${cr}<rect y="${g}" width="${W}" height="${H - g}" fill="#101113"/><path d="M0 ${g + 5} H${W}" stroke="${C.line}" stroke-dasharray="6 5"/>`, type);
}

// ---------- Rozetler ----------
const BADGE_EMOJI: Record<string, string> = { completed: '🏗️', sold: '🔑', unitsSold: '🏠', nw: '💰', profit: '💵', cities: '🗺️', staff: '👷', machines: '🚜', tendersWon: '🤝', bestQuality: '⭐', rep: '🏆', loans: '🏦', investors: '📈', equitySold: '📊', events: '⚡', crisisMonths: '🛡️', months: '⏳', level: '👑' };
export function badge(metric: string, tier: number, unlocked: boolean, size = 56): string {
  const col = tier >= 3 ? '#E8C15A' : tier === 2 ? '#C64252' : '#8E919B', hex = 'M28 3 L51 16 V40 L28 53 L5 40 V16z';
  return `<svg viewBox="0 0 56 56" width="${size}" height="${size}" role="img" aria-label="rozet"><path d="${hex}" fill="${unlocked ? '#27282D' : '#1d1e22'}" stroke="${unlocked ? col : '#38383F'}" stroke-width="2.4"/>${unlocked ? `<path d="${hex}" fill="none" stroke="${col}" stroke-opacity=".25" stroke-width="6"/>` : ''}<text x="28" y="35" text-anchor="middle" font-size="22" ${unlocked ? '' : 'opacity=".35" style="filter:grayscale(1)"'}>${unlocked ? (BADGE_EMOJI[metric] ?? '🏆') : '🔒'}</text></svg>`;
}

// ---------- Halka gösterge ----------
/** 0–1 oranında halka; renk anlamı çağıran belirler. */
export function ring(frac: number, color: string, center: string, sub = '', size = 76): string {
  const f = Math.max(0, Math.min(1, frac)), R = 28, L = 2 * Math.PI * R;
  return `<svg viewBox="0 0 76 76" width="${size}" height="${size}" role="img" aria-label="${sub}"><circle cx="38" cy="38" r="${R}" fill="none" stroke="#27282D" stroke-width="7"/><circle class="ringfg" cx="38" cy="38" r="${R}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(L * f).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="${sub ? 38 : 43}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.text}" font-family="Barlow Condensed,sans-serif">${center}</text>${sub ? `<text x="38" y="50" text-anchor="middle" font-size="8" fill="${C.mute}">${sub}</text>` : ''}</svg>`;
}
