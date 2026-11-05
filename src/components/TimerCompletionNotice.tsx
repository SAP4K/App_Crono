import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, Palette } from '../theme';

export function TimerCompletionNotice() {
  const { data, notice } = useCrono();
  const styles = useThemeStyles(createStyles);
  if (data.timer.status !== 'completed') return null;
  return <View style={styles.notice} accessibilityLabel="Temporizator finalizat" accessibilityLiveRegion="polite">
    <Text style={styles.text}>{notice?.startsWith('Timpul a expirat.') ? notice : 'Timpul a expirat.'}</Text>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  notice: { marginHorizontal: 26, marginBottom: 12, padding: 14, borderRadius: 14, backgroundColor: c.limeSoft },
  text: { fontFamily: f.semibold, color: c.green, fontSize: 13, lineHeight: 19 },
});
