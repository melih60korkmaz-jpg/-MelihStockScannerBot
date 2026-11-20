import { TL, type Money } from '../core/money';
import { pick, rand, randInt } from '../core/rng';
import type { GameEvent, GameState, Rival } from '../core/types';
import { DEFAULT_CITIES, cityData } from '../data';
import { generateParcel } from './land';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const RIVAL_NAMES = ['Kuzey İnşaat', 'Akın Yapı', 'Demirhan A.Ş.', 'Atlas Müteahhitlik', 'Yıldız Holding', 'Başaran Yapı', 'Erdem İnşaat', 'Tuna Grup', 'Güney Yapı', 'Çınar Gayrimenkul', 'Ufuk İnşaat', 'Marmara Konut'];
const STYLES: Rival['style'][] = ['agresif', 'dengeli', 'temkinli'];
export const STYLE_LABEL: Record<Rival['style'], string> = { agresif: 'Agresif', dengeli: 'Dengeli', temkinli: 'Temkinli' };
export const ALIVE = 5;

function spawn(s: GameState, i: number): Rival {
  const used = new Set(s.rivals.map((r) => r.name)); const pool = RIVAL_NAMES.filter((n) => !used.has(n));
  const style = STYLES[i % 3]!, name = pool.length ? pick(s.rng, 'rivals', pool) : `Yeni Yapı ${randInt(s.rng, 'rivals', 10, 99)}`;
  return { id: s.nextId++, name, style, home: DEFAULT_CITIES[i % DEFAULT_CITIES.length]!, cash: TL(randInt(s.rng, 'rivals', 20, 120) * 1_000_000), rep: randInt(s.rng, 'rivals', 25, 80), tech: randInt(s.rng, 'rivals', 40, 88), projects: randInt(s.rng, 'rivals', 0, 3), wins: 0, failed: false, since: s.clock.day };
}
export function initRivals(s: GameState): void { s.rivals = []; for (let i = 0; i < ALIVE; i++) s.rivals.push(spawn(s, i)); }
export const aliveRivals = (s: GameState) => s.rivals.filter((r) => !r.failed);

function news(s: GameState, events: GameEvent[], text: string, tone: 'info' | 'warn' | 'bad' | 'ok' = 'info') {
  s.news.unshift({ day: s.clock.day, text, tone: tone as never }); if (s.news.length > 30) s.news.length = 30;
  events.push({ type: 'MACRO_NEWS', day: s.clock.day, data: { regime: s.macro.regime, text, tone } });
}

