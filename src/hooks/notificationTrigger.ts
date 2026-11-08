// Keep semantic deadlines exact. SDK 57's iOS DATE implementation truncates
// milliseconds, so only the platform trigger is rounded upward.
export function notificationTriggerDate(platform: 'android' | 'ios', dueAt: number, now: number): number | null {
  if (!Number.isSafeInteger(dueAt) || !Number.isSafeInteger(now) || now < 0 || dueAt <= now) return null;
  const date = platform === 'ios' ? Math.ceil(dueAt / 1000) * 1000 : dueAt;
  return Number.isSafeInteger(date) ? date : null;
}
