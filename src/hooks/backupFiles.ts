import { BackupError, MAX_BACKUP_BYTES, utf8Bytes } from '../core/backup';
import { BackupFileError, type BackupFiles, type FileOperation } from './backupFiles.types';

function operation<T>(run: (cancelled: () => boolean) => Promise<T>): FileOperation<T> {
  let cancelled = false;
  return { result: run(() => cancelled), cancel: () => { cancelled = true; } };
}
async function fileSystem() {
  try { return await import('expo-file-system'); }
  catch { throw new BackupFileError('unavailable'); }
}
export const backupFiles: BackupFiles = {
  pick: () => operation(async (cancelled) => {
    const fs = await fileSystem();
    let picker: typeof import('expo-document-picker');
    try { picker = await import('expo-document-picker'); }
    catch { throw new BackupFileError('unavailable'); }
    if (cancelled()) return null;
    const picked = await picker.getDocumentAsync({ type: 'application/json', multiple: false, copyToCacheDirectory: true });
    if (picked.canceled) return null;
    const asset = picked.assets[0];
    if (!asset || picked.assets.length !== 1) throw new BackupFileError('file');
    const file = new fs.File(asset.uri);
    try {
      if (cancelled()) return null;
      if ((asset.size ?? 0) > MAX_BACKUP_BYTES || file.size > MAX_BACKUP_BYTES) throw new BackupError('size');
      if (!file.exists) throw new BackupFileError('file');
      const raw = await file.text();
      return cancelled() ? null : raw;
    } finally {
      // Only the picker's cached copy is ours to remove, never the original document.
      if (file.uri.startsWith(fs.Paths.cache.uri) && file.exists) {
        try { file.delete(); } catch { console.warn('[backup] import-cache-cleanup'); }
      }
    }
  }),
  save: (raw, filename) => operation(async (cancelled) => {
    if (utf8Bytes(raw) > MAX_BACKUP_BYTES) throw new BackupError('size');
    const fs = await fileSystem();
    let sharing: typeof import('expo-sharing');
    try { sharing = await import('expo-sharing'); }
    catch { throw new BackupFileError('unavailable'); }
    if (cancelled()) return;
    if (!await sharing.isAvailableAsync()) throw new BackupFileError('unavailable');
    if (cancelled()) return;
    const directory = new fs.Directory(fs.Paths.cache, 'crono-backups');
    directory.create({ idempotent: true });
    // Retain recent shared files for receiving apps that read after the chooser closes.
    for (const entry of directory.list()) {
      if (entry instanceof fs.File && entry.lastModified !== null && entry.lastModified < Date.now() - 86400000) {
        try { entry.delete(); } catch { console.warn('[backup] export-cache-cleanup'); }
      }
    }
    const file = new fs.File(directory, filename);
    file.create(); file.write(raw);
    if (!cancelled()) await sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
  }),
};
