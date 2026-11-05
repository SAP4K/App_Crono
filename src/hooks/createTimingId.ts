let counter = 0;

export function createTimingId(): string {
  return `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 9)}`;
}
