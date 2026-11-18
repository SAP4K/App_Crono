import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { useDurationWheel } from '../hooks/useDurationWheel';
import { durationPickerMetrics as metrics, fonts, type Palette } from '../theme';
import type { DurationWheelProps } from './DurationWheel.types';
import { useMotionPreference } from '../context/MotionContext';
import { createWheelDeceleration, wheelDelta } from '../hooks/wheelDeceleration';

export function DurationWheel(props: DurationWheelProps) {
  const { value, maximum, rowHeight, label, hint, disabled, autoFocus, fontSize = metrics.digitSize } = props;
  const element = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const alignment = useRef<{ frame?: number; offset: number; restore: () => void } | null>(null);
  const alignmentWarned = useRef(false);
  const animation = useRef<{ target: number; finished: () => void } | null>(null);
  const manual = useRef<ReturnType<typeof createWheelDeceleration> | null>(null);
  const restoreSnap = useRef<(() => void) | null>(null);
  const policy = useMotionPreference();
  const input = useRef({ props, policy });
  useLayoutEffect(() => { input.current = { props, policy }; });
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  const warnAlignment = useCallback(() => {
    if (alignmentWarned.current) return;
    alignmentWarned.current = true;
    console.warn('[FIX:wheel-alignment] Animation frame failed; using immediate alignment.');
  }, []);
  const releaseAlignment = useCallback(() => {
    const pending = alignment.current;
    if (!pending) return;
    alignment.current = null;
    try { if (pending.frame !== undefined) cancelAnimationFrame(pending.frame); }
    catch { warnAlignment(); }
    finally { pending.restore(); }
  }, [warnAlignment]);
  const align = useCallback((offset: number, cancelMotion = false) => {
    const node = element.current, rows = content.current;
    if (!node || !rows) return;
    // A committed prop/rapid second key must retain the pending cancellation.
    if (alignment.current) {
      alignment.current.offset = offset; rows.style.transform = `translateY(-${offset}px)`; return;
    }
    if (!cancelMotion) { node.scrollTop = offset; return; }
    // scrollTop alone does not stop a compositor-owned fling. Remove its scroll
    // container for one rendered frame, preserving the chosen row without animation.
    node.style.overflow = 'clip'; rows.style.transform = `translateY(-${offset}px)`;
    node.getBoundingClientRect();
    const pending = { frame: undefined as number | undefined, offset, restore: () => {
      node.style.overflowX = 'hidden'; node.style.overflowY = node.getAttribute('aria-disabled') === 'true' ? 'hidden' : 'auto';
      rows.style.transform = ''; node.scrollTop = pending.offset;
    } };
    alignment.current = pending;
    const schedule = (next: () => void) => {
      try { pending.frame = requestAnimationFrame(() => { if (alignment.current === pending) next(); }); }
      catch { warnAlignment(); releaseAlignment(); }
    };
    schedule(() => schedule(releaseAlignment));
  }, [releaseAlignment, warnAlignment]);
  const animate = useCallback((target: number, finished: () => void) => {
    releaseAlignment();
    const node = element.current;
    if (!node) { finished(); return () => {}; }
    const request = { target, finished }; animation.current = request;
    node.scrollTo({ top: target, behavior: 'smooth' });
    return () => {
      if (animation.current !== request) return;
      animation.current = null;
      if (node === element.current && node.isConnected) node.scrollTo({ top: node.scrollTop, behavior: 'instant' });
    };
  }, [releaseAlignment]);
  const stopManual = useCallback(() => {
    manual.current?.stop(); const restore = restoreSnap.current; restoreSnap.current = null; restore?.();
  }, []);
  const controller = useDurationWheel(props, align, {
    read: () => alignment.current?.offset ?? element.current?.scrollTop ?? 0, animate,
    stopManual, settleManual: () => manual.current?.settle(),
  });
  useLayoutEffect(() => {
    const driver = createWheelDeceleration({ geometry: () => input.current.props,
      read: () => alignment.current?.offset ?? element.current?.scrollTop ?? 0,
      write: (offset) => { align(offset); controller.scroll(offset); },
      finish: (offset) => {
        const restore = restoreSnap.current; restoreSnap.current = null; restore?.(); controller.end(offset);
      },
      now: () => performance.now(), frame: (callback) => requestAnimationFrame(callback), cancel: (handle) => cancelAnimationFrame(handle),
      delay: (callback, milliseconds) => { const timer = setTimeout(callback, milliseconds); return () => clearTimeout(timer); },
      warn: (code) => console.warn(`[motion] ${code}`),
    });
    manual.current = driver;
    return () => { stopManual(); driver.dispose(); manual.current = null; };
  }, [align, controller, stopManual]);
  useEffect(() => releaseAlignment, [releaseAlignment]);
  useLayoutEffect(() => { if (autoFocus) element.current?.focus({ preventScroll: true }); }, [autoFocus]);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const supportsEnd = 'onscrollend' in node;
    let hasTouch = false;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
      if (disabled) { event.preventDefault(); return; }
      const { props: current, policy: motion } = input.current;
      if (!event.cancelable || motion.reduceMotion || !motion.active || current.presentationActive === false || !manual.current) {
        stopManual(); releaseAlignment(); controller.beginWheel(supportsEnd); return;
      }
      event.preventDefault();
      if (!event.defaultPrevented) { stopManual(); releaseAlignment(); controller.beginWheel(supportsEnd); return; }
      const delta = wheelDelta(event.deltaY, event.deltaMode, current.rowHeight, node.clientHeight);
      if (!delta) return;
      if (!manual.current.isMoving()) {
        releaseAlignment(); controller.beginWheel(true); align(node.scrollTop, true);
        const snap = node.style.scrollSnapType; node.style.scrollSnapType = 'none';
        restoreSnap.current = () => { node.style.scrollSnapType = snap; };
      } else controller.beginWheel(true);
      if (!manual.current.push(delta, !motion.reduceMotion)) { stopManual(); controller.synchronize(); }
    };
    const release = (event: PointerEvent) => {
      if (activePointer.current !== event.pointerId) return;
      // Panning cancels the pointer while its touch can remain down indefinitely.
      if (event.pointerType === 'touch' && hasTouch) return;
      activePointer.current = null;
      controller.release({ position: node.scrollTop, waitForEnd: supportsEnd });
    };
    const touchStart = () => { if (!disabled) hasTouch = true; };
    const touchEnd = (event: TouchEvent) => {
      if (!hasTouch) return;
      hasTouch = Array.from(event.touches).some((touch) => touch.target instanceof Node && node.contains(touch.target));
      if (hasTouch) return;
      activePointer.current = null;
      controller.release({ position: node.scrollTop, waitForEnd: supportsEnd });
    };
    const blur = () => {
      if (activePointer.current === null && !hasTouch) return;
      hasTouch = false; activePointer.current = null; controller.release();
    };
    const end = () => {
      if (manual.current?.isMoving()) return;
      const current = animation.current;
      if (current) { if (Math.abs(node.scrollTop - current.target) < 1) current.finished(); }
      else controller.end(node.scrollTop);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('touchstart', touchStart, { passive: true });
    node.addEventListener('touchend', touchEnd, { passive: true });
    node.addEventListener('touchcancel', touchEnd, { passive: true });
    if (supportsEnd) node.addEventListener('scrollend', end);
    // Release may occur outside the column, but only its own pointer can end a drag.
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', blur);
    return () => {
      hasTouch = false; activePointer.current = null;
      node.removeEventListener('wheel', wheel);
      node.removeEventListener('touchstart', touchStart);
      node.removeEventListener('touchend', touchEnd);
      node.removeEventListener('touchcancel', touchEnd);
      if (supportsEnd) node.removeEventListener('scrollend', end);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', blur);
    };
  }, [controller, disabled, releaseAlignment, align, stopManual]);
  return <View style={styles.column}>
    <div style={{ position: 'relative', overflow: 'hidden', opacity: disabled ? 0.5 : 1 }}>
      <div ref={element} role="spinbutton" tabIndex={0} aria-label={props.accessibilityLabel ?? label} aria-description={hint}
        aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={value} aria-valuetext={String(value).padStart(2, '0')} aria-disabled={!!disabled}
        onScroll={(event) => controller.scroll(alignment.current?.offset ?? event.currentTarget.scrollTop)}
        onPointerDown={(event) => {
          if (disabled) return;
          releaseAlignment();
          activePointer.current = event.pointerId;
          event.currentTarget.focus({ preventScroll: true }); controller.beginDrag();
        }}
        onKeyDown={(event) => {
          const next = { ArrowUp: value + 1, ArrowDown: value - 1, Home: 0, End: maximum }[event.key];
          if (next !== undefined) { event.preventDefault(); controller.choose(next); }
        }}
        style={{ position: 'relative', height: rowHeight * 3, overflowY: disabled ? 'hidden' : 'auto', overflowX: 'hidden',
          paddingBlock: rowHeight, boxSizing: 'border-box', scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain',
          scrollbarWidth: 'none', touchAction: 'pan-y', outlineOffset: -3, outlineColor: c.green }}>
        <div ref={content}>{Array.from({ length: maximum + 1 }, (_, index) => <button key={index} type="button" tabIndex={-1} aria-hidden disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { element.current?.focus({ preventScroll: true }); controller.choose(index); }}
          style={{ display: 'flex', width: '100%', height: rowHeight, padding: 0, border: 0, margin: 0, background: 'transparent',
            alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', scrollSnapStop: 'normal',
            fontFamily: fonts.semibold, fontSize: fontSize * rowHeight / metrics.rowHeight,
            lineHeight: metrics.digitLineHeight / metrics.digitSize,
            fontVariantNumeric: 'tabular-nums', color: index === value ? c.ink : c.muted, cursor: disabled ? 'default' : 'pointer' }}>
          {String(index).padStart(2, '0')}
        </button>)}</div>
      </div>
    </div>
    <Text style={styles.label}>{label}</Text>
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  column: { flex: 1, minWidth: 0, gap: metrics.labelGap },
  label: { fontFamily: fonts.medium, fontSize: 12, color: c.muted, textAlign: 'center' },
});
