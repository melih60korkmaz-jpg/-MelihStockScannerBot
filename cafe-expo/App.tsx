import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, AppState, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';

/**
 * Cafe Empire — Expo sarmalayıcı. Oyun (Vite ile tek dosyaya derlenmiş HTML) bir WebView içinde, tamamen çevrimdışı çalışır.
 *  - Yatay ekran kilitli, ekran uyumaz, durum çubuğu gizli.
 *  - Oyundaki `navigator.vibrate` çağrıları gerçek titreşime (expo-haptics) bağlanır.
 *  - Kayıtlar WebView'ın localStorage + IndexedDB deposunda (çift katmanlı) tutulur.
 *  - Ağ isteği yoktur: oyun HTML'i paketin içindedir.
 */
const GAME = require('./assets/game.html');
// react-native-webview 14'ün birleşik prop tipi bu TypeScript sürümünde `never`e çöküyor; çalışma zamanı etkilenmez, tipi gevşetiyoruz.
const GameView = WebView as unknown as ComponentType<Record<string, unknown>>;

const BRIDGE = `
  (function () {
    navigator.vibrate = function (p) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'haptic', p: p })); } catch (e) {}
      return true;
    };
    window.__NATIVE_SHELL = 'expo';
  })();
  true;
`;

export default function App() {
  useKeepAwake();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    (async () => {
      try {
        const asset = Asset.fromModule(GAME);
        await asset.downloadAsync();
        setHtml(await new File(asset.localUri ?? asset.uri).text());
      } catch (e) {
        setError(String((e as Error)?.message ?? e));
      }
    })();
  }, []);

  // Uygulama arka plana geçince oyuna haber ver (oyun zamanı durdurur ve kayıt alır).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      web.current?.injectJavaScript(`document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('${st === 'active' ? 'focus' : 'pagehide'}')); true;`);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const h = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => h.remove();
  }, []);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { t: string; p?: number | number[] };
      if (m.t !== 'haptic') return;
      const strong = Array.isArray(m.p) || (typeof m.p === 'number' && m.p > 24);
      const style = strong ? Haptics.ImpactFeedbackStyle.Heavy : (typeof m.p === 'number' && m.p > 10) ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {});
    } catch { /* yok say */ }
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Oyun yüklenemedi</Text>
        <Text style={styles.errSub}>{error}</Text>
      </View>
    );
  }
  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E3874A" />
      </View>
    );
  }
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <GameView
        ref={web}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://cafeempire.app/' }}
        injectedJavaScriptBeforeContentLoaded={BRIDGE}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(r: { url: string }) => r.url === 'about:blank' || r.url.startsWith('https://cafeempire.app/')}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        cacheEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#081418' },
  web: { flex: 1, backgroundColor: '#081418' },
  center: { flex: 1, backgroundColor: '#081418', alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: '#EEF4F2', fontSize: 20, fontWeight: '700' },
  errSub: { color: '#86A0A6', marginTop: 8, textAlign: 'center' },
});
