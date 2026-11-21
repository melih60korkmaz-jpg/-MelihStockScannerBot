import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-ext-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import './ui/theme.css';
import { AudioEngine } from './audio/engine';
import * as music from './audio/music';
import { Store } from './core/store';
import { newGameState } from './core/state';
import { makeHaptics } from './platform/haptics';
import { SettingsStore } from './platform/settings';
import { MenuScene, type Mood } from './render3d/menuScene';
import { FallbackKV, SaveManager } from './save/manager';
import { Router, type App } from './ui/app';
import { menuScreen } from './ui/screens/menu';
import { hubScreen } from './ui/screens/hub';
import { loadView, saveView } from './platform/lastView';
import { siteScreen } from './ui/screens/site';
import { playIntro, tapGate } from './ui/screens/intro';
import { openEventDecision } from './ui/screens/eventModal';
import { siteIntro } from './ui/cinema';

const settings = new SettingsStore();
const audio = new AudioEngine(settings);
const haptic = makeHaptics(settings);

// IndexedDB yoksa/engelliyse bellek kaydıyla devam: oyun çalışmaya devam eder.
const kv = new FallbackKV();
const saves = new SaveManager(kv);

// 3D sahne: WebGL yoksa CSS gradyan arka planla devam.
const canvas = document.getElementById('bg') as HTMLCanvasElement;
let scene: MenuScene | null = null;
try { scene = new MenuScene(canvas); } catch (e) { console.warn('3D sahne başlatılamadı, düz arka plan kullanılıyor', e); }

const root = document.getElementById('ui')!;
const router = new Router(root, () => settings.reduced);

const app: App = {
  settings, audio, haptic, saves, scene, site: null,
  get persistent() { return kv.persistent; },
  store: new Store(newGameState(1)),
  go(screen, mood = 'none') {
    router.show(screen);
    if (mood !== 'none') scene?.setMood(mood as Mood);
  },
  setStore(s) { this.store = s; watchStore(); },
  menu() { this.go(menuScreen(app), 'menu'); },
  openSite(id) { saveView({ company: this.store.state.company!.name, tab: 'projeler', site: id }); const pr = this.store.state.projects.find((x) => x.id === id); if (pr) siteIntro(this, pr); this.go(siteScreen(app, id, () => { saveView({ company: this.store.state.company!.name, tab: 'projeler' }); this.go(hubScreen(app, 'projeler'), 'none'); }), 'none'); },
};

// Otomatik kayıt: bir işlem/olay sonrası 6 sn içinde (gün akışı hariç), her ay ve uygulamadan çıkarken (aşağıda).
let saveTimer = 0;
const flushSave = () => { saveTimer = 0; const st = app.store.state; if (st.company && !st.company.bankrupt) void saves.autosave(st).catch(() => {}); };
function watchStore() { app.store.subscribe((evs) => { if (!app.store.state.company) return; if (evs.some((e) => e.type !== 'DAY' && e.type !== 'WEEK') && !saveTimer) saveTimer = window.setTimeout(flushSave, 6000); }); }
watchStore();

function applyMotion() {
  document.documentElement.dataset.motion = settings.value.motion; document.documentElement.dataset.fx = settings.value.fx;
  scene?.setReduced(settings.reduced);
}
settings.subscribe((_, k) => { if (k === 'motion' || k === 'fx') applyMotion(); if (k === 'quality') scene?.setQuality(settings.value.quality); });
applyMotion(); scene?.setQuality(settings.value.quality);

// Zaman döngüsü (oyun içi gün akışı)
let last = performance.now();
const loop = (t: number) => { const dt = t - last; last = t; app.store.frame(dt); requestAnimationFrame(loop); };
requestAnimationFrame(loop);

