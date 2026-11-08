import { NOTIFICATION_PREFIX, notificationData, notificationEventKey, ownedNotificationData, projectNotificationEvents } from '../core/notifications.ts';
import type { NotificationData } from '../core/notifications.ts';
import type { AppData } from '../core/stopwatch.ts';
import { notificationContent } from '../i18n/notificationContent.ts';
import type { NativeNotification, NotificationCapability, NotificationDescriptor, SystemNotificationAdapter } from './notificationTypes.ts';
import { unavailableNotifications } from './notificationTypes.ts';
import { notificationChannelId } from '../audio/notificationSounds.ts';
import { emptyNotificationDelivery } from './notificationReadiness.ts';
import type { BackgroundAccess, NotificationDelivery } from './notificationReadiness.ts';

export type NotificationState = { status: 'idle' | 'pending' | 'ready' | 'failed'; capability: NotificationCapability; delivery: NotificationDelivery };
type Adapters = {
  getSnapshot: () => AppData; getHydration: () => 'loading' | 'loaded' | 'failed';
  native: SystemNotificationAdapter; now: () => number; createId: () => string;
  isActive: () => boolean;
  changed: (state: NotificationState) => void; warn: (operation: string) => void;
};
type Owned = { identifier: string; data: NotificationData };

export function createNotificationCoordinator(a: Adapters) {
  let state: NotificationState = { status: 'idle', capability: a.native.supported
    ? { status: 'unknown', canSchedule: false, canAsk: false, soundAllowed: false } : unavailableNotifications('unsupported'),
    delivery: emptyNotificationDelivery(a.native.platform) };
  let generation = 0, lifecycle = 0, permissionGeneration = 0;
  let disposed = false, dirty = false, refreshNeeded = true;
  let permissionRefused = false;
  let rearmOnHydration = a.native.platform === 'android';
  let alarmMode: BackgroundAccess['exactAlarm'] = a.native.platform === 'android' ? 'unknown' : 'not-required';
  const rearmIds = new Set<string>();
  let running: Promise<void> | null = null, permissionJob: Promise<void> | null = null;
  let known = new Map<string, Owned>();
  const consumed = new Set<string>();
  const warned = new Set<string>();

  function publish(status: NotificationState['status'], capability = state.capability, delivery = state.delivery) {
    if (disposed) return;
    if (state.status === status && JSON.stringify(state.capability) === JSON.stringify(capability)
      && JSON.stringify(state.delivery) === JSON.stringify(delivery)) return;
    state = { status, capability, delivery }; a.changed(state);
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
      .map((event) => {
        const content = notificationContent(event, data.preferences);
        return { ...content, fingerprint: JSON.stringify([content.fingerprint, 'date-v2', alarmMode]) };
      });
  }
  function wanted(data: NotificationData) {
    return desired().some((item) => notificationEventKey(item.event) === notificationEventKey(data) && item.fingerprint === data.fingerprint);
  }
  async function cancel(item: Owned) {
    try { await a.native.cancel(item.identifier); known.delete(item.identifier); rearmIds.delete(item.identifier); return true; }
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
    const preferences = a.getSnapshot().preferences;
    if (preferences.systemNotifications && state.capability.canSchedule) {
      try { await a.native.prepare(preferences.language); }
      catch { warn('channels'); publish('failed'); return; }
      if (ticket !== generation || disposed || a.getHydration() !== 'loaded') return;
      let delivery = emptyNotificationDelivery(a.native.platform);
      try { delivery = await a.native.delivery(notificationChannelId(preferences.timerSound ? preferences.alertSoundId : 'silent')); }
      catch { warn('delivery'); }
      if (ticket !== generation || disposed || a.getHydration() !== 'loaded') return;
      // A failed optional probe must not downgrade valid registrations to an unknown mode.
      if (delivery.exactAlarm !== 'unknown') alarmMode = delivery.exactAlarm;
      publish('pending', state.capability, delivery);
    }
    let pending: Owned[], presented: Owned[];
    try {
      const inventory = await Promise.all([a.native.pending(), a.native.presented()]);
      pending = owned(inventory[0]); presented = owned(inventory[1]);
    } catch { warn('inventory'); publish('failed'); return; }
    if (ticket !== generation || disposed || a.getHydration() !== 'loaded') return;
    if (rearmOnHydration) {
      for (const item of pending) if (item.data.dueAt > a.now()) rearmIds.add(item.identifier);
      rearmOnHydration = false;
    }
    for (const item of [...presented, ...pending.filter((item) => item.data.dueAt <= a.now())]) remember(item.data);
    const currentIds = new Set(pending.map(({ identifier }) => identifier));
    for (const previous of known.values()) {
      if (!currentIds.has(previous.identifier) && previous.data.dueAt <= a.now()) remember(previous.data);
    }
    known = new Map(pending.map((item) => [item.identifier, item]));
    if (ticket !== generation || disposed || a.getHydration() !== 'loaded') return;
    let failed = false;
    const retained = new Set<string>();
    const blockedOwners = new Set<NotificationData['owner']>();
    for (const item of pending) {
      if (ticket !== generation || disposed) return;
      const key = notificationEventKey(item.data);
      if (rearmIds.has(item.identifier) || !wanted(item.data) || retained.has(key)) {
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
        if (registered === null) { remember(metadata); continue; } // Elapsed during native preparation.
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
    if (disposed || !a.isActive() || a.getHydration() !== 'loaded' || !a.native.supported || !a.getSnapshot().preferences.systemNotifications) return Promise.resolve();
    const ticket = ++permissionGeneration;
    const isCurrent = () => !disposed && ticket === permissionGeneration && a.getHydration() === 'loaded'
      && a.getSnapshot().preferences.systemNotifications;
    const canPrompt = () => isCurrent() && a.isActive();
    permissionJob = (async () => {
      try {
        const capability = await a.native.permission();
        if (!isCurrent()) return;
        publish(state.status, capability);
        if (canPrompt() && capability.canAsk && (explicit || (!permissionRefused && ['unknown', 'denied'].includes(capability.status)))) {
          const updated = await a.native.requestPermission(a.getSnapshot().preferences.language, canPrompt);
          if (updated === null || !isCurrent()) return;
          if (!updated.canSchedule) permissionRefused = true;
          publish(state.status, updated);
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
