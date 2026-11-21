import { TL, mul } from '../core/money';
import { pick, randInt } from '../core/rng';
import type { GameState, Staff } from '../core/types';
import { NAMES, staffType } from '../data';

/** Deneyimli = pahalı: maaş deneyimle %0–%75×deneyim/100 artar. */
export function createStaff(s: GameState, type: string): Staff {
  const def = staffType(type);
  if (!def) throw new Error(`Bilinmeyen personel tipi: ${type}`);
  const experience = randInt(s.rng, 'misc', 10, 40);
  const salary = mul(TL(def.baseSalaryTL), 1 + (experience / 100) * 0.75);
  const name = `${pick(s.rng, 'misc', NAMES.first)} ${pick(s.rng, 'misc', NAMES.last)}`;
  const st: Staff = { id: s.nextId++, type, name, salary, experience, hiredDay: s.clock.day, morale: 70 };
  s.staff.push(st);
  return st;
}

/**
 * Çalışan kişilik özellikleri. RNG kullanılmaz: özellik, çalışanın kimliğinden ve adından türetilir (eski kayıtlar da otomatik özellik kazanır,
 * kayıt biçimi değişmez). Etkileri küçük ama hissedilir: verim, kaza riski, moral ve olay hikâyeleri.
 */
export interface TraitDef { id: string; label: string; ico: string; desc: string; w: number }
export const TRAITS: TraitDef[] = [
  { id: 'caliskan', label: 'Çalışkan', ico: '💪', desc: 'Verimi %6 yüksek.', w: 2 },
  { id: 'tembel', label: 'Tembel', ico: '😴', desc: 'Verimi %8 düşük. Uyarılabilir.', w: 1 },
  { id: 'dikkatli', label: 'Dikkatli', ico: '🦺', desc: 'Şantiyede kaza riskini azaltır.', w: 1 },
  { id: 'dikkatsiz', label: 'Dikkatsiz', ico: '⚠️', desc: 'Şantiyede kaza riskini artırır.', w: 1 },
  { id: 'sadik', label: 'Sadık', ico: '🤝', desc: 'Başka firmaya geçmez, rastgele ayrılmaz.', w: 1 },
  { id: 'huysuz', label: 'Huysuz', ico: '😤', desc: 'Ekipte zaman zaman kavga çıkarabilir.', w: 1 },
  { id: 'hirsli', label: 'Hırslı', ico: '🚀', desc: 'Zam ve terfi ister; verilmezse ayrılabilir.', w: 1 },
  { id: 'takimci', label: 'Takım oyuncusu', ico: '🫶', desc: 'Ekibin moralini yükseltir.', w: 1 },
];
const TOTAL_W = TRAITS.reduce((a, t) => a + t.w, 0);
const hashStr = (s: string): number => { let a = 2166136261; for (let i = 0; i < s.length; i++) { a ^= s.charCodeAt(i); a = Math.imul(a, 16777619); } return a >>> 0; };
export function traitOf(x: Pick<Staff, 'id' | 'name' | 'type'> & { trait?: string }): TraitDef {
  if (x.trait) { const t = TRAITS.find((q) => q.id === x.trait); if (t) return t; }
  let r = hashStr(`${x.id}|${x.name}|${x.type}`) % TOTAL_W;
  for (const t of TRAITS) { r -= t.w; if (r < 0) return t; }
  return TRAITS[0]!;
}
/** Verim çarpanı (çalışkan/tembel). */
export const traitEff = (x: Pick<Staff, 'id' | 'name' | 'type'>): number => { const t = traitOf(x).id; return t === 'caliskan' ? 1.06 : t === 'tembel' ? 0.92 : 1; };
