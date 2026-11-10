import { MotionPressable } from './MotionPressable';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useI18n } from '../hooks/useI18n';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, Palette } from '../theme';
import { notificationStatus } from '../i18n/notificationStatus';

export function SystemNotificationNotice() {
  const { notifications, hydrationStatus, feedback, data } = useCrono();
  const { messages: m } = useI18n();
  const styles = useThemeStyles(createStyles);
  const code = notifications.readiness;
  const active = data.timer.status === 'running' || data.planning.run?.status === 'running';
  if (!notifications.supported || hydrationStatus !== 'loaded' || !data.preferences.systemNotifications
    || (!active && code !== 'failed') || ['registered', 'off', 'unsupported', 'unavailable', 'storage'].includes(code)) return null;
  const label = code === 'failed' ? m.notificationRetry : code === 'permission-needed' ? m.notificationPermissionRequest
    : code === 'exact-denied' ? m.notificationExactSettings : m.notificationOpenSettings;
  const act = () => {
    feedback();
    if (code === 'failed') void notifications.controller.reconcile(true);
    else if (code === 'permission-needed') void notifications.controller.requestPermission(true);
    else notifications.openSettings(code === 'exact-denied');
  };
  return <View style={styles.notice} accessibilityLiveRegion="polite">
    <Text style={styles.text}>{notificationStatus(code, m)}</Text>
    {code !== 'pending' && code !== 'short-sound' && <MotionPressable accessibilityRole="button" onPress={act}
      style={[styles.retry]}><Text style={styles.text}>{label}</Text></MotionPressable>}
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  notice: { marginHorizontal: 26, marginBottom: 12, padding: 12, borderRadius: 13, gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  text: { fontFamily: f.medium, color: c.ink, fontSize: 12, lineHeight: 18 },
  retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 10 },
});
