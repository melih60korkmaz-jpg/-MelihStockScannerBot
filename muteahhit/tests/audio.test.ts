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
