// Oyunun son derlemesini (../futbolcu-kariyer/dist/index.html) uygulamaya kopyalar.
// Kullanım: önce ../futbolcu-kariyer içinde `npm run build`, sonra burada `npm run sync`.
import { copyFileSync, existsSync, statSync } from 'node:fs';
const src = new URL('../../futbolcu-kariyer/dist/index.html', import.meta.url);
const dst = new URL('../assets/game.html', import.meta.url);
if (!existsSync(src)) { console.error('Önce ../futbolcu-kariyer içinde `npm run build` çalıştırın.'); process.exit(1); }
copyFileSync(src, dst);
console.log('Kopyalandı:', (statSync(dst).size / 1048576).toFixed(2), 'MB');
