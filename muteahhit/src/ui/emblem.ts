/** 12 şekil × 6 renk şirket amblemi (özgün geometrik çizimler). */
export const EMBLEM_PATHS = [
  'M4 15a8 8 0 0 1 16 0v1H4zM3 17h18v2H3z',                                  // kask
  'M11 3h2v18h-2zM3 6h18v2H3zM6 8h1v6H6z',                                   // vinç
  'M6 21V6l8-3v18zM16 9h3v12h-3z',                                           // bina
  'M10 3h4v18h-4zM7 8h10v2H7zM7 14h10v2H7z',                                 // kule
  'M3 12 12 4l9 8h-3v8H6v-8z',                                               // ev
  'M3 20h18v-3H3zM6 17v-4h12v4zM9 13V9h6v4z',                                // basamak/temel
  'M9 3a5 5 0 1 0 1 9.9L13 16h2v2h2v2h3v-3l-8.1-8.1A5 5 0 0 0 9 3zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', // anahtar
  'M4 4h16v3h-6v10h6v3H4v-3h6V7H4z',                                         // I kiriş
  'M12 2l2 3h3l1 3 3 2-1 3 1 3-3 2-1 3h-3l-2 3-2-3H7l-1-3-3-2 1-3-1-3 3-2 1-3h3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', // çark
  'M3 3h18v18H3zM7 7v10h10V7zM10 10h4v4h-4z',                                // iç içe kare
  'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z',     // yıldız
  'M2 5h9v4H2zM13 5h9v4h-9zM2 11h5v4H2zM9 11h9v4H9zM20 11h2v4h-2zM2 17h9v4H2zM13 17h9v4h-9z', // tuğla
];
export const EMBLEM_COLORS_HEX = ['#F5B700', '#2ECC8F', '#3E7BFA', '#E5484D', '#B07CFF', '#EDEFF2'];

export function emblemSvg(shape: number, color: number, size = 44): string {
  const bg = EMBLEM_COLORS_HEX[color] ?? EMBLEM_COLORS_HEX[0]!;
  const d = EMBLEM_PATHS[shape] ?? EMBLEM_PATHS[0]!;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><rect x="0.5" y="0.5" width="23" height="23" rx="6" fill="${bg}"/><path d="${d}" fill="#0b1a22" fill-rule="evenodd" transform="translate(3.6 3.6) scale(0.7)"/></svg>`;
}
