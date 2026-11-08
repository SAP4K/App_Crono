import { ownedNotificationData } from '../core/notifications.ts';
import type { CompletionNative } from './completionAlerts.types.ts';
import type { NativeNotification, NativeNotificationResponse, SystemNotificationAdapter } from './notificationTypes.ts';

const owned = (item: NativeNotification) => item && typeof item.identifier === 'string' && !!ownedNotificationData(item.identifier, item.data);
const validResponse = (item: NativeNotificationResponse | null): item is NativeNotificationResponse => !!item && owned(item) && item.defaultAction === true;

// Both transports stay below the single reconciliation owner. Never retry an
// ambiguously accepted native registration through the ordinary transport.
export function completionNotificationAdapter(base: SystemNotificationAdapter, native: CompletionNative | null,
  warn: () => void = () => console.warn('[notifications] Extended alarm capability unavailable.')): SystemNotificationAdapter {
  if (base.platform !== 'android') return base;
  let warned = false;
  return {
    ...base,
    delivery: async (channel) => {
      const delivery = await base.delivery(channel);
      if (!native) return { ...delivery, extendedSound: false };
      try { const extendedSound = await native.capableAsync(); warned = false; return { ...delivery, extendedSound }; }
      catch { if (!warned) { warned = true; warn(); } return { ...delivery, extendedSound: 'unknown' }; }
    },
    pending: async () => {
      const [ordinary, extended] = await Promise.all([base.pending(), native?.pendingAsync() ?? []]);
      return [...ordinary, ...extended.filter(owned)];
    },
    presented: async () => {
      const [ordinary, extended] = await Promise.all([base.presented(), native?.presentedAsync() ?? []]);
      return [...ordinary, ...extended.filter(owned)];
    },
    schedule: async (identifier, descriptor) => {
      if (descriptor.backend !== 'native') return base.schedule(identifier, descriptor);
      if (!native) throw new Error('Extended completion alarms require a rebuilt Android app.');
      return native.upsertAsync(identifier, descriptor);
    },
    cancel: async (identifier) => { await base.cancel(identifier); await native?.cancelAsync(identifier); },
    dismiss: async (identifier) => { await base.dismiss(identifier); await native?.dismissAsync(identifier); },
    listen: (received, response) => {
      const stop = base.listen(received, response);
      const subscriptions = native ? [
        native.addListener('received', (item) => { if (owned(item)) received(item); }),
        native.addListener('response', (item) => { if (validResponse(item)) response(item); }),
      ] : [];
      return () => { stop(); subscriptions.forEach((subscription) => subscription.remove()); };
    },
    lastResponse: async () => {
      const extended = await native?.lastResponseAsync();
      return validResponse(extended ?? null) ? extended! : base.lastResponse();
    },
    clearResponse: async (identifier) => { await base.clearResponse(identifier); await native?.clearResponseAsync(identifier ?? null); },
  };
}
