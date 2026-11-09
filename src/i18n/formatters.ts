import { LANGUAGES } from '../core/language.ts';
import { calendarDateTimestamp, type ScheduleCalendar, type Weekday } from '../core/planningCalendar.ts';
import type { AppLanguage } from '../core/language.ts';
import { formatTime } from '../core/stopwatch.ts';
import type { Session } from '../core/stopwatch.ts';
import { getMessages } from './index.ts';

const formatOptions = {
  date: { day: 'numeric', month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  dayKey: { year: 'numeric', month: '2-digit', day: '2-digit' },
  weekdayShort: { weekday: 'short' },
  weekdayLong: { weekday: 'long' },
} as const;

const formatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(language: AppLanguage, kind: keyof typeof formatOptions, timeZone?: string) {
  const key = `${language}:${kind}:${timeZone ?? ''}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const locale = LANGUAGES.find(({ id }) => id === language)!.locale;
    formatter = new Intl.DateTimeFormat(locale, { ...formatOptions[kind], timeZone });
    formatters.set(key, formatter);
  }
  return formatter;
}
export const sessionDate = (timestamp: number, language: AppLanguage, timeZone?: string) => dateFormatter(language, 'date', timeZone).format(timestamp);
export const sessionTime = (timestamp: number, language: AppLanguage, timeZone?: string) => dateFormatter(language, 'time', timeZone).format(timestamp);

export function deadlineLabel(deadline: number, now: number, language: AppLanguage, timeZone?: string): string {
  const day = dateFormatter(language, 'dayKey', timeZone);
  const clock = sessionTime(deadline, language, timeZone);
  return day.format(deadline) === day.format(now) ? clock : `${sessionDate(deadline, language, timeZone)} · ${clock}`;
}

export function planningDateLabel(date: string, language: AppLanguage): string {
  const timestamp = calendarDateTimestamp(date);
  return timestamp === null ? date : sessionDate(timestamp, language, 'UTC');
}

export function planningWeekdayLabel(day: Weekday, language: AppLanguage, length: 'short' | 'long'): string {
  // 4 January 1970 is a Sunday. ISO day 1 starts the following day.
  return dateFormatter(language, length === 'short' ? 'weekdayShort' : 'weekdayLong', 'UTC')
    .format(Date.UTC(1970, 0, 4 + day));
}

export function scheduleCalendarLabel(calendar: ScheduleCalendar | undefined, language: AppLanguage): string {
  const m = getMessages(language);
  if (!calendar) return m.calendarManual;
  if (calendar.kind === 'once') return `${m.calendarOnce} · ${planningDateLabel(calendar.date, language)}`;
  const days = calendar.weekdays.map((day) => planningWeekdayLabel(day, language, 'short'));
  return `${m.calendarWeekly} · ${days.join(', ')}`;
}

export function sessionText(session: Session, language: AppLanguage = 'ro', timeZone?: string): string {
  const m = getMessages(language);
  return [
    `CRONO · ${sessionDate(session.savedAt, language, timeZone)} ${sessionTime(session.savedAt, language, timeZone)}`,
    m.shareTotal(formatTime(session.durationMs)),
    ...session.laps.map((lap) => m.shareLap(lap.number, formatTime(lap.splitMs), formatTime(lap.elapsedMs))),
  ].join('\n');
}
