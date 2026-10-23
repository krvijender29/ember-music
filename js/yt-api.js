/**
 * AuraWave Music - YouTube Data API v3 Service
 * Handles live song search, trending music charts, video metadata fetching, and key verification
 */

const YouTubeAPI = {
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
  DEFAULT_KEY: 'AIzaSyDUnACXuxfMyOy3OrCgRSgm3eTmsEFY9xw',

  getApiKey() {
    return (typeof StorageManager !== 'undefined' && StorageManager.getApiKey()) || this.DEFAULT_KEY;
  },

  hasKey() {
    return Boolean(this.getApiKey());
  },

  async search(query, maxResults = 24) {
    return this.searchMusic(query, maxResults);
  },

  /**
   * Parse ISO 8601 duration (e.g. PT4M13S, PT1H2M30S) into seconds and mm:ss format
   */
  parseDuration(isoDuration) {
    if (!isoDuration) return { durationText: '--:--', seconds: 0 };
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);
    if (!matches) return { durationText: '--:--', seconds: 0 };

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    let durationText = '';
    if (hours > 0) {
      durationText = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return { durationText, seconds: totalSeconds };
  },

  /**
   * Format view counts into readable string (e.g. 2.4M views)
   */
  formatViewCount(views) {
    const num = parseInt(views, 10);
    if (isNaN(num)) return '';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  },

  /**
   * Clean titles to remove clutter like [Official Music Video], (Audio), etc.
   */
  cleanTitle(rawTitle) {
    if (!rawTitle) return '';
    // Decode HTML entities
    const doc = new DOMParser().parseFromString(rawTitle, 'text/html');
    let title = doc.body.textContent || '';
    return title
      .replace(/\[(Official\s*Music\s*Video|Official\s*Audio|Official\s*Video|HD|4K|Lyrics)\]/gi, '')
      .replace(/\((Official\s*Music\s*Video|Official\s*Audio|Official\s*Video|HD|4K|Lyrics)\)/gi, '')
      .trim();
  },

  /**
   * Validate an API key by making a lightweight query
   */
  async testApiKey(apiKey) {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: 'API key cannot be empty' };
    }

    try {
      const url = `${this.BASE_URL}/videos?part=snippet&chart=mostPopular&videoCategoryId=10&maxResults=1&key=${apiKey.trim()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data?.error?.message || 'Invalid API Key or YouTube Data API v3 not enabled';
        return { success: false, message: errorMsg, code: res.status };
      }

      return { success: true, message: 'Valid API Key! YouTube Data API connected successfully.' };
    } catch (err) {
      return { success: false, message: 'Network error or connection blocked: ' + err.message };
    }
  },

  /**
   * Search YouTube for songs, artists, or keywords
   */
  async searchMusic(query, maxResults = 24) {
    const apiKey = this.getApiKey();

    // Fallback search if no API key is provided
    if (!apiKey) {
      console.warn('No YouTube API Key set. Searching default curated catalog.');
      return this.fallbackSearch(query);
    }

    try {
      // 1. Search for video IDs with embeddability flags
      let searchUrl = `${this.BASE_URL}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;
      let searchRes = await fetch(searchUrl);
      let searchData = await searchRes.json();

      // If category 10 yielded 0 items, broaden search without category filter
      if (searchRes.ok && (!searchData.items || searchData.items.length === 0)) {
        searchUrl = `${this.BASE_URL}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;
        searchRes = await fetch(searchUrl);
        searchData = await searchRes.json();
      }

      if (!searchRes.ok) {
        throw new Error(searchData?.error?.message || 'YouTube search API error');
      }

      const items = searchData.items || [];
      if (items.length === 0) {
        return this.fallbackSearch(query);
      }

      const videoIds = items.map(item => item.id?.videoId).filter(Boolean);

      // 2. Fetch video details (duration, view counts, embeddable status)
      const detailsMap = await this.getVideoDetails(videoIds, apiKey);

      const tracks = items.map(item => {
        const vidId = item.id?.videoId;
        if (!vidId) return null;
        const details = detailsMap[vidId] || {};
        const title = this.cleanTitle(item.snippet.title);
        const channel = item.snippet.channelTitle || 'Artist';

        return {
          id: vidId,
          title: title,
          artist: channel,
          channelTitle: channel,
          duration: details.duration || '03:30',
          durationSec: details.durationSec || 210,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          viewCount: details.viewCount ? this.formatViewCount(details.viewCount) : '',
          category: 'youtube',
          description: item.snippet.description || '',
          embeddable: details.embeddable !== false
        };
      }).filter(Boolean).filter(track => track.embeddable !== false);

      return tracks.length > 0 ? tracks : this.fallbackSearch(query);
    } catch (err) {
      console.error('YouTube search failed, falling back to local library:', err);
      return this.fallbackSearch(query);
    }
  },

  /**
   * Get detailed metadata for video IDs (duration, stats, embed status)
   */
  async getVideoDetails(videoIds, apiKey) {
    if (!videoIds || videoIds.length === 0) return {};
    try {
      const url = `${this.BASE_URL}/videos?part=contentDetails,statistics,snippet,status&id=${videoIds.join(',')}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) return {};

      const map = {};
      (data.items || []).forEach(v => {
        const parsed = this.parseDuration(v.contentDetails?.duration);
        map[v.id] = {
          duration: parsed.durationText,
          durationSec: parsed.seconds,
          viewCount: v.statistics?.viewCount,
          embeddable: v.status?.embeddable !== false
        };
      });
      return map;
    } catch (e) {
      return {};
    }
  },

  /**
   * Fetch Trending Music from YouTube (filtering only embeddable tracks)
   */
  async getTrendingMusic(maxResults = 20) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return DEFAULT_TRACKS;
    }

    try {
      const url = `${this.BASE_URL}/videos?part=snippet,contentDetails,statistics,status&chart=mostPopular&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Error fetching trending music');
      }

      return (data.items || [])
        .filter(item => item.status?.embeddable !== false)
        .map(item => {
          const parsed = this.parseDuration(item.contentDetails?.duration);
          const title = this.cleanTitle(item.snippet.title);
          const channel = item.snippet.channelTitle;

          return {
            id: item.id,
            title: title,
            artist: channel,
            channelTitle: channel,
            duration: parsed.durationText,
            durationSec: parsed.seconds,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            viewCount: this.formatViewCount(item.statistics?.viewCount),
            category: 'trending'
          };
        });
    } catch (err) {
      console.warn('Failed to fetch YouTube trending music, using curated tracks:', err);
      return DEFAULT_TRACKS;
    }
  },

  /**
   * Automatically resolve an alternative embeddable stream for copyright-restricted tracks
   */
  async findEmbeddableAlternative(title, artist, failedId) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const cleanSongTitle = this.cleanTitle(title);
      const query = `${artist || ''} ${cleanSongTitle} audio lyrics topic`;
      const url = `${this.BASE_URL}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoCategoryId=10&maxResults=6&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      const items = (data.items || []).filter(item => item.id?.videoId && item.id.videoId !== failedId);
      if (items.length === 0) return null;

      const altItem = items[0];
      const vidId = altItem.id.videoId;

      return {
        id: vidId,
        title: cleanSongTitle,
        artist: artist || altItem.snippet.channelTitle,
        channelTitle: altItem.snippet.channelTitle,
        thumbnail: altItem.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
        duration: '03:30',
        durationSec: 210,
        category: 'alternative'
      };
    } catch (e) {
      console.warn('Failed to find alternative stream:', e);
      return null;
    }
  },

  /**
   * Fallback search for when API key is not present or offline
   */
  fallbackSearch(query) {
    if (!query || !query.trim()) return DEFAULT_TRACKS;
    const q = query.toLowerCase().trim();
    return DEFAULT_TRACKS.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.artist.toLowerCase().includes(q) || 
      t.category.toLowerCase().includes(q)
    );
  }
};
