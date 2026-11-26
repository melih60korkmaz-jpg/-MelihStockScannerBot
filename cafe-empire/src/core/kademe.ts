/** Kademeli açılma: sistemler oyuncunun ilerlemesine göre görünür olur (başta sade, sonra derin). */
import { levelOf } from './sim';
import { dayOf } from './calendar';
import type { GameState } from './types';

export interface Kural { ad: string; neden: string; ok: (s: GameState) => boolean }
const n = (s: GameState): number => s.subeler.length, g = (s: GameState): number => dayOf(s), lv = levelOf;
/** Ana menü grupları (dock). Tanımsız olan her zaman açıktır. */
export const GRUP_KURAL: Record<string, Kural> = {
  depo: { ad: 'Depo', neden: 'İlk şubeni aç.', ok: (s) => n(s) >= 1 },
  tanitim: { ad: 'Tanıtım', neden: 'İlk şubeni aç.', ok: (s) => n(s) >= 1 },
  kasa: { ad: 'Kasa', neden: 'İlk şubeni aç.', ok: (s) => n(s) >= 1 },
  atolye: { ad: 'Atölye', neden: 'Kafe seviyesi 2 ya da 10. gün.', ok: (s) => lv(s) >= 2 || g(s) >= 10 },
  semt: { ad: 'Semt', neden: '2 şube ya da 25. gün.', ok: (s) => n(s) >= 2 || g(s) >= 25 },
  gelisim: { ad: 'Gelişim', neden: '5. gün.', ok: (s) => g(s) >= 5 },
};
/** Grup içindeki sayfalar. */
export const TAB_KURAL: Record<string, Kural> = {
  tedil: { ad: 'Tedarikçi ilişkisi', neden: '20. günde açılır.', ok: (s) => g(s) >= 20 }, merkez: { ad: 'Merkezi depo', neden: 'Kafe seviyesi 3.', ok: (s) => lv(s) >= 3 },
  kurye: { ad: 'Kurye ve bulut', neden: 'Kafe seviyesi 2.', ok: (s) => lv(s) >= 2 }, sadakat: { ad: 'Sadakat uygulaması', neden: 'Kafe seviyesi 2.', ok: (s) => lv(s) >= 2 },
  basin: { ad: 'Basın ve imaj', neden: 'Kafe seviyesi 2.', ok: (s) => lv(s) >= 2 }, anket: { ad: 'Anket ve A/B', neden: '2 şube gerekir.', ok: (s) => n(s) >= 2 },
  donem: { ad: 'Meydan okumalar', neden: '10. günde açılır.', ok: (s) => g(s) >= 10 }, kariyer: { ad: 'Kariyer özeti', neden: '30. günde açılır.', ok: (s) => g(s) >= 30 },
  surdur: { ad: 'Sürdürülebilirlik', neden: 'Kafe seviyesi 2.', ok: (s) => lv(s) >= 2 }, iller: { ad: 'İller', neden: '2 şube gerekir.', ok: (s) => n(s) >= 2 },
  franchise: { ad: 'Franchise', neden: 'Kafe seviyesi 4.', ok: (s) => lv(s) >= 4 }, siralama: { ad: 'Liderlik', neden: '20. günde açılır.', ok: (s) => g(s) >= 20 },
  yatirim: { ad: 'Yatırımcılar', neden: 'Kafe seviyesi 3.', ok: (s) => lv(s) >= 3 }, mevzuat: { ad: 'Mevzuat ve devlet', neden: '45. günde açılır.', ok: (s) => g(s) >= 45 },
  sigorta: { ad: 'Sigorta ve afet', neden: '30. günde açılır.', ok: (s) => g(s) >= 30 }, grafik: { ad: 'İstatistikler', neden: '14. günde açılır.', ok: (s) => g(s) >= 14 },
  tarif: { ad: 'Tarif atölyesi', neden: '3. günde açılır.', ok: (s) => g(s) >= 3 }, sezon: { ad: 'Sezon ve menü', neden: '14. günde açılır.', ok: (s) => g(s) >= 14 },
  kavurmahane: { ad: 'Kavurmahane', neden: 'Kafe seviyesi 3.', ok: (s) => lv(s) >= 3 }, usta: { ad: 'Barista ustalığı', neden: '20. günde açılır.', ok: (s) => g(s) >= 20 }, fuar: { ad: 'Kahve fuarı', neden: '30. günde açılır.', ok: (s) => g(s) >= 30 },
  mudavim: { ad: 'Müdavimler', neden: '10. günde açılır.', ok: (s) => g(s) >= 10 }, esnaf: { ad: 'Komşu esnaf', neden: '15. günde açılır.', ok: (s) => g(s) >= 15 }, rakipler: { ad: 'Rakip zincirler', neden: '40. günde açılır.', ok: (s) => g(s) >= 40 }, hikaye: { ad: 'Dükkân hikâyesi', neden: '20. günde açılır.', ok: (s) => g(s) >= 20 },
  mulk: { ad: 'Mülkler', neden: '45. günde açılır.', ok: (s) => g(s) >= 45 }, yorumlar: { ad: 'Yorumlar', neden: '7. günde açılır.', ok: (s) => g(s) >= 7 },
};
export const grupAcik = (s: GameState, id: string): boolean => GRUP_KURAL[id]?.ok(s) ?? true;
export const tabAcik = (s: GameState, id: string): boolean => TAB_KURAL[id]?.ok(s) ?? true;
export const kilitNedeni = (s: GameState, id: string): string => (GRUP_KURAL[id] ?? TAB_KURAL[id])?.neden ?? '';
/** Şu an açık olan her şeyin kimlikleri (yeni açılanı bulmak için). */
export function acikListe(s: GameState): string[] { return [...Object.keys(GRUP_KURAL).filter((k) => grupAcik(s, k)), ...Object.keys(TAB_KURAL).filter((k) => tabAcik(s, k))]; }
/** Henüz açılmamış sistemler (ilerleme kartı için). */
export function kilitliListe(s: GameState): Array<{ id: string; ad: string; neden: string }> { return [...Object.entries(GRUP_KURAL), ...Object.entries(TAB_KURAL)].filter(([, k]) => !k.ok(s)).map(([id, k]) => ({ id, ad: k.ad, neden: k.neden })); }
