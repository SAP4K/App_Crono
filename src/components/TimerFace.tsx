import { useI18n } from '../hooks/useI18n';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { TimerState } from '../core/timer';
import { formatRemaining, remainingTime } from '../core/timer';
import { deadlineLabel } from '../i18n/formatters';
import { useThemeStyles } from '../context/ThemeContext';
import { textSizes, radii, fonts as f, Palette } from '../theme';

export function TimerFace({ timer, compact = false }: { timer: TimerState; compact?: boolean }) {
  const { language, messages: m } = useI18n();
  const styles = useThemeStyles(createStyles);
  const { width, height } = useWindowDimensions();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (timer.status !== 'running') return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      if (interval) clearInterval(interval);
      const active = Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active';
      setNow(Date.now());
      if (active) interval = setInterval(() => setNow(Date.now()), 200);
    };
    const active = Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active';
    if (active) interval = setInterval(() => setNow(Date.now()), 200);
    const subscription = AppState.addEventListener('change', refresh);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', refresh);
    return () => {
      if (interval) clearInterval(interval);
      subscription.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', refresh);
    };
  }, [timer.status, timer.deadlineAt]);
  const size = Math.min(width - 48, 432);
  const remaining = remainingTime(timer, now);
  const status = { idle: m.timerIdle, running: m.timerRunning, paused: m.timerPaused, completed: m.timerExpired }[timer.status];
  return <View style={[styles.face, { width: size, minHeight: compact ? 156 : Math.min(230, Math.max(180, height * 0.27)) }]}>
    <Text style={[styles.digits, { fontSize: size * 0.145 }]} accessibilityLabel={m.remainingTime(formatRemaining(remaining))}>{formatRemaining(remaining)}</Text>
    <Text style={styles.status}>{status}</Text>
    {timer.status === 'running' && timer.deadlineAt !== null && <Text style={styles.endTime}>
      {m.timerEndsAt(deadlineLabel(timer.deadlineAt, now, language))}
    </Text>}
    <View style={styles.progress} aria-hidden><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, remaining / timer.durationMs)) * 100}%` }]} /></View>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  face: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 16, paddingVertical: 24, paddingHorizontal: 16, borderWidth: 1, borderColor: c.separator, borderRadius: radii.control },
  progress: { height: 3, backgroundColor: c.separator, alignSelf: 'stretch', marginTop: 24, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: c.green },
  digits: { fontFamily: f.semibold, color: c.ink, fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  status: { fontFamily: f.medium, color: c.muted, fontSize: textSizes.small, marginTop: 12 },
  endTime: { maxWidth: '100%', textAlign: 'center', fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 9 },
});
