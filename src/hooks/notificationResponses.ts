import { NOTIFICATION_PREFIX, ownedNotificationData } from '../core/notifications.ts';
import type { NativeNotificationResponse } from './notificationTypes.ts';

export function notificationRoute(response: NativeNotificationResponse): '/timer' | '/planning' | null {
  if (!response.defaultAction) return null;
  const data = ownedNotificationData(response.identifier, response.data);
  return data ? data.owner === 'timer' ? '/timer' : '/planning' : null;
}

export function createNotificationResponseHandler(a: {
  navigate: (route: '/timer' | '/planning') => void;
  consume: (identifier: string) => void;
  warn: () => void;
}) {
  let ready = false, pending: NativeNotificationResponse | null = null;
  const handled = new Set<string>();
  function flush() {
    if (!ready || !pending) return;
    const response = pending, route = notificationRoute(response);
    if (!route) return;
    try { a.navigate(route); }
    catch { a.warn(); return; }
    pending = null; handled.add(response.identifier);
    while (handled.size > 128) handled.delete(handled.values().next().value!);
    a.consume(response.identifier);
  }
  return {
    setReady: (value: boolean) => { ready = value; flush(); },
    accept: (response: NativeNotificationResponse) => {
      if (!notificationRoute(response) || handled.has(response.identifier)) {
        if (response.identifier.startsWith(NOTIFICATION_PREFIX)) a.consume(response.identifier);
        return;
      }
      pending = response; flush();
    },
  };
}
