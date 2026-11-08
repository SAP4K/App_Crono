import type { SystemNotificationAdapter } from './notificationTypes.ts';
import { unavailableNotifications } from './notificationTypes.ts';
import { emptyNotificationDelivery } from './notificationReadiness.ts';

export const systemNotifications: SystemNotificationAdapter = {
  platform: 'web', delivery: async () => emptyNotificationDelivery('web'),
  supported: false, exactAlarmSettings: false,
  prepare: async () => {}, permission: async () => unavailableNotifications('unsupported'),
  requestPermission: async () => unavailableNotifications('unsupported'),
  pending: async () => [], presented: async () => [],
  schedule: async () => { throw new Error('System notifications require a native app.'); },
  cancel: async () => {}, dismiss: async () => {}, listen: () => () => {},
  lastResponse: async () => null, clearResponse: async () => {}, openSettings: async () => {},
};
