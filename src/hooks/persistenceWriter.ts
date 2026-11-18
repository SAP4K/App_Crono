type Adapters<T> = {
  serialize: (value: T) => string; write: (value: string) => Promise<void>;
  canPersist: () => boolean; failed: () => void;
  schedule: (callback: () => void) => ReturnType<typeof setTimeout>;
  cancel: (handle: ReturnType<typeof setTimeout>) => void;
};

/** One in-flight write and one immutable latest snapshot; never owns accepted state. */
export function createPersistenceWriter<T>(a: Adapters<T>) {
  let pending: T | undefined, writing: T | undefined, durable: T | undefined;
  let job: Promise<void> | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  let accepting = true, generation = 0;
  function cancelTimer() {
    generation++;
    if (timer !== undefined) a.cancel(timer);
    timer = undefined;
  }
  function drain(): Promise<void> {
    if (job) return job;
    if (!a.canPersist()) { pending = undefined; return Promise.resolve(); }
    if (pending === undefined) return Promise.resolve();
    const value = pending; pending = undefined; writing = value;
    job = (async () => {
      try { await a.write(a.serialize(value)); durable = value; }
      catch { a.failed(); }
    })().finally(() => { job = undefined; writing = undefined; return drain(); });
    return job;
  }
  function flush() { cancelTimer(); return drain(); }
  return {
    request: (value: T) => {
      if (!accepting || !a.canPersist() || value === pending || (pending === undefined
        && (value === writing || (writing === undefined && value === durable)))) return;
      pending = value;
      if (job || timer !== undefined) return;
      const ticket = ++generation;
      timer = a.schedule(() => {
        if (ticket !== generation) return;
        timer = undefined; void drain();
      });
    },
    baseline: (value: T) => { durable = value; },
    flush,
    activate: () => { accepting = true; },
    // Finish already accepted work on unmount; callbacks cannot queue new work.
    dispose: () => { accepting = false; return flush(); },
  };
}
