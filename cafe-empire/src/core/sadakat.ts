/** Sadakat uygulaması: üye sayısı, puan oranı ve kampanyalar; müdavim bağını güçlendirir. */
import { carpan, hooks } from './sim';
import { dayOf } from './calendar';
import { D, yaz } from './derin';
import type { GameState } from './types';

export interface Sad { kurulu: boolean; uye: number; puan: number; cd: Record<string, number>; odenen: number; geriGelen: number }
export interface Res { ok: boolean; m: string }
export const KUR_BEDEL = 150000, AYLIK = 12000, PUAN_ORAN = [0, 0.02, 0.04, 0.06];
export const KAMPANYALAR = [
  { id: 'geri', ad: 'Kayıp müşteriyi geri kazan', ac: 'Uzun süredir gelmeyen üyelere indirim kuponu: üye +%8, 7 gün talep +%4.', bedel: 6000, cd: 14 },
  { id: 'dogum', ad: 'Doğum günü kampanyası', ac: 'Üyelere doğum günü ikramı: 14 gün talep +%2, itibar +.', bedel: 3000, cd: 30 },
  { id: 'push', ad: 'Anlık bildirim (push)', ac: 'Bugüne özel fırsat bildirimi: 3 gün talep +%2,5.', bedel: 1000, cd: 3 },
];
export function Sd(s: GameState): Sad { return (D(s).sad ??= { kurulu: false, uye: 0, puan: 1, cd: {}, odenen: 0, geriGelen: 0 }); }
export const kapasite = (s: GameState): number => Math.max(1, s.subeler.length) * 2500;
export function etki(s: GameState): number { const k = Sd(s); if (!k.kurulu) return 0; const n = Math.max(1, s.subeler.length); return Math.min(0.15, k.uye / (n * 1200) * 0.3 * (0.6 + 0.15 * k.puan)); }
export function sadKur(s: GameState): Res { const k = Sd(s); if (k.kurulu) return { ok: false, m: 'Uygulama zaten yayında.' }; if (!s.subeler.length) return { ok: false, m: 'Önce bir şube aç.' }; const b = Math.round(KUR_BEDEL * s.market.fiyat); if (s.kasa < b) return { ok: false, m: `Geliştirme için ${b.toLocaleString('tr-TR')} ₺ gerekir.` }; s.kasa -= b; s.capexBugun += b; k.kurulu = true; k.uye = 80; yaz(s, undefined, 'Sadakat uygulaması yayına girdi.'); return { ok: true, m: `Uygulama yayında (−${b.toLocaleString('tr-TR')} ₺). Aylık işletme ${Math.round(AYLIK * s.market.fiyat).toLocaleString('tr-TR')} ₺.` }; }
export function sadPuan(s: GameState, i: number): Res { Sd(s).puan = Math.max(0, Math.min(3, i)); return { ok: true, m: `Puan oranı %${Math.round(PUAN_ORAN[Sd(s).puan]! * 100)}.` }; }
export function sadKampanya(s: GameState, id: string): Res {
  const k = Sd(s), c = KAMPANYALAR.find((x) => x.id === id); if (!c) return { ok: false, m: 'Kampanya yok.' }; if (!k.kurulu) return { ok: false, m: 'Önce uygulamayı kur.' }; const now = dayOf(s); if ((k.cd[id] ?? -99) > now - c.cd) return { ok: false, m: `Bu kampanya ${c.cd} günde bir yapılabilir.` };
  const b = Math.round((c.bedel + (id === 'geri' ? k.uye * 2 : 0)) * s.market.fiyat); if (s.kasa < b) return { ok: false, m: `Kampanya bedeli ${b.toLocaleString('tr-TR')} ₺.` }; s.kasa -= b; s.capexBugun += b; k.cd[id] = now; const d = D(s);
  if (id === 'geri') { k.uye = Math.min(kapasite(s), Math.round(k.uye * 1.08)); d.etki['g:talep:sadk'] = { v: 1.04, bit: now + 7 }; } else if (id === 'dogum') { d.etki['g:talep:dogum'] = { v: 1.02, bit: now + 14 }; for (const x of s.subeler) x.marka = Math.min(100, x.marka + 0.5); } else d.etki['g:talep:push'] = { v: 1.025, bit: now + 3 };
  return { ok: true, m: `${c.ad} başladı (−${b.toLocaleString('tr-TR')} ₺).` };
}
carpan.talep.push((s) => 1 + etki(s));
hooks.gunOnce.push((s, toplam) => {
  const k = Sd(s); if (!k.kurulu) return; const mus = s.subeler.reduce((a, b) => a + (b.gecmis[b.gecmis.length - 1]?.musteri ?? 0), 0), ciro = s.subeler.reduce((a, b) => a + (b.gecmis[b.gecmis.length - 1]?.toplamGelir ?? 0), 0);
  k.uye = Math.max(0, Math.min(kapasite(s), k.uye + mus * 0.015 * (1 + 0.2 * k.puan) - k.uye * 0.004)); const n = Math.max(1, s.subeler.length), pay = ciro * PUAN_ORAN[k.puan]! * Math.min(1, k.uye / (n * 800)), sabit = AYLIK * s.market.fiyat / 30;
  toplam.gider.sadakat += pay + sabit; s.kasa -= pay + sabit; k.odenen += pay; for (const b of s.subeler) for (const m of D(s).mud[b.id] ?? []) m.bag = Math.min(100, m.bag + 0.15);
});
