import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, initialData, restoreData } from '../core/stopwatch';

const STORAGE_KEY = '@crono/app-v1';

export function useStopwatch() {
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);
  const [hydrationStatus, setHydrationStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const hydration = useRef(hydrationStatus);
  const hydrationGeneration = useRef(0);
  const subscribers = useRef(new Set<() => void>());
  const [storageError, setStorageError] = useState(false);
  const current = useRef(data);
  const writeQueue = useRef(Promise.resolve());
  const mounted = useRef(true);

  const persist = useCallback((value: AppData) => {
    // Serialize writes so a slower previous save cannot overwrite the latest action.
    const serialized = JSON.stringify(value);
    writeQueue.current = writeQueue.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized))
      .catch(() => { if (mounted.current) setStorageError(true); });
  }, []);

  useEffect(() => {
    mounted.current = true;
    const ticket = ++hydrationGeneration.current;
    const isCurrent = () => mounted.current && ticket === hydrationGeneration.current;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!isCurrent()) return;
        current.current = restoreData(raw);
        setData(current.current);
        hydration.current = 'loaded'; setHydrationStatus('loaded');
      })
      .catch(() => {
        if (!isCurrent()) return;
        hydration.current = 'failed'; setHydrationStatus('failed'); setStorageError(true);
      })
      .finally(() => { if (isCurrent()) setReady(true); });
    return () => { mounted.current = false; hydrationGeneration.current = ticket + 1; };
  }, []);

  const update = useCallback((action: (previous: AppData) => AppData) => {
    const next = action(current.current);
    if (next === current.current) return { changed: false, data: current.current };
    current.current = next;
    setData(next);
    persist(next);
    for (const subscriber of [...subscribers.current]) {
      try { subscriber(); }
      catch { console.warn('[store] Accepted-update subscriber failed.'); }
    }
    return { changed: true, data: next };
  }, [persist]);

  const getSnapshot = useCallback(() => current.current, []);
  const getHydrationStatus = useCallback(() => hydration.current, []);
  const subscribeUpdates = useCallback((subscriber: () => void) => {
    subscribers.current.add(subscriber);
    return () => { subscribers.current.delete(subscriber); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist(current.current);
    });
    return () => subscription.remove();
  }, [persist, ready]);

  return { data, update, getSnapshot, subscribeUpdates, hydrationStatus, getHydrationStatus, ready, storageError, dismissStorageError: () => setStorageError(false) };
}
