import type { GameEvent, GameState, Project } from '../core/types';
import { stageDays } from './construction';

/**
 * Altın: premium para birimi. Şimdilik yalnızca inşaatı hızlandırmak için harcanır (nakit ya da rekabet avantajı vermez).
 * Satın alma / reklam ödülü arayüzde (ui/native.ts) mağaza köprüsünden onaylanır; onay gelince Grant komutları altını verir. Köprü yoksa (tarayıcı, Expo Go) TEST modunda ücretsizdir.
 */
export const START_GOLD = 30, LEVEL_GOLD = 10;
/** Gelir bölümü (altın paketleri, ödüllü reklam, satın alımı geri yükle): hesaplar ve anahtarlar hazır olunca true yapılır. */
export const SHOP_OPEN = false;
export const AD_GOLD = 5, AD_DAILY = 3;
export const adsLeft = (s: GameState): number => (s.ad && s.ad.day === s.clock.day ? Math.max(0, AD_DAILY - s.ad.n) : AD_DAILY);
export function watchAdError(s: GameState): string | null { if (!s.company) return 'Şirket yok.'; return adsLeft(s) > 0 ? null : 'Bugünkü reklam hakkın doldu; yarın tekrar dene.'; }
export function watchAd(s: GameState): void { const n = s.ad && s.ad.day === s.clock.day ? s.ad.n : 0; s.ad = { day: s.clock.day, n: n + 1 }; addGold(s, AD_GOLD, 'paket', 'Ödüllü reklam'); }
export const GOLD_PACKS = [
  { id: 'g50', gold: 50, price: '₺29,99', label: 'Küçük kese' }, { id: 'g150', gold: 150, price: '₺79,99', label: 'Altın çanta', best: false },
  { id: 'g400', gold: 400, price: '₺179,99', label: 'Altın sandık', best: true }, { id: 'g1000', gold: 1000, price: '₺399,99', label: 'Altın kasa' },
];
export const goldOf = (s: GameState): number => { if (s.gold === undefined) { s.gold = START_GOLD; (s.goldLog ??= []).push({ day: s.clock.day, kind: 'baslangic', amount: START_GOLD, memo: 'Hoş geldin hediyesi' }); } return s.gold; };
export function addGold(s: GameState, n: number, kind: NonNullable<GameState['goldLog']>[number]['kind'], memo: string): void {
  goldOf(s); s.gold! += n; (s.goldLog ??= []).push({ day: s.clock.day, kind, amount: n, memo }); if (s.goldLog.length > 60) s.goldLog.shift();
}
export function buyPackError(s: GameState, id: string): string | null { if (!s.company) return 'Şirket yok.'; if (!GOLD_PACKS.some((p) => p.id === id)) return 'Geçersiz paket.'; return null; }
export function buyPackTest(s: GameState, id: string): void { const p = GOLD_PACKS.find((x) => x.id === id)!; addGold(s, p.gold, 'paket', `${p.label} (satın alma)`); }

/** Projenin kalan inşaat süresi (gün): mevcut aşamanın kalanı + sonraki aşamalar; ruhsat sonrası ofis aşamaları dahil. */
export function stageRemainingDays(p: Project): number { const b = p.build; if (!b || b.stage > 17) return 0; return Math.max(0, stageDays(p)[b.stage]! * (1 - b.progress)); }
export function projectRemainingDays(p: Project): number { const b = p.build; if (!b || b.stage > 17) return 0; const d = stageDays(p); let t = stageRemainingDays(p); for (let i = b.stage + 1; i <= 17; i++) t += d[i]!; return t; }
export const RUSH_DAYS = [10, 20, 30];
/** Fiyat süreye göre değişir: aşamayı bitir = kalan aşama süresi × 0,6; N gün ×3 hız = N/5 × (1 + kalan proje süresi/150). */
export function rushCost(p: Project, kind: 'gun' | 'asama', days = 10): number {
  return kind === 'asama' ? Math.max(2, Math.ceil(stageRemainingDays(p) * 0.6)) : Math.max(2, Math.ceil((days / 5) * (1 + projectRemainingDays(p) / 150)));
}
export const rushActive = (s: GameState, p: Project) => !!p.rush && (p.rush.kind === 'asama' ? p.build?.stage === p.rush.stage : p.rush.until > s.clock.day);
export function rushMult(s: GameState, p: Project): number { if (!p.rush) return 1; if (rushActive(s, p)) return p.rush.mult; delete p.rush; return 1; }
export function rushError(s: GameState, projectId: number, kind: string, days: number): string | null {
  const p = s.projects.find((x) => x.id === projectId); if (!s.company || !p || p.status !== 'insaat' || !p.build) return 'Hızlandırılacak aktif inşaat yok.'; if (p.build.stage < 6) return 'Hızlandırma inşaat aşamasında (ruhsat sonrası) kullanılır.';
  if (kind !== 'gun' && kind !== 'asama') return 'Geçersiz hızlandırma.'; if (kind === 'gun' && !RUSH_DAYS.includes(days)) return 'Süre 10, 20 ya da 30 gün olmalı.'; if (rushActive(s, p)) return 'Bu proje zaten hızlandırılıyor.';
  if (goldOf(s) < rushCost(p, kind, days)) return 'Yeterli altınınız yok.'; return null;
}
export function startRush(s: GameState, projectId: number, kind: 'gun' | 'asama', days: number, events: GameEvent[]): number {
  const p = s.projects.find((x) => x.id === projectId)!, cost = rushCost(p, kind, days); addGold(s, -cost, 'hizlandirma', `${p.name}: ${kind === 'asama' ? 'aşamayı bitir' : `${days} gün hızlandırma`}`);
  p.rush = { kind, until: s.clock.day + (kind === 'gun' ? days : 0), stage: p.build!.stage, mult: kind === 'asama' ? 6 : 3 }; events.push({ type: 'RUSH_STARTED', day: s.clock.day, data: { projectId, kind, cost } }); return cost;
}
