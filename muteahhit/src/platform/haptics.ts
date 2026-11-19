import type { SettingsStore } from './settings';

/** Titreşim. iOS Safari web'de navigator.vibrate YOKTUR; Capacitor paketinde yerel API'ye bağlanacak. */
export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function makeHaptics(settings: SettingsStore) {
  return (kind: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.value.haptics || !hapticsSupported()) return;
    try { navigator.vibrate(kind === 'light' ? 8 : kind === 'medium' ? 16 : [20, 30, 30]); } catch { /* yok say */ }
  };
}
