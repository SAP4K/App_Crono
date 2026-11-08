import type { BackgroundAccess } from './notificationReadiness';

export async function backgroundAccess(): Promise<BackgroundAccess> {
  return { exactAlarm: 'not-required', battery: 'not-applicable' };
}
