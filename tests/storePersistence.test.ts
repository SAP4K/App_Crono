import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPersistenceWriter } from '../src/hooks/persistenceWriter.ts';

function fixture() {
  const encoded: { version: number }[] = [], writes: string[] = [], timers = new Map<number, () => void>();
  let id = 0, failures = 0, allowed = true;
  let write: (text: string) => Promise<void> = async () => {};
  const writer = createPersistenceWriter({ serialize: (value: { version: number }) => { encoded.push(value); return JSON.stringify(value); },
    write: async (text) => { writes.push(text); await write(text); }, canPersist: () => allowed, failed: () => { failures++; },
    schedule: (callback) => { timers.set(++id, callback); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (handle) => { timers.delete(handle as unknown as number); } });
  return { writer, encoded, writes, timers, failures: () => failures, allow: (value: boolean) => { allowed = value; },
    write: (next: typeof write) => { write = next; } };
}

test('accepted bursts do not encode inline and persist only the latest pending snapshot', async () => {
  const f = fixture();
  f.writer.request({ version: 1 }); f.writer.request({ version: 2 }); f.writer.request({ version: 3 });
  assert.equal(f.encoded.length, 0); assert.equal(f.timers.size, 1);
  await f.writer.flush(); assert.deepEqual(f.encoded, [{ version: 3 }]);
  assert.deepEqual(f.writes, ['{"version":3}']); assert.equal(f.timers.size, 0);
});

test('a pending background flush waits behind the active write and coalesces obsolete pending versions', async () => {
  const f = fixture(); let release!: () => void;
  f.write(() => new Promise<void>((resolve) => { release = resolve; }));
  f.writer.request({ version: 1 }); const first = f.writer.flush();
  await Promise.resolve();
  f.writer.request({ version: 2 }); f.writer.request({ version: 3 }); const flush = f.writer.flush();
  assert.equal(f.writes.length, 1); assert.deepEqual(f.encoded, [{ version: 1 }]);
  f.write(async () => {}); release(); await first; await flush;
  assert.deepEqual(f.writes, ['{"version":1}', '{"version":3}']);
});

test('hydrated unchanged snapshots and repeated lifecycle flushes do not rewrite saved data', async () => {
  const f = fixture(), value = { version: 1 }; f.writer.baseline(value);
  f.writer.request(value); await f.writer.flush(); f.writer.request(value); await f.writer.flush();
  assert.deepEqual(f.writes, []); assert.deepEqual(f.encoded, []);
});

test('loading or failed hydration cannot queue or flush an unread initial snapshot', async () => {
  const f = fixture(); f.allow(false); f.writer.request({ version: 1 }); await f.writer.flush();
  assert.deepEqual(f.encoded, []); assert.deepEqual(f.writes, []);
  f.allow(true); f.writer.request({ version: 2 }); f.allow(false); await f.writer.flush();
  assert.deepEqual(f.writes, []); f.allow(true); f.writer.request({ version: 3 }); await f.writer.flush();
  assert.deepEqual(f.writes, ['{"version":3}']);
});

test('failed storage remains retryable with the exact latest snapshot', async () => {
  const f = fixture(), value = { version: 1 }; f.write(async () => { throw new Error('disk'); });
  f.writer.request(value); await f.writer.flush(); assert.equal(f.failures(), 1);
  f.write(async () => {}); f.writer.request(value); await f.writer.flush();
  assert.equal(f.writes.length, 2); assert.equal(f.failures(), 1);
  f.writer.request(value); await f.writer.flush(); assert.equal(f.writes.length, 2);
});

test('disposal drains accepted work but rejects new requests and stale scheduled callbacks', async () => {
  const f = fixture(); f.writer.request({ version: 1 }); const obsolete = [...f.timers.values()][0];
  await f.writer.dispose(); f.writer.request({ version: 2 }); obsolete?.(); await f.writer.flush();
  assert.deepEqual(f.writes, ['{"version":1}']);
  f.writer.activate(); f.writer.request({ version: 3 }); await f.writer.flush();
  assert.deepEqual(f.writes, ['{"version":1}', '{"version":3}']);
});

for (const outcome of ['loaded', 'failed']) test(`real hook accepts synchronously while ${outcome} hydration governs deferred storage`, () => {
  const script = `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    import { existsSync } from 'node:fs';
    globalThis.effects=[]; globalThis.writes=[];
    const mocks={
      react:'export const useCallback=f=>f; export const useMemo=f=>f(); export const useRef=v=>({current:v}); export const useState=v=>[typeof v==="function"?v():v,()=>{}]; export const useEffect=f=>globalThis.effects.push(f);',
      'react-native':'export const Platform={OS:"android"}; export const AppState={addEventListener:()=>({remove(){}})};',
      '@react-native-async-storage/async-storage':'export default {getItem:async()=>{${outcome === 'failed' ? 'throw Error("read")' : 'return null'}},setItem:async(k,v)=>{globalThis.writes.push(v)}}',
    };
    registerHooks({resolve(s,c,next){
      if(mocks[s]) return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
      if(s.startsWith('.')&&c.parentURL?.startsWith('file:')) for(const ext of ['.ts','/index.ts']) {
        const url=new URL(s+ext,c.parentURL);if(existsSync(url))return next(url.href,c);
      }
      return next(s,c);
    }});
    const {useStopwatch}=await import(${JSON.stringify(new URL('../src/hooks/useStopwatch.ts', import.meta.url).href)});
    const store=useStopwatch();const cleanup=globalThis.effects.map(f=>f());
    await new Promise(r=>setTimeout(r,0));let observed;
    store.subscribeUpdates(()=>{observed=store.getSnapshot()});
    const result=store.update(previous=>({...previous,preferences:{...previous.preferences,language:'en'}}));
    assert.equal(result.changed,true);assert.equal(observed,result.data);assert.equal(store.getSnapshot(),result.data);
    assert.equal(globalThis.writes.length,0);
    await new Promise(r=>setTimeout(r,60));
    assert.equal(globalThis.writes.length,${outcome === 'loaded' ? 1 : 0});
    ${outcome === 'loaded' ? "assert.equal(JSON.parse(globalThis.writes[0]).preferences.language,'en');" : ''}
    for(const f of cleanup)f?.();
  `;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
