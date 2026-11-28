/** Tohumlu rastgele sayı üreteci (mulberry32). Durumu tek sayıdır, kayda yazılabilir. */
export class Rng {
  constructor(public s: number) { this.s = s >>> 0; }
  next(): number { this.s = (this.s + 0x6d2b79f5) >>> 0; let t = this.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  range(a: number, b: number): number { return a + this.next() * (b - a); }
  int(a: number, b: number): number { return Math.floor(this.range(a, b + 1)); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]!; }
  gauss(): number { let u = 0, v = 0; while (u === 0) u = this.next(); while (v === 0) v = this.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  poisson(l: number): number { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= this.next(); } while (p > L && k < 20); return k - 1; }
  /** Ağırlıklı seçim */
  weighted<T>(items: ReadonlyArray<readonly [T, number]>): T { const t = items.reduce((a, [, w]) => a + w, 0); let r = this.next() * t; for (const [x, w] of items) { r -= w; if (r <= 0) return x; } return items[items.length - 1]![0]; }
}
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
