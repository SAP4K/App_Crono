import type { NotificationCapability } from './notificationTypes.ts';

export type BackgroundAccess = {
  exactAlarm: 'granted' | 'denied' | 'not-required' | 'unknown';
  battery: 'unrestricted' | 'optimized' | 'not-applicable' | 'unknown';
};
export type NotificationDelivery = BackgroundAccess & {
  platform: 'android' | 'ios' | 'web';
  channel: 'available' | 'blocked' | 'not-applicable' | 'unknown';
  channelSound: 'audible' | 'silent' | 'not-applicable' | 'unknown';
};

export function emptyNotificationDelivery(platform: NotificationDelivery['platform']): NotificationDelivery {
  return { platform, exactAlarm: platform === 'android' ? 'unknown' : 'not-required',
    battery: platform === 'android' ? 'unknown' : 'not-applicable',
    channel: platform === 'android' ? 'unknown' : 'not-applicable',
    channelSound: platform === 'android' ? 'unknown' : 'not-applicable' };
}

export async function readBackgroundAccess(read: (() => Promise<unknown>) | null, warn: () => void): Promise<BackgroundAccess> {
  const unknown: BackgroundAccess = { exactAlarm: 'unknown', battery: 'unknown' };
  if (!read) return unknown;
  try {
    const value = await read();
    if (!value || typeof value !== 'object') { warn(); return unknown; }
    const data = value as Record<string, unknown>;
    return {
      exactAlarm: data.exactAlarm === 'granted' || data.exactAlarm === 'denied' || data.exactAlarm === 'not-required' ? data.exactAlarm : 'unknown',
      battery: data.battery === 'unrestricted' || data.battery === 'optimized' || data.battery === 'not-applicable' ? data.battery : 'unknown',
    };
  } catch { warn(); return unknown; }
}

export type NotificationReadiness = 'storage' | 'off' | 'unsupported' | 'unavailable' | 'permission-needed'
  | 'permission-blocked' | 'pending' | 'failed' | 'channel-blocked' | 'exact-denied' | 'unknown' | 'limited' | 'sound-disabled' | 'registered';

export function notificationReadiness(input: {
  hydration: string; enabled: boolean; status: 'idle' | 'pending' | 'ready' | 'failed';
  capability: NotificationCapability; delivery: NotificationDelivery; soundEnabled: boolean;
}): NotificationReadiness {
  const { capability: permission, delivery } = input;
  if (input.hydration !== 'loaded') return 'storage';
  if (permission.status === 'unsupported') return 'unsupported';
  if (permission.status === 'unavailable') return 'unavailable';
  if (!input.enabled) return 'off';
  if (!permission.canSchedule) return permission.canAsk ? 'permission-needed'
    : permission.status === 'denied' ? 'permission-blocked' : input.status === 'failed' ? 'failed' : 'unknown';
  if (input.status === 'failed') return 'failed';
  if (input.status !== 'ready') return 'pending';
  if (delivery.channel === 'blocked') return 'channel-blocked';
  if (delivery.exactAlarm === 'denied') return 'exact-denied';
  if (delivery.exactAlarm === 'unknown' || delivery.channel === 'unknown') return 'unknown';
  if (permission.status === 'limited') return 'limited';
  if (input.soundEnabled && (!permission.soundAllowed || delivery.channelSound === 'silent')) return 'sound-disabled';
  return 'registered';
}
