/** Faz 8 denge: ihale kazanma oranı / kâr marjı (teklif düzeyine göre) ve kredi faizleri. `npm run sim:bank` */
import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { TL } from '../core/money';
import { evaluateTender, generateTender } from '../sim/tenders';
import { rateFor } from '../sim/loans';

const levels = [0.8, 0.84, 0.88, 0.92, 0.96, 1.0];
const N = 300;
const mid: Record<string, { w: number; margin: number; n: number }> = {};
for (const l of levels) mid[l] = { w: 0, margin: 0, n: 0 };
for (let seed = 1; seed <= N; seed++) {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Test Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  Object.assign(s.company!, { reputation: 45, creditScore: 650, satisfaction: 70 }); s.company!.stats.completed = 4; for (let i = 0; i < 8; i++) dispatch(s, 'HireStaff', { type: 'isci' });
  const t0 = generateTender(s, 'ankara'); if (!t0) continue;
  for (const l of levels) {
    const t = JSON.parse(JSON.stringify(t0)); const price = Math.round(t.refCost * l); const st = JSON.parse(JSON.stringify(s)); st.tenders = [t];
    t.bid = { price, day: st.clock.day, bond: 0 }; st.clock.day = t.evalDay; evaluateTender(st, t, []);
    const m = mid[l]!; m.n++; if (t.status === 'kazandi') { m.w++; m.margin += (price - t.trueCost) / price; }
  }
}
console.log('Teklif/yaklaşık maliyet → kazanma oranı, kazanınca ort. marj (orta seviye şirket: itibar 45, not 650)');
for (const l of levels) { const m = mid[l]!; console.log(`  ${(l * 100).toFixed(0)}%  kazanma %${((m.w / Math.max(1, m.n)) * 100).toFixed(0)}  marj %${m.w ? ((m.margin / m.w) * 100).toFixed(1) : '-'}  beklenen kâr/ihale ≈ %${(((m.w / Math.max(1, m.n)) * (m.w ? m.margin / m.w : 0)) * 100).toFixed(1)}`); }
const s = newGameState(1); dispatch(s, 'CreateCompany', { name: 'Test Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
for (const sc of [400, 550, 700, 850]) { s.company!.creditScore = sc; console.log(`not ${sc}: devlet %${rateFor(s, 'devlet', 'ticari')} özel %${rateFor(s, 'ozel', 'ticari')} hızlı %${rateFor(s, 'hizli', 'kisa')} (politika %${s.macro.policyRate})`); }
void TL;
