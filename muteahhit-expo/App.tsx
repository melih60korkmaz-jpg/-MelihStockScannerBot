import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, AppState, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { paymentMode, purchase, restore, rewardedAd } from './payments';

/**
 * Müteahhit — Expo sarmalayıcı. Oyun (Vite ile tek dosyaya derlenmiş HTML) bir WebView içinde çalışır.
 *  - Yatay ekran kilitli, ekran uyumaz, durum çubuğu gizli.
 *  - Oyundaki `navigator.vibrate` çağrıları gerçek titreşime (expo-haptics) bağlanır; iOS Safari'de olmayan titreşim burada çalışır.
 *  - Kayıtlar WebView'ın localStorage / IndexedDB deposunda tutulur (oyun zaten çok katmanlı yedekle çalışır).
 */
const GAME = require('./assets/game.html');
// react-native-webview 14'ün birleşik prop tipi bu TypeScript sürümünde `never`e çöküyor; çalışma zamanı etkilenmez, tipi gevşetiyoruz.
const GameView = WebView as unknown as ComponentType<Record<string, unknown>>;

// Sayfa yüklenmeden önce: navigator.vibrate → React Native köprüsü (hapticsSupported() true olur).
const bridge = () => BRIDGE.replace('__MODE__', paymentMode());
const BRIDGE = `
  (function () {
    navigator.vibrate = function (p) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'haptic', p: p })); } catch (e) {}
      return true;
    };
    window.__NATIVE_SHELL = 'expo';
    window.__IAP_MODE = '__MODE__';
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

  // Android geri tuşu: oyundan çıkma, sayfaya bırak (oyunun kendi geri/kapat düğmeleri var).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const h = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => h.remove();
  }, []);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { t: string; p?: number | number[]; id?: number; pack?: string };
      if (m.t === 'iap' || m.t === 'ad' || m.t === 'restore') {
        const run = m.t === 'iap' ? purchase(m.pack ?? '') : m.t === 'ad' ? rewardedAd() : restore();
        run.then((r) => web.current?.injectJavaScript(`window.__nativeReply && window.__nativeReply(${m.id}, ${JSON.stringify(r)}); true;`));
        return;
      }
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
        <ActivityIndicator size="large" color="#F07824" />
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
        source={{ html, baseUrl: 'https://muteahhit.app/' }}
        injectedJavaScriptBeforeContentLoaded={bridge()}
        onMessage={onMessage}
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
  root: { flex: 1, backgroundColor: '#17191C' },
  web: { flex: 1, backgroundColor: '#17191C' },
  center: { flex: 1, backgroundColor: '#17191C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: '#F5F5F3', fontSize: 20, fontWeight: '700' },
  errSub: { color: '#C0C4C8', marginTop: 8, textAlign: 'center' },
});