// Yaşam döngüsü: arka plana alınınca oyunu duraklat, kaydet, sahneyi durdur
let sceneWasRunning = false;
const onHide = () => {
  if (!document.hidden) { if (app.site) app.site.start(); else if (sceneWasRunning) scene?.start(); return; }
  sceneWasRunning = !!scene && (scene as any).running;
  scene?.stop(); app.site?.stop();
  if (app.store.state.company) { app.store.pauseForBackground(); void saves.autosave(app.store.state).catch(() => {}); }
};
document.addEventListener('visibilitychange', onHide);
addEventListener('pagehide', onHide);
addEventListener('resize', () => { scene?.resize(); app.site?.resize(); });
// Yalnızca yatay: dikey tutulursa oyun duraklar ve sahne durur; yatay dönünce kaldığı yerden devam eder.
const portraitMq = matchMedia('(orientation: portrait)');
const onOrient = () => {
  if (portraitMq.matches) { sceneWasRunning = !!scene && (scene as any).running || sceneWasRunning; scene?.stop(); app.site?.stop(); app.store.pauseForBackground(); audio.suspend(); }
  else { if (app.site) app.site.start(); else if (sceneWasRunning) scene?.start(); audio.resume(); setTimeout(() => { scene?.resize(); app.site?.resize(); }, 150); }
};
portraitMq.addEventListener('change', onOrient);
try { (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch { /* iOS Safari desteklemez; yerel uygulamada kilitlenecek */ }
addEventListener('orientationchange', () => setTimeout(() => scene?.resize(), 200));

(async function boot() {
  scene?.start();
  await tapGate();
  // iOS: ses yalnızca dokunuşla açılır. Bazı gömülü görüntüleyicilerde AudioContext.resume() hiç sonuçlanmaz;
  // ses yüzünden açılış takılmasın diye en çok 700 ms beklenir, ses arkada açılmaya devam eder.
  await Promise.race([audio.unlock().catch(() => {}), new Promise<void>((r) => setTimeout(r, 700))]);
  // Güvenlik ağı: açılış animasyonu herhangi bir nedenle bitmezse 7 sn sonra menü zorla açılır.
  let shown = false;
  /** Açılış: ayar açıksa son geçerli kayıttan doğrudan oyuna devam; yoksa menü. Depo takılırsa 4,5 sn sonra menüye düşer. */
  const show = async () => {
    if (shown) return; shown = true; document.querySelector('.intro')?.remove();
    if (settings.value.autoResume) {
      try {
        const r = await Promise.race([saves.loadLatestValid(), new Promise<null>((res) => setTimeout(() => res(null), 4500))]);
        if (r && r.state.company && !r.state.company.bankrupt) { app.setStore(new Store(r.state)); { const lv = loadView(r.state.company.name); app.go(hubScreen(app, (lv?.tab as any) ?? 'sirket'), 'none'); if (lv?.site && app.store.state.projects.some((x) => x.id === lv.site && x.status === 'insaat')) setTimeout(() => app.openSite(lv.site!), 400); } import('./ui/dom').then((d) => d.toast(`▶ Kaldığınız yerden devam: ${r.state.company!.name}`, 3500)); return; }
      } catch { /* kayıt okunamadı: menü */ }
    }
    app.menu();
  };
  const wd = setTimeout(() => void show(), 9000);
  try { await playIntro(app); } catch (e) { console.warn('açılış animasyonu atlandı', e); }
  clearTimeout(wd); await show();
})();

(window as any).__app = app; // test/hata ayıklama
(window as any).__music = music;
(window as any).__openEvent = () => openEventDecision(app); // hata ayıklama: bekleyen olay penceresini aç

// Açılış tamamlandı işareti: index.html'deki hata paneli bunu bekler.
(window as unknown as { __booted?: boolean }).__booted = true;

// Pencere (modal) açıkken oyun zamanı beklesin: teklif/satış/kredi gibi işlemler sırasında değerler kaymasın.
Store.hold = () => { const ms = document.querySelectorAll('.modal:not(.leaving), .tut:not(.out)'); for (const m of Array.from(ms)) if ((m as HTMLElement).offsetParent !== null || getComputedStyle(m).position === 'fixed') return true; return false; };
