import test from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs, parseYouTubeVideoInput } from '../src/args.js';

test('parseArgs returns defaults', () => {
  assert.deepEqual(parseArgs([]), {
    force: false,
    limit: 1,
    channel: null,
    video: null,
    output: 'text'
  });
});

test('parseArgs parses supported flags', () => {
  assert.deepEqual(parseArgs(['--force', '--limit=3', '--channel=abc', '--output=json']), {
    force: true,
    limit: 3,
    channel: 'abc',
    video: null,
    output: 'json'
  });
});

test('parseArgs rejects invalid limit', () => {
  assert.throws(() => parseArgs(['--limit=0']), /positive integer/);
});

test('parseArgs parses direct video links', () => {
  assert.deepEqual(parseArgs(['--video=https://youtu.be/dQw4w9WgXcQ']), {
    force: false,
    limit: 1,
    channel: null,
    video: 'dQw4w9WgXcQ',
    output: 'text'
  });
});

test('parseYouTubeVideoInput accepts common YouTube URL formats', () => {
  assert.equal(parseYouTubeVideoInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(parseYouTubeVideoInput('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(parseYouTubeVideoInput('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('parseYouTubeVideoInput rejects invalid links', () => {
  assert.throws(() => parseYouTubeVideoInput('https://example.com/video'), /Invalid YouTube video link/);
});
