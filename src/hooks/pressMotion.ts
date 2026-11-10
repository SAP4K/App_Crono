export type PressPolicy = { disabled: boolean; active: boolean; reduceMotion: boolean };
type PressDriver = {
  set: (value: number) => void;
  animate: (value: number, finished: () => void) => () => void;
};

/** Visual transitions only: activation and domain actions remain with Pressable. */
export function createPressMotion(driver: PressDriver) {
  let policy: PressPolicy = { disabled: true, active: false, reduceMotion: true };
  let pressed = false, disposed = true, generation = 0;
  let stop: (() => void) | undefined;
  function cancel() {
    generation++;
    const previous = stop; stop = undefined; previous?.();
  }
  function render(animate: boolean) {
    cancel();
    const target = pressed ? 1 : 0;
    if (!animate || policy.reduceMotion) { driver.set(target); return; }
    const current = generation;
    stop = driver.animate(target, () => { if (current === generation) stop = undefined; });
  }
  return {
    activate() { disposed = false; pressed = false; render(false); },
    configure(next: PressPolicy) {
      const changed = next.disabled !== policy.disabled || next.active !== policy.active || next.reduceMotion !== policy.reduceMotion;
      policy = next;
      if (disposed || !changed) return;
      if (next.disabled || !next.active) pressed = false;
      render(false);
    },
    pressIn() {
      if (disposed || policy.disabled || !policy.active || pressed) return;
      pressed = true; render(true);
    },
    pressOut() {
      if (disposed || !pressed) return;
      pressed = false; render(true);
    },
    cancel() { if (!disposed) { pressed = false; render(false); } },
    dispose() { disposed = true; pressed = false; cancel(); driver.set(0); },
  };
}
