import { h } from './dom';
import { portrait } from './art';
import type { App } from './app';
import type { TabId } from './pagehead';

/**
 * Açılış anlatıcısı: Şef Ayşe, oyunu adım adım tanıtır. Hedef öğe vurgulanır, sekmeler sırayla açılır.
 * Bir kez gösterilir (localStorage); Ayarlar'dan yeniden izlenebilir. Açıkken oyun zamanı akmaz (`.tut` Store.hold'da sayılır).
 */
const KEY = 'muteahhit.tutorial.v1';
export const tutorialDone = (): boolean => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
const markDone = () => { try { localStorage.setItem(KEY, '1'); } catch { /* yok say */ } };

interface Step { title: string; text: string; tab?: TabId; target?: string; last?: boolean }
const tabSel = (i: number) => `.tabs .tab:nth-child(${i})`;
const STEPS: Step[] = [
  { title: 'Hoş geldin patron!', text: 'Ben Şef Ayşe, şantiye şefiniz. Şirketinizi birkaç adımda tanıtayım. İstediğiniz an "Atla" diyebilirsiniz; Ayarlar\'dan yeniden izlenir.' },
  { title: 'Kasa, takvim, hız', text: 'Burası komuta paneli: paranız (kasa), tarih ve zaman hızı. ⏸ ile durdurun, 1×–4× ile hızlandırın. Kasa eksiye düşerse oyun durur.', tab: 'sirket', target: '.hud' },
  { title: 'Şirket', text: 'Günün özeti burada: görevler, para durumunuz ve şirket seviyeniz. Üstteki şehir resmine dokununca Genel Merkez açılır.', tab: 'sirket', target: tabSel(1) },
  { title: 'Görevler', text: 'Görevler size sıradaki adımı söyler. "Şimdi yap" doğru sekmeye götürür. Sekmelerde nabız atan nokta da sıradaki adımı gösterir.', tab: 'sirket', target: '.questscard' },
  { title: 'Harita', text: 'Her iş arsayla başlar. Bir ile dokunun, ilçeyi seçin, arsayı inceleyin ve satın alın. "Hızlı başlangıç" kartı tek dokunuşla arsa, proje ve inşaatı başlatır.', tab: 'harita', target: tabSel(2) },
  { title: 'Projeler', text: 'Arsa alınca proje olur: tasarım, inşaat, satış. "Şantiyeyi aç" 3B şantiyeyi gösterir, "Satış merkezi" daireleri satmanızı sağlar.', tab: 'projeler', target: tabSel(3) },
  { title: 'Operasyon', text: 'İşi yapan ekip burada. "Kim nerede?" panosunda herkesin hangi projede çalıştığını görürsünüz. Malzeme, makine ve iş güvenliği de burada.', tab: 'operasyon', target: tabSel(4) },
  { title: 'İhale', text: 'Kamu ve özel işlere teklif verin. Kazanırsanız sözleşmeli iş olur; süresinde teslim etmek gerekir.', tab: 'ihale', target: tabSel(5) },
  { title: 'Finans', text: 'Gelir-gider, nakit akışı, krediler ve ortaklar. Para biterse iş biter; nakit yeterliliğinizi izleyin.', tab: 'finans', target: tabSel(6) },
  { title: 'Piyasa', text: 'Faiz, enflasyon, malzeme fiyatları ve rakipler. Kriz dönemlerinde dikkatli olun; her sekmenin başındaki "?" size yardım eder.', tab: 'piyasa', target: tabSel(7) },
  { title: 'Hepsi bu!', text: 'İlk adımınız: Harita\'dan bir arsa alıp inşaata başlamak. Başarılar patron, ben şantiyedeyim!', tab: 'sirket', last: true },
];

export function startTutorial(app: App): void {
  if (document.querySelector('.tut')) return;
  app.store.setSpeed(0);
  let i = 0;
  const root = h('div', { class: 'tut', role: 'dialog', 'aria-label': 'Oyun rehberi' });
  const ring = h('div', { class: 'tutring' }), card = h('div', { class: 'tutcard' });
  root.append(ring, card); document.body.append(root);
  const end = (go?: TabId) => { markDone(); root.classList.add('out'); window.removeEventListener('resize', place); setTimeout(() => root.remove(), app.settings.reduced ? 0 : 220); if (go) app.openTab?.(go); };
  const place = () => {
    const st = STEPS[i]!, el = st.target ? document.querySelector<HTMLElement>(st.target) : null;
    if (!el) { ring.style.display = 'none'; card.className = 'tutcard mid'; card.style.cssText = ''; return; }
    const r = el.getBoundingClientRect(); ring.style.display = 'block';
    ring.style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
    const below = r.top + r.height / 2 < innerHeight / 2; card.className = 'tutcard ' + (below ? 'bot' : 'top'); card.style.cssText = '';
  };
  const render = () => {
    const st = STEPS[i]!;
    if (st.tab) app.openTab?.(st.tab);
    card.innerHTML = '';
    card.append(
      h('div', { class: 'tutface', html: portrait('santiye_sefi', 7, 80) }),
      h('div', { class: 'tutbody' }, h('small', { class: 'tutwho' }, 'Şef Ayşe · Şantiye Şefi'), h('b', {}, st.title), h('p', {}, st.text),
        h('div', { class: 'tutbar' }, h('div', { class: 'tutdots' }, ...STEPS.map((_, k) => h('i', { class: k === i ? 'on' : k < i ? 'done' : '' }))),
          h('span', { class: 'sp' }), h('button', { class: 'btn', style: 'min-height:36px;font-size:13px', onclick: () => end() }, st.last ? 'Kapat' : 'Atla'),
          ...(i > 0 && !st.last ? [h('button', { class: 'btn', style: 'min-height:36px;font-size:13px', onclick: () => { i--; render(); } }, '‹')] : []),
          st.last ? h('button', { class: 'btn gold', style: 'min-height:36px', onclick: () => end('harita') }, 'Haritaya git ▸') : h('button', { class: 'btn gold', style: 'min-height:36px', onclick: () => { i++; render(); } }, 'İleri ▸'))));
    setTimeout(place, 60); place();
  };
  window.addEventListener('resize', place);
  render();
}
