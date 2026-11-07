import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { useDurationWheel } from '../hooks/useDurationWheel';
import { fonts, type Palette } from '../theme';
import type { DurationWheelProps } from './DurationWheel.types';

export function DurationWheel(props: DurationWheelProps) {
  const { value, maximum, rowHeight, label, hint, disabled, autoFocus } = props;
  const element = useRef<HTMLDivElement>(null);
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  const align = useCallback((offset: number) => { if (element.current) element.current.scrollTop = offset; }, []);
  const controller = useDurationWheel(props, align);
  useLayoutEffect(() => { if (autoFocus) element.current?.focus({ preventScroll: true }); }, [autoFocus]);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      if (disabled) { event.preventDefault(); return; }
      controller.beginWheel();
    };
    const release = () => controller.release();
    node.addEventListener('wheel', wheel, { passive: false });
    // Mouse release can occur beyond this column; keep the terminal path scoped to its controller.
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);
    return () => {
      node.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', release);
    };
  }, [controller, disabled]);
  return <View style={styles.column}>
    <div style={{ position: 'relative', border: `1px solid ${c.border}`, borderRadius: 15, overflow: 'hidden', background: c.surface, opacity: disabled ? 0.5 : 1 }}>
      <div aria-hidden style={{ position: 'absolute', top: rowHeight, height: rowHeight, left: 0, right: 0, background: c.selected,
        borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, boxSizing: 'border-box', pointerEvents: 'none' }} />
      <div ref={element} role="spinbutton" tabIndex={0} aria-label={props.accessibilityLabel ?? label} aria-description={hint}
        aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={value} aria-valuetext={String(value).padStart(2, '0')} aria-disabled={!!disabled}
        onScroll={(event) => controller.scroll(event.currentTarget.scrollTop)}
        onPointerDown={(event) => { if (!disabled) { event.currentTarget.focus({ preventScroll: true }); controller.beginDrag(); } }}
        onKeyDown={(event) => {
          const next = { ArrowUp: value + 1, ArrowDown: value - 1, Home: 0, End: maximum }[event.key];
          if (next !== undefined) { event.preventDefault(); controller.choose(next); }
        }}
        style={{ position: 'relative', height: rowHeight * 3, overflowY: disabled ? 'hidden' : 'auto', overflowX: 'hidden',
          paddingBlock: rowHeight, boxSizing: 'border-box', scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain',
          scrollbarWidth: 'none', touchAction: 'pan-y', outlineOffset: -3, outlineColor: c.green }}>
        {Array.from({ length: maximum + 1 }, (_, index) => <button key={index} type="button" tabIndex={-1} aria-hidden disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { element.current?.focus({ preventScroll: true }); controller.choose(index); }}
          style={{ display: 'flex', width: '100%', height: rowHeight, padding: 0, border: 0, margin: 0, background: 'transparent',
            alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', scrollSnapStop: 'normal',
            fontFamily: fonts.semibold, fontSize: Math.min(24 * rowHeight / 44, rowHeight - 12), lineHeight: 1.2,
            fontVariantNumeric: 'tabular-nums', color: index === value ? c.ink : c.muted, cursor: disabled ? 'default' : 'pointer' }}>
          {String(index).padStart(2, '0')}
        </button>)}
      </div>
    </div>
    <Text style={styles.label}>{label}</Text>
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  column: { flex: 1, minWidth: 0, gap: 8 },
  label: { fontFamily: fonts.medium, fontSize: 11, color: c.muted, textAlign: 'center' },
});
