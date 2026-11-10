import { MotionPressable } from './MotionPressable';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { useBackupTransfer } from '../hooks/useBackupTransfer';
import { useI18n } from '../hooks/useI18n';
import { fonts as f, textSizes, type Palette } from '../theme';
import { SettingsSwitch } from './SettingsSwitch';

export function BackupSettings() {
  const { messages: m } = useI18n();
  const { storageError, feedback } = useCrono();
  const { controller, state, available } = useBackupTransfer();
  const [applyPreferences, setApplyPreferences] = useState(false);
  const styles = useThemeStyles(createStyles);
  const busy = state.status === 'reading' || state.status === 'exporting';
  const preview = state.status === 'preview';
  return <View style={styles.content}>
    <Text style={styles.body}>{m.backup.help}</Text>
    {state.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{m.backup.errors[state.error]}</Text>}
    {storageError && <Text accessibilityLiveRegion="polite" style={styles.error}>{m.storageWarning}</Text>}
    {preview && state.preview ? <>
      <Text accessibilityRole="header" style={styles.heading}>{m.backup.review}</Text>
      <Text style={styles.body}>{m.backup.counts(state.preview.schedules, state.preview.sessions)}</Text>
      <View style={styles.preference}>
        <Text style={[styles.body, styles.copy]}>{m.backup.applyPreferences}</Text>
        <SettingsSwitch accessibilityLabel={m.backup.applyPreferences} value={applyPreferences} onValueChange={setApplyPreferences} />
      </View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.backup.confirm} disabled={!available}
        onPress={() => { feedback(); controller.confirm(applyPreferences); }} style={[styles.primary, !available && styles.disabled]}>
        <Text style={styles.primaryText}>{m.backup.confirm}</Text>
      </MotionPressable>
    </> : <>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.backup.export} disabled={busy || !available}
        onPress={() => { feedback(); void controller.export(); }} style={[styles.primary, (busy || !available) && styles.disabled]}>
        <Text style={styles.primaryText}>{m.backup.export}</Text>
      </MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.backup.import} disabled={busy || !available}
        onPress={() => { feedback(); setApplyPreferences(false); void controller.read(); }} style={[styles.secondary, (busy || !available) && styles.disabled]}>
        <Text style={styles.body}>{m.backup.import}</Text>
      </MotionPressable>
    </>}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.body}>{m.backup.busy}</Text>}
    {(busy || preview) && <MotionPressable accessibilityRole="button" accessibilityLabel={m.cancel} onPress={() => { feedback(); controller.cancel(); setApplyPreferences(false); }} style={[styles.secondary]}><Text style={styles.body}>{m.cancel}</Text></MotionPressable>}
    {(state.status === 'imported' || state.status === 'exported') && <Text accessibilityLiveRegion="polite" style={styles.body}>{state.status === 'imported' ? m.backup.imported : m.backup.exported}</Text>}
    {!available && <Text style={styles.error}>{m.backup.errors.notReady}</Text>}
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  content: { gap: 16, paddingVertical: 12 },
  body: { fontFamily: f.regular, fontSize: textSizes.body, color: c.ink, lineHeight: 22 },
  heading: { fontFamily: f.bold, fontSize: 18, color: c.ink },
  primary: { minHeight: 48, borderRadius: 12, padding: 12, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: f.semibold, fontSize: textSizes.body, color: c.actionText, textAlign: 'center' },
  secondary: { minHeight: 48, borderRadius: 12, padding: 12, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center' },
  preference: { flexDirection: 'row', alignItems: 'center', gap: 12 }, copy: { flex: 1 },
  error: { fontFamily: f.regular, fontSize: textSizes.body, color: c.danger, lineHeight: 22 },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.65 },
});
