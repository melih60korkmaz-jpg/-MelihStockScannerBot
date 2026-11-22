import { TL, type Money } from '../core/money';
import type { GameState, Rival } from '../core/types';
import { cityData } from '../data';
import { netWorth } from './finance';

/**
 * Rakip kimliği: sahibi, logosu, sloganı ve hikâyesi kayıtta tutulmaz; firmanın kimliğinden (id|ad) türetilir.
 * Böylece eski kayıtlar da otomatik olarak canlı rakiplere kavuşur ve rastgele sayı üreteci akışı değişmez.
 */
const hashStr = (s: string): number => { let a = 2166136261; for (let i = 0; i < s.length; i++) { a ^= s.charCodeAt(i); a = Math.imul(a, 16777619); } return a >>> 0; };
const OWNERS = ['Kemal Aksoy', 'Zeynep Karaca', 'Hasan Demirbaş', 'Aylin Yücel', 'Murat Kılıç', 'Selin Başaran', 'Orhan Taşkın', 'Derya Erdem', 'Volkan Tunç', 'Gülşen Çınar', 'Cem Uysal', 'Nilüfer Aras', 'Ferit Özdağ', 'Esra Kalkan', 'Rıza Bozkurt', 'Pınar Güneş'];
const MOTTOS: Record<Rival['style'], string[]> = {
  agresif: ['Önce kazan, sonra konuş.', 'Her ihale bir savaştır.', 'Büyük düşün, hızlı inşa et.'],
  dengeli: ['İşi bilene, sözü verene.', 'Sağlam temel, sağlam gelecek.', 'Ne az, ne çok; tam yerinde.'],
  temkinli: ['Ağır ol, sağlam ol.', 'Acele eden kaybeder.', 'Nakit kraldır.'],
};
const STORIES = [
  '{o}, babasından devraldığı küçük bir kalıp atölyesini {n} yılda bir inşaat firmasına dönüştürdü.',
  '{o}, {c}\'de bir mühendislik bürosuyla başladı; ilk işini komşusunun dükkânı olarak yaptı.',
  '{o}, yurt dışında çalıştıktan sonra tüm birikimiyle {c}\'ye dönüp firmayı kurdu.',
  'Firmanın temelini {o} ile iki ortağı attı; ortaklar sonradan yollarını ayırdı, {o} yola yalnız devam etti.',
  '{o}, bir deprem sonrası onarım işleriyle yükseldi; güvenli yapı denince ilk akla gelenlerden.',
  '{o} sektöre kooperatif yapımıyla girdi; hâlâ ilk üyelerinin çoğunu yılbaşında ağırlar.',
];
const LAST: Record<string, string> = { arsa: 'son olarak arsa aldı', proje: 'yeni bir proje başlattı', teslim: 'bir projeyi teslim etti', ihale: 'bir ihale kazandı', iflas: 'iflas etti', satin_alindi: 'holdinginize satıldı' };

export interface RivalProfile { owner: string; shape: number; color: number; motto: string; story: string; status: string }
export function rivalProfile(s: GameState, r: Rival): RivalProfile {
  const hs = hashStr(`${r.id}|${r.name}`), owner = OWNERS[hs % OWNERS.length]!, city = cityData(r.home)?.label ?? r.home;
  const years = Math.max(3, 6 + (hs >>> 8) % 25), motto = MOTTOS[r.style][(hs >>> 4) % 3]!;
  const story = STORIES[(hs >>> 12) % STORIES.length]!.replace(/\{o\}/g, owner).replace(/\{c\}/g, city).replace(/\{n\}/g, String(years));
  const status = r.failed ? 'Faaliyeti sona erdi.' : r.last ? `Son hamlesi: ${LAST[r.last] ?? r.last}.` : 'Henüz dikkat çeken bir hamlesi yok.';
  return { owner, shape: hs % 10, color: (hs >>> 5) % 8, motto, story, status };
}

/** Rakibin yaklaşık değeri (sıralama için): nakit + devam eden işlerin değeri. */
export const rivalWorth = (r: Rival): Money => Math.max(0, r.cash) + r.projects * TL(25_000_000);
/** Oyuncu dahil sıralama (1 = en büyük). Battı/satın alınan firmalar sayılmaz. */
export function standing(s: GameState): { rank: number; total: number; list: { name: string; worth: Money; me: boolean; id: number }[] } {
  const me = { id: 0, name: s.company?.name ?? 'Siz', worth: Math.max(0, netWorth(s)), me: true };
  const list = [me, ...s.rivals.filter((r) => !r.failed && r.last !== 'satin_alindi').map((r) => ({ id: r.id, name: r.name, worth: rivalWorth(r), me: false }))].sort((a, b) => b.worth - a.worth);
  return { rank: list.findIndex((x) => x.me) + 1, total: list.length, list };
}

/** Rakiple ilişki (-100…100): ≥30 dost, ≤-30 düşman. Dost rakip ihalede fiyatı yüksek tutar, düşman kırar. */
export const relOf = (r: Rival): number => r.rel ?? 0;
export const relLabel = (r: Rival): string => { const v = relOf(r); return v >= 60 ? 'Müttefik' : v >= 30 ? 'Dost' : v > -30 ? 'Tarafsız' : v > -60 ? 'Soğuk' : 'Düşman'; };
export const PROPOSALS: Record<string, { ev: string; label: string; ico: string; desc: string }> = {
  ortak: { ev: 'rv_ortak', label: 'Ortak girişim öner', ico: '🤝', desc: 'Sermaye ve işi paylaşın; kâr olursa bölüşülür.' },
  konsorsiyum: { ev: 'rv_konsorsiyum', label: 'Ortak ihale öner', ico: '📑', desc: 'Büyük bir ihaleye birlikte girin.' },
  makine: { ev: 'rv_makine', label: 'Makine kirala', ico: '🚜', desc: 'Makine parkından bir makineyi kiralayın.' },
  arsa: { ev: 'rv_arsa', label: 'Arsa sat', ico: '📍', desc: 'Boş bir arsanızı bu firmaya satmayı deneyin.' },
};
