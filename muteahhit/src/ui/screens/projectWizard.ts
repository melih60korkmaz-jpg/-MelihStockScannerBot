import { BUILDING_TYPES, QUALITIES, buildingType, quality } from '../../data';
import { planProject } from '../../sim/projects';
import { h, press, toast } from '../dom';
import { fmt, pct, planTable } from '../components';
import type { App } from '../app';

/** Proje sihirbazı: yapı tipi → kalite → özet ve onay. Onayda tasarım bedeli ödenir (geri alınmaz). */
export function openProjectWizard(app: App, parcelId: number, onDone?: () => void): void {
  const st = { step: 0, type: '', q: 'standart' };
  const body = h('div', { class: 'bd' }), foot = h('div', { class: 'ft' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Proje sihirbazı', style: 'z-index:90' }, h('div', { class: 'card wiz' }, body, foot));
  const close = () => { modal.remove(); };
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const parcel = () => app.store.state.parcels.find((p) => p.id === parcelId);

  const render = () => {
    const s = app.store.state, p = parcel(); if (!p) { close(); return; }
    body.innerHTML = ''; foot.innerHTML = '';
    const titles = ['Yapı tipi', 'Kalite', 'Özet ve onay'];
    body.append(h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:8px' }, h('h2', { style: 'font-size:26px;flex:1' }, `Yeni proje · ${titles[st.step]}`), h('span', { class: 'mute', style: 'font-size:12px' }, `${p.hood} · ${p.area} m²`)));
    const plan = st.type ? planProject(s, p, st.type, st.q, p.costBasis) : null;

    if (st.step === 0) {
      const g = h('div', { class: 'tgrid' });
      for (const t of BUILDING_TYPES) {
        const pl = planProject(s, p, t.id, 'standart', p.costBasis);
        const card = h('div', { class: `card topt ${pl.ok ? '' : 'dis'} ${st.type === t.id ? 'sel' : ''}`, role: 'button', tabindex: pl.ok ? 0 : -1, 'aria-disabled': String(!pl.ok), onclick: () => { if (!pl.ok) { app.audio.sfx('error'); toast(pl.reason ?? ''); return; } press(app); st.type = t.id; render(); } },
          h('h3', {}, t.label), h('p', {}, pl.ok ? t.blurb : (pl.reason ?? '')),
          pl.ok ? h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, h('span', { class: `chip ${pl.margin >= 0.08 ? 'good' : pl.margin >= 0 ? 'warn' : 'bad'}` }, 'Marj ', h('b', {}, pct(pl.margin, 0))), h('span', { class: 'chip' }, `${pl.months.min}–${pl.months.max} ay`), h('span', { class: 'chip' }, h('b', {}, fmt(pl.cost.total)))) : null);
        g.append(card);
      }
      body.append(g, h('div', { class: 'hint' }, 'Marj, standart kalite ve bugünkü fiyatlarla hesaplanan tahmindir.'));
    } else if (st.step === 1) {
      const g = h('div', { class: 'tgrid' });
      for (const q of QUALITIES) {
        const pl = planProject(s, p, st.type, q.id, p.costBasis);
        g.append(h('div', { class: `card topt ${st.q === q.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); st.q = q.id; render(); } },
          h('h3', {}, q.label), h('p', {}, q.blurb),
          h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, h('span', { class: `chip ${pl.margin >= 0.08 ? 'good' : pl.margin >= 0 ? 'warn' : 'bad'}` }, 'Marj ', h('b', {}, pct(pl.margin, 0))), h('span', { class: 'chip' }, h('b', {}, fmt(pl.cost.total))), h('span', { class: 'chip' }, 'Bölge uyumu ', h('b', {}, `×${pl.fit.toFixed(2)}`)))));
      }
      body.append(g, h('div', { class: 'hint' }, 'Bölge uyumu: lüks yalnızca yüksek gelirli bölgede, ekonomik ise düşük gelirli bölgede daha iyi satar.'));
    } else if (plan) {
      const t = buildingType(st.type)!, q = quality(st.q)!;
      body.append(h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px' }, h('span', { class: 'chip' }, h('b', {}, t.label)), h('span', { class: 'chip' }, h('b', {}, q.label))), planTable(plan, { landOwned: true, soilKnown: p.soilKnown }),
        h('div', { class: 'hint' }, `Onayladığınızda mimari ve proje bedeli olan ${fmt(plan.cost.designFee)} hemen ödenir ve geri alınmaz. Kalan bedeller inşaat aşamalarında ödenecek.`));
      // Finansman kontrolü: ilk aylar için önerilen nakit (bütçenin %30'u) — yoksa çıkış yolları gösterilir
      const cashAfter = s.company!.cash - plan.cost.designFee, need = Math.round(plan.cost.total * 0.3);
      if (cashAfter < need) body.append(h('div', { class: 'card', style: 'margin-top:8px;border-color:var(--warn)' }, h('b', {}, 'Finansman gerekli'), h('div', { class: 'hint', style: 'margin:4px 0 8px' }, `Tasarım bedelinden sonra nakdiniz ${fmt(cashAfter)}; inşaatın ilk aylarında yaklaşık ${fmt(need)} gerekir. Nakit biterse şantiye durur. Projeyi onaylayıp aşağıdaki yollardan finansman bulabilirsiniz.`),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, h('button', { class: 'btn', onclick: () => { close(); app.openTab?.('finans', 'krediler'); document.querySelectorAll('.pfile,.modal').forEach((m) => m.remove()); } }, 'Kredi seçenekleri'), h('button', { class: 'btn', onclick: () => { close(); app.openTab?.('finans', 'ortaklar'); document.querySelectorAll('.pfile,.modal').forEach((m) => m.remove()); } }, 'Yatırımcı bul (proje sonrası)'))));
      else body.append(h('div', { class: 'hint' }, `Nakit yeterli: tasarımdan sonra ${fmt(cashAfter)} kalır (önerilen başlangıç nakdi ${fmt(need)}).`));
      if (!p.soilKnown) body.append(h('div', { class: 'hint warn' }, 'Zemin etüdü yapılmadı: gerçek zemin maliyeti plandan farklı çıkabilir. Arsa dosyasından etüt yaptırabilirsiniz.'));
    }

    const back = h('button', { class: 'btn', onclick: () => { press(app); if (st.step === 0) close(); else { st.step--; render(); } } }, st.step === 0 ? 'Vazgeç' : 'Geri');
    const canNext = st.step === 0 ? !!st.type : true;
    const next = h('button', { class: 'btn gold', disabled: !canNext || (st.step === 2 && plan ? !plan.ok : false), onclick: () => {
      if (st.step < 2) { press(app); st.step++; render(); return; }
      const r = app.store.run('CreateProject', { parcelId, type: st.type, quality: st.q });
      if (!r.ok) { app.audio.sfx('error'); toast(r.error); return; }
      press(app, 'stamp', 'heavy'); toast('Proje oluşturuldu: tasarım bedeli ödendi.'); close(); onDone?.();
    } }, st.step < 2 ? 'İleri' : `Onayla ve tasarımı öde${plan ? ` (${fmt(plan.cost.designFee)})` : ''}`);
    const create = (go: boolean) => {
      const r = app.store.run('CreateProject', { parcelId, type: st.type, quality: st.q });
      if (!r.ok) { app.audio.sfx('error'); toast(r.error); return; }
      press(app, 'stamp', 'heavy'); toast('Proje oluşturuldu: tasarım bedeli ödendi.'); close(); onDone?.();
      if (go) { const pr = app.store.state.projects.find((x) => x.parcelId === parcelId); if (pr) { document.querySelectorAll('.pfile').forEach((m) => m.parentElement?.remove()); app.openSite(pr.id); } }
    };
    foot.append(back, ...(st.step === 2 ? [h('button', { class: 'btn', disabled: !plan?.ok, onclick: () => create(false) }, 'Yalnızca oluştur'), h('button', { class: 'btn gold', disabled: !plan?.ok, onclick: () => create(true) }, `Öde ve şantiyeye git${plan ? ` (${fmt(plan.cost.designFee)})` : ''}`)] : [next]));
  };
  render(); document.body.append(modal);
}
