import { notificationChannelId, notificationSounds } from '../audio/notificationSounds.ts';
import type { NotificationEvent } from '../core/notifications.ts';
import type { Preferences } from '../core/stopwatch.ts';
import type { NotificationDescriptor } from '../hooks/notificationTypes.ts';
import { getMessages } from './index.ts';

export function notificationContent(event: NotificationEvent, preferences: Preferences): NotificationDescriptor {
  const m = getMessages(preferences.language);
  const title = event.owner === 'timer' ? m.notificationTimerTitle : m.notificationPlanningTitle;
  const body = event.kind === 'timer-complete' ? m.timerComplete : event.kind === 'schedule-complete'
    ? m.scheduleFinished(event.scheduleName ?? '') : m.stepFinished(event.stepName ?? '', event.nextStepName ?? '');
  const sound = preferences.timerSound ? notificationSounds[preferences.alertSoundId] : false;
  const channelId = notificationChannelId(preferences.timerSound ? preferences.alertSoundId : 'silent');
  return { event, title, body, sound, channelId, fingerprint: JSON.stringify([title, body, sound, channelId]) };
}
