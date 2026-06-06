import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';

const TEAL = '#059669';
const WHITE = '#ffffff';
const GRAY = '#f9fafb';
const GRAY_BORDER = '#e5e7eb';
const GRAY_TEXT = '#6b7280';

const TABS = [
  { id: 'app',      icon: '💊', label: 'Look Up',  url: 'https://pilltalk.app/app' },
  { id: 'mymeds',   icon: '💉', label: 'My Meds',  url: 'https://pilltalk.app/mymeds' },
  { id: 'symptoms', icon: '🔴', label: 'Symptoms', url: 'https://pilltalk.app/symptoms' },
  { id: 'tracker',  icon: '📅', label: 'Tracker',  url: 'https://pilltalk.app/tracker' },
  { id: 'medcard',  icon: '📋', label: 'Med Card', url: 'https://pilltalk.app/medcard' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('app');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webviewRef = useRef(null);

  const currentTab = TABS.find(t => t.id === activeTab);

  const handleNavigationChange = (navState) => {
    const url = navState.url;
    const matched = TABS.find(t => url.includes('/' + t.id) || (t.id === 'app' && url.endsWith('/app')));
    if (matched && matched.id !== activeTab) setActiveTab(matched.id);
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab.id);
    setLoading(true);
    setError(false);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`window.location.href = '${tab.url}';`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      <SafeAreaView style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>💊 Pill Talk</Text>
          <Text style={styles.headerSub}>by Kathryn Bowman, PharmD Candidate</Text>
        </View>
      </SafeAreaView>

      <View style={styles.webviewContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📡</Text>
            <Text style={styles.errorTitle}>No connection</Text>
            <Text style={styles.errorSub}>Check your internet and try again.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setError(false); setLoading(true); if (webviewRef.current) webviewRef.current.reload(); }}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: currentTab.url }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
            onNavigationStateChange={handleNavigationChange}
            onShouldStartLoadWithRequest={(request) => {
              if (!request.url.includes('pilltalk.app') && request.url.startsWith('http')) {
                Linking.openURL(request.url);
                return false;
              }
              return true;
            }}
            allowsBackForwardNavigationGestures={true}
            pullToRefreshEnabled={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            userAgent="PillTalkApp/1.0 (iOS; React Native)"
          />
        )}
        {loading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Loading Pill Talk...</Text>
          </View>
        )}
      </View>

      <SafeAreaView style={styles.tabBar}>
        <View style={styles.tabBarInner}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} style={styles.tab} onPress={() => handleTabPress(tab)} activeOpacity={0.7}>
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  header: { backgroundColor: TEAL },
  headerInner: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: WHITE, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1, fontWeight: '500' },
  webviewContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: GRAY },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: GRAY_TEXT, fontWeight: '500' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: WHITE },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  errorSub: { fontSize: 14, color: GRAY_TEXT, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, backgroundColor: TEAL, borderRadius: 10 },
  retryText: { color: WHITE, fontWeight: '700', fontSize: 15 },
  tabBar: { backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: GRAY_BORDER },
  tabBarInner: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingVertical: 4 },
  tabIcon: { fontSize: 22, marginBottom: 3, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, fontWeight: '500', color: GRAY_TEXT },
  tabLabelActive: { color: TEAL, fontWeight: '700' },
  tabIndicator: { position: 'absolute', top: -8, width: 28, height: 3, backgroundColor: TEAL, borderRadius: 2 },
});
