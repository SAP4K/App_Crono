import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts as f, Palette } from '../theme';
import { useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';
import { TimingNotices } from './TimingNotices';

export function Sheet({ visible, title, onClose, children, scrollable = true }: PropsWithChildren<{
  visible: boolean; title: string; onClose: () => void; scrollable?: boolean;
}>) {
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Închide fereastra" />
      <View style={[styles.sheet, !scrollable && styles.tallSheet, { paddingBottom: Math.max(insets.bottom, 20) }]} role="dialog" aria-modal accessibilityLabel={title} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <View style={styles.handle} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} accessibilityLabel="Închide" accessibilityRole="button" style={({ pressed }) => [styles.close, pressed && { opacity: 0.5 }]}><Icon name="close" size={20} /></Pressable>
        </View>
        <TimingNotices />
        {scrollable ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.content, styles.staticContent]}>{children}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function ConfirmSheet({ visible, title, description, confirmLabel, onClose, onConfirm }: {
  visible: boolean; title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return <Sheet visible={visible} title={title} onClose={onClose}>
    <Text style={styles.description}>{description}</Text>
    <Pressable accessibilityRole="button" onPress={onConfirm} style={({ pressed }) => [styles.confirm, pressed && { opacity: 0.75 }]}><Text style={styles.confirmText}>{confirmLabel}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Renunță</Text></Pressable>
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: c.overlay, paddingTop: 60 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '100%', backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  tallSheet: { height: '94%' },
  staticContent: { flex: 1, minHeight: 0 },
  handle: { alignSelf: 'center', width: 34, height: 4, backgroundColor: c.handle, borderRadius: 3, marginTop: 11, marginBottom: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingBottom: 10, gap: 10 },
  title: { fontFamily: f.bold, fontSize: 23, color: c.ink, flex: 1, letterSpacing: -0.7 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: c.iconSurface, borderRadius: 22 },
  content: { paddingHorizontal: 26, paddingBottom: 6 },
  description: { fontFamily: f.regular, color: c.muted, fontSize: 14, lineHeight: 23, marginBottom: 25 },
  confirm: { backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
  confirmText: { fontFamily: f.semibold, color: c.danger, fontSize: 14 },
  cancel: { alignItems: 'center', padding: 18 },
  cancelText: { fontFamily: f.medium, color: c.muted, fontSize: 14 },
});
