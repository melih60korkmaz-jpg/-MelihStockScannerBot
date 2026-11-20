/** Yapay zekâyla üretilmiş sahne resimleri (WebP, tek dosyaya gömülü). Yalnızca atmosfer içindir; oyun verisi hep gerçek durumdan gelir. */
import hq1 from '../assets/art/hq1.webp';
import hq2 from '../assets/art/hq2.webp';
import hq3 from '../assets/art/hq3.webp';
import hq4 from '../assets/art/hq4.webp';
import tender from '../assets/art/tender.webp';
import crisis from '../assets/art/crisis.webp';

export const HQ_ART: Record<number, string> = { 1: hq1, 2: hq2, 3: hq3, 4: hq4 };
export const hqArt = (office: number): string => HQ_ART[Math.max(1, Math.min(4, office))]!;
export const TENDER_ART = tender;
export const CRISIS_ART = crisis;
