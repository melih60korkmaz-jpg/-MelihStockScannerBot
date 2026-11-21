/**
 * Şirket logo galerisi: 10 özgün logo × 8 kurumsal renk.
 * Her logo kendi çerçevesi (kare, daire, kalkan, altıgen, baklava) ve şekliyle ayrı bir çizimdir; yalnızca renk değiştirerek çoğaltılmamıştır.
 * `emblem.shape` = logo kimliği (0–9), `emblem.color` = renk kimliği (0–7). Geçersiz kimlik (eski kayıt) ilk logoya düşer.
 * Marka rengi yalnızca şirket logosunda kullanılır; oyunun arayüz rengi antrasit–turuncu kalır.
 */
type Frame = 'sq' | 'ci' | 'sh' | 'hx' | 'di';
const FRAMES: Record<Frame, string> = {
  sq: '<rect x="1" y="1" width="46" height="46" rx="11" fill="{F}" stroke="{S}" stroke-width="1.5"/>',
  ci: '<circle cx="24" cy="24" r="23" fill="{F}" stroke="{S}" stroke-width="1.5"/>',
  sh: '<path d="M24 1.5 44 8.5V24c0 11.5-8.5 19.5-20 22.5C12.5 43.5 4 35.5 4 24V8.5z" fill="{F}" stroke="{S}" stroke-width="1.5" stroke-linejoin="round"/>',
  hx: '<path d="M24 1.5 44 13v22L24 46.5 4 35V13z" fill="{F}" stroke="{S}" stroke-width="1.5" stroke-linejoin="round"/>',
  di: '<path d="M24 1 47 24 24 47 1 24z" fill="{F}" stroke="{S}" stroke-width="1.5" stroke-linejoin="round"/>',
};
export interface Logo { id: number; name: string; frame: Frame; glyph: string }
const mk = (id: number, name: string, frame: Frame, glyph: string): Logo => ({ id, name, frame, glyph });
/** 10 özgün logo. (Eski sürümde daha fazlası vardı; kayıtlardaki geçersiz kimlik ilk logoya düşer.) */
export const LOGOS: Logo[] = [
  mk(0, 'Baret kalkan', 'sh', '<path fill="{K}" d="M13 31a11 11 0 0 1 22 0zM11 32.2h26v3H11zM22.2 15h3.6v7h-3.6z"/>'),
  mk(1, 'Kule vinç', 'sq', '<path fill="{K}" fill-rule="evenodd" transform="translate(7.2 7.2) scale(1.4)" d="M11 3h2v18h-2zM3 6h18v2H3zM6 8h1v6H6z"/>'),
  mk(2, 'Üçlü kule', 'ci', '<path fill="{K}" d="M11 36V23h6v13zM19 36V12h9v24zM30 36V19h7v17zM8 38h32v2.5H8zM23 7.5h1.6V12H23z"/><path fill="{F}" d="M21.5 16h1.6v2h-1.6zM24.8 16h1.6v2h-1.6zM21.5 21h1.6v2h-1.6zM24.8 21h1.6v2h-1.6z"/>'),
  mk(3, 'Şehir siluet', 'sq', '<path fill="{K}" d="M8 37V27h5v10zM14.5 37V19h6v18zM22 37V11h7v26zM30.5 37V22h5v15zM37 37V29h3.5v8zM7 38.5h34V41H7z"/><path fill="{F}" d="M23.7 15h1.4v2h-1.4zM26 15h1.4v2H26zM23.7 20h1.4v2h-1.4zM26 20h1.4v2H26zM16 23h1.4v2H16zM18 23h1.4v2H18z"/>'),
  mk(4, 'Cephe', 'sq', '<path fill="none" stroke="{K}" stroke-width="2.4" d="M12 10h24v28H12zM12 19.3h24M12 28.6h24M20 10v28M28 10v28"/><path fill="{K}" d="M20 19.3h8v9.3h-8z"/>'),
  mk(5, 'Kemer', 'ci', '<path fill="{K}" d="M10 37V25a14 14 0 0 1 28 0v12h-6.5V25a7.5 7.5 0 0 0-15 0v12zM8 37.5h32v3.5H8z"/>'),
  mk(6, 'Elmas', 'di', '<path fill="{K}" d="M24 12.5 34.5 20 24 36 13.5 20z"/><path fill="none" stroke="{F}" stroke-width="1.6" stroke-linejoin="round" d="M13.5 20h21M24 12.5 19 20l5 16 5-16z"/>'),
  mk(7, 'Villa', 'sh', '<path fill="{K}" d="M10 26 24 14l14 12v11H10zM31 13h3.5v7L31 17.5z"/><path fill="{F}" d="M21 37v-8.5h6V37zM13 29h4.5v4H13zM30.5 29H35v4h-4.5z"/>'),
  mk(8, 'Küp', 'hx', '<path fill="{K}" d="M24 10 36 17 24 24 12 17z"/><path fill="{K}" fill-opacity=".62" d="M12 18.5 23 25v13L12 31.5z"/><path fill="{K}" fill-opacity=".36" d="M36 18.5V31.5L25 38V25z"/>'),
  mk(9, 'Taç', 'sq', '<path fill="{K}" d="M10 33 12 16l7.5 8L24 12l4.5 12L36 16l2 17zM10 35.2h28V39H10z"/>'),
];
export const EMBLEM_LOGO_COUNT = LOGOS.length;

