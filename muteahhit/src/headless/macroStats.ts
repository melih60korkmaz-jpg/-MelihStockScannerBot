import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { advanceDays } from '../sim/engine';
import type { Regime } from '../core/types';

/** Makro denge raporu: `npm run sim:macro -- [koşu] [yıl] [zorluk]` */
const runs = Number(process.argv[2] ?? 300), years = Number(process.argv[3] ?? 20), diff = (process.argv[4] ?? 'gercekci');
const regs: Regime[] = ['normal', 'genisleme', 'asiri_isinma', 'daralma', 'kriz', 'toparlanma'];
const months: Record<string, number> = Object.fromEntries(regs.map((r) => [r, 0]));
let crises = 0, runsWithCrisis = 0, firstCrisisYears: number[] = [], rMin = 99, rMax = 0, iMin = 99, iMax = 0, mat: number[] = [], hintBeforeCrisis = 0, crisisTotal = 0;
for (let i = 0; i < runs; i++) {
  const s = newGameState(1000 + i, diff as any);
  dispatch(s, 'CreateCompany', { name: 'Test', founderBackground: 'emlakci', startCity: 'izmir', difficulty: diff });
  s.company!.cash = 1e15; s.ledgerBase = 1e15 - s.ledger.reduce((a, e) => a + e.amount, 0); // batmasın
  let prev: Regime = s.macro.regime, hadCrisis = false;
  for (let d = 0; d < 365 * years; d++) {
    const evs = advanceDays(s, 1);
    for (const e of evs) if (e.type === 'MONTH') {
      months[s.macro.regime]!++; rMin = Math.min(rMin, s.macro.policyRate); rMax = Math.max(rMax, s.macro.policyRate); iMin = Math.min(iMin, s.macro.inflation); iMax = Math.max(iMax, s.macro.inflation);
    }
    if (s.macro.regime === 'kriz' && prev !== 'kriz') { crises++; crisisTotal++; if (prev === 'asiri_isinma' || prev === 'daralma') hintBeforeCrisis++; if (!hadCrisis) { hadCrisis = true; runsWithCrisis++; firstCrisisYears.push(s.clock.day / 365); } }
    prev = s.macro.regime;
  }
  mat.push(s.macro.materialIndex);
}
const tot = Object.values(months).reduce((a, b) => a + b, 0);
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
console.log(`Zorluk: ${diff} · ${runs} koşu × ${years} yıl`);
console.log('Rejim payı:', regs.map((r) => `${r} %${(months[r]! / tot * 100).toFixed(1)}`).join(' · '));
console.log(`Kriz: koşu başına ${(crises / runs).toFixed(2)} (yıl başına ${(crises / runs / years).toFixed(3)}) · krizli koşu %${(runsWithCrisis / runs * 100).toFixed(0)} · ilk kriz medyan ${med(firstCrisisYears).toFixed(1)}. yıl · krizden önce uyarı rejimi %${(hintBeforeCrisis / Math.max(1, crisisTotal) * 100).toFixed(0)}`);
console.log(`Faiz ${rMin.toFixed(1)}–${rMax.toFixed(1)} · Enflasyon ${iMin.toFixed(1)}–${iMax.toFixed(1)} · ${years}. yılda malzeme endeksi medyan ${med(mat).toFixed(0)} (başlangıç 100)`);
