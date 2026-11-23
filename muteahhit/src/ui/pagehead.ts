import { h } from './dom';
import { EMOJI } from './art';
import type { App } from './app';
import { openGuide, TAB_TOPIC } from './guide';

export type TabId = 'altyapi' | 'makine' | 'gayrimenkul' | 'tedarik' | 'yonetim' | 'sirket' | 'harita' | 'projeler' | 'operasyon' | 'ihale' | 'holding' | 'finans' | 'piyasa';
/** Her sekmenin tek satırlık tanıtımı ve "Ne yapılır?" yardımı. Oyuncu hangi ekranda ne bulacağını hep görsün. */
export const TAB_INFO: Record<TabId, { ico: string; title: string; sub: string; help: string[] }> = {
  altyapi: { ico: '🛣️', title: 'Altyapı ve Taahhüt', sub: 'Yol, köprü, metro, liman gibi kamu işleri: ihale, yürütme ve kabul.', help: ['İhaleler: teklif verirken kazanma ihtimali ve kâr tahmini görünür.', 'Yürüyen işler: ilerleme makine, ekip ve malzemeye bağlı; maliyet aşımı, teknik sorun ve denetim çıkabilir.', 'Kabul: bitince geçici kabul, 180 gün garanti, sonra kesin kabul ve teminat iadesi.'] },
  makine: { ico: '🚜', title: 'Makine Parkı', sub: 'Makinelerin durumu, bakım, ikinci el, kiralama ve operatörler.', help: ['Park: her makinenin saat, durum, yakıt ve bakım bilgisi; bakım yapıp kiraya verebilirsin.', 'İkinci el: ucuz ama yıpranmış makine.', 'Kiralama: uzun dönem operatörlü kiralama ya da kendi makineni başkasına kiraya verme.', 'Operatör: operatör gerektiren makineyi operatörsüz çalıştırırsan o gün kiralanır.'] },
  gayrimenkul: { ico: '🏘️', title: 'Gayrimenkul Yönetimi', sub: 'Portföy, kiracılar, kira teklifleri, bakım ve getiri raporu.', help: ['Satış merkezinde bir daireyi "Kiralık" yaparsan kiracı teklifleri buraya düşer.', 'Kiracının ödeme düzeni, geliri ve sözleşme süresi görünür; depozito alınır.', 'Bakım yatırımı bina durumunu yükseltir; düşük durum arıza ve değer kaybı getirir.', 'Rapor: maliyet, değer, kira, bakım, net getiri ve geri dönüş süresi.'] },
  tedarik: { ico: '🧱', title: 'Satın Alma ve Tedarik', sub: 'Malzeme siparişi, tedarikçi karşılaştırma, sözleşme ve depo.', help: ['Sipariş: malzeme, miktar ve teslimat şehrini seç; tedarikçileri fiyat, kalite, teslim süresi ve güvenilirlikle karşılaştır.', 'Vadeli alımda nakit çıkmaz ama yükümlülük doğar.', 'Depo: kapasite dolarsa yeni sipariş alınmaz; çimento ve boya zamanla bozulur.', 'Sözleşme: fiyatı kilitler, her ay teslimat gelir.'] },
  yonetim: { ico: '🧭', title: 'Yönetim Merkezi', sub: 'Genel müdür, yönetim kurulu, yıllık hedefler ve departmanlar.', help: ['Genel Müdür: işe al; becerisi satış, şantiye ve ihale performansını etkiler.', 'Kurul: her çeyrek toplanır; üyelerin eğilimini görüp karar verirsin.', 'Hedefler: yılda bir belirlenir, yıl sonunda puanlanır.', 'Departmanlar: bütçe, müdür ve personel performansı belirler.'] },
  sirket: { ico: EMOJI.sirket, title: 'Şirket', sub: 'Genel durum: bugün ne yapmalı, paran ve projelerin.', help: ['Üstteki şehir resmine dokununca Genel Merkez açılır.', 'Görevler sana sıradaki adımı söyler; "Şimdi yap" ilgili sekmeye götürür.', 'Net varlık ve nakit yeterlilik, şirketin ne kadar dayanabileceğini gösterir.'] },
  harita: { ico: EMOJI.harita, title: 'Harita', sub: 'Nerede arsa alacağını seç: il, ilçe, fiyat ve gelişim.', help: ['Bir ile dokun, sonra ilçeyi seç; arsaları listeden incele.', 'Renkler seçtiğin ölçüte göre (satış fiyatı, gelir, rekabet, gelişim) değişir.', 'Yeni bir ilde şube açarsan oradaki arsalara ve ihalelere erişirsin.'] },
  projeler: { ico: EMOJI.insaat, title: 'Projeler', sub: 'Arsadan satışa tüm işlerin: tasarım, inşaat, satış.', help: ['Sol sütun projelerin, sağ sütun sahip olduğun arsalar.', '"Şantiyeyi aç" 3B şantiye görünümünü açar; "Satış merkezi" fiyat ve satışları yönetir.', 'Aşama şeridi 17 inşaat aşamasının hangisinde olduğunu gösterir.'] },
  operasyon: { ico: EMOJI.personel, title: 'Operasyon', sub: 'Kim nerede çalışıyor: ekip, malzeme stoğu, makineler, politikalar.', help: ['Ekip: kimin hangi projede olduğunu "Kim nerede" panosunda gör, listeden ata veya işe al/çıkar.', 'Malzeme: stok ve fiyatlar, sipariş ver ya da otomatik satın almayı aç.', 'Makine: satın al, sat; arızalıları ve kullanımdakileri izle.', 'Politika: iş güvenliği ve tedarikçi tercihi.'] },
  ihale: { ico: EMOJI.ihale, title: 'İhale', sub: 'Kamu ve özel işlere teklif ver; kazanırsan sözleşmeli iş olur.', help: ['Açık ihalelerden birine dokun, teklif fiyatını seç.', 'Teklif düşük olursa kazanma şansı artar, kâr azalır.', 'Kazanılan işler "Sözleşmeli işler" altında görünür; süresinde teslim et.'] },
  holding: { ico: '🏛️', title: 'Holding', sub: 'Otel, AVM, enerji, altyapı işleri, borsa ve şirket satın alma.', help: ['Otel & AVM: bitmiş projeleri işletmeye al, aylık gelir kazan.', 'Enerji: güneş ve rüzgâr santrali kur; mevsime ve şehre göre üretir.', 'Altyapı: yol, köprü, tünel, baraj işleri; ihaleyi İhale sekmesinde kazanırsın.', 'Borsa: halka arz, hisse satışı/geri alımı ve rakip şirket satın alma.'] },
  finans: { ico: EMOJI.finans, title: 'Finans', sub: 'Paranın durumu: gelir-gider, nakit akışı, krediler, ortaklar.', help: ['Gelir-Gider: kasa, net varlık, borç ve sağlık göstergeleri.', 'Krediler: banka kredisi al, geri öde. Ortaklar: yatırımcı al.', 'Kasa eksiye düşerse oyun durur; nakit yeterliliğini izle.'] },
  piyasa: { ico: EMOJI.piyasa, title: 'Piyasa', sub: 'Dış dünya: faiz, enflasyon, malzeme fiyatı ve rakipler.', help: ['Ekonomik rejim (genişleme, kriz…) tüm fiyatları etkiler.', 'Yüksek faiz kredi maliyetini, enflasyon inşaat maliyetini artırır.', 'Rakipler aynı arsalar ve ihaleler için yarışır.'] },
};

