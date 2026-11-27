/** "Yoğun Saat": 45 saniyelik, elle oynanan servis oyunu. Müşteri seç → malzemelere dokun → tarif tamamlanınca servis edilir.
 *  Süre/tablo/hız değişkenleri anim sisteminden bağımsız; yalnız transform/opacity animasyonu kullanır. */
import { confetti, ucanYazi } from './juice';
import { servisHazirMi, servisOdul, servisZorluk, SERVIS_SURE, yildizOf, servisOf } from '../core/servis';
import { fmt } from '../core/actions';
import { sfx } from './audio';
import type { GameState } from '../core/types';

const MALZ: Record<string, [string, string]> = { kahve: ['☕', 'Kahve'], sut: ['🥛', 'Süt'], su: ['💧', 'Su'], cay: ['🫖', 'Çay'], kakao: ['🍫', 'Çikolata'], buz: ['🧊', 'Buz'], tatli: ['🍰', 'Tatlı'] };
const TARIF: Array<{ ad: string; ik: string; m: string[]; z: number }> = [
  { ad: 'Espresso', ik: '☕', m: ['kahve'], z: 1 }, { ad: 'Çay', ik: '🫖', m: ['cay'], z: 1 }, { ad: 'Cheesecake', ik: '🍰', m: ['tatli'], z: 1 },
  { ad: 'Latte', ik: '🥛', m: ['kahve', 'sut'], z: 1 }, { ad: 'Türk kahvesi', ik: '🫘', m: ['kahve', 'su'], z: 2 }, { ad: 'Sıcak çikolata', ik: '🍫', m: ['sut', 'kakao'], z: 2 },
  { ad: 'Buzlu latte', ik: '🧊', m: ['kahve', 'sut', 'buz'], z: 3 }, { ad: 'Mocha', ik: '🍮', m: ['kahve', 'sut', 'kakao'], z: 3 }, { ad: 'Latte + tatlı', ik: '🍰', m: ['kahve', 'sut', 'tatli'], z: 4 },
];
const YUZ = ['😀', '🧑‍🎓', '👵', '🧔', '👩‍💼', '🧑‍🎨', '👨‍🍳', '🧕', '🧑‍💻', '👴'];
interface Mus { id: number; yuz: string; t: (typeof TARIF)[number]; sab: number; kal: number }

