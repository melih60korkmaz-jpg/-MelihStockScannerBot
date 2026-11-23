import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import html from './game-html';

// Oyun tek HTML dosyasıdır; Expo Go içinde WebView ile açılır.
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a10' }}>
      <StatusBar barStyle="light-content" />
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://secimsim.app/' }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        bounces={false}
        style={{ flex: 1, backgroundColor: '#0a0a10' }}
      />
    </SafeAreaView>
  );
}
