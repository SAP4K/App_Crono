import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { useDurationWheel } from '../hooks/useDurationWheel';
import { fonts, type Palette } from '../theme';
import type { DurationWheelProps } from './DurationWheel.types';

export function DurationWheel(props: DurationWheelProps) {
  const { value, maximum, rowHeight, label, hint, disabled, autoFocus } = props;
  const element = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const alignment = useRef<{ frame: number; offset: number; restore: () => void } | null>(null);
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  const releaseAlignment = useCallback(() => {
    const pending = alignment.current;
    if (!pending) return;
    alignment.current = null; cancelAnimationFrame(pending.frame); pending.restore();
  }, []);
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
    const pending = { frame: 0, offset, restore: () => {
      node.style.overflowX = 'hidden'; node.style.overflowY = node.getAttribute('aria-disabled') === 'true' ? 'hidden' : 'auto';
      rows.style.transform = ''; node.scrollTop = pending.offset;
    } };
    alignment.current = pending;
    pending.frame = requestAnimationFrame(() => { pending.frame = requestAnimationFrame(releaseAlignment); });
  }, [releaseAlignment]);
  const controller = useDurationWheel(props, align);
  useEffect(() => releaseAlignment, [releaseAlignment]);
  useLayoutEffect(() => { if (autoFocus) element.current?.focus({ preventScroll: true }); }, [autoFocus]);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const supportsEnd = 'onscrollend' in node;
    let hasTouch = false;
    const wheel = (event: WheelEvent) => {
      if (disabled) { event.preventDefault(); return; }
      releaseAlignment();
      controller.beginWheel(supportsEnd);
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
    const end = () => controller.end(node.scrollTop);
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
  }, [controller, disabled, releaseAlignment]);
  return <View style={styles.column}>
    <div style={{ position: 'relative', border: `1px solid ${c.border}`, borderRadius: 15, overflow: 'hidden', background: c.surface, opacity: disabled ? 0.5 : 1 }}>
      <div aria-hidden style={{ position: 'absolute', top: rowHeight, height: rowHeight, left: 0, right: 0, background: c.selected,
        borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, boxSizing: 'border-box', pointerEvents: 'none' }} />
      <div ref={element} role="spinbutton" tabIndex={0} aria-label={props.accessibilityLabel ?? label} aria-description={hint}
        aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={value} aria-valuetext={String(value).padStart(2, '0')} aria-disabled={!!disabled}
        onScroll={(event) => controller.scroll(event.currentTarget.scrollTop)}
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
            fontFamily: fonts.semibold, fontSize: Math.min(24 * rowHeight / 44, rowHeight - 12), lineHeight: 1.2,
            fontVariantNumeric: 'tabular-nums', color: index === value ? c.ink : c.muted, cursor: disabled ? 'default' : 'pointer' }}>
          {String(index).padStart(2, '0')}
        </button>)}</div>
      </div>
    </div>
    <Text style={styles.label}>{label}</Text>
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  column: { flex: 1, minWidth: 0, gap: 8 },
  label: { fontFamily: fonts.medium, fontSize: 11, color: c.muted, textAlign: 'center' },
});
