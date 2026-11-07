import { wheelIndex } from '../core/durationPicker.ts';

type Configuration = { value: number; maximum: number; rowHeight: number; disabled?: boolean };
type Handle = ReturnType<typeof setTimeout>;
export function createDurationWheel(a: {
  configuration: () => Configuration; align: (offset: number) => void;
  select: (value: number) => void; busy: (value: boolean) => void;
  schedule: (callback: () => void, delay: number) => Handle; cancel: (handle: Handle) => void;
}) {
  let moving = false, dragging = false, disposed = false, generation = 0, offset = 0;
  let pending: Handle | null = null;
  function clear() {
    generation++;
    if (pending !== null) a.cancel(pending);
    pending = null;
  }
  function stop() {
    clear(); dragging = false;
    if (moving) { moving = false; a.busy(false); }
  }
  function enabled() { return !disposed && !a.configuration().disabled; }
  function finish() {
    if (!enabled() || !moving || dragging) return;
    const config = a.configuration();
    const next = wheelIndex(offset, config.rowHeight, config.maximum);
    clear(); moving = false;
    a.align(next * config.rowHeight);
    if (next !== config.value) a.select(next);
    a.busy(false);
  }
  function idle() {
    clear(); const ticket = generation;
    pending = a.schedule(() => { if (ticket === generation) { pending = null; finish(); } }, 160);
  }
  function begin() {
    if (!enabled()) return false;
    clear();
    if (!moving) { moving = true; a.busy(true); }
    return true;
  }
  return {
    activate: () => { disposed = false; },
    synchronize: () => {
      stop(); const config = a.configuration(); offset = config.value * config.rowHeight;
      if (!disposed) a.align(offset);
    },
    beginDrag: () => { if (begin()) dragging = true; },
    beginWheel: () => { if (begin()) { dragging = false; idle(); } },
    scroll: (position: number) => {
      if (!enabled() || !moving) return;
      offset = position;
      if (!dragging) idle();
    },
    release: () => { if (moving) { dragging = false; idle(); } },
    end: (position: number) => { offset = position; dragging = false; finish(); },
    choose: (value: number) => {
      if (!enabled()) return;
      stop(); const config = a.configuration();
      const next = wheelIndex(value * config.rowHeight, config.rowHeight, config.maximum);
      offset = next * config.rowHeight; a.align(offset);
      if (next !== config.value) a.select(next);
    },
    dispose: () => { stop(); disposed = true; },
  };
}
