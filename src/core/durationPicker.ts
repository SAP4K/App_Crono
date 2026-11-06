import { validDuration } from './timer.ts';

export const DURATION_UNITS = ['hours', 'minutes', 'seconds'] as const;
export type DurationUnit = typeof DURATION_UNITS[number];
export type DurationParts = Record<DurationUnit, number>;
export const DURATION_LIMITS: DurationParts = { hours: 23, minutes: 59, seconds: 59 };

export function durationParts(milliseconds: number): DurationParts {
  if (!validDuration(milliseconds)) return { hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = milliseconds / 1000;
  return { hours: Math.floor(totalSeconds / 3600), minutes: Math.floor(totalSeconds / 60) % 60, seconds: totalSeconds % 60 };
}

export function durationMilliseconds(parts: DurationParts): number | null {
  if (DURATION_UNITS.some((unit) => !Number.isInteger(parts[unit]) || parts[unit] < 0 || parts[unit] > DURATION_LIMITS[unit])) return null;
  const milliseconds = (parts.hours * 3600 + parts.minutes * 60 + parts.seconds) * 1000;
  return validDuration(milliseconds) ? milliseconds : null;
}

export function wheelIndex(offset: number, rowHeight: number, maximum: number): number {
  if (!Number.isFinite(offset) || !Number.isFinite(rowHeight) || rowHeight <= 0 || !Number.isInteger(maximum) || maximum < 0) return 0;
  return Math.max(0, Math.min(maximum, Math.round(offset / rowHeight)));
}
