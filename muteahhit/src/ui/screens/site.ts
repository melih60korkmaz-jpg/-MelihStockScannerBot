import { dateOf, formatDate } from '../../core/calendar';
import { formatMoney } from '../../core/money';
import type { Speed } from '../../core/store';
import { BUILDING_TYPES, STAGES, buildingType, quality } from '../../data';
import { crewFactor, stageDays } from '../../sim/construction';
import { currentRevenue } from '../../sim/projects';
import { SiteScene, type CamPreset, type SiteState } from '../../render3d/siteScene';
import { h, press, toast } from '../dom';
import { fmt, kv, nf, pct } from '../components';
import { MACHINES, MATERIALS, cityData, districtData } from '../../data';
import { incomingQty, stageNeeds, stockQty } from '../../sim/materials';
import { crewCapacity } from '../../sim/construction';
import type { App } from '../app';
import { openSales } from './sales';
import { unitsOf } from '../../sim/sales';
import type { Project } from '../../core/types';

const CAMS: [CamPreset, string][] = [['kus', 'Kuş'], ['yan', 'Yan'], ['on', 'Ön'], ['yakin', 'Yakın'], ['ust', 'Üst']];
const FIELD = new Set(['isci', 'usta', 'kalipci', 'demirci', 'elektrikci', 'tesisatci', 'santiye_sefi']);
const WORD: Record<string, string> = { acik: 'Açık', yagmur: 'Yağmurlu', kar: 'Karlı' };

