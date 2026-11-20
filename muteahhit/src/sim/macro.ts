import { gauss, rand, randInt } from '../core/rng';
import type { GameEvent, GameState, MacroPoint, NewsItem, Regime } from '../core/types';

/** Rejim parametreleri: hedef faiz/enflasyon/güven, malzeme aylık sürüklenmesi (%), süre (ay). */
export const REGIMES: Record<Regime, { label: string; rate: number; infl: number; conf: number; matDrift: number; months: [number, number]; blurb: string }> = {
  normal:       { label: 'Dengeli',        rate: 18, infl: 14, conf: 58, matDrift: 0,    months: [12, 30], blurb: 'Talep ve maliyetler dengeli.' },
  genisleme:    { label: 'Genişleme',      rate: 14, infl: 11, conf: 75, matDrift: 0.2,  months: [12, 24], blurb: 'Kredi ucuz, talep güçlü. Fırsat dönemi.' },
  asiri_isinma: { label: 'Aşırı ısınma',   rate: 22, infl: 19, conf: 52, matDrift: 0.6,  months: [6, 12],  blurb: 'Fiyatlar hızlı artıyor ama güven zayıflıyor. Dikkat.' },
  daralma:      { label: 'Daralma',        rate: 24, infl: 16, conf: 38, matDrift: -0.2, months: [8, 18],  blurb: 'Talep geriliyor, krediye erişim zorlaşıyor.' },
  kriz:         { label: 'Kriz',           rate: 38, infl: 34, conf: 18, matDrift: 1.4,  months: [4, 9],   blurb: 'Panik: faizler fırladı, satışlar donuyor, maliyetler artıyor.' },
  toparlanma:   { label: 'Toparlanma',     rate: 20, infl: 15, conf: 46, matDrift: -0.3, months: [8, 14],  blurb: 'Piyasa toparlanıyor; temkinli iyimserlik.' },
};

const TRANSITIONS: Record<Regime, [Regime, number][]> = {
  normal:       [['genisleme', 0.4], ['normal', 0.3], ['daralma', 0.3]],
  genisleme:    [['asiri_isinma', 0.6], ['normal', 0.4]],
  asiri_isinma: [['kriz', 0.5], ['daralma', 0.3], ['normal', 0.2]],
  daralma:      [['toparlanma', 0.55], ['kriz', 0.2], ['normal', 0.25]],
  kriz:         [['toparlanma', 1]],
  toparlanma:   [['normal', 0.6], ['genisleme', 0.4]],
};

const NEWS: Record<Regime, { text: string; tone: NewsItem['tone'] }> = {
  normal:       { text: 'Piyasa dengeleniyor: talep ve maliyetler normale dönüyor.', tone: 'info' },
  genisleme:    { text: 'Ekonomi ısınıyor: konut talebi artıyor, finansman ucuzluyor.', tone: 'ok' },
  asiri_isinma: { text: 'Uyarı: Konut fiyatları hızla yükseliyor; uzmanlar aşırı ısınmadan söz ediyor.', tone: 'warn' },
  daralma:      { text: 'Talep geriliyor: bankalar kredi musluğunu kısıyor, satışlar yavaşladı.', tone: 'bad' },
  kriz:         { text: 'EKONOMİK KRİZ: Piyasada panik, faizler fırladı, malzeme fiyatları sıçradı.', tone: 'bad' },
  toparlanma:   { text: 'Toparlanma sinyali: faizler gevşiyor, alıcılar geri dönüyor.', tone: 'ok' },
};

const HINTS = [
  'Güven endeksi düşüyor; bankalar kredi onayında temkinli davranmaya başladı.',
  'Konut fiyatlarındaki hızlı artış, ekonomistleri endişelendiriyor.',
  'Malzeme fiyatları son aylarda belirgin şekilde yükseldi.',
];

/** Zorluk: ilk (dengeli) dönemin uzunluğu = krizsiz "korumalı başlangıç" (ay) ve oynaklık çarpanı. */
export const DIFFICULTY_MACRO = { rahat: { calmMonths: 30, vol: 0.8 }, gercekci: { calmMonths: 20, vol: 1 }, acimasiz: { calmMonths: 10, vol: 1.3 } } as const;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function pushNews(s: GameState, text: string, tone: NewsItem['tone']) {
  s.news.unshift({ day: s.clock.day, text, tone });
  if (s.news.length > 30) s.news.length = 30;
}

/** Her ayın 1'inde çağrılır. Tüm rastgelelik 'econ' akışından (deterministik). */
export function macroMonthly(s: GameState, events: GameEvent[]): void {
  const m = s.macro, day = s.clock.day;
  const vol = DIFFICULTY_MACRO[s.meta.difficulty].vol;

  // Rejim geçişi (korumalı dönemde sadece normal/genişleme/toparlanma türü yumuşak geçişler)
  if (day >= m.regimeEnd) {
    const opts = TRANSITIONS[m.regime];
    const total = opts.reduce((a, [, w]) => a + w, 0);
    let x = rand(s.rng, 'econ') * total, next: Regime = opts[opts.length - 1]![0];
    for (const [r, w] of opts) { if ((x -= w) <= 0) { next = r; break; } }
    const [lo, hi] = REGIMES[next].months;
    const changed = next !== m.regime;
    m.regime = next; m.regimeSince = day; m.regimeEnd = day + randInt(s.rng, 'econ', lo, hi) * 30;
    if (changed) {
      const n = NEWS[next]; pushNews(s, n.text, n.tone);
      events.push({ type: 'MACRO_NEWS', day, ...(next === 'kriz' ? { pause: true } : {}), data: { regime: next, text: n.text, tone: n.tone } });
    }
  } else if (m.regime === 'asiri_isinma' && rand(s.rng, 'econ') < 0.35) {
    // Krizin ipuçları: oyuncu hazırlanabilsin
    const text = HINTS[randInt(s.rng, 'econ', 0, HINTS.length - 1)]!;
    pushNews(s, text, 'warn'); events.push({ type: 'MACRO_NEWS', day, data: { regime: m.regime, text, tone: 'warn' } });
  }

  const R = REGIMES[m.regime];
  m.policyRate = clamp(m.policyRate + (R.rate - m.policyRate) * 0.22 + gauss(s.rng, 'econ') * 0.7 * vol, 8, 70);
  m.inflation = clamp(m.inflation + (R.infl - m.inflation) * 0.25 + gauss(s.rng, 'econ') * 0.9 * vol, 3, 85);
  m.confidence = clamp(m.confidence + (R.conf - m.confidence) * 0.3 + gauss(s.rng, 'econ') * 2 * vol, 0, 100);
  const drift = m.inflation / 12 * 0.9 + R.matDrift + gauss(s.rng, 'econ') * 0.6 * vol;
  m.materialIndex = Math.max(40, m.materialIndex * (1 + drift / 100));

  const pt: MacroPoint = { day, regime: m.regime, policyRate: +m.policyRate.toFixed(2), inflation: +m.inflation.toFixed(2), confidence: +m.confidence.toFixed(1), materialIndex: +m.materialIndex.toFixed(2) };
  s.macroHistory.push(pt);
  if (s.macroHistory.length > 240) s.macroHistory.shift();
}
