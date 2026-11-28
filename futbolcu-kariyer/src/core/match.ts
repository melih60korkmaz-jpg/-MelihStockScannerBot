/** Maç motoru: dakika dakika futbol olayları üretir; oyuncuyu ilgilendiren önemli pozisyonlarda durup oyuncudan karar bekler.
 *  Saf (DOM'suz): arayüz yalnızca olayları gösterir ve Aksiyon gönderir. Testlerde bot aynı arayüzü kullanır. */
import { Rng, clamp } from './rng';
import { type Game, type MacOzet, genel, clubOf, kisaAd, rngOf, rngKaydet } from './game';
import { POZ_GRUP, type YetenekId } from './skills';
import { haftaFiksturum, rolOf } from './week';
import { mutCarpan } from './sosyal';
import { ekipBonus } from './ekipman';
export type Calis = 0 | 1 | 2; // düşük, normal, yüksek
export type Odak = 'hucum' | 'savunma' | 'dengeli';
export interface Tarz { calis: Calis; odak: Odak }
export type OlayTur = 'bilgi' | 'atak' | 'pas' | 'sut' | 'gol' | 'kurtaris' | 'faul' | 'kart' | 'korner' | 'ofsayt' | 'sakat' | 'penalti' | 'serbest' | 'devre' | 'sonuc' | 'mudahale' | 'dripling';
export interface Olay { dk: number; tur: OlayTur; metin: string; biz?: boolean; onemli?: boolean }
export type PozTip = 'sut' | 'pas' | 'dribling' | 'kafa' | 'serbest' | 'penalti' | 'kurtaris' | 'mudahale';
export interface Hedef { id: number; ad: string; mesafe: number; aciklik: number; risk: number; tur: 'kisa' | 'uzun' | 'ara' }
export interface Pozisyon { tip: PozTip; dk: number; baski: number; mesafe: number; kaleci: number; rakip: number; hedefler: Hedef[]; ipucu: string; sut?: { yon: number } }
export type Aksiyon =
  | { tip: 'sut'; tur: 'normal' | 'sert' | 'plase' | 'asirtma' | 'kafa'; x: number; y: number; guc: number; falso: number }
  | { tip: 'pas'; hedef: number; tur: 'kisa' | 'uzun' | 'ara' }
  | { tip: 'dribling'; tur: 'dripling' | 'hizlan' | 'yon' }
  | { tip: 'mudahale'; tur: 'kapis' | 'pres' | 'pozisyon' }
  | { tip: 'kurtaris'; yon: -1 | 0 | 1; zaman: number }
  | { tip: 'pas_yok' };
