/** Ekonomi dengesi: şirket genel yönetim gideri (şube sayısıyla büyür). Tek şubede çok küçüktür; zincir büyüdükçe marjı gerçekçi seviyede tutar. */
import { hooks } from './sim';
import { dayOf } from './calendar';
import { D } from './derin';
import type { GameState } from './types';
export const GENEL_SABIT = 500;        // ₺/gün (muhasebe, yazılım, sigorta işleri) × enflasyon
export const GENEL_ORAN_ADIM = 0.009;  // ikinci şubeden sonra her şube için gelirin yüzdesi
export const GENEL_ORAN_MAX = 0.12;
/** Günlük genel yönetim gideri: sabit + gelir × oran. */
export function genelGider(s: GameState, gelir: number): number {
  const n = s.subeler.filter((b) => b.kuruldu).length; if (!n) return 0;
  const oran = Math.min(GENEL_ORAN_MAX, Math.max(0, n - 2) * GENEL_ORAN_ADIM);
  return GENEL_SABIT * s.market.fiyat + gelir * oran;
}
hooks.gunOnce.push((s, toplam) => {
  const gelir = Object.entries(toplam.gelir).reduce((a, [k, v]) => a + (k === 'franchise' ? 0 : (v as number)), 0), g = genelGider(s, gelir);
  if (g > 0) { toplam.gider.bakim += g; s.kasa -= g; }
});

/** Kira ve maaş endekslemesi: her 90 günde bir kiralar fiyat endeksinin artışının %85'i, maaşlar %70'i kadar yükselir (satış fiyatları enflasyonla artarken giderler sabit kalmasın). */
export const KIRA_PERIYOT = 90, KIRA_PAY = 0.85;
hooks.gunOnce.push((s) => {
  const d = D(s), now = dayOf(s); if (!s.subeler.length) return; const son = d.say.kiraIdx ?? 0, f = s.market.fiyat;
  if (!son) { d.say.kiraIdx = f; d.say.kiraGun = now; return; }
  if (now - (d.say.kiraGun ?? now) < KIRA_PERIYOT) return;
  const k = Math.pow(f / son, KIRA_PAY); if (k > 1.005) { const kw = Math.pow(f / son, 0.7); for (const b of s.subeler) { b.kira = Math.round(b.kira * k / 500) * 500; for (const e of b.staff) { e.maas = Math.round(e.maas * kw / 500) * 500; e.maasBeklenti = Math.round(e.maasBeklenti * kw / 500) * 500; } } s.log.unshift(`🏠 Kiralar %${Math.round((k - 1) * 100)}, maaşlar %${Math.round((kw - 1) * 100)} arttı (enflasyon).`); }
  d.say.kiraIdx = f; d.say.kiraGun = now;
});
