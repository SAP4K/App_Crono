import { wheelIndex } from '../core/durationPicker.ts';

export function wheelDelta(delta: number, mode: number, rowHeight: number, viewport: number): number {
  const unit = mode === 0 ? 1 : mode === 1 ? rowHeight : mode === 2 ? viewport : 0;
  const result = delta * unit;
  return Number.isFinite(result) ? result : 0;
}

type Geometry = { rowHeight: number; maximum: number };
type Request = { from: number; raw: number; target: number; at: number; duration: number; initialSpeed: number };

const rampFraction = 0.18;
const peakSpeed = (initialSpeed: number) => 2 - rampFraction * initialSpeed;
const smoothSpeed = (phase: number) => phase ** 2 * (3 - 2 * phase);
const speedIntegral = (phase: number) => phase ** 3 * (1 - phase / 2);

function travel(progress: number, initial: number) {
  const peak = peakSpeed(initial);
  if (progress <= rampFraction) {
    const phase = progress / rampFraction;
    return rampFraction * (initial * phase + (peak - initial) * speedIntegral(phase));
  }
  const phase = (progress - rampFraction) / (1 - rampFraction);
  return rampFraction * (initial + peak) / 2 + (1 - rampFraction) * peak * (phase - speedIntegral(phase));
}

function currentSpeed(request: Request, at: number) {
  const progress = Math.max(0, Math.min(1, (at - request.at) / request.duration));
  const peak = peakSpeed(request.initialSpeed);
  const speed = progress <= rampFraction
    ? request.initialSpeed + (peak - request.initialSpeed) * smoothSpeed(progress / rampFraction)
    : peak * (1 - smoothSpeed((progress - rampFraction) / (1 - rampFraction)));
  return speed * (request.target - request.from) / request.duration;
}

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
        try { a.write(current.from + (current.target - current.from) * travel(progress, current.initialSpeed)); }
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
      const target = wheelIndex(raw, rowHeight, maximum) * rowHeight;
      const distance = target - position;
      const duration = Math.min(900, 337.5 + Math.abs(distance) / rowHeight * 45);
      const priorSpeed = request ? currentSpeed(request, at) : 0;
      // Preserve visible speed when retargeting, with room for a new ramp. A reversal starts at rest.
      const initialSpeed = !request || !distance ? 0.8 : Math.max(0, Math.min(1.55, priorSpeed * duration / distance));
      stop();
      const current = { from: position, raw, target, at, duration, initialSpeed };
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
