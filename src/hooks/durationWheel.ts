import { wheelIndex } from '../core/durationPicker.ts';

type Configuration = { value: number; maximum: number; rowHeight: number; disabled?: boolean };
type Phase = 'idle' | 'dragging' | 'released' | 'wheel' | 'momentum';
export type WheelRelease = { position?: number; waitForEnd?: boolean };

// Ordinary release/wheel fallback; recognized platform momentum waits for its end event.
const IDLE_DELAY_MS = 160;
// Recover a missing terminal event after a full second without scroll updates. Every
// update renews this watchdog, so long glides are not capped at one second overall.
const MOMENTUM_RECOVERY_MS = 1000;
type Handle = ReturnType<typeof setTimeout>;
export function createDurationWheel(a: {
  configuration: () => Configuration; align: (offset: number, cancelMotion?: boolean) => void;
  select: (value: number) => void; busy: (value: boolean) => void;
  schedule: (callback: () => void, delay: number) => Handle; cancel: (handle: Handle) => void;
}) {
  let phase: Phase = 'idle', disposed = false, generation = 0, offset = 0;
  let pending: Handle | null = null;
  function clear() {
    generation++;
    if (pending !== null) a.cancel(pending);
    pending = null;
  }
  function stop() {
    clear();
    if (phase !== 'idle') { phase = 'idle'; a.busy(false); }
  }
  function enabled() { return !disposed && !a.configuration().disabled; }
  function finish() {
    if (!enabled() || phase === 'idle' || phase === 'dragging') return;
    const config = a.configuration();
    const next = wheelIndex(offset, config.rowHeight, config.maximum);
    clear(); phase = 'idle';
    a.align(next * config.rowHeight);
    if (next !== config.value) a.select(next);
    a.busy(false);
  }
  function idle() {
    clear(); const ticket = generation;
    pending = a.schedule(() => { if (ticket === generation) { pending = null; finish(); } },
      phase === 'momentum' ? MOMENTUM_RECOVERY_MS : IDLE_DELAY_MS);
  }
  function begin(next: Phase) {
    if (!enabled()) return false;
    clear();
    const wasIdle = phase === 'idle'; phase = next;
    if (wasIdle) a.busy(true);
    return true;
  }
  return {
    activate: () => { disposed = false; },
    synchronize: () => {
      const wasMoving = phase !== 'idle';
      stop(); const config = a.configuration(); offset = config.value * config.rowHeight;
      if (!disposed) a.align(offset, wasMoving);
    },
    beginDrag: () => { begin('dragging'); },
    beginWheel: (waitForEnd = false) => { if (begin(waitForEnd ? 'momentum' : 'wheel')) idle(); },
    beginMomentum: () => {
      // A late begin/end must neither revive cancelled work nor finish a new drag.
      if (!enabled() || phase === 'idle' || phase === 'dragging') return;
      phase = 'momentum'; idle();
    },
    scroll: (position: number) => {
      if (!enabled() || phase === 'idle') return;
      offset = position;
      if (phase !== 'dragging') idle();
    },
    release: ({ position, waitForEnd = false }: WheelRelease = {}) => {
      if (!enabled() || (phase !== 'dragging' && phase !== 'released')) return;
      if (position !== undefined) offset = position;
      phase = waitForEnd ? 'momentum' : 'released'; idle();
    },
    end: (position: number) => {
      if (!enabled() || phase === 'idle' || phase === 'dragging') return;
      offset = position; finish();
    },
    choose: (value: number) => {
      if (!enabled()) return;
      const wasMoving = phase !== 'idle';
      stop(); const config = a.configuration();
      const next = wheelIndex(value * config.rowHeight, config.rowHeight, config.maximum);
      offset = next * config.rowHeight; a.align(offset, wasMoving);
      if (next !== config.value) a.select(next);
    },
    dispose: () => { stop(); disposed = true; },
  };
}
