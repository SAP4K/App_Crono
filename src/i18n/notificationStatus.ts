import type { NotificationReadiness } from '../hooks/notificationReadiness.ts';
import type { Messages } from './types.ts';

export function notificationStatus(code: NotificationReadiness, m: Messages): string {
  const messages: Record<NotificationReadiness, string> = {
    storage: m.notificationStorageUnavailable, off: m.notificationDisabled,
    unsupported: m.notificationsWeb, unavailable: m.notificationUnavailable,
    'permission-needed': m.notificationPermissionUnknown, 'permission-blocked': m.notificationPermissionDenied,
    pending: m.notificationSchedulePending, failed: m.notificationScheduleFailed,
    'channel-blocked': m.notificationBackground.channelBlocked, 'exact-denied': m.notificationExactHelp,
    unknown: m.notificationBackground.unknown, limited: m.notificationPermissionLimited,
    'sound-disabled': m.notificationBackground.soundDisabled, registered: m.notificationBackground.configured,
    'short-sound': m.notificationLongSoundFallback,
  };
  return messages[code];
}
