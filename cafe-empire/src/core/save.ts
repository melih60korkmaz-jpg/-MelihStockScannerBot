import type { GameState } from './types';
import { PRODUCTS } from '../data/catalog';
import { migrateBolge } from './region';
const KEY = 'cafe-empire.save.v1';
export const serialize = (s: GameState): string => JSON.stringify(s);
/** Eski kayıtlara sonradan eklenen alanları güvenle tamamlar. */
export function migrate(s: GameState): GameState {
  for (const b of s.subeler) {
    for (const p of PRODUCTS) b.menu[p.id] ??= { aktif: false, fiyat: 1, kalite: 1 };
    b.promo ??= {}; b.bugun.gider.sadakat ??= 0; b.bugun.gider.komisyon ??= 0; for (const r of b.gecmis) { r.gider.sadakat ??= 0; r.gider.komisyon ??= 0; }
    b.yat ??= {}; b.partiler ??= {}; b.minStok ??= {}; b.tedarikci ??= {}; b.kullanim ??= {}; b.siparisler ??= []; b.ilanlar ??= []; b.adaylar ??= []; b.sikayetler ??= []; b.malKalite ??= 1; b.backlog ??= 0;
    b.mesai ??= { aci: 0, kapa: 0 } as never; b.sonAdet ??= {}; b.otoSiparis ??= true;
    b.mus ??= { ortSiparis: 0, ortBekleme: 0, hizmet: 70, urunKal: 70, fiyatMemn: 70, tekrar: 0, sadik: 0, sikayet: 0 } as never;
    for (const e of b.staff) { e.vardiya ??= 'tam'; e.izin ??= 0; e.mesai ??= false as never; e.yorgunluk ??= 0; e.motivasyon ??= e.memnuniyet ?? 70; e.devam ??= 90; e.hasta ??= 0; e.prim ??= 0; e.sikayet ??= 0; }
  }
  s.sosyal ??= { takipci: 150, son: {} }; s.ilanYenile ??= {}; s.ilprog ??= {}; s.basarim ??= {}; s.gorevler ??= []; s.stat ??= { musteri: 0, netKar: 0, karGun: 0, enIyiGun: 0, fiyatDeg: 0 }; s.franchise ??= []; s.merkez ??= { depo: 0, mutfak: 0 }; s.tur ??= -1; s.ayar ??= { gunSn: 180, ozet: 'her', ses: true, muzik: true, ses_vol: 0.6 };
  s.ayar.gunSn ??= 180;
  migrateBolge(s); s.capexBugun ??= 0; s.rapor ??= []; for (const r of s.rapor) { r.gider.sadakat ??= 0; r.gider.komisyon ??= 0; r.cogs ??= 0; r.brut ??= 0; r.alim ??= 0; r.capex ??= 0; r.nakit ??= 0; }
  return s;
}
export function deserialize(j: string): GameState { const s = JSON.parse(j) as GameState; if (!s || s.v !== 1 || !Array.isArray(s.subeler)) throw new Error('bozuk kayıt'); return migrate(s); }
/* ---- Çift katmanlı kayıt: localStorage + IndexedDB yedeği (depolama doluluğu / temizlenme durumunda kurtarır) ---- */
let yedekJson: string | null = null;   // localStorage yazılamazsa bellekte tutulan son geçerli kayıt
const DB_AD = 'cafe-empire', DB_DEPO = 'kv';
function idb(): Promise<IDBDatabase | null> {
  return new Promise((ok) => { try { if (typeof indexedDB === 'undefined') return ok(null); const r = indexedDB.open(DB_AD, 1); r.onupgradeneeded = () => { r.result.createObjectStore(DB_DEPO); }; r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); r.onblocked = () => ok(null); } catch { ok(null); } });
}
async function idbYaz(json: string): Promise<void> { const db = await idb(); if (!db) return; try { const tx = db.transaction(DB_DEPO, 'readwrite'); tx.objectStore(DB_DEPO).put(json, 'kayit'); await new Promise<void>((ok) => { tx.oncomplete = () => ok(); tx.onerror = () => ok(); tx.onabort = () => ok(); }); } catch { /* yok say */ } db.close(); }
async function idbOku(): Promise<string | null> { const db = await idb(); if (!db) return null; try { const tx = db.transaction(DB_DEPO, 'readonly'), r = tx.objectStore(DB_DEPO).get('kayit'); const v = await new Promise<unknown>((ok) => { r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); db.close(); return typeof v === 'string' ? v : null; } catch { db.close(); return null; } }
async function idbSil(): Promise<void> { const db = await idb(); if (!db) return; try { const tx = db.transaction(DB_DEPO, 'readwrite'); tx.objectStore(DB_DEPO).delete('kayit'); await new Promise<void>((ok) => { tx.oncomplete = () => ok(); tx.onerror = () => ok(); tx.onabort = () => ok(); }); } catch { /* yok say */ } db.close(); }
const dkOf = (j: string | null): number => { try { const o = j ? (JSON.parse(j) as { dk?: number; v?: number; subeler?: unknown }) : null; return o && o.v === 1 && Array.isArray(o.subeler) ? (o.dk ?? 0) : -1; } catch { return -1; } };
export function save(s: GameState): boolean { const j = serialize(s); yedekJson = j; let ok = false; try { localStorage.setItem(KEY, j); ok = true; } catch { /* kota dolu olabilir */ } void idbYaz(j); return ok; }
export function load(): GameState | null { try { const j = localStorage.getItem(KEY) ?? yedekJson; return j ? deserialize(j) : null; } catch { try { return yedekJson ? deserialize(yedekJson) : null; } catch { return null; } } }
/** Açılışta çağrılır: IndexedDB yedeği localStorage'dan yeniyse (ya da localStorage boşsa) onu kullanır. */
export async function kurtar(): Promise<boolean> {
  const ls = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })(), yd = await idbOku(), a = dkOf(ls), b = dkOf(yd);
  if (b > a) { yedekJson = yd; try { localStorage.setItem(KEY, yd!); } catch { /* bellekten yüklenir */ } return true; } return false;
}
export function wipe(): void { yedekJson = null; try { localStorage.removeItem(KEY); } catch { /* yok say */ } void idbSil(); }
