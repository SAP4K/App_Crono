import { resolveThemeMode, type ThemeMode, type ThemePreference } from '../core/themePreference.ts';

type AppearanceAdapter = {
  read: () => unknown;
  override?: (preference: ThemePreference) => void;
  subscribe: (changed: () => void) => () => void;
  subscribeActivity: (changed: () => void) => () => void;
  isActive: () => boolean;
  changed: (mode: ThemeMode) => void;
  warn: (code: string) => void;
};

export function createThemeAppearance(a: AppearanceAdapter) {
  let active = false, ready = false, generation = 0;
  let preference: ThemePreference = 'system';
  let applied: ThemePreference | undefined;
  let mode: ThemeMode | undefined;
  let subscriptions: (() => void)[] = [];
  const publish = (appearance: unknown) => {
    const next = resolveThemeMode(preference, appearance);
    if (next !== mode) { mode = next; a.changed(next); }
  };
  const refresh = (foreground = false) => {
    if (!active || !ready) return;
    if (a.override && (applied !== preference || (foreground && preference === 'system'))) {
      applied = preference;
      try { a.override(preference); }
      catch { applied = undefined; a.warn('appearance-override'); publish(null); return; }
    }
    // Clearing a native override may refresh the snapshot without emitting an event.
    try { publish(a.read()); }
    catch { a.warn('appearance-read'); publish(null); }
  };
  const stopObserving = () => {
    generation++;
    for (const remove of subscriptions) {
      try { remove(); } catch { a.warn('appearance-cleanup'); }
    }
    subscriptions = [];
  };
  const observe = () => {
    if (!active || !ready || subscriptions.length) return;
    const ticket = generation;
    const current = () => active && ready && ticket === generation;
    try { subscriptions.push(a.subscribe(() => { if (current()) refresh(); })); }
    catch { a.warn('appearance-subscribe'); }
    try { subscriptions.push(a.subscribeActivity(() => { if (current() && a.isActive()) refresh(true); })); }
    catch { a.warn('appearance-activity'); }
  };
  return {
    activate: () => { active = true; observe(); refresh(); },
    configure: (next: ThemePreference, hydrated: boolean) => {
      preference = next; ready = hydrated;
      if (!ready) { stopObserving(); applied = undefined; return; }
      observe(); refresh();
    },
    dispose: () => { active = false; stopObserving(); applied = undefined; mode = undefined; },
  };
}

export function createThemeBackground(a: { write: (color: string) => Promise<void>; warn: () => void }) {
  let active = false, running = false;
  let desired: string | undefined, committed: string | undefined;
  const drain = async () => {
    if (running) return;
    running = true;
    try {
      while (active && desired !== undefined && desired !== committed) {
        const color = desired;
        try { await a.write(color); committed = color; }
        catch {
          if (active) a.warn();
          if (desired === color) break;
        }
      }
    } finally { running = false; }
  };
  return {
    activate: () => { active = true; },
    setColor: (color: string) => { if (active) { desired = color; void drain(); } },
    dispose: () => { active = false; desired = undefined; },
  };
}
