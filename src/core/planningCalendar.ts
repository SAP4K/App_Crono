export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = typeof WEEKDAYS[number];
export type ScheduleCalendar =
  | { kind: 'weekly'; weekdays: Weekday[] }
  | { kind: 'once'; date: string };

export function calendarDateTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year === 0) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.getTime()
    : null;
}

export function localDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type CalendarDateParts = { day: string; month: string; year: string };

export function datePartsFromKey(date: string): CalendarDateParts {
  const [year, month, day] = date.split('-');
  return { day, month, year };
}

export function dateKeyFromParts({ day, month, year }: CalendarDateParts): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return calendarDateTimestamp(date) === null ? null : date;
}

export function readScheduleCalendar(value: unknown): ScheduleCalendar | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('kind' in value)) return null;
  if (value.kind === 'once' && 'date' in value && typeof value.date === 'string' && calendarDateTimestamp(value.date) !== null) {
    return { kind: 'once', date: value.date };
  }
  if (value.kind !== 'weekly' || !('weekdays' in value) || !Array.isArray(value.weekdays)) return null;
  const selected = new Set<unknown>(value.weekdays);
  const weekdays = WEEKDAYS.filter((day) => selected.has(day));
  return weekdays.length > 0 && weekdays.length === selected.size ? { kind: 'weekly', weekdays } : null;
}

export function matchesScheduleDate(calendar: ScheduleCalendar | undefined, date: string): boolean {
  if (!calendar) return false;
  if (calendar.kind === 'once') return calendar.date === date;
  const timestamp = calendarDateTimestamp(date);
  if (timestamp === null) return false;
  const weekday = new Date(timestamp).getUTCDay() || 7;
  return calendar.weekdays.some((day) => day === weekday);
}
