import { NOTIFICATION_PREFIX, notificationData, notificationEventKey, ownedNotificationData, projectNotificationEvents } from '../core/notifications.ts';
import type { NotificationData } from '../core/notifications.ts';
import type { AppData } from '../core/stopwatch.ts';
import { notificationContent } from '../i18n/notificationContent.ts';
import type { NativeNotification, NotificationCapability, NotificationDescriptor, SystemNotificationAdapter } from './notificationTypes.ts';
import { unavailableNotifications } from './notificationTypes.ts';

export type NotificationState = { status: 'idle' | 'pending' | 'ready' | 'failed'; capability: NotificationCapability };
type Adapters = {
  getSnapshot: () => AppData; getHydration: () => 'loading' | 'loaded' | 'failed';
  native: SystemNotificationAdapter; now: () => number; createId: () => string;
  changed: (state: NotificationState) => void; warn: (operation: string) => void;
};
type Owned = { identifier: string; data: NotificationData };

export function createNotificationCoordinator(a: Adapters) {
  let state: NotificationState = { status: 'idle', capability: a.native.supported
    ? { status: 'unknown', canSchedule: false, canAsk: false, soundAllowed: false } : unavailableNotifications('unsupported') };
  let generation = 0, lifecycle = 0, permissionGeneration = 0;
  let disposed = false, dirty = false, refreshNeeded = true;
  let running: Promise<void> | null = null, permissionJob: Promise<void> | null = null;
  let known = new Map<string, Owned>();
  const consumed = new Set<string>();
  const warned = new Set<string>();

  function publish(status: NotificationState['status'], capability = state.capability) {
    if (disposed) return;
    if (state.status === status && JSON.stringify(state.capability) === JSON.stringify(capability)) return;
    state = { status, capability }; a.changed(state);
  }
  function warn(operation: string) {
    if (warned.has(operation)) return;
    warned.add(operation); a.warn(operation);
  }
  function remember(data: NotificationData) {
    consumed.add(notificationEventKey(data));
    while (consumed.size > 256) consumed.delete(consumed.values().next().value!);
  }
  function owned(items: NativeNotification[]): Owned[] {
    return items.flatMap((item) => {
      const data = ownedNotificationData(item.identifier, item.data);
      return data ? [{ identifier: item.identifier, data }] : [];
    });
  }
  function desired(): NotificationDescriptor[] {
    if (disposed || a.getHydration() !== 'loaded' || !state.capability.canSchedule) return [];
    const data = a.getSnapshot();
    return projectNotificationEvents(data, a.now()).filter((event) => !consumed.has(notificationEventKey(event)))
      .map((event) => notificationContent(event, data.preferences));
  }
  function wanted(data: NotificationData) {
    return desired().some((item) => notificationEventKey(item.event) === notificationEventKey(data) && item.fingerprint === data.fingerprint);
  }
  async function cancel(item: Owned) {
    try { await a.native.cancel(item.identifier); known.delete(item.identifier); return true; }
    catch { warn('cancel'); return false; }
  }
  function shouldDismiss(data: NotificationData) {
    const snapshot = a.getSnapshot();
    return !snapshot.preferences.systemNotifications || (data.owner === 'timer'
      ? snapshot.timer.runId !== data.runId : snapshot.planning.run?.runId !== data.runId);
  }

  async function reconcileOnce(ticket: number) {
    if (a.getHydration() !== 'loaded' || !a.native.supported) { publish('idle'); return; }
    if (refreshNeeded && !permissionJob) {
      refreshNeeded = false;
      const permissionTicket = ++permissionGeneration;
      let capability: NotificationCapability;
      try { capability = await a.native.permission(); }
      catch { refreshNeeded = true; warn('permission'); publish('failed'); return; }
      if (disposed || permissionTicket !== permissionGeneration) return;
      publish('pending', capability);
    }
    if (ticket !== generation || disposed) return;
    if (permissionJob && !state.capability.canSchedule && a.getSnapshot().preferences.systemNotifications) return;
    if (state.capability.status === 'unavailable' || state.capability.status === 'unsupported') { publish('idle'); return; }
    let pending: Owned[], presented: Owned[];
    try {
      const inventory = await Promise.all([a.native.pending(), a.native.presented()]);
      pending = owned(inventory[0]); presented = owned(inventory[1]);
    } catch { warn('inventory'); publish('failed'); return; }
    if (ticket !== generation || disposed || a.getHydration() !== 'loaded') return;
    for (const item of [...presented, ...pending.filter((item) => item.data.dueAt <= a.now())]) remember(item.data);
    const currentIds = new Set(pending.map(({ identifier }) => identifier));
    for (const previous of known.values()) {
      if (!currentIds.has(previous.identifier) && previous.data.dueAt <= a.now()) remember(previous.data);
    }
    known = new Map(pending.map((item) => [item.identifier, item]));
    if (desired().length) {
      try { await a.native.prepare(a.getSnapshot().preferences.language); }
      catch { warn('channels'); publish('failed'); return; }
    }
    if (ticket !== generation || disposed || a.getHydration() !== 'loaded') return;
    let failed = false;
    const retained = new Set<string>();
    const blockedOwners = new Set<NotificationData['owner']>();
    for (const item of pending) {
      if (ticket !== generation || disposed) return;
      const key = notificationEventKey(item.data);
      if (!wanted(item.data) || retained.has(key)) {
        if (!(await cancel(item))) { failed = true; blockedOwners.add(item.data.owner); }
      }
      else retained.add(key);
    }
    for (const item of presented) {
      if (ticket !== generation || disposed) return;
      if (!shouldDismiss(item.data)) continue;
      try { await a.native.dismiss(item.identifier); }
      catch { failed = true; warn('dismiss'); }
    }
    for (const descriptor of desired()) {
      if (ticket !== generation || disposed) return;
      if (blockedOwners.has(descriptor.event.owner)) continue;
      const metadata = notificationData(descriptor.event, descriptor.fingerprint);
      if (!wanted(metadata)) continue;
      if ([...known.values()].some((item) => notificationEventKey(item.data) === notificationEventKey(metadata)
        && item.data.fingerprint === metadata.fingerprint)) continue;
      const identifier = NOTIFICATION_PREFIX + a.createId();
      const registrationLifecycle = lifecycle;
      try {
        const registered = await a.native.schedule(identifier, descriptor);
        const item = { identifier: registered, data: metadata };
        known.set(registered, item);
        if (registrationLifecycle !== lifecycle || !wanted(metadata)) failed = !(await cancel(item)) || failed;
      } catch {
        warn('schedule'); failed = true;
        // A rejected native promise may have persisted its supplied ID already.
        const item = { identifier, data: metadata }; known.set(identifier, item);
        await cancel(item);
      }
    }
    if (ticket !== generation || disposed) return;
    publish(failed ? 'failed' : 'ready');
    if (!failed) warned.clear();
  }

  async function drain() {
    while (dirty && !disposed) {
      dirty = false; const ticket = generation;
      try { await reconcileOnce(ticket); }
      catch { warn('reconcile'); publish('failed'); }
    }
  }
  function reconcile(refreshPermission = false): Promise<void> {
    if (disposed) return Promise.resolve();
    dirty = true; generation++; refreshNeeded ||= refreshPermission;
    if (a.native.supported && a.getHydration() === 'loaded') publish('pending');
    if (!running) {
      running = drain().finally(() => { running = null; if (dirty && !disposed) return reconcile(); });
    }
    return running;
  }

  function requestPermission(explicit = false): Promise<void> {
    if (permissionJob) return permissionJob;
    if (disposed || a.getHydration() !== 'loaded' || !a.native.supported || !a.getSnapshot().preferences.systemNotifications) return Promise.resolve();
    const ticket = ++permissionGeneration;
    permissionJob = (async () => {
      try {
        const capability = await a.native.permission();
        if (disposed || ticket !== permissionGeneration) return;
        publish(state.status, capability);
        if (capability.canAsk && (explicit || capability.status === 'unknown') && a.getSnapshot().preferences.systemNotifications) {
          const updated = await a.native.requestPermission(a.getSnapshot().preferences.language);
          if (!disposed && ticket === permissionGeneration) publish(state.status, updated);
        }
      } catch { warn('request-permission'); publish('failed'); }
    })().finally(() => { permissionJob = null; });
    return permissionJob.then(() => reconcile(true));
  }

  return {
    reconcile, requestPermission,
    getState: () => state,
    received: (notification: NativeNotification) => {
      const data = ownedNotificationData(notification.identifier, notification.data);
      if (data) { remember(data); void reconcile(); }
    },
    activate: () => { disposed = false; lifecycle++; },
    dispose: () => { disposed = true; lifecycle++; generation++; permissionGeneration++; dirty = false; },
  };
}
