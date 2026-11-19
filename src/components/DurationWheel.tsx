import { requireOptionalNativeModule } from 'expo';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { findNodeHandle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent } from 'react-native';
import { useThemeStyles } from '../context/ThemeContext';
import { useDurationWheel } from '../hooks/useDurationWheel';
import { durationPickerMetrics as metrics, fonts, type Palette } from '../theme';
import type { DurationWheelProps } from './DurationWheel.types';
import { createNativeWheelSettlement, type NativeWheelStop } from '../hooks/wheelSettlement';

const androidStop = Platform.OS === 'android' ? requireOptionalNativeModule<{
  awaitStop(viewTag: number, releaseTime: number): Promise<NativeWheelStop | null>;
}>('CronoDurationWheel') : null;
const logWheelLatency = process.env.EXPO_PUBLIC_CRONO_WHEEL_LATENCY_LOG === '1';

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
  // Android truncates one interval to physical pixels before repeating it. Snap each row independently.
  const snapOffsets = useMemo(() => Platform.OS === 'android'
    ? Array.from({ length: maximum + 1 }, (_, index) => index * rowHeight) : undefined, [maximum, rowHeight]);
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
        snapToInterval={snapOffsets ? undefined : rowHeight} snapToOffsets={snapOffsets} snapToAlignment="start" decelerationRate={Platform.OS === 'android' ? 0.99575 : 0.99915} scrollEventThrottle={16}
        onContentSizeChange={() => { native.current?.contentResized(); controller.synchronize(); }}
        onTouchStart={() => controller.beginDrag()} onTouchEnd={() => controller.release()}
        onTouchCancel={() => controller.release()}
        onScrollBeginDrag={({ nativeEvent }) => { controller.beginDrag(); native.current?.begin(timestamp(nativeEvent)); }}
        onScrollEndDrag={({ nativeEvent }) => {
          const time = timestamp(nativeEvent), settlement = native.current;
          if (time === undefined || !settlement?.release(time)) return;
          controller.release({ position: nativeEvent.contentOffset.y });
          if (!androidStop) return;
          const tag = findNodeHandle(scroll.current), acceptStop = settlement.expectStop();
          if (tag === null || !acceptStop) return;
          if (logWheelLatency) console.info('[FIX:wheel-latency] Android release', time);
          void androidStop.awaitStop(tag, time).then((stop) => {
            const accepted = stop !== null && acceptStop(stop);
            if (logWheelLatency) console.info('[FIX:wheel-latency] Android stop', { accepted, releaseTime: time, stopTime: stop?.timestamp });
            if (accepted) controller.end(stop.offset, true);
          }, (error: unknown) => {
            if (logWheelLatency) console.warn('[FIX:wheel-latency] Android observation failed', error);
          });
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
        {Array.from({ length: maximum + 1 }, (_, index) => <DurationWheelRow key={index} index={index}
          selected={index === value} disabled={disabled} choose={controller.choose}
          rowHeight={rowHeight} fontSize={fontSize} styles={styles} />)}
      </ScrollView>
    </View>
    <Text accessible={false} style={styles.label}>{label}</Text>
  </View>;
});
type DurationWheelRowProps = {
  index: number; selected: boolean; disabled?: boolean; choose: (index: number) => void;
  rowHeight: number; fontSize: number; styles: ReturnType<typeof createStyles>;
};

// Settling a wheel changes the tint of two rows, even when it contains 60 press targets.
const DurationWheelRow = memo(function DurationWheelRow({
  index, selected, disabled, choose, rowHeight, fontSize, styles,
}: DurationWheelRowProps) {
  return <Pressable accessible={false} disabled={disabled} onPress={() => choose(index)}
    style={[styles.item, { height: rowHeight }]}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.number, { fontSize,
      lineHeight: fontSize * metrics.digitLineHeight / metrics.digitSize,
      color: selected ? styles.selected.color : styles.number.color }]}>{String(index).padStart(2, '0')}</Text>
  </Pressable>;
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
