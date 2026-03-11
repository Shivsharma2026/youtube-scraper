const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export class YouTubeClient {
  constructor({ apiKey, fetchImpl = fetch }) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async getChannel(channelId) {
    const payload = await this.#getJson('/channels', {
      part: 'contentDetails,snippet',
      id: channelId
    });

    if (!payload.items?.length) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const channel = payload.items[0];
    return {
      channelId: channel.id,
      title: channel.snippet.title,
      uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads
    };
  }

  async getLatestVideos(uploadsPlaylistId, limit = 1) {
    const payload = await this.#getJson('/playlistItems', {
      part: 'contentDetails,snippet',
      playlistId: uploadsPlaylistId,
      maxResults: String(limit)
    });

    return (payload.items || []).map((item) => ({
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
      channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle
    }));
  }

  async getVideo(videoId) {
    const payload = await this.#getJson('/videos', {
      part: 'snippet',
      id: videoId
    });

    if (!payload.items?.length) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = payload.items[0];
    return {
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle
    };
  }

  async #getJson(pathname, params) {
    const url = new URL(`${API_BASE_URL}${pathname}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('key', this.apiKey);

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new Error(`YouTube API request failed (${response.status} ${response.statusText})`);
    }

    return response.json();
  }
}
