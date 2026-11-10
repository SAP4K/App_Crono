import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialData, type AppData } from '../src/core/stopwatch.ts';
import { serializeBackup } from '../src/core/backup.ts';
import { createBackupTransfer } from '../src/hooks/backupTransfer.ts';
import type { BackupFiles } from '../src/hooks/backupFiles.types.ts';
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function fixture() {
  const pending = deferred<string | null>(); let cancels = 0, writes = 0, serial = 0, picks = 0, saves = 0;
  let data = initialData(), hydration: 'loaded' | 'failed' = 'loaded'; const warnings: string[] = [];
  const source = initialData(); source.preferences.theme = 'dark'; source.planning.schedules = [{ id: 'source', name: 'Keep', steps: [{ id: 'step', name: 'Work', durationMs: 1000 }] }];
  const files: BackupFiles = { pick: () => { picks++; return { result: pending.promise, cancel: () => { cancels++; } }; }, save: () => { saves++; return { result: Promise.resolve(), cancel: () => { cancels++; } }; } };
  const owner = createBackupTransfer({ files, getSnapshot: () => data, getHydrationStatus: () => hydration,
    update: (change) => { const next = change(data); const changed = next !== data; if (changed) writes++; data = next; return { changed, data }; },
    now: () => 100, createId: () => `fresh-${++serial}`, changed: () => undefined, warn: (code) => warnings.push(code) });
  return { owner, pending, raw: serializeBackup(source, 1), get data() { return data; }, set data(value: AppData) { data = value; },
    setHydration: (value: typeof hydration) => { hydration = value; }, counts: () => ({ cancels, writes, picks, saves }), warnings };
}

test('read cancellation/disposal fences late files and suppresses stale errors', async () => {
  for (const mode of ['cancel', 'dispose'] as const) {
    const f = fixture(); const read = f.owner.read(); assert.equal(f.owner.getState().status, 'reading');
    f.owner[mode](); f.pending.resolve(f.raw); await read;
    assert.equal(f.owner.getState().status, 'idle'); assert.equal(f.counts().writes, 0); assert.equal(f.counts().cancels, 1);
  }
  const f = fixture(); const read = f.owner.read(); f.owner.dispose(); f.pending.reject(new Error('late')); await read;
  assert.deepEqual(f.warnings, []);
});

test('one transfer at a time, file cancellation and failures never write data', async () => {
  const f = fixture(); const read = f.owner.read(); await f.owner.export(); await f.owner.read();
  assert.equal(f.counts().picks, 1); assert.equal(f.counts().saves, 0);
  f.pending.resolve(null); await read; assert.equal(f.owner.getState().status, 'idle'); assert.equal(f.counts().writes, 0);
  const bad = fixture(); const failed = bad.owner.read(); bad.pending.reject(new Error('private path never logged')); await failed;
  assert.equal(bad.owner.getState().error, 'file'); assert.deepEqual(bad.warnings, ['file-operation']); assert.equal(bad.counts().writes, 0);
});

test('a retained but inactive transfer cannot act, and reactivation rejects the previous file', async () => {
  const f = fixture(); const oldRead = f.owner.read();
  f.owner.dispose();
  await f.owner.read(); await f.owner.export(); assert.equal(f.owner.confirm(true), false);
  assert.deepEqual(f.counts(), { cancels: 1, writes: 0, picks: 1, saves: 0 });
  f.owner.activate();
  f.pending.resolve(f.raw); await oldRead;
  assert.equal(f.owner.getState().status, 'idle'); assert.equal(f.owner.confirm(true), false);
  assert.equal(f.counts().writes, 0);
  await f.owner.read(); assert.equal(f.owner.getState().status, 'preview');
  assert.equal(f.owner.confirm(), true); assert.equal(f.counts().writes, 1);
});

test('loaded hydration is required before export/read and again after picking', async () => {
  const f = fixture(); f.setHydration('failed'); await f.owner.read(); await f.owner.export();
  assert.deepEqual(f.counts(), { cancels: 0, writes: 0, picks: 0, saves: 0 }); assert.equal(f.owner.getState().error, 'notReady');
  f.setHydration('loaded'); const read = f.owner.read(); f.setHydration('failed'); f.pending.resolve(f.raw); await read;
  assert.equal(f.owner.getState().error, 'notReady'); assert.equal(f.owner.confirm(), false);
});

test('preview requires confirmation and merges once into latest live timing without applying preferences by default', async () => {
  const f = fixture(); const read = f.owner.read(); f.pending.resolve(f.raw); await read;
  assert.equal(f.counts().writes, 0); assert.deepEqual(f.owner.getState().preview, { schedules: 1, sessions: 0 });
  const live = { ...f.data, stopwatch: { accumulatedMs: 4000, startedAt: 10, laps: [] },
    timer: { ...f.data.timer, status: 'paused' as const, remainingMs: 1200, runId: 'live' } };
  f.data = live; assert.equal(f.owner.confirm(), true);
  assert.equal(f.data.stopwatch, live.stopwatch); assert.equal(f.data.timer, live.timer); assert.equal(f.data.planning.run, live.planning.run);
  assert.equal(f.data.preferences, live.preferences); assert.equal(f.data.preferences.theme, 'system');
  assert.equal(f.counts().writes, 1); assert.equal(f.owner.confirm(), false);
  const again = f.owner.read(); await again; assert.equal(f.owner.confirm(true), true);
  assert.equal(f.data.preferences.theme, 'dark'); assert.equal(f.data.planning.schedules.length, 2);
  assert.notEqual(f.data.planning.schedules[0].id, f.data.planning.schedules[1].id);
});

test('latest capacity changes reject the entire import and retain a cancellable preview', async () => {
  const f = fixture(); const read = f.owner.read(); f.pending.resolve(f.raw); await read;
  f.data.planning.schedules = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, name: 'Full', steps: [{ id: `a${i}`, name: 'Step', durationMs: 1000 }] }));
  const latest = f.data; assert.equal(f.owner.confirm(), false);
  assert.equal(f.owner.getState().status, 'preview'); assert.equal(f.owner.getState().error, 'capacity');
  assert.equal(f.data, latest); assert.equal(f.counts().writes, 0); f.owner.cancel(); assert.equal(f.owner.getState().status, 'idle');
});
