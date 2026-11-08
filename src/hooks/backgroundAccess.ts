import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { readBackgroundAccess } from './notificationReadiness';
import type { BackgroundAccess } from './notificationReadiness';

let warned = false;
export async function backgroundAccess(): Promise<BackgroundAccess> {
  if (Platform.OS !== 'android') return { exactAlarm: 'not-required', battery: 'not-applicable' };
  return readBackgroundAccess(async () => {
    const module = requireOptionalNativeModule<{ getStatusAsync(): Promise<unknown> }>('CronoBackgroundAccess');
    return module ? module.getStatusAsync() : { exactAlarm: 'unknown', battery: 'unknown' };
  }, () => {
    if (!warned) { warned = true; console.warn('[notifications] Background access query failed.'); }
  });
}
