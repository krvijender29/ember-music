/**
 * EMBER - Audio & Search Service
 * Powered by resilient Piped API Engine (Unlimited & Zero Quota)
 * with automatic multi-instance failover and seamless YouTube Data API fallback.
 * 
 * Provides live search, trending music, and instant copyright-embed alternative resolution.
 */

const YouTubeAPI = {
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
  DEFAULT_KEY: 'AIzaSyDUnACXuxfMyOy3OrCgRSgm3eTmsEFY9xw',

  // Active Piped instances with automatic failover
  PIPED_INSTANCES: [
    'https://api.piped.private.coffee',
    'https://pipedapi.ducks.party',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.kavin.rocks'
  ],

  currentInstanceIndex: 0,

  getEngine() {
    return (typeof StorageManager !== 'undefined' && StorageManager.getStreamingEngine()) || 'piped';
  },

  getPipedBaseUrl() {
    const custom = typeof StorageManager !== 'undefined' && StorageManager.getPipedInstance();
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
    return this.PIPED_INSTANCES[this.currentInstanceIndex % this.PIPED_INSTANCES.length];
  },

  rotatePipedInstance() {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.PIPED_INSTANCES.length;
    console.log(`[Ember] Switched Piped instance to: ${this.getPipedBaseUrl()}`);
  },

  getApiKey() {
    return (typeof StorageManager !== 'undefined' && StorageManager.getApiKey()) || this.DEFAULT_KEY;
  },

  hasKey() {
    return Boolean(this.getApiKey());
  },

  /**
   * Main Search entry point used by App
   * Prioritizes High-Speed Direct CDN Engine (< 200ms) with seamless Piped fallback
   */
  async search(query, maxResults = 24) {
    if (!query || !query.trim()) return this.fallbackSearch('');

    // 1. High-Speed Direct CDN Engine (/api/search)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&n=${maxResults}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
          console.log(`[Ember] High-Speed CDN Engine returned ${data.results.length} tracks for "${query}"`);
          return data.results;
        }
      }
    } catch (e) {
      console.log('[Ember] Local CDN endpoint unreachable, checking external fallback...', e);
    }

    const engine = this.getEngine();
    if (engine === 'piped') {
      const pipedResults = await this.searchPiped(query, maxResults);
      if (pipedResults && pipedResults.length > 0) {
        return pipedResults;
      }
      if (this.hasKey()) {
        return this.searchYouTube(query, maxResults);
      }
      return this.fallbackSearch(query);
    } else {
      try {
        const ytResults = await this.searchYouTube(query, maxResults);
        if (ytResults && ytResults.length > 0) return ytResults;
      } catch (err) {
        console.warn('YouTube search failed/exhausted, falling back to Piped Engine:', err);
      }
      return this.searchPiped(query, maxResults);
    }
  },

  /**
   * Piped API Search: Free, Unlimited, No API Key needed
   */
  async searchPiped(query, maxResults = 24) {
    const attempts = Math.min(3, this.PIPED_INSTANCES.length);

    for (let attempt = 0; attempt < attempts; attempt++) {
      const baseUrl = this.getPipedBaseUrl();
      const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&filter=all`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Piped HTTP ${res.status}`);
        }

        const data = await res.json();
        const items = data.items || [];
        if (!items || items.length === 0) {
          return [];
        }

        const tracks = items
          .filter(item => item && item.title && item.url && item.url.includes('/watch?v='))
          .map(item => {
            const vidId = item.url.replace('/watch?v=', '').split('&')[0].trim();
            if (!vidId) return null;

            const title = this.cleanTitle(item.title);
            if (!title) return null;

            const artist = item.uploaderName || 'Artist';
            const durationSec = typeof item.duration === 'number' ? item.duration : this.parseDurationToSec(item.duration);

            return {
              id: vidId,
              title: title,
              artist: artist,
              channelTitle: artist,
              duration: this.formatSeconds(durationSec),
              durationSec: durationSec || 210,
              thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              viewCount: item.views ? this.formatViewCount(item.views) : '',
              category: 'piped',
              embeddable: true
            };
          })
          .filter(Boolean);

        return tracks.slice(0, maxResults);
      } catch (err) {
        console.warn(`Piped instance [${baseUrl}] search attempt failed:`, err.message);
        this.rotatePipedInstance();
      }
    }

    return [];
  },

  /**
   * Standard YouTube Data API v3 Search
   */
  async searchYouTube(query, maxResults = 24) {
    const apiKey = this.getApiKey();
    if (!apiKey) return this.fallbackSearch(query);

    try {
      let searchUrl = `${this.BASE_URL}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;
      let searchRes = await fetch(searchUrl);
      let searchData = await searchRes.json();

      if (searchRes.ok && (!searchData.items || searchData.items.length === 0)) {
        searchUrl = `${this.BASE_URL}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;
        searchRes = await fetch(searchUrl);
        searchData = await searchRes.json();
      }

      if (!searchRes.ok) {
        throw new Error(searchData?.error?.message || 'YouTube search error');
      }

      const items = searchData.items || [];
      if (items.length === 0) return this.fallbackSearch(query);

      const videoIds = items.map(item => item.id?.videoId).filter(Boolean);
      const detailsMap = await this.getVideoDetails(videoIds, apiKey);

      return items.map(item => {
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
          thumbnail: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          viewCount: details.viewCount ? this.formatViewCount(details.viewCount) : '',
          category: 'youtube',
          embeddable: details.embeddable !== false
        };
      }).filter(Boolean);
    } catch (err) {
      console.warn('YouTube search failed:', err);
      throw err;
    }
  },

  /**
   * Fetch Trending Music: Prioritizes High-Speed Direct CDN with Piped/YouTube fallbacks
   */
  async getTrendingMusic(maxResults = 24) {
    // 1. High-Speed Direct CDN Engine (/api/trending)
    try {
      const res = await fetch('/api/trending');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
          console.log(`[Ember] Direct CDN Engine loaded ${data.results.length} trending tracks.`);
          return data.results.slice(0, maxResults);
        }
      }
    } catch (e) {
      console.log('[Ember] Trending CDN fallback:', e);
    }

    // 2. Try Piped Trending
    const attempts = Math.min(2, this.PIPED_INSTANCES.length);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const baseUrl = this.getPipedBaseUrl();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${baseUrl}/trending?region=IN`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            return items
              .filter(item => item.url && item.url.includes('/watch?v='))
              .map(item => {
                const vidId = item.url.replace('/watch?v=', '').split('&')[0];
                const dur = typeof item.duration === 'number' ? item.duration : this.parseDurationToSec(item.duration);
                return {
                  id: vidId,
                  title: this.cleanTitle(item.title),
                  artist: item.uploaderName || 'Trending Artist',
                  channelTitle: item.uploaderName || 'Trending Artist',
                  duration: this.formatSeconds(dur),
                  durationSec: dur || 200,
                  thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                  viewCount: item.views ? this.formatViewCount(item.views) : '',
                  category: 'trending',
                  badge: 'Hot'
                };
              })
              .slice(0, maxResults);
          }
        }
      } catch (e) {
        this.rotatePipedInstance();
      }
    }

    // 3. Fallback to YouTube API if key exists
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const url = `${this.BASE_URL}/videos?part=snippet,contentDetails,statistics,status&chart=mostPopular&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.items) {
          return data.items
            .filter(item => item.status?.embeddable !== false)
            .map(item => {
              const parsed = this.parseDuration(item.contentDetails?.duration);
              return {
                id: item.id,
                title: this.cleanTitle(item.snippet.title),
                artist: item.snippet.channelTitle,
                channelTitle: item.snippet.channelTitle,
                duration: parsed.durationText,
                durationSec: parsed.seconds,
                thumbnail: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                viewCount: this.formatViewCount(item.statistics?.viewCount),
                category: 'trending'
              };
            });
        }
      } catch (err) {
        console.warn('YouTube trending fallback failed:', err);
      }
    }

    // 4. Final default
    return typeof DEFAULT_TRACKS !== 'undefined' ? DEFAULT_TRACKS : [];
  },

  /**
   * Fast Stream Resolver for individual tracks
   */
  async resolveTrackStream(track, forceRefresh = false) {
    if (!track) return null;
    if (track.audioUrl && !forceRefresh) return track.audioUrl;

    try {
      const cleanTitle = (track.title || '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
      const res = await fetch(`/api/resolve?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(track.artist || '')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.track && data.track.audioUrl) {
          track.audioUrl = data.track.audioUrl;
          if (data.track.thumbnail && !track.thumbnail) {
            track.thumbnail = data.track.thumbnail;
          }
          return track.audioUrl;
        }
      }
    } catch (e) {
      console.warn('[Ember] Track resolution error:', e);
    }

    return track.audioUrl || null;
  },

  /**
   * Automatically resolve an alternative embeddable stream for copyright-restricted tracks (Error 101/150)
   * Prioritizes Audio, Topic, and Lyric versions which allow embedding.
   */
  async findEmbeddableAlternative(title, artist, failedId) {
    if (!title) return null;

    const cleanFailedId = (failedId || '').replace('/watch?v=', '').split('&')[0].trim();

    // Check localStorage cache first
    if (typeof StorageManager !== 'undefined' && cleanFailedId) {
      const cached = StorageManager.getCachedAlternative(cleanFailedId);
      if (cached && cached.id) {
        const cachedCleanId = cached.id.replace('/watch?v=', '').split('&')[0].trim();
        if (cachedCleanId && cachedCleanId !== cleanFailedId) {
          console.log(`[Ember] Found cached alternative for "${title}":`, cachedCleanId);
          return { ...cached, id: cachedCleanId };
        }
      }
    }

    const { songTitle, terms } = this.extractSearchTerms(title, artist);

    // Try Piped search first (zero quota cost, fast)
    for (const term of terms) {
      try {
        const candidates = await this.searchPiped(term, 8);
        if (candidates && candidates.length > 0) {
          // Prefer Topic, Lyric, or Audio versions
          const sorted = [...candidates].sort((a, b) => {
            const aTitle = (a.title || '').toLowerCase();
            const bTitle = (b.title || '').toLowerCase();
            const aScore = (aTitle.includes('topic') ? 4 : 0) + (aTitle.includes('audio') ? 3 : 0) + (aTitle.includes('lyrics') ? 2 : 0);
            const bScore = (bTitle.includes('topic') ? 4 : 0) + (bTitle.includes('audio') ? 3 : 0) + (bTitle.includes('lyrics') ? 2 : 0);
            return bScore - aScore;
          });

          const match = sorted.find(t => {
            const candId = (t.id || '').replace('/watch?v=', '').split('&')[0].trim();
            return candId && candId !== cleanFailedId;
          });

          if (match) {
            const matchId = match.id.replace('/watch?v=', '').split('&')[0].trim();
            const altTrack = {
              id: matchId,
              title: songTitle || match.title,
              artist: artist || match.artist,
              channelTitle: match.channelTitle,
              thumbnail: match.thumbnail || `https://i.ytimg.com/vi/${matchId}/hqdefault.jpg`,
              duration: match.duration || '03:30',
              durationSec: match.durationSec || 210,
              category: 'alternative'
            };

            // Cache the result
            if (typeof StorageManager !== 'undefined' && cleanFailedId) {
              StorageManager.setCachedAlternative(cleanFailedId, altTrack);
            }
            return altTrack;
          }
        }
      } catch (e) {
        console.warn('Piped alternative search error for term:', term, e);
      }
    }

    // Secondary fallback: YouTube Data API if key exists
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const query = `${songTitle} ${artist || ''} audio lyrics topic`.trim();
        const url = `${this.BASE_URL}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoCategoryId=10&maxResults=6&q=${encodeURIComponent(query)}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        const items = (data.items || []).filter(item => {
          const vId = (item.id?.videoId || '').replace('/watch?v=', '').split('&')[0].trim();
          return vId && vId !== cleanFailedId;
        });

        if (items.length > 0) {
          const altItem = items[0];
          const vidId = altItem.id.videoId.replace('/watch?v=', '').split('&')[0].trim();
          const altTrack = {
            id: vidId,
            title: songTitle || altItem.snippet.title,
            artist: artist || altItem.snippet.channelTitle,
            channelTitle: altItem.snippet.channelTitle,
            thumbnail: altItem.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            duration: '03:30',
            durationSec: 210,
            category: 'alternative'
          };

          if (typeof StorageManager !== 'undefined' && cleanFailedId) {
            StorageManager.setCachedAlternative(cleanFailedId, altTrack);
          }
          return altTrack;
        }
      } catch (e) {
        console.warn('YouTube alternative fallback failed:', e);
      }
    }

    return null;
  },

  /**
   * Helper details query for YouTube API
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

  parseDurationToSec(duration) {
    if (!duration) return 0;
    if (typeof duration === 'number') return duration;
    if (typeof duration === 'string' && duration.includes(':')) {
      const parts = duration.split(':').map(p => parseInt(p, 10));
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    return parseInt(duration, 10) || 0;
  },

  formatSeconds(totalSec) {
    if (!totalSec || isNaN(totalSec) || totalSec <= 0) return '03:30';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  formatViewCount(views) {
    const num = parseInt(views, 10);
    if (isNaN(num)) return '';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  },

  cleanTitle(rawTitle) {
    if (!rawTitle) return '';
    try {
      const doc = new DOMParser().parseFromString(rawTitle, 'text/html');
      let title = doc.body.textContent || '';
      return title
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
    } catch (e) {
      return rawTitle.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
    }
  },

  extractSearchTerms(rawTitle, artist = '') {
    const cleaned = this.cleanTitle(rawTitle);
    // Split by common title separators: |, -, –, :, ~, /
    const chunks = cleaned.split(/[|\-–:~]/).map(c => c.trim()).filter(Boolean);

    const metadataPatterns = [
      /new\s+.*song/i, /latest\s+.*song/i, /punjabi\s+song/i, /hindi\s+song/i,
      /official\s+.*/i, /full\s+video/i, /music\s+video/i, /speed\s+records/i,
      /t-series/i, /geet\s+mp3/i, /white\s+hill/i, /records/i
    ];

    let validChunks = chunks.filter(c => !metadataPatterns.some(pat => pat.test(c)) && c.length > 1);
    if (validChunks.length === 0) validChunks = chunks.length > 0 ? chunks : [cleaned];

    let songTitle = validChunks[0] || cleaned;
    if (artist && songTitle.toLowerCase().includes(artist.toLowerCase())) {
      const stripped = songTitle.replace(new RegExp(artist, 'gi'), '').replace(/^[\s\-–:|]+|[\s\-–:|]+$/g, '').trim();
      if (stripped.length >= 2) {
        songTitle = stripped;
      } else if (validChunks.length > 1) {
        songTitle = validChunks[1];
      }
    }

    const terms = [];
    if (artist) {
      terms.push(`${songTitle} ${artist} lyrics`);
      terms.push(`${songTitle} ${artist} audio`);
      terms.push(`${songTitle} ${artist} topic`);
      terms.push(`${songTitle} ${artist}`);
    } else {
      terms.push(`${songTitle} lyrics`);
      terms.push(`${songTitle} audio`);
      terms.push(`${songTitle}`);
    }

    return { songTitle, terms };
  },

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
      return { success: false, message: 'Network error: ' + err.message };
    }
  },

  fallbackSearch(query) {
    if (!query || !query.trim()) return typeof DEFAULT_TRACKS !== 'undefined' ? DEFAULT_TRACKS : [];
    const q = query.toLowerCase().trim();
    return (typeof DEFAULT_TRACKS !== 'undefined' ? DEFAULT_TRACKS : []).filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.artist.toLowerCase().includes(q) || 
      t.category.toLowerCase().includes(q)
    );
  }
};
