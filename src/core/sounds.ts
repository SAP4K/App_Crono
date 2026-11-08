export const SOUND_CHOICES = [
  { id: 'classic' },
  { id: 'bell' },
  { id: 'digital' },
  { id: 'gong' },
] as const;

export type SoundId = typeof SOUND_CHOICES[number]['id'];
export const ALERT_DURATIONS = [5, 15, 30, 60] as const;
export type AlertDuration = typeof ALERT_DURATIONS[number];
export const DEFAULT_SOUND: SoundId = 'classic';
export const DEFAULT_ALERT_DURATION: AlertDuration = 60;

export function isSoundId(value: unknown): value is SoundId {
  return SOUND_CHOICES.some((sound) => sound.id === value);
}

export function restoreSoundId(value: unknown): SoundId {
  return isSoundId(value) ? value : DEFAULT_SOUND;
}

export function restoreAlertDuration(value: unknown): AlertDuration {
  return ALERT_DURATIONS.some((duration) => duration === value) ? value as AlertDuration : DEFAULT_ALERT_DURATION;
}
