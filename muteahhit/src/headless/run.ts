import { dispatch } from '../core/commands';
import { newGameState } from '../core/state';
import { formatDate } from '../core/calendar';
import { formatMoney } from '../core/money';
import { advanceDays } from '../sim/engine';
import { checkInvariant } from '../sim/ledger';

/** Başsız koşu: `npm run sim -- [tohum] [yıl]`. Denge botları buradan genişleyecek (Faz 12). */
const seed = Number(process.argv[2] ?? 42);
const years = Number(process.argv[3] ?? 1);
const s = newGameState(seed);
dispatch(s, 'CreateCompany', { name: 'Demir Yapı', founderBackground: 'eski_kalfa', startCity: 'ankara' });
for (const t of ['isci', 'isci', 'usta', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
advanceDays(s, 365 * years);
console.log(`Tohum ${seed} · ${formatDate(s.clock.day)} · kasa ${formatMoney(s.company!.cash)} · çalışan ${s.staff.length} · defter ${s.ledger.length} kayıt · tutarlı=${checkInvariant(s)}`);
