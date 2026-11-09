import { isLanguage } from './language.ts';
import { MAX_SCHEDULES, readSchedule, validId, type Schedule } from './planning.ts';
import { ALERT_DURATIONS, isSoundId } from './sounds.ts';
import { MAX_SESSIONS, readSession, type AppData, type Preferences, type Session } from './stopwatch.ts';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export type BackupErrorCode = 'size' | 'version' | 'invalid' | 'capacity' | 'ids';
export class BackupError extends Error {
  readonly code: BackupErrorCode;
  constructor(code: BackupErrorCode) { super(code); this.name = 'BackupError'; this.code = code; }
}
export type Backup = {
  format: 'crono-backup'; version: 1; exportedAt: number;
  schedules: Schedule[]; sessions: Session[]; preferences: Preferences;
};
export type ImportIds = { schedules: string[]; steps: string[][]; sessions: string[] };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function utf8Bytes(value: string): number {
  let count = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    count += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (count > MAX_BACKUP_BYTES) return count;
  }
  return count;
}
function readPreferences(value: unknown): Preferences {
  if (!record(value) || !isLanguage(value.language) || !isSoundId(value.alertSoundId) ||
    !ALERT_DURATIONS.some((duration) => duration === value.alertDurationSeconds) ||
    (value.theme !== 'light' && value.theme !== 'dark') ||
    typeof value.haptics !== 'boolean' || typeof value.keepAwake !== 'boolean' ||
    typeof value.timerSound !== 'boolean' || typeof value.systemNotifications !== 'boolean') throw new BackupError('invalid');
  return { language: value.language, theme: value.theme, haptics: value.haptics, keepAwake: value.keepAwake,
    timerSound: value.timerSound, systemNotifications: value.systemNotifications, alertSoundId: value.alertSoundId,
    alertDurationSeconds: value.alertDurationSeconds as Preferences['alertDurationSeconds'] };
}
function readRecords<T>(value: unknown, limit: number, read: (item: unknown) => T | null, id: (item: T) => string): T[] {
  if (!Array.isArray(value) || value.length > limit) throw new BackupError('invalid');
  const ids = new Set<string>();
  return value.map((item) => {
    const parsed = read(item);
    if (!parsed || !validId(id(parsed)) || ids.has(id(parsed))) throw new BackupError('invalid');
    ids.add(id(parsed)); return parsed;
  });
}
function strictSchedule(value: unknown): Schedule | null {
  const parsed = readSchedule(value);
  if (!parsed || !record(value) || parsed.name !== value.name || !Array.isArray(value.steps)) return null;
  const steps = value.steps;
  if (parsed.steps.some((step, index) => !record(steps[index]) || step.name !== steps[index].name)) return null;
  if (record(value.calendar) && value.calendar.kind === 'weekly' && Array.isArray(value.calendar.weekdays) &&
    new Set(value.calendar.weekdays).size !== value.calendar.weekdays.length) return null;
  return parsed;
}
function readBackup(value: unknown): Backup {
  if (!record(value) || value.format !== 'crono-backup') throw new BackupError('invalid');
  if (value.version !== 1) throw new BackupError('version');
  if (!Number.isSafeInteger(value.exportedAt) || (value.exportedAt as number) < 0) throw new BackupError('invalid');
  return { format: 'crono-backup', version: 1, exportedAt: value.exportedAt as number,
    schedules: readRecords(value.schedules, MAX_SCHEDULES, strictSchedule, (item) => item.id),
    sessions: readRecords(value.sessions, MAX_SESSIONS, readSession, (item) => item.id),
    preferences: readPreferences(value.preferences) };
}
export function parseBackup(raw: string): Backup {
  if (utf8Bytes(raw) > MAX_BACKUP_BYTES) throw new BackupError('size');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new BackupError('invalid'); }
  return readBackup(value);
}
export function serializeBackup(data: AppData, exportedAt: number): string {
  // Re-read and whitelist records; live clocks and native delivery state never enter the file.
  const backup = readBackup({ format: 'crono-backup', version: 1, exportedAt,
    schedules: data.planning.schedules, sessions: data.sessions, preferences: data.preferences });
  const raw = JSON.stringify(backup);
  if (utf8Bytes(raw) > MAX_BACKUP_BYTES) throw new BackupError('size');
  return raw;
}
export function importBackup(current: AppData, backup: Backup, ids: ImportIds, applyPreferences = false): AppData {
  if (current.planning.schedules.length + backup.schedules.length > MAX_SCHEDULES ||
    current.sessions.length + backup.sessions.length > MAX_SESSIONS) throw new BackupError('capacity');
  if (ids.schedules.length !== backup.schedules.length || ids.steps.length !== backup.schedules.length ||
    ids.sessions.length !== backup.sessions.length) throw new BackupError('ids');
  const reserved = new Set([...current.planning.schedules.flatMap((schedule) => [schedule.id, ...schedule.steps.map((step) => step.id)]),
    ...current.sessions.map((session) => session.id),
    ...(current.planning.run ? [current.planning.run.scheduleId, ...current.planning.run.steps.map((step) => step.id)] : []),
    ...backup.schedules.flatMap((schedule) => [schedule.id, ...schedule.steps.map((step) => step.id)]), ...backup.sessions.map((session) => session.id)]);
  const fresh = (id: string) => {
    if (!validId(id) || reserved.has(id)) throw new BackupError('ids');
    reserved.add(id); return id;
  };
  const schedules = backup.schedules.map((schedule, index) => {
    const stepIds = ids.steps[index];
    if (!stepIds || stepIds.length !== schedule.steps.length) throw new BackupError('ids');
    return { ...schedule, id: fresh(ids.schedules[index]), steps: schedule.steps.map((step, i) => ({ ...step, id: fresh(stepIds[i]) })),
      ...(schedule.calendar ? { calendar: schedule.calendar.kind === 'weekly' ? { ...schedule.calendar, weekdays: [...schedule.calendar.weekdays] } : { ...schedule.calendar } } : {}) };
  });
  const sessions = backup.sessions.map((session, index) => {
    const id = fresh(ids.sessions[index]);
    if (id.length >= 100) throw new BackupError('ids');
    return { ...session, id, laps: session.laps.map((lap) => ({ ...lap })) };
  });
  const preferences = applyPreferences ? { ...backup.preferences } : current.preferences;
  const changedPreferences = applyPreferences && Object.keys(preferences).some((key) => preferences[key as keyof Preferences] !== current.preferences[key as keyof Preferences]);
  if (!schedules.length && !sessions.length && !changedPreferences) return current;
  return { ...current, planning: schedules.length ? { ...current.planning, schedules: [...current.planning.schedules, ...schedules] } : current.planning,
    sessions: sessions.length ? [...current.sessions, ...sessions].sort((a, b) => b.savedAt - a.savedAt) : current.sessions,
    preferences: changedPreferences ? preferences : current.preferences };
}
