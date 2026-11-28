/** Antrenman tanımları. Her antrenman bir mini oyunla oynanır; mini oyun 0-1 arası başarı verir. */
import type { YetenekId } from './skills';
export type Motor = 'hedef' | 'koni' | 'zaman' | 'tutma' | 'sira';
export type Kat = 'sut' | 'fizik' | 'teknik' | 'savunma';
export interface AntrenmanDef { id: string; ad: string; ik: string; motor: Motor; varyant: string; hedef: string; sure: number; zorluk: number; enerji: number; kat: Kat; kazanc: Partial<Record<YetenekId, number>>; ac: string }
export const ANTRENMANLAR: AntrenmanDef[] = [
  { id: 'sut', ad: 'Şut çalışması', ik: '🥅', motor: 'hedef', varyant: 'sut', hedef: 'Kalenin köşelerindeki hedeflere vur', sure: 40, zorluk: 2, enerji: 12, kat: 'sut', kazanc: { sut: 1, bitiricilik: 0.6, guc: 0.15 }, ac: '6 şut: yön ve güç ayarla' },
  { id: 'pas', ad: 'Pas çalışması', ik: '🎯', motor: 'hedef', varyant: 'pas', hedef: 'Pası kapılardan geçir', sure: 40, zorluk: 2, enerji: 10, kat: 'teknik', kazanc: { pas: 1, gorus: 0.5, teknik: 0.2 }, ac: '6 pas: hedef kapıdan geçir' },
  { id: 'surme', ad: 'Top sürme', ik: '🔶', motor: 'koni', varyant: 'surme', hedef: 'Konilere çarpmadan ilerle', sure: 35, zorluk: 3, enerji: 13, kat: 'teknik', kazanc: { dribbling: 1, surat: 0.3, topKontrol: 0.3 }, ac: 'Sağa-sola kaydır, koniden kaç' },
  { id: 'serbest', ad: 'Serbest vuruş', ik: '🧱', motor: 'hedef', varyant: 'serbest', hedef: 'Barajın üstünden köşeleri bul', sure: 45, zorluk: 3, enerji: 12, kat: 'sut', kazanc: { serbest: 1, sut: 0.3, teknik: 0.3 }, ac: 'Baraj var: yüksek ve falsolu vur' },
  { id: 'penalti', ad: 'Penaltı', ik: '⚽', motor: 'hedef', varyant: 'penalti', hedef: 'Kaleciyi yanılt', sure: 30, zorluk: 2, enerji: 8, kat: 'sut', kazanc: { penalti: 1, bitiricilik: 0.4 }, ac: '5 penaltı: kaleci rastgele atlar' },
  { id: 'surat', ad: 'Sürat', ik: '⚡', motor: 'zaman', varyant: 'surat', hedef: 'Doğru anda hızlan', sure: 30, zorluk: 2, enerji: 14, kat: 'fizik', kazanc: { surat: 1, dayaniklilik: 0.2 }, ac: 'Çubuk yeşil bölgedeyken dokun' },
  { id: 'kuvvet', ad: 'Kuvvet', ik: '💪', motor: 'zaman', varyant: 'kuvvet', hedef: 'Gücü tepe noktada kullan', sure: 30, zorluk: 2, enerji: 15, kat: 'fizik', kazanc: { guc: 1, kafa: 0.3, savunma: 0.2 }, ac: 'Çubuk yeşil bölgedeyken dokun' },
  { id: 'dayanik', ad: 'Dayanıklılık', ik: '🫁', motor: 'tutma', varyant: 'dayanik', hedef: 'Nabzı dengede tut', sure: 30, zorluk: 3, enerji: 16, kat: 'fizik', kazanc: { dayaniklilik: 1, savunma: 0.2, surat: 0.1 }, ac: 'Basılı tutarak göstergeyi yeşilde tut' },
  { id: 'kontrol', ad: 'Top kontrolü', ik: '🧤', motor: 'sira', varyant: 'kontrol', hedef: 'Diziyi doğru tekrarla', sure: 40, zorluk: 3, enerji: 9, kat: 'teknik', kazanc: { topKontrol: 1, teknik: 0.5, gorus: 0.2 }, ac: 'Gösterilen sırayla dokun' },
  { id: 'savunma', ad: 'Savunma çalışması', ik: '🛡️', motor: 'zaman', varyant: 'savunma', hedef: 'Müdahale anını doğru yakala', sure: 30, zorluk: 3, enerji: 13, kat: 'savunma', kazanc: { savunma: 1, gorus: 0.3, guc: 0.15 }, ac: 'Çubuk yeşil bölgedeyken dokun' },
  { id: 'kafa', ad: 'Kafa vuruşu', ik: '🤕', motor: 'zaman', varyant: 'kafa', hedef: 'Sıçrayış anını tut', sure: 30, zorluk: 2, enerji: 12, kat: 'savunma', kazanc: { kafa: 1, guc: 0.2, savunma: 0.15 }, ac: 'Çubuk yeşil bölgedeyken dokun' },
  { id: 'taktik', ad: 'Taktik çalışması', ik: '📋', motor: 'sira', varyant: 'taktik', hedef: 'Hareket dizisini tekrarla', sure: 40, zorluk: 3, enerji: 8, kat: 'teknik', kazanc: { gorus: 1, pas: 0.3, savunma: 0.2 }, ac: 'Gösterilen sırayla dokun' }
];
export const antrenmanOf = (id: string): AntrenmanDef => ANTRENMANLAR.find((a) => a.id === id)!;
export const HAFTALIK_ANTRENMAN = 3;
