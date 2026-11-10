import { useLayoutEffect, useMemo, useState } from 'react';
import { useCrono } from '../context/CronoContext';
import { createTimingId } from './createTimingId';
import { backupFiles } from './backupFiles';
import { createBackupTransfer, type TransferState } from './backupTransfer';

export function useBackupTransfer(active = true) {
  const { getSnapshot, getHydrationStatus, update, hydrationStatus } = useCrono();
  const [state, setState] = useState<TransferState>({ status: 'idle' });
  const controller = useMemo(() => createBackupTransfer({ files: backupFiles, getSnapshot, getHydrationStatus, update,
    createId: createTimingId,
    now: Date.now, changed: setState, warn: (code) => console.warn(`[backup] ${code}`),
  }), [getSnapshot, getHydrationStatus, update]);
  useLayoutEffect(() => {
    if (active) controller.activate();
    else controller.dispose();
    return () => controller.dispose();
  }, [controller, active]);
  return { state, controller, available: active && hydrationStatus === 'loaded' };
}
