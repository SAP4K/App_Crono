import { BackupError, importBackup, parseBackup, serializeBackup, type Backup, type BackupErrorCode } from '../core/backup.ts';
import type { AppData } from '../core/stopwatch.ts';
import { BackupFileError, type BackupFiles, type FileOperation } from './backupFiles.types.ts';

export type TransferError = BackupErrorCode | 'unavailable' | 'file' | 'notReady';
export type TransferState = {
  status: 'idle' | 'reading' | 'exporting' | 'preview' | 'imported' | 'exported';
  preview?: { schedules: number; sessions: number };
  error?: TransferError;
};
type Adapter = {
  files: BackupFiles; getSnapshot: () => AppData; getHydrationStatus: () => 'loading' | 'loaded' | 'failed';
  update: (change: (current: AppData) => AppData) => { changed: boolean; data: AppData };
  createId: () => string; now: () => number; changed: (state: TransferState) => void; warn: (code: string) => void;
};
export function createBackupTransfer(a: Adapter) {
  let active = true, generation = 0;
  let operation: FileOperation<unknown> | undefined;
  let backup: Backup | undefined;
  let state: TransferState = { status: 'idle' };
  const emit = (next: TransferState) => { state = next; if (active) a.changed(next); };
  const fail = (error: unknown) => {
    const code: TransferError = error instanceof BackupError || error instanceof BackupFileError ? error.code : 'file';
    if (code === 'file') a.warn('file-operation');
    emit({ status: backup ? 'preview' : 'idle', ...(backup ? { preview: { schedules: backup.schedules.length, sessions: backup.sessions.length } } : {}), error: code });
  };
  const ready = () => {
    if (!active || state.status === 'reading' || state.status === 'exporting') return false;
    if (a.getHydrationStatus() !== 'loaded') { emit({ status: backup ? 'preview' : 'idle', preview: state.preview, error: 'notReady' }); return false; }
    return true;
  };
  const current = (ticket: number) => active && generation === ticket;
  const cancel = () => { generation++; operation?.cancel(); operation = undefined; backup = undefined; emit({ status: 'idle' }); };
  return {
    getState: () => state,
    activate: () => { active = true; },
    cancel,
    dispose: () => { active = false; cancel(); },
    read: async () => {
      if (!ready() || state.status === 'preview') return;
      const ticket = ++generation; backup = undefined; emit({ status: 'reading' });
      try {
        const picked = a.files.pick(); operation = picked;
        const raw = await picked.result;
        if (!current(ticket)) return;
        operation = undefined;
        if (raw === null) { emit({ status: 'idle' }); return; }
        if (a.getHydrationStatus() !== 'loaded') { emit({ status: 'idle', error: 'notReady' }); return; }
        backup = parseBackup(raw);
        emit({ status: 'preview', preview: { schedules: backup.schedules.length, sessions: backup.sessions.length } });
      } catch (error) { if (current(ticket)) { operation = undefined; fail(error); } }
    },
    export: async () => {
      if (!ready() || state.status === 'preview') return;
      const ticket = ++generation; emit({ status: 'exporting' });
      try {
        const now = a.now(); const raw = serializeBackup(a.getSnapshot(), now);
        // Call synchronously before the first await: web pick/download requires a user gesture.
        const saved = a.files.save(raw, `crono-backup-${now}-${a.createId().replace(/[^a-zA-Z0-9-]/g, '').slice(-24)}.json`);
        operation = saved; await saved.result;
        if (current(ticket)) { operation = undefined; emit({ status: 'exported' }); }
      } catch (error) { if (current(ticket)) { operation = undefined; fail(error); } }
    },
    confirm: (applyPreferences = false) => {
      if (!ready() || state.status !== 'preview' || !backup) return false;
      const importing = backup;
      const ids = { schedules: importing.schedules.map(() => a.createId()),
        steps: importing.schedules.map((schedule) => schedule.steps.map(() => a.createId())),
        sessions: importing.sessions.map(() => a.createId()) };
      try {
        a.update((latest) => {
          if (a.getHydrationStatus() !== 'loaded') throw new Error('notReady');
          return importBackup(latest, importing, ids, applyPreferences);
        });
        backup = undefined; emit({ status: 'imported' }); return true;
      } catch (error) {
        if (a.getHydrationStatus() !== 'loaded') emit({ status: 'preview', preview: state.preview, error: 'notReady' });
        else fail(error);
        return false;
      }
    },
  };
}
