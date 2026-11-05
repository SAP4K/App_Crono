export const SOUND_CHOICES = [
  { id: 'classic', label: 'Clasic' },
  { id: 'bell', label: 'Clopoțel' },
  { id: 'digital', label: 'Digital' },
  { id: 'gong', label: 'Gong' },
] as const;

export type SoundId = typeof SOUND_CHOICES[number]['id'];
export const ALERT_DURATIONS = [5, 15, 30] as const;
export type AlertDuration = typeof ALERT_DURATIONS[number];
export const DEFAULT_SOUND: SoundId = 'classic';
export const DEFAULT_ALERT_DURATION: AlertDuration = 5;

export function isSoundId(value: unknown): value is SoundId {
  return SOUND_CHOICES.some((sound) => sound.id === value);
}

export function restoreSoundId(value: unknown): SoundId {
  return isSoundId(value) ? value : DEFAULT_SOUND;
}

export function restoreAlertDuration(value: unknown): AlertDuration {
  return ALERT_DURATIONS.some((duration) => duration === value) ? value as AlertDuration : DEFAULT_ALERT_DURATION;
}
