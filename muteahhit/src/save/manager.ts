import type { GameState } from '../core/types';
import { pack, unpack, type LoadResult, type SaveEnvelope } from './serialize';

/** Depolama soyutlaması: tarayıcıda IndexedDB, testte bellek. */
export interface KV {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryKV implements KV {
  m = new Map<string, string>();
  async get(k: string) { return this.m.get(k); }
  async set(k: string, v: string) { this.m.set(k, v); }
  async delete(k: string) { this.m.delete(k); }
  async keys() { return [...this.m.keys()]; }
}

export class IdbKV implements KV {
  private dbp: Promise<IDBDatabase>;
  constructor(name = 'muteahhit', private store = 'saves') {
    this.dbp = new Promise((res, rej) => {
      let r: IDBOpenDBRequest; try { r = indexedDB.open(name, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => r.result.createObjectStore(store);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    this.dbp.catch(() => {}); // reddi FallbackKV işler; yakalanmamış hata olmasın
  }
  private async tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.dbp;
    return new Promise((res, rej) => { const r = f(db.transaction(this.store, mode).objectStore(this.store)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  get(k: string) { return this.tx('readonly', (s) => s.get(k)) as Promise<string | undefined>; }
  async set(k: string, v: string) { await this.tx('readwrite', (s) => s.put(v, k)); }
  async delete(k: string) { await this.tx('readwrite', (s) => s.delete(k)); }
  keys() { return this.tx('readonly', (s) => s.getAllKeys()).then((a) => a.map(String)); }
}

/**
 * IndexedDB açılamazsa (gizli mod, engelleme, kota) sessizce belleğe düşer: oyun çalışmaya devam eder,
 * ama kayıtlar kalıcı olmaz (`persistent` false olur ve arayüz bunu gösterir).
 */
/** localStorage tabanlı depo (IndexedDB yoksa/takılıyorsa ikinci kademe). Kota dolarsa hata fırlatır → bellek kademesine düşülür. */
export class LocalKV implements KV {
  constructor(private ls: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> = localStorage, private prefix = 'muteahhit.kv.') { void this.ls.getItem(this.prefix + '_probe'); }
  async get(k: string) { return this.ls.getItem(this.prefix + k) ?? undefined; }
  async set(k: string, v: string) { this.ls.setItem(this.prefix + k, v); }
  async delete(k: string) { this.ls.removeItem(this.prefix + k); }
  async keys() { const out: string[] = []; for (let i = 0; i < this.ls.length; i++) { const k = this.ls.key(i); if (k && k.startsWith(this.prefix)) out.push(k.slice(this.prefix.length)); } return out; }
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('zaman aşımı')), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });

/**
 * Kalıcı depo kademeleri: IndexedDB → localStorage → bellek. Bir kademe hata verir ya da 2 sn içinde cevap vermezse
 * (gömülü görüntüleyicilerde IndexedDB takılabilir) bir sonrakine düşülür; oyun çalışmaya devam eder.
 * `persistent`: bellek dışında bir kademe çalışıyor mu (arayüz bunu gösterir).
 */
export class FallbackKV implements KV {
  persistent = true;
  private tiers: KV[] = []; private mem = new MemoryKV();
  constructor(make: () => KV = () => new IdbKV(), makeLocal: (() => KV) | null = () => new LocalKV(), private timeoutMs = 2000) {
    for (const mk of [make, makeLocal]) { if (!mk) continue; try { this.tiers.push(mk()); } catch { /* bu kademe yok */ } }
    if (!this.tiers.length) this.persistent = false;
  }
  private async run<T>(f: (k: KV) => Promise<T>): Promise<T> {
    while (this.tiers.length) { try { return await withTimeout(f(this.tiers[0]!), this.timeoutMs); } catch { this.tiers.shift(); if (!this.tiers.length) this.persistent = false; } }
    return f(this.mem);
  }
  get(k: string) { return this.run((s) => s.get(k)); }
  set(k: string, v: string) { return this.run((s) => s.set(k, v)); }
  delete(k: string) { return this.run((s) => s.delete(k)); }
  keys() { return this.run((s) => s.keys()); }
}

export const AUTOSAVE_SLOTS = 3;
export const MANUAL_SLOTS = 5;

export interface SlotInfo { slot: string; savedAt: number; company: string; day: number; cash: number }

/**
 * 3 dönen otomatik kayıt + N manuel slot. Yazma yeni slota yapılır, işaretçi sonra güncellenir:
 * yazma yarıda kesilse bile bir önceki geçerli kayıt bozulmaz.
 */
export class SaveManager {
  constructor(private kv: KV, private now: () => number = Date.now) {}

  async autosave(s: GameState): Promise<string> {
    const idx = Number((await this.kv.get('meta:autoIdx')) ?? '-1');
    const next = (idx + 1) % AUTOSAVE_SLOTS;
    const slot = `auto${next + 1}`;
    await this.kv.set(`slot:${slot}`, pack(s, this.now()));
    await this.kv.set('meta:autoIdx', String(next));
    return slot;
  }

  async saveManual(n: number, s: GameState): Promise<string> {
    if (!Number.isInteger(n) || n < 1 || n > MANUAL_SLOTS) throw new Error('Geçersiz slot');
    const slot = `manual${n}`;
    await this.kv.set(`slot:${slot}`, pack(s, this.now()));
    return slot;
  }

  async remove(slot: string): Promise<void> { await this.kv.delete(`slot:${slot}`); }

  async list(): Promise<SlotInfo[]> {
    const out: SlotInfo[] = [];
    for (const k of await this.kv.keys()) {
      if (!k.startsWith('slot:')) continue;
      try {
        const env = JSON.parse((await this.kv.get(k))!) as SaveEnvelope;
        out.push({ slot: k.slice(5), savedAt: env.savedAt, company: env.summary.company, day: env.summary.day, cash: env.summary.cash });
      } catch { out.push({ slot: k.slice(5), savedAt: 0, company: '(bozuk kayıt)', day: 0, cash: 0 }); }
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  }

  async load(slot: string): Promise<LoadResult> {
    const t = await this.kv.get(`slot:${slot}`);
    if (t === undefined) return { ok: false, reason: 'bozuk', detail: 'slot boş' };
    return unpack(t);
  }

  /** "Devam Et": en yeni GEÇERLİ kayıt; bozuk olanlar atlanır. */
  async loadLatestValid(): Promise<{ slot: string; state: GameState; skipped: string[] } | null> {
    const infos = await this.list();
    // Başlığı bile okunamayan kayıtlar listenin sonuna düşer; geçerli kayıt bulunsa da bildirilir.
    const skipped = infos.filter((i) => i.savedAt === 0).map((i) => `${i.slot}: bozuk kayıt`);
    for (const info of infos) {
      if (info.savedAt === 0) continue;
      const r = await this.load(info.slot);
      if (r.ok) return { slot: info.slot, state: r.state, skipped };
      skipped.push(`${info.slot}: ${r.detail}`);
    }
    return null;
  }
}
