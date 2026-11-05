import { AppState, Platform } from 'react-native';

export function isAppActive(): boolean {
  return Platform.OS === 'web' ? typeof document !== 'undefined' && document.visibilityState === 'visible' : AppState.currentState === 'active';
}

export function subscribeAppActivity(changed: () => void): () => void {
  if (Platform.OS === 'web') {
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }
  const subscription = AppState.addEventListener('change', changed);
  return () => subscription.remove();
}
