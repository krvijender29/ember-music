/**
/**
 * EMBER - YouTube Music Discovery & Audio Service
 * Powered by YouTube Data API v3 & Google YouTube Suggest
 * Provides real-time catalog discovery: Songs, Artists, Albums, Playlists,
 * Moods & Genres, live Autocomplete suggestions, and alternative stream resolution.
 */

const YouTubeAPI = {
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
  DEFAULT_KEY: 'AIzaSyBRrPickOQtOYJUh9bXNzMjIJuBIqZwCpM',
  BACKUP_KEY: 'AIzaSyDUnACXuxfMyOy3OrCgRSgm3eTmsEFY9xw',

  getApiKey() {
    return (typeof StorageManager !== 'undefined' && StorageManager.getApiKey()) || this.DEFAULT_KEY;
  },

  hasKey() {
    return Boolean(this.getApiKey());
  },

  /**
   * Live Autocomplete Suggestions
   * Fetches real-time search suggestions via local/Vercel API or direct Google Suggest fallback
   */
  async getSuggestions(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    // 1. Try backend endpoint /api/suggestions
    try {
      const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.suggestions)) {
          return data.suggestions;
        }
      }
    } catch (_) {}

    // 2. Direct fallback using Google Suggest JSONP
    return new Promise((resolve) => {
      const callbackName = `yt_suggest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const script = document.createElement('script');
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        resolve([]);
      }, 2500);

      window[callbackName] = (data) => {
        if (timedOut) return;
        clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        const suggestions = (data && data[1]) ? data[1].map(item => (Array.isArray(item) ? item[0] : item)) : [];
        resolve(suggestions.slice(0, 8));
      };

      script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&jsonp=${callbackName}`;
      script.onerror = () => {
        if (timedOut) return;
        clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        resolve([]);
      };
      document.body.appendChild(script);
    });
  },

  /**
   * Main Search entry point used by App
   * Supports categories: 'all', 'songs', 'artists', 'albums', 'playlists'
   */
  async search(query, maxResults = 24, filter = 'all', pageToken = '') {
    if (!query || !query.trim()) return { success: true, results: this.fallbackSearch('') };

    const q = query.trim();
    const cleanFilter = (filter || 'all').toLowerCase();
    const limit = typeof maxResults === 'number' && maxResults > 0 ? maxResults : 24;

    // 1. Call Backend /api/search (Fast, Server-side Parallelism & Caching)
    try {
      let url = `/api/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(cleanFilter)}&n=${limit}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[Ember] Backend /api/search endpoint unavailable, using direct client-side fallback:', e);
    }

    // 2. Direct Client-side YouTube Data API v3 Fallback
    return this.searchDirectYouTube(q, cleanFilter, limit, pageToken);
  },

  /**
   * Direct Client-side YouTube Data API v3 Fallback
   */
  async searchDirectYouTube(query, filter = 'all', limit = 24, pageToken = '') {
    const apiKey = this.getApiKey();
    if (!apiKey) return { success: true, results: this.fallbackSearch(query) };

    try {
      if (filter === 'songs') {
        const data = await this._ytClientFetch('search', {
          part: 'snippet',
          type: 'video',
          videoCategoryId: '10',
          videoEmbeddable: 'true',
          q: query,
          maxResults: Math.min(limit, 50),
          pageToken: pageToken || undefined
        });

        const items = data.items || [];
        const vids = items.map(it => it.id?.videoId).filter(Boolean);
        const detailsMap = await this.getVideoDetails(vids, apiKey);
        const tracks = items.map(it => this._formatVideoTrack(it, detailsMap)).filter(Boolean);

        return {
          success: true,
          query,
          filter: 'songs',
          results: tracks,
          nextPageToken: data.nextPageToken || ''
        };
      } else if (filter === 'artists') {
        const data = await this._ytClientFetch('search', {
          part: 'snippet',
          type: 'channel',
          q: query,
          maxResults: Math.min(limit, 30),
          pageToken: pageToken || undefined
        });

        const artists = (data.items || []).map(it => this._formatArtistItem(it)).filter(Boolean);
        return {
          success: true,
          query,
          filter: 'artists',
          results: artists,
          nextPageToken: data.nextPageToken || ''
        };
      } else if (filter === 'albums') {
        const data = await this._ytClientFetch('search', {
          part: 'snippet',
          type: 'playlist',
          q: `${query} album`,
          maxResults: Math.min(limit, 30),
          pageToken: pageToken || undefined
        });

        const albums = (data.items || []).map(it => this._formatPlaylistItem(it, true)).filter(Boolean);
        return {
          success: true,
          query,
          filter: 'albums',
          results: albums,
          nextPageToken: data.nextPageToken || ''
        };
      } else if (filter === 'playlists') {
        const data = await this._ytClientFetch('search', {
          part: 'snippet',
          type: 'playlist',
          q: `${query} playlist`,
          maxResults: Math.min(limit, 30),
          pageToken: pageToken || undefined
        });

        const playlists = (data.items || []).map(it => this._formatPlaylistItem(it, false)).filter(Boolean);
        return {
          success: true,
          query,
          filter: 'playlists',
          results: playlists,
          nextPageToken: data.nextPageToken || ''
        };
      } else {
        // ALL Tab
        const [songsRes, artistsRes, albumsRes, playlistsRes] = await Promise.allSettled([
          this._ytClientFetch('search', { part: 'snippet', type: 'video', videoCategoryId: '10', videoEmbeddable: 'true', q: query, maxResults: 8 }),
          this._ytClientFetch('search', { part: 'snippet', type: 'channel', q: query, maxResults: 4 }),
          this._ytClientFetch('search', { part: 'snippet', type: 'playlist', q: `${query} album`, maxResults: 6 }),
          this._ytClientFetch('search', { part: 'snippet', type: 'playlist', q: `${query} playlist`, maxResults: 6 })
        ]);

        const songItems = songsRes.status === 'fulfilled' ? (songsRes.value.items || []) : [];
        const artistItems = artistsRes.status === 'fulfilled' ? (artistsRes.value.items || []) : [];
        const albumItems = albumsRes.status === 'fulfilled' ? (albumsRes.value.items || []) : [];
        const playlistItems = playlistsRes.status === 'fulfilled' ? (playlistsRes.value.items || []) : [];

        const vids = songItems.map(it => it.id?.videoId).filter(Boolean);
        const detailsMap = await this.getVideoDetails(vids, apiKey);
        const songs = songItems.map(it => this._formatVideoTrack(it, detailsMap)).filter(Boolean);
        const artists = artistItems.map(it => this._formatArtistItem(it)).filter(Boolean);
        const albums = albumItems.map(it => this._formatPlaylistItem(it, true)).filter(Boolean);
        const playlists = playlistItems.map(it => this._formatPlaylistItem(it, false)).filter(Boolean);

        let topResult = null;
        const qLower = query.toLowerCase();
        if (artists.length > 0 && (qLower.includes(artists[0].title.toLowerCase()) || artists[0].title.toLowerCase().includes(qLower))) {
          topResult = { ...artists[0], isArtist: true };
        } else if (songs.length > 0) {
          topResult = { ...songs[0], isSong: true };
        }

        return {
          success: true,
          query,
          filter: 'all',
          topResult,
          songs,
          artists,
          albums,
          playlists,
          results: songs
        };
      }
    } catch (err) {
      console.warn('[Ember] Direct YouTube search error:', err);
      return { success: false, results: this.fallbackSearch(query), error: err.message };
    }
  },

  /**
   * Fetch tracks of a YouTube Music playlist or album
   */
  async getPlaylistTracks(playlistId, limit = 30, pageToken = '') {
    if (!playlistId) return [];

    // 1. Try backend endpoint
    try {
      let url = `/api/playlist-items?id=${encodeURIComponent(playlistId)}&n=${limit}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          return data.results;
        }
      }
    } catch (_) {}

    // 2. Direct client fallback
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    try {
      const data = await this._ytClientFetch('playlistItems', {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: Math.min(limit, 50),
        pageToken: pageToken || undefined
      });

      const items = data.items || [];
      const vids = items.map(it => it.contentDetails?.videoId || it.snippet?.resourceId?.videoId).filter(Boolean);
      const detailsMap = await this.getVideoDetails(vids, apiKey);

      return items.map(it => {
        const snip = it.snippet || {};
        const vid = it.contentDetails?.videoId || snip.resourceId?.videoId;
        if (!vid) return null;
        const dtl = detailsMap[vid] || {};
        return {
          id: vid,
          title: this.cleanTitle(snip.title || 'Track'),
          artist: snip.videoOwnerChannelTitle || snip.channelTitle || 'Artist',
          channelTitle: snip.videoOwnerChannelTitle || snip.channelTitle || 'Artist',
          duration: dtl.duration || '03:30',
          durationSec: dtl.durationSec || 210,
          thumbnail: snip.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          viewCount: dtl.viewCount || '',
          category: 'playlist_track'
        };
      }).filter(Boolean);
    } catch (e) {
      console.warn('[Ember] Failed to fetch playlist tracks:', e);
      return [];
    }
  },

  /**
   * Fetch top tracks for an artist channel
   */
  async getArtistTracks(channelId, limit = 20) {
    if (!channelId) return [];

    // 1. Try backend endpoint
    try {
      const res = await fetch(`/api/artist-tracks?id=${encodeURIComponent(channelId)}&n=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          return data.results;
        }
      }
    } catch (_) {}

    // 2. Direct client fallback
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    try {
      const data = await this._ytClientFetch('search', {
        part: 'snippet',
        channelId,
        type: 'video',
        videoCategoryId: '10',
        videoEmbeddable: 'true',
        maxResults: Math.min(limit, 50)
      });

      const items = data.items || [];
      const vids = items.map(it => it.id?.videoId).filter(Boolean);
      const detailsMap = await this.getVideoDetails(vids, apiKey);
      return items.map(it => this._formatVideoTrack(it, detailsMap)).filter(Boolean);
    } catch (e) {
      console.warn('[Ember] Failed to fetch artist tracks:', e);
      return [];
    }
  },

  /**
   * Fetch Trending Music from YouTube
   */
  async getTrendingMusic(maxResults = 24) {
    // 1. Backend endpoint
    try {
      const res = await fetch('/api/trending');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          return data.results.slice(0, maxResults);
        }
      }
    } catch (_) {}

    // 2. Direct YouTube fallback
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const data = await this._ytClientFetch('videos', {
          part: 'snippet,contentDetails,statistics,status',
          chart: 'mostPopular',
          videoCategoryId: '10',
          maxResults: Math.min(maxResults, 50)
        });

        return (data.items || [])
          .filter(it => it.status?.embeddable !== false)
          .map(it => {
            const parsed = this.parseDuration(it.contentDetails?.duration);
            return {
              id: it.id,
              title: this.cleanTitle(it.snippet.title),
              artist: it.snippet.channelTitle,
              channelTitle: it.snippet.channelTitle,
              duration: parsed.durationText,
              durationSec: parsed.seconds,
              thumbnail: it.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${it.id}/hqdefault.jpg`,
              viewCount: this.formatViewCount(it.statistics?.viewCount),
              category: 'trending',
              badge: 'Hot'
            };
          });
      } catch (err) {
        console.warn('[Ember] Direct YouTube trending failed:', err);
      }
    }

    return typeof DEFAULT_TRACKS !== 'undefined' ? DEFAULT_TRACKS : [];
  },

  /**
   * Automatically resolve an alternative embeddable stream for copyright-restricted tracks (Error 101/150)
   * Prioritizes Audio, Topic, and Lyric versions which allow embedding.
   */
  async findEmbeddableAlternative(title, artist, failedId) {
    if (!title) return null;

    const cleanFailedId = (failedId || '').trim();
    if (typeof StorageManager !== 'undefined' && cleanFailedId) {
      const cached = StorageManager.getCachedAlternative(cleanFailedId);
      if (cached && cached.id && cached.id !== cleanFailedId) {
        return cached;
      }
    }

    const { songTitle } = this.extractSearchTerms(title, artist);
    const query = `${songTitle} ${artist || ''} audio topic lyrics`.trim();

    try {
      const res = await this.search(query, 6, 'songs');
      const candidates = (res && res.results) ? res.results : [];

      const match = candidates.find(t => t.id && t.id !== cleanFailedId && t.embeddable !== false);
      if (match) {
        const altTrack = {
          id: match.id,
          title: songTitle || match.title,
          artist: artist || match.artist,
          channelTitle: match.channelTitle,
          thumbnail: match.thumbnail || `https://i.ytimg.com/vi/${match.id}/hqdefault.jpg`,
          duration: match.duration || '03:30',
          durationSec: match.durationSec || 210,
          category: 'alternative'
        };

        if (typeof StorageManager !== 'undefined' && cleanFailedId) {
          StorageManager.setCachedAlternative(cleanFailedId, altTrack);
        }
        return altTrack;
      }
    } catch (e) {
      console.warn('[Ember] Alternative search error:', e);
    }

    return null;
  },

  /**
   * Helper details query for YouTube API
   */
  async getVideoDetails(videoIds, apiKey) {
    if (!videoIds || videoIds.length === 0) return {};
    try {
      const key = apiKey || this.getApiKey();
      const url = `${this.BASE_URL}/videos?part=contentDetails,statistics,snippet,status&id=${videoIds.slice(0, 50).join(',')}&key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) return {};

      const map = {};
      (data.items || []).forEach(v => {
        const parsed = this.parseDuration(v.contentDetails?.duration);
        map[v.id] = {
          duration: parsed.durationText,
          durationSec: parsed.seconds,
          viewCount: this.formatViewCount(v.statistics?.viewCount),
          embeddable: v.status?.embeddable !== false
        };
      });
      return map;
    } catch (e) {
      return {};
    }
  },

  // --------------------------------------------------------------------------
  // Formatting & Internal Helpers
  // --------------------------------------------------------------------------
  async _ytClientFetch(endpoint, params) {
    const key = this.getApiKey();
    const queryParams = new URLSearchParams({ ...params, key });
    const res = await fetch(`${this.BASE_URL}/${endpoint}?${queryParams.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `YouTube API error: ${res.status}`);
    }
    return res.json();
  },

  _formatVideoTrack(item, detailsMap = {}) {
    const vid = item.id?.videoId || item.id;
    if (!vid) return null;
    const snip = item.snippet || {};
    const dtl = detailsMap[vid] || {};
    return {
      id: vid,
      title: this.cleanTitle(snip.title || 'Track'),
      artist: snip.channelTitle || 'Artist',
      channelTitle: snip.channelTitle || 'Artist',
      channelId: snip.channelId || '',
      duration: dtl.duration || '03:30',
      durationSec: dtl.durationSec || 210,
      thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      viewCount: dtl.viewCount || '',
      embeddable: dtl.embeddable !== false,
      category: 'song'
    };
  },

  _formatArtistItem(item) {
    const cid = item.id?.channelId || item.id;
    if (!cid) return null;
    const snip = item.snippet || {};
    const rawTitle = snip.title || 'Artist';
    const cleanTitle = rawTitle.replace(/\s*-\s*Topic$/i, '').trim();
    return {
      id: cid,
      channelId: cid,
      title: cleanTitle,
      rawTitle,
      description: snip.description || '',
      thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || 'assets/images/ember_banner.jpg',
      category: 'artist'
    };
  },

  _formatPlaylistItem(item, isAlbum = false) {
    const pid = item.id?.playlistId || item.id;
    if (!pid) return null;
    const snip = item.snippet || {};
    return {
      id: pid,
      playlistId: pid,
      title: this.cleanTitle(snip.title || 'Playlist'),
      subtitle: snip.channelTitle || 'Ember Collection',
      channelTitle: snip.channelTitle || 'Ember Collection',
      channelId: snip.channelId || '',
      thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || 'assets/images/ember_banner.jpg',
      cover: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || 'assets/images/ember_banner.jpg',
      category: isAlbum ? 'album' : 'playlist'
    };
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
        .replace(/\(Official\s*(?:Music\s*)?Video.*?\)/gi, '')
        .replace(/\(Lyric\s*(?:Video)?.*?\)/gi, '')
        .replace(/\(Audio.*?\)/gi, '')
        .replace(/\|.*$/g, '')
        .trim();
    } catch (e) {
      return rawTitle.replace(/\[.*?\]/g, '').replace(/\|.*$/g, '').trim();
    }
  },

  extractSearchTerms(rawTitle, artist = '') {
    const cleaned = this.cleanTitle(rawTitle);
    const chunks = cleaned.split(/[|\-–:~]/).map(c => c.trim()).filter(Boolean);
    let songTitle = chunks[0] || cleaned;
    return { songTitle };
  },

  fallbackSearch(query) {
    if (!query || !query.trim()) return typeof DEFAULT_TRACKS !== 'undefined' ? DEFAULT_TRACKS : [];
    const q = query.toLowerCase().trim();
    return (typeof DEFAULT_TRACKS !== 'undefined' ? DEFAULT_TRACKS : []).filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  }
};
