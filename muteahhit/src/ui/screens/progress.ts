import { ACHIEVEMENTS, LEVEL_DEFS, OFFICE_STEPS, QUESTS, officeFor } from '../../data';
import { badge, buildingArt } from '../art';
import { formatDate } from '../../core/calendar';
import { levelChecks, metric, nextLevel, officeStepFor } from '../../sim/progress';
import { h, press, toast } from '../dom';
import { fmt, nf } from '../components';
import type { App } from '../app';
import type { GameState } from '../../core/types';
import { TL } from '../../core/money';

const fmtVal = (label: string, v: number) => (label.includes('₺') ? nf(v / 1e6, 1) + ' M' : nf(v));

/** Seviye kartı: şirket unvanı, sonraki seviye şartları ve ofis yükseltme. */
export function levelCard(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, cur = LEVEL_DEFS[c.level - 1]!, nl = nextLevel(s), card = h('div', { class: 'card' });
  card.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Şirket seviyesi'), h('span', { class: 'chip good' }, `Seviye ${c.level}/${LEVEL_DEFS.length}`)), h('div', { style: 'font:600 20px var(--display,inherit);margin:4px 0' }, cur.label));
  if (nl) {
    const checks = levelChecks(s, nl.level), done = checks.filter((x) => x.ok).length;
    card.append(h('div', { class: 'meter' }, h('i', { style: `width:${Math.round((done / Math.max(1, checks.length)) * 100)}%;background:var(--gold)` })), h('div', { class: 'mute', style: 'font-size:12px;margin:6px 0 4px' }, `Sonraki: ${nl.label}`),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:5px' }, ...checks.map((x) => h('span', { class: `chip ${x.ok ? 'good' : ''}`, title: `${x.label}: ${fmtVal(x.label, x.have)} / ${fmtVal(x.label, x.need)}` }, `${x.label.replace(' (₺)', '')} ${fmtVal(x.label, x.have)}/${fmtVal(x.label, x.need)}`))));
  } else card.append(h('div', { class: 'mute', style: 'font-size:12px' }, 'En üst seviyedesiniz.'));
  const st = officeStepFor(s);
  card.append(h('div', { class: 'mute', style: 'font-size:12px;margin-top:8px' }, `Ofis: ${officeFor(c.office).label} · ${officeFor(c.office).capacity} kişi.${st ? ` Sonraki ofis ${fmt(TL(st.costTL))}, seviye ${st.minLevel} ister.` : ''}`));
  if (st) card.append(h('button', { class: 'btn', style: 'margin-top:6px;min-height:38px', disabled: c.level < st.minLevel || c.cash < TL(st.costTL), onclick: () => { const r = app.store.run('UpgradeOffice', {}); if (r.ok) { app.audio.sfx('stamp'); toast('Yeni ofise taşındınız!'); refresh(); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Ofisi büyüt'));
  return card;
}

/** Görev kartı: sıradaki 3 görev ve ilerleme; başarım penceresi. */
/** İlk görevler için rehber: sıradaki açık görevin yapılacağı sekme. Yeni oyuncuyu "önce ne yapayım?" sorusundan kurtarır. */
const COACH: Record<string, string> = { q_arsa: 'harita', q_ekip: 'operasyon', q_proje: 'projeler', q_teslim: 'projeler', q_satis: 'projeler', q_kapat: 'projeler', q_kredi: 'finans', q_makine: 'operasyon', q_sube: 'harita', q_ihale: 'ihale' };
export function nextQuest(s: GameState): { id: string; tab: string } | null {
  const q = QUESTS.find((x) => s.progress.quests[x.id] === undefined && COACH[x.id]); return q ? { id: q.id, tab: COACH[q.id]! } : null;
}
export function questsCard(app: App): HTMLElement {
  const s = app.store.state, open = QUESTS.filter((q) => s.progress.quests[q.id] === undefined).slice(0, 3), doneN = Object.keys(s.progress.quests).length;
  const card = h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Görevler'), h('span', { class: 'mute', style: 'font-size:12px' }, `${doneN}/${QUESTS.length} tamam`)));
  if (!open.length) card.append(h('div', { class: 'empty' }, 'Tüm görevler tamamlandı!'));
  for (const q of open) {
    const have = Math.min(q.n, metric(s, q.m)), pct = Math.round((have / q.n) * 100), rw = [q.r.cash ? fmt(TL(q.r.cash)) : '', q.r.rep ? `+${q.r.rep} itibar` : '', q.r.score ? `+${q.r.score} not` : ''].filter(Boolean).join(' · ');
    const go = nextQuest(s)?.id === q.id ? h('button', { class: 'btn gold coachgo', style: 'margin-top:6px;min-height:34px;font-size:13px', onclick: () => { press(app); app.openTab?.(COACH[q.id] as any); } }, 'Şimdi yap ▸') : null;
    card.append(h('div', { style: 'padding:6px 0;border-top:1px solid var(--line)' }, h('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, h('b', {}, q.t), h('span', { class: 'mute', style: 'font-size:11px' }, rw)), h('div', { class: 'mute', style: 'font-size:12px' }, q.x), h('div', { class: 'meter', style: 'margin-top:4px' }, h('i', { style: `width:${pct}%;background:var(--accent2)` })), ...(go ? [go] : [])));
  }
  card.append(h('button', { class: 'btn', style: 'margin-top:8px;min-height:38px', onclick: () => { press(app); openAchievements(app); } }, `Başarımlar ${Object.keys(s.progress.ach).length}/${ACHIEVEMENTS.length}`));
  return card;
}

export function openAchievements(app: App): void {
  const s = app.store.state, modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Başarımlar' }); const close = () => modal.remove(); modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  let sec: 'rozet' | 'seviye' | 'koleksiyon' = 'rozet';
  const body = h('div', {}), tabs = h('div', { class: 'seg', style: 'margin-bottom:8px' });
  const draw = () => {
    tabs.innerHTML = ''; for (const [id, l] of [['rozet', '🏆 Rozetler'], ['seviye', '👑 Seviyeler'], ['koleksiyon', '🏗️ Koleksiyon']] as const) tabs.append(h('button', { class: sec === id ? 'on' : '', onclick: () => { press(app); sec = id; draw(); } }, l));
    body.innerHTML = '';
    if (sec === 'rozet') { const g = h('div', { class: 'badges' }); for (const a of ACHIEVEMENTS) { const got = s.progress.ach[a.id] !== undefined; g.append(h('div', { class: `bcard ${got ? 'got' : ''}`, title: a.x }, h('div', { class: 'bico', html: badge(a.m, achTier(a), got, 52) }), h('b', {}, a.t), h('small', { class: 'mute' }, got ? `Açıldı · ${formatDate(s.progress.ach[a.id]!)}` : a.x))); } body.append(g); }
    else if (sec === 'seviye') { const c = s.company!; body.append(h('div', { class: 'ladder' }, ...LEVEL_DEFS.map((l) => { const reached = c.level >= l.level, off = OFFICE_STEPS.find((o) => o.minLevel === l.level); return h('div', { class: `lstep ${reached ? 'got' : ''} ${c.level + 1 === l.level ? 'next' : ''}` }, h('b', {}, `${reached ? '✅' : '🔒'} ${l.level}. ${l.label}`), h('small', { class: 'mute' }, [l.need.completed ? `${l.need.completed} proje` : '', l.need.nw ? `${fmt(TL(l.need.nw))} net varlık` : '', l.need.rep ? `${l.need.rep} itibar` : '', l.need.cities ? `${l.need.cities} şehir` : ''].filter(Boolean).join(' · ') || 'Başlangıç'), off ? h('span', { class: 'chip good' }, `🏢 ${officeFor(off.office).label} açılır`) : null); }))); }
    else { const done = s.projects.filter((p) => p.status === 'satildi' || p.status === 'tamamlandi'), wins = s.tenders.filter((t) => t.status === 'kazandi'); body.append(h('div', { class: 'lbl-s' }, `🏗️ Tamamlanan projeler (${done.length})`), h('div', { class: 'gallery' }, ...(done.length ? done.map((p) => h('div', { class: 'gitem' }, h('div', { class: 'gart', html: buildingArt(p.type, p.floors, 1, p.designSeed, p.quality) }), h('b', {}, p.name), h('small', { class: 'mute' }, p.status === 'satildi' ? `Kâr ${fmt(p.result?.profit ?? 0)}` : 'Teslim edildi'))) : [h('div', { class: 'empty' }, 'Henüz tamamlanan proje yok.')])), h('div', { class: 'lbl-s', style: 'margin-top:10px' }, `🤝 Kazanılan ihaleler (${wins.length})`), h('div', { class: 'gallery' }, ...(wins.length ? wins.map((t) => h('div', { class: 'gitem' }, h('div', { class: 'gart', html: buildingArt(t.type, Math.max(2, Math.round(t.area / 700) + 1), 1, t.id, t.quality) }), h('b', {}, t.title), h('small', { class: 'mute' }, fmt(t.bid?.price ?? 0)))) : [h('div', { class: 'empty' }, 'Henüz kazanılan ihale yok.')]))); }
  };
  modal.append(h('div', { class: 'card', style: 'width:min(820px,96vw);max-height:92vh;overflow:auto' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' }, h('h3', {}, `🏆 Başarımlar · ${Object.keys(s.progress.ach).length}/${ACHIEVEMENTS.length}`), h('button', { class: 'btn', onclick: close }, 'Kapat')), tabs, body));
  draw(); document.body.append(modal);
}

/** Başarımın rozet kademesi (aynı metrikteki sırasına göre 1–3). */
export function achTier(a: (typeof ACHIEVEMENTS)[number]): number { const same = ACHIEVEMENTS.filter((x) => x.m === a.m).sort((x, y) => x.n - y.n), i = same.findIndex((x) => x.id === a.id); return same.length < 2 ? 2 : i === 0 ? 1 : i === same.length - 1 ? 3 : 2; }
