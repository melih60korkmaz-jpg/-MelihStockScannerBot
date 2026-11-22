import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Mağaza ödemesi (RevenueCat) ve ödüllü reklam (AdMob) — yalnızca App Store / Google Play sürümünde çalışır.
 * Expo Go'da yerel modüller bulunmadığı için mod 'test' olur (oyun ücretsiz verir). Anahtarlar app.json › extra altında:
 *   revenueCatIosKey / revenueCatAndroidKey, admobRewardedIos / admobRewardedAndroid (boşsa Google test reklamı kullanılır).
 */
type Extra = { revenueCatIosKey?: string; revenueCatAndroidKey?: string; admobRewardedIos?: string; admobRewardedAndroid?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const isExpoGo = Constants.appOwnership === 'expo';
const rcKey = Platform.OS === 'ios' ? extra.revenueCatIosKey : extra.revenueCatAndroidKey;
/** Altın paket kimlikleri = mağazadaki tüketilebilir ürün kimlikleri. */
export const PRODUCT_IDS: Record<string, string> = { g50: 'app.muteahhit.gold50', g150: 'app.muteahhit.gold150', g400: 'app.muteahhit.gold400', g1000: 'app.muteahhit.gold1000' };

export type Mode = 'live' | 'test' | 'off';
export const paymentMode = (): Mode => (isExpoGo ? 'test' : rcKey ? 'live' : 'off');
export interface Result { ok: boolean; error?: string; cancelled?: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rc: any = null; let configured = false;
async function purchases() {
  if (!rc) rc = require('react-native-purchases').default;
  if (!configured) { rc.configure({ apiKey: rcKey }); configured = true; }
  return rc;
}
export async function purchase(pack: string): Promise<Result> {
  try {
    const id = PRODUCT_IDS[pack]; if (!id) return { ok: false, error: 'Geçersiz paket.' };
    const P = await purchases(); const products = await P.getProducts([id], 'inapp');
    if (!products?.length) return { ok: false, error: 'Ürün mağazada bulunamadı.' };
    await P.purchaseStoreProduct(products[0]); return { ok: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string }; if (err?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: err?.message ?? 'Satın alma tamamlanamadı.' };
  }
}
export async function restore(): Promise<Result> { try { const P = await purchases(); await P.restorePurchases(); return { ok: true }; } catch (e) { return { ok: false, error: (e as Error)?.message ?? 'Geri yükleme başarısız.' }; } }

export async function rewardedAd(): Promise<Result> {
  try {
    const m = require('react-native-google-mobile-ads');
    const unit = (Platform.OS === 'ios' ? extra.admobRewardedIos : extra.admobRewardedAndroid) || m.TestIds.REWARDED;
    const ad = m.RewardedAd.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true });
    return await new Promise<Result>((resolve) => {
      let earned = false; const subs: (() => void)[] = []; const done = (r: Result) => { subs.forEach((u) => u()); resolve(r); };
      subs.push(ad.addAdEventListener(m.RewardedAdEventType.LOADED, () => ad.show()));
      subs.push(ad.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      subs.push(ad.addAdEventListener(m.AdEventType.CLOSED, () => done(earned ? { ok: true } : { ok: false, cancelled: true })));
      subs.push(ad.addAdEventListener(m.AdEventType.ERROR, () => done({ ok: false, error: 'Reklam şu an yüklenemedi, biraz sonra tekrar dene.' })));
      ad.load();
    });
  } catch { return { ok: false, error: 'Reklam şu an kullanılamıyor.' }; }
}
