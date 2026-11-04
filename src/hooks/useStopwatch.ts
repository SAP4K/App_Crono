import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, initialData, restoreData } from '../core/stopwatch';

const STORAGE_KEY = '@crono/app-v1';

export function useStopwatch() {
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);
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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted.current) return;
        current.current = restoreData(raw);
        setData(current.current);
      })
      .catch(() => { if (mounted.current) setStorageError(true); })
      .finally(() => { if (mounted.current) setReady(true); });
    return () => { mounted.current = false; };
  }, []);

  const update = useCallback((action: (previous: AppData) => AppData) => {
    const next = action(current.current);
    if (next === current.current) return;
    current.current = next;
    setData(next);
    persist(next);
  }, [persist]);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist(current.current);
    });
    return () => subscription.remove();
  }, [persist, ready]);

  return { data, update, ready, storageError, dismissStorageError: () => setStorageError(false) };
}
