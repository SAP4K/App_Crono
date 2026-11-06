import type { PlaybackError } from '../core/notices.ts';
import type { AlertDuration, SoundId } from '../core/sounds.ts';

export type AlertOwner = 'timer' | 'planning' | 'preview';
export type AlertKind = 'timer-complete' | 'schedule-complete' | 'schedule-step' | 'preview';
export type AlertRequest = {
  owner: AlertOwner; eventId: string; kind: AlertKind; dueAt: number;
  soundId: SoundId; durationSeconds: AlertDuration; allowed: () => boolean;
};
export type AlertState = { status: 'idle' | 'pending' | 'playing'; request: AlertRequest | null; error: PlaybackError | null };
export type AlertTransport = {
  play: (soundId: SoundId, allowed: () => boolean, failed: (error: unknown) => void) => Promise<void>;
  stop: () => void;
};
type ClockHandle = ReturnType<typeof setTimeout>;
type Adapters = {
  transport: AlertTransport; isActive: () => boolean;
  schedule: (callback: () => void, delay: number) => ClockHandle;
  cancel: (handle: ClockHandle) => void;
  changed: (state: AlertState) => void;
  warn: (error: unknown) => void;
};

const rank: Record<AlertKind, number> = { preview: 0, 'schedule-step': 1, 'schedule-complete': 2, 'timer-complete': 3 };
export const idleAlert = (): AlertState => ({ status: 'idle', request: null, error: null });

export function createAlertPlayback(a: Adapters) {
  let state = idleAlert();
  let generation = 0;
  let disposed = false;
  let startup: ClockHandle | null = null;
  let ending: ClockHandle | null = null;
  let feedback: ClockHandle | null = null;

  function publish(next: AlertState) {
    state = next;
    if (!disposed) a.changed(state);
  }

  function invalidate() {
    generation++;
    for (const handle of [startup, ending, feedback]) if (handle !== null) a.cancel(handle);
    startup = ending = feedback = null;
    if (state.status !== 'idle') a.transport.stop();
  }

  function stop() {
    invalidate();
    publish(idleAlert());
  }

  function outranks(current: AlertRequest, incoming: AlertRequest): boolean {
    if (incoming.kind === 'preview') return current.kind !== 'preview';
    if (current.kind === 'preview') return false;
    return current.dueAt > incoming.dueAt || (current.dueAt === incoming.dueAt && rank[current.kind] > rank[incoming.kind]);
  }

  function request(incoming: AlertRequest): boolean {
    if (disposed || !a.isActive() || !incoming.allowed()) return false;
    if (state.status !== 'idle' && state.request
      && (state.request.eventId === incoming.eventId || outranks(state.request, incoming))) return false;
    invalidate();
    const ticket = generation;
    const current = () => !disposed && ticket === generation;
    const allowed = () => current() && a.isActive() && incoming.allowed();
    const ensureAllowed = () => {
      if (allowed()) return true;
      if (current()) stop();
      return false;
    };
    const failed = (error: unknown) => {
      if (!current()) return;
      if (!allowed()) { stop(); return; }
      invalidate();
      const errorTicket = generation;
      a.warn(error);
      publish({ status: 'idle', request: incoming, error: 'sound-unavailable' });
      feedback = a.schedule(() => { if (!disposed && errorTicket === generation) publish(idleAlert()); }, 3500);
    };
    publish({ status: 'pending', request: incoming, error: null });
    startup = a.schedule(() => failed(new Error('Audio startup timed out.')), 4000);
    void Promise.resolve().then(async () => {
      if (!ensureAllowed()) return;
      await a.transport.play(incoming.soundId, allowed, failed);
      if (!ensureAllowed()) return;
      if (startup !== null) a.cancel(startup);
      startup = null;
      publish({ status: 'playing', request: incoming, error: null });
      ending = a.schedule(() => { if (current()) stop(); }, incoming.durationSeconds * 1000);
    }).catch(failed);
    return true;
  }

  return {
    request, stop,
    cancelOwner: (owner: AlertOwner) => { if (state.request?.owner === owner) stop(); },
    getState: () => state,
    activate: () => { disposed = false; publish(state); },
    dispose: () => { disposed = true; stop(); },
  };
}

export type AlertPlayback = ReturnType<typeof createAlertPlayback>;
