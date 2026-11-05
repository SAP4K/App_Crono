import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { elapsed, formatTime, Stopwatch } from '../core/stopwatch';
import { fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';

export function StopwatchFace({ stopwatch }: { stopwatch: Stopwatch }) {
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
  const size = Math.min(width - 52, 330, Math.max(180, height * (compact ? 0.32 : 0.36)));
  const center = size / 2;
  const radius = center - 21;
  const angle = ((total % 60000) / 60000) * Math.PI * 2 - Math.PI / 2;
  const progress = (total % 60000) / 60000;
  const formatted = formatTime(total);
  const decimalAt = formatted.lastIndexOf('.');
  const long = total >= 3600000;
  return (
    <View style={styles.container}>
      <View style={[styles.dial, { width: size, height: size }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
          <Circle cx={center} cy={center} r={radius} stroke={c.border} strokeWidth="1.5" fill="none" />
          {Array.from({ length: 60 }, (_, index) => {
            const tickAngle = (index / 60) * Math.PI * 2 - Math.PI / 2;
            const major = index % 5 === 0;
            const outer = center - 3;
            const inner = outer - (major ? 10 : 5);
            return <Line key={index} x1={center + Math.cos(tickAngle) * inner} y1={center + Math.sin(tickAngle) * inner} x2={center + Math.cos(tickAngle) * outer} y2={center + Math.sin(tickAngle) * outer} stroke={major ? c.tickMajor : c.tickMinor} strokeWidth={major ? 2 : 1} strokeLinecap="round" />;
          })}
          {progress > 0 && <Circle cx={center} cy={center} r={radius} fill="none" stroke={c.ink} strokeWidth="2.5" strokeDasharray={`${progress * 2 * Math.PI * radius} ${2 * Math.PI * radius}`} transform={`rotate(-90 ${center} ${center})`} strokeLinecap="round" />}
          <Circle cx={center + Math.cos(angle) * radius} cy={center + Math.sin(angle) * radius} r="6.5" fill={c.lime} stroke={c.ink} strokeWidth="2" />
        </Svg>
        <View style={styles.readout}>
          <Text style={styles.label}>TIMP TOTAL</Text>
          <View style={styles.digits} accessible accessibilityLabel={`Timp total ${formatted}`} accessibilityLiveRegion="none">
            <Text maxFontSizeMultiplier={1.15} style={[styles.time, { fontSize: long ? size * 0.132 : size * 0.185 }]}>{formatted.slice(0, decimalAt)}</Text>
            <Text maxFontSizeMultiplier={1.15} style={[styles.fraction, { fontSize: long ? size * 0.075 : size * 0.091 }]}>.{formatted.slice(decimalAt + 1)}</Text>
          </View>
          <View style={[styles.status, running && styles.statusActive]}>
            <View style={[styles.dot, { backgroundColor: running ? c.green : c.subtle }]} />
            <Text style={[styles.statusText, running && { color: c.green }]}>{running ? 'În desfășurare' : total > 0 ? 'În pauză' : 'Gata de start'}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.currentLap, compact && { marginTop: 12, marginBottom: 17 }]}>
        <Text style={styles.currentLabel}>Tura curentă <Text style={styles.lapNumber}>{String(stopwatch.laps.length + 1).padStart(2, '0')}</Text></Text>
        <Text style={styles.currentTime} maxFontSizeMultiplier={fontScale > 1.5 ? 1.25 : 1.5}>{formatTime(Math.max(0, total - (stopwatch.laps.at(-1)?.elapsedMs ?? 0)))}</Text>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 8 },
  dial: { alignItems: 'center', justifyContent: 'center' },
  readout: { alignItems: 'center', gap: 16 },
  label: { fontFamily: f.semibold, color: c.muted, fontSize: 10, letterSpacing: 2.5 },
  digits: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', paddingHorizontal: 15 },
  time: { fontFamily: f.medium, color: c.ink, letterSpacing: -2.8, fontVariant: ['tabular-nums'] },
  fraction: { fontFamily: f.medium, color: c.muted, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: c.secondary, borderRadius: 20 },
  statusActive: { backgroundColor: c.limeSoft },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: f.medium, color: c.muted, fontSize: 10 },
  currentLap: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 19, marginBottom: 25 },
  currentLabel: { fontFamily: f.regular, fontSize: 12, color: c.muted },
  lapNumber: { fontFamily: f.semibold, color: c.ink },
  currentTime: { fontFamily: f.semibold, color: c.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
});
