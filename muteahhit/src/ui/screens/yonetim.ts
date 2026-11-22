import { dateOf, formatDate } from '../../core/calendar';
import type { AgendaItem, Goal } from '../../core/types';
import { buildYearReport } from '../../sim/report';
import { DIV_INFO, divisionPL } from '../../sim/holding';
import { BUDGET_STEPS, DEPTS, GOAL_DEFS, STYLE_TR, boardVotes, deptCandidates, deptCost, deptEffect, deptPerf, getMgmt, gmQ, goalActual, majorityOf, modeId, refreshCands, suggestGoals } from '../../sim/mgmt';
import { unlockState } from '../../sim/unlock';
import { fmt, pct } from '../components';
import { askConfirm, h, press, toast } from '../dom';
import type { App } from '../app';

type Sub = 'ozet' | 'gm' | 'kurul' | 'hedef' | 'dept';
const mem = { sub: 'ozet' as Sub, goalPick: new Set<string>(['ciro', 'kar', 'proje', 'deger']), diff: 1 };
export const setYonetimSub = (s: string) => { if (['ozet', 'gm', 'kurul', 'hedef', 'dept'].includes(s)) mem.sub = s as Sub; };
const MODE_TR = { buyume: '📈 Büyüme planı', tasarruf: '✂️ Tasarruf programı', denge: '⚖️ Dengeli' } as const;
const goalFmt = (id: string, v: number): string => (['ciro', 'kar', 'borc'].includes(id) ? fmt(Math.round(v)) : id === 'deger' || id === 'pay' ? `%${v.toFixed(1)}` : String(Math.round(v)));

