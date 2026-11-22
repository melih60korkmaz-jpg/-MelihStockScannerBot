import staffTypesRaw from './staffTypes.json';
import officesRaw from './offices.json';
import namesRaw from './names.json';
import backgroundsRaw from './backgrounds.json';
import difficultiesRaw from './difficulties.json';
import citiesRaw from './cities.json';
import ledgerCatsRaw from './ledgerCategories.json';
import btRaw from './buildingTypes.json';
import placesRaw from './places.json';
import stagesRaw from './stages.json';
import materialsRaw from './materials.json';
import machinesRaw from './machines.json';
import banksRaw from './banks.json';
import eventsRaw from './events.json';
import progressRaw from './progress.json';

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
export interface BackgroundDef { id: string; label: string; story: string; startCashTL: number; reputation: number; creditScore: number; staff: string[]; machines?: string[] }
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
export { cityData, districtData, provinceData, provinceStats, PROVINCES, DEFAULT_CITIES, CLIMATE, listingTarget, branchCost } from './geo';
export type { DistrictDef, CityFull, Province, Region, Zoning } from './geo';
import { cityData, PROVINCES } from './geo';
const PROVINCES_COUNT = () => PROVINCES.length;
import type { Zoning } from './geo';
export interface BuildingTypeDef { id: string; label: string; use: 'konut' | 'ticari' | 'sanayi'; zoning: Zoning[]; costM2: number; monthsMin: number; monthsMax: number; floorsCap: number; minArea: number; minFloors: number; saleMult: number; minLevel?: number; blurb: string }
export interface QualityDef { id: string; label: string; costMult: number; saleMult: number; blurb: string }
export const BUILDING_TYPES = (btRaw as any).types as BuildingTypeDef[];
export const QUALITIES = (btRaw as any).qualities as QualityDef[];
export interface StageDef { id: string; label: string; cost: number; time: number; office?: string; prepaid?: boolean; permit?: boolean; outdoor?: boolean; materials?: [string, number][]; machines?: string[] }
export const STAGES = stagesRaw as StageDef[];
export const STAGE_SHARES: [string, number][] = STAGES.map((s) => [s.id, s.cost]);
export const stageIndex = (id: string) => STAGES.findIndex((s) => s.id === id);
export const SOIL_COST = (btRaw as any).soilCost as Record<string, number>;
export const buildingType = (id: string) => BUILDING_TYPES.find((t) => t.id === id);
export const quality = (id: string) => QUALITIES.find((q) => q.id === id);
export const PLACES = placesRaw as { hoodPre: string[]; hoodSuf: string[]; projectWords: Record<string, string[]>; projectSuffix: Record<string, string[]> };
// Veri bütünlüğü
for (const c of CITIES) if (!cityData(c.id)) throw new Error(`Veri hatası: şehir ${c.id} için ilçe verisi yok`);
if (PROVINCES_COUNT() !== 81) throw new Error('Veri hatası: 81 il olmalı');
{ const sum = STAGE_SHARES.reduce((a, [, w]) => a + w, 0); if (Math.abs(sum - 100) > 0.001) throw new Error(`Veri hatası: aşama payları toplamı ${sum}`); if (STAGES.length !== 18) throw new Error('Veri hatası: 18 aşama olmalı'); }
export interface MaterialDef { id: string; label: string; unit: string; priceTL: number; vol: number; space: number; loss: number }
export type PayTerm = 'pesin' | 'vade30' | 'vade60';
export interface SupplierDef { id: string; label: string; price: number; lead: number; reliability: number; quality: number; blurb: string; cap: number; regions: string[]; terms: PayTerm[] }
export interface MachineDef { id: string; label: string; priceTL: number; rentTL: number; fuelTL: number; maintTL: number; blurb: string; cap: string; op: number; dep: number }
export const MATERIALS = (materialsRaw as any).materials as MaterialDef[];
export const SUPPLIERS = (materialsRaw as any).suppliers as SupplierDef[];
export const MACHINES = machinesRaw as MachineDef[];
export const material = (id: string) => MATERIALS.find((m) => m.id === id);
export const supplier = (id: string) => SUPPLIERS.find((s) => s.id === id);
export const machine = (id: string) => MACHINES.find((m) => m.id === id);
for (const st of STAGES) { for (const [id] of st.materials ?? []) if (!material(id)) throw new Error(`Veri hatası: ${st.id} bilinmeyen malzeme ${id}`); for (const id of st.machines ?? []) if (!machine(id)) throw new Error(`Veri hatası: ${st.id} bilinmeyen makine ${id}`); if ((st.materials ?? []).reduce((a, [, f]) => a + f, 0) > 1.0001) throw new Error(`Veri hatası: ${st.id} malzeme payları > 1`); }
export interface BankDef { id: string; label: string; margin: number; minScore: number; fee: number; products: string[]; blurb: string }
export const BANKS = banksRaw as BankDef[];
export const bank = (id: string) => BANKS.find((b) => b.id === id);
export const staffType = (id: string) => STAFF_TYPES.find((t) => t.id === id);
export const officeFor = (office: number) => OFFICES[Math.min(Math.max(1, office || 1), OFFICES.length) - 1]!;

export type EffectTuple = [string, ...(number | string)[]];
/** n: her durumda, ns: başarıda, nf: başarısızlıkta — [devam olayı kimliği, kaç gün sonra]. */
export interface EventChoice { l: string; e: EffectTuple[]; p?: number; s?: EffectTuple[]; f?: EffectTuple[]; n?: [string, number]; ns?: [string, number]; nf?: [string, number] }
export interface EventDef { id: string; c: string; t: string; x: string; w: number; need: string[]; ch: EventChoice[]; def?: number }
export const EVENTS = eventsRaw as unknown as EventDef[];
export const eventDef = (id: string) => EVENTS.find((e) => e.id === id);

export interface LevelDef { level: number; label: string; need: { completed?: number; nw?: number; rep?: number; cities?: number } }
export interface QuestDef { id: string; t: string; x: string; m: string; n: number; r: { cash?: number; rep?: number; score?: number } }
export interface AchDef { id: string; t: string; x: string; m: string; n: number }
export interface OfficeStep { office: number; minLevel: number; costTL: number }
export const LEVEL_DEFS = (progressRaw as any).levels as LevelDef[];
export const QUESTS = (progressRaw as any).quests as QuestDef[];
export const ACHIEVEMENTS = (progressRaw as any).achievements as AchDef[];
export const OFFICE_STEPS = (progressRaw as any).offices as OfficeStep[];
