/**
 * AuraWave Music - Storage Module
 * Manages localStorage for API keys, favorites, playlists, and user playback settings
 */

const StorageManager = {
  KEYS: {
    API_KEY: 'aurawave_yt_api_key',
    LIKED_SONGS: 'aurawave_liked_songs',
    RECENT_TRACKS: 'aurawave_recent_tracks',
    PLAYLISTS: 'aurawave_custom_playlists',
    SETTINGS: 'aurawave_player_settings',
    STREAMING_ENGINE: 'aurawave_streaming_engine',
    PIPED_INSTANCE: 'aurawave_piped_instance',
    ALT_CACHE: 'aurawave_alt_track_cache',
    SEARCH_HISTORY: 'ember_search_history'
  },

  DEFAULT_API_KEY: 'AIzaSyDUnACXuxfMyOy3OrCgRSgm3eTmsEFY9xw',

  // Streaming Engine Selection ('piped' | 'youtube')
  getStreamingEngine() {
    return localStorage.getItem(this.KEYS.STREAMING_ENGINE) || 'piped';
  },

  setStreamingEngine(engine) {
    localStorage.setItem(this.KEYS.STREAMING_ENGINE, engine);
  },

  getPipedInstance() {
    return localStorage.getItem(this.KEYS.PIPED_INSTANCE) || '';
  },

  setPipedInstance(url) {
    if (url && url.trim()) {
      localStorage.setItem(this.KEYS.PIPED_INSTANCE, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(this.KEYS.PIPED_INSTANCE);
    }
  },

  // Cache for resolved copyright fallback tracks
  getCachedAlternative(originalId) {
    try {
      const data = localStorage.getItem(this.KEYS.ALT_CACHE);
      const cache = data ? JSON.parse(data) : {};
      return cache[originalId] || null;
    } catch (e) {
      return null;
    }
  },

  setCachedAlternative(originalId, altTrack) {
    try {
      const data = localStorage.getItem(this.KEYS.ALT_CACHE);
      const cache = data ? JSON.parse(data) : {};
      cache[originalId] = altTrack;
      localStorage.setItem(this.KEYS.ALT_CACHE, JSON.stringify(cache));
    } catch (e) {
      // Ignore quota errors
    }
  },

  // API Key Handling
  getApiKey() {
    return localStorage.getItem(this.KEYS.API_KEY) || this.DEFAULT_API_KEY;
  },

  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(this.KEYS.API_KEY, key.trim());
    } else {
      localStorage.removeItem(this.KEYS.API_KEY);
    }
  },

  clearApiKey() {
    localStorage.removeItem(this.KEYS.API_KEY);
  },

  hasApiKey() {
    return Boolean(this.getApiKey());
  },

  isDefaultKey() {
    return this.getApiKey() === this.DEFAULT_API_KEY;
  },

  // Liked Songs Handling
  getLikedSongs() {
    try {
      const data = localStorage.getItem(this.KEYS.LIKED_SONGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse liked songs from localStorage', e);
      return [];
    }
  },

  isSongLiked(id) {
    const list = this.getLikedSongs();
    return list.some(song => song.id === id);
  },

  toggleLikeSong(track) {
    const list = this.getLikedSongs();
    const index = list.findIndex(s => s.id === track.id);
    let isNowLiked = false;

    if (index >= 0) {
      list.splice(index, 1);
      isNowLiked = false;
    } else {
      list.unshift(track);
      isNowLiked = true;
    }

    localStorage.setItem(this.KEYS.LIKED_SONGS, JSON.stringify(list));
    return isNowLiked;
  },

  // Recent History
  getRecentTracks() {
    try {
      const data = localStorage.getItem(this.KEYS.RECENT_TRACKS);
      const list = data ? JSON.parse(data) : [];
      if (!Array.isArray(list)) return [];
      // Sanitize and deduplicate on read
      const unique = [];
      const seen = new Set();
      for (const t of list) {
        if (!t || !t.title) continue;
        const idKey = (t.id || '').trim();
        const titleKey = (t.title || '').trim().toLowerCase();
        const artistKey = (t.artist || t.channelTitle || '').trim().toLowerCase();
        const compKey = `${titleKey}:::${artistKey}`;
        if (idKey && seen.has(`id:${idKey}`)) continue;
        if (titleKey && seen.has(`title:${compKey}`)) continue;
        if (idKey) seen.add(`id:${idKey}`);
        if (titleKey) seen.add(`title:${compKey}`);
        unique.push(t);
      }
      return unique;
    } catch (e) {
      return [];
    }
  },

  setRecentTracks(tracks) {
    try {
      localStorage.setItem(this.KEYS.RECENT_TRACKS, JSON.stringify(tracks || []));
    } catch (_) {}
  },

  clearRecentTracks() {
    try {
      localStorage.removeItem(this.KEYS.RECENT_TRACKS);
    } catch (_) {}
  },

  addRecentTrack(track) {
    if (!track || !track.title) return;
    let list = this.getRecentTracks();
    const targetId = (track.id || '').trim();
    const targetTitle = (track.title || '').trim().toLowerCase();
    const targetArtist = (track.artist || track.channelTitle || '').trim().toLowerCase();
    const targetComp = `${targetTitle}:::${targetArtist}`;

    // Remove any previous occurrence of this song (by id or title/artist match)
    list = list.filter(t => {
      if (!t || !t.title) return false;
      const tId = (t.id || '').trim();
      const tTitle = (t.title || '').trim().toLowerCase();
      const tArtist = (t.artist || t.channelTitle || '').trim().toLowerCase();
      const tComp = `${tTitle}:::${tArtist}`;

      if (targetId && tId && tId === targetId) return false;
      if (targetTitle && tTitle && (tComp === targetComp || tTitle === targetTitle)) return false;
      return true;
    });

    // Add repeated or new track at the beginning
    list.unshift(track);
    if (list.length > 30) list.pop();
    localStorage.setItem(this.KEYS.RECENT_TRACKS, JSON.stringify(list));
  },

  // Custom Playlists
  getPlaylists() {
    try {
      const data = localStorage.getItem(this.KEYS.PLAYLISTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  createPlaylist(name, description = '', cover = '', sourcePlaylistId = null) {
    const playlists = this.getPlaylists();
    const newPlaylist = {
      id: 'pl_' + Date.now(),
      name,
      description,
      cover: cover || '',
      sourcePlaylistId: sourcePlaylistId || null,
      tracks: [],
      createdAt: new Date().toISOString()
    };
    playlists.push(newPlaylist);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
    return newPlaylist;
  },

  addTracksToPlaylist(playlistId, tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) return true;
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      if (!Array.isArray(pl.tracks)) pl.tracks = [];
      let addedCount = 0;
      for (const track of tracks) {
        if (!track || !track.id) continue;
        if (!pl.tracks.some(t => t.id === track.id)) {
          pl.tracks.push(track);
          addedCount++;
        }
      }
      localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
      return addedCount > 0;
    }
    return false;
  },

  addTrackToPlaylist(playlistId, track) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      if (!pl.tracks.some(t => t.id === track.id)) {
        pl.tracks.push(track);
        localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
        return true;
      }
    }
    return false;
  },

  removeTrackFromPlaylist(playlistId, trackId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.id !== trackId);
      localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
      return true;
    }
    return false;
  },

  setPlaylists(playlists) {
    try {
      localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists || []));
    } catch (e) {}
  },

  renamePlaylist(playlistId, newName) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.name = newName;
      localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
      return pl;
    }
    return null;
  },

  deletePlaylist(playlistId) {
    const playlists = this.getPlaylists().filter(p => p.id !== playlistId);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
  },

  // Search History (Local system & mobile caching)
  getSearchHistory() {
    try {
      const data = localStorage.getItem(this.KEYS.SEARCH_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  setSearchHistory(queries) {
    try {
      const clean = Array.isArray(queries)
        ? queries.map(q => typeof q === 'string' ? q.trim() : (q && q.query ? q.query.trim() : '')).filter(Boolean)
        : [];
      localStorage.setItem(this.KEYS.SEARCH_HISTORY, JSON.stringify(clean.slice(0, 25)));
    } catch (e) {}
  },

  addSearchHistory(query) {
    if (!query || !query.trim()) return;
    const q = query.trim();
    let list = this.getSearchHistory().filter(item => item.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    if (list.length > 25) list.pop();
    localStorage.setItem(this.KEYS.SEARCH_HISTORY, JSON.stringify(list));
  },

  removeSearchHistory(query) {
    if (!query) return;
    const q = query.trim().toLowerCase();
    const list = this.getSearchHistory().filter(item => item.toLowerCase() !== q);
    localStorage.setItem(this.KEYS.SEARCH_HISTORY, JSON.stringify(list));
  },

  clearSearchHistory() {
    localStorage.removeItem(this.KEYS.SEARCH_HISTORY);
  },

  // Player Settings (volume, repeat, shuffle)
  getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : { volume: 80, repeat: 'all', shuffle: false, infiniteAutoplay: true };
    } catch (e) {
      return { volume: 80, repeat: 'all', shuffle: false, infiniteAutoplay: true };
    }
  },

  saveSettings(settings) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
  }
};

window.StorageManager = StorageManager;
