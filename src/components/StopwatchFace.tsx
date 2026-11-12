import { useI18n } from '../hooks/useI18n';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { elapsed, formatTime, Stopwatch } from '../core/stopwatch';
import { textSizes, radii, fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';

export function StopwatchFace({ stopwatch }: { stopwatch: Stopwatch }) {
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [now, setNow] = useState(Date.now);
  const { width, height, fontScale } = useWindowDimensions();
  const compact = height < 740;
  const running = stopwatch.startedAt !== null;
  useEffect(() => {
    if (!running) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
      setNow(Date.now());
      if (AppState.currentState === 'active' || AppState.currentState == null) {
        interval = setInterval(() => setNow(Date.now()), 32);
      }
    };
    interval = setInterval(() => setNow(Date.now()), 32);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { if (interval) clearInterval(interval); subscription.remove(); };
  }, [running]);

  const total = elapsed(stopwatch, now);
  const size = Math.min(width - 48, 432);
  const progress = (total % 60000) / 60000;
  const formatted = formatTime(total);
  const decimalAt = formatted.lastIndexOf('.');
  const long = total >= 3600000;
  return (
    <View style={styles.container}>
      <View style={[styles.dial, { width: size, minHeight: compact ? 180 : 216 }]}>
        <View style={styles.readout}>
          <Text style={styles.label}>{m.totalTimeUpper}</Text>
          <View style={styles.digits} accessible accessibilityLabel={m.totalTime(formatted)} accessibilityLiveRegion="none">
            <Text maxFontSizeMultiplier={1.15} style={[styles.time, { fontSize: long ? size * 0.13 : size * 0.18 }]}>{formatted.slice(0, decimalAt)}</Text>
            <Text maxFontSizeMultiplier={1.15} style={[styles.fraction, { fontSize: long ? size * 0.07 : size * 0.08 }]}>.{formatted.slice(decimalAt + 1)}</Text>
          </View>
          <View style={[styles.status, running && styles.statusActive]}>
            <View style={[styles.dot, { backgroundColor: running ? c.green : c.subtle }]} />
            <Text style={[styles.statusText, running && { color: c.green }]}>{running ? m.inProgress : total > 0 ? m.paused : m.ready}</Text>
          </View>
        </View>
        <View style={styles.progress} aria-hidden><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      </View>
      <View style={[styles.currentLap, compact && { marginTop: 12, marginBottom: 17 }]}>
        <Text style={styles.currentLabel}>{m.currentLap} <Text style={styles.lapNumber}>{String(stopwatch.laps.length + 1).padStart(2, '0')}</Text></Text>
        <Text style={styles.currentTime} maxFontSizeMultiplier={fontScale > 1.5 ? 1.25 : 1.5}>{formatTime(Math.max(0, total - (stopwatch.laps.at(-1)?.elapsedMs ?? 0)))}</Text>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 8 },
  dial: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.separator, borderRadius: radii.control, paddingVertical: 24 },
  readout: { alignItems: 'center', gap: 16, width: '100%' },
  progress: { height: 3, backgroundColor: c.separator, alignSelf: 'stretch', marginHorizontal: 24, marginTop: 24, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: c.green },
  label: { fontFamily: f.semibold, color: c.muted, fontSize: textSizes.small, letterSpacing: 1.5 },
  digits: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', paddingHorizontal: 15 },
  time: { fontFamily: f.medium, color: c.ink, letterSpacing: -2.8, fontVariant: ['tabular-nums'] },
  fraction: { fontFamily: f.medium, color: c.muted, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: c.secondary, borderRadius: radii.control },
  statusActive: { backgroundColor: c.limeSoft },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: f.medium, color: c.muted, fontSize: textSizes.small },
  currentLap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 19, marginBottom: 25 },
  currentLabel: { fontFamily: f.regular, fontSize: textSizes.caption, color: c.muted },
  lapNumber: { fontFamily: f.semibold, color: c.ink },
  currentTime: { fontFamily: f.semibold, color: c.ink, fontSize: textSizes.body, fontVariant: ['tabular-nums'] },
});
