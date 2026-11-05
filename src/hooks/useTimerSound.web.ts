import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Asset } from 'expo-asset';
import type { TimerAudio } from './timerCompletion';

const source = require('../../assets/audio/timer-complete.wav');

// The browser play promise must be observed: autoplay denial is recoverable.
export function useTimerSound(_notify: (message: string) => void): TimerAudio {
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const player = new Audio(Asset.fromModule(source).uri);
    player.preload = 'auto';
    audio.current = player;
    return () => {
      audio.current = null;
      player.pause();
      player.removeAttribute('src');
      player.load();
    };
  }, []);
  const stop = useCallback(() => { audio.current?.pause(); }, []);
  const play = useCallback(async (allowed: () => boolean) => {
    const player = audio.current;
    if (!player || !allowed()) return;
    player.currentTime = 0;
    if (!allowed()) return;
    await player.play();
    if (!allowed()) player.pause();
  }, []);
  return useMemo(() => ({ play, stop }), [play, stop]);
}