export interface BrandColor { id: number; name: string; hex: string; ink: string; stroke: string }
/** 8 kurumsal renk. İlk 6 sıra eski kayıtlarla uyumludur (0 turuncu, 1 yeşil, 2 gümüş, 3 kırmızı, 4 altın, 5 beyaz). */
export const BRAND_COLORS: BrandColor[] = [
  { id: 0, name: 'Turuncu', hex: '#FF8C32', ink: '#17191C', stroke: 'none' }, { id: 1, name: 'Yeşil', hex: '#2ECC8F', ink: '#14231C', stroke: 'none' },
  { id: 2, name: 'Gümüş', hex: '#C0C4C8', ink: '#17191C', stroke: 'none' }, { id: 3, name: 'Kırmızı', hex: '#E5484D', ink: '#FFFFFF', stroke: 'none' },
  { id: 4, name: 'Altın', hex: '#E8B93A', ink: '#241C08', stroke: 'none' }, { id: 5, name: 'Beyaz', hex: '#F5F5F3', ink: '#17191C', stroke: 'none' },
  { id: 6, name: 'Mavi', hex: '#3E7BFA', ink: '#FFFFFF', stroke: 'none' }, { id: 7, name: 'Siyah', hex: '#1B1D21', ink: '#F5F5F3', stroke: '#F5F5F366' },
];
export const EMBLEM_COLORS_HEX = BRAND_COLORS.map((c) => c.hex);
export const brandHex = (color: number): string => (BRAND_COLORS[color] ?? BRAND_COLORS[0]!).hex;

const fillTokens = (s: string, f: string, k: string, st: string) => s.replace(/\{F\}/g, f).replace(/\{K\}/g, k).replace(/\{S\}/g, st);
/** Logonun iç çizimi (kendi 48×48 kutusunda). `currentColor` yerine açık renk de verilebilir (canvas/3B için). */
export function emblemInner(shape: number, color: number, fillOverride?: string): string {
  const lg = LOGOS[shape] ?? LOGOS[0]!, bc = BRAND_COLORS[color] ?? BRAND_COLORS[0]!;
  return fillTokens(FRAMES[lg.frame] + lg.glyph, fillOverride ?? 'currentColor', bc.ink, bc.stroke);
}
/** Tek başına geçerli SVG; marka rengi `color` CSS özelliğiyle verilir (renk geçişi animasyonlanabilsin). */
export function emblemSvg(shape: number, color: number, size = 44): string {
  const hex = brandHex(color);
  return `<svg class="emb" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" style="color:${hex}">${emblemInner(shape, color)}</svg>`;
}
/** Canvas/3B dokular için renkleri sabitlenmiş, bağımsız SVG metni. */
export function emblemSvgStandalone(shape: number, color: number, size = 128): string {
  const hex = brandHex(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">${emblemInner(shape, color, hex)}</svg>`;
}
