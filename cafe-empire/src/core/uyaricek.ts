/** Şube uyarılarını öneri biçimine çevirir (stok, kuyruk, hijyen, şikâyet…). */
import { uyarilar } from '../ui/uyari';
import type { GameState } from './types';
import type { Oneri } from './rehber';
export function uyarilarCekirdek(s: GameState): Oneri[] {
  const out: Oneri[] = [];
  for (const b of s.subeler) for (const u of uyarilar(s, b)) { if (u.m === 'Kapalı') continue; const git = u.ik === '📦' ? 'stok' : u.ik === '🧽' || u.ik === '🚪' || u.ik === '😠' ? 'personel' : u.ik === '🗓️' ? 'vardiya' : undefined; out.push({ id: `u${b.id}${u.ik}`, ik: u.ik, baslik: `${b.ad.split(' ').pop()}: ${u.m}`, ac: 'Hemen ilgilenmezsen müşteri ve itibar kaybedersin.', ...(git ? { eylem: git === 'stok' ? undefined : (git === 'vardiya' ? 'vardiyaGit' : 'persGit'), git: git === 'stok' ? 'stok' : undefined } : {}), oncelik: u.ik === '📦' ? 90 : u.ik === '🚪' ? 95 : 85 }); }
  return out;
}
