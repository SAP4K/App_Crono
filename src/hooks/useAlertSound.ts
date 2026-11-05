import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { soundSources } from '../audio/sources';
import type { AlertTransport } from './alertPlayback';

type Player = ReturnType<typeof createAudioPlayer>;
type Entry = { player: Player; unsubscribe: () => void; cancel: () => void };

export function useAlertSound(): AlertTransport {
  const current = useRef<Entry | null>(null);
  const mounted = useRef(false);
  const mode = useRef<Promise<unknown>>(Promise.resolve());
  const stop = useCallback(() => {
    const entry = current.current;
    current.current = null;
    if (!entry) return;
    let cleanupFailed = false;
    for (const release of [entry.unsubscribe, entry.cancel, () => entry.player.pause(), () => entry.player.remove()]) {
      try { release(); } catch { cleanupFailed = true; }
    }
    if (cleanupFailed) console.warn('[audio] Could not release playback resource.');
  }, []);
  useEffect(() => {
    mounted.current = true;
    mode.current = setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false,
      shouldPlayInBackground: false, playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).then(() => null, (error: unknown) => error);
    return () => { mounted.current = false; stop(); };
  }, [stop]);

  const play = useCallback<AlertTransport['play']>(async (soundId, allowed, failed) => {
    const modeError = await mode.current;
    if (!mounted.current || !allowed()) return;
    if (modeError) throw modeError;
    stop();
    const player = createAudioPlayer(soundSources[soundId], { updateInterval: 100 });
    await new Promise<void>((resolve, reject) => {
      let settled = false; let preparing = false; let requestedPlay = false;
      const entry: Entry = { player, unsubscribe: () => {}, cancel: () => {
        if (!settled) { settled = true; reject(new Error('Audio canceled.')); }
      } };
      current.current = entry;
      const valid = () => mounted.current && current.current === entry && allowed();
      const started = () => { if (valid() && !settled) { settled = true; resolve(); } };
      const report = (error: unknown) => {
        if (!valid()) return;
        if (settled) failed(error);
        else { settled = true; reject(error); }
      };
      const prepare = async () => {
        if (preparing || !valid()) return;
        preparing = true;
        try {
          await player.seekTo(0);
          if (!valid()) return;
          player.loop = true; requestedPlay = true; player.play();
          if (player.playing) started();
        } catch (error) { report(error); }
      };
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!valid()) return;
        if (status.error) { report(new Error(status.error)); return; }
        if (status.isLoaded && !preparing) void prepare();
        if (status.playing && requestedPlay) started();
      });
      entry.unsubscribe = () => subscription.remove();
      if (player.isLoaded) void prepare();
    });
  }, [stop]);
  return useMemo(() => ({ play, stop }), [play, stop]);
}
