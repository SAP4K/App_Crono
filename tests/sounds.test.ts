import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ALERT_DURATIONS, SOUND_CHOICES, restoreAlertDuration, restoreSoundId } from '../src/core/sounds.ts';
import { notificationChannelId, notificationSounds } from '../src/audio/notificationSounds.ts';

test('sound selections and durations restore independently with safe defaults', () => {
  assert.deepEqual(ALERT_DURATIONS, [5, 15, 30, 60]);
  assert.equal(new Set(SOUND_CHOICES.map((sound) => sound.id)).size, 4);
  for (const sound of SOUND_CHOICES) for (const duration of ALERT_DURATIONS) {
    assert.equal(restoreSoundId(sound.id), sound.id);
    assert.equal(restoreAlertDuration(duration), duration);
  }
  for (const value of [undefined, null, {}, '', 'CLASSIC', 5, false]) assert.equal(restoreSoundId(value), 'classic');
  for (const value of [undefined, null, {}, '15', 0, 1, 10, Infinity]) assert.equal(restoreAlertDuration(value), 60);
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
  assert.deepEqual(plugin[1].sounds.slice().sort(), Object.values(notificationSounds).map((name) => `./assets/audio/notifications/${name}`).sort());
  assert.deepEqual(notificationSounds, { classic: 'notification_classic.wav', bell: 'bell.wav', digital: 'digital.wav', gong: 'gong.wav' });
  for (const sound of [...SOUND_CHOICES.map(({ id }) => id), 'silent'] as const) {
    assert.equal(notificationChannelId(sound), `crono.alerts.${sound}.v1`);
  }
  for (const name of Object.values(notificationSounds)) {
    assert.match(name, /^[a-z][a-z0-9_]*\.wav$/);
    const bytes = readFileSync(new URL(`../assets/audio/notifications/${name}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
    assert.equal(bytes.readUInt16LE(20), 1);
    assert.equal(bytes.readUInt16LE(22), 1);
    assert.equal(bytes.readUInt32LE(24), 22050);
    assert.equal(bytes.readUInt16LE(34), 16);
    assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
    assert.equal((bytes.length - 44) / bytes.readUInt32LE(28), 15);
    // Every three-second window contains real audio, including the end;
    // appending silence to a short motif would not satisfy the duration contract.
    const windowBytes = bytes.readUInt32LE(28) * 3;
    for (let start = 44; start < bytes.length; start += windowBytes) {
      let energy = 0; let peak = 0;
      for (let index = start; index < start + windowBytes; index += 2) {
        const sample = bytes.readInt16LE(index);
        energy += sample * sample; peak = Math.max(peak, Math.abs(sample));
      }
      assert.ok(Math.sqrt(energy / (windowBytes / 2)) > 500, `${name}: silent window`);
      assert.ok(peak > 1000 && peak < 32767, `${name}: clipped or silent PCM`);
    }
    assert.equal(bytes.readInt16LE(44), 0);
    assert.equal(bytes.readInt16LE(bytes.length - 2), 0);
  }
  assert.deepEqual(readFileSync(new URL('../assets/audio/notification_classic.wav', import.meta.url)),
    readFileSync(new URL('../assets/audio/timer-complete.wav', import.meta.url)));
  assert.equal(plugin[1].enableBackgroundRemoteNotifications, false);
  assert.ok(config.expo.android.permissions.includes('android.permission.SCHEDULE_EXACT_ALARM'));
});
