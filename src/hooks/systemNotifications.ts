import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Linking, Platform } from 'react-native';
import { notificationData } from '../core/notifications';
import { notificationChannelId, notificationSounds } from '../audio/notificationSounds';
import type { AppLanguage } from '../core/language';
import { SOUND_CHOICES } from '../core/sounds';
import { getMessages } from '../i18n';
import { notificationCapability, unavailableNotifications } from './notificationTypes';
import type { NativeNotification, NativeNotificationResponse, SystemNotificationAdapter } from './notificationTypes';
import { backgroundAccess } from './backgroundAccess';
import { emptyNotificationDelivery } from './notificationReadiness';
import { isAppActive } from './appActivity';
import { notificationPresentation } from './notificationPresentation';
import { notificationTriggerDate } from './notificationTrigger';
import { completionAlerts } from './completionAlerts';
import { completionNotificationAdapter } from './completionNotificationAdapter';

// Expo Go cannot contain CRONO's custom resources. A missing module in an older
// development binary is also handled without preventing the timing UI from loading.
const nativeModule = isRunningInExpoGo() ? Promise.resolve(null) : import('expo-notifications').then((module) => {
  module.setNotificationHandler({ handleNotification: async (notification) =>
    notificationPresentation(isAppActive(), notification.request.content.sound) });
  return module;
}).catch(() => { console.warn('[notifications] Native module unavailable; rebuild the app.'); return null; });

async function notifications() {
  const module = await nativeModule;
  if (!module) throw new Error('Native notification resources unavailable.');
  return module;
}

let preparedLanguage: AppLanguage | null = null;
let channelQueue = Promise.resolve();
async function prepare(language: AppLanguage) {
  const current = channelQueue.then(async () => {
    if (preparedLanguage === language) return;
    const module = await notifications();
    if (Platform.OS === 'android') {
      const m = getMessages(language);
      for (const sound of [...SOUND_CHOICES.map(({ id }) => id), 'silent'] as const) {
        await module.setNotificationChannelAsync(notificationChannelId(sound), {
          name: sound === 'silent' ? m.systemNotifications : `CRONO · ${m.sounds[sound]}`,
          importance: module.AndroidImportance.HIGH,
          sound: sound === 'silent' ? null : notificationSounds[sound],
          bypassDnd: false, showBadge: false, lockscreenVisibility: module.AndroidNotificationVisibility.PRIVATE,
        });
      }
    }
    preparedLanguage = language;
  });
  channelQueue = current.catch(() => {});
  return current;
}

function nativeNotification(notification: { identifier: string; content: { data?: unknown } }): NativeNotification {
  return { identifier: notification.identifier, data: notification.content.data };
}
function response(notification: import('expo-notifications').NotificationResponse, defaultAction: string): NativeNotificationResponse {
  return { ...nativeNotification(notification.notification.request), defaultAction: notification.actionIdentifier === defaultAction };
}

let permissionRequest: Promise<import('./notificationTypes').NotificationCapability | null> | null = null;
function requestPermission(language: AppLanguage, canPrompt: () => boolean) {
  if (permissionRequest) return permissionRequest;
  permissionRequest = (async () => {
    if (!isAppActive() || !canPrompt()) return null;
    await prepare(language);
    const module = await notifications();
    const current = notificationCapability(await module.getPermissionsAsync());
    // Preparation and permission reads can outlive the initiating gesture.
    if (!isAppActive() || !canPrompt()) return null;
    if (!current.canAsk) return current;
    return notificationCapability(await module.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
  })().finally(() => { permissionRequest = null; });
  return permissionRequest;
}

const expoSystemNotifications: SystemNotificationAdapter = {
  platform: Platform.OS === 'android' ? 'android' : 'ios',
  supported: true, exactAlarmSettings: Platform.OS === 'android' && Number(Platform.Version) >= 31,
  delivery: async (channelId) => {
    const result = { ...emptyNotificationDelivery(Platform.OS === 'android' ? 'android' : 'ios'), ...await backgroundAccess() };
    if (Platform.OS !== 'android') return result;
    const module = await notifications();
    const channel = await module.getNotificationChannelAsync(channelId);
    if (channel && channel.importance !== module.AndroidImportance.UNKNOWN) {
      result.channel = channel.importance === module.AndroidImportance.NONE ? 'blocked' : 'available';
      result.channelSound = channel.sound === null || channel.importance < module.AndroidImportance.DEFAULT ? 'silent' : 'audible';
    }
    return result;
  },
  prepare,
  permission: async () => {
    const module = await nativeModule;
    return module ? notificationCapability(await module.getPermissionsAsync()) : unavailableNotifications();
  },
  requestPermission,
  pending: async () => (await (await notifications()).getAllScheduledNotificationsAsync()).map(nativeNotification),
  presented: async () => (await (await notifications()).getPresentedNotificationsAsync()).map((item) => nativeNotification(item.request)),
  schedule: async (identifier, descriptor) => {
    const module = await notifications();
    const date = notificationTriggerDate(Platform.OS === 'android' ? 'android' : 'ios', descriptor.event.dueAt, Date.now());
    if (date === null) return null;
    return module.scheduleNotificationAsync({ identifier,
      content: { title: descriptor.title, body: descriptor.body, sound: descriptor.sound,
        data: notificationData(descriptor.event, descriptor.fingerprint) },
      trigger: { type: module.SchedulableTriggerInputTypes.DATE, date, channelId: descriptor.channelId },
    });
  },
  cancel: async (identifier) => (await notifications()).cancelScheduledNotificationAsync(identifier),
  dismiss: async (identifier) => (await notifications()).dismissNotificationAsync(identifier),
  listen: (received, responded) => {
    let removed = false;
    const subscriptions: { remove: () => void }[] = [];
    void nativeModule.then((module) => {
      if (!module || removed) return;
      subscriptions.push(module.addNotificationReceivedListener((item) => received(nativeNotification(item.request))));
      subscriptions.push(module.addNotificationResponseReceivedListener((item) => responded(response(item, module.DEFAULT_ACTION_IDENTIFIER))));
    }).catch(() => console.warn('[notifications] Listener setup failed.'));
    return () => { removed = true; subscriptions.forEach((subscription) => subscription.remove()); };
  },
  lastResponse: async () => {
    const module = await nativeModule;
    const value = module?.getLastNotificationResponse();
    return value && module ? response(value, module.DEFAULT_ACTION_IDENTIFIER) : null;
  },
  clearResponse: async () => { (await nativeModule)?.clearLastNotificationResponse(); },
  openSettings: async (target = false) => {
    if (target === 'battery' && Platform.OS === 'android') {
      try {
        const launcher = await import('expo-intent-launcher');
        await launcher.startActivityAsync(launcher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        return;
      } catch { console.warn('[notifications] Battery settings unavailable; opening app settings.'); }
    }
    if (target === true && Platform.OS === 'android' && Number(Platform.Version) >= 31) {
      try {
        const launcher = await import('expo-intent-launcher');
        const appPackage = Constants.expoConfig?.android?.package;
        if (!appPackage) throw new Error('Missing app package.');
        await launcher.startActivityAsync(launcher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, { data: `package:${appPackage}` });
        return;
      } catch { console.warn('[notifications] Alarm settings unavailable; opening app settings.'); }
    }
    await Linking.openSettings();
  },
};
export const systemNotifications = completionNotificationAdapter(expoSystemNotifications, completionAlerts);
