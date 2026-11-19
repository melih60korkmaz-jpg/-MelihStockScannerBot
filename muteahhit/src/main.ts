import { dispatch, FOUNDER_BACKGROUNDS, START_CITIES } from './core/commands';
import { Store, type Speed } from './core/store';
import { newGameState } from './core/state';
import { formatDate } from './core/calendar';
import { formatMoney } from './core/money';
import { STAFF_TYPES } from './data';
import { IdbKV, MemoryKV, SaveManager } from './save/manager';
import { checkInvariant } from './sim/ledger';

const app = document.getElementById('app')!;
let store = new Store(newGameState(Date.now() % 1_000_000));
let msg = '';
const logLines: string[] = [];

// IndexedDB yoksa (gizli mod vb.) oyun bellek kaydıyla çalışmaya devam eder.
let saves: SaveManager;
let persistent = true;
try { saves = new SaveManager(new IdbKV()); } catch { saves = new SaveManager(new MemoryKV()); persistent = false; }

function attach(s: Store) {
  s.subscribe((evs) => {
    for (const e of evs) if (e.type !== 'DAY') logLines.unshift(`${formatDate(e.day)} · ${e.type}`);
    render();
  });
}
attach(store);

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function render() {
  const s = store.state;
  const c = s.company;
  if (!c) {
    app.innerHTML = `<div class="card"><div class="row">
      <input id="name" placeholder="Şirket adı" value="Demir Yapı" maxlength="32">
      <select id="bg">${FOUNDER_BACKGROUNDS.map((b) => `<option>${b}</option>`).join('')}</select>
      <select id="city">${START_CITIES.map((b) => `<option>${b}</option>`).join('')}</select>
      <button class="cta" id="create">Şirketi Kur</button></div>
      <div class="row" style="margin-top:8px"><button id="cont">Devam Et (son kayıt)</button></div>
      <p class="sub" id="msg">${esc(msg)}</p></div>`;
    q('create').onclick = () => {
      const r = store.run('CreateCompany', { name: (q('name') as HTMLInputElement).value, founderBackground: (q('bg') as HTMLSelectElement).value, startCity: (q('city') as HTMLSelectElement).value });
      msg = r.ok ? '' : r.error; render();
    };
    q('cont').onclick = continueLatest;
    return;
  }
  const speeds: [Speed, string][] = [[0, '⏸'], [1, '1×'], [2, '2×'], [4, '4×']];
  app.innerHTML = `
  <div class="card">
    <div class="sub">${esc(c.name)} · ${formatDate(s.clock.day)}</div>
    <div class="big ${c.cash < 0 ? 'neg' : ''}">${formatMoney(c.cash)}</div>
    <div class="sub">Defter tutarlı: ${checkInvariant(s) ? '<span class="pos">evet</span>' : '<span class="neg">HAYIR</span>'} · ${s.ledger.length} kayıt · ${persistent ? 'kalıcı kayıt' : 'bellek kaydı'}</div>
    <div class="row">${speeds.map(([v, l]) => `<button data-sp="${v}" class="${store.speed === v ? 'on' : ''}">${l}</button>`).join('')}
      <button data-skip="30">+30 gün</button></div>
  </div>
  <div class="card"><div class="row">
    <select id="hire">${STAFF_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}</select>
    <button class="cta" id="hirebtn">İşe Al</button></div>
    <p class="sub">${esc(msg)}</p>
    <ul>${s.staff.map((p) => `<li><span>${esc(p.name)} · ${p.type} · deneyim ${p.experience}</span><span>${formatMoney(p.salary)}/ay <button data-fire="${p.id}">Çıkar</button></span></li>`).join('') || '<li>Henüz çalışan yok</li>'}</ul>
  </div>
  <div class="card"><div class="row"><button id="save">Kaydet</button><button id="auto">Otomatik kayıt</button><button id="load">Yükle</button></div>
    <div id="log">${logLines.slice(0, 30).map(esc).join('<br>')}</div></div>`;
  document.querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) => (b.onclick = () => store.setSpeed(Number(b.dataset.sp) as Speed)));
  document.querySelectorAll<HTMLButtonElement>('[data-skip]').forEach((b) => (b.onclick = () => { for (let i = 0; i < 30; i++) { const evs = store.state; void evs; stepDay(); } render(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-fire]').forEach((b) => (b.onclick = () => { const r = store.run('FireStaff', { staffId: Number(b.dataset.fire) }); msg = r.ok ? '' : r.error; render(); }));
  q('hirebtn').onclick = () => { const r = store.run('HireStaff', { type: (q('hire') as HTMLSelectElement).value }); msg = r.ok ? '' : r.error; render(); };
  q('save').onclick = async () => { await saves.saveManual(1, store.state); msg = 'Manuel slot 1 kaydedildi.'; render(); };
  q('auto').onclick = async () => { msg = `Otomatik kayıt: ${await saves.autosave(store.state)}`; render(); };
  q('load').onclick = continueLatest;
}

import { advanceDay } from './sim/engine';
function stepDay() { store.setSpeed(0); const evs = advanceDay(store.state); for (const e of evs) if (e.type !== 'DAY') logLines.unshift(`${formatDate(e.day)} · ${e.type}`); }

async function continueLatest() {
  const r = await saves.loadLatestValid();
  if (!r) { msg = 'Kayıt bulunamadı.'; render(); return; }
  store = new Store(r.state); attach(store);
  msg = `Yüklendi: ${r.slot}${r.skipped.length ? ' (atlanan: ' + r.skipped.join(', ') + ')' : ''}`;
  render();
}

const q = (id: string) => document.getElementById(id)!;

// Zaman döngüsü
let last = performance.now();
function loop(t: number) { const dt = t - last; last = t; const d0 = store.state.clock.day; store.frame(dt); if (store.state.clock.day !== d0) { /* subscribe zaten render eder */ } requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// Yaşam döngüsü: arka plana alınınca duraklat + otomatik kaydet
const background = () => { if (document.visibilityState === 'hidden' && store.state.company) { store.pauseForBackground(); void saves.autosave(store.state).catch(() => {}); } };
document.addEventListener('visibilitychange', background);
addEventListener('pagehide', background);

render();
