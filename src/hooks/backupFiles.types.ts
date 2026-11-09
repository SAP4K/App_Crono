export type FileOperation<T> = { result: Promise<T>; cancel: () => void };
export type BackupFiles = {
  pick: () => FileOperation<string | null>;
  save: (raw: string, filename: string) => FileOperation<void>;
};
export class BackupFileError extends Error {
  readonly code: 'unavailable' | 'file';
  constructor(code: 'unavailable' | 'file') { super(code); this.name = 'BackupFileError'; this.code = code; }
}
