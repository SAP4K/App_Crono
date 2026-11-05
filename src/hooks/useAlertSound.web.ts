import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Asset } from 'expo-asset';
import { soundSources } from '../audio/sources';
import type { AlertTransport } from './alertPlayback';

export function useAlertSound(): AlertTransport {
  const current = useRef<{ player: HTMLAudioElement; failed: () => void } | null>(null);
  const stop = useCallback(() => {
    const entry = current.current;
    current.current = null;
    if (!entry) return;
    entry.player.removeEventListener('error', entry.failed);
    entry.player.pause();
    entry.player.removeAttribute('src');
    entry.player.load();
  }, []);
  useEffect(() => stop, [stop]);
  const play = useCallback<AlertTransport['play']>(async (soundId, allowed, failed) => {
    if (!allowed()) return;
    stop();
    const player = new Audio(Asset.fromModule(soundSources[soundId]).uri);
    player.loop = true;
    player.preload = 'auto';
    const entry = { player, failed: () => { if (current.current === entry && allowed()) failed(new Error('Audio media failed.')); } };
    current.current = entry;
    player.addEventListener('error', entry.failed);
    if (!allowed()) { stop(); return; }
    await player.play();
  }, [stop]);
  return useMemo(() => ({ play, stop }), [play, stop]);
}
