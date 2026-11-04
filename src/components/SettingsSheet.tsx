import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { colors as c, fonts as f } from '../theme';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, update, feedback } = useCrono();
  const toggle = (key: 'haptics' | 'keepAwake', enabled: boolean) => {
    feedback();
    update((previous) => ({ ...previous, preferences: { ...previous.preferences, [key]: enabled } }));
  };
  return <Sheet visible={visible} title="În stilul tău." onClose={onClose}>
    <Text style={styles.subtitle}>Micile detalii fac diferența.</Text>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="haptics" /></View>
      <View style={styles.copy}><Text style={styles.label}>Feedback tactil</Text><Text style={styles.description}>O vibrație discretă la fiecare apăsare.</Text></View>
      <Switch accessibilityLabel="Feedback tactil" value={data.preferences.haptics} onValueChange={(value) => toggle('haptics', value)} trackColor={{ false: '#DDE2D3', true: c.lime }} thumbColor={c.surface} ios_backgroundColor="#DDE2D3" />
    </View>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="screen" /></View>
      <View style={styles.copy}><Text style={styles.label}>Ecran mereu activ</Text><Text style={styles.description}>Cât timp cronometrul rulează.</Text></View>
      <Switch accessibilityLabel="Ecran mereu activ" value={data.preferences.keepAwake} onValueChange={(value) => toggle('keepAwake', value)} trackColor={{ false: '#DDE2D3', true: c.lime }} thumbColor={c.surface} ios_backgroundColor="#DDE2D3" />
    </View>
    {Platform.OS === 'web' && <Text style={styles.webNote}>Aceste două opțiuni se aplică în aplicația de pe telefon.</Text>}
    <View style={styles.about}><View style={styles.aboutMark}><Icon name="clock" size={28} /></View><Text style={styles.brand}>CRONO <Text style={styles.version}>1.0</Text></Text><Text style={styles.tagline}>Mai multă prezență. Secundă cu secundă.</Text><View style={styles.divider} /><Text style={styles.privacy}>Fără cont. Fără reclame.{ '\n' }Sesiunile tale sunt salvate pe acest dispozitiv.</Text><Text style={styles.limit}>Istoricul păstrează ultimele 50 de sesiuni.</Text></View>
  </Sheet>;
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: 13, marginBottom: 27 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 21, borderBottomWidth: 1, borderColor: c.border, gap: 12 },
  icon: { backgroundColor: '#E9EEDD', width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 6 },
  label: { fontFamily: f.semibold, color: c.ink, fontSize: 13 },
  description: { fontFamily: f.regular, color: c.muted, fontSize: 10, lineHeight: 16 },
  webNote: { fontFamily: f.regular, color: c.muted, fontSize: 11, lineHeight: 18, marginTop: 14 },
  about: { alignItems: 'center', paddingVertical: 32 },
  aboutMark: { backgroundColor: c.lime, width: 57, height: 57, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { fontFamily: f.heavy, color: c.ink, fontSize: 20, letterSpacing: -0.5 },
  version: { fontFamily: f.medium, color: c.muted, fontSize: 11 },
  tagline: { fontFamily: f.regular, color: c.muted, fontSize: 11, marginTop: 9, textAlign: 'center' },
  divider: { width: 25, height: 1, backgroundColor: '#D4DBC7', marginVertical: 22 },
  privacy: { fontFamily: f.regular, color: c.muted, fontSize: 11, lineHeight: 19, textAlign: 'center' },
  limit: { fontFamily: f.regular, color: c.muted, fontSize: 10, marginTop: 14 },
});
