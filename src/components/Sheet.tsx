import { useI18n } from '../hooks/useI18n';
import { PropsWithChildren, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { Animated, Pressable, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts as f, textSizes, radii, Palette } from '../theme';
import { headingFamily } from '../typography';
import { useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';
import { isolateSheetBackground } from '../hooks/sheetIsolation';
import { TimingNotices } from './TimingNotices';
import { MotionPressable } from './MotionPressable';
import { MotionScope } from '../context/MotionContext';
import { useSheetMotion } from '../hooks/useSheetMotion';
import { isAppActive } from '../hooks/appActivity';

export function Sheet({ visible, title, onClose, onBack, children, scrollable = true, closeButtonRef, onAfterClose }: PropsWithChildren<{
  visible: boolean; title: string; onClose: () => void; onBack?: () => void; scrollable?: boolean; closeButtonRef?: Ref<View>; onAfterClose?: () => void;
}>) {
  const { messages: m } = useI18n();
  const motion = useSheetMotion(visible, onAfterClose);
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const isolation = useRef<(() => void) | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusedControl = useRef<HTMLElement | null>(null), focusInitialized = useRef(false);
  const surface = useRef<View>(null), close = useRef<View>(null), presented = useRef(false), dismissing = useRef(false);
  useImperativeHandle(closeButtonRef, () => close.current!);
  useLayoutEffect(() => {
    if (visible) { focusedControl.current = null; focusInitialized.current = false; }
  }, [visible]);
  useLayoutEffect(() => { presented.current = motion.present; }, [motion.present]);
  useLayoutEffect(() => { dismissing.current = false; }, [visible, title, onBack]);
  const releaseIsolation = useCallback(() => {
    isolation.current?.(); isolation.current = null;
  }, []);
  const finishDismiss = useCallback(() => {
    releaseIsolation();
    const target = opener.current; opener.current = null;
    // RNW's trap can unmount before root inertness is released. Restore afterward,
    // but never steal focus from another sheet which still owns isolation.
    if (target?.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true });
  }, [releaseIsolation]);
  useLayoutEffect(() => {
    if (motion.present && isolation.current === null) {
      if (Platform.OS === 'web') opener.current = document.activeElement as HTMLElement | null;
      isolation.current = isolateSheetBackground();
    }
    else if (!motion.present && Platform.OS !== 'web') releaseIsolation();
  }, [motion.present, releaseIsolation]);
  useEffect(() => () => finishDismiss(), [finishDismiss]);
  useLayoutEffect(() => {
    if (Platform.OS === 'web' && surface.current) {
      const node = surface.current as unknown as HTMLElement;
      node.inert = !motion.interactive;
      if (!motion.interactive) return;
      const rememberFocus = () => {
        // A background focus trap must not replace the user's last eligible control.
        if (isAppActive() && node.closest('[role="dialog"]') && node.contains(document.activeElement))
          focusedControl.current = document.activeElement as HTMLElement;
      };
      node.addEventListener('focusin', rememberFocus);
      if (node.closest('[role="dialog"]')) {
        const target = focusedControl.current;
        const eligible = target?.isConnected && node.contains(target) && !target.closest('[inert]')
          && !target.matches(':disabled, [aria-disabled="true"]');
        (eligible ? target : close.current as unknown as HTMLElement | null)?.focus({ preventScroll: true });
      }
      return () => node.removeEventListener('focusin', rememberFocus);
    }
    if (motion.interactive && !focusInitialized.current) {
      focusInitialized.current = true; close.current?.focus();
    }
  }, [motion.present, motion.interactive]);
  const requestClose = (callback: () => void) => {
    if (!visible || dismissing.current) return;
    dismissing.current = true; callback();
  };
  return <Modal visible={motion.present} transparent animationType="none" accessibilityLabel={title} onShow={motion.onShow}
    onDismiss={() => { if (!presented.current) finishDismiss(); }} onRequestClose={() => requestClose(onBack ?? onClose)} statusBarTranslucent>
    <MotionScope active={motion.interactive}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View testID="sheet-backdrop" pointerEvents={motion.interactive ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: motion.progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => requestClose(onClose)} accessibilityRole="button" accessibilityLabel={m.closeWindow} />
      </Animated.View>
      <Animated.View ref={surface} onLayout={motion.onLayout} testID="sheet-surface" pointerEvents={motion.interactive ? 'auto' : 'none'}
        aria-hidden={!motion.interactive} accessibilityElementsHidden={!motion.interactive} importantForAccessibility={motion.interactive ? 'auto' : 'no-hide-descendants'}
        style={[styles.sheet, !scrollable && styles.tallSheet, { paddingBottom: Math.max(insets.bottom, 20) }, motion.surfaceStyle]}
        role={Platform.OS === 'web' ? undefined : 'dialog'} accessibilityLabel={Platform.OS === 'web' ? undefined : title}
        accessibilityViewIsModal onAccessibilityEscape={onBack ?? onClose}>
        <View style={styles.handle} />
        <View style={styles.heading}>
          {onBack && <MotionPressable onPress={onBack} accessibilityLabel={m.back} accessibilityRole="button"
            style={[styles.close]}><Icon name="arrow" size={20} /></MotionPressable>}
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <MotionPressable ref={close}
            onPress={() => requestClose(onClose)} accessibilityLabel={m.close} accessibilityRole="button" style={() => styles.close}><Icon name="close" size={20} /></MotionPressable>
        </View>
        <TimingNotices />
        {scrollable ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.content, styles.staticContent]}>{children}</View>}
      </Animated.View>
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
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 60 },
  backdrop: { backgroundColor: c.overlay },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '100%', backgroundColor: c.background, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, overflow: 'hidden' },
  tallSheet: { height: '94%' },
  staticContent: { flex: 1, minHeight: 0 },
  handle: { alignSelf: 'center', width: 34, height: 4, backgroundColor: c.handle, borderRadius: 3, marginTop: 11, marginBottom: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  title: { fontFamily: headingFamily, fontWeight: '400', fontSize: textSizes.heading, lineHeight: 36, color: c.ink, flex: 1, flexShrink: 1, minWidth: 0, letterSpacing: -0.3 },
  close: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary, borderRadius: 22 },
  content: { paddingHorizontal: 24, paddingBottom: 6 },
  description: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.body, lineHeight: 24, marginBottom: 24 },
  confirm: { backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center', minHeight: 54, padding: 16, borderRadius: radii.control },
  confirmText: { fontFamily: f.semibold, color: c.danger, fontSize: textSizes.body },
  cancel: { alignItems: 'center', minHeight: 44, justifyContent: 'center', padding: 14 },
  cancelText: { fontFamily: f.medium, color: c.muted, fontSize: textSizes.body },
});
