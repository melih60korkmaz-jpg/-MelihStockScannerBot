import { describe, expect, it } from 'vitest';
import { SettingsStore, sanitize, defaults } from '../src/platform/settings';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };

describe('ayarlar', () => {
  it('kalıcı saklar ve yeniden yükler', () => {
    const st = mem(); const a = new SettingsStore(st);
    a.set('musicOn', false); a.set('sfxVol', 0.25); a.set('motion', 'reduced'); a.set('quality', 'low'); a.set('haptics', false);
    const b = new SettingsStore(st);
    expect(b.value).toMatchObject({ musicOn: false, sfxVol: 0.25, motion: 'reduced', quality: 'low', haptics: false });
  });
  it('bozuk / yabancı veriyi güvenli değerlere çevirir', () => {
    const st = mem(); st.setItem('muteahhit.settings.v1', '{{{bozuk');
    expect(new SettingsStore(st).value).toEqual(defaults());
    const s = sanitize({ musicVol: 7, sfxVol: -2, quality: 'ultra', motion: 3, musicOn: 'evet' });
    expect(s.musicVol).toBe(1); expect(s.sfxVol).toBe(0); expect(s.quality).toBe('auto'); expect(typeof s.musicOn).toBe('boolean');
  });
  it('depolama yoksa (gizli mod) çökmez, oturumda geçerli kalır', () => {
    const s = new SettingsStore(null); s.set('musicOn', false);
    expect(s.value.musicOn).toBe(false);
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    const t = new SettingsStore(broken); t.set('sfxOn', false); expect(t.value.sfxOn).toBe(false);
  });
  it('değişiklikte dinleyicileri çağırır', () => {
    const s = new SettingsStore(null); const seen: string[] = []; s.subscribe((_, k) => seen.push(k)); s.set('haptics', false);
    expect(seen).toEqual(['haptics']);
  });
});
