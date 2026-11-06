import type { SoundId } from '../core/sounds.ts';

// Native resource names, separate from Metro's numeric audio asset handles.
export const notificationSounds: Record<SoundId, string> = {
  classic: 'notification_classic.wav',
  bell: 'bell.wav',
  digital: 'digital.wav',
  gong: 'gong.wav',
};

export const notificationChannelId = (sound: SoundId | 'silent') => `crono.alerts.${sound}.v1`;
