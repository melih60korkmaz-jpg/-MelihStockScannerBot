import { formatDate } from '../../core/calendar';
import { TL, type Money } from '../../core/money';
import { BANKS, bank } from '../../data';
import { creditCapacity, debtTotal, quoteLoan, rateFor, type LoanKind } from '../../sim/loans';
import { MAX_EQUITY_SOLD, equityQuote, investmentOf, quoteInvestor } from '../../sim/investors';
import { h, press, toast } from '../dom';
import { fmt, pct } from '../components';
import type { App } from '../app';

const KIND_LABEL: Record<string, string> = { ticari: 'Ticari kredi', insaat: 'İnşaat kredisi', makine: 'Makine kredisi', kisa: 'Kısa vadeli finansman' };
const KIND_BLURB: Record<LoanKind, string> = { ticari: '12–60 ay eşit taksit. Nakit ihtiyacı için.', insaat: 'Projeye bağlı kredi hattı (bütçenin %70\'ine kadar). Nakit bitince otomatik çekilir; yalnızca faiz ödenir; satış/hakediş gelirleri önce hattı kapatır.', makine: '12–48 ay. Makine alımında %20 peşinatla (Operasyon › Makine).', kisa: '3 ay vade, sonunda tek ödeme. En çok 3 milyon ₺. Pahalıdır.' };

export type BankSub = 'krediler' | 'ortaklar';

/** Finans › Krediler: limit, açık krediler, yeni kredi, erken ödeme, yeniden yapılandırma. */
export function loansView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, cap = creditCapacity(s);
  const kpis = h('div', { class: 'kpis' },
    h('div', { class: 'kpi', html: `<small>Kredi notu</small><b>${Math.round(c.creditScore)}</b>` }), h('div', { class: 'kpi', html: `<small>Toplam borç</small><b>${fmt(debtTotal(s))}</b>` }), h('div', { class: 'kpi', html: `<small>Kullanılabilir limit</small><b>${fmt(cap.available)}</b>` }), h('div', { class: 'kpi', html: `<small>Politika faizi</small><b>%${s.macro.policyRate.toFixed(1)}</b>` }));
  const list = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Açık krediler'));
  if (!s.loans.length) list.append(h('div', { class: 'empty' }, 'Açık krediniz yok.'));
  for (const l of s.loans) {
    const b = bank(l.bank)!, pr = l.projectId !== undefined ? s.projects.find((p) => p.id === l.projectId) : null;
    list.append(h('div', { class: 'row', style: 'flex-wrap:wrap;min-height:56px;padding:6px 0;gap:8px' },
      h('div', { class: 'lbl', style: 'min-width:170px' }, `${KIND_LABEL[l.kind]} · ${b.label}`, h('small', {}, `Faiz %${l.rate.toFixed(1)}/yıl · ${l.kind === 'insaat' ? `limit ${fmt(l.limit ?? 0)}${pr ? ' · ' + pr.name : ''}` : `kalan ${l.remaining} ay · sonraki ödeme ${formatDate(l.nextDue)}`}`)),
      l.missed ? h('span', { class: 'chip bad' }, `${l.missed} taksit kaçırıldı`) : null,
      h('div', { class: 'num', style: 'min-width:110px;text-align:right' }, fmt(l.balance), h('small', { class: 'mute', style: 'display:block' }, l.payment > 0 ? `${fmt(l.payment)}/ay` : 'faiz/ay')),
      h('button', { class: 'btn', style: 'min-height:38px', disabled: l.balance <= 0 || c.cash <= 0, onclick: () => { press(app); const amt = Math.min(l.balance, c.cash); if (!confirm(`${fmt(amt)} erken ödensin mi?`)) return; const r = app.store.run('RepayLoan', { loanId: l.id, amount: amt }); if (r.ok) { toast('Erken ödeme yapıldı.'); refresh(); } else toast(r.error); } }, 'Erken öde'),
      l.missed || l.kind === 'kisa' ? h('button', { class: 'btn', style: 'min-height:38px', onclick: () => { press(app); if (!confirm('Vade uzatılsın mı? Faiz +4 puan, %3 masraf.')) return; const r = app.store.run('RestructureLoan', { loanId: l.id }); if (r.ok) { toast('Kredi yeniden yapılandırıldı.'); refresh(); } else toast(r.error); } }, 'Yapılandır') : null));
  }
  const nw = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Yeni kredi'), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:8px' }, 'Faiz = politika faizi + banka marjı + not primi + ürün primi. Notunuz yükseldikçe ucuzlar.'),
    ...(['ticari', 'insaat', 'kisa'] as LoanKind[]).map((k) => {
      const offers = BANKS.filter((b) => b.products.includes(k));
      return h('div', { style: 'padding:8px 0;border-top:1px solid var(--line)' }, h('b', {}, KIND_LABEL[k]), h('div', { class: 'mute', style: 'font-size:12px' }, KIND_BLURB[k]),
        h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px' }, ...offers.map((b) => { const q = quoteLoan(s, { kind: k, bank: b.id, amount: 1, ...(k === 'insaat' ? { projectId: s.projects.find((p) => (p.status === 'taslak' || p.status === 'insaat') && !s.loans.some((l) => l.kind === 'insaat' && l.projectId === p.id))?.id as number } : {}) }); const blocked = c.creditScore < b.minScore;
          return h('button', { class: 'btn', style: 'min-height:40px;flex-direction:column;align-items:flex-start;gap:0', disabled: blocked, title: blocked ? `En az ${b.minScore} not gerekir` : b.blurb, onclick: () => { press(app); openLoanForm(app, k, b.id, refresh); } }, h('span', {}, b.label), h('small', { class: 'mute' }, blocked ? `Not ≥ ${b.minScore}` : `%${rateFor(s, b.id, k).toFixed(1)} · en çok ${fmt(q.maxAmount || cap.available)}`)); })));
    }));
  return h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, kpis, h('div', { class: 'cols' }, list, nw));
}

