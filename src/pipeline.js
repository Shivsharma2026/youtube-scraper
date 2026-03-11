import { fetchTranscript } from './transcript.js';

export async function runPipeline({
  channelIds = [],
  videoIds = [],
  limit,
  force,
  youtubeClient,
  summarizer,
  store,
  transcriptFetcher = fetchTranscript,
  now = new Date()
}) {
  await store.ensureReady();
  const processedVideoIds = await store.loadProcessedVideoIds();
  const results = [];

  for (const channelId of channelIds) {
    try {
      const channel = await youtubeClient.getChannel(channelId);
      const videos = await youtubeClient.getLatestVideos(channel.uploadsPlaylistId, limit);

      if (!videos.length) {
        results.push({
          channelId,
          status: 'no_videos'
        });
        continue;
      }

      const candidate = pickLatestUnprocessedVideo(videos, processedVideoIds, force);
      if (!candidate) {
        results.push({
          channelId,
          channelTitle: channel.title,
          status: 'already_processed'
        });
        continue;
      }

      const result = await processVideoCandidate({
        candidate,
        channelId,
        channelTitle: channel.title,
        processedVideoIds,
        transcriptFetcher,
        summarizer,
        store,
        now
      });
      results.push(result);
    } catch (error) {
      results.push({
        channelId,
        status: 'error',
        error: error.message
      });
    }
  }

  for (const videoId of videoIds) {
    try {
      const candidate = await youtubeClient.getVideo(videoId);
      if (!force && processedVideoIds.has(candidate.videoId)) {
        results.push({
          channelId: candidate.channelId,
          channelTitle: candidate.channelTitle,
          videoId: candidate.videoId,
          status: 'already_processed'
        });
        continue;
      }

      const result = await processVideoCandidate({
        candidate,
        channelId: candidate.channelId,
        channelTitle: candidate.channelTitle,
        processedVideoIds,
        transcriptFetcher,
        summarizer,
        store,
        now
      });
      results.push(result);
    } catch (error) {
      results.push({
        channelId: videoId,
        status: 'error',
        error: error.message
      });
    }
  }

  return {
    results,
    hasErrors: results.some((result) => result.status === 'error')
  };
}

async function processVideoCandidate({
  candidate,
  channelId,
  channelTitle,
  processedVideoIds,
  transcriptFetcher,
  summarizer,
  store,
  now
}) {
  const transcriptResult = await transcriptFetcher(candidate.videoId);
  const artifactBase = {
    channelId,
    channelTitle,
    videoId: candidate.videoId,
    videoUrl: `https://www.youtube.com/watch?v=${candidate.videoId}`,
    title: candidate.title,
    description: candidate.description,
    publishedAt: candidate.publishedAt,
    transcriptSource: transcriptResult.source || null,
    transcriptLanguageCode: transcriptResult.languageCode,
    processedAt: now.toISOString()
  };

  if (transcriptResult.status !== 'ok') {
    const artifact = {
      ...artifactBase,
      transcript: null,
      summaryLong: null,
      summarySocial: null,
      status: 'missing_transcript'
    };

    const artifactPath = await store.writeVideoArtifact(artifact);
    await store.recordProcessedVideo(candidate.videoId, {
      channelId,
      status: artifact.status,
      artifactPath,
      processedAt: artifact.processedAt
    });
    processedVideoIds.add(candidate.videoId);
    return {
      channelId,
      channelTitle,
      videoId: candidate.videoId,
      status: artifact.status,
      artifactPath
    };
  }

  const summary = await summarizer.summarizeVideo({
    title: candidate.title,
    channelTitle,
    publishedAt: candidate.publishedAt,
    videoUrl: artifactBase.videoUrl,
    transcript: transcriptResult.transcript
  });

  const artifact = {
    ...artifactBase,
    transcript: transcriptResult.transcript,
    summaryLong: summary.summaryLong,
    summarySocial: summary.summarySocial,
    status: 'ok'
  };

  const artifactPath = await store.writeVideoArtifact(artifact);
  const socialDraftPath = await store.writeSocialDraft(artifact);
  const transcriptTextPath = await store.writeTranscriptText(artifact);
  const summaryTextPath = await store.writeLongSummaryText(artifact);
  await store.recordProcessedVideo(candidate.videoId, {
    channelId,
    status: artifact.status,
    artifactPath,
    socialDraftPath,
    transcriptTextPath,
    summaryTextPath,
    processedAt: artifact.processedAt
  });
  processedVideoIds.add(candidate.videoId);

  return {
    channelId,
    channelTitle,
    videoId: candidate.videoId,
    status: artifact.status,
    artifactPath,
    socialDraftPath,
    transcriptTextPath,
    summaryTextPath
  };
}

export function pickLatestUnprocessedVideo(videos, processedVideoIds, force) {
  if (force) {
    return videos[0] || null;
  }

  return videos.find((video) => !processedVideoIds.has(video.videoId)) || null;
}
