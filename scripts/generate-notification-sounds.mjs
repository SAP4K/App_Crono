import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const durationSeconds = 15;
const sampleRate = 22050;
const frames = durationSeconds * sampleRate;
const fadeFrames = Math.round(sampleRate * 0.02);
const audioDirectory = new URL('../assets/audio/', import.meta.url);
const outputDirectory = new URL('notifications/', audioDirectory);
const sources = {
  'notification_classic.wav': 'timer-complete.wav',
  'bell.wav': 'bell.wav',
  'digital.wav': 'digital.wav',
  'gong.wav': 'gong.wav',
};

function extendPattern(sourceName) {
  const source = readFileSync(new URL(sourceName, audioDirectory));
  // The original assets use a canonical 44-byte mono 16-bit PCM header.
  if (source.toString('ascii', 0, 4) !== 'RIFF' || source.toString('ascii', 8, 12) !== 'WAVE'
    || source.toString('ascii', 12, 16) !== 'fmt ' || source.readUInt32LE(16) !== 16
    || source.readUInt16LE(20) !== 1 || source.readUInt16LE(22) !== 1
    || source.readUInt32LE(24) !== sampleRate || source.readUInt32LE(28) !== sampleRate * 2
    || source.readUInt16LE(32) !== 2 || source.readUInt16LE(34) !== 16
    || source.toString('ascii', 36, 40) !== 'data' || source.readUInt32LE(40) !== source.length - 44
    || source.length <= 44 || (source.length - 44) % 2 !== 0) {
    throw new Error(`Unsupported source WAV format: ${sourceName}`);
  }
  const output = Buffer.alloc(44 + frames * 2);
  source.copy(output, 0, 0, 44);
  output.writeUInt32LE(output.length - 8, 4);
  output.writeUInt32LE(output.length - 44, 40);
  const sourceFrames = (source.length - 44) / 2;
  for (let frame = 0; frame < frames; frame++) {
    const sample = source.readInt16LE(44 + (frame % sourceFrames) * 2);
    // Preserve the original cadence; fade only the final partial motif to zero.
    const gain = Math.min(1, (frames - frame - 1) / (fadeFrames - 1));
    output.writeInt16LE(Math.round(sample * gain), 44 + frame * 2);
  }
  return output;
}

try {
  // Prepare all clips before writing, so an invalid input cannot partially update assets.
  const clips = Object.entries(sources).map(([name, source]) => [name, extendPattern(source)]);
  mkdirSync(outputDirectory, { recursive: true });
  for (const [name, bytes] of clips) writeFileSync(new URL(name, outputDirectory), bytes);
  console.info(`Generated ${clips.length} notification sounds (${durationSeconds} seconds each).`);
} catch (error) {
  console.error('Notification sound generation failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
