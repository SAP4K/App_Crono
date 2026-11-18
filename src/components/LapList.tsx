import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { useI18n } from '../hooks/useI18n';
import { FlatList, StyleSheet, Text, View, type FlatListProps } from 'react-native';
import { formatTime, Lap, lapStats } from '../core/stopwatch';
import { textSizes, radii, fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';

export function LapListContent({ laps, summaryOnly = false, summaryStats }: { laps: Lap[]; summaryOnly?: boolean; summaryStats?: ReturnType<typeof lapStats> }) {
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const stats = useMemo(() => summaryStats === undefined ? lapStats(laps) : summaryStats, [laps, summaryStats]);
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
          {!summaryOnly && [...laps].reverse().map((lap) => <LapRow key={lap.number} lap={lap} best={laps.length > 1 && lap.splitMs === stats?.best} />)}
        </>
      )}
    </View>
  );
}

const LapRow = memo(function LapRow({ lap, best }: { lap: Lap; best: boolean }) {
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  return <View testID={`lap-row-${lap.number}`} style={[styles.row, best && styles.bestRow]}>
    <View style={styles.numberGroup}><Text style={[styles.number, best && { color: c.green }]}>{String(lap.number).padStart(2, '0')}</Text>{best && <View style={styles.bestDot} />}</View>
    <Text style={[styles.split, best && { color: c.green }]}>{formatTime(lap.splitMs)}</Text>
    <Text style={styles.total}>{formatTime(lap.elapsedMs)}</Text>
  </View>;
});
const lapKey = (lap: Lap) => String(lap.number);

/** Own the complete surface scroll; callers put their controls in its header/footer. */
export function LapList({ laps, header, footer, style, contentContainerStyle }: {
  laps: Lap[]; header?: ReactNode; footer?: ReactNode;
} & Pick<FlatListProps<Lap>, 'style' | 'contentContainerStyle'>) {
  const reversed = useMemo(() => [...laps].reverse(), [laps]);
  const stats = useMemo(() => lapStats(laps), [laps]);
  const renderRow = useCallback(({ item }: { item: Lap }) => <LapRow lap={item} best={laps.length > 1 && item.splitMs === stats?.best} />, [laps.length, stats]);
  return <FlatList testID="lap-list" style={[{ flex: 1 }, style]} contentContainerStyle={contentContainerStyle}
    data={reversed} keyExtractor={lapKey} renderItem={renderRow} initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5}
    removeClippedSubviews={false} showsVerticalScrollIndicator={false}
    ListHeaderComponent={<>{header}<LapListContent laps={laps} summaryOnly summaryStats={stats} /></>} ListFooterComponent={<>{footer}</>} />;
}

const createStyles = (c: Palette) => StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 29, marginBottom: 17 },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: f.semibold, fontSize: 17, color: c.ink },
  count: { backgroundColor: c.badge, minWidth: 24, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontFamily: f.semibold, fontSize: textSizes.small, color: c.badgeText },
  bestHint: { fontFamily: f.regular, fontSize: textSizes.small, color: c.muted },
  empty: { alignItems: 'center', backgroundColor: c.empty, borderRadius: radii.control, paddingVertical: 26, borderWidth: 1, borderColor: c.separator, borderStyle: 'solid' },
  emptyIcon: { marginBottom: 10 },
  emptyTitle: { fontFamily: f.medium, fontSize: textSizes.body, color: c.ink, marginBottom: 6 },
  emptyText: { fontFamily: f.regular, fontSize: textSizes.small, color: c.muted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 15 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.summary, borderRadius: radii.control, paddingVertical: 15, marginBottom: 20 },
  stat: { flex: 1, paddingHorizontal: 15, gap: 7 },
  statLabel: { fontFamily: f.semibold, color: c.muted, fontSize: textSizes.small, letterSpacing: 1.1 },
  statValue: { fontFamily: f.semibold, color: c.ink, fontSize: 17, fontVariant: ['tabular-nums'] },
  separator: { width: 1, height: 29, backgroundColor: c.separator },
  columns: { flexDirection: 'row', paddingHorizontal: 14, marginBottom: 6 },
  columnNumber: { width: 59, fontFamily: f.semibold, fontSize: textSizes.small, letterSpacing: 1.2, color: c.muted },
  columnTime: { flex: 1, textAlign: 'right', fontFamily: f.semibold, fontSize: textSizes.small, letterSpacing: 1.2, color: c.muted },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 17, borderRadius: radii.control, borderBottomWidth: 1, borderBottomColor: c.separator },
  bestRow: { backgroundColor: c.limeSoft, borderBottomColor: 'transparent' },
  numberGroup: { width: 59, flexDirection: 'row', alignItems: 'center', gap: 7 },
  number: { fontFamily: f.medium, color: c.muted, fontSize: textSizes.caption },
  bestDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.green },
  split: { flex: 1, textAlign: 'right', fontFamily: f.semibold, color: c.ink, fontSize: textSizes.body, fontVariant: ['tabular-nums'] },
  total: { flex: 1, textAlign: 'right', fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, fontVariant: ['tabular-nums'] },
});
