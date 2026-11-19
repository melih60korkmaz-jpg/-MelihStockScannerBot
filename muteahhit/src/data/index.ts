import staffTypesRaw from './staffTypes.json';
import officesRaw from './offices.json';
import namesRaw from './names.json';

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
export const staffType = (id: string) => STAFF_TYPES.find((t) => t.id === id);
export const officeFor = (level: number) => OFFICES[Math.min(level, OFFICES.length) - 1]!;
