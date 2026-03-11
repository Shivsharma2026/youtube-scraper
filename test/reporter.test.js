import test from 'node:test';
import assert from 'node:assert/strict';

import { formatReport } from '../src/reporter.js';

test('formatReport renders text output', () => {
  const text = formatReport({
    hasErrors: false,
    results: [
      {
        channelId: 'channel-1',
        channelTitle: 'Channel One',
        videoId: 'video-1',
        status: 'ok',
        artifactPath: '/tmp/video.json',
        socialDraftPath: '/tmp/video.social.txt',
        transcriptTextPath: '/tmp/video.transcript.txt',
        summaryTextPath: '/tmp/video.summary.txt'
      },
      {
        channelId: 'channel-2',
        channelTitle: 'Channel Two',
        status: 'already_processed'
      }
    ]
  });

  assert.equal(
    text,
    '[ok] Channel One video-1 /tmp/video.json /tmp/video.social.txt /tmp/video.transcript.txt /tmp/video.summary.txt\n' +
      '[skip] Channel Two: latest videos already processed\n'
  );
});

test('formatReport renders JSON output', () => {
  const report = {
    hasErrors: true,
    results: [{ channelId: 'channel-1', status: 'error', error: 'boom' }]
  };

  assert.equal(formatReport(report, 'json'), `${JSON.stringify(report, null, 2)}\n`);
});
