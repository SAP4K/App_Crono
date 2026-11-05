import type { SoundId } from '../core/sounds';

export const soundSources: Record<SoundId, number> = {
  classic: require('../../assets/audio/timer-complete.wav'),
  bell: require('../../assets/audio/bell.wav'),
  digital: require('../../assets/audio/digital.wav'),
  gong: require('../../assets/audio/gong.wav'),
};
