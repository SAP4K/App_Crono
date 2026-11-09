import { BackupError, MAX_BACKUP_BYTES } from '../core/backup';
import { BackupFileError, type BackupFiles } from './backupFiles.types';

export const backupFiles: BackupFiles = {
  pick: () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
    let finish: (raw: string | null) => void;
    let fail: (error: unknown) => void;
    let settled = false;
    const cleanup = () => { input.remove(); input.onchange = null; input.oncancel = null; };
    const result = new Promise<string | null>((resolve, reject) => { finish = resolve; fail = reject; });
    const cancel = () => { if (!settled) { settled = true; cleanup(); finish(null); } };
    input.oncancel = cancel;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { cancel(); return; }
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new BackupError('size');
        const raw = await file.text();
        if (!settled) { settled = true; finish(raw); }
      } catch (error) { if (!settled) { settled = true; fail(error); } }
      finally { cleanup(); }
    };
    document.body.appendChild(input);
    try { input.click(); } catch { settled = true; cleanup(); fail!(new BackupFileError('file')); }
    return { result, cancel };
  },
  save: (raw, filename) => {
    const blob = new Blob([raw], { type: 'application/json' });
    if (blob.size > MAX_BACKUP_BYTES) return { result: Promise.reject(new BackupError('size')), cancel: () => undefined };
    let url: string | undefined;
    let error: unknown;
    try {
      url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename;
      try { document.body.appendChild(link); link.click(); }
      finally { link.remove(); }
    } catch { error = new BackupFileError('file'); }
    finally { if (url) { const released = url; setTimeout(() => URL.revokeObjectURL(released), 1000); } }
    return { result: error ? Promise.reject(error) : Promise.resolve(), cancel: () => undefined };
  },
};
