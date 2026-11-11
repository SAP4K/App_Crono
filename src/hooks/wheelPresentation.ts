export type WheelPresentationDriver = {
  read: () => number;
  align: (offset: number, cancelMotion?: boolean) => void;
  animate: (offset: number, finished: () => void) => () => void;
};
type Handle = ReturnType<typeof setTimeout>;

/** Visual offsets only; selection and manual busy state belong to the wheel. */
export function createWheelPresentation(a: WheelPresentationDriver & {
  schedule: (callback: () => void, delay: number) => Handle;
  cancel: (handle: Handle) => void;
  warn: (code: string) => void;
}) {
  let disposed = false, generation = 0, target: number | null = null;
  let stop: (() => void) | undefined, pending: Handle | undefined;
  const warned = new Set<string>();
  const warn = (code: string) => { if (!warned.has(code)) { warned.add(code); a.warn(code); } };
  function clear() {
    generation++; target = null;
    const previous = stop, timer = pending; stop = undefined; pending = undefined;
    try { if (timer !== undefined) a.cancel(timer); } catch { warn('wheel-presentation-cancel'); }
    try { previous?.(); } catch { warn('wheel-presentation-stop'); }
  }
  function align(offset: number, cancelMotion = true) { try { a.align(offset, cancelMotion); } catch { warn('wheel-presentation-align'); } }
  function read(fallback: number) {
    try { const value = a.read(); if (Number.isFinite(value)) return value; } catch { warn('wheel-presentation-read'); }
    return fallback;
  }
  return {
    isMoving: () => target !== null,
    activate: () => { disposed = false; },
    move(offset: number, animated: boolean) {
      if (disposed || !Number.isFinite(offset)) return;
      if (animated && target === offset) return;
      clear();
      if (!animated || Math.abs(read(offset) - offset) < 0.5) { align(offset); return; }
      target = offset;
      const ticket = generation;
      const finish = () => {
        if (disposed || ticket !== generation) return;
        clear(); align(offset);
      };
      try {
        const release = a.animate(offset, finish);
        if (ticket === generation && !disposed) {
          stop = release;
          // Native completion signals may be absent, especially for a no-op scroll.
          pending = a.schedule(finish, 1000);
        }
      } catch { warn('wheel-presentation-start'); finish(); }
    },
    settle() {
      const offset = target;
      clear();
      if (!disposed && offset !== null) align(offset);
    },
    interrupt() {
      const moving = target !== null, offset = read(target ?? 0);
      clear();
      if (!disposed && moving) align(offset, false);
      return moving ? offset : undefined;
    },
    dispose() { disposed = true; clear(); },
  };
}
