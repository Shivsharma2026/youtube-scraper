export function formatReport(report, output = 'text') {
  if (output === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const lines = [];

  for (const result of report.results) {
    if (result.status === 'error') {
      lines.push(`[error] ${result.channelId}: ${result.error}`);
      continue;
    }

    if (result.status === 'already_processed') {
      lines.push(`[skip] ${result.channelTitle || result.channelId}: latest videos already processed`);
      continue;
    }

    if (result.status === 'no_videos') {
      lines.push(`[skip] ${result.channelId}: no uploaded videos found`);
      continue;
    }

    lines.push(
      `[${result.status}] ${result.channelTitle || result.channelId} ${result.videoId ?? ''} ${result.artifactPath ?? ''} ${result.socialDraftPath ?? ''} ${result.transcriptTextPath ?? ''} ${result.summaryTextPath ?? ''}`.trim()
    );
  }

  return `${lines.join('\n')}\n`;
}
