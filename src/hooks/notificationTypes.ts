import type { AppLanguage } from '../core/language.ts';
import type { NotificationEvent } from '../core/notifications.ts';

export type NotificationCapability = {
  status: 'unknown' | 'granted' | 'limited' | 'denied' | 'unavailable' | 'unsupported';
  canSchedule: boolean; canAsk: boolean; soundAllowed: boolean;
};
export const unavailableNotifications = (status: 'unavailable' | 'unsupported' = 'unavailable'): NotificationCapability => ({
  status, canSchedule: false, canAsk: false, soundAllowed: false,
});

// Native-free policy; numeric iOS authorization values follow SDK 57's public enum.
export function notificationCapability(permission: { status: string; granted: boolean; canAskAgain: boolean;
  ios?: { status: number; allowsAlert: boolean | null; allowsSound: boolean | null; allowsDisplayOnLockScreen: boolean | null } }): NotificationCapability {
  if (permission.ios) {
    const ios = permission.ios;
    if (ios.status === 0) return { status: 'unknown', canSchedule: false, canAsk: permission.canAskAgain, soundAllowed: false };
    if (ios.status === 1) return { status: 'denied', canSchedule: false, canAsk: false, soundAllowed: false };
    const allowed = [2, 3, 4].includes(ios.status);
    const limited = ios.status !== 2 || ios.allowsAlert === false || ios.allowsSound === false || ios.allowsDisplayOnLockScreen === false;
    return { status: allowed ? limited ? 'limited' : 'granted' : 'unavailable', canSchedule: allowed,
      canAsk: allowed && limited && permission.canAskAgain, soundAllowed: allowed && ios.allowsSound !== false };
  }
  const allowed = permission.granted && permission.status === 'granted';
  return { status: allowed ? 'granted' : permission.status === 'undetermined' ? 'unknown' : 'denied',
    canSchedule: allowed, canAsk: permission.status === 'undetermined' && permission.canAskAgain, soundAllowed: allowed };
}

export type NotificationDescriptor = {
  event: NotificationEvent; title: string; body: string; sound: string | false; channelId: string; fingerprint: string;
};
export type NativeNotification = { identifier: string; data: unknown };
export type NativeNotificationResponse = NativeNotification & { defaultAction: boolean };
export type SystemNotificationAdapter = {
  supported: boolean; exactAlarmSettings: boolean;
  prepare: (language: AppLanguage) => Promise<void>;
  permission: () => Promise<NotificationCapability>;
  requestPermission: (language: AppLanguage) => Promise<NotificationCapability>;
  pending: () => Promise<NativeNotification[]>;
  presented: () => Promise<NativeNotification[]>;
  schedule: (identifier: string, descriptor: NotificationDescriptor) => Promise<string>;
  cancel: (identifier: string) => Promise<void>;
  dismiss: (identifier: string) => Promise<void>;
  listen: (received: (notification: NativeNotification) => void, response: (notification: NativeNotificationResponse) => void) => () => void;
  lastResponse: () => Promise<NativeNotificationResponse | null>;
  clearResponse: () => Promise<void>;
  openSettings: (exact?: boolean) => Promise<void>;
};
