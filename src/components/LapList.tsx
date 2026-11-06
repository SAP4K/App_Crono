import { useI18n } from '../hooks/useI18n';
import { StyleSheet, Text, View } from 'react-native';
import { formatTime, Lap, lapStats } from '../core/stopwatch';
import { fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';

export function LapList({ laps }: { laps: Lap[] }) {
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const stats = lapStats(laps);
  return (
    <View>
      <View style={styles.heading}>
        <View style={styles.titleGroup}><Text style={styles.title}>{m.laps}</Text><View style={styles.count}><Text style={styles.countText}>{laps.length}</Text></View></View>
        {laps.length > 1 && <Text style={styles.bestHint}><Text style={{ color: c.green }}>●</Text> {m.fastest}</Text>}
      </View>
      {laps.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Icon name="flag" size={21} color={c.muted} /></View>
          <Text style={styles.emptyTitle}>{m.lapsEmptyTitle}</Text>
          <Text style={styles.emptyText}>{m.lapsEmptyText}</Text>
        </View>
      ) : (
        <>
          {stats && laps.length > 1 && <View style={styles.summary}>
            <View style={styles.stat}><Text style={styles.statLabel}>{m.fastestUpper}</Text><Text style={[styles.statValue, { color: c.green }]}>{formatTime(stats.best)}</Text></View>
            <View style={styles.separator} />
            <View style={styles.stat}><Text style={styles.statLabel}>{m.averageUpper}</Text><Text style={styles.statValue}>{formatTime(stats.average)}</Text></View>
          </View>}
          <View style={styles.columns}><Text style={styles.columnNumber}>{m.lapUpper}</Text><Text style={styles.columnTime}>{m.durationUpper}</Text><Text style={styles.columnTime}>{m.totalUpper}</Text></View>
          {[...laps].reverse().map((lap) => {
            const best = laps.length > 1 && lap.splitMs === stats?.best;
            return <View key={lap.number} style={[styles.row, best && styles.bestRow]}>
              <View style={styles.numberGroup}><Text style={[styles.number, best && { color: c.green }]}>{String(lap.number).padStart(2, '0')}</Text>{best && <View style={styles.bestDot} />}</View>
              <Text style={[styles.split, best && { color: c.green }]}>{formatTime(lap.splitMs)}</Text>
              <Text style={styles.total}>{formatTime(lap.elapsedMs)}</Text>
            </View>;
          })}
        </>
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 29, marginBottom: 17 },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: f.semibold, fontSize: 17, color: c.ink },
  count: { backgroundColor: c.badge, minWidth: 24, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontFamily: f.semibold, fontSize: 11, color: c.badgeText },
  bestHint: { fontFamily: f.regular, fontSize: 10, color: c.muted },
  empty: { alignItems: 'center', backgroundColor: c.empty, borderRadius: 20, paddingVertical: 26, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
  emptyIcon: { marginBottom: 10 },
  emptyTitle: { fontFamily: f.medium, fontSize: 13, color: c.ink, marginBottom: 6 },
  emptyText: { fontFamily: f.regular, fontSize: 11, color: c.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 15 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.summary, borderRadius: 15, paddingVertical: 15, marginBottom: 20 },
  stat: { flex: 1, paddingHorizontal: 15, gap: 7 },
  statLabel: { fontFamily: f.semibold, color: c.muted, fontSize: 8, letterSpacing: 1.1 },
  statValue: { fontFamily: f.semibold, color: c.ink, fontSize: 17, fontVariant: ['tabular-nums'] },
  separator: { width: 1, height: 29, backgroundColor: c.border },
  columns: { flexDirection: 'row', paddingHorizontal: 14, marginBottom: 6 },
  columnNumber: { width: 59, fontFamily: f.semibold, fontSize: 8, letterSpacing: 1.2, color: c.muted },
  columnTime: { flex: 1, textAlign: 'right', fontFamily: f.semibold, fontSize: 8, letterSpacing: 1.2, color: c.muted },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 17, borderRadius: 11, borderBottomWidth: 1, borderBottomColor: c.border },
  bestRow: { backgroundColor: c.limeSoft, borderBottomColor: 'transparent' },
  numberGroup: { width: 59, flexDirection: 'row', alignItems: 'center', gap: 7 },
  number: { fontFamily: f.medium, color: c.muted, fontSize: 12 },
  bestDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.green },
  split: { flex: 1, textAlign: 'right', fontFamily: f.semibold, color: c.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
  total: { flex: 1, textAlign: 'right', fontFamily: f.regular, color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
