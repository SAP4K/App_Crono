import { LANGUAGES } from '../core/language.ts';
import type { AppLanguage } from '../core/language.ts';
import { formatTime } from '../core/stopwatch.ts';
import type { Session } from '../core/stopwatch.ts';
import { getMessages } from './index.ts';

const formatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(language: AppLanguage, kind: 'date' | 'time', timeZone?: string) {
  const key = `${language}:${kind}:${timeZone ?? ''}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const locale = LANGUAGES.find(({ id }) => id === language)!.locale;
    formatter = new Intl.DateTimeFormat(locale, kind === 'date'
      ? { day: 'numeric', month: 'long', year: 'numeric', timeZone }
      : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
    formatters.set(key, formatter);
  }
  return formatter;
}
export const sessionDate = (timestamp: number, language: AppLanguage, timeZone?: string) => dateFormatter(language, 'date', timeZone).format(timestamp);
export const sessionTime = (timestamp: number, language: AppLanguage, timeZone?: string) => dateFormatter(language, 'time', timeZone).format(timestamp);

export function sessionText(session: Session, language: AppLanguage = 'ro', timeZone?: string): string {
  const m = getMessages(language);
  return [
    `CRONO · ${sessionDate(session.savedAt, language, timeZone)} ${sessionTime(session.savedAt, language, timeZone)}`,
    m.shareTotal(formatTime(session.durationMs)),
    ...session.laps.map((lap) => m.shareLap(lap.number, formatTime(lap.splitMs), formatTime(lap.elapsedMs))),
  ].join('\n');
}