export function pageHead(app: App, tab: TabId): HTMLElement {
  const i = TAB_INFO[tab];
  const el = h('div', { class: 'pghead' }, h('span', { class: 'pgico' }, i.ico), h('div', { class: 'pgtxt' }, h('b', {}, i.title), h('small', {}, i.sub)),
    h('button', { class: 'pghelp', 'aria-label': `${i.title} yardımı`, onclick: () => { app.audio.sfx('click'); openGuide(app, TAB_TOPIC[tab]); } }, '?'));
  return el;
}

export function openHelp(tab: TabId): void {
  const i = TAB_INFO[tab];
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-label': `${i.title} yardımı` });
  const close = () => m.remove();
  m.append(h('div', { class: 'card helpcard' }, h('h2', {}, `${i.ico} ${i.title}`), h('p', { class: 'mute' }, i.sub), h('ul', {}, ...i.help.map((t) => h('li', {}, t))), h('button', { class: 'btn gold', onclick: close }, 'Anladım')));
  m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); });
  document.body.append(m);
}

/** Şantiye ekranı rehberi: hangi düğme ne yapar. */
export function openSiteHelp(): void {
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Şantiye rehberi' });
  const close = () => m.remove();
  const row = (k: string, v: string) => h('li', {}, h('b', {}, k + ' '), v);
  m.append(h('div', { class: 'card helpcard' }, h('h2', {}, '🏗️ Şantiye rehberi'), h('p', { class: 'mute' }, 'Bu ekran projenin 3B şantiyesi. Zaman burada da akar.'),
    h('ul', {}, row('‹ (sol üst)', 'şirket ekranına döner.'), row('Üstteki ilerleme çubuğu:', 'genel ilerleme, süren aşama ve aşamanın kendi ilerlemesi.'), row('Sağ üst:', 'kasa, tarih ve oyun hızı (⏸ durdur, 1×, 2×, 4×).'), row('Sağdaki kamera düğmeleri:', 'Kuş, Yan, Ön, Yakın, Üst bakış; parmağınla da döndürüp yakınlaştırabilirsin.'), row('Alt panel (▲):', 'Genel durum, Aşamalar, Kaynak (malzeme/ekip), Maliyet sekmeleri.'), row('Taslak projede:', '"İnşaatı başlat" düğmesi inşaatı başlatır.')),
    h('button', { class: 'btn gold', onclick: close }, 'Anladım')));
  m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); });
  document.body.append(m);
}
