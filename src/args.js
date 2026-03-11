export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    force: false,
    limit: 1,
    channel: null,
    video: null,
    output: 'text'
  };

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg.startsWith('--channel=')) {
      options.channel = arg.slice('--channel='.length).trim() || null;
      continue;
    }

    if (arg.startsWith('--video=')) {
      const value = arg.slice('--video='.length).trim();
      options.video = parseYouTubeVideoInput(value);
      continue;
    }

    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('`--limit` must be a positive integer.');
      }
      options.limit = value;
      continue;
    }

    if (arg === '--output=json') {
      options.output = 'json';
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function parseYouTubeVideoInput(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('A YouTube video link is required.');
  }

  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Invalid YouTube video link.');
  }

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const shortId = url.pathname.split('/').filter(Boolean)[0] || '';
    if (/^[\w-]{11}$/.test(shortId)) {
      return shortId;
    }
  }

  if (!host.endsWith('youtube.com')) {
    throw new Error('Invalid YouTube video link.');
  }

  const watchId = url.searchParams.get('v');
  if (/^[\w-]{11}$/.test(watchId || '')) {
    return watchId;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
  const candidateId = pathSegments[1] || '';
  if (
    ['shorts', 'embed', 'live'].includes(pathSegments[0]) &&
    /^[\w-]{11}$/.test(candidateId)
  ) {
    return candidateId;
  }

  throw new Error('Invalid YouTube video link.');
}
