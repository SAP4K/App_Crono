import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent } from 'react-native';
import { useThemeStyles } from '../context/ThemeContext';
import { useDurationWheel } from '../hooks/useDurationWheel';
import { durationPickerMetrics as metrics, fonts, type Palette } from '../theme';
import type { DurationWheelProps } from './DurationWheel.types';
import { createNativeWheelSettlement } from '../hooks/wheelSettlement';

// SDK 57's Android and Fabric iOS payloads carry native monotonic milliseconds.
const timestamp = (event: NativeScrollEvent) => (event as NativeScrollEvent & { timestamp?: number }).timestamp;

export const DurationWheel = memo(function DurationWheel(props: DurationWheelProps) {
  const { value, maximum, rowHeight, label, hint, disabled, autoFocus, fontSize = metrics.digitSize } = props;
  const scroll = useRef<ScrollView>(null), focus = useRef<View>(null);
  const animation = useRef<{ target: number; finished: () => void } | null>(null);
  const native = useRef<ReturnType<typeof createNativeWheelSettlement> | null>(null);
  useLayoutEffect(() => {
    native.current = createNativeWheelSettlement((offset) => scroll.current?.scrollTo({ y: offset, animated: false }));
    return () => { native.current?.cancel(); native.current = null; };
  }, []);
  const styles = useThemeStyles(createStyles);
  const align = useCallback((offset: number, cancelMotion = false) => native.current?.align(offset, cancelMotion), []);
  const animate = useCallback((target: number, finished: () => void) => {
    const request = { target, finished }; animation.current = request;
    scroll.current?.scrollTo({ y: target, animated: true });
    return () => {
      if (animation.current !== request) return;
      animation.current = null; scroll.current?.scrollTo({ y: native.current?.read() ?? 0, animated: false });
    };
  }, []);
  const controller = useDurationWheel(props, align, { read: () => native.current?.read() ?? 0, animate,
    stopManual: () => native.current?.cancel() });
  useEffect(() => { if (autoFocus) focus.current?.focus(); }, [autoFocus]);
  return <View style={styles.column}>
    <View ref={focus} accessible accessibilityRole="adjustable" accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={hint}
      accessibilityState={{ disabled }} accessibilityValue={{ min: 0, max: maximum, now: value, text: String(value).padStart(2, '0') }}
      accessibilityActions={disabled ? [] : [{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') controller.choose(value + 1);
        if (nativeEvent.actionName === 'decrement') controller.choose(value - 1);
      }} style={[styles.viewport, { height: rowHeight * 3 }, disabled && styles.disabled]}>
      <ScrollView ref={scroll} style={{ height: rowHeight * 3 }} contentContainerStyle={{ paddingVertical: rowHeight }}
        accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        scrollEnabled={!disabled} nestedScrollEnabled bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false}
        snapToInterval={rowHeight} snapToAlignment="start" decelerationRate={Platform.OS === 'android' ? 0.99575 : 0.99915} scrollEventThrottle={16}
        onContentSizeChange={() => controller.synchronize()}
        onTouchStart={() => controller.beginDrag()} onTouchEnd={() => controller.release()}
        onTouchCancel={() => controller.release()}
        onScrollBeginDrag={({ nativeEvent }) => { controller.beginDrag(); native.current?.begin(timestamp(nativeEvent)); }}
        onScrollEndDrag={({ nativeEvent }) => {
          if (native.current?.release(timestamp(nativeEvent))) controller.release({ position: nativeEvent.contentOffset.y });
        }}
        onMomentumScrollBegin={() => controller.beginMomentum()}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const offset = nativeEvent.contentOffset.y, current = animation.current;
          if (current) { if (Math.abs(offset - current.target) < 1) current.finished(); }
          else {
            const known = native.current?.hasGesture();
            if (native.current?.confirm(offset, timestamp(nativeEvent))) controller.end(offset, true);
            else if (!known) controller.end(offset);
          }
        }}
        onScroll={({ nativeEvent }) => { const offset = nativeEvent.contentOffset.y;
          native.current?.observe(offset, timestamp(nativeEvent)); controller.scroll(offset); }}>
        {Array.from({ length: maximum + 1 }, (_, index) => <Pressable key={index} accessible={false} disabled={disabled}
          onPress={() => controller.choose(index)} style={[styles.item, { height: rowHeight }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.number, { fontSize,
            lineHeight: fontSize * metrics.digitLineHeight / metrics.digitSize,
            color: index === value ? styles.selected.color : styles.number.color }]}>{String(index).padStart(2, '0')}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
    <Text accessible={false} style={styles.label}>{label}</Text>
  </View>;
});
const createStyles = (c: Palette) => StyleSheet.create({
  column: { flex: 1, minWidth: 0, gap: metrics.labelGap },
  viewport: { overflow: 'hidden' },
  item: { alignItems: 'center', justifyContent: 'center' },
  number: { fontFamily: fonts.semibold, color: c.muted, fontVariant: ['tabular-nums'],
    includeFontPadding: false, textAlignVertical: 'center' },
  selected: { color: c.ink }, disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: c.muted, textAlign: 'center' },
});
