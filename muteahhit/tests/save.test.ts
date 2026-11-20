import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { advanceDays } from '../src/sim/engine';
import { MemoryKV, SaveManager } from '../src/save/manager';
import { pack, unpack } from '../src/save/serialize';

function game() {
  const s = newGameState(5);
  dispatch(s, 'CreateCompany', { name: 'Kayıt Yapı', founderBackground: 'eski_kalfa', startCity: 'ankara' });
  dispatch(s, 'HireStaff', { type: 'usta' }); dispatch(s, 'HireStaff', { type: 'isci' });
  advanceDays(s, 200);
  return s;
}

describe('kayıt', () => {
  it('kaydet → yükle → devam = hiç kaydetmeden devam ile birebir aynı (ÇIKIŞ KRİTERİ)', () => {
    const a = game();
    const r = unpack(pack(a));
    expect(r.ok).toBe(true);
    const b = (r as any).state;
    advanceDays(a, 400); advanceDays(b, 400);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
  it('bozuk metni ve değiştirilmiş içeriği yakalar', () => {
    const t = pack(game());
    expect(unpack('{{{').ok).toBe(false);
    const env = JSON.parse(t); env.payload = env.payload.replace('Kayıt Yapı', 'Hile Yapı');
    const r = unpack(JSON.stringify(env));
    expect(r).toMatchObject({ ok: false, reason: 'sağlama' });
  });
  it('tutarsız ekonomiyi (kasa ≠ defter) reddeder', () => {
    const s = game(); s.company!.cash += 100;
    expect(unpack(pack(s))).toMatchObject({ ok: false, reason: 'yapı' });
  });
  it('gelecek sürümü reddeder, eski sürüm için migrasyon yoksa nedenini söyler', () => {
    const s = game(); s.meta.version = 99;
    expect(unpack(pack(s))).toMatchObject({ ok: false, reason: 'gelecek-sürüm' });
    const s0 = game(); s0.meta.version = 0;
    expect(unpack(pack(s0))).toMatchObject({ ok: false, reason: 'yapı' });
  });
  it('3 otomatik slot döner; bozulan en yeni kayıttan önceki geçerliye döner', async () => {
    const kv = new MemoryKV(); let t = 1000;
    const m = new SaveManager(kv, () => t++);
    const s = game();
    const slots: string[] = [];
    for (let i = 0; i < 4; i++) { advanceDays(s, 30); slots.push(await m.autosave(s)); }
    expect(slots).toEqual(['auto1', 'auto2', 'auto3', 'auto1']);
    expect((await m.list()).length).toBe(3);
    await kv.set('slot:auto1', '{bozuk'); // en yeni kayıt bozuldu
    const latest = await m.loadLatestValid();
    expect(latest?.slot).toBe('auto3');
    expect(latest?.skipped[0]).toContain('auto1');
  });
  it('manuel slot sınırını denetler', async () => {
    const m = new SaveManager(new MemoryKV());
    await expect(m.saveManual(9, game())).rejects.toThrow();
    expect(await m.saveManual(2, game())).toBe('manual2');
  });
});

import { FallbackKV } from '../src/save/manager';
describe('depolama yedeği', () => {
  it('IndexedDB oluşturulamazsa bellekte çalışır ve kalıcı değil der', async () => {
    const kv = new FallbackKV(() => { throw new Error('engelli'); });
    expect(kv.persistent).toBe(false);
    const m = new SaveManager(kv); await m.autosave(game());
    expect((await m.list()).length).toBe(1);
  });
  it('çalışırken IndexedDB hata verirse bellek moduna geçer, veri kaybolmaz', async () => {
    const bad = { get: async () => { throw new Error('x'); }, set: async () => { throw new Error('x'); }, delete: async () => {}, keys: async () => [] };
    const kv = new FallbackKV(() => bad); expect(kv.persistent).toBe(true);
    const m = new SaveManager(kv); await m.saveManual(1, game());
    expect(kv.persistent).toBe(false);
    expect((await m.load('manual1')).ok).toBe(true);
  });
});

import { LocalKV } from '../src/save/manager';
describe('depo kademeleri (IndexedDB → localStorage → bellek)', () => {
  const fakeLs = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
  it('takılan birincil depo zaman aşımıyla localStorage kademesine düşer; veri kalıcı kalır', async () => {
    const hang: any = { get: () => new Promise(() => {}), set: () => new Promise(() => {}), delete: () => new Promise(() => {}), keys: () => new Promise(() => {}) }; const ls = fakeLs();
    const kv = new FallbackKV(() => hang, () => new LocalKV(ls), 30); await kv.set('a', '1'); expect(await kv.get('a')).toBe('1'); expect(kv.persistent).toBe(true);
    const kv2 = new FallbackKV(() => hang, () => new LocalKV(ls), 30); expect(await kv2.get('a')).toBe('1'); expect(await kv2.keys()).toEqual(['a']);
  });
  it('localStorage da yoksa/kota doluysa belleğe düşer, çökmez; persistent false', async () => {
    const full: any = { getItem: () => null, setItem: () => { throw new Error('kota'); }, removeItem: () => {}, key: () => null, length: 0 };
    const kv = new FallbackKV(() => { throw new Error('idb yok'); }, () => new LocalKV(full), 30); await kv.set('x', 'y'); expect(await kv.get('x')).toBe('y'); expect(kv.persistent).toBe(false);
  });
});
