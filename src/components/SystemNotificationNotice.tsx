import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useI18n } from '../hooks/useI18n';
import { useThemeStyles } from '../context/ThemeContext';
import { buttonPressedStyle, fonts as f, Palette } from '../theme';

export function SystemNotificationNotice() {
  const { notifications, hydrationStatus, feedback } = useCrono();
  const { messages: m } = useI18n();
  const styles = useThemeStyles(createStyles);
  if (!notifications.supported || hydrationStatus !== 'loaded' || notifications.state.status !== 'failed') return null;
  return <View style={styles.notice} accessibilityLiveRegion="polite">
    <Text style={styles.text}>{m.notificationScheduleFailed}</Text>
    <Pressable accessibilityRole="button" onPress={() => { feedback(); void notifications.controller.reconcile(true); }}
      style={({ pressed }) => [styles.retry, pressed && buttonPressedStyle]}><Text style={styles.text}>{m.notificationRetry}</Text></Pressable>
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  notice: { marginHorizontal: 26, marginBottom: 12, padding: 12, borderRadius: 13, gap: 8, backgroundColor: c.dangerSoft },
  text: { fontFamily: f.medium, color: c.danger, fontSize: 12, lineHeight: 18 },
  retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.danger, paddingHorizontal: 10 },
});
