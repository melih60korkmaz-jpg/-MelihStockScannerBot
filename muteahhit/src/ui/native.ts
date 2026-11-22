/**
 * Mağaza köprüsü (Expo sarmalayıcı ↔ oyun). Satın alma ve ödüllü reklam yerel uygulamada yapılır; oyun yalnızca onay bekler.
 *  - 'live': mağaza ödemesi/reklam etkin (App Store / Google Play sürümü)
 *  - 'test': ödeme yok, ücretsiz (tarayıcı, Expo Go, geliştirme)
 *  - 'off' : yerel uygulama içinde ama ödeme/reklam yapılandırılmamış; özellik kapalı
 */
export type ShellMode = 'live' | 'test' | 'off';
type W = { __IAP_MODE?: ShellMode; ReactNativeWebView?: { postMessage(s: string): void }; __nativeReply?: (id: number, r: Reply) => void };
export interface Reply { ok: boolean; error?: string; cancelled?: boolean }
const w = (): W => (typeof window === 'undefined' ? {} : (window as unknown as W));
export const shellMode = (): ShellMode => w().__IAP_MODE ?? (w().ReactNativeWebView ? 'off' : 'test');
const pending = new Map<number, (r: Reply) => void>(); let seq = 0;
if (typeof window !== 'undefined') (window as unknown as W).__nativeReply = (id, r) => { const f = pending.get(id); if (f) { pending.delete(id); f(r); } };
function ask(t: 'iap' | 'ad', pack?: string): Promise<Reply> {
  const mode = shellMode();
  if (mode === 'test') return Promise.resolve({ ok: true });
  if (mode === 'off' || !w().ReactNativeWebView) return Promise.resolve({ ok: false, error: t === 'ad' ? 'Reklam şu an kullanılamıyor.' : 'Satın alma şu an kullanılamıyor.' });
  return new Promise((res) => { const id = ++seq; pending.set(id, res); setTimeout(() => { if (pending.delete(id)) res({ ok: false, error: 'İşlem zaman aşımına uğradı.' }); }, 180_000); w().ReactNativeWebView!.postMessage(JSON.stringify({ t, id, pack })); });
}
export const purchasePack = (pack: string) => ask('iap', pack);
export const showRewardedAd = () => ask('ad');
export const restorePurchases = (): Promise<Reply> => (shellMode() === 'live' && w().ReactNativeWebView ? new Promise((res) => { const id = ++seq; pending.set(id, res); setTimeout(() => { if (pending.delete(id)) res({ ok: false, error: 'Zaman aşımı' }); }, 60_000); w().ReactNativeWebView!.postMessage(JSON.stringify({ t: 'restore', id })); }) : Promise.resolve({ ok: true }));
