import { TL, formatMoney } from '../core/money';
import { buildingType } from '../data';
import { TAPU_HARCI, askPrice } from '../sim/land';
import { planProject } from '../sim/projects';
import type { GameState, Parcel } from '../core/types';
import { askConfirm, press, toast } from './dom';
import type { App } from './app';

/** İnşaatı başlat: tek yer (şantiye, proje kartı, harita). Nakit düşükse bilgilendirir; onayda başlatır ve oyunu 1× hızda akıtır. */
export function startConstructionUI(app: App, projectId: number, after?: () => void, declined?: () => void): void {
  const s = app.store.state, p = s.projects.find((x) => x.id === projectId); if (!p || p.status !== 'taslak') return;
  const need = Math.round(p.budget.total * 0.2), cash = s.company!.cash, crew = s.staff.filter((x) => ['isci', 'usta', 'kalipci', 'demirci'].includes(x.type)).length;
  const notes: string[] = [];
  if (cash < need) notes.push(`• Nakit düşük (${formatMoney(cash)}); ilk aylar için yaklaşık ${formatMoney(need)} gerekir, nakit biterse şantiye durur (Finans › Krediler / Ortaklar).`);
  if (crew < 3) notes.push(`• Saha ekibiniz az (${crew} kişi): inşaat daha yavaş ilerler, eksik işçilik taşeronla karşılanır (Menü › Personel).`);
  const go = () => { const r = app.store.run('StartConstruction', { projectId }); if (!r.ok) { app.audio.sfx('error'); toast(r.error); declined?.(); return; } press(app, 'stamp', 'heavy'); toast('🏗️ İnşaat başladı!'); app.store.setSpeed(1); after?.(); };
  if (!notes.length) { go(); return; }
  void askConfirm(`${p.name} inşaatı başlatılsın mı?\n${notes.join('\n')}`, 'Yine de başlat', 'Vazgeç').then((ok) => { if (ok) go(); else declined?.(); });
}

/** Arsa + tasarım en çok nakdin %45'i: kalan %55 ekip, malzeme, makine ve ilk aylar için ayrılır. */
const RESERVE_SHARE = 0.45;
export interface QuickPick { parcel: Parcel; type: string; margin: number; land: number; design: number; budget: number; months: number }
/** Hızlı başlangıç önerisi: açık illerde nakitle alınabilen arsalar × yapı tipleri arasında en yüksek tahmini marj (hepsi gerçek plan hesabı). */
export function quickPick(s: GameState): QuickPick | null {
  const c = s.company!, types = ['mustakil', 'apartman', 'villa', 'ofis', 'site', 'depo', 'fabrika', 'is_merkezi']; let best: QuickPick | null = null;
  for (const p of s.parcels) {
    if (p.owner !== 'market' || !s.openCities.includes(p.city)) continue;
    const land = Math.round(askPrice(s, p) * (1 + TAPU_HARCI)); if (land > c.cash * 0.45) continue; // paranın yarısından fazlası arsaya gitmesin
    for (const t of types) {
      try { const pl = planProject(s, p, t, 'standart', land); if (!pl.ok || land + pl.cost.designFee > c.cash * RESERVE_SHARE || land + pl.cost.designFee + pl.cost.total * 0.85 > c.cash * 0.75) continue; if (Math.round((pl.months.min + pl.months.max) / 2) > 9) continue; if (!best || pl.margin > best.margin) best = { parcel: p, type: t, margin: pl.margin, land, design: pl.cost.designFee, budget: pl.cost.total, months: Math.round((pl.months.min + pl.months.max) / 2) }; } catch { /* uygun değil */ }
    }
  }
  return best;
}
export const quickText = (q: QuickPick) => `${q.parcel.hood} · ${buildingType(q.type)?.label} · ${q.parcel.area} m² · arsa ${formatMoney(q.land)} · tasarım ${formatMoney(q.design)} · inşaat bütçesi ${formatMoney(q.budget)} · ~${q.months} ay · tahmini marj %${Math.round(q.margin * 100)}`;

/** Tek dokunuşla: arsayı istenen fiyata satın al → projeyi oluştur → inşaatı başlat → şantiyeye git. */
export function quickStartRun(app: App, q: QuickPick): void {
  const warn = q.margin <= 0.02 ? '\n\n⚠️ Tahmini marj çok düşük/negatif: bu seçenek zarar edebilir.' : '';
  const left = app.store.state.company!.cash - q.land - q.design;
  void askConfirm(`Hızlı başlangıç\n${quickText(q)}\n\nKalan nakit: ${formatMoney(left)} (ekip, malzeme ve makine için).\nArsa satın alınacak, proje oluşturulacak ve inşaat başlayacak.${warn}`, 'Satın al ve başlat').then((ok) => {
    if (!ok) return;
    const owned = () => app.store.state.parcels.find((x) => x.id === q.parcel.id)?.owner === 'player';
    const b = app.store.run('BuyLand', { parcelId: q.parcel.id, offerPct: 1 }); if (!b.ok || !owned()) { app.audio.sfx('error'); toast(b.ok ? 'Arsa satın alınamadı.' : b.error); return; }
    const c = app.store.run('CreateProject', { parcelId: q.parcel.id, type: q.type, quality: 'standart' }); if (!c.ok) { app.audio.sfx('error'); toast(c.error); return; }
    const pr = app.store.state.projects.find((x) => x.parcelId === q.parcel.id)!; app.audio.sfx('stamp'); toast('📐 Arsa alındı, proje oluşturuldu.');
    const open = () => { app.store.run('SetSalesPolicy', { projectId: pr.id, presale: true }); app.openSite(pr.id); setTimeout(() => toast('🚜 İpucu: Menü › Personel bölümünden işçi ekleyin; makine almazsanız makineler günlük kiralanır.', 6000), 1500); };
    startConstructionUI(app, pr.id, open, () => app.openSite(pr.id));
  });
}
void TL;
