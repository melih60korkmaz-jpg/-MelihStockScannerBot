import type { RngState } from './rng';
import type { AdId, IngId, ProductId, ShopTypeId, StaffTypeId, UpgradeId } from '../data/catalog';

export interface Employee {
  id: number; ad: string; tip: StaffTypeId; maas: number;
  tecrube: number;      // 0–10 yıl
  hiz: number;          // 0.5–1.6
  iliski: number;       // müşteri ilişkileri 0–100
  motivasyon: number; memnuniyet: number; performans: number;
  gorunum: number;      // karakter modeli için tohum
  ise: number;          // işe giriş günü
}
export type Facade = Record<UpgradeId, number>;
export interface MenuItem { aktif: boolean; fiyat: number; kalite: number }   // fiyat: pazar fiyatına oran (1 = normal)
export interface Order { id: number; ing: IngId; paket: number; teslim: number; odenen: number }
export interface ActiveAd { id: AdId; bit: number; tuttu: boolean }
export interface Review { gun: number; yildiz: number; metin: string; kim: string }

export interface Money { kahve: number; yiyecek: number; paket: number; toplu: number; etkinlik: number; franchise: number }
export interface Costs { kira: number; elektrik: number; su: number; maas: number; malzeme: number; vergi: number; bakim: number; reklam: number; sigorta: number }
export interface DayAcc {
  gelir: Money; gider: Costs; musteri: number; kayip: number; stokYok: number; adet: Partial<Record<ProductId, number>>;
  satSum: number; satN: number; bekleme: number; beklemeN: number;
}
export interface DayReport { gun: number; gelir: Money; gider: Costs; toplamGelir: number; toplamGider: number; kar: number; musteri: number; kayip: number; memnuniyet: number }

export interface Branch {
  id: number; ad: string; city: number; tip: ShopTypeId; acilis: number; kira: number; m2: number;
  staff: Employee[]; menu: Record<ProductId, MenuItem>; stok: Record<IngId, number>; siparisler: Order[]; otoSiparis: boolean;
  facade: Facade; hijyen: number; memnuniyet: number; marka: number; sadakat: number;
  backlog: number; kullanim: Partial<Record<IngId, number>>; reklam: ActiveAd[]; yorumlar: Review[]; yorumPuan: number;
  bugun: DayAcc; gecmis: DayReport[]; acik: boolean; kuruldu: boolean;
}
export interface Rival { id: number; ad: string; fiyat: number; kalite: number; reklam: number; sube: number; cesit: number; calisan: number }
export interface Choice { ad: string; ac: string }
export interface Pending { id: number; tip: string; baslik: string; metin: string; ikon: string; secenek: Choice[]; city?: number; branch?: number }
export interface Mod { v: number; bit: number }
export interface Market { enf: number; fiyat: number; bean: number; elektrik: number; mod: Record<string, Mod> }

export interface GameState {
  v: number; seed: number; rng: RngState;
  marka: { ad: string; renk: string; renk2: string; logo: number };
  dk: number;                       // oyun başlangıcından beri geçen dakika
  hiz: number;                      // 0 duraklat, 1, 2, 4
  kasa: number; borc: number; marka_puani: number; seviye: number;
  subeler: Branch[]; rakipler: Record<number, Rival[]>;
  market: Market; hava: Record<number, 'gunesli' | 'bulutlu' | 'yagmur' | 'kar'>;
  rapor: DayReport[]; bekleyen: Pending[]; sn: number; en: number; log: string[]; hedef: Record<string, number>;
  oyunBitti: false | 'iflas'; negatifGun: number; ayKar: number; ayGelir: number;
}
export type SimEvent =
  | { t: 'musteri'; branch: number; tip: string; grup: number; dis: boolean; sure: number; paket: boolean; seed: number }
  | { t: 'kayip'; branch: number; sebep: 'kuyruk' | 'stok' | 'fiyat' }
  | { t: 'gun'; gun: number }
  | { t: 'olay'; id: number };
