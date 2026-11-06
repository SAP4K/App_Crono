import { useNotificationNavigation } from '../hooks/useNotificationNavigation';
import { useI18n } from '../hooks/useI18n';
import { ComponentProps, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { CronoProvider, useCrono } from '../context/CronoContext';
import { Icon, IconName } from '../components/Icon';
import { SettingsSheet } from '../components/SettingsSheet';
import { TimingNotices } from '../components/TimingNotices';
import { fonts as f, Palette } from '../theme';
import { ThemeProvider, useTheme, useThemeStyles } from '../context/ThemeContext';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch((error) => console.warn('[theme] Splash could not be held.', error));
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return <SafeAreaProvider><CronoProvider><ThemeProvider><RootContent fontsReady={loaded || !!error} /></ThemeProvider></CronoProvider></SafeAreaProvider>;
}

function RootContent({ fontsReady }: { fontsReady: boolean }) {
  const { language, messages: m } = useI18n();
  const { ready } = useCrono();
  useEffect(() => { if (Platform.OS === 'web') document.documentElement.lang = language; }, [language]);
  const { colors: c, mode } = useTheme();
  const styles = useThemeStyles(createStyles);
  useEffect(() => {
    if (ready && fontsReady && Platform.OS !== 'web') {
      void SplashScreen.hideAsync().catch((error) => console.warn('[theme] Splash could not be hidden.', error));
    }
  }, [ready, fontsReady]);
  return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />{ready && fontsReady
    ? <AppShell />
    : <View style={styles.loading}><ActivityIndicator color={c.green} accessibilityLabel={m.loadingApp} /></View>}</>;
}

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const tabItems: Record<string, { title: 'stopwatchTab' | 'timerTab' | 'planningTab' | 'historyTab'; icon: IconName }> = {
  index: { title: 'stopwatchTab', icon: 'clock' },
  timer: { title: 'timerTab', icon: 'timer' },
  planning: { title: 'planningTab', icon: 'planning' },
  history: { title: 'historyTab', icon: 'history' },
};

function TabBar({ state, navigation }: TabBarProps) {
  const { messages: m } = useI18n();
  const compact = useWindowDimensions().width < 360;
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { data, feedback } = useCrono();
  return <View style={[styles.tabBar, compact && styles.compactTabBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
    {state.routes.map((route, index) => {
      const selected = state.index === index;
      const history = route.name === 'history';
      const item = tabItems[route.name];
      if (!item) return null;
      const running = route.name === 'timer' ? data.timer.status === 'running' : route.name === 'planning' ? data.planning.run?.status === 'running' : route.name === 'index' && data.stopwatch.startedAt !== null;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={m[item.title]} accessibilityState={{ selected }} aria-selected={selected} onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!selected && !event.defaultPrevented) { feedback(); navigation.navigate(route.name, route.params); }
      }} style={({ pressed }) => [styles.tab, compact && styles.compactTab, selected && styles.selectedTab, pressed && { opacity: 0.6 }]}>
        <Icon name={item.icon} size={19} color={selected ? c.ink : c.muted} />
        <Text style={[styles.tabText, selected && styles.selectedTabText]}>{m[item.title]}</Text>
        {history && data.sessions.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{data.sessions.length}</Text></View>}
        {running && <View style={styles.runningDot} />}
      </Pressable>;
    })}
  </View>;
}

function AppShell() {
  useNotificationNavigation();
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { ready, notice, storageError, dismissStorageError, feedback } = useCrono();
  const [settings, setSettings] = useState(false);
  const compact = useWindowDimensions().height < 740;
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={c.green} accessibilityLabel={m.loadingSession} /></View>;
  return <View style={styles.desktop}><View style={styles.app}>
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }, compact && { paddingBottom: 16 }]}>
      <View style={styles.logoGroup}><View style={styles.logo}><Icon name="clock" size={22} color={c.onAccent} /></View><Text style={styles.wordmark}>CRONO<Text style={{ color: c.green }}>.</Text></Text></View>
      <Pressable accessibilityLabel={m.settings} accessibilityRole="button" onPress={() => { feedback(); setSettings(true); }} style={({ pressed }) => [styles.settings, pressed && { opacity: 0.55 }]}><Icon name="settings" size={19} /></Pressable>
    </View>
    {storageError && <Pressable onPress={dismissStorageError} accessibilityRole="button" accessibilityLabel={m.dismissStorage} style={styles.warning}><Text style={styles.warningText}>{m.storageWarning}</Text><Icon name="close" size={15} color={c.danger} /></Pressable>}
    <TimingNotices />
    <Tabs initialRouteName="index" backBehavior="initialRoute" tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background }, animation: 'none' }}>
      <Tabs.Screen name="index" options={{ title: m.stopwatchTab }} />
      <Tabs.Screen name="timer" options={{ title: m.timerTab }} />
      <Tabs.Screen name="planning" options={{ title: m.planningTab }} />
      <Tabs.Screen name="history" options={{ title: m.historyTab }} />
    </Tabs>
    <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
    {notice && <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite"><Icon name="check" size={17} color={c.lime} /><Text style={styles.toastText}>{m[notice]}</Text></View>}
  </View></View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  loading: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  desktop: { flex: 1, alignItems: 'center', backgroundColor: c.desktop },
  app: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: c.background },
  header: { paddingHorizontal: 26, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 35, height: 35, borderRadius: 12, backgroundColor: c.lime, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: f.heavy, fontSize: 22, letterSpacing: -0.9, color: c.ink },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 16 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 8, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border },
  compactTabBar: { paddingHorizontal: 8, gap: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 58, borderRadius: 14, paddingHorizontal: 4, paddingVertical: 9 },
  compactTab: { paddingHorizontal: 0 },
  selectedTab: { backgroundColor: c.selected },
  tabText: { fontFamily: f.medium, fontSize: 11, color: c.muted, maxWidth: '100%', flexShrink: 1, textAlign: 'center' },
  selectedTabText: { color: c.ink, fontFamily: f.semibold },
  badge: { position: 'absolute', top: 5, right: 8, backgroundColor: c.badge, paddingHorizontal: 5, minWidth: 18, borderRadius: 5, height: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: f.semibold, fontSize: 9, color: c.green },
  runningDot: { position: 'absolute', top: 9, right: 12, width: 5, height: 5, backgroundColor: c.green, borderRadius: 3 },
  toast: { position: 'absolute', bottom: 100, left: 26, right: 26, borderRadius: 16, backgroundColor: c.toast, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: c.shadow },
  toastText: { fontFamily: f.medium, color: c.toastText, fontSize: 12, flex: 1, lineHeight: 18 },
  warning: { marginHorizontal: 26, marginBottom: 12, padding: 12, backgroundColor: c.dangerSoft, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  warningText: { color: c.danger, fontFamily: f.regular, fontSize: 11, lineHeight: 17, flex: 1 },
});
