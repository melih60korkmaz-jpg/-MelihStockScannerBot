/** Enerji içecekleri (Volt) ve ekipman (krampon). İçecek enerjiyi hızla yeniler ama aşırı kullanımın bedeli vardır; krampon yetenekleri geçici artırır ve aşınır. */
import { clamp } from './rng';
import type { Game } from './game';
import type { YetenekId } from './skills';
export interface Icecek { id: 'klasik' | 'hizli' | 'altin'; ad: string; ik: string; fiyat: number; enerji: number; yorgunluk: number; ac: string }
export const ICECEKLER: Icecek[] = [
  { id: 'klasik', ad: 'Volt Klasik', ik: '🥤', fiyat: 1500, enerji: 30, yorgunluk: 0, ac: 'Enerji +30' },
  { id: 'hizli', ad: 'Volt Hızlı', ik: '⚡', fiyat: 3500, enerji: 55, yorgunluk: -10, ac: 'Enerji +55, yorgunluk -10' },
  { id: 'altin', ad: 'Volt Altın', ik: '🏆', fiyat: 9000, enerji: 100, yorgunluk: -25, ac: 'Enerji tamamen dolar, yorgunluk -25' }
];
export const HAFTALIK_ICECEK = 2; // bu sayıdan sonrası etkisiz ve zararlı
export const icecekOf = (id: string): Icecek => ICECEKLER.find((x) => x.id === id)!;
export function icecekAl(g: Game, id: Icecek['id']): { ok: boolean; m: string } { const i = icecekOf(id); if (g.para < i.fiyat) return { ok: false, m: 'Paran yetmiyor.' }; g.para -= i.fiyat; g.icecek[id] = (g.icecek[id] ?? 0) + 1; return { ok: true, m: `${i.ad} alındı (stok ${g.icecek[id]}).` }; }
export function icecekIc(g: Game, id: Icecek['id']): { ok: boolean; m: string } {
  const i = icecekOf(id); if ((g.icecek[id] ?? 0) < 1) return { ok: false, m: 'Stokta yok. Hayat → Mağaza\'dan al.' }; if (g.enerji >= 100 && g.yorgunluk <= 0) return { ok: false, m: 'Zaten tam enerjilisin.' };
  g.icecek[id]--; g.haftaIcecek++; if (g.haftaIcecek > HAFTALIK_ICECEK) { g.yorgunluk = clamp(g.yorgunluk + 12, 0, 100); g.mut = clamp(g.mut - 3, 0, 100); return { ok: true, m: `${i.ad}: bu hafta çok içtin! Etkisi azaldı, yorgunluk +12.` }; }
  g.enerji = clamp(g.enerji + i.enerji, 0, 100); g.yorgunluk = clamp(g.yorgunluk + i.yorgunluk, 0, 100); return { ok: true, m: `${i.ad}: ${i.ac}.` };
}
/* ---- ekipman ---- */
export interface Krampon { id: string; ad: string; ik: string; fiyat: number; omur: number; bonus: Partial<Record<YetenekId, number>>; ac: string }
export const KRAMPONLAR: Krampon[] = [
  { id: 'temel', ad: 'Temel Krampon', ik: '👟', fiyat: 0, omur: 9999, bonus: {}, ac: 'Standart, bonus yok' },
  { id: 'hiz', ad: 'Hız Kramponu', ik: '⚡', fiyat: 18000, omur: 25, bonus: { surat: 8, dribbling: 5 }, ac: 'Sürat +8, dripling +5 (25 maç)' },
  { id: 'guc', ad: 'Güç Kramponu', ik: '💥', fiyat: 22000, omur: 25, bonus: { guc: 7, sut: 7, bitiricilik: 3 }, ac: 'Güç +7, şut +7, bitiricilik +3 (25 maç)' },
  { id: 'kontrol', ad: 'Kontrol Kramponu', ik: '🎯', fiyat: 26000, omur: 25, bonus: { teknik: 8, topKontrol: 6, pas: 5 }, ac: 'Teknik +8, top kontrolü +6, pas +5 (25 maç)' },
  { id: 'usta', ad: 'Usta Krampon', ik: '🌟', fiyat: 80000, omur: 45, bonus: { surat: 5, guc: 5, teknik: 5, sut: 7, pas: 5, bitiricilik: 6, dribbling: 4, topKontrol: 4 }, ac: 'Çok yönlü büyük bonus (45 maç)' }
];
export const kramponOf = (id: string): Krampon => KRAMPONLAR.find((x) => x.id === id)!;
export function kramponAl(g: Game, id: string): { ok: boolean; m: string } { const k = kramponOf(id); if (id === 'temel') return { ok: false, m: 'Temel kramponun zaten var.' }; if (g.para < k.fiyat) return { ok: false, m: 'Paran yetmiyor.' }; g.para -= k.fiyat; g.kramponlar[id] = k.omur; g.giyilen = id; return { ok: true, m: `${k.ad} alındı ve giyildi.` }; }
export function kramponGiy(g: Game, id: string): { ok: boolean; m: string } { if (id !== 'temel' && !(g.kramponlar[id] > 0)) return { ok: false, m: 'Bu krampona sahip değilsin ya da aşındı.' }; g.giyilen = id; return { ok: true, m: `${kramponOf(id).ad} giyildi.` }; }
export const ekipBonus = (g: Game, k: YetenekId): number => { const id = g.giyilen; if (!id || id === 'temel') return 0; if (!(g.kramponlar[id] > 0)) return 0; return kramponOf(id).bonus[k] ?? 0; };
/** Her oynanan maçta aşınır; bitince temel kramponla devam edilir. */
export function kramponAsin(g: Game): string | null { const id = g.giyilen; if (!id || id === 'temel' || !(g.kramponlar[id] > 0)) return null; g.kramponlar[id]--; if (g.kramponlar[id] <= 0) { g.giyilen = 'temel'; return `${kramponOf(id).ad} aşındı: temel kramponla devam ediyorsun.`; } return null; }
export const EKIPMAN_GIDERI = 400; // haftalık forma, bandaj, bakım
