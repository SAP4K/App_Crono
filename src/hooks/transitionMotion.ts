export type TransitionPolicy = { reduceMotion: boolean; active: boolean };
export type TransitionDriver = {
  set: (value: number) => void;
  animate: (target: number, milliseconds: number, finished: () => void) => () => void;
  warn: (code: string) => void;
};

/** A visual driver only. Stopped or synchronously completed work cannot own a later request. */
function finiteMotion(driver: TransitionDriver) {
  let generation = 0, stop: (() => void) | undefined;
  const warned = new Set<string>();
  const warn = (code: string) => { if (!warned.has(code)) { warned.add(code); driver.warn(code); } };
  const cancel = () => {
    generation++;
    const previous = stop; stop = undefined;
    try { previous?.(); } catch { warn('transition-stop'); }
  };
  const set = (value: number) => { try { driver.set(value); } catch { warn('transition-set'); } };
  return {
    cancel,
    reset(value: number) { cancel(); set(value); },
    move(target: number, milliseconds: number, finished: () => void) {
      cancel();
      const current = generation;
      let completed = false;
      const complete = () => {
        if (current !== generation || completed) return;
        completed = true; stop = undefined; finished();
      };
      if (milliseconds === 0) { set(target); complete(); return; }
      try {
        const release = driver.animate(target, milliseconds, complete);
        if (!completed && current === generation) stop = release;
      } catch { warn('transition-start'); set(target); complete(); }
    },
  };
}

export type SheetMotionState = { present: boolean; phase: 'closed' | 'entering' | 'open' | 'exiting'; interactive: boolean };
type SheetRequest = TransitionPolicy & { visible: boolean; ready: boolean };

export function createSheetMotion(a: {
  driver: TransitionDriver; enterMs: number; exitMs: number;
  changed: (state: SheetMotionState) => void; exited: () => void;
}) {
  const motion = finiteMotion(a.driver);
  let disposed = true;
  let request: SheetRequest = { visible: false, ready: false, reduceMotion: true, active: false };
  let state: SheetMotionState = { present: false, phase: 'closed', interactive: false };
  function publish(phase: SheetMotionState['phase']) {
    const next = { phase, present: phase !== 'closed', interactive: phase === 'open' && request.visible && request.ready && request.active };
    if (next.phase !== state.phase || next.interactive !== state.interactive) { state = next; a.changed(state); }
  }
  return {
    activate() { disposed = false; request = { visible: false, ready: false, reduceMotion: true, active: false }; motion.reset(0); publish('closed'); },
    configure(next: SheetRequest) {
      if (disposed) return;
      const changed = Object.keys(next).some((key) => next[key as keyof SheetRequest] !== request[key as keyof SheetRequest]);
      request = next;
      if (!changed) return;
      const immediate = next.reduceMotion || !next.active;
      if (!next.visible) {
        if (!state.present) return;
        publish('exiting');
        motion.move(0, immediate || !next.ready ? 0 : a.exitMs, () => { publish('closed'); a.exited(); });
        return;
      }
      if (state.phase === 'open') { publish('open'); return; }
      publish('entering');
      if (!next.ready && !immediate) { motion.reset(0); return; }
      motion.move(1, immediate ? 0 : a.enterMs, () => publish('open'));
    },
    dispose() { disposed = true; motion.reset(0); },
  };
}

export function createPanelMotion(a: { driver: TransitionDriver; enterMs: number; ready: () => void }) {
  const motion = finiteMotion(a.driver);
  let disposed = true, visible = false, identity: string | undefined, pending = false;
  return {
    activate() { disposed = false; visible = false; identity = undefined; pending = false; motion.reset(1); },
    configure(next: TransitionPolicy & { visible: boolean; identity: string }) {
      if (disposed) return;
      const entering = next.visible && (!visible || identity !== next.identity);
      visible = next.visible; identity = next.identity;
      if (!visible) { pending = false; motion.reset(1); return; }
      if (!entering && !pending) return;
      const immediate = next.reduceMotion || !next.active;
      if (!entering && !immediate) return;
      pending = true;
      if (entering) motion.reset(0);
      motion.move(1, immediate ? 0 : a.enterMs, () => { pending = false; a.ready(); });
    },
    dispose() { disposed = true; pending = false; motion.reset(1); },
  };
}
