/** Tasarım sistemi: palet birebir, kontrast, eski renklerin temizlenmesi, animasyon kuralları. */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { GRUPLAR } from '../src/ui/panels';

const oku = (f: string): string => readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8');
const tema = oku('tema.css'), stil = oku('style.css'), anim = oku('anim.css');
const kok = Object.fromEntries([...tema.match(/:root\{([^}]*)\}/)![1]!.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const L = (h: string): number => { const [r, g, b] = hex(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const kontrast = (a: string, b: string): number => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05); };
const T = (ad: string): string => kok[ad]!.toLowerCase();

describe('renk paleti', () => {
  it('istenen palet birebir uygulanmış', () => {
    const beklenen: Record<string, string> = { bg: '#202124', bg2: '#292a2f', p: '#2b2c31', p2: '#35353b', p3: '#414148', line: '#48464a',
      bo: '#46232d', bo2: '#783d4a', 'bo-d': '#351b23', 'bo-l': '#955b66', sh: '#e6d6c5', gold: '#c6a477', 'sh-l': '#f1e7dc', 'gold-d': '#a9875e',
      tx: '#f5f1ed', mu: '#bdb5b0', dis: '#89858a', ok: '#43a77b', warn: '#e5ad54', bad: '#d9535f', bl: '#6499c5' };
    for (const [k, v] of Object.entries(beklenen)) expect(T(k), k).toBe(v);
  });
  it('menü kategorilerinin renkleri palet içinden ve tema.css değişkenleriyle aynı', () => {
    const izinli = new Set(Object.values(kok).map((v) => v.toLowerCase())); const harita: Record<string, string> = { ana: 'c-merkez', isletme: 'c-isletme', atolye: 'c-atolye', finans: 'c-finans', pazarlama: 'c-pazarlama', gelisim: 'c-gelisim', dunya: 'c-dunya', ayar: 'c-ayar' };
    for (const g of GRUPLAR) { expect(izinli.has(g.renk.toLowerCase()), `${g.id} ${g.renk}`).toBe(true); expect(g.renk.toLowerCase(), g.id).toBe(T(harita[g.id]!)); }
    expect(new Set(GRUPLAR.filter((g) => g.dock !== false).map((g) => g.renk.toLowerCase())).size).toBe(7);   // her kategori ayrı renk
  });
  it('eski turuncu/kahverengi/çam-yeşili paletten tek renk kalmadı (stil dosyalarında)', () => {
    const eski = ['#e0983c', '#f4b660', '#120d09', '#1d1611', '#2a2018', '#f6ecdf', '#ab9b88', '#0a1417', '#112027', '#183038', '#eef4f2', '#86a0a6', '#c97b24', '#f0a43c', '#d4713a', '#f0a366', '#e3874a', '#f2b27c', '#4fd6a8', '#5fc08a', '#ef6b63', '#e8665f', '#4aa3e8', '#5fb8e8', '#24404a', '#0f1d23', '#0d1a1f', '#0c181c', '#1c0f07', '#1b1006'];
    for (const dosya of [tema, stil, anim]) for (const e of eski) expect(dosya.toLowerCase().includes(e), e).toBe(false);
  });
  it('arayüz kodunda palet dışı canlı renk yok (çizimler, harita zemini ve oyuncunun marka rengi hariç)', () => {
    const izinli = new Set([...Object.values(kok).map((v) => v.toLowerCase()), '#000000', '#ffffff', '#5f8f7a', '#b97f6a']); const sorunlu: string[] = [];
    for (const f of ['eco.ts', 'grafik.ts', 'juice.ts', 'sezon.ts', 'derin.ts', 'yatirim.ts', 'derin2.ts', 'donem.ts', 'yonet.ts', 'menu.ts', 'yardim.ts', 'anim.ts']) for (const m of oku(f).matchAll(/#[0-9a-fA-F]{6}\b/g)) if (!izinli.has(m[0].toLowerCase())) sorunlu.push(`${f}:${m[0]}`);
    expect(sorunlu).toEqual([]);
  });
});

describe('okunabilirlik (WCAG kontrast)', () => {
  const yuzeyler = ['bg', 'bg2', 'p', 'p2'];
  it('ana ve ikincil metin tüm yüzeylerde ≥ 4.5', () => { for (const y of yuzeyler) { expect(kontrast(T('tx'), T(y)), `tx/${y}`).toBeGreaterThanOrEqual(4.5); expect(kontrast(T('mu'), T(y)), `mu/${y}`).toBeGreaterThanOrEqual(4.5); } });
  it('pasif metin ≥ 3 (devre dışı öğeler için yeterli)', () => { for (const y of yuzeyler) expect(kontrast(T('dis'), T(y)), `dis/${y}`).toBeGreaterThanOrEqual(3); });
  it('altın ve şampanya vurguları (rakamlar, ikonlar) ≥ 4.5', () => { for (const y of yuzeyler) for (const r of ['gold', 'sh', 'sh-l']) expect(kontrast(T(r), T(y)), `${r}/${y}`).toBeGreaterThanOrEqual(4.5); });
  it('seçili öğe: bordo üzerinde açık şampanya metni ≥ 4.5 (gradyanın her iki ucunda)', () => { for (const z of ['bo', 'bo2']) expect(kontrast(T('sh-l'), T(z)), z).toBeGreaterThanOrEqual(4.5); });
  it('durum renkleri (başarı, uyarı, bilgi) kart üzerinde ≥ 4.5; hata ≥ 3.5 (büyük/kalın kullanım)', () => { for (const y of ['bg', 'p']) { for (const r of ['ok', 'warn', 'bl']) expect(kontrast(T(r), T(y)), `${r}/${y}`).toBeGreaterThanOrEqual(4.5); expect(kontrast(T('bad'), T(y)), `bad/${y}`).toBeGreaterThanOrEqual(3.5); } });
  it('kenarlık kartı arka plandan ayırt edilir (≥ 1.3)', () => { expect(kontrast(T('line'), T('bg'))).toBeGreaterThanOrEqual(1.3); });
});

describe('animasyon sistemi', () => {
  const kare = [...anim.matchAll(/@keyframes\s+(\w+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
  it('anim.css yalnızca düzen bozmayan özellikleri animasyonla oynatır (transform, opacity, renk, gölge)', () => {
    expect(kare.length).toBeGreaterThanOrEqual(10);
    for (const [, ad, govde] of kare) for (const m of govde!.matchAll(/([a-z-]+)\s*:/g)) expect(['transform', 'opacity', 'color', 'box-shadow'], `${ad}: ${m[1]}`).toContain(m[1]);
  });
  it('süreler ortak değişkenlerden gelir (d1..d4 tanımlı, eğri tanımlı)', () => { for (const k of ['d1', 'd2', 'd3', 'd4', 'e', 'e2']) expect(kok[k], k).toBeTruthy(); expect(anim).toMatch(/var\(--d3\)/); expect((anim.match(/var\(--d[1-4]\)/g) ?? []).length).toBeGreaterThan(15);
    // ham süre yalnızca kademe gecikmeleri, titreşim/vurgu ve "kapalı" modunda serbest; geri kalan hepsi değişkenden
    const serbest = new Set(['.01ms', '0ms', '40ms', '80ms', '120ms', '160ms', '200ms', '240ms', '280ms', '360ms', '900ms', '70ms', '110ms', '150ms', '220ms']);
    for (const m of anim.matchAll(/(?<![\w.-])(\.?\d+(?:\.\d+)?ms)\b/g)) expect(serbest.has(m[1]!), m[1]).toBe(true); });
  it('hareketi azalt desteği ve üç mod (tam/hafif/kapalı) var', () => { expect(anim).toContain('prefers-reduced-motion:reduce'); expect(anim).toContain('data-anim="hafif"'); expect(anim).toContain('data-anim="kapali"'); });
  it('tema.css animasyon/geçiş süresi barındırmaz (hareket tek yerde: anim.css)', () => { expect(tema).not.toMatch(/animation\s*:/); });
  it('basma ve hover geri bildirimi tanımlı; hover yalnızca fareli aygıtta', () => { expect(anim).toMatch(/:active\{transform:scale\(\.96\)\}/); expect(anim).toContain('@media (hover:hover) and (pointer:fine)'); });
  it('sürekli (infinite) animasyon anim.css\'te yok', () => { expect(anim.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/infinite/); });
});

describe('merkezi değişkenler', () => {
  it('stil dosyaları ikinci bir :root tanımlamaz (tek kaynak)', () => { expect((stil.match(/:root\s*\{/g) ?? []).length).toBe(0); expect((tema.match(/:root\s*\{/g) ?? []).length).toBe(1); });
  it('src/ui altındaki tüm css dosyaları import edilmiş', () => { const app = oku('app.ts'); for (const f of readdirSync(new URL('../src/ui/', import.meta.url)).filter((x) => x.endsWith('.css'))) expect(app, f).toContain(`'./${f}'`); });
});