/** Aylık rakip hamleleri: arsa kapma, proje başlatma/teslim, iflas ve yeni girişler. Oyuncunun şehirlerinde etki eder. */
export function rivalsMonthly(s: GameState, events: GameEvent[]): void {
  if (!s.company) return; if (s.rivals.length === 0) initRivals(s);
  const reg = s.macro.regime, crisis = reg === 'kriz' || reg === 'daralma';
  for (const r of aliveRivals(s)) {
    const act = r.style === 'agresif' ? 0.55 : r.style === 'dengeli' ? 0.38 : 0.22, mood = crisis ? (r.style === 'temkinli' ? 0.3 : 0.6) : reg === 'asiri_isinma' ? 1.25 : 1;
    // gelir: devam eden projelerden aylık nakit akışı, kriz ve faiz baskısı
    const upkeep = TL(0.9 * 1_000_000) * (1 + r.projects * 0.5), income = r.projects * TL(1_300_000) * (crisis ? 0.7 : 1) * (0.8 + rand(s.rng, 'rivals') * 0.5);
    r.cash += Math.round(income - upkeep - (s.macro.policyRate / 1200) * Math.max(0, r.projects * TL(20_000_000)));
    if (rand(s.rng, 'rivals') < act * mood) {
      const cities = [...new Set([r.home, ...s.openCities])]; const city = pick(s.rng, 'rivals', cities); const roll = rand(s.rng, 'rivals');
      if (roll < 0.45 && r.cash > TL(8_000_000)) { // arsa kapma
        const cand = s.parcels.filter((p) => p.owner === 'market' && p.city === city);
        if (cand.length) { const best = cand.sort((a, b) => b.unitBase * b.area - a.unitBase * a.area)[Math.floor(rand(s.rng, 'rivals') * Math.min(3, cand.length))]!; s.parcels = s.parcels.filter((x) => x.id !== best.id); r.cash -= Math.round(best.unitBase * best.area * 0.9); r.last = 'arsa';
          if (s.openCities.includes(city)) news(s, events, `${r.name}, ${cityData(city)?.districts.find((d) => d.id === best.district)?.label ?? ''} (${cityData(city)?.label}) bölgesinde arsa aldı.`, 'warn'); }
      } else if (roll < 0.8 && r.cash > TL(15_000_000) && r.projects < 6) { // proje başlatma
        r.projects++; r.cash -= TL(10_000_000); r.last = 'proje'; const cm = s.cityMarket[city]; if (cm) cm.supply = (cm.supply ?? 0) + 1;
        if (s.openCities.includes(city) && rand(s.rng, 'rivals') < 0.5) news(s, events, `${r.name}, ${cityData(city)?.label}'de yeni bir konut projesi başlattı.`, 'info');
      } else if (r.projects > 0) { // teslim
        r.projects--; r.cash += TL(randInt(s.rng, 'rivals', 12, 30) * 1_000_000) * (crisis ? 0.6 : 1); r.rep = clamp(r.rep + 1, 0, 100); r.last = 'teslim';
      }
    }
    if (r.cash < 0 && (r.projects > 2 || r.cash < -TL(30_000_000))) rivalFails(s, r, events);
  }
  // yeni girişimci
  if (aliveRivals(s).length < ALIVE && rand(s.rng, 'rivals') < 0.12) { const n = spawn(s, randInt(s.rng, 'rivals', 0, 2)); s.rivals.push(n); news(s, events, `Yeni bir firma sektöre girdi: ${n.name}.`, 'info'); }
  // arz baskısı sönümlenir; fazla arz konut fiyatını hafifçe aşağı çeker
  for (const cm of Object.values(s.cityMarket)) { cm.supply = (cm.supply ?? 0) * 0.93; if ((cm.supply ?? 0) > 6) cm.housingIndex *= 0.9985; }
  if (s.rivals.length > 24) s.rivals = s.rivals.filter((r) => !r.failed || s.clock.day - r.since < 720).slice(-24);
}

function rivalFails(s: GameState, r: Rival, events: GameEvent[]): void {
  r.failed = true; r.projects = 0; r.last = 'iflas';
  news(s, events, `${r.name} iflas etti. Piyasaya ucuz arsalar çıkıyor.`, 'ok');
  const city = s.openCities.includes(r.home) ? r.home : (s.openCities[0] ?? r.home);
  if (s.cityMarket[city]) { const ds = cityData(city)!.districts; for (let i = 0; i < 2; i++) { const p = generateParcel(s, city, pick(s.rng, 'rivals', ds).id); p.askMult = 0.82; p.reserveMult = 0.78; s.parcels.push(p); } }
  events.push({ type: 'RIVAL_FAILED', day: s.clock.day, data: { name: r.name } });
}

/** İhalelerde rakip havuzu: yaşayan rakipler (kalıcı kimlik, itibar ve teknik güç). */
export function tenderRivals(s: GameState, n: number, ref: Money): { name: string; price: Money; tech: number; rep: number }[] {
  const pool = [...aliveRivals(s)]; const out: { name: string; price: Money; tech: number; rep: number }[] = [];
  while (out.length < n && pool.length) { const r = pool.splice(randInt(s.rng, 'rivals', 0, pool.length - 1), 1)[0]!; const aggr = r.style === 'agresif' ? 0.04 : r.style === 'temkinli' ? -0.03 : 0; out.push({ name: r.name, price: Math.round(ref * clamp(0.93 - aggr + (rand(s.rng, 'rivals') - 0.5) * 0.14, 0.82, 1.0)), tech: r.tech, rep: r.rep }); }
  return out;
}
/** Satış rekabeti: bölgedeki rakip arzı satış şansını azaltır (0.85–1). */
export const rivalPressure = (s: GameState, city: string): number => clamp(1 - 0.025 * (s.cityMarket[city]?.supply ?? 0), 0.85, 1);
