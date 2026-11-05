import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useCrono } from '../context/CronoContext';
import { formatTime, Session, sessionText } from '../core/stopwatch';
import { Icon } from '../components/Icon';
import { LapList } from '../components/LapList';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';

function sessionDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function HistoryScreen() {
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { data, update, feedback, notify } = useCrono();
  const [selected, setSelected] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const total = data.sessions.reduce((sum, session) => sum + session.durationMs, 0);
  const totalLaps = data.sessions.reduce((sum, session) => sum + session.laps.length, 0);

  const share = async (session: Session) => {
    const message = sessionText(session);
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ title: 'Sesiune CRONO', text: message });
        else {
          await navigator.clipboard.writeText(message);
          notify('Rezultatele au fost copiate.');
        }
      } else await Share.share({ message, title: 'Sesiune CRONO' });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) notify('Partajarea nu este disponibilă acum.');
    }
  };

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.eyebrow}>PROGRESUL TĂU, ÎN TIMP</Text>
    <Text accessibilityRole="header" style={styles.title}>Momente păstrate.</Text>
    <Text style={styles.subtitle}>Fiecare sesiune spune o poveste.</Text>
    <View style={styles.overview}>
      <View style={styles.overviewTop}><Text style={styles.overviewLabel}>TIMP ADUNAT</Text><View style={styles.overviewIcon}><Icon name="history" size={22} color={c.lime} /></View></View>
      <Text style={styles.overviewTime}>{formatTime(total).slice(0, -3)}<Text style={styles.overviewUnit}> {total >= 3600000 ? 'h : min : sec' : 'min : sec'}</Text></Text>
      <View style={styles.overviewBottom}><Text style={styles.overviewMeta}>{data.sessions.length} {data.sessions.length === 1 ? 'sesiune salvată' : 'sesiuni salvate'}</Text><View style={styles.overviewDot} /><Text style={styles.overviewMeta}>{totalLaps} {totalLaps === 1 ? 'tură înregistrată' : 'ture înregistrate'}</Text></View>
    </View>
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Sesiunile tale</Text><Text style={styles.sectionCount}>{data.sessions.length} / 50</Text></View>
    {data.sessions.length === 0 ? <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon name="history" size={30} color={c.green} /></View>
      <Text style={styles.emptyTitle}>Primul pas e un start.</Text>
      <Text style={styles.emptyText}>După o sesiune, apasă pauză și salvează.{ '\n' }Vei găsi aici timpul și toate turele tale.</Text>
      <Link href="/" asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.emptyAction, pressed && { opacity: 0.7 }]}><Icon name="play" size={15} color={c.actionIcon} /><Text style={styles.emptyActionText}>La cronometru</Text></Pressable></Link>
    </View> : data.sessions.map((session, index) => <Pressable key={session.id} accessibilityRole="button" accessibilityLabel={`Sesiune ${sessionDate(session.savedAt)}, ${formatTime(session.durationMs)}, ${session.laps.length} ture`} onPress={() => { feedback(); setSelected(session); }} style={({ pressed }) => [styles.card, pressed && { opacity: 0.65 }]}>
      <View style={styles.cardMark}><Icon name="clock" size={21} color={c.green} /></View>
      <View style={styles.cardCopy}><Text style={styles.cardDate}>{sessionDate(session.savedAt)}{index === 0 && <Text style={styles.newLabel}> · RECENT</Text>}</Text><Text style={styles.cardTime}>{formatTime(session.durationMs)}</Text><Text style={styles.cardMeta}>{new Date(session.savedAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}   ·   {session.laps.length} {session.laps.length === 1 ? 'tură' : 'ture'}</Text></View>
      <Icon name="chevron" size={16} color={c.muted} />
    </Pressable>)}
    <View style={styles.privacy}><Icon name="check" size={13} color={c.muted} /><Text style={styles.privacyText}>Salvate doar pe dispozitivul tău.</Text></View>
    <Sheet visible={selected !== null} title="Sesiunea ta." onClose={() => setSelected(null)}>
      {selected && <>
        <Text style={styles.detailDate}>{sessionDate(selected.savedAt)} · {new Date(selected.savedAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</Text>
        <View style={styles.detailTotal}><Text style={styles.detailLabel}>TIMP TOTAL</Text><Text style={styles.detailTime} adjustsFontSizeToFit numberOfLines={1}>{formatTime(selected.durationMs)}</Text></View>
        {selected.laps.length > 0 ? <LapList laps={selected.laps} /> : <Text style={styles.noLaps}>Această sesiune nu are ture înregistrate.</Text>}
        <View style={styles.detailActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Șterge sesiunea" onPress={() => { feedback(); setDeleting(selected.id); setSelected(null); }} style={styles.delete}><Icon name="trash" size={19} color={c.danger} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { feedback(); void share(selected); }} style={({ pressed }) => [styles.share, pressed && { opacity: 0.7 }]}><Icon name="share" size={17} color={c.actionIcon} /><Text style={styles.shareText}>Distribuie rezultatele</Text></Pressable>
        </View>
      </>}
    </Sheet>
    <ConfirmSheet visible={deleting !== null} title="Ștergi sesiunea?" description="Sesiunea și turele ei vor fi șterse din istoricul acestui dispozitiv." confirmLabel="Șterge sesiunea" onClose={() => setDeleting(null)} onConfirm={() => { feedback(); update((previous) => ({ ...previous, sessions: previous.sessions.filter((session) => session.id !== deleting) })); setDeleting(null); notify('Sesiune ștearsă.'); }} />
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
