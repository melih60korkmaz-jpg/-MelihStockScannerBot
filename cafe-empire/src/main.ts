import { CafeView } from './render3d/view';
import { newGame, upgrade } from './core/actions';
import { step, MIN_PER_DAY } from './core/sim';
import type { GameState } from './core/types';
import type { ShopTypeId, UpgradeId } from './data/catalog';
import { boot } from './ui/app';

/** Önizleme: ?demo=1&tip=cadde&sehir=34&lv=0..3&saat=14&hava=yagmur */
const q = new URLSearchParams(location.search);
if (q.has('demo')) {
  const host = document.getElementById('app')!; host.style.cssText = 'position:fixed;inset:0'; const view = new CafeView(host);
  const { s } = newGame({ kasa: 1e8, ad: q.get('ad') ?? 'Fincan Kahve', sehir: +(q.get('sehir') ?? 26), tip: (q.get('tip') ?? 'cadde') as ShopTypeId, seed: 5, renk: '#c4722a', renk2: '#2d1f14', logo: 0 }); s.kasa = 1e9;
  const lv = +(q.get('lv') ?? 0); const order: UpgradeId[] = ['tabela', 'cam', 'kapi', 'oturma', 'peyzaj', 'tente', 'led', 'vitrin', 'marka', 'premium'];
  s.marka_puani = 90; for (let r = 0; r < lv; r++) for (const u of order) upgrade(s, s.subeler[0]!, u);
  s.dk = Math.floor(+(q.get('saat') ?? 14) * 60); s.hiz = 1; if (q.get('hava')) s.hava[s.subeler[0]!.city] = q.get('hava') as GameState['hava'][number];
  view.show(s, s.subeler[0]!); const w = window as unknown as Record<string, unknown>; w.__s = s; w.__view = view;
  let acc = 0; view.frameHook = (dt) => { view.tick(dt, s); acc += dt * (MIN_PER_DAY / 60); while (acc >= 10) { acc -= 10; const ev = step(s, 10); view.handleEvents(ev); if (q.get('hava')) s.hava[s.subeler[0]!.city] = q.get('hava') as GameState['hava'][number]; } };
}
else boot();