export function servisAc(root: HTMLElement, s: GameState, bitti: () => void): void {
  if (root.querySelector('.sv')) return;
  const z = servisZorluk(s), kosul = TARIF.filter((t) => t.z <= z), sabirBase = 17 - z * 1.5;
  const el = document.createElement('div'); el.className = 'sv';
  el.innerHTML = `<div class="svbox"><div class="svtop"><b>☕ Yoğun saat</b><span class="svsc">Puan <i id="svP">0</i></span><span class="svcb" id="svC"></span><span class="sp"></span><span class="svtm"><i id="svT">${SERVIS_SURE}</i> sn</span><button class="ibtn" id="svX" aria-label="Vazgeç">✕</button></div><div class="svbar"><i id="svB"></i></div><div class="svq" id="svQ"></div><div class="svcup"><span class="svcl">Fincan:</span><span id="svCup" class="svcc">boş</span><button class="btn sm" id="svR">Boşalt</button></div><div class="svtray" id="svTr">${Object.entries(MALZ).map(([k, v]) => `<button data-m="${k}"><i>${v[0]}</i><span>${v[1]}</span></button>`).join('')}</div></div>`;
  root.appendChild(el);
  const q = el.querySelector('#svQ') as HTMLElement, cupEl = el.querySelector('#svCup') as HTMLElement;
  let kuyruk: Mus[] = [], sec = -1, fincan: string[] = [], puan = 0, kalan = SERVIS_SURE, sonraki = 0.4, id = 0, kombo = 0, sonuc = false, raf = 0, son = performance.now();
  const yeni = (): void => { const t = kosul[Math.floor(Math.random() * kosul.length)]!, sab = sabirBase * (0.85 + Math.random() * 0.3) + t.m.length * 2; kuyruk.push({ id: ++id, yuz: YUZ[Math.floor(Math.random() * YUZ.length)]!, t, sab, kal: sab }); if (sec < 0) sec = kuyruk[0]!.id; };
  const ciz = (): void => {
    q.innerHTML = kuyruk.map((m) => `<button class="svm ${m.id === sec ? 'on' : ''} ${m.kal < m.sab * 0.3 ? 'acil' : ''}" data-id="${m.id}"><span class="svf">${m.yuz}</span><b>${m.t.ik} ${m.t.ad}</b><small>${m.t.m.map((k) => MALZ[k]![0]).join(' + ')}</small><u><i style="transform:scaleX(${(m.kal / m.sab).toFixed(3)})"></i></u></button>`).join('') || '<div class="svbos">Müşteri bekleniyor…</div>';
    cupEl.textContent = fincan.length ? fincan.map((k) => MALZ[k]![0]).join(' ') : 'boş'; (el.querySelector('#svP') as HTMLElement).textContent = String(Math.round(puan)); (el.querySelector('#svC') as HTMLElement).textContent = kombo >= 2 ? `🔥 x${kombo}` : '';
  };
  const hata = (): void => { sfx.err(); fincan = []; kombo = 0; el.classList.remove('hata'); void el.offsetWidth; el.classList.add('hata'); };
  const kontrol = (): void => {
    const m = kuyruk.find((x) => x.id === sec); if (!m) return; const g = [...m.t.m].sort().join(), f = [...fincan].sort().join();
    if (f === g) { const hiz = Math.round(10 * m.kal / m.sab), kz = Math.min(5, kombo) * 2, p = 10 + hiz + kz; puan += p; kombo++; sfx.coin(); ucanYazi(`+${p}`, innerWidth / 2, innerHeight * 0.38, '#C6A477'); kuyruk = kuyruk.filter((x) => x !== m); fincan = []; sec = kuyruk[0]?.id ?? -1; }
    else if (fincan.length >= m.t.m.length || !m.t.m.some((k) => fincan[fincan.length - 1] === k) || fincan.filter((k) => k === fincan[fincan.length - 1]).length > m.t.m.filter((k) => k === fincan[fincan.length - 1]).length) hata();
  };
  const bitir = (): void => {
    if (sonuc) return; sonuc = true; cancelAnimationFrame(raf); const yildiz = yildizOf(puan), r = servisHazirMi(s) ? servisOdul(s, puan) : null; if (r) bitti();
    const box = el.querySelector('.svbox') as HTMLElement; box.innerHTML = `<div class="svson"><h2>${yildiz >= 3 ? 'Muhteşem servis!' : yildiz === 2 ? 'Harika iş!' : yildiz === 1 ? 'İdare eder' : 'Zor bir gündü'}</h2><div class="svst">${[1, 2, 3].map((i) => `<i class="${i <= yildiz ? 'on' : ''}" style="animation-delay:${i * 180}ms">★</i>`).join('')}</div><div class="svpn">${Math.round(puan)} puan${r?.rekor ? ' · 🏆 yeni rekor' : ''}</div><div class="svod">${r ? `<span>💰 +${fmt(r.para)}</span><span>⭐ itibar +${(r.yildiz * 0.6).toFixed(1)}</span>` : '<span>Ödül bugün zaten alındı</span>'}</div><div class="tiny muted">Yarın yeniden oynayabilirsin · en iyi: ${Math.round(servisOf(s).enIyi)}</div><button class="ybtn" id="svOk">Devam ›</button></div>`;
    if (yildiz >= 2) confetti(yildiz === 3 ? 110 : 60); (box.querySelector('#svOk') as HTMLElement).onclick = () => kapat();
  };
  const kapat = (): void => { cancelAnimationFrame(raf); el.classList.add('cikis'); setTimeout(() => el.remove(), 220); };
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-m],[data-id],#svR,#svX'); if (!b || sonuc) return;
    if (b.id === 'svX') { sonuc = true; cancelAnimationFrame(raf); kapat(); return; }
    if (b.id === 'svR') { fincan = []; ciz(); return; }
    if (b.dataset.id) { sec = +b.dataset.id; fincan = []; ciz(); return; }
    if (b.dataset.m && sec >= 0) { fincan.push(b.dataset.m); sfx.tick(); kontrol(); ciz(); }
  });
  const kare = (n: number): void => {
    raf = requestAnimationFrame(kare); const dt = Math.min(0.1, (n - son) / 1000); son = n; kalan -= dt; (el.querySelector('#svT') as HTMLElement).textContent = String(Math.max(0, Math.ceil(kalan))); (el.querySelector('#svB') as HTMLElement).style.transform = `scaleX(${Math.max(0, kalan / SERVIS_SURE).toFixed(3)})`;
    if (kalan <= 0) { bitir(); return; }
    sonraki -= dt; const hizli = 1 + (1 - kalan / SERVIS_SURE) * 0.7; if (sonraki <= 0 && kuyruk.length < 3) { yeni(); sonraki = (3.6 - z * 0.35) / hizli + Math.random(); }
    let degisti = false; for (const m of kuyruk) m.kal -= dt; const gidenler = kuyruk.filter((m) => m.kal <= 0); if (gidenler.length) { kuyruk = kuyruk.filter((m) => m.kal > 0); kombo = 0; degisti = true; puan = Math.max(0, puan - 4 * gidenler.length); if (!kuyruk.some((m) => m.id === sec)) { sec = kuyruk[0]?.id ?? -1; fincan = []; } sfx.err(); }
    ciz(); void degisti;
  };
  yeni(); ciz(); raf = requestAnimationFrame(kare);
}
