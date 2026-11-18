export type NativeWheelStop = { offset: number; timestamp: number };

type TerminalState = { takeover?: number; presenting: boolean; position?: number };

export function acceptsWheelTerminal(offset: number, state: TerminalState, nativeTerminal = false) {
  return Number.isFinite(offset) && !state.presenting && (nativeTerminal || (state.takeover === undefined
    && (state.position === undefined || Math.abs(state.position - offset) < 1)));
}

/** Validates native manual terminals; it never owns selection, busy state or inertia. */
export function createNativeWheelSettlement(scrollTo: (offset: number) => void) {
  let position = 0, observed: number | undefined, pendingAlignment: number | undefined;
  let gesture: { startedAt?: number; timestamp?: number; released: boolean } | undefined;
  const timestampOf = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  function timestamp(value: unknown) {
    const next = timestampOf(value);
    if (gesture && next !== undefined && gesture.timestamp !== undefined) gesture.timestamp = Math.max(gesture.timestamp, next);
  }
  function confirm(offset: number, time: unknown) {
    const end = timestampOf(time);
    if (!gesture?.released || gesture.timestamp === undefined || end === undefined
      || end < gesture.timestamp || !Number.isFinite(offset)) return false;
    position = observed = offset; gesture = undefined;
    return true;
  }
  return {
    read: () => position,
    contentResized: () => { pendingAlignment = undefined; },
    align: (offset: number, cancelMotion = false) => {
      position = offset;
      // Requested offsets are not proof that a pre-layout scroll command actually ran.
      if (cancelMotion || observed === undefined || (pendingAlignment !== offset && Math.abs(observed - offset) >= 0.5)) {
        pendingAlignment = offset;
        scrollTo(offset);
      }
    },
    observe: (offset: number, time: unknown) => {
      position = observed = offset; pendingAlignment = undefined; timestamp(time);
    },
    begin: (time: unknown) => {
      pendingAlignment = undefined;
      const startedAt = timestampOf(time); gesture = { startedAt, timestamp: startedAt, released: false };
    },
    release: (time: unknown) => {
      const releasedAt = timestampOf(time);
      // A delayed scroll can be newer than this valid release; compare its gesture start.
      if (!gesture || gesture.startedAt === undefined || releasedAt === undefined || releasedAt < gesture.startedAt) return false;
      gesture.released = true; timestamp(releasedAt);
      return true;
    },
    hasGesture: () => gesture !== undefined,
    confirm,
    expectStop: () => {
      const released = gesture;
      if (!released?.released) return;
      return ({ offset, timestamp }: NativeWheelStop) => gesture === released && confirm(offset, timestamp);
    },
    cancel: () => { gesture = undefined; },
  };
}
