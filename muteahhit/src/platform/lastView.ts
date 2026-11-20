/** Son bakılan ekran (sekme / açık şantiye). Yalnızca kolaylık: erişilemezse sessizce yok sayılır. */
const KEY = 'muteahhit.lastview.v1';
export type LastView = { company: string; tab: string; site?: number };
const TABS = ['sirket', 'harita', 'projeler', 'operasyon', 'ihale', 'finans', 'piyasa'];
export function saveView(v: LastView | null): void { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* yok say */ } }
export function loadView(company: string): LastView | null {
  try { const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LastView | null; return r && r.company === company && TABS.includes(r.tab) ? r : null; } catch { return null; }
}
