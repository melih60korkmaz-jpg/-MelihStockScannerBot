/** Haftalık ve aylık meydan okumalar (seri ödülü) ve kariyer özeti. */
import { LEVELS } from '../data/catalog';
import { hooks, levelOf } from './sim';
import { dateOf, dayOf } from './calendar';
import { BASARIMLAR } from './goals';
import { D, yaz, zaferMaddeleri } from './derin';
import type { GameState } from './types';

export interface Donem { id: string; tur: 'hafta' | 'ay'; ad: string; ac: string; olc: string; taban: number; hedef: number; bas: number; bit: number; odul: number; tamam: boolean; ok?: number }
export interface DonemDurum { liste: Donem[]; seri: number; toplam: number; hafta: number; ay: number }
export function DD(s: GameState): DonemDurum { const d = D(s); return (d.donem ??= { liste: [], seri: 0, toplam: 0, hafta: -1, ay: -1 }); }
const F = (s: GameState): number => s.market.fiyat;
export function olcum(s: GameState, olc: string): number {
  const d = D(s); switch (olc) {
    case 'musteri': return s.stat.musteri; case 'kar': return s.stat.netKar; case 'tat': return d.say.tat ?? 0; case 'ortak': return d.say.ortak ?? 0; case 'yanit': return d.say.yanit ?? 0; case 'ted': return d.say.ted ?? 0;
    case 'mud': return d.say.mudGel ?? 0; case 'imza': return d.tarif.reduce((a, t) => a + (t.satis ?? 0), 0); case 'kriz': return d.say.kriz ?? 0; case 'sube': return s.subeler.length; default: return 0;
  }
}
export const ilerleme = (s: GameState, x: Donem): number => Math.max(0, Math.min(1, (olcum(s, x.olc) - x.taban) / Math.max(1, x.hedef)));
const ort = (s: GameState, n: number, f: (r: GameState['rapor'][number]) => number): number => { const l = s.rapor.slice(-n); return l.length ? l.reduce((a, r) => a + f(r), 0) / l.length : 0; };
function sablonlar(s: GameState, tur: 'hafta' | 'ay', now: number): Donem[] {
  const d = D(s), g = tur === 'hafta' ? 7 : 30, bit = now + g, mk = (id: string, ad: string, ac: string, olc: string, hedef: number, odul: number): Donem => ({ id: `${tur}:${id}`, tur, ad, ac, olc, taban: olcum(s, olc), hedef: Math.max(1, Math.round(hedef)), bas: now, bit, odul: Math.round(odul / 500) * 500, tamam: false });
  const mus = ort(s, 7, (r) => r.musteri), kar = ort(s, 7, (r) => r.kar), L: Donem[] = [];
  L.push(mk('musteri', tur === 'hafta' ? 'Kalabalık hafta' : 'Kalabalık ay', `${tur === 'hafta' ? '7' : '30'} günde ${Math.max(tur === 'hafta' ? 250 : 1000, Math.round(mus * g * 1.08 / 50) * 50)} müşteriye hizmet et.`, 'musteri', Math.max(tur === 'hafta' ? 250 : 1000, Math.round(mus * g * 1.08 / 50) * 50), (tur === 'hafta' ? 14000 : 60000) * F(s)));
  if (kar > 0 || tur === 'ay') L.push(mk('kar', tur === 'hafta' ? 'Kârlı hafta' : 'Kârlı ay', `${g} günde ${Math.max(5000, Math.round(kar * g * 1.1 / 1000) * 1000)} ₺ net kâr et.`, 'kar', Math.max(5000, Math.round(kar * g * 1.1 / 1000) * 1000), (tur === 'hafta' ? 12000 : 55000) * F(s)));
  if (tur === 'hafta') {
    if (d.tarif.length) L.push(mk('tat', 'Damak tadı', 'Tarif atölyesinde 2 tadım turu yap.', 'tat', 2, 8000 * F(s)));
    L.push(mk('ortak', 'Komşuluk', 'Bir komşu esnafla ortak kampanya başlat.', 'ortak', 1, 10000 * F(s))); L.push(mk('ted', 'Düzenli alım', 'Tedarikçilere 6 sipariş ver.', 'ted', 6, 7000 * F(s)));
    L.push(mk('yanit', 'Müşteriyi dinle', 'Yorumlardan 3 tanesine yanıt yaz.', 'yanit', 3, 6000 * F(s))); if (s.subeler.some((b) => (d.mud[b.id] ?? []).length)) L.push(mk('mud', 'Müdavim haftası', 'Müdavimlerin toplam 12 ziyaret yapmasını sağla.', 'mud', 12, 9000 * F(s)));
    if (d.imza != null) L.push(mk('imza', 'İmza günleri', 'İmza içecekten 40 adet sat.', 'imza', 40, 9000 * F(s))); L.push(mk('kriz', 'Sakin kal', 'Bir krizi ya da olayı kararla çöz.', 'kriz', 1, 6000 * F(s)));
  } else { L.push(mk('sube', 'Büyüme ayı', 'Yeni bir şube aç.', 'sube', 1, 45000 * F(s))); L.push(mk('mud', 'Müdavim ayı', 'Müdavimlerin toplam 60 ziyaret yapmasını sağla.', 'mud', 60, 30000 * F(s))); if (d.tarif.length) L.push(mk('tat', 'Menü geliştir', '5 tadım turu yap.', 'tat', 5, 20000 * F(s))); }
  return L;
}
function sec(s: GameState, L: Donem[], n: number, ofset: number): Donem[] { const t = L.filter((x) => x.olc === 'musteri' || x.olc === 'kar'), r = L.filter((x) => !t.includes(x)); const out = [...t.slice(0, 1)]; let i = ofset; while (out.length < n && r.length) { out.push(r.splice(i % r.length, 1)[0]!); i++; } return out.concat(out.length < n ? t.slice(1, 2) : []).slice(0, n); }
hooks.gunOnce.push((s) => {
  if (!s.subeler.length) return; const k = DD(s), now = dayOf(s), dt = dateOf(now), hafta = Math.floor(now / 7), ay = dt.yil * 12 + dt.ay;
  for (const x of k.liste) if (!x.tamam && ilerleme(s, x) >= 1) { x.tamam = true; x.ok = now; s.kasa += x.odul; k.toplam++; s.log.unshift(`🎯 Meydan okuma tamam: ${x.ad} (+${x.odul} ₺)`); yaz(s, undefined, `Meydan okuma: ${x.ad}`); }
  // süresi dolan haftalık seti değerlendir
  const hafSet = k.liste.filter((x) => x.tur === 'hafta');
  if (hafSet.length && hafSet[0]!.bit <= now) { if (hafSet.every((x) => x.tamam)) { k.seri++; const b = Math.round(15000 * k.seri * F(s) / 500) * 500; s.kasa += Math.min(b, 90000 * F(s)); s.log.unshift(`🔥 Haftalık seri ${k.seri}: bonus +${Math.min(b, Math.round(90000 * F(s)))} ₺`); } else k.seri = 0; }
  k.liste = k.liste.filter((x) => x.bit > now || (x.tamam && now - (x.ok ?? now) <= 3));
  if (!k.liste.some((x) => x.tur === 'hafta' && x.bit > now)) { k.liste = k.liste.filter((x) => x.tur !== 'hafta'); k.liste.push(...sec(s, sablonlar(s, 'hafta', now), 3, hafta)); k.hafta = hafta; }
  if (!k.liste.some((x) => x.tur === 'ay' && x.bit > now)) { k.liste = k.liste.filter((x) => x.tur !== 'ay'); k.liste.push(...sec(s, sablonlar(s, 'ay', now), 2, ay)); k.ay = ay; }
});
/* ---------- Kariyer özeti ---------- */
export interface Kariyer { unvan: string; gun: number; musteri: number; netKar: number; enIyiGun: number; sube: number; il: number; ilce: number; basarim: number; basarimToplam: number; madalya: string; kupa: number; zaferYuzde: number; metin: string }
export const UNVANLAR = ['Çırak kafeci', 'Mahalle kahvecisi', 'Şehir kafecisi', 'Bölge patronu', 'Ulusal zincir', 'Kahve imparatoru'];
export function kariyerOzeti(s: GameState): Kariyer {
  const d = D(s), lv = levelOf(s), z = zaferMaddeleri(s), yz = Math.round(z.reduce((a, m) => a + Math.min(1, m.v / m.h), 0) / z.length * 100), unvan = d.zafer ? UNVANLAR[5]! : UNVANLAR[Math.min(4, Math.max(0, lv - 1))]!;
  const madalya = [...d.sam.filter((x) => x.derece <= 3).map((x) => `Şampiyona ${x.derece}.`), ...d.fuar.gecmis.filter((x) => x.derece !== 'Katılım').map((x) => `Fuar ${x.derece}`)].join(', ') || 'henüz yok';
  const o: Kariyer = { unvan, gun: dayOf(s), musteri: s.stat.musteri, netKar: s.stat.netKar, enIyiGun: s.stat.enIyiGun, sube: s.subeler.length, il: Object.keys(s.bolge.il).length, ilce: Object.keys(s.bolge.ilce).length, basarim: Object.keys(s.basarim).length, basarimToplam: BASARIMLAR.length, madalya, kupa: d.fuar.kupa, zaferYuzde: yz, metin: '' };
  o.metin = `☕ ${s.marka.ad} — ${unvan}\n${o.gun} gün · ${o.sube} şube · ${o.il} il / ${o.ilce} ilçe\n${Math.round(o.musteri).toLocaleString('tr-TR')} müşteri · net kâr ${Math.round(o.netKar).toLocaleString('tr-TR')} ₺ · en iyi gün ${Math.round(o.enIyiGun).toLocaleString('tr-TR')} ₺\nBaşarım ${o.basarim}/${o.basarimToplam} · madalya: ${madalya} · altın fincan ${o.kupa}\nKahve İmparatoru yolu: %${yz}`;
  void LEVELS; return o;
}
