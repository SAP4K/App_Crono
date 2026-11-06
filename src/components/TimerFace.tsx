import { useI18n } from '../hooks/useI18n';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { TimerState } from '../core/timer';
import { formatRemaining, remainingTime } from '../core/timer';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { fonts as f, Palette } from '../theme';

export function TimerFace({ timer }: { timer: TimerState }) {
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
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
  const size = Math.min(width - 52, 310, Math.max(180, height * 0.32));
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const remaining = remainingTime(timer, now);
  const status = { idle: m.timerIdle, running: m.timerRunning, paused: m.timerPaused, completed: m.timerExpired }[timer.status];
  return <View style={[styles.face, { width: size, height: size }]}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.border} strokeWidth={3} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.green} strokeWidth={4} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - remaining / timer.durationMs)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
    <Text style={[styles.digits, { fontSize: size * 0.135 }]} accessibilityLabel={m.remainingTime(formatRemaining(remaining))}>{formatRemaining(remaining)}</Text>
    <Text style={styles.status}>{status}</Text>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  face: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  digits: { fontFamily: f.semibold, color: c.ink, fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  status: { fontFamily: f.medium, color: c.muted, fontSize: 11, marginTop: 12 },
});
