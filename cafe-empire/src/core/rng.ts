/**
 * Deterministik rastgelelik. Her sistem kendi akışını (stream) kullanır; böylece bir
 * sistemin fazladan rastgele çağrısı diğerlerinin sonucunu kaydırmaz.
 * Durum düz sayıdır → kayda doğrudan yazılır.
 */
export const STREAMS = ['econ', 'events', 'market', 'customers', 'rivals', 'misc'] as const;
export type StreamName = (typeof STREAMS)[number];
export type RngState = Record<StreamName, number>;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function seedStreams(seed: number): RngState {
  const out = {} as RngState;
  for (const s of STREAMS) out[s] = fnv1a(`${seed}:${s}`);
  return out;
}

/** [0,1) aralığında sayı üretir (mulberry32). */
export function rand(rng: RngState, stream: StreamName): number {
  const a = (rng[stream] = (rng[stream] + 0x6d2b79f5) >>> 0);
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (rng: RngState, stream: StreamName, min: number, max: number) =>
  min + Math.floor(rand(rng, stream) * (max - min + 1));

export function pick<T>(rng: RngState, stream: StreamName, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: boş dizi');
  return arr[Math.floor(rand(rng, stream) * arr.length)] as T;
}

/** ~N(0,1): Box–Muller (her çağrıda tam 2 rastgele sayı tüketir → akış kayması olmaz). */
export function gauss(rng: RngState, stream: StreamName): number {
  const u = Math.max(1e-9, rand(rng, stream)), v = rand(rng, stream);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