/** Aktif şantiye: sim durumundan üretilen 3D sahne + aşama şeridi + özet paneli. */
export function siteScreen(app: App, projectId: number, backTo: () => void): HTMLElement {
  app.scene?.stop(); app.audio.setMood('game');
  const root = h('div', { class: 'site' });
  const canvas = h('canvas', { class: 'sitecv', 'aria-label': '3D şantiye görünümü' }) as HTMLCanvasElement; root.append(canvas);
  let scene: SiteScene | null = null;
  try { scene = new SiteScene(canvas); } catch (e) { console.warn('3D şantiye başlatılamadı', e); }
  app.site = scene;
  const proj = () => app.store.state.projects.find((p) => p.id === projectId);
  const parcelOf = (p: Project) => app.store.state.parcels.find((x) => x.id === p.parcelId);
  let sheetOpen = false, tab: 'genel' | 'asamalar' | 'kaynak' | 'maliyet' = 'genel', reportShown = false;

  const specOf = (p: Project) => { const pc = parcelOf(p)!, t = buildingType(p.type)!; return { type: p.type, quality: p.quality, seed: p.designSeed, floors: p.floors, footprint: Math.max(60, pc ? pc.area * pc.taks : 120), plotW: 40, plotD: 30, use: t.use, name: p.name, roads: pc?.roads ?? 1, corner: pc?.corner ?? false, region: cityData(p.cityId)?.province.region, density: pc ? districtData(pc.city, pc.district)?.density : 60 }; };
  const stateOf = (p: Project): SiteState => {
    const s = app.store.state, b = p.build;
    const u = p.status === 'taslak' ? 3 : p.status === 'insaat' && b ? b.stage + b.progress : 18;
    const field = s.staff.filter((x) => FIELD.has(x.type)).length;
    const us = unitsOf(s, p.id), occ = us.length ? us.filter((x) => x.status === 'satildi').length / us.length : 0;
    return { u, stalled: !!b?.stalled, weather: s.weather[p.cityId] ?? 'acik', workers: Math.max(3, field + 2), done: false, occupancy: occ };
  };

  // ---- Üst çubuk ----
  const top = h('div', { class: 'ov top' }), banner = h('div', { class: 'banner', style: 'display:none' }), stagesEl = h('div', { class: 'glass stages', role: 'img' }), sheet = h('div', { class: 'glass sheet2' });
  const titleBox = h('div', { class: 'glass title' }), cashB = h('b', {}), dateB = h('b', { style: 'font-size:15px' }), speedSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Oyun hızı' });
  const speedBtns: HTMLButtonElement[] = [];
  for (const [v, l] of [[0, ''], [1, '1×'], [2, '2×'], [4, '4×']] as [Speed, string][]) { const b = h('button', { 'aria-label': v === 0 ? 'Duraklat' : `Hız ${l}`, ...(v === 0 ? { html: '<svg viewBox="0 0 24 24" style="width:15px;height:15px"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>' } : {}), onclick: () => { press(app); app.store.setSpeed(v); } }, v === 0 ? null : l) as HTMLButtonElement; b.dataset.v = String(v); speedBtns.push(b); speedSeg.append(b); }
  top.append(h('button', { class: 'btn glass ibtn', 'aria-label': 'Geri', style: 'width:48px;height:48px;pointer-events:auto', onclick: () => { press(app); leave(); } }, '‹'), titleBox, h('div', { class: 'sp' }),
    h('div', { class: 'glass mini' }, h('div', { class: 'pill cash' }, h('small', {}, 'KASA'), cashB), h('div', { class: 'pill' }, h('small', {}, 'TARİH'), dateB), speedSeg));
  const cams = h('div', { class: 'cams' }, ...CAMS.map(([id, l]) => h('button', { class: 'btn glass', 'aria-label': `Kamera: ${l}`, onclick: () => { press(app); scene?.preset(id); } }, l)));
  root.append(top, h('div', { class: 'ov', style: 'top:calc(var(--st) + 58px);display:flex;justify-content:center' }, stagesEl), banner, cams, sheet);

  const leave = () => { unsub(); app.audio.ambient({ on: false, working: false, weather: 'acik' }); scene?.dispose(); app.site = null; backTo(); };

  // ---- Çizimler ----
  const draw = () => {
    const s = app.store.state, p = proj(); if (!p) { leave(); return; }
    const b = p.build, st = b ? STAGES[Math.min(b.stage, 17)]! : null;
    cashB.textContent = formatMoney(s.company!.cash); dateB.textContent = formatDate(s.clock.day);
    for (const sb of speedBtns) { const on = Number(sb.dataset.v) === app.store.speed; sb.classList.toggle('on', on); sb.setAttribute('aria-pressed', String(on)); }
    const t = buildingType(p.type)!, q = quality(p.quality)!;
    titleBox.innerHTML = ''; titleBox.append(h('b', {}, p.name), h('small', {}, `${t.label} · ${q.label} · ${p.floors} kat · ${p.hood}`));
    // aşama şeridi (18)
    stagesEl.innerHTML = ''; const cur = p.status === 'insaat' && b ? b.stage : p.status === 'taslak' ? 0 : 99;
    STAGES.forEach((sg, i) => stagesEl.append(h('i', { class: i < cur || p.status !== 'taslak' && p.status !== 'insaat' ? 'done' : i === cur ? 'cur' : '', title: sg.label })));
    stagesEl.setAttribute('aria-label', st ? `Aşama: ${st.label}` : 'Taslak');
    // durum bandı
    let msg = '', tone = '';
    if (p.status === 'taslak') { msg = 'Proje taslağı — inşaatı başlatmak için aşağıdaki düğmeyi kullanın'; tone = 'info'; }
    else if (b?.stalled === 'nakit') { msg = 'Nakit yok — inşaat durdu! Gelir sağlayın veya gider azaltın'; tone = ''; }
    else if (b?.stalled === 'malzeme') { msg = `Malzeme yok: ${MATERIALS.find((m) => m.id === b.matShort)?.label ?? ''} — Operasyon > Malzeme'den sipariş verin`; tone = 'warn'; }
    else if (b?.stalled === 'kaza') { msg = `İş kazası — şantiye ${Math.max(0, (b.accidentUntil ?? 0) - s.clock.day)} gün kapalı`; tone = ''; }
    else if (p.status === 'insaat' && b?.matShort) { msg = `Malzeme yetersiz (${MATERIALS.find((m) => m.id === b.matShort)?.label}): iş yavaşladı`; tone = 'warn'; }
    else if (p.status === 'insaat' && st?.permit) { msg = `Ruhsat bekleniyor (${Math.max(0, Math.round(b!.progress * 100))}%)`; tone = 'info'; }
    else if (p.status === 'insaat' && st?.outdoor && s.weather[p.cityId] !== 'acik') { msg = `${WORD[s.weather[p.cityId]!]} hava: dış işler yavaşlıyor`; tone = 'warn'; }
    banner.style.display = msg ? 'block' : 'none'; banner.className = `banner ${tone}`; banner.textContent = msg;
    scene?.setState(stateOf(p)); scene?.setSpeed(app.store.speed); { const st2 = stateOf(p); app.audio.ambient({ on: p.status === 'insaat' || p.status === 'taslak', working: p.status === 'insaat' && !st2.stalled && app.store.speed > 0, weather: st2.weather }); }
    drawSheet(p);
  };

  const remainingDays = (p: Project) => { const b = p.build!, d = stageDays(p); let r = (1 - b.progress) * d[b.stage]!; for (let k = b.stage + 1; k < 18; k++) r += d[k]!; return r; };
  const drawSheet = (p: Project) => {
    const s = app.store.state, b = p.build; sheet.innerHTML = '';
    const overall = p.status === 'insaat' && b ? (STAGES.slice(1, b.stage).reduce((a, x) => a + x.cost, 0) + STAGES[b.stage]!.cost * b.progress) / 100 : p.status === 'taslak' ? 0 : 1;
    const bar = h('div', { class: 'bar', role: 'button', tabindex: 0, 'aria-expanded': String(sheetOpen), onclick: () => { press(app); sheetOpen = !sheetOpen; drawSheet(proj()!); } },
      h('b', {}, p.status === 'insaat' && b ? STAGES[b.stage]!.label : p.status === 'taslak' ? 'Taslak' : p.status === 'tamamlandi' ? 'Teslim edildi' : 'Satıldı'),
      h('span', { class: 'grow' }, p.status === 'insaat' && b ? `Bütçe ilerlemesi ${pct(overall)} · kalan ~${Math.round(remainingDays(p))} gün` : p.status === 'taslak' ? 'İnşaat başlamadı' : `Kalite ${p.result?.qualityScore ?? '-'}`),
      h('span', { style: 'color:var(--mute)' }, sheetOpen ? '▾' : '▴'));
    sheet.append(bar, h('div', { class: 'prog' }, h('i', { style: `width:${Math.round(overall * 100)}%` })));
    if (!sheetOpen) { sheet.style.height = ''; return; }
    const seg = h('div', { class: 'seg', style: 'margin:6px 12px 0', role: 'tablist' });
    for (const [id, l] of [['genel', 'Genel'], ['asamalar', 'Aşamalar'], ['kaynak', 'Kaynaklar'], ['maliyet', 'Maliyet']] as const) seg.append(h('button', { class: tab === id ? 'on' : '', role: 'tab', onclick: () => { press(app); tab = id; drawSheet(proj()!); } }, l));
    const body = h('div', { class: 'body2' }); sheet.append(seg, body);
    if (tab === 'genel') {
      const rows: [string, string | Node, boolean?][] = [['Durum', p.status === 'insaat' ? 'İnşaat sürüyor' : p.status === 'taslak' ? 'Taslak' : p.status === 'tamamlandi' ? 'Tamamlandı' : 'Satıldı'], ['Planlanan süre', `~${p.expected.months} ay`]];
      if (b && p.status === 'insaat') {
        const st = STAGES[b.stage]!, f = st.office ? 1 : crewFactor(s, p, st.id);
        rows.push(['Geçen süre', `${s.clock.day - b.startDay} gün`], ['Tahmini kalan', `~${Math.round(remainingDays(p))} gün`], ['Tahmini bitiş', formatDate(s.clock.day + Math.round(remainingDays(p)))], ['Ekip etkinliği', `×${f.toFixed(2)}${f < 0.6 ? ' (ekip yetersiz)' : f > 1.1 ? ' (güçlü ekip)' : ''}`], ['Hava', WORD[s.weather[p.cityId]!]!], ['Durma günleri', String(b.stalledDays)]);
      }
      if (p.status === 'tamamlandi' && p.result) rows.push(['Kalite puanı', String(p.result.qualityScore)], ['Süre', `${p.result.days} gün (plan ${p.result.plannedDays})`]);
      body.append(kv(rows));
      if (p.status === 'taslak') body.append(h('button', { class: 'btn gold block lg', style: 'margin-top:10px', onclick: () => { const r = app.store.run('StartConstruction', { projectId: p.id }); if (r.ok) { press(app, 'stamp', 'heavy'); toast('İnşaat başladı.'); app.store.setSpeed(1); } else toast(r.error); } }, 'İnşaatı başlat'));
      if (p.status === 'tamamlandi') body.append(saleBox(p));
    } else if (tab === 'asamalar') {
      STAGES.forEach((sg, i) => { if (i === 0) return; const done = p.status === 'tamamlandi' || p.status === 'satildi' || (b && i < b.stage), cur = b && p.status === 'insaat' && i === b.stage;
        body.append(h('div', { class: `stl ${done ? 'done' : cur ? 'cur' : ''}` }, h('span', { class: 'ic' }), h('span', {}, sg.label + (cur ? ` — ${Math.round(b!.progress * 100)}%` : '')), h('span', {}, b ? fmt(b.stageBudget[i]!) : fmt(Math.round((p.budget.total - p.budget.soil) * sg.cost / 100))))); });
    } else if (tab === 'kaynak') {
      const st = b && p.status === 'insaat' ? STAGES[b.stage]! : null;
      if (!st || !b) body.append(h('div', { class: 'empty' }, 'Kaynak bilgisi inşaat sürerken görünür.'));
      else {
        const rows: [string, string | Node, boolean?][] = [['Aşama', st.label], ['Saha ekibi', st.office ? 'Ofis aşaması (mimar/mühendis gerekir)' : `kapasite ${crewCapacity(s, st.id, p.id).toFixed(1)} / gereken ${(p.brut / 70).toFixed(1)}`]];
        for (const [id, q] of stageNeeds(p, b.stage)) { const m = MATERIALS.find((x) => x.id === id)!, have = stockQty(s, id), inc = incomingQty(s, id); rows.push([m.label, h('span', { class: have < q * (1 - b.progress) ? 'neg' : '' }, `kalan ihtiyaç ${nf(q * (1 - b.progress), 1)} · stok ${nf(have, 1)} · yolda ${nf(inc, 1)} ${m.unit}`)]); }
        for (const mid of st.machines ?? []) { const owned = s.machines.find((x) => x.type === mid && x.brokenUntil <= s.clock.day); rows.push([MACHINES.find((x) => x.id === mid)!.label, owned ? 'Sizin (yakıt)' : s.machines.some((x) => x.type === mid) ? 'Arızalı → kiralanıyor' : 'Kiralanıyor (günlük)']); }
        body.append(kv(rows), h('div', { class: 'hint' }, 'Operasyon sekmesinden malzeme siparişi, makine alımı ve ekip ataması yapabilirsiniz.'));
      }
    } else {
      const spent = b ? b.spent + b.unpaid + (b.matCost ?? 0) : 0, rev = currentRevenue(s, { ...p, ...(p.result ? { result: p.result } : {}) }), land = parcelOf(p)?.costBasis ?? 0;
      body.append(kv([['Proje bütçesi', fmt(p.budget.total)], ['Harcanan (ödenen + tahakkuk)', fmt(spent)], ['Tasarım bedeli (ödendi)', fmt(p.budget.designFee)], ...(b && b.soilExtra !== 0 ? [['Zemin sürprizi', fmt(b.soilExtra)] as [string, string]] : []),
        ['Fiyat endeksi etkisi', b ? `×${(0.6 * s.macro.materialIndex / b.priceBase.mat + 0.4 * s.costIndex / b.priceBase.cost).toFixed(2)}` : '—'], ['Arsa maliyeti', fmt(land)], ['Tahmini satış değeri', fmt(rev)], ['Tahmini kâr', fmt(Math.round(rev * 0.98) - p.budget.total - land), true]]),
        h('div', { class: 'hint' }, 'Kendi saha ekibiniz taşeron işçilik bedelinin bir kısmını tasarruf ettirir; maaşlarınız ayrıca ödenir.'));
    }
  };

  const saleBox = (p: Project) => {
    const us = unitsOf(app.store.state, p.id), sold = us.filter((u) => u.status === 'satildi').length;
    return h('div', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center' },
      h('button', { class: 'btn gold lg', style: 'flex:1', onclick: () => { press(app); openSales(app, p.id, draw); } }, `Satış merkezi · ${sold}/${us.length} daire satıldı`),
      h('span', { class: 'mute', style: 'font-size:12px;flex-basis:100%' }, 'Fiyat, emlakçı, taksit ve toplu satış seçeneklerini Satış merkezinden yönetin.'));
  };

  const showReport = (p: Project) => {
    if (reportShown) return; reportShown = true; scene?.setAutoOrbit(true); scene?.preset('yakin');
    const r = p.result!, stars = r.qualityScore >= 90 ? 5 : r.qualityScore >= 80 ? 4 : r.qualityScore >= 70 ? 3 : r.qualityScore >= 55 ? 2 : 1, late = r.days > r.plannedDays * 1.05;
    app.audio.sfx('stamp'); app.haptic('heavy');
    const el = h('div', { class: 'report', role: 'dialog', 'aria-label': 'Teslim raporu' }, h('div', { class: 'card' },
      h('div', { class: 'lbl-s' }, 'Proje tamamlandı'), h('h2', { style: 'font-size:30px;margin-bottom:6px' }, p.name),
      h('div', { class: 'stars', 'aria-label': `${stars} yıldız`, html: '★'.repeat(stars) + `<span class="off">${'★'.repeat(5 - stars)}</span>` }),
      kv([['Kalite puanı', String(r.qualityScore)], ['Süre', `${r.days} gün (plan ${r.plannedDays})${late ? ' · gecikme' : ' · zamanında'}`], ['Toplam maliyet', fmt(r.cost)], ['Bütçe', fmt(p.budget.total)], ['Tahmini satış değeri', fmt(currentRevenue(app.store.state, p))], ['İtibar', `${app.store.state.company!.reputation}`]]),
      h('div', { style: 'display:flex;gap:8px;margin-top:12px' }, h('button', { class: 'btn block', onclick: () => { press(app); el.remove(); scene?.setAutoOrbit(false); sheetOpen = true; tab = 'genel'; draw(); } }, 'Binayı incele'), h('button', { class: 'btn gold block', onclick: () => { press(app); el.remove(); scene?.setAutoOrbit(false); openSales(app, p.id, draw); } }, 'Satış merkezi'))));
    root.append(el);
  };

  const unsub = app.store.subscribe((evs) => {
    if (!root.isConnected) { unsub(); return; }
    for (const e of evs) {
      if (e.type === 'PROJECT_COMPLETED' && e.data!.projectId === projectId) { const p = proj(); if (p) showReport(p); }
      if (e.type === 'STAGE_COMPLETED' && e.data!.projectId === projectId) app.audio.sfx('toggle');
      if (e.type === 'SOIL_REVEALED' && e.data!.projectId === projectId) { app.audio.sfx((e.data!.extra as number) > 0 ? 'error' : 'confirm'); toast((e.data!.extra as number) === 0 ? 'Hafriyat: zemin beklendiği gibi çıktı.' : `Hafriyatta zemin ortaya çıktı: ${(e.data!.extra as number) > 0 ? 'ek maliyet +' : 'tasarruf '}${formatMoney(Math.abs(e.data!.extra as number))}`, 5000); }
      if (e.type === 'CONSTRUCTION_STALLED' && e.data!.projectId === projectId) { app.audio.sfx('error'); toast('Nakit yetmedi: inşaat durdu!', 5000); }
      if (e.type === 'CONSTRUCTION_RESUMED' && e.data!.projectId === projectId) toast('Nakit sağlandı: inşaat devam ediyor.');
      if (e.type === 'MACRO_NEWS') toast((e.data as { text: string }).text, 4500);
    }
    draw();
  });

  const p0 = proj(); if (!p0) { queueMicrotask(leave); return root; }
  if (scene) {
    { const st0 = stateOf(p0); app.audio.ambient({ on: p0.status === 'insaat' || p0.status === 'taslak', working: p0.status === 'insaat' && !st0.stalled && app.store.speed > 0, weather: st0.weather }); }
    scene.setReduced(app.settings.reduced); scene.setQuality(app.settings.value.quality); scene.setSpec(specOf(p0)); scene.setState(stateOf(p0), true);
    scene.onContext = (lost) => { if (lost) toast('Grafik bağlamı kaybedildi; sahne yeniden yüklenecek.'); }; scene.resize(); scene.start();
  } else root.append(h('div', { class: 'banner warn', style: 'display:block;top:50%' }, '3D görünüm bu cihazda kullanılamıyor; veriler aşağıda.'));
  const unsubSet = app.settings.subscribe((_, k) => { if (!root.isConnected) { unsubSet(); return; } if (k === 'motion') scene?.setReduced(app.settings.reduced); if (k === 'quality') scene?.setQuality(app.settings.value.quality); });
  draw();
  if (p0.status === 'tamamlandi' && !p0.result?.revenue) sheetOpen = true, draw();
  void BUILDING_TYPES; void dateOf;
  return root;
}
