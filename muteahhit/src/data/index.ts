import staffTypesRaw from './staffTypes.json';
import officesRaw from './offices.json';
import namesRaw from './names.json';
import backgroundsRaw from './backgrounds.json';
import difficultiesRaw from './difficulties.json';
import citiesRaw from './cities.json';
import ledgerCatsRaw from './ledgerCategories.json';

export interface StaffTypeDef { id: string; label: string; baseSalaryTL: number }
export interface OfficeDef { level: number; label: string; capacity: number; monthlyRentTL: number }

/** Veri doğrulama: bozuk/eksik içerik oyun başlamadan yakalanır. */
function validate(): { staffTypes: StaffTypeDef[]; offices: OfficeDef[]; names: { first: string[]; last: string[] } } {
  const staffTypes = staffTypesRaw as StaffTypeDef[];
  const offices = officesRaw as OfficeDef[];
  const ids = new Set<string>();
  for (const t of staffTypes) {
    if (!t.id || !(t.baseSalaryTL > 0)) throw new Error(`Veri hatası: personel tipi ${JSON.stringify(t)}`);
    if (ids.has(t.id)) throw new Error(`Veri hatası: yinelenen personel tipi ${t.id}`);
    ids.add(t.id);
  }
  offices.forEach((o, i) => {
    if (o.level !== i + 1 || !(o.capacity > 0)) throw new Error(`Veri hatası: ofis seviyesi ${o.level}`);
  });
  if (namesRaw.first.length === 0 || namesRaw.last.length === 0) throw new Error('Veri hatası: isim listesi boş');
  return { staffTypes, offices, names: namesRaw };
}

const data = validate();
export const STAFF_TYPES = data.staffTypes;
export const OFFICES = data.offices;
export const NAMES = data.names;
export interface BackgroundDef { id: string; label: string; story: string; startCashTL: number; reputation: number; creditScore: number; staff: string[] }
export interface DifficultyDef { id: string; label: string; desc: string; capitalMult: number }
export interface CityDef { id: string; label: string; blurb: string }
export const BACKGROUNDS = backgroundsRaw as BackgroundDef[];
export const DIFFICULTIES = difficultiesRaw as DifficultyDef[];
export const CITIES = citiesRaw as CityDef[];
for (const b of BACKGROUNDS) for (const t of b.staff) if (!STAFF_TYPES.some((x) => x.id === t)) throw new Error(`Veri hatası: ${b.id} bilinmeyen personel ${t}`);
export const background = (id: string) => BACKGROUNDS.find((b) => b.id === id);
export const difficulty = (id: string) => DIFFICULTIES.find((d) => d.id === id);
export type LedgerKind = 'sermaye' | 'gelir' | 'gider' | 'vergi' | 'yatirim' | 'finansman';
export interface LedgerCatDef { id: string; label: string; kind: LedgerKind }
export const LEDGER_CATS = ledgerCatsRaw as LedgerCatDef[];
export const ledgerCat = (id: string) => LEDGER_CATS.find((c) => c.id === id);
export const staffType = (id: string) => STAFF_TYPES.find((t) => t.id === id);
export const officeFor = (level: number) => OFFICES[Math.min(level, OFFICES.length) - 1]!;