export interface Ist { dakika: number; gol: number; asist: number; sut: number; isabet: number; pas: number; basariliPas: number; topKaybi: number; dripling: number; driplingBasari: number; mucadele: number; mucadeleKazanilan: number; kurtaris: number; sari: number; kirmizi: number; anahtarPas: number; puanEk: number }
export type RakipTaktik = 'pres' | 'derin' | 'kontra' | 'dengeli';
export const TAKTIK_AD: Record<RakipTaktik, string> = { pres: 'Yüksek pres', derin: 'Derin savunma', kontra: 'Kontra atak', dengeli: 'Dengeli' };
export const TAKTIK_AC: Record<RakipTaktik, string> = { pres: 'Rakip önde baskı yapar: pozisyonlarda baskı yüksek.', derin: 'Rakip geri çekilir: hücum yolları az, şutlar zor.', kontra: 'Rakip kontrataağa çıkar: hücum odağında rakip fırsat bulur.', dengeli: 'Rakip belirgin bir taktik izlemiyor.' };
/** Lig dışı maç (milli takım, kupa): özel rakip ve kendi takım bilgisi */
export interface OzelMac { tur: 'milli' | 'kupa'; rakipAd: string; bizAd: string; rakipGuc: number; bizGuc: number; ad?: string }
export const MILLI_ID = -2, RAKIP_ID = -1;
export interface Mac {
  ev: number; dep: number; evde: boolean; dk: number; skor: [number, number]; tarz: Tarz; enerji: number; olaylar: Olay[]; ist: Ist; poz: Pozisyon | null; bitti: boolean; rng: number; sakat: boolean; cikti: boolean; bizSut: [number, number]; bizIsabet: [number, number]; korner: [number, number]; faul: [number, number]; topSahip: [number, number]; yorgunluk: number;
  ozel?: OzelMac | null; rakipTaktik: RakipTaktik; ilkYari: boolean; bizKirmizi: boolean; hucumZinciri: number; beklenen: { tip: PozTip } | null; rolu: number; golculer: Array<{ dk: number; biz: boolean; ad: string }>
}
const AD = ['Arda', 'Berk', 'Can', 'Deniz', 'Emre', 'Furkan', 'Hakan', 'Kaan', 'Mert', 'Onur', 'Serkan', 'Tolga', 'Umut', 'Yusuf', 'Barış', 'Cem'];
export const bizKaleci = 'kaleci';
const rkIdOf = (m: Mac): number => (m.evde ? m.dep : m.ev);
const gucOf = (g: Game, m: Mac, id: number): number => (id === RAKIP_ID ? m.ozel!.rakipGuc : id === MILLI_ID ? m.ozel!.bizGuc : clubOf(g, id).guc);
export const adOf = (g: Game, m: Mac, id: number): string => (id === RAKIP_ID ? m.ozel!.rakipAd : id === MILLI_ID ? m.ozel!.bizAd : kisaAd(g, id));
/* ---------- kurulum ---------- */
export function macBaslat(g: Game, tarz: Tarz = { calis: 1, odak: 'dengeli' }, ozel?: OzelMac & { evde: boolean; kulupId?: number }): Mac {
  const rng = rngOf(g); let ev: number, dep: number, evde: boolean, rol: number;
  if (ozel) { evde = ozel.evde; const biz = ozel.tur === 'milli' ? MILLI_ID : (ozel.kulupId ?? g.kulup); ev = evde ? biz : (ozel.kulupId ?? RAKIP_ID); dep = evde ? (ozel.kulupId ?? RAKIP_ID) : biz; if (ozel.tur === 'kupa') { ev = evde ? g.kulup : RAKIP_ID; dep = evde ? RAKIP_ID : g.kulup; } else { ev = evde ? MILLI_ID : RAKIP_ID; dep = evde ? RAKIP_ID : MILLI_ID; } rol = g.sakatlik ? -1 : ozel.tur === 'milli' ? 1 : rolOf(g); }
  else { const fx = haftaFiksturum(g); ev = fx.ev; dep = fx.dep; evde = fx.evde; rol = g.sakatlik ? -1 : rolOf(g); }
  const gs = ozel ? ozel.rakipGuc : clubOf(g, evde ? dep : ev).guc, bizg = ozel ? ozel.bizGuc : clubOf(g).guc; const tk = rng.weighted<RakipTaktik>([['pres', 1 + Math.max(0, gs - bizg) * 4], ['derin', 1 + Math.max(0, bizg - gs) * 4], ['kontra', 1.2], ['dengeli', 1.4]]); rngKaydet(g, rng);
  const o: Mac = { ev, dep, evde, dk: 0, skor: [0, 0], tarz: { ...tarz }, enerji: g.enerji, olaylar: [], ist: bosIst(), poz: null, bitti: false, rng: (g.rng ^ 0x9e3779b9) >>> 0, sakat: false, cikti: false, bizSut: [0, 0], bizIsabet: [0, 0], korner: [0, 0], faul: [0, 0], topSahip: [0, 0], yorgunluk: g.yorgunluk, ozel: ozel ?? null, rakipTaktik: tk, ilkYari: true, bizKirmizi: false, hucumZinciri: 0, beklenen: null, rolu: rol, golculer: [] };
  o.olaylar.push({ dk: 0, tur: 'bilgi', metin: `Maç başladı! ${adOf(g, o, ev)} – ${adOf(g, o, dep)}`, onemli: true }); return o;
}
const bosIst = (): Ist => ({ dakika: 0, gol: 0, asist: 0, sut: 0, isabet: 0, pas: 0, basariliPas: 0, topKaybi: 0, dripling: 0, driplingBasari: 0, mucadele: 0, mucadeleKazanilan: 0, kurtaris: 0, sari: 0, kirmizi: 0, anahtarPas: 0, puanEk: 0 });
export const macTarz = (m: Mac, t: Partial<Tarz>): void => { m.tarz = { ...m.tarz, ...t }; };
const bizTarafi = (m: Mac): 0 | 1 => (m.evde ? 0 : 1);
const ben = (g: Game, id: YetenekId): number => g.oyuncu.yet[id];
const ADET = (rng: Rng): string => rng.pick(AD) + ' ' + rng.pick(['Y.', 'K.', 'D.', 'A.', 'Ş.', 'T.']);
/* ---------- anlatım metinleri (çok çeşitli) ---------- */
const M = {
  atakBiz: ['{k} hücuma çıkıyor.', '{k} rakip yarı sahada baskı kuruyor.', '{k} hızlı bir geçişle ceza sahasına yaklaşıyor.', 'Sol kanattan bir atak başlıyor: {k}.', '{k} sabırlı bir top çevirmeyle rakibi arıyor.', 'Orta sahadan öne açılan top! {k} tehlikeli.', '{k} önde baskıyla topu kazandı.'],
  atakRakip: ['{k} hücuma çıkıyor.', '{k} sağ kanattan ceza sahasına sarkıyor.', '{k} kontrataağa çıktı!', '{k} uzun toplarla savunmayı arıyor.', '{k} topu orta sahada çevirip hızlandı.'],
  savunma: ['Savunma topu uzaklaştırdı.', 'Stoper araya girip tehlikeyi önledi.', 'Kaleci çıkıp topu kaptı.', 'Savunma hattı iyi diziliyor, atak sönüyor.', 'Pas arasına girildi, atak bitti.'],
  sutBiz: ['{ad} şutunu çekti!', '{ad} uzaktan denedi!', '{ad} vuruşunu yaptı!', 'Ceza sahası dışından sert bir şut: {ad}!'],
  kurtBiz: ['Kaleci son anda kurtardı!', 'Kaleciden müthiş bir refleks!', 'Kaleci köşeden çıkardı!', 'Kaleci iki yumrukla uzaklaştırdı.'],
  disari: ['Top auta gitti.', 'Biraz üstünden dışarı.', 'Direğin yanından dışarı!', 'Şut kalenin yanından geçti.'],
  direk: ['DİREK! Top direkten döndü!', 'Üst direkten geri geldi!', 'Top direğe çarptı, inanılmaz!'],
  gol: ['GOOOL! {ad} ağları buldu!', 'GOL! {ad}, kaleciyi çaresiz bıraktı!', 'GOOOL! Muhteşem bitiriş: {ad}!', 'Ağlar havalandı! {ad}!'],
  faul: ['Sert bir müdahale, hakem düdüğü çaldı.', 'Faul! Hakem oyunu durdurdu.', 'Arkadan yapılan müdahale faul.', 'Rakip oyuncuya itme, hakem faul verdi.'],
  korner: ['Korner! Savunmadan çıkan top kenara gitti.', 'Top çizgiden çıktı: korner.', 'Kaleci topu köşeye çeldi: korner.'],
  ofsayt: ['Bayrak havada: ofsayt!', 'Atak ofsaytla kesildi.', 'Yardımcı hakem bayrağı kaldırdı: ofsayt.'],
  gecis: ['Orta sahada top kaybı.', 'Pas hatası, top rakipte.', 'Top kaybı, rakip hızlı çıkıyor.']
};
const f = (arr: string[], rng: Rng, v: Record<string, string> = {}): string => { let s = rng.pick(arr); for (const [k, x] of Object.entries(v)) s = s.split(`{${k}}`).join(x); return s; };
function olayEkle(m: Mac, tur: OlayTur, metin: string, biz?: boolean, onemli?: boolean): void { m.olaylar.unshift({ dk: m.dk, tur, metin, biz, onemli }); if (m.olaylar.length > 200) m.olaylar.length = 200; }
/* ---------- ilerleme ---------- */
const takimGucu = (g: Game, m: Mac, biz: boolean): number => { const id = biz ? (m.ozel?.tur === 'milli' ? MILLI_ID : g.kulup) : rkIdOf(m); let q = gucOf(g, m, id); if (biz) { q += (genel(g) - (q * 85 + 5)) / 600; if (m.bizKirmizi) q -= 0.06; } return q; };
/** Tek dakika ilerletir (arayüz animasyonu için). Pozisyon çıkarsa durur. */
export function macDakika(g: Game, m: Mac): 'devam' | 'bekle' | 'bitti' { if (m.bitti) return 'bitti'; if (m.poz) return 'bekle'; const rng = new Rng(m.rng); adim(g, m, rng); m.rng = rng.s; return m.bitti ? 'bitti' : m.poz ? 'bekle' : 'devam'; }
export function macIlerle(g: Game, m: Mac): 'bekle' | 'bitti' {
  if (m.bitti) return 'bitti'; if (m.poz) return 'bekle'; const rng = new Rng(m.rng);
  while (!m.poz && !m.bitti) { adim(g, m, rng); }
  m.rng = rng.s; return m.bitti ? 'bitti' : 'bekle';
}
function adim(g: Game, m: Mac, rng: Rng): void {
  m.dk++; const bz = bizTarafi(m), rk = (1 - bz) as 0 | 1, bizGuc = takimGucu(g, m, true), rkGuc = takimGucu(g, m, false), grup = POZ_GRUP(g.oyuncu.poz);
  const oynuyor = !m.cikti && m.rolu >= 0 && (m.rolu >= 1 || m.dk >= 60);
  if (m.dk === 45 && m.ilkYari) { m.ilkYari = false; olayEkle(m, 'devre', `Devre arası: ${adOf(g, m, m.ev)} ${m.skor[0]}-${m.skor[1]} ${adOf(g, m, m.dep)}`, undefined, true); }
  if (m.dk > 90) { m.bitti = true; olayEkle(m, 'sonuc', `Maç sona erdi: ${adOf(g, m, m.ev)} ${m.skor[0]}-${m.skor[1]} ${adOf(g, m, m.dep)}`, undefined, true); return; }
  // enerji ve süre
  if (oynuyor) { m.ist.dakika++; const hiz = [0.17, 0.26, 0.38][m.tarz.calis]! * (1.2 - ben(g, 'dayaniklilik') / 220); m.enerji = clamp(m.enerji - hiz, 0, 100); m.yorgunluk = clamp(m.yorgunluk + hiz * 0.35, 0, 100); if (m.enerji < 8 && m.dk < 85) { m.cikti = true; olayEkle(m, 'bilgi', `${g.ad} yorgunluktan oyundan çıktı.`, true); } }
  // sahip olunan top oranı
  const gucOran = bizGuc / (bizGuc + rkGuc) + (m.tarz.odak === 'hucum' ? 0.04 : m.tarz.odak === 'savunma' ? -0.05 : 0) + (m.evde ? 0.015 : 0) + (m.tarz.calis - 1) * 0.02 - (m.bizKirmizi ? 0.08 : 0);
  m.topSahip[0]++; if (rng.chance(clamp(gucOran, 0.25, 0.75))) m.topSahip[1]++;
  const bizTop = rng.chance(clamp(gucOran, 0.25, 0.75));
  // sakatlık (oyuncu sahadaysa)
  if (oynuyor && rng.chance(0.0006 * (1 + m.yorgunluk / 40) * [0.7, 1, 1.4][m.tarz.calis]!)) { m.sakat = true; m.cikti = true; olayEkle(m, 'sakat', `${g.ad} yerde kaldı! Sakatlık nedeniyle oyundan çıkıyor.`, true, true); return; }
  // diğer olaylar
  const r = rng.next();
  if (r < 0.045) { faul(g, m, rng, rk, bz, oynuyor, grup); return; }
  if (r < 0.058) { const t = bizTop ? bz : rk; olayEkle(m, 'ofsayt', f(M.ofsayt, rng), t === bz); return; }
  // hücum üretimi
  const pAtak = clamp((bizTop ? 0.30 : 0.22) * (bizTop ? bizGuc / 0.55 : rkGuc / 0.55) * (bizTop ? (m.tarz.odak === 'hucum' ? 1.25 : m.tarz.odak === 'savunma' ? 0.8 : 1) * (m.rakipTaktik === 'derin' ? 0.85 : m.rakipTaktik === 'pres' ? 0.95 : 1) : (m.tarz.odak === 'savunma' ? 0.8 : m.tarz.odak === 'hucum' ? 1.15 : 1) * (m.rakipTaktik === 'kontra' && m.tarz.odak === 'hucum' ? 1.25 : m.rakipTaktik === 'pres' ? 1.08 : m.rakipTaktik === 'derin' ? 0.8 : 1)), 0.05, 0.6);
  if (!rng.chance(pAtak)) { if (rng.chance(0.06)) olayEkle(m, 'bilgi', f(M.gecis, rng), !bizTop); return; }
  if (bizTop) bizAtak(g, m, rng, oynuyor, grup, bizGuc, rkGuc); else rakipAtak(g, m, rng, oynuyor, grup, bizGuc, rkGuc);
}
function faul(g: Game, m: Mac, rng: Rng, rk: 0 | 1, bz: 0 | 1, oynuyor: boolean, grup: string): void {
  const bizYaptı = rng.chance(m.tarz.odak === 'savunma' ? 0.42 : 0.5 + (m.tarz.calis - 1) * 0.04); const takim = bizYaptı ? bz : rk; m.faul[takim]++; olayEkle(m, 'faul', f(M.faul, rng), bizYaptı);
  // oyuncunun faulü mü?
  const pO = oynuyor && bizYaptı ? (grup === 'defans' ? 0.28 : grup === 'orta' ? 0.2 : 0.1) * (1 + (m.tarz.calis - 1) * 0.35) : 0;
  if (pO && rng.chance(pO)) { olayEkle(m, 'faul', `${g.ad} faul yaptı.`, true); const kart = rng.chance(0.22 + m.ist.sari * 0.5); if (kart) { if (m.ist.sari >= 1 || rng.chance(0.03)) { m.ist.kirmizi++; m.cikti = true; m.bizKirmizi = true; olayEkle(m, 'kart', `🟥 KIRMIZI KART! ${g.ad} oyundan atıldı!`, true, true); return; } m.ist.sari++; olayEkle(m, 'kart', `🟨 Sarı kart: ${g.ad}.`, true, true); } }
  else if (rng.chance(0.14)) { m.ist.sari += 0; olayEkle(m, 'kart', `🟨 Sarı kart: ${bizYaptı ? (m.ozel?.tur === 'milli' ? m.ozel.bizAd : kisaAd(g, g.kulup)) : 'rakip'} oyuncusu.`, bizYaptı); }
  // kazanılan serbest vuruş: rakip yarıda ve bizim lehimize
  if (!bizYaptı && rng.chance(0.34)) { olayEkle(m, 'serbest', 'Rakip ceza sahası yakınında serbest vuruş kazanıldı!', true); if (oynuyor && rng.chance(0.45 + ben(g, 'serbest') / 250)) pozisyonKur(g, m, rng, 'serbest', 0.1, 22 + rng.range(0, 6)); else aiSut(g, m, rng, true, 0.045); }
  // penaltı: nadir
  else if (rng.chance(0.045)) { const bizLehine = !bizYaptı; olayEkle(m, 'penalti', bizLehine ? 'PENALTI! Hakem beyaz noktayı gösterdi!' : 'Rakip lehine penaltı verildi!', bizLehine, true); if (bizLehine) { if (oynuyor && ben(g, 'penalti') + g.oyuncu.yet.bitiricilik / 2 >= 40 && rng.chance(0.75)) pozisyonKur(g, m, rng, 'penalti', 0, 11); else penaltiAI(g, m, rng, true); } else penaltiAI(g, m, rng, false); }
}
function penaltiAI(g: Game, m: Mac, rng: Rng, biz: boolean): void { const gol = rng.chance(0.76); if (gol) golYaz(g, m, rng, biz, false); else olayEkle(m, 'kurtaris', 'Penaltı kaçtı! Kaleci kurtardı.', biz, true); }
function bizAtak(g: Game, m: Mac, rng: Rng, oynuyor: boolean, grup: string, bizGuc: number, rkGuc: number): void {
  const k = m.ozel?.tur === 'milli' ? m.ozel.bizAd : kisaAd(g, g.kulup); olayEkle(m, 'atak', f(M.atakBiz, rng, { k }), true);
  // oyuncunun katılım olasılığı: mevki ve odağa göre
  const katilim = (grup === 'hucum' ? 0.5 : grup === 'orta' ? 0.42 : grup === 'defans' ? 0.2 : 0.04) * (m.tarz.odak === 'hucum' ? 1.25 : m.tarz.odak === 'savunma' ? 0.85 : 1) * [0.9, 1, 1.12][m.tarz.calis]! * (m.enerji < 30 ? 0.75 : 1);
  if (oynuyor && grup !== 'kaleci' && rng.chance(katilim)) { const t = bulTip(g, m, rng, grup); pozisyonKur(g, m, rng, t, 0.3 + rng.range(0, 0.35) - bizGuc / 4 + rkGuc / 4, t === 'sut' ? rng.range(10, 24) : 20); return; }
  if (rng.chance(0.62)) aiSut(g, m, rng, true, 0.06 + (bizGuc - rkGuc) * 0.1); else olayEkle(m, 'bilgi', f(M.savunma, rng), false);
}
function bulTip(g: Game, m: Mac, rng: Rng, grup: string): PozTip { const w: Array<[PozTip, number]> = grup === 'hucum' ? [['sut', 4], ['pas', 2.4], ['dribling', 2.6], ['kafa', 1.2]] : grup === 'orta' ? [['pas', 5], ['sut', 1.6], ['dribling', 2], ['kafa', 0.5]] : [['pas', 5], ['dribling', 1.2], ['sut', 0.5], ['kafa', 0.8]]; return rng.weighted(w); }
function rakipAtak(g: Game, m: Mac, rng: Rng, oynuyor: boolean, grup: string, bizGuc: number, rkGuc: number): void {
  const k = adOf(g, m, rkIdOf(m)); olayEkle(m, 'atak', f(M.atakRakip, rng, { k }), false);
  const sansKaleci = grup === 'kaleci' && oynuyor && rng.chance(0.55), sansSavunma = (grup === 'defans' || grup === 'orta') && oynuyor && rng.chance((grup === 'defans' ? 0.5 : 0.28) * (m.tarz.odak === 'savunma' ? 1.3 : 1) * [0.9, 1, 1.12][m.tarz.calis]!);
  if (sansKaleci) { pozisyonKur(g, m, rng, 'kurtaris', 0.4, rng.range(6, 20)); return; }
  if (sansSavunma) { pozisyonKur(g, m, rng, 'mudahale', 0.5, 25); return; }
  if (rng.chance(0.5)) aiSut(g, m, rng, false, 0.07 + (rkGuc - bizGuc) * 0.1); else olayEkle(m, 'bilgi', f(M.savunma, rng), true);
}
/** Oyuncunun dahil olmadığı pozisyon: yapay zekâ şutu */
function aiSut(g: Game, m: Mac, rng: Rng, biz: boolean, pGol: number): void {
  const ad = ADET(rng), bz = bizTarafi(m), t = biz ? bz : ((1 - bz) as 0 | 1); m.bizSut[t]++; olayEkle(m, 'sut', f(M.sutBiz, rng, { ad }), biz);
  const r = rng.next(), kaleciK = biz ? gucOf(g, m, rkIdOf(m)) : (m.ozel?.tur === 'milli' ? m.ozel.bizGuc : clubOf(g).guc); const p = clamp(pGol - (kaleciK - 0.5) * 0.04, 0.02, 0.4);
  if (r < p) { golYaz(g, m, rng, biz, false, ad); return; }
  if (r < p + 0.34) { m.bizIsabet[t]++; olayEkle(m, 'kurtaris', f(M.kurtBiz, rng), !biz); if (rng.chance(0.3)) { m.korner[t]++; olayEkle(m, 'korner', f(M.korner, rng), biz); } return; }
  if (r < p + 0.4) { olayEkle(m, 'sut', f(M.direk, rng), biz, true); return; }
  olayEkle(m, 'sut', f(M.disari, rng), biz);
}
function golYaz(g: Game, m: Mac, rng: Rng, biz: boolean, benim: boolean, ad?: string): void {
  const bz = bizTarafi(m), t = biz ? bz : ((1 - bz) as 0 | 1); m.skor[t]++; m.bizSut[t] += 0; m.bizIsabet[t]++; const ka = benim ? g.ad : (ad ?? ADET(rng)); m.golculer.push({ dk: m.dk, biz, ad: ka });
  olayEkle(m, 'gol', f(M.gol, rng, { ad: ka }) + ` (${m.skor[0]}-${m.skor[1]})`, biz, true);
}
/* ---------- oyuncu pozisyonları ---------- */
function pozisyonKur(g: Game, m: Mac, rng: Rng, tip: PozTip, baski: number, mesafe: number): void {
  const kaleci = clamp(gucOf(g, m, rkIdOf(m)) + rng.range(-0.05, 0.05), 0.2, 0.99), hedefler: Hedef[] = [];
  if (tip === 'pas' || tip === 'sut' || tip === 'kafa') for (let i = 0; i < 3; i++) { const tur = (['kisa', 'uzun', 'ara'] as const)[i]!, md = tur === 'kisa' ? rng.range(6, 14) : tur === 'uzun' ? rng.range(28, 45) : rng.range(14, 24); hedefler.push({ id: i, ad: ADET(rng), mesafe: +md.toFixed(1), aciklik: +clamp(rng.range(0.2, 0.9), 0, 1).toFixed(2), risk: +clamp((tur === 'kisa' ? 0.05 : tur === 'uzun' ? 0.28 : 0.2) + baski * 0.2 - 0, 0.02, 0.6).toFixed(2), tur }); }
  const ipucu = { sut: 'Şut pozisyonu! Hedefi seç, sürükle, bırak.', kafa: 'Orta geliyor: kafayı doğru anda vur!', pas: 'Takım arkadaşlarından birine pas ver.', dribling: 'Rakip önünde: nasıl geçeceksin?', serbest: 'Serbest vuruş! Barajı aşıp köşeyi bul.', penalti: 'Penaltı! Kaleciyi yanılt.', kurtaris: 'Şut geliyor! Hangi köşeye atlayacaksın?', mudahale: 'Rakip hücumda: nasıl müdahale edeceksin?' }[tip];
  const taraftarEtkisi = m.evde && !m.ozel ? (g.iliski.taraftar < 25 ? 0.08 : g.iliski.taraftar > 75 ? -0.05 : 0) : 0; m.poz = { tip, dk: m.dk, baski: +clamp(baski + taraftarEtkisi + (m.rakipTaktik === 'pres' ? 0.08 : m.rakipTaktik === 'derin' ? 0.04 : 0), 0.05, 0.95).toFixed(2), mesafe: +mesafe.toFixed(1), kaleci: +kaleci.toFixed(2), rakip: rng.int(1, 3), hedefler, ipucu, sut: { yon: rng.pick([-1, 0, 1]) } };
  m.beklenen = { tip };
}
/** Başarı gürültüsü: yetenek, yorgunluk ve baskıya göre */
const beceriK = (g: Game, m: Mac, ids: YetenekId[]): number => { const ort = ids.reduce((a, k) => a + g.oyuncu.yet[k] + ekipBonus(g, k), 0) / ids.length; const yor = m.enerji < 30 ? 0.85 + m.enerji / 200 : 1; return clamp(ort / 100, 0.05, 1) * yor * [0.92, 1, 1.04][m.tarz.calis]! * mutCarpan(g); };
export interface Sonuc { tur: 'gol' | 'kurtaris' | 'direk' | 'disari' | 'blok' | 'basari' | 'basarisiz' | 'faul' | 'korner'; metin: string }
export function macAksiyon(g: Game, m: Mac, a: Aksiyon): Sonuc | null {
  const poz = m.poz; if (!poz) return null; const rng = new Rng(m.rng); let s: Sonuc;
  if (a.tip === 'sut' && (poz.tip === 'sut' || poz.tip === 'kafa' || poz.tip === 'serbest' || poz.tip === 'penalti')) s = sutCoz(g, m, rng, poz, a);
  else if (a.tip === 'pas' && poz.tip === 'pas') s = pasCoz(g, m, rng, poz, a);
  else if (a.tip === 'dribling' && poz.tip === 'dribling') s = driblingCoz(g, m, rng, poz, a);
  else if (a.tip === 'mudahale' && poz.tip === 'mudahale') s = mudahaleCoz(g, m, rng, poz, a);
  else if (a.tip === 'kurtaris' && poz.tip === 'kurtaris') s = kurtarisCoz(g, m, rng, poz, a);
  else { s = zamanAsimi(g, m, rng, poz); }
  m.poz = null; m.beklenen = null; m.rng = rng.s; return s;
}
function zamanAsimi(g: Game, m: Mac, rng: Rng, poz: Pozisyon): Sonuc { olayEkle(m, 'bilgi', `${g.ad} karar veremedi, fırsat kaçtı.`, true); if (poz.tip === 'sut' || poz.tip === 'pas' || poz.tip === 'dribling' || poz.tip === 'kafa') { m.ist.topKaybi++; m.ist.puanEk -= 0.15; } return { tur: 'basarisiz', metin: 'Karar veremedin.' }; }
function sutCoz(g: Game, m: Mac, rng: Rng, poz: Pozisyon, a: Extract<Aksiyon, { tip: 'sut' }>): Sonuc {
  const kafa = a.tur === 'kafa' || poz.tip === 'kafa', ids: YetenekId[] = kafa ? ['kafa', 'guc'] : poz.tip === 'penalti' ? ['penalti', 'bitiricilik'] : poz.tip === 'serbest' ? ['serbest', 'sut', 'teknik'] : ['sut', 'bitiricilik'];
  const b = beceriK(g, m, ids), guc = clamp(a.tur === 'sert' ? Math.max(a.guc, 0.85) : a.tur === 'plase' ? Math.min(a.guc, 0.55) : a.guc, 0.05, 1), mesF = clamp(poz.mesafe / 22, 0.3, 1.6), bz = poz.baski;
  let ns = (1.05 - b) * (0.20 + 0.45 * bz + 0.4 * Math.max(0, guc - 0.7) + 0.2 * Math.abs(a.falso)) * (0.6 + mesF * 0.5) * (a.tur === 'plase' ? 0.65 : a.tur === 'sert' ? 1.25 : 1) * (poz.tip === 'penalti' ? 0.7 : 1);
  let x = a.x + a.falso * 0.18 + rng.gauss() * ns, y = a.y + rng.gauss() * ns * 0.8;
  m.ist.sut++; m.bizSut[bizTarafi(m)]++; olayEkle(m, 'sut', `${g.ad} ${poz.tip === 'serbest' ? 'serbest vuruşu kullandı' : poz.tip === 'penalti' ? 'penaltıyı kullandı' : kafa ? 'kafayla vurdu' : 'şutunu çekti'}!`, true);
  if (poz.tip === 'sut' && a.tur !== 'kafa' && rng.chance(poz.baski * 0.28 * (a.tur === 'asirtma' ? 0.1 : 1))) { olayEkle(m, 'sut', 'Şut savunmaya takıldı, blok!', true); if (rng.chance(0.3)) { m.korner[bizTarafi(m)]++; olayEkle(m, 'korner', f(M.korner, rng), true); } return { tur: 'blok', metin: 'Blok!' }; }
  if (poz.tip === 'serbest' && Math.abs(x) < 0.45 && y < 0.4 && rng.chance(0.85)) { olayEkle(m, 'sut', 'Top barajda kaldı.', true); return { tur: 'blok', metin: 'Baraj!' }; }
  if (a.tur === 'asirtma') { const ok = rng.chance(clamp(0.25 + beceriK(g, m, ['teknik', 'sut']) * 0.55 - poz.baski * 0.3 + (poz.kaleci < 0.5 ? 0.08 : 0), 0.05, 0.8)); if (!ok) { olayEkle(m, 'sut', 'Aşırtma denedi ama kaleci topu aldı.', true); m.ist.puanEk -= 0.05; m.bizIsabet[bizTarafi(m)]++; m.ist.isabet++; return { tur: 'kurtaris', metin: 'Kaleci aldı' }; } x = rng.range(-0.5, 0.5); y = 0.55; guc && 0; }
  if (Math.abs(x) > 1.07 || y > 1.07 || y < -0.05) { olayEkle(m, 'sut', f(M.disari, rng), true); m.ist.puanEk -= 0.05; return { tur: 'disari', metin: 'Dışarı' }; }
  if (Math.abs(x) > 1 || y > 1) { olayEkle(m, 'sut', f(M.direk, rng), true, true); m.ist.isabet++; m.bizIsabet[bizTarafi(m)]++; m.ist.puanEk += 0.1; return { tur: 'direk', metin: 'Direk!' }; }
  m.ist.isabet++; m.bizIsabet[bizTarafi(m)]++;
  let pSave = clamp(0.84 + 0.38 * poz.kaleci - 0.34 * guc - 0.32 * Math.abs(x) - 0.22 * Math.max(0, y) + 0.1 * (poz.sut?.yon === Math.sign(x) && Math.abs(x) > 0.3 ? 1 : 0) - (poz.mesafe < 8 ? 0.16 : 0) + (a.tur === 'plase' ? -0.02 : 0), 0.04, 0.93);
  pSave = clamp(pSave - (b - 0.5) * 0.35, 0.04, 0.95); pSave = 1 - (1 - pSave) * 0.6;
  if (poz.tip === 'penalti') pSave = clamp(0.2 + 0.22 * poz.kaleci - 0.3 * Math.abs(x) + (poz.sut?.yon === Math.sign(x) ? 0.25 : 0) - 0.15 * Math.max(0, y - 0.3) , 0.05, 0.7);
  if (rng.chance(pSave)) { olayEkle(m, 'kurtaris', f(M.kurtBiz, rng), false, true); m.ist.puanEk += 0.1; if (rng.chance(0.3)) { m.korner[bizTarafi(m)]++; olayEkle(m, 'korner', f(M.korner, rng), true); } return { tur: 'kurtaris', metin: 'Kaleci kurtardı' }; }
  golYaz(g, m, rng, true, true); m.ist.gol++; m.ist.puanEk += 0.95; if (m.hucumZinciri > 0) { m.ist.asist += 0; } m.hucumZinciri = 0; return { tur: 'gol', metin: 'GOL!' };
}
function pasCoz(g: Game, m: Mac, rng: Rng, poz: Pozisyon, a: Extract<Aksiyon, { tip: 'pas' }>): Sonuc {
  const h = poz.hedefler.find((x) => x.id === a.hedef) ?? poz.hedefler[0]!, b = beceriK(g, m, ['pas', 'gorus', 'teknik']); m.ist.pas++;
  const taban = h.tur === 'kisa' ? 0.82 : h.tur === 'uzun' ? 0.5 : 0.58, p = clamp(taban + b * 0.28 - h.risk * 0.7 - poz.baski * 0.25 + h.aciklik * 0.12 - h.mesafe / 400 + (g.iliski.takim - 50) / 600, 0.06, 0.95);
  if (rng.chance(p)) { m.ist.basariliPas++; const anahtar = h.tur === 'ara' || h.tur === 'uzun'; olayEkle(m, 'pas', `${g.ad}: ${h.tur === 'ara' ? 'Harika bir ara pas' : h.tur === 'uzun' ? 'İsabetli uzun top' : 'Temiz pas'} → ${h.ad}.`, true); m.ist.puanEk += anahtar ? 0.15 : 0.04; if (anahtar) m.ist.anahtarPas++;
    // pas sonrası tehlike: ara/uzun pasta şut ihtimali
    const pSut = clamp(0.2 + (h.tur === 'ara' ? 0.3 : h.tur === 'uzun' ? 0.12 : 0.05) + b * 0.12, 0.1, 0.7); if (rng.chance(pSut)) { const bz = bizTarafi(m); m.bizSut[bz]++; olayEkle(m, 'sut', `${h.ad} şutunu çekti!`, true); const gol = rng.chance(clamp(0.2 + (h.tur === 'ara' ? 0.12 : 0) - (gucOf(g, m, rkIdOf(m)) - 0.5) * 0.15, 0.08, 0.5)); if (gol) { golYaz(g, m, rng, true, false, h.ad); m.ist.asist++; m.ist.puanEk += 0.6; return { tur: 'gol', metin: 'Asist! Gol!' }; } m.bizIsabet[bz]++; olayEkle(m, 'kurtaris', f(M.kurtBiz, rng), false); return { tur: 'basari', metin: 'Pas başarılı, şut kurtarıldı' }; }
    return { tur: 'basari', metin: 'Pas başarılı' }; }
  m.ist.topKaybi++; m.ist.puanEk -= 0.1; olayEkle(m, 'pas', `${g.ad}'ın pası ${h.tur === 'uzun' ? 'fazla uzun kaldı' : 'kesildi'}! Top rakipte.`, true); if (rng.chance(0.2)) { rakipKontra(g, m, rng); } return { tur: 'basarisiz', metin: 'Pas kesildi' };
}
function rakipKontra(g: Game, m: Mac, rng: Rng): void { olayEkle(m, 'atak', 'Rakip kontrataağa çıktı!', false); aiSut(g, m, rng, false, 0.08); }
function driblingCoz(g: Game, m: Mac, rng: Rng, poz: Pozisyon, a: Extract<Aksiyon, { tip: 'dribling' }>): Sonuc {
  m.ist.dripling++; const b = a.tur === 'hizlan' ? beceriK(g, m, ['surat', 'dribbling']) : a.tur === 'yon' ? beceriK(g, m, ['teknik', 'dribbling']) : beceriK(g, m, ['dribbling', 'topKontrol']), p = clamp(0.28 + b * 0.5 - poz.baski * 0.34 - (poz.rakip - 1) * 0.06 + (a.tur === 'hizlan' && g.oyuncu.yet.surat > 60 ? 0.05 : 0), 0.08, 0.9);
  if (rng.chance(p)) { m.ist.driplingBasari++; m.ist.puanEk += 0.12; olayEkle(m, 'dripling', `${g.ad} rakibini ${a.tur === 'hizlan' ? 'hızıyla geçti' : a.tur === 'yon' ? 'yön değiştirerek geçti' : 'çalımla geçti'}!`, true); if (rng.chance(0.4 + b * 0.2)) { const sonra = new Rng(rng.s ^ 0x55); const bz = bizTarafi(m); void sonra; m.poz = null; pozisyonKur(g, m, rng, 'sut', Math.max(0.1, poz.baski - 0.1), rng.range(10, 20)); m.ist.puanEk += 0; return { tur: 'basari', metin: 'Geçti! Şut pozisyonu doğdu' }; void bz; } return { tur: 'basari', metin: 'Geçti' }; }
  m.ist.topKaybi++; m.ist.puanEk -= 0.12; const faulKazan = rng.chance(0.2); if (faulKazan) { olayEkle(m, 'faul', `${g.ad}'a faul yapıldı, serbest vuruş!`, true); return { tur: 'faul', metin: 'Faul kazandın' }; } olayEkle(m, 'dripling', `${g.ad} topu kaptırdı.`, true); if (rng.chance(0.18)) rakipKontra(g, m, rng); return { tur: 'basarisiz', metin: 'Top kayıp' };
}
function mudahaleCoz(g: Game, m: Mac, rng: Rng, poz: Pozisyon, a: Extract<Aksiyon, { tip: 'mudahale' }>): Sonuc {
  m.ist.mucadele++; const b = beceriK(g, m, a.tur === 'pozisyon' ? ['savunma', 'gorus'] : ['savunma', 'guc']), risk = a.tur === 'kapis' ? 0.3 : a.tur === 'pres' ? 0.18 : 0.06, p = clamp(0.3 + b * 0.5 + (a.tur === 'pozisyon' ? 0.06 : 0) - poz.baski * 0.3, 0.08, 0.9);
  if (rng.chance(p)) { m.ist.mucadeleKazanilan++; m.ist.puanEk += 0.12; olayEkle(m, 'mudahale', `${g.ad} ${a.tur === 'kapis' ? 'mükemmel bir kayarak müdahaleyle' : a.tur === 'pres' ? 'baskıyla' : 'doğru pozisyon alarak'} topu kazandı!`, true); if (rng.chance(0.35)) { olayEkle(m, 'atak', 'Hızlı geçiş! Top öne gönderildi.', true); aiSut(g, m, rng, true, 0.08); } return { tur: 'basari', metin: 'Top kazanıldı' }; }
  if (rng.chance(risk)) { m.faul[bizTarafi(m)]++; olayEkle(m, 'faul', `${g.ad} geç kaldı: faul!`, true); m.ist.puanEk -= 0.1; const k = rng.chance(0.25 + m.ist.sari * 0.4); if (k) { if (m.ist.sari >= 1) { m.ist.kirmizi++; m.cikti = true; m.bizKirmizi = true; olayEkle(m, 'kart', `🟥 İKİNCİ SARIDAN KIRMIZI! ${g.ad} oyundan atıldı!`, true, true); } else { m.ist.sari++; olayEkle(m, 'kart', `🟨 Sarı kart: ${g.ad}.`, true, true); } } if (rng.chance(0.28)) { olayEkle(m, 'penalti', 'Ceza sahasında faul: PENALTI!', false, true); penaltiAI(g, m, rng, false); } else aiSut(g, m, rng, false, 0.06); return { tur: 'faul', metin: 'Faul' }; }
  m.ist.puanEk -= 0.15; olayEkle(m, 'mudahale', `${g.ad} müdahalede geç kaldı, rakip geçti!`, true); aiSut(g, m, rng, false, 0.12); return { tur: 'basarisiz', metin: 'Rakip geçti' };
}
function kurtarisCoz(g: Game, m: Mac, rng: Rng, poz: Pozisyon, a: Extract<Aksiyon, { tip: 'kurtaris' }>): Sonuc {
  m.ist.mucadele++; const b = beceriK(g, m, ['savunma', 'gorus', 'guc']), yonDogru = a.yon === (poz.sut?.yon ?? 0), zam = 1 - Math.abs(a.zaman - 0.5) * 1.6, p = clamp((yonDogru ? 0.55 : 0.1) + b * 0.28 + zam * 0.12 - poz.baski * 0.1 - (poz.mesafe < 10 ? 0.12 : 0), 0.03, 0.92);
  const bz = bizTarafi(m), t = (1 - bz) as 0 | 1; m.bizSut[t]++; m.bizIsabet[t]++;
  if (rng.chance(p)) { m.ist.kurtaris++; m.ist.mucadeleKazanilan++; m.ist.puanEk += 0.45; olayEkle(m, 'kurtaris', `${g.ad} muhteşem bir kurtarış yaptı!`, true, true); return { tur: 'kurtaris', metin: 'Kurtardın!' }; }
  golYaz(g, m, rng, false, false); m.ist.puanEk -= 0.3; return { tur: 'gol', metin: 'Gol yedin' };
}
/* ---------- bot (otomatik oynama ve testler) ---------- */
export function botAksiyon(g: Game, m: Mac, rng: Rng = new Rng(m.rng ^ 0xabc)): Aksiyon {
  const p = m.poz!;
  if (p.tip === 'sut' || p.tip === 'kafa') return { tip: 'sut', tur: p.tip === 'kafa' ? 'kafa' : 'normal', x: rng.pick([-1, 1]) * rng.range(0.25, 0.65), y: rng.range(0.1, 0.6), guc: 0.65, falso: 0 };
  if (p.tip === 'serbest') return { tip: 'sut', tur: 'plase', x: rng.pick([-0.75, 0.75]), y: 0.65, guc: 0.6, falso: rng.pick([-0.5, 0.5]) };
  if (p.tip === 'penalti') return { tip: 'sut', tur: 'plase', x: rng.pick([-0.8, 0.8]), y: 0.15, guc: 0.6, falso: 0 };
  if (p.tip === 'pas') { const h = p.hedefler.slice().sort((a, b) => (b.aciklik - b.risk) - (a.aciklik - a.risk))[0]!; return { tip: 'pas', hedef: h.id, tur: h.tur }; }
  if (p.tip === 'dribling') return { tip: 'dribling', tur: rng.pick(['dripling', 'hizlan', 'yon'] as const) };
  if (p.tip === 'mudahale') return { tip: 'mudahale', tur: 'pozisyon' };
  return { tip: 'kurtaris', yon: rng.pick([-1, 0, 1] as const), zaman: 0.5 };
}
export function macOtomatik(g: Game, m: Mac): void { let guvenlik = 0; while (!m.bitti && guvenlik++ < 400) { const s = macIlerle(g, m); if (s === 'bitti') break; if (m.poz) macAksiyon(g, m, botAksiyon(g, m)); } }
/* ---------- özet ---------- */
export function macPuani(g: Game, m: Mac): number { const i = m.ist; if (i.dakika === 0) return 0; const bizGol = m.evde ? m.skor[0] : m.skor[1], rkGol = m.evde ? m.skor[1] : m.skor[0], grup = POZ_GRUP(g.oyuncu.poz); let p = 6.0 + i.puanEk; p += bizGol > rkGol ? 0.4 : bizGol < rkGol ? -0.4 : 0; if (grup === 'defans' || grup === 'kaleci') p += (rkGol === 0 ? 0.5 : -0.2 * rkGol); p += (i.basariliPas / Math.max(1, i.pas) - 0.7) * 0.6; p -= i.sari * 0.3 + i.kirmizi * 1.3; return +clamp(p, 3, 10).toFixed(1); }
export function macOzeti(g: Game, m: Mac): MacOzet & { ek: MacEk } {
  const i = m.ist, bz = bizTarafi(m), rk = 1 - bz, fx = { ev: m.ev, dep: m.dep }, puan = macPuani(g, m);
  return { sezon: g.sezon, hafta: g.hafta, ev: fx.ev, dep: fx.dep, gev: m.skor[0], gdep: m.skor[1], dakika: i.dakika, gol: i.gol, asist: i.asist, sut: i.sut, isabet: i.isabet, pas: i.pas, basariliPas: i.basariliPas, topKaybi: i.topKaybi, dripling: i.driplingBasari, mucadele: i.mucadeleKazanilan, puan, oynadi: i.dakika > 0, ek: { sari: i.sari, kirmizi: i.kirmizi, kurtaris: i.kurtaris, anahtarPas: i.anahtarPas, driplingDeneme: i.dripling, mucadeleToplam: i.mucadele, sakat: m.sakat, takimSut: [m.bizSut[bz]!, m.bizSut[rk]!], takimIsabet: [m.bizIsabet[bz]!, m.bizIsabet[rk]!], korner: [m.korner[bz]!, m.korner[rk]!], faul: [m.faul[bz]!, m.faul[rk]!], topSahip: m.topSahip[0]! ? Math.round(m.topSahip[1]! / m.topSahip[0]! * 100) : 50, golculer: m.golculer } };
}
export interface MacEk { sari: number; kirmizi: number; kurtaris: number; anahtarPas: number; driplingDeneme: number; mucadeleToplam: number; sakat: boolean; takimSut: [number, number]; takimIsabet: [number, number]; korner: [number, number]; faul: [number, number]; topSahip: number; golculer: Array<{ dk: number; biz: boolean; ad: string }> }
