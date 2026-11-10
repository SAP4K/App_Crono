export type MotionPreference = { reduceMotion: boolean; active: boolean };

type MotionAdapter = {
  read: () => Promise<boolean>;
  subscribe: (changed: (reduced: boolean) => void) => (() => void) | undefined;
  subscribeActivity: (changed: () => void) => () => void;
  isActive: () => boolean;
  changed: (preference: MotionPreference) => void;
  warn: (code: string) => void;
};

/** One observation owner; an older query must never replace a newer OS event. */
export function observeMotionPreference(a: MotionAdapter): () => void {
  let disposed = false, revision = 0;
  let state: MotionPreference = { reduceMotion: true, active: a.isActive() };
  const warned = new Set<string>();
  const warn = (code: string) => { if (!warned.has(code)) { warned.add(code); a.warn(code); } };
  function publish(next: MotionPreference) {
    if (disposed || (next.reduceMotion === state.reduceMotion && next.active === state.active)) return;
    state = next; a.changed(state);
  }
  function refresh() {
    const current = ++revision;
    const accept = (reduced: boolean) => {
      if (!disposed && revision === current) publish({ ...state, reduceMotion: reduced });
    };
    try {
      void a.read().then(accept, () => {
        if (!disposed && revision === current) { accept(true); warn('motion-query'); }
      });
    } catch { accept(true); warn('motion-query'); }
  }
  a.changed(state);
  let removeMotion: (() => void) | undefined;
  try {
    removeMotion = a.subscribe((reduceMotion) => {
      if (disposed) return;
      revision++; publish({ ...state, reduceMotion });
    });
  } catch { warn('motion-subscribe'); }
  const removeActivity = a.subscribeActivity(() => {
    if (disposed) return;
    revision++; publish({ ...state, active: a.isActive() });
    if (state.active) refresh();
  });
  refresh();
  return () => {
    disposed = true; revision++;
    for (const remove of [removeMotion, removeActivity]) {
      try { remove?.(); } catch { warn('motion-cleanup'); }
    }
  };
}
