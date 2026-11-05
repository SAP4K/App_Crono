import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { TimerAudio } from './timerCompletion';

const source = require('../../assets/audio/timer-complete.wav');

export function useTimerSound(notify: (message: string) => void): TimerAudio {
  // Register before the managed player's release effect so teardown never pauses a released object.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const active = useRef<(() => boolean) | null>(null);
  const latestStatus = useRef(status);
  const mode = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    latestStatus.current = status;
  }, [status]);

  useEffect(() => {
    mode.current = setAudioModeAsync({
      allowsRecording: false, allowsBackgroundRecording: false,
      shouldPlayInBackground: false, playsInSilentMode: false, interruptionMode: 'mixWithOthers',
    }).then(() => null, (error: unknown) => error);
  }, []);

  useEffect(() => {
    if (!status.error || !active.current?.()) return;
    console.warn('[timer] Audio playback failed.', status.error);
    active.current = null;
    notify('Timpul a expirat. Sunetul nu este disponibil acum.');
  }, [status.error, notify]);

  const stop = useCallback(() => {
    active.current = null;
    if (mounted.current) player.pause();
  }, [player]);

  const play = useCallback(async (allowed: () => boolean) => {
    const error = await mode.current;
    if (!allowed()) return;
    if (error) throw error;
    for (let attempt = 0; !player.isLoaded && attempt < 100; attempt++) {
      if (!allowed()) return;
      if (latestStatus.current.error) throw new Error(latestStatus.current.error);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    if (!allowed()) return;
    if (!player.isLoaded) throw new Error('Timer sound did not load.');
    await player.seekTo(0);
    if (!allowed()) return;
    active.current = allowed;
    player.play();
  }, [player]);

  return useMemo(() => ({ play, stop }), [play, stop]);
}
