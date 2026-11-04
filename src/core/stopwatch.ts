export type Lap = { number: number; elapsedMs: number; splitMs: number };

export type Stopwatch = {
  accumulatedMs: number;
  startedAt: number | null;
  laps: Lap[];
};

export type Session = {
  id: string;
  savedAt: number;
  durationMs: number;
  laps: Lap[];
};

export type Preferences = { haptics: boolean; keepAwake: boolean };
export type AppData = {
  version: 1;
  stopwatch: Stopwatch;
  sessions: Session[];
  preferences: Preferences;
};

export const MAX_SESSIONS = 50;
export const MAX_LAPS = 1000;
export const emptyStopwatch = (): Stopwatch => ({ accumulatedMs: 0, startedAt: null, laps: [] });
export const initialData = (): AppData => ({
  version: 1,
  stopwatch: emptyStopwatch(),
  sessions: [],
  preferences: { haptics: true, keepAwake: true },
});

// Store a timestamp, not interval ticks. Time spent outside the app still counts.
export function elapsed(state: Stopwatch, now = Date.now()): number {
  return state.accumulatedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}

export function start(state: Stopwatch, now = Date.now()): Stopwatch {
  return state.startedAt !== null ? state : { ...state, startedAt: now };
}

export function pause(state: Stopwatch, now = Date.now()): Stopwatch {
  return state.startedAt === null ? state : { ...state, accumulatedMs: elapsed(state, now), startedAt: null };
}

export function recordLap(state: Stopwatch, now = Date.now()): Stopwatch {
  if (state.startedAt === null || state.laps.length >= MAX_LAPS) return state;
  const total = elapsed(state, now);
  const previous = state.laps.at(-1)?.elapsedMs ?? 0;
  if (total <= previous) return state;
  return {
    ...state,
    laps: [...state.laps, { number: state.laps.length + 1, elapsedMs: total, splitMs: total - previous }],
  };
}

export function saveSession(data: AppData, now = Date.now()): AppData {
  if (data.stopwatch.startedAt !== null || data.stopwatch.accumulatedMs <= 0) return data;
  const session: Session = {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    savedAt: now,
    durationMs: data.stopwatch.accumulatedMs,
    laps: [...data.stopwatch.laps],
  };
  return { ...data, stopwatch: emptyStopwatch(), sessions: [session, ...data.sessions].slice(0, MAX_SESSIONS) };
}

export function formatTime(milliseconds: number): string {
  const centiseconds = Math.floor(Math.max(0, milliseconds) / 10);
  const cs = String(centiseconds % 100).padStart(2, '0');
  const seconds = String(Math.floor(centiseconds / 100) % 60).padStart(2, '0');
  const minutes = Math.floor(centiseconds / 6000);
  if (minutes < 60) return `${String(minutes).padStart(2, '0')}:${seconds}.${cs}`;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${seconds}.${cs}`;
}

export function lapStats(laps: Lap[]) {
  if (laps.length === 0) return null;
  const splits = laps.map((lap) => lap.splitMs);
  return {
    best: Math.min(...splits),
    slowest: Math.max(...splits),
    average: splits.reduce((sum, value) => sum + value, 0) / splits.length,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function validLaps(value: unknown, duration: number): value is Lap[] {
  if (!Array.isArray(value) || value.length > MAX_LAPS) return false;
  let previous = 0;
  return value.every((lap, index) => {
    if (!isRecord(lap) || lap.number !== index + 1 || !isTime(lap.elapsedMs) || !isTime(lap.splitMs)) return false;
    const valid = lap.splitMs > 0 && lap.elapsedMs <= duration && lap.elapsedMs - previous === lap.splitMs;
    previous = lap.elapsedMs;
    return valid;
  });
}

// Validate persisted data before using it; malformed or old data must never break startup.
export function restoreData(raw: string | null, now = Date.now()): AppData {
  const fallback = initialData();
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return fallback;
    const saved = value.stopwatch;
    if (isRecord(saved) && isTime(saved.accumulatedMs) && (saved.startedAt === null || isTime(saved.startedAt))) {
      const candidate = { accumulatedMs: saved.accumulatedMs, startedAt: saved.startedAt, laps: [] };
      if (validLaps(saved.laps, elapsed(candidate, now))) {
        fallback.stopwatch = { ...candidate, laps: saved.laps };
      }
    }
    if (isRecord(value.preferences)) {
      if (typeof value.preferences.haptics === 'boolean') fallback.preferences.haptics = value.preferences.haptics;
      if (typeof value.preferences.keepAwake === 'boolean') fallback.preferences.keepAwake = value.preferences.keepAwake;
    }
    if (Array.isArray(value.sessions)) {
      fallback.sessions = value.sessions.filter((session): session is Session =>
        isRecord(session) && typeof session.id === 'string' && session.id.length < 100 &&
        isTime(session.savedAt) && isTime(session.durationMs) && session.durationMs > 0 &&
        validLaps(session.laps, session.durationMs),
      ).slice(0, MAX_SESSIONS);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function sessionText(session: Session): string {
  const date = new Date(session.savedAt).toLocaleString('ro-RO');
  return [
    `CRONO · ${date}`,
    `Timp total: ${formatTime(session.durationMs)}`,
    ...session.laps.map((lap) => `Tura ${lap.number}: ${formatTime(lap.splitMs)} · Total ${formatTime(lap.elapsedMs)}`),
  ].join('\n');
}
