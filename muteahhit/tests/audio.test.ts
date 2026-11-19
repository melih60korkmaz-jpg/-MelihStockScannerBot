import { describe, expect, it } from 'vitest';
import { buildMusicBus, newMusicState, scheduleBars, type MusicMode } from '../src/audio/music';

/** Sahte AudioContext: düğüm sayısını sayar (Web Audio olmadan müzik yoğunluğu karşılaştırılır). */
function fakeCtx() {
  const counts = { osc: 0, nodes: 0 };
  const param = (): any => new Proxy({ value: 0 }, { get: (t, k) => (k === 'value' ? t.value : () => undefined), set: (t, k, v) => { (t as any)[k] = v; return true; } });
  const node = (kind: string): any => { counts.nodes++; if (kind === 'osc') counts.osc++; const o: any = new Proxy({}, { get: (_t, k) => { if (k === 'connect') return (x: any) => x ?? o; if (['frequency', 'gain', 'detune', 'Q', 'delayTime'].includes(String(k))) return param(); if (k === 'getChannelData') return () => new Float32Array(8); return () => undefined; }, set: () => true }); return o; };
  const ctx: any = { sampleRate: 8000, currentTime: 0, createOscillator: () => node('osc'), createGain: () => node('g'), createBiquadFilter: () => node('f'), createConvolver: () => node('c'), createDelay: () => node('d'), createBufferSource: () => node('s'), createBuffer: () => ({ getChannelData: () => new Float32Array(8) }) };
  return { ctx, counts };
}
const run = (mode: MusicMode, bars = 16) => { const { ctx, counts } = fakeCtx(); const bus = buildMusicBus(ctx, ctx.createGain()); scheduleBars(ctx, bus, 0, bars, newMusicState(42, mode)); return counts.osc; };

describe('müzik kipleri', () => {
  it('oyun içi müzik menüden daha seyrek; gergin kip daha yoğun; hepsi hatasız üretir', () => {
    const menu = run('menu'), game = run('game'), tense = run('tense');
    expect(game).toBeLessThan(menu); expect(tense).toBeGreaterThan(game); expect(menu).toBeGreaterThan(0);
  });
  it('aynı tohum aynı müziği üretir (deterministik)', () => { expect(run('game')).toBe(run('game')); expect(run('tense')).toBe(run('tense')); });
  it('varsayılan kip menü', () => { expect(newMusicState(1).mode).toBe('menu'); });
});

import { newQuality, qualityStep } from '../src/render3d/quality';
describe('otomatik kalite politikası', () => {
  it('iki düşük pencere → kademe düşer; tek düşük pencere → düşmez', () => {
    const q = newQuality('high'); expect(qualityStep(q, 20)).toBeNull(); expect(qualityStep(q, 58)).toBeNull(); expect(q.bad).toBe(0);
    expect(qualityStep(q, 20)).toBeNull(); expect(qualityStep(q, 20)).toBe('mid'); expect(q.tier).toBe('mid');
  });
  it('10 sn iyi FPS → tavana kadar yükselir; tavanı aşmaz', () => {
    const q = newQuality('high'); q.tier = 'low'; let got: string | null = null; for (let i = 0; i < 5; i++) got = qualityStep(q, 29) ?? got; expect(got).toBe('mid'); expect(q.tier).toBe('mid');
    for (let i = 0; i < 5; i++) got = qualityStep(q, 60) ?? got; expect(q.tier).toBe('high'); for (let i = 0; i < 10; i++) qualityStep(q, 60); expect(q.tier).toBe('high');
    const c = newQuality('mid'); for (let i = 0; i < 20; i++) qualityStep(c, 60); expect(c.tier).toBe('mid');
  });
  it('yükselip hemen düşme iki kez olursa yükseltme bırakılır (salınım yok)', () => {
    const q = newQuality('high'); q.tier = 'mid';
    for (let k = 0; k < 2; k++) { for (let i = 0; i < 5; i++) qualityStep(q, 60); expect(q.tier).toBe('high'); qualityStep(q, 10); qualityStep(q, 10); expect(q.tier).toBe('mid'); }
    for (let i = 0; i < 12; i++) qualityStep(q, 60); expect(q.tier).toBe('mid'); expect(q.upFails).toBe(2);
  });
});
