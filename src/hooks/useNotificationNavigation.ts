import { useEffect, useMemo } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useCrono } from '../context/CronoContext';
import { createNotificationResponseHandler } from './notificationResponses';

export function useNotificationNavigation() {
  const router = useRouter();
  const root = useRootNavigationState();
  const { hydrationStatus, notifications: { response, consumeResponse } } = useCrono();
  const handler = useMemo(() => createNotificationResponseHandler({
    navigate: (route) => router.navigate(route), consume: consumeResponse,
    warn: () => console.warn('[notifications] Navigation failed.'),
  }), [router, consumeResponse]);
  useEffect(() => { handler.setReady(hydrationStatus === 'loaded' && !!root?.key); }, [handler, hydrationStatus, root?.key]);
  useEffect(() => { if (response) handler.accept(response); }, [handler, response]);
}
