/** Sponsorluk: teklifler, anlaşmalar, maç başına ödeme, başarı primi, performans şartları, marka itibarı. */
import { clamp } from './rng';
import { type Game, type SponsorAnlasma, type SponsorTeklif, haberEkle, rngOf, rngKaydet, genel } from './game';
export interface Marka { id: string; ad: string; kat: string; ik: string; min: number; k: number }
/** Kurgusal markalar (gerçek marka yok). min: gereken itibar, k: ödeme çarpanı. */
export const MARKALAR: Marka[] = [
  { id: 'atlas', ad: 'Atlas Spor', kat: 'Spor giyim', ik: '👕', min: 10, k: 0.9 }, { id: 'zirvegiy', ad: 'Zirve Giyim', kat: 'Spor giyim', ik: '🧥', min: 45, k: 1.7 },
  { id: 'adim', ad: 'Adım Ayakkabı', kat: 'Spor ayakkabı', ik: '👟', min: 12, k: 0.9 }, { id: 'ruzgar', ad: 'Rüzgâr Spor', kat: 'Spor ayakkabı', ik: '🥾', min: 55, k: 2.1 },
  { id: 'volt', ad: 'Volt İçecek', kat: 'İçecek', ik: '🥤', min: 15, k: 1.0 }, { id: 'kaynak', ad: 'Kaynak Su', kat: 'İçecek', ik: '💧', min: 40, k: 1.5 },
  { id: 'nova', ad: 'Nova Elektronik', kat: 'Elektronik', ik: '📱', min: 25, k: 1.2 }, { id: 'sinyal', ad: 'Sinyal Mobil', kat: 'Elektronik', ik: '🎧', min: 60, k: 2.2 },
  { id: 'doruk', ad: 'Doruk Otomotiv', kat: 'Otomobil', ik: '🚗', min: 50, k: 2.4 }, { id: 'yildirim', ad: 'Yıldırım Motors', kat: 'Otomobil', ik: '🏎️', min: 75, k: 3.4 },
  { id: 'zaman', ad: 'Zaman Saat', kat: 'Saat', ik: '⌚', min: 35, k: 1.6 }, { id: 'kadran', ad: 'Kadran Lüks', kat: 'Saat', ik: '⏱️', min: 70, k: 3.0 },
  { id: 'lotus', ad: 'Lotus Yaşam', kat: 'Yaşam tarzı', ik: '🌿', min: 20, k: 1.1 }, { id: 'ufuk', ad: 'Mavi Ufuk', kat: 'Yaşam tarzı', ik: '🏖️', min: 65, k: 2.6 }
];
export const markaOf = (id: string): Marka => MARKALAR.find((m) => m.id === id)!;
export const SPONSOR_OMRU = 6, SEZON_HAFTA = 22;
export const slotSayisi = (g: Game): number => (g.itibar >= 80 ? 4 : g.itibar >= 60 ? 3 : g.itibar >= 35 ? 2 : g.itibar >= 15 ? 1 : 0);
export const sartMetni = (tip: 'gol' | 'puan' | 'mac', h: number): string => (tip === 'gol' ? `Sezonda en az ${h} gol` : tip === 'puan' ? `Sezon maç puanı ortalaması ${h.toFixed(1)}+ (en az 8 maç)` : `Sezonda en az ${h} maç oyna`);
/** Teklif üret: itibar yetiyorsa, aynı kategoride anlaşma yoksa. */
export function sponsorTeklifUret(g: Game): number {
  const rng = rngOf(g), bos = slotSayisi(g) - g.sponsorlar.length - g.sponsorTeklifleri.length; if (bos <= 0) { rngKaydet(g, rng); return 0; }
  const aktifKat = new Set(g.sponsorlar.map((a) => a.kat)), vard = new Set(g.sponsorTeklifleri.map((t) => t.marka));
  const aday = MARKALAR.filter((m) => m.min <= g.itibar + 6 && !aktifKat.has(m.kat) && !vard.has(m.id)); let yeni = 0;
  for (let i = 0; i < Math.min(bos, rng.int(1, 2)) && aday.length; i++) {
    const m = aday.splice(rng.int(0, aday.length - 1), 1)[0]!, taban = Math.max(g.sozlesme.maas, 3000), ilis = 1 + (g.iliski.sponsor - 50) / 250, macBasi = Math.round(taban * 0.18 * m.k * ilis * rng.range(0.9, 1.15) / 50) * 50;
    const sartTip = rng.pick(['gol', 'puan', 'mac'] as const), poz = g.oyuncu.poz, golBeklenti = poz === 'SF' ? 8 : poz === 'SGK' || poz === 'SLK' || poz === 'ON' ? 5 : poz === 'KL' || poz === 'STP' ? 1 : 3; const hedef = sartTip === 'gol' ? Math.max(1, Math.round(golBeklenti * (0.5 + genel(g) / 120))) : sartTip === 'puan' ? +(6.5 + m.k * 0.15).toFixed(1) : rng.int(12, 18);
    const t: SponsorTeklif = { id: Math.floor(rng.next() * 1e9), marka: m.id, kat: m.kat, macBasi, prim: macBasi * 8, sartTip, sartHedef: hedef, sure: rng.int(1, 3), kalan: SPONSOR_OMRU }; g.sponsorTeklifleri.push(t); yeni++; haberEkle(g, `${m.ad}, ${g.ad} ile sponsorluk görüşmesi yapmak istiyor.`, 'kariyer');
  }
  rngKaydet(g, rng); return yeni;
}
export function sponsorKabul(g: Game, id: number): { ok: boolean; m: string } {
  const t = g.sponsorTeklifleri.find((x) => x.id === id); if (!t) return { ok: false, m: 'Teklif bulunamadı.' }; if (g.sponsorlar.length >= slotSayisi(g)) return { ok: false, m: `Sponsor slotun dolu (${slotSayisi(g)}). İtibarını artır.` }; if (g.sponsorlar.some((a) => a.kat === t.kat)) return { ok: false, m: 'Bu kategoride zaten bir sponsorun var.' };
  const a: SponsorAnlasma = { marka: t.marka, kat: t.kat, macBasi: t.macBasi, prim: t.prim, sartTip: t.sartTip, sartHedef: t.sartHedef, kalan: t.sure, ilerleme: 0, memnun: 60, sonSezonKarsilandi: true, kazanc: 0, sayac: 0 };
  g.sponsorlar.push(a); g.sponsorTeklifleri = g.sponsorTeklifleri.filter((x) => x.id !== id); g.iliski.sponsor = clamp(g.iliski.sponsor + 8, 0, 100); haberEkle(g, `${g.ad}, ${markaOf(t.marka).ad} ile ${t.sure} sezonluk sponsorluk anlaştı.`, 'kariyer'); return { ok: true, m: `${markaOf(t.marka).ad} ile anlaştın!` };
}
export const sponsorRed = (g: Game, id: number): void => { g.sponsorTeklifleri = g.sponsorTeklifleri.filter((x) => x.id !== id); };
export const FESIH_CEZASI = (a: SponsorAnlasma): number => a.macBasi * 6;
export function sponsorFesih(g: Game, marka: string): { ok: boolean; m: string } { const a = g.sponsorlar.find((x) => x.marka === marka); if (!a) return { ok: false, m: 'Anlaşma yok.' }; const c = FESIH_CEZASI(a); if (g.para < c) return { ok: false, m: `Cayma bedeli ${c.toLocaleString('tr-TR')} ₺: paran yetmiyor.` }; g.para -= c; g.sponsorlar = g.sponsorlar.filter((x) => x !== a); g.iliski.sponsor = clamp(g.iliski.sponsor - 10, 0, 100); return { ok: true, m: `${markaOf(marka).ad} ile yollar ayrıldı (-${c.toLocaleString('tr-TR')} ₺).` }; }
/** Her maçtan sonra: oynadıysa maç başına ödeme + şart ilerlemesi */
export function sponsorMacIsle(g: Game, oynadi: boolean, gol: number, puan: number): number {
  if (!oynadi) return 0; let toplam = 0; for (const a of g.sponsorlar) { const ilis = g.iliski.sponsor > 70 ? 1.1 : g.iliski.sponsor < 25 ? 0.85 : 1; const kz = Math.round(a.macBasi * ilis); toplam += kz; a.kazanc += kz; if (a.sartTip === 'gol') a.ilerleme += gol; else if (a.sartTip === 'mac') a.ilerleme += 1; else { a.sayac++; a.ilerleme = ((a.ilerleme * (a.sayac - 1)) + puan) / a.sayac; } } return toplam;
}
/** Sezon sonu: şartlar değerlendirilir, prim ödenir, süre azalır, bitenler çıkar. */
export function sponsorSezonSonu(g: Game, sezonMacSayisi: number): string[] {
  const out: string[] = []; for (const a of [...g.sponsorlar]) {
    const ok = a.sartTip === 'puan' ? (a.ilerleme >= a.sartHedef && sezonMacSayisi >= 8) : a.ilerleme >= a.sartHedef, m = markaOf(a.marka);
    if (ok) { g.para += a.prim; a.kazanc += a.prim; a.memnun = clamp(a.memnun + 12, 0, 100); g.iliski.sponsor = clamp(g.iliski.sponsor + 6, 0, 100); g.itibar = clamp(g.itibar + 1, 0, 100); out.push(`${m.ad}: şart sağlandı, başarı primi +${a.prim.toLocaleString('tr-TR')} ₺`); }
    else { a.memnun = clamp(a.memnun - 25, 0, 100); g.iliski.sponsor = clamp(g.iliski.sponsor - 7, 0, 100); out.push(`${m.ad}: şart sağlanamadı (${sartMetni(a.sartTip, a.sartHedef)}); memnuniyet düştü`); if (a.sonSezonKarsilandi === false) { g.sponsorlar = g.sponsorlar.filter((x) => x !== a); out.push(`${m.ad} anlaşmayı feshetti.`); continue; } }
    a.sonSezonKarsilandi = ok; a.kalan--; a.ilerleme = 0; a.sayac = 0; if (a.kalan <= 0) { g.sponsorlar = g.sponsorlar.filter((x) => x !== a); out.push(`${m.ad} anlaşması sona erdi.`); }
  } return out;
}
export const sponsorHaftalikGecen = (g: Game): void => { for (const t of g.sponsorTeklifleri) t.kalan--; g.sponsorTeklifleri = g.sponsorTeklifleri.filter((t) => t.kalan > 0); };
