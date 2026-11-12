import { MotionPressable } from '../components/MotionPressable';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';
import { useI18n } from '../hooks/useI18n';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Tabs, type BottomTabNavigationOptions } from 'expo-router/js-tabs';
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
import { ActiveActivities } from '../components/ActiveActivities';
import { SettingsSheet } from '../components/SettingsSheet';
import { TimingNotices } from '../components/TimingNotices';
import { textSizes, motionTokens, radii, fonts as f, Palette } from '../theme';
import { ThemeProvider, useTheme, useThemeStyles } from '../context/ThemeContext';
import { MotionProvider, useMotionPreference } from '../context/MotionContext';
import { NavigationScene } from '../components/NavigationScene';

const sceneLayout: NonNullable<ComponentProps<typeof Tabs>['screenLayout']> = ({ children, route }) =>
  <NavigationScene name={route.name}>{children}</NavigationScene>;

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch((error) => console.warn('[theme] Splash could not be held.', error));
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return <SafeAreaProvider><CronoProvider><ThemeProvider><MotionProvider><RootContent fontsReady={loaded || !!error} /></MotionProvider></ThemeProvider></CronoProvider></SafeAreaProvider>;
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

function TabBar({ state, navigation, onHeight }: TabBarProps & { onHeight: (height: number) => void }) {
  const { messages: m } = useI18n();
  const compact = useWindowDimensions().width < 360;
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { data, feedback } = useCrono();
  return <View onLayout={(event) => onHeight(event.nativeEvent.layout.height)}><ActiveActivities currentTab={state.routes[state.index]?.name} /><View style={[styles.tabBar, compact && styles.compactTabBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
    {state.routes.map((route, index) => {
      const selected = state.index === index;
      const history = route.name === 'history';
      const item = tabItems[route.name];
      if (!item) return null;
      const running = route.name === 'timer' ? data.timer.status === 'running' : route.name === 'planning' ? data.planning.run?.status === 'running' : route.name === 'index' && data.stopwatch.startedAt !== null;
      return <MotionPressable key={route.key} accessibilityRole="tab" accessibilityLabel={m[item.title]} accessibilityState={{ selected }} aria-selected={selected} onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!selected && !event.defaultPrevented) { feedback(); navigation.navigate(route.name, route.params); }
      }} style={[styles.tab, compact && styles.compactTab, selected && styles.selectedTab]}>
        <Icon name={item.icon} size={19} color={selected ? c.green : c.muted} />
        <Text style={[styles.tabText, selected && styles.selectedTabText]}>{m[item.title]}</Text>
        {history && data.sessions.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{data.sessions.length}</Text></View>}
        {running && <View style={styles.runningDot} />}
      </MotionPressable>;
    })}
  </View></View>;
}

function AppShell() {
  useNotificationNavigation();
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { ready, notice, storageError, dismissStorageError, feedback } = useCrono();
  const { reduceMotion, active } = useMotionPreference();
  const [settings, setSettings] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(100);
  const [sceneWidth, setSceneWidth] = useState(0);
  const animateRoutes = !reduceMotion && active && sceneWidth > 0;
  const sceneStyleInterpolator = useCallback<NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']>>(({ current }) => ({
    sceneStyle: { transform: [{ translateX: current.progress.interpolate({
      inputRange: [-1, 0, 1], outputRange: [-sceneWidth, 0, sceneWidth], extrapolate: 'clamp',
    }) }] },
  }), [sceneWidth]);
  const compact = useWindowDimensions().height < 740;
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={c.green} accessibilityLabel={m.loadingSession} /></View>;
  return <View nativeID="crono-app" style={styles.desktop}><View testID="app-viewport" style={styles.app}
    onLayout={(event) => setSceneWidth(event.nativeEvent.layout.width)}>
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }, compact && { paddingBottom: 16 }]}>
      <View style={styles.logoGroup}><View style={styles.logo}><Icon name="clock" size={20} color={c.green} /></View><Text style={styles.wordmark}>CRONO</Text></View>
      <MotionPressable accessibilityLabel={m.settings} accessibilityRole="button" onPress={() => { feedback(); setSettings(true); }} style={[styles.settings]}><Icon name="settings" size={19} /></MotionPressable>
    </View>
    {storageError && <MotionPressable onPress={dismissStorageError} accessibilityRole="button" accessibilityLabel={m.dismissStorage} style={styles.warning}><Text style={styles.warningText}>{m.storageWarning}</Text><Icon name="close" size={15} color={c.danger} /></MotionPressable>}
    <TimingNotices />
    <Tabs initialRouteName="index" backBehavior="initialRoute" screenLayout={sceneLayout} tabBar={(props) => <TabBar {...props} onHeight={setTabBarHeight} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background },
      animation: animateRoutes ? 'shift' : 'none', sceneStyleInterpolator,
      transitionSpec: { animation: 'timing', config: { duration: animateRoutes ? motionTokens.routeMs : 0 } } }}>
      <Tabs.Screen name="index" options={{ title: m.stopwatchTab }} />
      <Tabs.Screen name="timer" options={{ title: m.timerTab }} />
      <Tabs.Screen name="planning" options={{ title: m.planningTab }} />
      <Tabs.Screen name="history" options={{ title: m.historyTab }} />
    </Tabs>
    <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
    {notice && <View pointerEvents="none" style={[styles.toast, { bottom: tabBarHeight + 12 }]} accessibilityLiveRegion="polite"><Icon name="check" size={17} color={c.lime} /><Text style={styles.toastText}>{m[notice]}</Text></View>}
  </View></View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  loading: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  desktop: { flex: 1, alignItems: 'center', backgroundColor: c.desktop },
  app: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: c.background },
  header: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 30, height: 30, borderRadius: 5, borderWidth: 1, borderColor: c.green, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: f.semibold, fontSize: 16, letterSpacing: 1.5, color: c.ink },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6, gap: 4, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.separator },
  compactTabBar: { paddingHorizontal: 8, gap: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 58, borderTopWidth: 2, borderTopColor: 'transparent', paddingHorizontal: 4, paddingVertical: 9 },
  compactTab: { paddingHorizontal: 0 },
  selectedTab: { borderTopColor: c.green },
  tabText: { fontFamily: f.medium, fontSize: textSizes.small, color: c.muted, maxWidth: '100%', flexShrink: 1, textAlign: 'center' },
  selectedTabText: { color: c.green, fontFamily: f.semibold },
  badge: { position: 'absolute', top: 5, right: 8, backgroundColor: c.badge, paddingHorizontal: 5, minWidth: 18, borderRadius: 5, height: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: f.semibold, fontSize: textSizes.small, color: c.green },
  runningDot: { position: 'absolute', top: 9, right: 12, width: 5, height: 5, backgroundColor: c.green, borderRadius: 3 },
  toast: { position: 'absolute', bottom: 100, left: 24, right: 24, borderRadius: radii.card, backgroundColor: c.toast, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: c.shadow },
  toastText: { fontFamily: f.medium, color: c.toastText, fontSize: textSizes.caption, flex: 1, lineHeight: 21 },
  warning: { marginHorizontal: 24, marginBottom: 12, padding: 12, backgroundColor: c.dangerSoft, borderRadius: radii.control, flexDirection: 'row', gap: 8, alignItems: 'center' },
  warningText: { color: c.danger, fontFamily: f.regular, fontSize: textSizes.small, lineHeight: 21, flex: 1 },
});
