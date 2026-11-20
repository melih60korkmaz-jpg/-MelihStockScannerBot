/** Yapay zekâyla üretilmiş sahne resimleri (WebP, tek dosyaya gömülü). Yalnızca atmosfer içindir; oyun verisi hep gerçek durumdan gelir. */
const LITE = import.meta.env.VITE_LITE === '1'; // hafif derleme: resimsiz (iOS dosya önizlemesi büyük dosyaları metin gösterir)
import hq1 from '../assets/art/hq1.webp';
import hq2 from '../assets/art/hq2.webp';
import hq3 from '../assets/art/hq3.webp';
import hq4 from '../assets/art/hq4.webp';
import tender from '../assets/art/tender.webp';
import crisis from '../assets/art/crisis.webp';

export const HQ_ART: Record<number, string> = LITE ? {} : { 1: hq1, 2: hq2, 3: hq3, 4: hq4 };
export const hqArt = (office: number): string => HQ_ART[Math.max(1, Math.min(4, office))] ?? '';
export const TENDER_ART = LITE ? '' : tender;
export const CRISIS_ART = LITE ? '' : crisis;

const pick = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([p, u]) => [p.split('/').pop()!.replace('.webp', ''), u]));
/** Bina tipi → kapak resmi; personel tipi → portre; makine → kart resmi; şehir → panorama. Kimlikler veri dosyalarındakilerle aynıdır. */
export const BUILDING_ART = LITE ? {} : pick(import.meta.glob('../assets/art/b/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>);
export const STAFF_ART = LITE ? {} : pick(import.meta.glob('../assets/art/s/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>);
export const MACHINE_ART = LITE ? {} : pick(import.meta.glob('../assets/art/m/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>);
export const CITY_ART = LITE ? {} : pick(import.meta.glob('../assets/art/c/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>);
