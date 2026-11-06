import { useI18n } from '../hooks/useI18n';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useCrono } from '../context/CronoContext';
import { formatTime, Session } from '../core/stopwatch';
import { sessionDate, sessionTime, sessionText } from '../i18n/formatters';
import { Icon } from '../components/Icon';
import { LapList } from '../components/LapList';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';


export default function HistoryScreen() {
  const { language, messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { data, update, feedback, notify } = useCrono();
  const [selected, setSelected] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const total = data.sessions.reduce((sum, session) => sum + session.durationMs, 0);
  const totalLaps = data.sessions.reduce((sum, session) => sum + session.laps.length, 0);

  const share = async (session: Session) => {
    const message = sessionText(session, language);
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ title: m.shareTitle, text: message });
        else {
          await navigator.clipboard.writeText(message);
          notify('resultsCopied');
        }
      } else await Share.share({ message, title: m.shareTitle });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) notify('shareUnavailable');
    }
  };

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.eyebrow}>{m.historyEyebrow}</Text>
    <Text accessibilityRole="header" style={styles.title}>{m.historyTitle}</Text>
    <Text style={styles.subtitle}>{m.historySubtitle}</Text>
    <View style={styles.overview}>
      <View style={styles.overviewTop}><Text style={styles.overviewLabel}>{m.accumulatedTime}</Text><View style={styles.overviewIcon}><Icon name="history" size={22} color={c.lime} /></View></View>
      <Text style={styles.overviewTime}>{formatTime(total).slice(0, -3)}<Text style={styles.overviewUnit}> {m.historyUnits(total >= 3600000)}</Text></Text>
      <View style={styles.overviewBottom}><Text style={styles.overviewMeta}>{m.savedSessions(data.sessions.length)}</Text><View style={styles.overviewDot} /><Text style={styles.overviewMeta}>{m.recordedLaps(totalLaps)}</Text></View>
    </View>
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{m.yourSessions}</Text><Text style={styles.sectionCount}>{data.sessions.length} / 50</Text></View>
    {data.sessions.length === 0 ? <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon name="history" size={30} color={c.green} /></View>
      <Text style={styles.emptyTitle}>{m.historyEmptyTitle}</Text>
      <Text style={styles.emptyText}>{m.historyEmptyText}</Text>
      <Link href="/" asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.emptyAction, pressed && { opacity: 0.7 }]}><Icon name="play" size={15} color={c.actionIcon} /><Text style={styles.emptyActionText}>{m.toStopwatch}</Text></Pressable></Link>
    </View> : data.sessions.map((session, index) => <Pressable key={session.id} accessibilityRole="button" accessibilityLabel={m.sessionLabel(sessionDate(session.savedAt, language), formatTime(session.durationMs), session.laps.length)} onPress={() => { feedback(); setSelected(session); }} style={({ pressed }) => [styles.card, pressed && { opacity: 0.65 }]}>
      <View style={styles.cardMark}><Icon name="clock" size={21} color={c.green} /></View>
      <View style={styles.cardCopy}><Text style={styles.cardDate}>{sessionDate(session.savedAt, language)}{index === 0 && <Text style={styles.newLabel}> · {m.recent}</Text>}</Text><Text style={styles.cardTime}>{formatTime(session.durationMs)}</Text><Text style={styles.cardMeta}>{sessionTime(session.savedAt, language)}   ·   {m.lapCount(session.laps.length)}</Text></View>
      <Icon name="chevron" size={16} color={c.muted} />
    </Pressable>)}
    <View style={styles.privacy}><Icon name="check" size={13} color={c.muted} /><Text style={styles.privacyText}>{m.savedLocally}</Text></View>
    <Sheet visible={selected !== null} title={m.sessionTitle} onClose={() => setSelected(null)}>
      {selected && <>
        <Text style={styles.detailDate}>{sessionDate(selected.savedAt, language)} · {sessionTime(selected.savedAt, language)}</Text>
        <View style={styles.detailTotal}><Text style={styles.detailLabel}>{m.totalTimeUpper}</Text><Text style={styles.detailTime} adjustsFontSizeToFit numberOfLines={1}>{formatTime(selected.durationMs)}</Text></View>
        {selected.laps.length > 0 ? <LapList laps={selected.laps} /> : <Text style={styles.noLaps}>{m.noLaps}</Text>}
        <View style={styles.detailActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={m.deleteSession} onPress={() => { feedback(); setDeleting(selected.id); setSelected(null); }} style={styles.delete}><Icon name="trash" size={19} color={c.danger} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { feedback(); void share(selected); }} style={({ pressed }) => [styles.share, pressed && { opacity: 0.7 }]}><Icon name="share" size={17} color={c.actionIcon} /><Text style={styles.shareText}>{m.shareResults}</Text></Pressable>
        </View>
      </>}
    </Sheet>
    <ConfirmSheet visible={deleting !== null} title={m.deleteSessionTitle} description={m.deleteSessionHelp} confirmLabel={m.deleteSession} onClose={() => setDeleting(null)} onConfirm={() => { feedback(); update((previous) => ({ ...previous, sessions: previous.sessions.filter((session) => session.id !== deleting) })); setDeleting(null); notify('sessionDeleted'); }} />
  </ScrollView>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 26, paddingTop: 3, paddingBottom: 28 },
  eyebrow: { fontFamily: f.semibold, fontSize: 8, color: c.green, letterSpacing: 1.7, marginBottom: 11 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: 29, letterSpacing: -1.3, marginBottom: 8 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: 12, marginBottom: 29 },
  overview: { backgroundColor: c.featured, borderRadius: 23, padding: 24 },
  overviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overviewLabel: { fontFamily: f.semibold, color: c.featuredMuted, fontSize: 8, letterSpacing: 2 },
  overviewIcon: { opacity: 0.8 },
  overviewTime: { fontFamily: f.medium, color: c.lime, fontSize: 34, letterSpacing: -1.5, marginTop: 19, marginBottom: 24, fontVariant: ['tabular-nums'] },
  overviewUnit: { fontFamily: f.regular, color: c.featuredMuted, fontSize: 9, letterSpacing: 0 },
  overviewBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  overviewMeta: { fontFamily: f.regular, color: c.featuredMuted, fontSize: 10 },
  overviewDot: { width: 3, height: 3, backgroundColor: c.featuredMuted, borderRadius: 2 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 31, marginBottom: 18 },
  sectionTitle: { fontFamily: f.semibold, color: c.ink, fontSize: 17 },
  sectionCount: { fontFamily: f.medium, color: c.muted, fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 35, backgroundColor: c.empty, borderRadius: 22, paddingHorizontal: 14 },
  emptyIcon: { backgroundColor: c.limeSoft, width: 65, height: 65, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontFamily: f.semibold, color: c.ink, fontSize: 17, marginBottom: 10 },
  emptyText: { fontFamily: f.regular, color: c.muted, fontSize: 11, lineHeight: 20, textAlign: 'center' },
  emptyAction: { marginTop: 24, backgroundColor: c.action, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22, minHeight: 48 },
  emptyActionText: { fontFamily: f.semibold, fontSize: 11, color: c.actionText },
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: c.surface, borderRadius: 18, padding: 17, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  cardMark: { width: 43, height: 48, backgroundColor: c.iconSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, gap: 7 },
  cardDate: { fontFamily: f.medium, color: c.muted, fontSize: 9 },
  newLabel: { color: c.green, fontSize: 7, fontFamily: f.semibold },
  cardTime: { fontFamily: f.semibold, color: c.ink, fontSize: 21, letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  cardMeta: { fontFamily: f.regular, color: c.muted, fontSize: 9 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 24 },
  privacyText: { fontFamily: f.regular, color: c.muted, fontSize: 9 },
  detailDate: { fontFamily: f.regular, color: c.muted, fontSize: 11, marginBottom: 27 },
  detailTotal: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 15, backgroundColor: c.limeSoft, borderRadius: 20 },
  detailLabel: { fontFamily: f.semibold, color: c.green, fontSize: 9, letterSpacing: 2, marginBottom: 12 },
  detailTime: { fontFamily: f.medium, color: c.ink, fontSize: 42, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  noLaps: { fontFamily: f.regular, color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 25, marginBottom: 10 },
  detailActions: { flexDirection: 'row', gap: 11, marginTop: 25, marginBottom: 6 },
  delete: { width: 55, minHeight: 55, backgroundColor: c.dangerSoft, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  share: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 55, backgroundColor: c.action, borderRadius: 16 },
  shareText: { fontFamily: f.semibold, color: c.actionText, fontSize: 12 },
});
