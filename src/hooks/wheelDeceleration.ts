import { wheelIndex } from '../core/durationPicker.ts';

export function wheelDelta(delta: number, mode: number, rowHeight: number, viewport: number): number {
  const unit = mode === 0 ? 1 : mode === 1 ? rowHeight : mode === 2 ? viewport : 0;
  const result = delta * unit;
  return Number.isFinite(result) ? result : 0;
}

type Geometry = { rowHeight: number; maximum: number };
type Request = { from: number; raw: number; target: number; at: number; duration: number };

/** Visual offsets only; the manual wheel controller owns selection and busy. */
export function createWheelDeceleration(a: {
  geometry: () => Geometry; read: () => number; write: (offset: number) => void;
  finish: (offset: number) => void; now: () => number;
  frame: (callback: () => void) => number; cancel: (handle: number) => void;
  delay: (callback: () => void, milliseconds: number) => () => void;
  warn: (code: string) => void;
}) {
  let request: Request | null = null, frame: number | undefined, generation = 0, disposed = false;
  let deadline: (() => void) | undefined;
  const warned = new Set<string>();
  const warn = (code: string) => { if (!warned.has(code)) { warned.add(code); a.warn(code); } };
  function stop() {
    generation++; request = null;
    const previous = frame; frame = undefined;
    try { if (previous !== undefined) a.cancel(previous); } catch { warn('wheel-deceleration-cancel'); }
    const cancelDeadline = deadline; deadline = undefined;
    try { cancelDeadline?.(); } catch { warn('wheel-deceleration-deadline'); }
  }
  function complete(current: Request) {
    if (request !== current) return;
    stop();
    try { a.write(current.target); } catch { warn('wheel-deceleration-write'); }
    a.finish(current.target);
  }
  function schedule(current: Request) {
    const ticket = generation;
    try {
      frame = a.frame(() => {
        if (disposed || ticket !== generation || request !== current) return;
        frame = undefined;
        const elapsed = a.now() - current.at;
        if (!Number.isFinite(elapsed) || elapsed >= current.duration) { complete(current); return; }
        const progress = Math.max(0, elapsed) / current.duration;
        try { a.write(current.from + (current.target - current.from) * (1 - (1 - progress) ** 3)); }
        catch { warn('wheel-deceleration-write'); complete(current); return; }
        schedule(current);
      });
    } catch { warn('wheel-deceleration-frame'); complete(current); }
  }
  return {
    push: (delta: number, animate = true) => {
      if (disposed || !Number.isFinite(delta) || delta === 0) return false;
      const { rowHeight, maximum } = a.geometry(), position = a.read(), at = a.now();
      if (!(rowHeight > 0) || !Number.isFinite(rowHeight) || !Number.isInteger(maximum) || maximum < 0 || !Number.isFinite(position) || !Number.isFinite(at)) return false;
      const base = request && Math.sign(request.raw - position) === Math.sign(delta) ? request.raw : position;
      const raw = Math.max(0, Math.min(maximum * rowHeight, base + delta));
      stop();
      const target = wheelIndex(raw, rowHeight, maximum) * rowHeight;
      const current = { from: position, raw, target, at, duration: Math.min(480, 180 + Math.abs(target - position) / rowHeight * 24) };
      request = current;
      if (!animate) complete(current);
      else {
        try {
          const cancel = a.delay(() => complete(current), current.duration + 40);
          if (request === current) deadline = cancel; else cancel();
        } catch { warn('wheel-deceleration-deadline'); complete(current); }
        if (request === current) schedule(current);
      }
      return true;
    },
    stop,
    isMoving: () => request !== null,
    settle: () => { if (request) complete(request); },
    dispose: () => { disposed = true; stop(); },
  };
}
