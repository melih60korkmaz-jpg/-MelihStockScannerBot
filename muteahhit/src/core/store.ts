import { COMMANDS, dispatch, type CommandName, type CommandResult } from './commands';
import type { GameEvent, GameState } from './types';
import { advanceDay } from '../sim/engine';

type Listener = (events: GameEvent[]) => void;
export type Speed = 0 | 1 | 2 | 4;
/** Hız → gün başına milisaniye (0 = duraklat). Bkz. tasarım belgesi 2.1 */
export const SPEED_MS: Record<Speed, number> = { 0: 0, 1: 2000, 2: 800, 4: 300 };

/** UI/render/audio'nun konuştuğu tek nesne: durum + olay yayını + zaman döngüsü. */
export class Store {
  speed: Speed = 0;
  private listeners = new Set<Listener>();
  private acc = 0;
  /** Komut günlüğü (hata ayıklama / yeniden oynatma testleri için). */
  readonly log: { day: number; name: string; params: unknown }[] = [];

  constructor(public state: GameState) {}

  subscribe(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(events: GameEvent[]) { if (events.length) for (const l of this.listeners) l(events); }

  replaceState(s: GameState) { this.state = s; this.speed = 0; this.acc = 0; this.emit([{ type: 'STATE_REPLACED', day: s.clock.day }]); }

  run<N extends CommandName>(name: N, params: Parameters<(typeof COMMANDS)[N]['validate']>[1]): CommandResult {
    const r = dispatch(this.state, name, params);
    if (r.ok) { this.log.push({ day: this.state.clock.day, name, params }); this.emit(r.events); }
    return r;
  }

  /** Tek gün ilerlet (atlama düğmeleri için); olayları yayınlar. */
  stepDay(): void { const evs = advanceDay(this.state); this.emit(evs); }

  /** En çok n gün atlar; duraklatıcı olay (kriz, eksi kasa…) çıkınca durur. Olaylar tek seferde yayınlanır. */
  skip(n: number): void {
    const all: GameEvent[] = [];
    for (let i = 0; i < n; i++) {
      const evs = advanceDay(this.state);
      all.push(...evs.filter((e) => e.type !== 'DAY'));
      if (evs.some((e) => e.pause)) break;
    }
    all.push({ type: 'DAY', day: this.state.clock.day });
    this.setSpeedSilent(0); this.emit(all);
  }
  private setSpeedSilent(sp: Speed) { this.speed = sp; this.acc = 0; }

  setSpeed(sp: Speed) { this.speed = sp; this.acc = 0; this.emit([{ type: 'SPEED', day: this.state.clock.day, data: { speed: sp } }]); }

  /** requestAnimationFrame'den çağrılır. Büyük dt (arka plandan dönüş) sınırlanır. */
  frame(dtMs: number): void {
    if (this.speed === 0 || !this.state.company) return;
    this.acc += Math.min(dtMs, 1000);
    const per = SPEED_MS[this.speed];
    while (this.acc >= per) {
      this.acc -= per;
      const evs = advanceDay(this.state);
      this.emit(evs);
      if (evs.some((e) => e.pause)) { this.setSpeed(0); break; }
    }
  }

  /** Arka plana alma: duraklat (süre atlaması yok). */
  pauseForBackground() { if (this.speed !== 0) this.setSpeed(0); }
}
