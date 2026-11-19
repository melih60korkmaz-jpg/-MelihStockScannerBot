import { formatMoney } from '../../core/money';
import { BUILDING_TYPES, QUALITIES, buildingType, cityData, districtData, STAGE_SHARES, SOIL_COST } from '../../data';
import { SURVEY_DAYS, askPrice, fairValue, growthLabel, reservePrice, surveyCost, valueBand, QUICK_SALE_DISCOUNT, TAPU_HARCI } from '../../sim/land';
import { buildable, planProject } from '../../sim/projects';
import { h, press, toast } from '../dom';
import { ZONING_LABEL, SOIL_LABEL, blueprint, fmt, fmtM2, kv, massing, nf, pct, planTable, statBar } from '../components';
import type { App } from '../app';
import { openProjectWizard } from './projectWizard';
import { formatDate } from '../../core/calendar';

type Tab = 'ozet' | 'imar' | 'zemin' | 'cevre' | 'fizibilite';

/** Arsa Dosyası: plan çizimi, imar hakları, zemin ve çevre bilgisi, fizibilite, pazarlıklı satın alma / satış. */
export function openParcel(app: App, parcelId: number, onChange?: () => void): void {
  const st = { tab: 'ozet' as Tab, type: '', q: 'standart', offer: 95, listMult: 105 };
  const left = h('div', { class: 'left' }), content = h('div', { class: 'content' }), tabsx = h('div', { class: 'tabsx' }), act = h('div', { class: 'act' }), hd = h('div', { class: 'hd' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Arsa dosyası' }, h('div', { class: 'card pfile' }, hd, h('div', { class: 'main' }, left, h('div', { class: 'right' }, tabsx, content)), act));
  const close = () => { modal.remove(); onChange?.(); };
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const get = () => app.store.state.parcels.find((p) => p.id === parcelId);

  const unsub = app.store.subscribe((evs) => {
    if (!modal.isConnected) { unsub(); return; }
    // Pazarlık kilidi bittiği gün düğme açılsın; diğer önemli olaylarda da yenile
    const lockEnds = evs.some((e) => e.type === 'DAY' && e.day === get()?.negoLockUntil);
    if (lockEnds || evs.some((e) => ['SURVEY_DONE', 'LAND_SOLD', 'LAND_BOUGHT', 'PROJECT_CREATED', 'MONTH', 'STATE_REPLACED'].includes(e.type))) render();
  });

  const render = () => {
    const s = app.store.state, p = get();
    if (!p) { toast('Bu arsa artık piyasada değil (başkasına satılmış olabilir).'); close(); return; }
    const d = districtData(p.city, p.district)!, city = cityData(p.city)!, mine = p.owner === 'player';
    if (!st.type) st.type = (buildingType('apartman')!.zoning.includes(p.zoning) ? 'apartman' : BUILDING_TYPES.find((t) => buildable(p, t.id).reason === undefined)?.id) ?? 'apartman';
    const price = askPrice(s, p), band = valueBand(s, p), gl = growthLabel(p);
    const baseFloors = Math.min(p.maxFloors, Math.max(1, Math.ceil(p.kaks / p.taks)));

    hd.innerHTML = '';
    hd.append(h('h2', {}, `${p.hood}`), h('span', { class: 'chip' }, `${city.label} / ${d.label}`), h('span', { class: `chip ${mine ? 'good' : ''}` }, mine ? 'Sizin arsanız' : 'Satılık'),
      h('button', { class: 'btn', 'aria-label': 'Kapat', onclick: () => { press(app); close(); } }, 'Kapat'));

    left.innerHTML = '';
    const pl0 = planProject(s, p, st.type, st.q, mine ? p.costBasis : undefined);
    left.append(blueprint(p), h('div', { style: 'height:8px' }), massing(p, pl0.ok ? pl0.floors : baseFloors),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:6px' }, h('span', { class: 'chip' }, ZONING_LABEL[p.zoning]), h('span', { class: 'chip' }, 'TAKS ', h('b', {}, p.taks.toFixed(2).replace('.', ','))), h('span', { class: 'chip' }, 'KAKS ', h('b', {}, p.kaks.toFixed(2).replace('.', ','))), h('span', { class: 'chip' }, 'Maks. ', h('b', {}, `${p.maxFloors} kat`))));

    const TABS: [Tab, string][] = [['ozet', 'Özet'], ['imar', 'İmar'], ['zemin', 'Zemin & Altyapı'], ['cevre', 'Çevre'], ['fizibilite', 'Fizibilite']];
    tabsx.innerHTML = ''; const seg = h('div', { class: 'seg', role: 'tablist' });
    for (const [id, l] of TABS) seg.append(h('button', { class: st.tab === id ? 'on' : '', role: 'tab', 'aria-selected': String(st.tab === id), onclick: () => { press(app); st.tab = id; render(); } }, l)); tabsx.append(seg);

    const keep = content.scrollTop; content.innerHTML = '';
    if (st.tab === 'ozet') {
      content.append(kv([
        [mine ? 'Maliyet esası (arsa + harç)' : 'İstenen fiyat', fmt(mine ? p.costBasis! : price)], ['m² fiyatı', fmtM2((mine ? p.costBasis! / (1 + TAPU_HARCI) : price) / p.area)],
        [mine ? 'Güncel piyasa değeri' : 'Tahmini piyasa değeri', p.growthKnown ? `${fmt(band.lo)} – ${fmt(band.hi)}` : `${fmt(band.lo)} – ${fmt(band.hi)}`],
        ['Gelişim potansiyeli', `${gl.label}${gl.sure ? '' : ' (tahmini)'}`], ['Zemin', p.soilKnown ? SOIL_LABEL[p.soil]! : 'Bilinmiyor — etüt gerekli'], ['Altyapı', `%${p.infra}`], ['Yol cephesi', `${p.roads}${p.corner ? ' (köşe parsel)' : ''}`],
        ...(!mine ? ([['Tapu harcı (%4)', fmt(Math.round(price * TAPU_HARCI))], ['Toplam nakit çıkışı (istenen fiyatla)', fmt(Math.round(price * (1 + TAPU_HARCI))), true]] as [string, string, boolean?][]) : []),
      ]), h('div', { class: 'hint' }, p.growthKnown ? 'Piyasa araştırması yapıldı: değer aralığı dar.' : 'Değer aralığı geniş: piyasa araştırması aralığı daraltır ve gelişim potansiyelini netleştirir. Gerçek değer aralığın içindedir.'));
      if (!mine) content.append(h('div', { class: 'hint' }, `Pazarlıkta satıcının gizli bir alt sınırı vardır; piyasa güveni yüksekken satıcılar daha inatçıdır (güven şu an ${s.macro.confidence.toFixed(0)}). Reddedilen teklifte aynı satıcı 3 gün pazarlığa yanaşmaz.`));
    } else if (st.tab === 'imar') {
      content.append(kv([['İmar durumu', ZONING_LABEL[p.zoning]!], ['TAKS (taban oturum)', p.taks.toFixed(2).replace('.', ',')], ['KAKS (emsal)', p.kaks.toFixed(2).replace('.', ',')], ['İzin verilen kat', `${p.maxFloors}`],
        ['Taban alanı', `${nf(p.area * p.taks)} m²`], ['Emsal alanı (toplam inşaat hakkı)', `${nf(p.area * p.kaks)} m²`], ['Ulaşılabilir kat (emsal/taban)', `${baseFloors}`]]),
        h('div', { class: 'hint' }, 'Brüt inşaat alanı ≈ emsal × 1,30 (bodrum, otopark, ortak alan emsal dışı); satılabilir alan ≈ emsal × 0,85 (konut).'),
        h('div', { class: 'lbl-s', style: 'margin-top:10px' }, 'Bu parselde yapılabilecek tipler'));
      const g = h('div', { class: 'opts' });
      for (const t of BUILDING_TYPES) { const b = buildable(p, t.id); g.append(h('button', { class: b.reason ? '' : 'on', disabled: !!b.reason, title: b.reason ?? '' }, t.label)); }
      content.append(g, h('div', { class: 'hint' }, 'Pasif tiplerin neden yapılamadığını Fizibilite sekmesinde görebilirsiniz.'));
    } else if (st.tab === 'zemin') {
      const pend = (k: 'soil' | 'market') => s.scheduled.find((x) => x.type === 'survey' && x.data.parcelId === p.id && x.data.kind === k);
      const survey = (k: 'soil' | 'market', label: string) => {
        const known = k === 'soil' ? p.soilKnown : p.growthKnown, pd = pend(k);
        return h('button', { class: 'btn gold', disabled: known || !!pd, onclick: () => { const r = app.store.run('OrderSurvey', { parcelId: p.id, kind: k }); if (r.ok) { press(app, 'confirm'); toast(`${label} sipariş edildi (${SURVEY_DAYS[k]} gün).`); } else { app.audio.sfx('error'); toast(r.error); } } },
          known ? 'Tamamlandı' : pd ? `Sürüyor (${formatDate(pd.day)})` : `${label} yaptır · ${fmt(surveyCost(p, k))}`);
      };
      const soilMult = SOIL_COST[p.soil] ?? 1;
      content.append(kv([['Zemin', p.soilKnown ? SOIL_LABEL[p.soil]! : 'Bilinmiyor'], ['Hafriyat + temel maliyet etkisi', p.soilKnown ? (soilMult === 1 ? 'Ek maliyet yok' : `+${pct(soilMult - 1)}`) : 'Bilinmiyor (beklenen +%10, olası aralık %0 – %40)'], ['Altyapı (elektrik, su, kanal)', `%${p.infra}`]]),
        statBar('Altyapı', p.infra), h('div', { style: 'margin:12px 0' }, survey('soil', 'Zemin etüdü')),
        h('div', { class: 'hint' }, `Etüt yaptırmadan alırsanız zemin sürprizi (yüksek yeraltı suyu, dolgu…) hafriyat ve temel maliyetini %${nf((Math.max(...Object.values(SOIL_COST)) - 1) * 100)}'e kadar artırabilir. Etüt ${SURVEY_DAYS.soil} gün sürer.`));
      void STAGE_SHARES;
    } else if (st.tab === 'cevre') {
      const g = growthLabel(p);
      content.append(statBar('Gelir düzeyi', d.income), statBar('Nüfus yoğunluğu', d.density), statBar('Altyapı', d.infra), statBar('Ulaşım', d.transit), statBar('Ticari potansiyel', d.commercial), statBar('Rekabet', d.competition),
        kv([['Konut satış fiyatı (bölge, standart)', fmtM2(Math.round(d.saleBase * 100 * (s.cityMarket[p.city]?.housingIndex ?? 1)))], ['Bölge gelişim eğilimi', `${pct(d.growth)} (ortalama)`], ['Bu parselin gelişim potansiyeli', `${g.label}${g.sure ? '' : ' (tahmini)'}`]]),
        h('div', { style: 'margin:12px 0' }, h('button', { class: 'btn gold', disabled: p.growthKnown || !!s.scheduled.find((x) => x.data.parcelId === p.id && x.data.kind === 'market'), onclick: () => { const r = app.store.run('OrderSurvey', { parcelId: p.id, kind: 'market' }); if (r.ok) { press(app, 'confirm'); toast(`Piyasa araştırması sipariş edildi (${SURVEY_DAYS.market} gün).`); } else { app.audio.sfx('error'); toast(r.error); } } }, p.growthKnown ? 'Tamamlandı' : `Piyasa araştırması · ${fmt(surveyCost(p, 'market'))}`)),
        h('div', { class: 'hint' }, 'Yüksek potansiyelli arsalar piyasadan hızlı değerlenir. Araştırma gerçek potansiyeli ve değer aralığını netleştirir.'));
    } else {
      const types = h('div', { class: 'opts' }), quals = h('div', { class: 'opts' });
      for (const t of BUILDING_TYPES) { const b = buildable(p, t.id); types.append(h('button', { class: st.type === t.id ? 'on' : '', onclick: () => { press(app); st.type = t.id; render(); } }, t.label + (b.reason ? ' ⚠' : ''))); }
      for (const q of QUALITIES) quals.append(h('button', { class: st.q === q.id ? 'on' : '', onclick: () => { press(app); st.q = q.id; render(); } }, q.label));
      const plan = planProject(s, p, st.type, st.q, mine ? p.costBasis : undefined);
      content.append(h('div', { class: 'lbl-s' }, 'Yapı tipi'), types, h('div', { class: 'lbl-s' }, 'Kalite'), quals, planTable(plan, { landOwned: mine, soilKnown: p.soilKnown }));
    }
    content.scrollTop = keep;

    // --- Eylem çubuğu ---
    act.innerHTML = '';
    if (!mine) {
      const priceOf = () => Math.round(price * st.offer / 100);
      const out = h('b', {}, fmt(priceOf()));
      const rng = h('input', { type: 'range', min: 80, max: 100, step: 1, value: st.offer, 'aria-label': 'Teklif yüzdesi' }) as HTMLInputElement;
      rng.style.setProperty('--p', `${(st.offer - 80) * 5}%`);
      rng.oninput = () => { st.offer = Number(rng.value); out.textContent = fmt(priceOf()); rng.style.setProperty('--p', `${(st.offer - 80) * 5}%`); lab.textContent = `Teklif %${st.offer}`; };
      const lab = h('small', { class: 'mute', style: 'min-width:74px' }, `Teklif %${st.offer}`);
      const locked = s.clock.day < p.negoLockUntil;
      act.append(h('div', { class: 'offer' }, lab, rng, out),
        h('button', { class: 'btn gold lg', disabled: locked, onclick: () => {
          const r = app.store.run('BuyLand', { parcelId: p.id, offerPct: st.offer / 100 });
          if (!r.ok) { app.audio.sfx('error'); toast(r.error); return; }
          const ev = r.events[0]!;
          if (ev.type === 'LAND_REJECTED') { app.audio.sfx('error'); app.haptic('medium'); toast('Satıcı bu fiyata yanaşmadı. 3 gün sonra yeniden deneyebilirsiniz.'); render(); return; }
          tapuAnimation(app, p.hood, `${city.label} / ${d.label}`, p.area, ev.data!.price as number, ev.data!.harc as number, () => { render(); onChange?.(); });
        } }, locked ? `Pazarlık kilitli (${p.negoLockUntil - s.clock.day} gün)` : 'Pazarlık yap ve satın al'));
      void reservePrice;
    } else {
      const proj = s.projects.find((x) => x.id === p.projectId);
      if (proj) act.append(h('span', { class: 'chip good' }, `Proje: ${proj.name}`), h('span', { class: 'mute', style: 'font-size:12px;flex:1' }, 'Projeyi Projeler sekmesinden yönetebilirsiniz.'));
      else {
        act.append(h('button', { class: 'btn gold lg', onclick: () => { press(app); openProjectWizard(app, p.id, () => { render(); onChange?.(); }); } }, 'Proje başlat'));
        const fair = fairValue(s, p);
        act.append(h('button', { class: 'btn', onclick: () => { if (!confirm(`Hızlı satış: ${formatMoney(Math.round(fair * QUICK_SALE_DISCOUNT))} (piyasa değerinin %92'si). Onaylıyor musunuz?`)) return; const r = app.store.run('SellLandQuick', { parcelId: p.id }); if (r.ok) { press(app, 'confirm'); toast('Arsa satıldı.'); close(); } else toast(r.error); } }, `Hızlı sat · ${fmt(Math.round(fair * QUICK_SALE_DISCOUNT))}`));
        if (p.listed) act.append(h('span', { class: 'chip warn' }, `Satışta: ${fmt(Math.round(fair * p.listed.askMult))}`), h('button', { class: 'btn', onclick: () => { app.store.run('UnlistLand', { parcelId: p.id }); press(app); render(); } }, 'Satıştan çek'));
        else {
          const out = h('b', {}, fmt(Math.round(fair * st.listMult / 100)));
          const rng = h('input', { type: 'range', min: 90, max: 125, step: 1, value: st.listMult, 'aria-label': 'İstenen fiyat' }) as HTMLInputElement; rng.style.setProperty('--p', `${(st.listMult - 90) / 35 * 100}%`);
          rng.oninput = () => { st.listMult = Number(rng.value); out.textContent = fmt(Math.round(fair * st.listMult / 100)); rng.style.setProperty('--p', `${(st.listMult - 90) / 35 * 100}%`); };
          act.append(h('div', { class: 'offer', style: 'min-width:300px' }, h('small', { class: 'mute' }, 'İstenen'), rng, out), h('button', { class: 'btn', onclick: () => { const r = app.store.run('ListLand', { parcelId: p.id, askMult: st.listMult / 100 }); if (r.ok) { press(app, 'confirm'); toast('Arsa satışa konuldu; alıcılar haftalık gelir.'); render(); } else toast(r.error); } }, 'Satışa koy'));
        }
      }
    }
  };
  render(); document.body.append(modal);
}

/** Tapu animasyonu: belge belirir, kırmızı mühür basılır. */
function tapuAnimation(app: App, hood: string, where: string, area: number, price: number, harc: number, done: () => void) {
  const el = h('div', { class: 'tapu', role: 'dialog', 'aria-label': 'Tapu senedi' }, h('div', { class: 'doc' }, h('h2', {}, 'TAPU SENEDİ'),
    kv([['Taşınmaz', hood], ['Konum', where], ['Yüzölçümü', `${nf(area)} m²`], ['Bedel', fmt(price)], ['Tapu harcı', fmt(harc)], ['Malik', app.store.state.company!.name]]), h('div', { class: 'stamp' }, 'SATIN ALINDI')));
  document.body.append(el);
  const reduced = app.settings.reduced;
  const t1 = window.setTimeout(() => { app.audio.sfx('stamp'); app.haptic('heavy'); }, reduced ? 0 : 560);
  const end = () => { clearTimeout(t1); clearTimeout(t2); el.remove(); done(); };
  const t2 = window.setTimeout(end, reduced ? 1200 : 2400);
  el.addEventListener('pointerdown', end);
}
