import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { data, update, feedback } = useCrono();
  // React Native Web has a separate active thumb prop; native Switch uses thumbColor for both states.
  const webThumb = Platform.OS === 'web' ? { activeThumbColor: c.surface } : {};
  const toggle = (key: 'haptics' | 'keepAwake' | 'timerSound', enabled: boolean) => {
    feedback();
    update((previous) => ({ ...previous, preferences: { ...previous.preferences, [key]: enabled } }));
  };
  return <Sheet visible={visible} title="În stilul tău." onClose={onClose}>
    <Text style={styles.subtitle}>Micile detalii fac diferența.</Text>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="moon" /></View>
      <View style={styles.copy}><Text style={styles.label}>Mod întunecat</Text><Text style={styles.description}>Aspectul ales de tine rămâne salvat.</Text></View>
      <Switch {...webThumb} accessibilityLabel="Mod întunecat" value={data.preferences.theme === 'dark'} onValueChange={(enabled) => {
        feedback();
        update((previous) => ({ ...previous, preferences: { ...previous.preferences, theme: enabled ? 'dark' : 'light' } }));
      }} trackColor={{ false: c.border, true: c.lime }} thumbColor={c.surface} ios_backgroundColor={c.border} />
    </View>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="sound" /></View>
      <View style={styles.copy}><Text style={styles.label}>Sunet temporizator</Text><Text style={styles.description}>La final, cât timp aplicația este deschisă.</Text></View>
      <Switch {...webThumb} accessibilityLabel="Sunet temporizator" value={data.preferences.timerSound} onValueChange={(value) => toggle('timerSound', value)} trackColor={{ false: c.border, true: c.lime }} thumbColor={c.surface} ios_backgroundColor={c.border} />
    </View>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="haptics" /></View>
      <View style={styles.copy}><Text style={styles.label}>Feedback tactil</Text><Text style={styles.description}>O vibrație discretă la fiecare apăsare.</Text></View>
      <Switch {...webThumb} accessibilityLabel="Feedback tactil" value={data.preferences.haptics} onValueChange={(value) => toggle('haptics', value)} trackColor={{ false: c.border, true: c.lime }} thumbColor={c.surface} ios_backgroundColor={c.border} />
    </View>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="screen" /></View>
      <View style={styles.copy}><Text style={styles.label}>Ecran mereu activ</Text><Text style={styles.description}>Cât timp cronometrul sau temporizatorul rulează.</Text></View>
      <Switch {...webThumb} accessibilityLabel="Ecran mereu activ" value={data.preferences.keepAwake} onValueChange={(value) => toggle('keepAwake', value)} trackColor={{ false: c.border, true: c.lime }} thumbColor={c.surface} ios_backgroundColor={c.border} />
    </View>
    {Platform.OS === 'web' && <Text style={styles.webNote}>Feedbackul tactil și ecranul mereu activ se aplică pe telefon. Tema se schimbă și în browser.</Text>}
    <View style={styles.about}><View style={styles.aboutMark}><Icon name="clock" size={28} color={c.onAccent} /></View><Text style={styles.brand}>CRONO <Text style={styles.version}>1.0</Text></Text><Text style={styles.tagline}>Mai multă prezență. Secundă cu secundă.</Text><View style={styles.divider} /><Text style={styles.privacy}>Fără cont. Fără reclame.{ '\n' }Sesiunile tale sunt salvate pe acest dispozitiv.</Text><Text style={styles.limit}>Istoricul păstrează ultimele 50 de sesiuni.</Text></View>
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: 13, marginBottom: 27 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 21, borderBottomWidth: 1, borderColor: c.border, gap: 12 },
  icon: { backgroundColor: c.iconSurface, width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 6 },
  label: { fontFamily: f.semibold, color: c.ink, fontSize: 13 },
  description: { fontFamily: f.regular, color: c.muted, fontSize: 10, lineHeight: 16 },
  webNote: { fontFamily: f.regular, color: c.muted, fontSize: 11, lineHeight: 18, marginTop: 14 },
  about: { alignItems: 'center', paddingVertical: 32 },
  aboutMark: { backgroundColor: c.lime, width: 57, height: 57, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { fontFamily: f.heavy, color: c.ink, fontSize: 20, letterSpacing: -0.5 },
  version: { fontFamily: f.medium, color: c.muted, fontSize: 11 },
  tagline: { fontFamily: f.regular, color: c.muted, fontSize: 11, marginTop: 9, textAlign: 'center' },
  divider: { width: 25, height: 1, backgroundColor: c.border, marginVertical: 22 },
  privacy: { fontFamily: f.regular, color: c.muted, fontSize: 11, lineHeight: 19, textAlign: 'center' },
  limit: { fontFamily: f.regular, color: c.muted, fontSize: 10, marginTop: 14 },
});
