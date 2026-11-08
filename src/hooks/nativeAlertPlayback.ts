import { completionPolicy, completionWins, readCompletionRequest } from '../core/completionAlerts.ts';
import type { CompletionPolicy } from '../core/completionAlerts.ts';
import { notificationEventKey } from '../core/notifications.ts';
import type { AppData } from '../core/stopwatch.ts';
import { getMessages } from '../i18n/index.ts';
import { idleAlert } from './alertPlayback.ts';
import type { AlertPlayback, AlertRequest, AlertState, AlertOwner } from './alertPlayback.ts';
import type { CompletionNative, NativePlaybackSnapshot } from './completionAlerts.types.ts';

type Adapters = {
  native: CompletionNative; getSnapshot: () => AppData; getHydration: () => string;
  isActive: () => boolean; changed: (state: AlertState) => void; warn: () => void;
};
export function createNativeAlertPlayback(a: Adapters): AlertPlayback & { refresh: () => Promise<void>; syncPolicy: () => Promise<void> } {
  let state = idleAlert(), disposed = true, lifecycle = 0, generation = 0, revision = -1, nativeGeneration = -1;
  let subscription: { remove(): void } | null = null;
  let ready: Promise<void> = Promise.resolve();
  let policyJob: Promise<void> | null = null, policyDirty = false;
  let lastPolicy = '';
  let observedPolicy: CompletionPolicy | undefined;
  const pending = new Map<number, AlertRequest>();
  const cancelled = new Set<number>();
  function publish(next: AlertState) { state = next; if (!disposed) a.changed(next); }
  function observe(value: NativePlaybackSnapshot) {
    if (disposed || !value || !['idle', 'pending', 'playing'].includes(value.status)
      || !Number.isSafeInteger(value.revision) || value.revision < 0 || value.revision < revision
      || !Number.isSafeInteger(value.generation) || value.generation < 0 || typeof value.error !== 'boolean') return;
    const request = value.request === null ? null : readCompletionRequest(value.request);
    if (value.request !== null && !request) return;
    revision = value.revision; nativeGeneration = value.generation;
    if (pending.size && value.status === 'idle' && !value.error) return;
    publish({ status: value.status, request: request ? { ...request, allowed: () => true } : null,
      error: value.error ? 'sound-unavailable' : null });
  }
  async function refresh() {
    const ticket = lifecycle;
    try { const value = await a.native.snapshotAsync(); if (!disposed && ticket === lifecycle
      && !(state.error && value.status === 'idle' && !value.error)) observe(value); }
    catch { if (!disposed && ticket === lifecycle) a.warn(); }
  }
  async function stopRequest(request: AlertRequest, expectedGeneration: number | null = null) {
    try { await a.native.stopPlaybackAsync(request.owner, notificationEventKey(request), expectedGeneration); }
    catch { a.warn(); }
  }
  function cancelOwner(owner?: AlertOwner) {
    for (const [ticket, request] of pending) if (!owner || request.owner === owner) cancelled.add(ticket);
    const current = state.request;
    if (current && (!owner || current.owner === owner)) {
      void stopRequest(current, pending.size ? null : nativeGeneration < 0 ? null : nativeGeneration);
      publish(idleAlert());
    }
  }
  function request(incoming: AlertRequest): boolean {
    if (disposed || a.getHydration() !== 'loaded' || !a.isActive() || !incoming.allowed()) return false;
    if (state.status !== 'idle' && state.request && (notificationEventKey(state.request) === notificationEventKey(incoming)
      || !completionWins(state.request, incoming))) return false;
    const runId = incoming.runId ?? (incoming.owner === 'preview' ? incoming.eventId.slice('preview:'.length)
      : incoming.owner === 'timer' ? incoming.eventId.slice('timer:'.length)
      : incoming.eventId.slice('planning:'.length, incoming.eventId.lastIndexOf(':')));
    const value = readCompletionRequest({ ...incoming, runId });
    if (!value) return false;
    const ticket = ++generation; pending.set(ticket, incoming);
    publish({ status: 'pending', request: incoming, error: null });
    void (async () => {
      try {
        await ready;
        if (disposed || cancelled.has(ticket) || ticket !== generation || !incoming.allowed()) return;
        const accepted = await a.native.requestPlaybackAsync({ ...value, stopLabel: getMessages(a.getSnapshot().preferences.language).stopSound });
        // Detachment leaves native completion ownership intact. Explicit
        // cancellation and superseding requests clean only their exact event.
        if (accepted && (cancelled.has(ticket) || (!disposed && ticket !== generation)
          || (!disposed && a.isActive() && !incoming.allowed()))) await stopRequest(incoming);
      } catch {
        if (!disposed && ticket === generation && !cancelled.has(ticket)) {
          a.warn(); publish({ status: 'idle', request: incoming, error: 'sound-unavailable' });
        }
      } finally {
        pending.delete(ticket); cancelled.delete(ticket);
        if (!disposed && ticket === generation) await refresh();
      }
    })();
    return true;
  }
  function syncPolicy(): Promise<void> {
    if (disposed || a.getHydration() !== 'loaded') return Promise.resolve();
    // Capture every accepted transition before awaiting native acknowledgement.
    // Completion can then retain its deadline even when writes coalesce.
    observedPolicy = completionPolicy(a.getSnapshot(), observedPolicy);
    policyDirty = true;
    if (!policyJob) policyJob = (async () => {
      while (policyDirty && !disposed && a.getHydration() === 'loaded') {
        policyDirty = false;
        const policy = observedPolicy;
        if (!policy) continue;
        const serialized = JSON.stringify(policy);
        if (serialized === lastPolicy) continue;
        try { await a.native.setPolicyAsync(policy); lastPolicy = serialized; }
        catch { a.warn(); }
      }
    })().finally(() => { policyJob = null; if (policyDirty && !disposed && a.getHydration() === 'loaded') return syncPolicy(); });
    return policyJob;
  }
  return {
    request, refresh, syncPolicy, getState: () => state,
    stop: () => cancelOwner(), cancelOwner,
    suspendOwner: (owner) => { if (owner === 'preview') cancelOwner(owner); },
    activate: () => {
      disposed = false; lifecycle++; subscription?.remove();
      subscription = a.native.addListener('playback', observe); ready = refresh(); void syncPolicy();
    },
    dispose: () => {
      cancelOwner('preview'); disposed = true; lifecycle++; subscription?.remove(); subscription = null;
    },
  };
}
