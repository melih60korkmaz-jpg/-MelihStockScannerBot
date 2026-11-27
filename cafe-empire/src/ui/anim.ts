/** Animasyon yardımcıları: kullanıcı/aygıt tercihi, düşük performans koruması, çıkış animasyonu.
 *  Kural: yalnızca transform/opacity animasyonu, süreler tema.css'teki --d* değişkenlerinden gelir. */
export type AnimMod = 'tam' | 'hafif' | 'kapali';
const ANAHTAR = 'ce_anim';
let lite = false, ema = 1 / 60, yavas = 0;

export const hareketAzalt = (): boolean => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
/** Oyuncunun seçtiği mod (Ayarlar). Kayıtlı yoksa 'tam'. */
export function animTercih(): AnimMod { try { const v = localStorage.getItem(ANAHTAR); if (v === 'tam' || v === 'hafif' || v === 'kapali') return v; } catch { /* depolama kapalı */ } return 'tam'; }
/** Gerçekte uygulanan mod: sistem "hareketi azalt" derse kapalı; yavaş aygıtta tam → hafif. */
export function animEtkin(): AnimMod { if (hareketAzalt()) return 'kapali'; const t = animTercih(); return t === 'tam' && lite ? 'hafif' : t; }
export function animUygula(): void { document.documentElement.dataset.anim = animEtkin(); }
export function animKaydet(m: AnimMod): void { try { localStorage.setItem(ANAHTAR, m); } catch { /* yoksay */ } animUygula(); }
/** Oyun döngüsü her karede çağırır: ~2 sn boyunca kare süresi 34 ms'yi aşarsa animasyonlar kendiliğinden hafifler. */
export function kareIzle(dt: number): void {
  if (lite || dt <= 0) return; ema += (dt - ema) * 0.08; if (ema > 0.034) yavas++; else yavas = Math.max(0, yavas - 2);
  if (yavas > 90) { lite = true; animUygula(); }
}
export const liteMi = (): boolean => lite;
/** Elemanı çıkış animasyonuyla kaldırır (animasyon kapalıysa hemen). */
export function kapatAnimli(el: HTMLElement, ms = 200): void {
  if (!el.isConnected) return; if (animEtkin() === 'kapali') { el.remove(); return; }
  el.classList.add('cikis'); let bitti = false; const son = (): void => { if (bitti) return; bitti = true; el.remove(); };
  el.addEventListener('animationend', (e) => { if (e.target === el || (e.target as HTMLElement).parentElement === el) son(); }); setTimeout(son, ms + 80);
}