/** Yönetim Merkezi: genel müdür, yönetim kurulu, yıllık hedefler, departmanlar ve iştirak performansı. */
export function yonetimView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, ul = unlockState(s, 'yonetim');
  if (!ul.open) return h('div', { class: 'card emptyfx', style: 'text-align:center;padding:20px' }, h('div', { style: 'font-size:36px' }, '🔒'), h('b', {}, 'Yönetim Merkezi henüz kapalı'), h('div', { class: 'mute', style: 'font-size:13px;margin:6px 0' }, 'Açılma koşulları:'), ...ul.missing.map((x) => h('div', {}, '• ' + x)));
  refreshCands(s); const m = getMgmt(s);
  const act = (cmd: string, params: object, ok: string, sfx: 'confirm' | 'stamp' | 'coin' = 'confirm') => { const r = app.store.run(cmd as never, params as never); if (r.ok) { app.audio.sfx(sfx); toast(ok); } else { app.audio.sfx('error'); toast(r.error); } refresh(); return r.ok; };
  const seg = h('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:10px;align-self:flex-start;max-width:100%;overflow-x:auto' });
  const lab: [Sub, string][] = [['ozet', 'Özet'], ['gm', 'Genel Müdür'], ['kurul', `Kurul${m.meeting ? ' 🔔' : ''}`], ['hedef', 'Hedefler'], ['dept', 'Departmanlar']];
  for (const [id, l] of lab) seg.append(h('button', { class: mem.sub === id ? 'on' : '', onclick: () => { press(app); mem.sub = id; refresh(); } }, l));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  const row = (a: string, b: string | Node, sub = '') => h('div', { class: 'row', style: 'min-height:38px' }, h('div', { class: 'lbl' }, a, sub ? h('small', {}, sub) : null), typeof b === 'string' ? h('b', {}, b) : b);
  const bar = (v: number, tone = 'var(--accent2)') => h('div', { class: 'meter', style: 'min-width:90px;flex:1' }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(100, v)))}%;background:${tone}` }));

  if (mem.sub === 'ozet') {
    const pl = divisionPL(s, 1), openD = DEPTS.filter((d) => m.depts[d.id]!.open);
    body.append(h('div', { class: 'cols' },
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Yönetim durumu'),
        row('Genel müdür', m.gm ? `${m.gm.name} · beceri ${m.gm.skill}` : 'Atanmadı', m.gm ? `Etki katsayısı ${(gmQ(s) * 100).toFixed(0)}/100 · ${m.gm.mistakes} hatalı karar` : 'Sekme: Genel Müdür'),
        row('Yönetim kurulu güveni', bar(m.trust, m.trust >= 60 ? 'var(--ok)' : m.trust >= 35 ? 'var(--warn)' : 'var(--bad)')),
        row('Yönetim duruşu', MODE_TR[modeId(s)], m.mode && m.mode.until > s.clock.day ? `${formatDate(m.mode.until)} tarihine kadar` : 'Kurul toplantısında belirlenir'),
        row('Açık departman', `${openD.length}/${DEPTS.length}`), row('Yıllık hedefler', m.goals ? `${m.goals.items.length} hedef (${m.goals.year})` : 'Belirlenmedi', m.goals ? '' : 'Sekme: Hedefler'),
        m.meeting ? h('button', { class: 'btn gold', style: 'margin-top:8px', onclick: () => { press(app); mem.sub = 'kurul'; refresh(); } }, '🔔 Yönetim kurulu toplantısı bekliyor') : null),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'İştirak performansı (son ay)'), ...(Object.entries(DIV_INFO) as [keyof typeof DIV_INFO, { label: string; ico: string }][]).filter(([k]) => k !== 'merkez' || true).map(([k, info]) => { const d = pl[k]; return row(`${info.ico} ${info.label}`, h('b', { class: d.profit >= 0 ? 'pos' : 'neg' }, `${d.profit >= 0 ? '+' : ''}${fmt(d.profit)}`), `gelir ${fmt(d.revenue)} · gider ${fmt(d.cost)}`); }))),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Departman performansı'), ...DEPTS.map((d) => { const st = m.depts[d.id]!; return row(`${d.ico} ${d.label}`, st.open ? bar(deptPerf(s, d.id)) : h('span', { class: 'mute' }, s.company!.level >= d.level ? 'Kurulmadı' : `Seviye ${d.level}`)); })));
  }
  else if (mem.sub === 'gm') {
    const g = m.gm;
    if (g) body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Genel müdür'), h('h3', { style: 'font-size:20px' }, g.name),
      row('Beceri / tecrübe', `${g.skill} / ${Math.round(g.exp)}`), row('Yönetim tarzı', STYLE_TR[g.style]), row('Maaş', `${fmt(g.salary)}/ay`), row('Göreve başlama', formatDate(g.since)), row('Hatalı karar', String(g.mistakes)),
      h('div', { class: 'mute', style: 'font-size:12px;margin:6px 0' }, `Etkisi: satış akışı +%${(5 * gmQ(s)).toFixed(1)}, şantiye hızı +%${(3 * gmQ(s)).toFixed(1)}, ihale +${(3 * gmQ(s)).toFixed(1)} puan, departman etkileri +%${(15 * gmQ(s)).toFixed(0)}. Düşük beceri aylık hatalı karar riskini artırır (kasadan zarar).`),
      h('button', { class: 'btn danger', onclick: async () => { if (await askConfirm(`${g.name} görevden alınsın mı?\nKıdem tazminatı 4 maaş: ${fmt(g.salary * 4)}.`)) act('FireGM', {}, 'Genel müdür görevden alındı', 'stamp'); } }, 'Görevden al')));
    body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, g ? 'Adaylar (görevden alırsanız yenisini atayabilirsiniz)' : 'Genel müdür adayları'), ...m.cands.map((c) => h('div', { class: 'row', style: 'min-height:52px' }, h('div', { class: 'lbl' }, c.name, h('small', {}, `Beceri ${c.skill} · tecrübe ${c.exp} · ${STYLE_TR[c.style]} · ${fmt(c.salary)}/ay`)), h('button', { class: 'btn gold', style: 'min-height:36px;font-size:12px', disabled: !!g || s.company!.cash < c.salary * 2, onclick: () => act('HireGM', { candId: c.id }, `${c.name} genel müdür oldu`, 'stamp') }, 'Ata'))), h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, 'Adaylar üç ayda bir yenilenir. İşe giriş masrafı 2 maaştır.')));
  }
  else if (mem.sub === 'kurul') {
    const unl = unlockState(s, 'kurul');
    if (!unl.open) body.append(h('div', { class: 'card' }, h('b', {}, '🔒 Yönetim kurulu henüz kurulmadı'), ...unl.missing.map((x) => h('div', { class: 'mute' }, '• ' + x))));
    else {
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Kurul üyeleri'), ...m.board.map((b) => h('div', { class: 'row', style: 'min-height:48px' }, h('div', { class: 'lbl' }, `${b.name} · ${b.role}`, h('small', {}, `${b.growth > 0.3 ? 'Büyümeci' : b.growth < -0.2 ? 'Tasarrufçu' : 'Dengeli'} · ${b.risk > 0.3 ? 'riske açık' : b.risk < -0.3 ? 'temkinli' : 'ölçülü'}`)), bar(b.loyalty, b.loyalty >= 60 ? 'var(--ok)' : b.loyalty >= 35 ? 'var(--warn)' : 'var(--bad)')))));
      if (!m.meeting) body.append(h('div', { class: 'card' }, h('b', {}, 'Bekleyen toplantı yok'), h('div', { class: 'mute', style: 'font-size:13px' }, 'Kurul her çeyrek başında (Ocak, Nisan, Temmuz, Ekim) toplanır; gündem şirketin durumuna göre oluşur.')));
      else { body.append(h('div', { class: 'mute', style: 'font-size:12px' }, `Toplantı ${formatDate(m.meeting.day)} · ${Math.max(0, 45 - (s.clock.day - m.meeting.day))} gün içinde karara bağlanmazsa ertelenir ve kurul güveni düşer.`));
        for (const it of m.meeting.items) body.append(agenda(it)); }
    }
  }
  else if (mem.sub === 'hedef') {
    const year = dateOf(s.clock.day).year;
    if (m.goals) {
      const rep = buildYearReport(s, year);
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `${m.goals.year} yıllık hedefleri (zorluk ×${m.goals.diff})`), ...m.goals.items.map((g) => { const a = goalActual(s, g.id, rep), p = g.target > 0 ? a / g.target : 0; return h('div', { class: 'row', style: 'min-height:50px' }, h('div', { class: 'lbl' }, g.label, h('small', {}, `Hedef ${goalFmt(g.id, g.target)} · şu an ${goalFmt(g.id, a)}`)), h('div', { style: 'display:flex;gap:6px;align-items:center;min-width:130px' }, bar(p * 100, p >= 1 ? 'var(--ok)' : 'var(--accent2)'), h('b', {}, `%${Math.round(p * 100)}`))); }), h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, 'Yıl sonunda ağırlıklı ortalama hesaplanır: %85 üstü itibar, kredi notu ve kurul güveni kazandırır; %40 altı kaybettirir.')));
    } else {
      const sug = suggestGoals(s);
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `${year} yılı için hedef belirle`), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, 'Hedefler yılda bir kez belirlenir. Önerilen değerler son raporunuza göredir; zorluk seçimi hedefleri büyütür.'),
        ...sug.map((g: Goal) => { const on = mem.goalPick.has(g.id), t = Math.round(g.target * (g.id === 'sehir' || g.id === 'proje' ? 1 + (mem.diff - 1) * 0.5 : mem.diff)); return h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, g.label, h('small', {}, `Hedef: ${goalFmt(g.id, g.id === 'sehir' || g.id === 'proje' ? Math.max(1, t) : t)} ${GOAL_DEFS.find((x) => x.id === g.id)?.unit === '%' ? '' : ''}`)), h('button', { class: 'tog', role: 'switch', 'aria-checked': String(on), 'aria-label': g.label, onclick: () => { if (on) mem.goalPick.delete(g.id); else mem.goalPick.add(g.id); refresh(); } })); }),
        h('div', { class: 'seg', style: 'margin:8px 0' }, ...([['Rahat', 0.9], ['Dengeli', 1], ['İddialı', 1.25]] as const).map(([l, v]) => h('button', { class: mem.diff === v ? 'on' : '', onclick: () => { mem.diff = v; refresh(); } }, l))),
        h('button', { class: 'btn gold', onclick: () => act('SetGoals', { ids: [...mem.goalPick], diff: mem.diff }, 'Yıllık hedefler belirlendi', 'stamp') }, 'Hedefleri belirle')));
    }
    if (m.goalHist.length) body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Geçmiş yıllar'), ...m.goalHist.slice().reverse().map((g) => h('div', { class: 'row', style: 'min-height:40px' }, h('div', { class: 'lbl' }, `${g.year}`, h('small', {}, g.res.map((r) => `${r.label} %${Math.round(r.pct * 100)}`).join(' · '))), h('b', { class: g.score >= 85 ? 'pos' : g.score < 40 ? 'neg' : '' }, `%${g.score}`)))));
  }
  else {
    for (const d of DEPTS) {
      const st = m.depts[d.id]!, locked = s.company!.level < d.level, cands = st.open && !st.mgr ? deptCandidates(s, d.id) : [];
      body.append(h('div', { class: 'card' }, h('div', { style: 'display:flex;align-items:center;gap:8px' }, h('h3', { style: 'font-size:18px;flex:1' }, `${d.ico} ${d.label}`), st.open ? h('span', { class: 'chip good' }, `Performans ${deptPerf(s, d.id)}`) : h('span', { class: 'chip' }, locked ? `Seviye ${d.level}` : 'Kapalı')),
        h('div', { class: 'mute', style: 'font-size:12px' }, `Etkisi: ${d.effect}${st.open ? ` · şu anki etki %${Math.round(deptEffect(s, d.id) * 100)}` : ''}`),
        !st.open ? h('button', { class: 'btn gold', style: 'margin-top:6px', disabled: locked, onclick: () => act('OpenDept', { dept: d.id }, `${d.label} kuruldu`, 'stamp') }, locked ? `🔒 Seviye ${d.level} gerekir` : `Departmanı kur (${fmt(Math.round(d.openTL * 100 * s.costIndex))})`) : h('div', {},
          row('Aylık maliyet', fmt(deptCost(s, d.id))),
          h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, 'Bütçe düzeyi', h('small', {}, 'Düşük bütçe performansı düşürür')), h('div', { class: 'seg' }, ...BUDGET_STEPS.map((b) => h('button', { class: st.budget === b ? 'on' : '', onclick: () => act('SetDeptBudget', { dept: d.id, mult: b }, `Bütçe ×${b}`, 'confirm') }, `×${b}`)))),
          st.mgr ? h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, `Müdür: ${st.mgr.name}`, h('small', {}, `Beceri ${st.mgr.skill} · ${fmt(st.mgr.salary)}/ay`)), h('button', { class: 'btn', style: 'min-height:34px;font-size:12px', onclick: async () => { if (await askConfirm(`${st.mgr!.name} görevden alınsın mı? (3 maaş tazminat)`)) act('FireDeptMgr', { dept: d.id }, 'Müdür görevden alındı', 'stamp'); } }, 'Görevden al'))
            : h('div', {}, h('div', { class: 'lbl-s' }, 'Müdür adayları'), ...cands.map((c) => h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, c.name, h('small', {}, `Beceri ${c.skill} · ${STYLE_TR[c.style]} · ${fmt(c.salary)}/ay`)), h('button', { class: 'btn', style: 'min-height:34px;font-size:12px', disabled: s.company!.cash < c.salary * 2, onclick: () => act('HireDeptMgr', { dept: d.id, candId: c.id }, `${c.name} müdür oldu`, 'stamp') }, 'Ata')))),
          h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, `Personel: ${st.staff}`, h('small', {}, 'Kişi başı aylık yaklaşık 32 B₺')), h('div', { style: 'display:flex;gap:6px' }, h('button', { class: 'btn', style: 'min-height:34px;min-width:40px', disabled: st.staff <= 0, onclick: () => act('DeptStaff', { dept: d.id, delta: -1 }, 'Personel azaltıldı', 'confirm') }, '−'), h('button', { class: 'btn', style: 'min-height:34px;min-width:40px', disabled: st.staff >= 12, onclick: () => act('DeptStaff', { dept: d.id, delta: 1 }, 'Personel eklendi', 'confirm') }, '+'))))));
    }
  }
  return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);

  function agenda(it: AgendaItem): HTMLElement {
    const votes = it.votes ?? boardVotes(s, it), maj = it.majority ?? majorityOf(votes, it.options.length);
    return h('div', { class: 'card' }, h('h3', { style: 'font-size:18px' }, it.title), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, it.text),
      ...it.options.map((o, i) => { const n = votes.filter((v) => v === i).length, picked = it.picked === i;
        return h('button', { class: `btn choice${picked ? ' on' : ''}`, style: 'display:block;width:100%;text-align:left;margin-top:6px;padding:9px 12px;height:auto', disabled: it.picked !== undefined, onclick: () => act('DecideAgenda', { itemId: it.id, option: i }, 'Karar alındı', 'stamp') },
          h('b', {}, `${picked ? '✔ ' : ''}${o.l}`), h('span', { style: 'float:right;font-size:12px', class: i === maj ? 'pos-t' : 'mute' }, `${n}/${votes.length} üye${i === maj ? ' · çoğunluk' : ''}`), h('div', { class: 'mute', style: 'font-size:12px' }, o.d)); }));
  }
}
