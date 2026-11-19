import type { AudioEngine } from '../audio/engine';
import { Store } from '../core/store';
import type { MenuScene, Mood } from '../render3d/menuScene';
import type { SettingsStore } from '../platform/settings';
import type { SaveManager } from '../save/manager';
import type { UiCtx } from './dom';

/** Ekranların ortak bağlamı. */
export interface App extends UiCtx {
  settings: SettingsStore;
  saves: SaveManager;
  scene: MenuScene | null;
  store: Store;
  persistent: boolean;
  go(screen: HTMLElement, mood?: Mood | 'none'): void;
  setStore(s: Store): void;
  menu(): void;
}

/** Basit ekran yöneticisi: eski ekran söner, yenisi girer (hareket azaltma açıksa anında). */
export class Router {
  private cur: HTMLElement | null = null;
  constructor(private root: HTMLElement, private reduced: () => boolean) {}
  show(el: HTMLElement) {
    const old = this.cur; this.cur = el;
    el.classList.add('screen', 'in'); this.root.append(el);
    if (old) {
      if (this.reduced()) old.remove();
      else { old.classList.remove('in'); old.classList.add('out'); setTimeout(() => old.remove(), 190); }
    }
  }
}
