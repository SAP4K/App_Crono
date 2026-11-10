import { useI18n } from '../hooks/useI18n';
import { PropsWithChildren, useCallback, useEffect, useRef, type Ref } from 'react';
import { Pressable, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts as f, textSizes, Palette } from '../theme';
import { useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';
import { isolateSheetBackground } from '../hooks/sheetIsolation';
import { TimingNotices } from './TimingNotices';
import { MotionPressable } from './MotionPressable';
import { MotionScope, useMotionPreference } from '../context/MotionContext';

export function Sheet({ visible, title, onClose, onBack, children, scrollable = true, closeButtonRef }: PropsWithChildren<{
  visible: boolean; title: string; onClose: () => void; onBack?: () => void; scrollable?: boolean; closeButtonRef?: Ref<View>;
}>) {
  const { messages: m } = useI18n();
  const { reduceMotion } = useMotionPreference();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const isolation = useRef<(() => void) | null>(null);
  const releaseIsolation = useCallback(() => {
    isolation.current?.(); isolation.current = null;
  }, []);
  useEffect(() => {
    if (visible && isolation.current === null) isolation.current = isolateSheetBackground();
    else if (!visible && Platform.OS !== 'web') releaseIsolation();
  }, [visible, releaseIsolation]);
  useEffect(() => () => releaseIsolation(), [releaseIsolation]);
  return <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} accessibilityLabel={title} onDismiss={() => { if (!visible) releaseIsolation(); }} onRequestClose={onBack ?? onClose} statusBarTranslucent>
    <MotionScope active={visible}>
    <KeyboardAvoidingView aria-hidden={!visible} pointerEvents={visible ? 'auto' : 'none'} style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={m.closeWindow} />
      <View testID="sheet-surface" style={[styles.sheet, !scrollable && styles.tallSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        role={Platform.OS === 'web' ? undefined : 'dialog'} accessibilityLabel={Platform.OS === 'web' ? undefined : title}
        accessibilityViewIsModal onAccessibilityEscape={onBack ?? onClose}>
        <View style={styles.handle} />
        <View style={styles.heading}>
          {onBack && <MotionPressable onPress={onBack} accessibilityLabel={m.back} accessibilityRole="button"
            style={[styles.close]}><Icon name="arrow" size={20} /></MotionPressable>}
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <MotionPressable ref={closeButtonRef} onPress={onClose} accessibilityLabel={m.close} accessibilityRole="button" style={() => styles.close}><Icon name="close" size={20} /></MotionPressable>
        </View>
        <TimingNotices />
        {scrollable ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.content, styles.staticContent]}>{children}</View>}
      </View>
    </KeyboardAvoidingView>
    </MotionScope>
  </Modal>;
}

export function ConfirmSheet({ visible, title, description, confirmLabel, onClose, onConfirm }: {
  visible: boolean; title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void;
}) {
  const { messages: m } = useI18n();
  const styles = useThemeStyles(createStyles);
  return <Sheet visible={visible} title={title} onClose={onClose}>
    <Text style={styles.description}>{description}</Text>
    <MotionPressable accessibilityRole="button" onPress={onConfirm} style={[styles.confirm]}><Text style={styles.confirmText}>{confirmLabel}</Text></MotionPressable>
    <MotionPressable accessibilityRole="button" onPress={onClose} style={[styles.cancel]}><Text style={styles.cancelText}>{m.cancel}</Text></MotionPressable>
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: c.overlay, paddingTop: 60 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '100%', backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  tallSheet: { height: '94%' },
  staticContent: { flex: 1, minHeight: 0 },
  handle: { alignSelf: 'center', width: 34, height: 4, backgroundColor: c.handle, borderRadius: 3, marginTop: 11, marginBottom: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingBottom: 10, gap: 10 },
  title: { fontFamily: f.bold, fontSize: textSizes.heading, color: c.ink, flex: 1, flexShrink: 1, minWidth: 0, letterSpacing: -0.7 },
  close: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.iconSurface, borderRadius: 22 },
  content: { paddingHorizontal: 26, paddingBottom: 6 },
  description: { fontFamily: f.regular, color: c.muted, fontSize: 14, lineHeight: 23, marginBottom: 25 },
  confirm: { backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
  confirmText: { fontFamily: f.semibold, color: c.danger, fontSize: 14 },
  cancel: { alignItems: 'center', padding: 18 },
  cancelText: { fontFamily: f.medium, color: c.muted, fontSize: 14 },
});
