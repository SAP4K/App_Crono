import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { Icon } from '../components/Icon';
import { SettingsSheet } from '../components/SettingsSheet';
import { colors as c, fonts as f } from '../theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return <SafeAreaProvider><StatusBar style="dark" /><CronoProvider>{loaded || error ? <AppShell /> : <View style={styles.loading}><ActivityIndicator color={c.green} accessibilityLabel="Se încarcă aplicația" /></View>}</CronoProvider></SafeAreaProvider>;
}

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { data, feedback } = useCrono();
  return <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
    {state.routes.map((route, index) => {
      const selected = state.index === index;
      const history = route.name === 'history';
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={history ? 'Istoric' : 'Cronometru'} accessibilityState={{ selected }} onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!selected && !event.defaultPrevented) { feedback(); navigation.navigate(route.name, route.params); }
      }} style={({ pressed }) => [styles.tab, selected && styles.selectedTab, pressed && { opacity: 0.6 }]}>
        <Icon name={history ? 'history' : 'clock'} size={19} color={selected ? c.ink : c.muted} />
        <Text style={[styles.tabText, selected && styles.selectedTabText]}>{history ? 'Istoric' : 'Cronometru'}</Text>
        {history && data.sessions.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{data.sessions.length}</Text></View>}
        {!history && data.stopwatch.startedAt !== null && <View style={styles.runningDot} />}
      </Pressable>;
    })}
  </View>;
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const { ready, notice, storageError, dismissStorageError, feedback } = useCrono();
  const [settings, setSettings] = useState(false);
  const compact = useWindowDimensions().height < 740;
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={c.green} accessibilityLabel="Se încarcă sesiunea" /></View>;
  return <View style={styles.desktop}><View style={styles.app}>
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }, compact && { paddingBottom: 16 }]}>
      <View style={styles.logoGroup}><View style={styles.logo}><Icon name="clock" size={22} /></View><Text style={styles.wordmark}>CRONO<Text style={{ color: '#8AA953' }}>.</Text></Text></View>
      <Pressable accessibilityLabel="Setări" accessibilityRole="button" onPress={() => { feedback(); setSettings(true); }} style={({ pressed }) => [styles.settings, pressed && { opacity: 0.55 }]}><Icon name="settings" size={19} /></Pressable>
    </View>
    {storageError && <Pressable onPress={dismissStorageError} accessibilityRole="button" accessibilityLabel="Închide avertizarea de salvare" style={styles.warning}><Text style={styles.warningText}>Salvarea locală nu este disponibilă. Datele se pot pierde la închidere.</Text><Icon name="close" size={15} color={c.danger} /></Pressable>}
    <Tabs initialRouteName="index" backBehavior="initialRoute" tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background }, animation: 'none' }}>
      <Tabs.Screen name="index" options={{ title: 'Cronometru' }} />
      <Tabs.Screen name="history" options={{ title: 'Istoric' }} />
    </Tabs>
    <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
    {notice && <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite"><Icon name="check" size={17} color={c.lime} /><Text style={styles.toastText}>{notice}</Text></View>}
  </View></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  desktop: { flex: 1, alignItems: 'center', backgroundColor: '#E8ECDD' },
  app: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: c.background },
  header: { paddingHorizontal: 26, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 35, height: 35, borderRadius: 12, backgroundColor: c.lime, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: f.heavy, fontSize: 22, letterSpacing: -0.9, color: c.ink },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DFE4D5', borderRadius: 16 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 26, paddingTop: 13, gap: 12, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 47, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 12 },
  selectedTab: { backgroundColor: '#E8EEDC' },
  tabText: { fontFamily: f.medium, fontSize: 11, color: c.muted },
  selectedTabText: { color: c.ink, fontFamily: f.semibold },
  badge: { backgroundColor: '#DCE5CB', paddingHorizontal: 5, minWidth: 18, borderRadius: 5, height: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: f.semibold, fontSize: 9, color: c.green },
  runningDot: { width: 5, height: 5, backgroundColor: c.green, borderRadius: 3 },
  toast: { position: 'absolute', bottom: 100, left: 26, right: 26, borderRadius: 16, backgroundColor: c.ink, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: '0 6px 20px rgba(23,30,18,0.14)' },
  toastText: { fontFamily: f.medium, color: '#F6F7F2', fontSize: 12, flex: 1, lineHeight: 18 },
  warning: { marginHorizontal: 26, marginBottom: 12, padding: 12, backgroundColor: c.dangerSoft, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  warningText: { color: c.danger, fontFamily: f.regular, fontSize: 11, lineHeight: 17, flex: 1 },
});