function openLoanForm(app: App, kind: LoanKind, bankId: string, refresh: () => void): void {
  const s = app.store.state, b = bank(bankId)!;
  const projs = s.projects.filter((p) => (p.status === 'taslak' || p.status === 'insaat') && !s.loans.some((l) => l.kind === 'insaat' && l.projectId === p.id));
  const [t0, t1] = kind === 'ticari' ? [12, 60] : kind === 'makine' ? [12, 48] : kind === 'insaat' ? [24, 24] : [3, 3];
  const st = { amount: TL(1_000_000), term: Math.min(t1, 36), projectId: projs[0]?.id as number | undefined };
  const out = h('div', { class: 'mute', style: 'margin:8px 0;min-height:70px' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Kredi başvurusu' });
  const close = () => modal.remove(); modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const req = () => ({ kind, bank: bankId, amount: st.amount, term: st.term, ...(kind === 'insaat' ? { projectId: st.projectId } : {}) });
  const upd = () => {
    const q = quoteLoan(s, req() as never); const lines = q.ok || q.rate ? [`Faiz %${q.rate.toFixed(1)}/yıl · vade ${q.term} ay`, q.schedule === 'annuity' ? `Aylık taksit ${fmt(q.payment)}` : q.schedule === 'interest' ? `Aylık faiz (kullanıldıkça) ≈ ${fmt(q.payment)}` : `Aylık faiz ${fmt(q.payment)} · vade sonunda anapara`, `Dosya masrafı ${fmt(q.fee)}`] : [];
    out.innerHTML = ''; for (const l of lines) out.append(h('div', {}, l)); if (!q.ok) out.append(h('div', { class: 'neg' }, q.error ?? '')); ok.disabled = !q.ok;
  };
  const amt = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 10000, step: 50000, value: Math.round(st.amount / 100), 'aria-label': 'Tutar (₺)', oninput: () => { st.amount = TL(Math.max(0, Number((amt as HTMLInputElement).value) || 0)); upd(); } });
  const term = h('input', { type: 'range', min: t0, max: t1, step: kind === 'ticari' || kind === 'makine' ? 6 : 1, value: st.term, 'aria-label': 'Vade (ay)', oninput: () => { st.term = Number((term as HTMLInputElement).value); termL.textContent = `${st.term} ay`; upd(); } });
  const termL = h('b', {}, `${st.term} ay`);
  const sel = h('select', { class: 'input', 'aria-label': 'Proje', onchange: () => { st.projectId = Number((sel as HTMLSelectElement).value); upd(); } }, ...projs.map((p) => h('option', { value: String(p.id) }, p.name)));
  const ok = h('button', { class: 'btn gold', onclick: () => { const r = app.store.run('TakeLoan', req() as never); if (r.ok) { app.audio.sfx('confirm'); toast(kind === 'insaat' ? 'İnşaat kredi hattı açıldı.' : 'Kredi hesabınıza yattı.'); close(); refresh(); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Başvur') as HTMLButtonElement;
  modal.append(h('div', { class: 'card', style: 'width:min(460px,95vw)' }, h('h3', {}, `${KIND_LABEL[kind]} · ${b.label}`), h('div', { class: 'mute', style: 'font-size:12px' }, KIND_BLURB[kind]),
    kind === 'insaat' ? (projs.length ? h('label', { class: 'lbl-s', style: 'margin-top:8px' }, 'Proje', sel) : h('div', { class: 'neg', style: 'margin:8px 0' }, 'Kredi hattı için taslak/inşaat aşamasında, kredisi olmayan bir proje gerekir.')) : null,
    h('label', { class: 'lbl-s', style: 'margin-top:8px' }, kind === 'insaat' ? 'Hat limiti (₺)' : 'Tutar (₺)', amt), kind === 'ticari' || kind === 'makine' ? h('label', { class: 'lbl-s' }, 'Vade ', termL, term) : null, out,
    h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: close }, 'Vazgeç'), ok)));
  document.body.append(modal); upd();
}

/** Finans › Ortaklar: proje yatırımcısı ve şirket payı satışı. */
export function partnersView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!;
  const projs = s.projects.filter((p) => p.status === 'taslak' || p.status === 'insaat');
  const inv = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Proje yatırımcıları'), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, 'Bütçenin %20–%50\'sini yatırımcı karşılar; proje kapanınca anapara + kâr payı ödenir (zararda yalnızca anapara). Düşük itibar daha çok pay ister.'));
  if (!projs.length) inv.append(h('div', { class: 'empty' }, 'Taslak veya inşaat halinde proje yok.'));
  for (const p of projs) {
    const cur = investmentOf(s, p.id);
    if (cur) { inv.append(h('div', { class: 'row', style: 'min-height:48px' }, h('div', { class: 'lbl' }, p.name, h('small', {}, `Yatırımcı fonu ${fmt(cur.amount)} · kâr payı %${(cur.share * 100).toFixed(0)}`)), h('span', { class: 'chip good' }, 'Ortak var'))); continue; }
    let v = 30; const lab = h('b', {}, ''), info = h('small', { class: 'mute' }, '');
    const rng = h('input', { type: 'range', min: 20, max: 50, step: 5, value: v, style: 'width:140px', 'aria-label': 'Fon oranı', oninput: () => { v = Number((rng as HTMLInputElement).value); upd(); } });
    const go = h('button', { class: 'btn gold', style: 'min-height:38px', onclick: () => { const r = app.store.run('TakeInvestor', { projectId: p.id, pct: v }); if (r.ok) { app.audio.sfx('confirm'); toast('Yatırımcı projeye girdi.'); refresh(); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Yatırımcı bul') as HTMLButtonElement;
    const upd = () => { const q = quoteInvestor(s, p, v); lab.textContent = `%${v}`; info.textContent = q.ok ? `${fmt(q.amount)} fon · kâr payı %${(q.share * 100).toFixed(0)}` : (q.error ?? ''); go.disabled = !q.ok; };
    inv.append(h('div', { class: 'row', style: 'min-height:54px;flex-wrap:wrap;gap:8px' }, h('div', { class: 'lbl', style: 'min-width:150px' }, p.name, info), lab, rng, go)); upd();
  }
  const sold = 100 - c.ownership; let pc = 10; const eq = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Şirket payı'), h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>Sizdeki pay</small><b>%${c.ownership}</b>` }), h('div', { class: 'kpi', html: `<small>Satılan pay</small><b>%${sold}</b>` }), h('div', { class: 'kpi', html: `<small>Üst sınır</small><b>%${MAX_EQUITY_SOLD}</b>` })),
    h('div', { class: 'mute', style: 'font-size:12px;margin:8px 0' }, 'Net değer üzerinden değerlenir; itibarınız yüksekse daha iyi fiyat alırsınız. Satılan pay oranında her proje kârından ortaklara temettü ödenir. Pay geri alınamaz.'));
  const lab2 = h('b', {}, ''), info2 = h('div', { class: 'mute', style: 'font-size:13px;min-height:20px' }, ''); const go2 = h('button', { class: 'btn gold', onclick: () => { if (!confirm(`Şirketin %${pc}'i satılsın mı? Geri alınamaz.`)) return; const r = app.store.run('SellEquity', { pct: pc }); if (r.ok) { app.audio.sfx('confirm'); toast('Pay satışı tamamlandı.'); refresh(); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Pay sat') as HTMLButtonElement;
  const rng2 = h('input', { type: 'range', min: 5, max: 40, step: 5, value: pc, style: 'flex:1', 'aria-label': 'Pay oranı', oninput: () => { pc = Number((rng2 as HTMLInputElement).value); upd2(); } });
  const upd2 = () => { const q = equityQuote(s, pc); lab2.textContent = `%${pc}`; info2.textContent = q.ok ? `Alacağınız: ${fmt(q.price as Money)}` : (q.error ?? ''); go2.disabled = !q.ok; };
  eq.append(h('div', { style: 'display:flex;gap:10px;align-items:center' }, lab2, rng2, go2), info2); upd2();
  void pct;
  return h('div', { class: 'cols' }, inv, eq);
}
