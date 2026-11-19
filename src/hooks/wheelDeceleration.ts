import { wheelIndex } from '../core/durationPicker.ts';

export function wheelDelta(delta: number, mode: number, rowHeight: number, viewport: number): number {
  const unit = mode === 0 ? 1 : mode === 1 ? rowHeight : mode === 2 ? viewport : 0;
  const result = delta * unit;
  return Number.isFinite(result) ? result : 0;
}

type Geometry = { rowHeight: number; maximum: number };
type Segment = { duration: number; from: number; to: number; distance: number };
type Motion = { duration: number; segments: Segment[] };
type Request = {
  from: number; raw: number; target: number; at: number; lastWrite: number; motion: Motion;
  burstAt: number; burstDelta: number;
};

const rampFraction = 0.18;
const approachSpeedRatio = 0.04;
const normalCap = 900;
const referenceFastCap = 1250;
const referenceApproachLimit = 525;
const fastCoastTimeGain = 0.23;
const fastCap = 1400;
const maxFastApproach = 830;
const stalledFrameDeadline = 940; // Recover before the shared controller's 1000 ms idle watchdog.

function segment(duration: number, from: number, to: number): Segment {
  return { duration, from, to, distance: duration * (from + to) / 2 };
}

function motionAt(motion: Motion, elapsed: number) {
  let distance = 0;
  for (const part of motion.segments) {
    if (elapsed <= part.duration) {
      const phase = Math.max(0, elapsed) / part.duration;
      const change = part.to - part.from;
      return {
        distance: distance + part.duration * (part.from * phase + change * phase ** 3 * (1 - phase / 2)),
        speed: part.from + change * phase ** 2 * (3 - 2 * phase),
      };
    }
    elapsed -= part.duration;
    distance += part.distance;
  }
  return { distance, speed: 0 };
}

function wheelMotion(distance: number, rowHeight: number, duration: number, initial: number, fast: boolean): Motion {
  const speed = initial * distance / duration;
  const peak = (2 - rampFraction * initial) * distance / duration;
  const launch = segment(duration * rampFraction, speed, peak);
  if (fast && speed > 0) {
    const approachSpeed = approachSpeedRatio * speed;
    const remaining = distance - launch.distance;
    const brakeMsPerPixel = 2 / (peak + approachSpeed);
    const approachMsPerPixel = 2 / approachSpeed;
    const base = launch.duration + remaining * brakeMsPerPixel;
    const additionalMsPerPixel = approachMsPerPixel - brakeMsPerPixel;
    const referenceDistance = Math.min(
      rowHeight * 0.1,
      referenceApproachLimit / approachMsPerPixel,
      (referenceFastCap - base) / additionalMsPerPixel,
    );
    if (referenceDistance >= 2) {
      // Moving distance from braking into the slower approach adds time without moving the target.
      const referenceDuration = base + referenceDistance * additionalMsPerPixel;
      const approachDistance = Math.min(
        referenceDistance + referenceDuration * fastCoastTimeGain / additionalMsPerPixel,
        rowHeight * 0.15,
        maxFastApproach / approachMsPerPixel,
        (fastCap - base) / additionalMsPerPixel,
      );
      const brake = segment((remaining - approachDistance) * brakeMsPerPixel, peak, approachSpeed);
      const approach = segment(approachDistance * approachMsPerPixel, approachSpeed, 0);
      return { duration: launch.duration + brake.duration + approach.duration, segments: [launch, brake, approach] };
    }
  }
  return { duration, segments: [launch, segment(duration - launch.duration, peak, 0)] };
}

/** Visual offsets only; the manual wheel controller owns selection and busy. */
export function createWheelDeceleration(a: {
  geometry: () => Geometry; read: () => number; write: (offset: number) => void;
  reached?: (offset: number) => boolean;
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
  function scheduleDeadline(current: Request) {
    if (request !== current) return;
    const due = Math.min(current.at + current.motion.duration + 40, current.lastWrite + stalledFrameDeadline);
    const remaining = due - a.now();
    if (!(remaining > 0)) { complete(current); return; }
    try {
      const cancel = a.delay(() => scheduleDeadline(current), remaining);
      if (request === current) deadline = cancel; else cancel();
    } catch { warn('wheel-deceleration-deadline'); complete(current); }
  }
  function schedule(current: Request) {
    const ticket = generation;
    try {
      frame = a.frame(() => {
        if (disposed || ticket !== generation || request !== current) return;
        frame = undefined;
        const now = a.now(), elapsed = now - current.at;
        if (!Number.isFinite(elapsed) || elapsed >= current.motion.duration) { complete(current); return; }
        const direction = Math.sign(current.target - current.from);
        try {
          a.write(current.from + direction * motionAt(current.motion, elapsed).distance);
          current.lastWrite = now;
          if (current.motion.segments.length === 3 && a.reached?.(current.target)) { complete(current); return; }
        }
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
      const previous = request;
      const continuing = previous && Math.sign(previous.raw - position) === Math.sign(delta);
      const sameBurst = previous && Math.sign(previous.burstDelta) === Math.sign(delta) && at - previous.burstAt <= 120;
      const burstAt = sameBurst ? previous.burstAt : at;
      const burstDelta = sameBurst ? previous.burstDelta + delta : delta;
      const base = continuing ? previous.raw : position;
      const raw = Math.max(0, Math.min(maximum * rowHeight, base + delta));
      const target = wheelIndex(raw, rowHeight, maximum) * rowHeight;
      const distance = target - position;
      const duration = Math.min(normalCap, 337.5 + Math.abs(distance) / rowHeight * 45);
      const priorSpeed = previous
        ? motionAt(previous.motion, at - previous.at).speed * Math.sign(previous.target - previous.from) : 0;
      // Preserve visible speed when retargeting, with room for a new ramp. A reversal starts at rest.
      const initialSpeed = !previous || !distance ? 0.8 : Math.max(0, Math.min(1.55, priorSpeed * duration / distance));
      const fast = Math.abs(burstDelta) >= 5 * rowHeight && Math.abs(distance) >= 3 * rowHeight;
      const motion = wheelMotion(Math.abs(distance), rowHeight, duration, initialSpeed, fast);
      stop();
      const current = { from: position, raw, target, at, lastWrite: at, motion, burstAt, burstDelta };
      request = current;
      if (!animate) complete(current);
      else {
        scheduleDeadline(current);
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
