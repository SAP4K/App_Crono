import { MotionPressable } from './MotionPressable';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useI18n } from '../hooks/useI18n';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, radii, Palette } from '../theme';

export function BackgroundNotificationHelp() {
  const { notifications, feedback } = useCrono();
  const { messages: m } = useI18n();
  const styles = useThemeStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const delivery = notifications.state.delivery;
  const copy = m.notificationBackground;
  return <View style={styles.container}>
    {delivery.platform === 'android' && <>
      <Text style={styles.text}>{delivery.exactAlarm === 'not-required' ? copy.exactNotRequired : delivery.exactAlarm === 'granted'
        ? copy.exactGranted : delivery.exactAlarm === 'denied' ? m.notificationExactHelp : copy.exactUnknown}</Text>
      <Text style={styles.text}>{delivery.battery === 'unrestricted' ? copy.batteryUnrestricted
        : delivery.battery === 'optimized' ? copy.batteryOptimized : copy.batteryUnknown}</Text>
      <MotionPressable accessibilityRole="button" onPress={() => { feedback(); notifications.openSettings('battery'); }}
        style={[styles.button]}><Text style={styles.label}>{copy.batterySettings}</Text></MotionPressable>
    </>}
    <MotionPressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => { feedback(); setExpanded((value) => !value); }}
      style={[styles.button]}><Text style={styles.label}>{copy.help}</Text></MotionPressable>
    {expanded && <View style={styles.container}>
      <Text style={styles.text}>{copy.usage}</Text>
      <Text style={styles.text}>{delivery.platform === 'android' ? copy.androidHelp : copy.iosHelp}</Text>
    </View>}
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  container: { gap: 12 },
  text: { fontFamily: f.regular, color: c.muted, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: f.medium, color: c.ink, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  button: { minHeight: 44, padding: 12, justifyContent: 'center', alignItems: 'center', borderRadius: radii.control, borderWidth: 1, borderColor: c.border },
});
