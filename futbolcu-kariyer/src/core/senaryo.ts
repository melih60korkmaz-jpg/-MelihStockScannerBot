/** Kariyer senaryoları: teknik direktör çatışması, ilk 11 mücadelesi, yedek kalma, kiralık, büyük kulüp ilgisi, sözleşme, taraftar baskısı,
 *  basın, menajer değişikliği, ayrılma talebi. Her kart seçenekli; etkiler kısa vadeli (anında) ve uzun vadeli (gecikmeli) çalışır. */
import type { OlayKart } from './olay';
import { type Game, clubOf, genel, haberEkle, kisaAd, ligOf, rngOf, rngKaydet, ulkeOf } from './game';
import { kaliteOf, ozelTeklif, sozlesmeYenile, teklifUret } from './transfer';
import { clamp } from './rng';
import { sirala } from './world';
/** Bu haftadan önceki son n maçta kaç kez kadroda süre alınmadı. */
export const yedekSerisi = (g: Game): number => { let n = 0; for (const m of g.maclar) { if (m.oynadi) break; n++; } return n; };
export const sonMaglubiyetSerisi = (g: Game): number => { let n = 0; for (const m of g.maclar) { const bizEv = m.ev === g.kulup, bg = bizEv ? m.gev : m.gdep, rg = bizEv ? m.gdep : m.gev; if (bg < rg) n++; else break; } return n; };
export const rolEtkisi = (g: Game): number => (g.rolEtki && g.rolEtki.bitis > g.toplamHafta ? g.rolEtki.deger : 0);
export function rolEtkiVer(g: Game, hafta: number, deger: number): void { g.rolEtki = { bitis: g.toplamHafta + hafta, deger }; }
/** Kiralık: aynı ülkede, kendinden belirgin zayıf bir kulübe geçici gönderilir; sözleşme ana kulüpte kalır, sezon sonu geri dönülür. */
export function kiralikGonder(g: Game): { ok: boolean; m: string } {
  if (g.kiralik) return { ok: false, m: 'Zaten kiralıksın.' };
  const ulke = ulkeOf(g, g.kulup), q = kaliteOf(g, g.kulup), o = genel(g), aday = g.kulupler.filter((k) => k.id !== g.kulup && ulkeOf(g, k.id) === ulke && kaliteOf(g, k.id) <= q - 3 && kaliteOf(g, k.id) >= o - 12).sort((a, b) => b.guc - a.guc);
  const hedef = aday[0] ?? g.kulupler.filter((k) => k.id !== g.kulup && ulkeOf(g, k.id) === ulke && k.guc < clubOf(g).guc).sort((a, b) => b.guc - a.guc)[0]; if (!hedef) return { ok: false, m: 'Uygun bir kiralık kulüp bulunamadı.' };
  g.kiralik = { ana: g.kulup, sozlesme: { ...g.sozlesme }, bitisSezon: g.sezon }; g.transferler.push({ sezon: g.sezon, hafta: g.hafta, kimden: g.kulup, kime: hedef.id, imza: 0 });
  g.kulup = hedef.id; g.sozlesme = { kulup: hedef.id, maas: Math.round(g.kiralik.sozlesme.maas * 0.6 / 50) * 50, golPrimi: g.kiralik.sozlesme.golPrimi, asistPrimi: g.kiralik.sozlesme.asistPrimi, sure: 1, bedel: g.kiralik.sozlesme.bedel }; g.teklifler = [];
  g.iliski.td = 50; g.iliski.takim = 45; g.iliski.taraftar = clamp(g.iliski.taraftar * 0.6 + 20, 0, 100); haberEkle(g, `${g.ad}, ${kisaAd(g, g.kiralik.ana)} tarafından sezon sonuna kadar ${kisaAd(g, hedef.id)}'e kiralandı.`, 'kariyer');
  return { ok: true, m: `${kisaAd(g, hedef.id)}'e kiralandın. Sezon sonunda ${kisaAd(g, g.kiralik.ana)}'a dönersin; orada forma süresi alırsan değerin artar.` };
}
/** Sezon sonu: kiralık dönüşü. Başarılıysa ana kulüpte teknik direktör güveni ve rol artar. */
export function kiralikDonus(g: Game): string | null {
  const k = g.kiralik; if (!k || g.sezon < k.bitisSezon) return null; const gecen = g.gecmis.find((x) => x.sezon === g.sezon), iyi = (gecen?.mac ?? 0) >= 12 && (gecen?.gol ?? 0) + (gecen?.asist ?? 0) >= 6;
  const kiralayan = g.kulup; g.kulup = k.ana; g.sozlesme = { ...k.sozlesme, kulup: k.ana }; g.kiralik = null; g.iliski.td = clamp(iyi ? 70 : 50, 0, 100); g.iliski.takim = 50; g.teklifler = [];
  if (iyi) rolEtkiVer(g, 12, 9); const s = `Kiralık dönemi bitti: ${kisaAd(g, kiralayan)} → ${kisaAd(g, k.ana)}. ${iyi ? 'İyi sezon geçirdin; teknik direktör seni ilk 11 için düşünüyor.' : 'Süre ve performans yetersizdi; yeniden kadroya girmen gerekecek.'}`; haberEkle(g, s, 'kariyer'); return s;
}
/** Resmî ayrılma talebi: kulüp memnuniyetsiz olur ama teklifler gelir; teknik direktörle ilişki kötüyse bir süre kadro dışı bırakılırsın. */
export function ayrilmaTalebiVer(g: Game): string {
  g.ayrilmaTalebi = g.toplamHafta; const n = teklifUret(g); const ceza = g.iliski.td < 45; g.iliski.td = clamp(g.iliski.td - 12, 0, 100); g.iliski.taraftar = clamp(g.iliski.taraftar - 8, 0, 100); g.iliski.takim = clamp(g.iliski.takim - 5, 0, 100); if (ceza) rolEtkiVer(g, 5, -20);
  haberEkle(g, `${g.ad} kulübe ayrılma talebini iletti.`, 'kariyer'); return `Ayrılma talebi iletildi. ${n} yeni teklif geldi${ceza ? '; teknik direktör seni 5 hafta kadro dışı bırakıyor' : ''}.`;
}
/** Büyük kulüp teklifi: şu anki kulüpten belirgin güçlü ve ulaşılabilir bir kulüpten gerçek bir teklif. */
export function buyukTeklif(g: Game): boolean {
  const q = kaliteOf(g, g.kulup), o = genel(g) + 5 + g.itibar / 8, aday = g.kulupler.filter((k) => k.id !== g.kulup && kaliteOf(g, k.id) >= q + 4 && kaliteOf(g, k.id) <= o + 4 && !g.teklifler.some((t) => t.kulup === k.id)).sort((a, b) => b.guc - a.guc); if (!aday.length) return false;
  const rng = rngOf(g), k = aday[rng.int(0, Math.min(2, aday.length - 1))]!; rngKaydet(g, rng); ozelTeklif(g, k.id); haberEkle(g, `${kisaAd(g, k.id)} ${g.ad} için resmi teklif sundu.`, 'dunya'); return true;
}
/** Menajer değişikliği: kaliteli menajer daha çok teklif/pazarlık gücü, ama yüksek komisyon; ucuz menajer tersi. */
export function menajerDegistir(g: Game, tur: 'kalite' | 'ucuz' | 'birak'): string {
  if (tur === 'birak') { g.menajer = false; return 'Menajersiz devam ediyorsun.'; } const ucret = tur === 'kalite' ? 30000 : 8000; if (g.para < ucret) return `Yeterli paran yok (${ucret} ₺).`; g.para -= ucret; g.menajer = true; g.menajerKomisyon = tur === 'kalite' ? 0.08 : 0.03; g.menajerKalite = tur === 'kalite' ? 1.4 : 0.8;
  haberEkle(g, `${g.ad} menajer değiştirdi (${tur === 'kalite' ? 'üst düzey ajans' : 'ekonomik ajans'}).`, 'kariyer'); return tur === 'kalite' ? 'Üst düzey ajansla anlaştın: daha çok ve daha iyi teklif, %8 komisyon.' : 'Ekonomik ajansla anlaştın: %3 komisyon, daha az teklif.';
}
/** Sözleşme müzakeresi kararı. */
export function sozlesmeKarari(g: Game, tur: 'kabul' | 'zam' | 'ret'): string {
  if (tur === 'ret') { g.sozlesmeRed = true; g.iliski.td = clamp(g.iliski.td - 6, 0, 100); g.iliski.taraftar = clamp(g.iliski.taraftar - 5, 0, 100); return 'Yenilemeyi reddettin. Sezon sonunda sözleşmen biterse serbest kalma tehdidiyle teklifler artacak.'; }
  const r = sozlesmeYenile(g, tur === 'zam' ? 0.25 : 0.05, 2); return r.m;
}
/** Sezon sonu: yenilemeyi reddeden oyuncu için "bonservissiz" teklif dalgası. */
export function sozlesmeRedSonu(g: Game): string | null {
  if (!g.sozlesmeRed) return null; g.sozlesmeRed = false; if (g.sozlesme.sure > 1) return null; let n = 0; for (let i = 0; i < 2; i++) n += teklifUret(g); for (const t of g.teklifler) t.imza = Math.round(t.imza * 1.5 / 100) * 100;
  const s = `Sözleşmeni yenilemediğin için ${n} kulüp bonservissiz transfer için yarışıyor (imza ücretleri %50 yüksek).`; haberEkle(g, s, 'dunya'); return s;
}
const td = 'Teknik direktör', kl = (g: Game): string => kisaAd(g, g.kulup);
export const SENARYOLAR: OlayKart[] = [
  { id: 'td_anlasmazlik', baslik: 'Teknik direktörle anlaşmazlık', ik: '🗣️', metin: (g) => `${td} kadro tercihleri ve oyun planı yüzünden seninle ters düştü. Soyunma odasında gergin bir hava var.`, kosul: (g) => g.iliski.td < 40 && g.maclar.length >= 3 && !g.kiralik, agirlik: 4, bekleme: 10, secenekler: [
    { ad: 'Özür dile, planına uy', ac: 'Kısa: ilişki düzelir', etki: { td: 10, mut: -3 }, gecikme: { hafta: 4, sans: 0.6, olur: { td: 6, haber: 'Teknik direktör uyumunu görüp seni yeniden planına dahil etti.' } } },
    { ad: 'Fikrini sonuna kadar savun', ac: 'Takım yanında, hoca karşında', etki: { td: -10, takim: 5, mut: 2 }, gecikme: { hafta: 3, sans: 0.5, olur: { rolEtki: { hafta: 4, deger: -18 }, haber: 'Teknik direktör seni bir süre yedek bıraktı.' }, olmaz: { td: 3 } } },
    { ad: 'Başkanla görüş', ac: 'İtibar 25+ gerekir', kosul: (g) => g.itibar >= 25, etki: { td: -4, taraftar: 2 }, gecikme: { hafta: 2, sans: 0.55, olur: { td: 14, takim: 3, haber: 'Başkan arabulucu oldu, ilişkiler düzeldi.' }, olmaz: { td: -8, haber: 'Başkan hocanın yanında durdu.' } } },
    { ad: 'Ayrılmak istediğini söyle', etki: { ayrilma: true } }] },
  { id: 'ilk11_mucadele', baslik: 'İlk 11 için rekabet', ik: '🥊', metin: (g) => `Aynı mevkide ${kl(g)}'nin yeni bir oyuncusu seninle yarışıyor. Teknik direktör "hafta sonu kim hazırsa o oynar" dedi.`, kosul: (g) => !g.sakatlik && g.maclar.length >= 2 && g.hafta >= 2 && rolOfLazy(g) === 0, agirlik: 4, bekleme: 9, secenekler: [
    { ad: 'Fazladan antrenman yap', ac: 'Enerji -15, yorgunluk +10', etki: { enerji: -15, yorgunluk: 10, td: 3 }, gecikme: { hafta: 1, sans: 0.65, olur: { rolEtki: { hafta: 5, deger: 14 }, mut: 3, haber: 'Çalışkanlığın karşılık buldu: ilk 11 şansı yakaladın.' }, olmaz: { mut: -3, haber: 'Fazladan çalışma yetmedi.' } } },
    { ad: 'Teknik direktörle konuş', etki: { td: 4 }, gecikme: { hafta: 2, sans: 0.5, olur: { rolEtki: { hafta: 4, deger: 9 }, haber: 'Teknik direktör sana bir şans verecek.' } } },
    { ad: 'Rakibi gölgede bırakmaya çalış (gösteriş)', etki: { takim: -4, td: -2, itibar: 1 }, gecikme: { hafta: 2, sans: 0.4, olur: { rolEtki: { hafta: 3, deger: 10 } }, olmaz: { td: -4, taraftar: -2 } } },
    { ad: 'Rolünü kabul et', etki: { mut: -3, takim: 3, td: 2 } }] },
  { id: 'yedek_kalma', baslik: 'Yedek kalmaya devam', ik: '🪑', metin: (g) => `Son ${yedekSerisi(g)} maçtır forma giymiyorsun. Formun düşüyor, gelişimin yavaşlıyor.`, kosul: (g) => yedekSerisi(g) >= 3 && !g.sakatlik, agirlik: 5, bekleme: 8, secenekler: [
    { ad: 'Kiralık gönderilmeyi iste', ac: 'Sezon sonuna kadar daha zayıf bir kulüpte süre al', kosul: (g) => !g.kiralik && g.oyuncu.yas <= 26, etki: { kiralik: true, td: -3 } },
    { ad: 'Transfer talep et', ac: 'Teklifler gelir, ilişki bozulur', etki: { ayrilma: true } },
    { ad: 'Sabret ve çalış', etki: { td: 4, mut: -4, enerji: -8 }, gecikme: { hafta: 4, sans: 0.55, olur: { rolEtki: { hafta: 5, deger: 10 }, mut: 5, haber: 'Sabrın ve çalışman sonunda şans getirdi.' }, olmaz: { mut: -5 } } },
    { ad: 'Menajerinle çıkış yolları ara', kosul: (g) => g.menajer, etki: { para: -2000 }, gecikme: { hafta: 1, sans: 0.7, olur: { yeniTeklif: true, haber: 'Menajerin yeni bir kulüp buldu.' } } }] },
  { id: 'buyuk_kulup_ilgi', baslik: 'Büyük kulüp ilgileniyor', ik: '🌟', metin: (g) => `Menajer ve basın aynı haberi veriyor: bir büyük kulüp ${g.ad} için harekete geçti. Sana sıcak bakıyorlar, kararını bekliyorlar.`, kosul: (g) => g.itibar >= 30 && genel(g) >= 45 && kaliteOf(g, g.kulup) < 80 && g.hafta >= 4, agirlik: 3, bekleme: 16, secenekler: [
    { ad: 'Teklifi dinle', ac: 'Gerçek bir teklif gelebilir', etki: { td: -5, taraftar: -3, buyukTeklif: true } },
    { ad: 'Kulübe sadık kal', ac: 'Kısa: sevgi, uzun: zam', etki: { taraftar: 10, td: 8, takim: 4 }, gecikme: { hafta: 6, sans: 0.5, olur: { para: 40000, itibar: 2, haber: 'Sadakatin kulüpte karşılık buldu: prim aldın.' } } },
    { ad: 'Basına ima et (baskı yap)', etki: { itibar: 3, taraftar: -6, td: -4 }, gecikme: { hafta: 2, sans: 0.55, olur: { buyukTeklif: true, haber: 'Basın baskısı işe yaradı: büyük kulüp teklif gönderdi.' }, olmaz: { td: -4, haber: 'Büyük kulüp vazgeçti; yönetim sana kırgın.' } } }] },
  { id: 'sozlesme_yenileme', baslik: 'Sözleşme müzakeresi', ik: '📝', metin: (g) => `Sözleşmenin bitmesine ${g.sozlesme.sure} sezon kaldı. ${kl(g)} yönetimi yenileme için masaya oturmak istiyor.`, kosul: (g) => g.sozlesme.sure <= 1 && g.hafta >= 4 && !g.sozlesmeRed && !g.kiralik, agirlik: 6, bekleme: 22, secenekler: [
    { ad: 'Yenile (makul artış)', ac: '+%5 maaş, 2 sezon', etki: { yenile: 'kabul' } },
    { ad: 'Büyük zam iste', ac: '+%25 maaş; reddedilme riski', etki: { yenile: 'zam' } },
    { ad: 'Reddet, sezon sonunu bekle', ac: 'Bonservissiz teklifler artar, kulüp kırılır', etki: { yenile: 'ret' } }] },
  { id: 'taraftar_baski', baslik: 'Taraftar baskısı', ik: '📢', metin: (g) => `Üst üste ${sonMaglubiyetSerisi(g)} yenilgi sonrası tribün tepkili. Taraftar grupları antrenman tesislerinin önünde toplandı.`, kosul: (g) => sonMaglubiyetSerisi(g) >= 2 && g.iliski.taraftar < 65, agirlik: 5, bekleme: 8, secenekler: [
    { ad: 'Taraftar temsilcileriyle buluş', etki: { taraftar: 9, mut: -2, enerji: -6 }, gecikme: { hafta: 4, sans: 0.5, olur: { takim: 4, haber: 'Taraftarla ortak açıklama moral verdi.' } } },
    { ad: 'Sahada cevap vereceğim de', etki: { taraftar: -2, mut: 1 }, gecikme: { hafta: 3, sans: 0.5, olur: { taraftar: 10, itibar: 1, haber: 'Sahadaki cevap taraftarı yumuşattı.' }, olmaz: { taraftar: -6 } } },
    { ad: 'Basında taraftara sert çık', etki: { taraftar: -12, itibar: 2, td: -3, mut: 2 }, gecikme: { hafta: 2, sans: 0.6, olur: { sponsor: -6, haber: 'Sert sözler sponsorları rahatsız etti.' } } }] },
  { id: 'basin_aciklama', baslik: 'Basın toplantısı: açıklama yap', ik: '📰', metin: (g) => `Maç öncesi basın toplantısında ${g.ad}'ye soru yağıyor. Ne söyleyeceğin gündem olacak.`, kosul: (g) => g.itibar >= 15 && g.maclar.length >= 2, agirlik: 3, bekleme: 12, secenekler: [
    { ad: 'Takım hedefini vurgula', etki: { td: 4, takim: 4, taraftar: 3 } },
    { ad: 'Kişisel hedef açıkla ("gol kralı olacağım")', etki: { itibar: 3, takim: -3, mut: 2 }, gecikme: { hafta: 6, sans: 0.4, olur: { itibar: 4, haber: 'Açıkladığın hedefe yaklaştın; basın seni övüyor.' }, olmaz: { itibar: -3, taraftar: -3, haber: 'Büyük hedefler boşa çıktı; basın alay etti.' } } },
    { ad: 'Transferle ilgili soruları geçiştir', etki: { td: 2 } },
    { ad: 'Hakemlere ve rakibe laf at', etki: { itibar: 2, taraftar: 4, takim: -2 }, gecikme: { hafta: 1, sans: 0.5, olur: { para: -8000, td: -3, haber: 'Federasyon açıklamaların için para cezası verdi.' } } }] },
  { id: 'menajer_degisikligi', baslik: 'Menajer değişikliği', ik: '🤵', metin: (g) => g.menajer ? `Rakip bir ajans, mevcut menajerinden daha iyi koşullar sunuyor.` : `Birkaç ajans sana temsil teklif ediyor. Menajersiz devam etmek zor olabilir.`, kosul: (g) => g.itibar >= 18, agirlik: 2, bekleme: 30, secenekler: [
    { ad: 'Üst düzey ajansa geç', ac: '30.000 ₺, %8 komisyon, daha çok teklif', kosul: (g) => g.para >= 30000, etki: { menajerDegis: 'kalite' } },
    { ad: 'Ekonomik ajansa geç', ac: '8.000 ₺, %3 komisyon, daha az teklif', kosul: (g) => g.para >= 8000, etki: { menajerDegis: 'ucuz' } },
    { ad: 'Menajerlikten vazgeç', kosul: (g) => g.menajer, etki: { menajerDegis: 'birak' } },
    { ad: 'Değiştirme', etki: { mut: 1 } }] },
  { id: 'ayrilma_talebi', baslik: 'Ayrılma talebi kararı', ik: '🚪', metin: (g) => `Burada mutlu değilsin: rolün, ilişkilerin ve geleceğin belirsiz. Kulüpten ayrılmayı ciddi ciddi düşünüyorsun.`, kosul: (g) => g.mut < 45 && g.itibar >= 15 && (g.iliski.td < 45 || rolOfLazy(g) === 0) && !g.kiralik && !g.ayrilmaTalebi, agirlik: 3, bekleme: 24, secenekler: [
    { ad: 'Resmî ayrılma talebi ver', ac: 'Teklifler gelir, hoca/taraftar tepki gösterir', etki: { ayrilma: true } },
    { ad: 'Kiralık gönderilmeyi iste', kosul: (g) => g.oyuncu.yas <= 27, etki: { kiralik: true } },
    { ad: 'Bir sezon daha dene', etki: { mut: 2, td: 3 }, gecikme: { hafta: 6, sans: 0.5, olur: { mut: 6, haber: 'Sabrın iyi geldi: ortam yumuşadı.' }, olmaz: { mut: -5 } } }] }
];
function rolOfLazy(g: Game): number { return g.maclar.length && g.maclar.slice(0, 3).every((m) => !m.oynadi) ? 0 : (genel(g) - (clubOf(g).guc * 85 + 5) > -7 ? 1 : 0); }
void ligOf; void sirala;
