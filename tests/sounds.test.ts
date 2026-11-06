import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ALERT_DURATIONS, SOUND_CHOICES, restoreAlertDuration, restoreSoundId } from '../src/core/sounds.ts';
import { notificationSounds } from '../src/audio/notificationSounds.ts';

test('sound selections and durations restore independently with safe defaults', () => {
  assert.equal(new Set(SOUND_CHOICES.map((sound) => sound.id)).size, 4);
  for (const sound of SOUND_CHOICES) for (const duration of ALERT_DURATIONS) {
    assert.equal(restoreSoundId(sound.id), sound.id);
    assert.equal(restoreAlertDuration(duration), duration);
  }
  for (const value of [undefined, null, {}, '', 'CLASSIC', 5, false]) assert.equal(restoreSoundId(value), 'classic');
  for (const value of [undefined, null, {}, '15', 0, 1, 10, Infinity]) assert.equal(restoreAlertDuration(value), 5);
});

test('all shipped sound patterns are decodable PCM with bounded non-silent samples', () => {
  for (const name of ['timer-complete', 'bell', 'digital', 'gong']) {
    const bytes = readFileSync(new URL(`../assets/audio/${name}.wav`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.equal(bytes.readUInt16LE(20), 1);
    assert.equal(bytes.readUInt16LE(22), 1);
    assert.equal(bytes.readUInt16LE(34), 16);
    const duration = (bytes.length - 44) / bytes.readUInt32LE(28);
    assert.ok(duration >= 0.5 && duration <= 4);
    let peak = 0;
    for (let index = 44; index < bytes.length; index += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(index)));
    assert.ok(peak > 1000 && peak < 32767);
  }
});

test('native notification resources cover every sound with valid bundled PCM names', () => {
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  const plugin = config.expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-notifications');
  assert.ok(plugin);
  assert.deepEqual(Object.keys(notificationSounds).sort(), SOUND_CHOICES.map(({ id }) => id).sort());
  assert.deepEqual(plugin[1].sounds.slice().sort(), Object.values(notificationSounds).map((name) => `./assets/audio/${name}`).sort());
  for (const name of Object.values(notificationSounds)) {
    assert.match(name, /^[a-z][a-z0-9_]*\.wav$/);
    const bytes = readFileSync(new URL(`../assets/audio/${name}`, import.meta.url));
    assert.equal(bytes.readUInt16LE(20), 1);
    assert.ok((bytes.length - 44) / bytes.readUInt32LE(28) < 30);
  }
  assert.deepEqual(readFileSync(new URL('../assets/audio/notification_classic.wav', import.meta.url)),
    readFileSync(new URL('../assets/audio/timer-complete.wav', import.meta.url)));
  assert.equal(plugin[1].enableBackgroundRemoteNotifications, false);
  assert.ok(config.expo.android.permissions.includes('android.permission.SCHEDULE_EXACT_ALARM'));
});
