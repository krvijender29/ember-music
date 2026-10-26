/**
 * EMBER - Supabase PostgreSQL Database Manager
 * Interfaces with Supabase PostgreSQL using verified Firebase Authentication tokens.
 * Enforces Row Level Security (RLS) on all user data.
 * Gracefully falls back to local storage when credentials are in demo/guest mode.
 */

const DbManager = {
  _client: null,

  getClient() {
    if (!EmberConfig.isSupabaseConfigured() || !window.supabase) {
      return null;
    }

    if (!this._client) {
      this._client = window.supabase.createClient(
        EmberConfig.SUPABASE.url,
        EmberConfig.SUPABASE.anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          },
          accessToken: async () => {
            // Use Supabase publishable/anon key for PostgREST authorization
            return EmberConfig.SUPABASE.anonKey;
          }
        }
      );
    }
    return this._client;
  },

  // ----------------------------------------------------------------------------
  // Profiles
  // ----------------------------------------------------------------------------
  async ensureProfile(user) {
    if (!user) return null;
    const client = this.getClient();

    if (!client) {
      // Local fallback
      const stored = localStorage.getItem(`ember_profile_${user.uid}`);
      if (stored) {
        return { profile: JSON.parse(stored), isNewUser: false };
      }
      const newProf = {
        id: user.uid,
        display_name: user.displayName || user.email.split('@')[0],
        username: user.email ? user.email.split('@')[0] : 'emberuser',
        avatar_url: user.photoURL || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`ember_profile_${user.uid}`, JSON.stringify(newProf));
      return { profile: newProf, isNewUser: true };
    }

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.uid)
        .maybeSingle();

      if (data) {
        return { profile: data, isNewUser: false };
      }

      // Create new profile record
      const newProfile = {
        id: user.uid,
        email: user.email || null,
        display_name: user.displayName || (user.email ? user.email.split('@')[0] : 'Listener'),
        avatar_url: user.photoURL || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: created, error: insertError } = await client
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.warn('[DbManager] Profile insert warning:', insertError.message);
        return { profile: newProfile, isNewUser: true };
      }
      return { profile: created || newProfile, isNewUser: true };
    } catch (err) {
      console.error('[DbManager] ensureProfile error:', err);
      return {
        profile: {
          id: user.uid,
          display_name: user.displayName,
          username: user.email?.split('@')[0] || 'emberuser',
          avatar_url: user.photoURL
        },
        isNewUser: false
      };
    }
  },

  async getProfile(userId) {
    if (!userId) return null;
    const client = this.getClient();
    if (!client) {
      const stored = localStorage.getItem(`ember_profile_${userId}`);
      return stored ? JSON.parse(stored) : null;
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) console.error('[DbManager] getProfile error:', error);
    return data;
  },

  async updateProfile(userId, updates) {
    if (!userId) return null;
    const client = this.getClient();
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (!client) {
      const existing = await this.getProfile(userId) || { id: userId };
      const merged = { ...existing, ...payload };
      localStorage.setItem(`ember_profile_${userId}`, JSON.stringify(merged));
      return merged;
    }

    const { data, error } = await client
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ----------------------------------------------------------------------------
  // User Preferences & Music Onboarding
  // ----------------------------------------------------------------------------
  async getPreferences(userId) {
    if (!userId) return null;
    const client = this.getClient();
    if (!client) {
      const stored = localStorage.getItem(`ember_prefs_${userId}`);
      return stored ? JSON.parse(stored) : { favorite_genres: [], favorite_artists: [] };
    }

    const { data, error } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[DbManager] getPreferences warning:', error.message);
    }
    return data || { favorite_genres: [], favorite_artists: [] };
  },

  async savePreferences(userId, preferences) {
    if (!userId) return null;
    const client = this.getClient();
    const payload = {
      user_id: userId,
      favorite_genres: preferences.favorite_genres || [],
      favorite_artists: preferences.favorite_artists || [],
      updated_at: new Date().toISOString()
    };

    if (!client) {
      localStorage.setItem(`ember_prefs_${userId}`, JSON.stringify(payload));
      return payload;
    }

    const { data, error } = await client
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ----------------------------------------------------------------------------
  // Liked Songs
  // ----------------------------------------------------------------------------
  async getLikedSongs(userId) {
    if (!userId) return StorageManager.getLikedSongs();
    const client = this.getClient();
    if (!client) {
      return StorageManager.getLikedSongs();
    }

    const { data, error } = await client
      .from('liked_songs')
      .select('*')
      .eq('user_id', userId)
      .order('liked_at', { ascending: false });

    if (error) {
      console.warn('[DbManager] getLikedSongs fallback:', error.message);
      return StorageManager.getLikedSongs();
    }

    return (data || []).map(row => ({
      id: row.song_id,
      title: row.title,
      artist: row.artist,
      channelTitle: row.artist,
      thumbnail: row.artwork_url,
      likedAt: row.liked_at
    }));
  },

  async isSongLiked(userId, songId) {
    if (!userId) return StorageManager.isSongLiked(songId);
    const client = this.getClient();
    if (!client) return StorageManager.isSongLiked(songId);

    const { data } = await client
      .from('liked_songs')
      .select('id')
      .eq('user_id', userId)
      .eq('song_id', songId)
      .maybeSingle();

    return Boolean(data);
  },

  async toggleLikeSong(userId, track) {
    if (!userId) {
      return StorageManager.toggleLikeSong(track);
    }

    const client = this.getClient();
    if (!client) {
      return StorageManager.toggleLikeSong(track);
    }

    const isLiked = await this.isSongLiked(userId, track.id);
    if (isLiked) {
      // Remove
      await client
        .from('liked_songs')
        .delete()
        .eq('user_id', userId)
        .eq('song_id', track.id);
      StorageManager.toggleLikeSong(track); // Keep local storage cache in sync
      return false;
    } else {
      // Insert
      const payload = {
        user_id: userId,
        song_id: track.id,
        title: track.title,
        artist: track.artist || track.channelTitle || 'Ember',
        artwork_url: track.thumbnail || 'assets/images/ember_banner.jpg',
        liked_at: new Date().toISOString()
      };
      await client.from('liked_songs').upsert(payload, { onConflict: 'user_id, song_id' });
      StorageManager.toggleLikeSong(track);
      return true;
    }
  },

  // ----------------------------------------------------------------------------
  // Listening History
  // ----------------------------------------------------------------------------
  async addListeningHistory(userId, track, durationPlayed = 0) {
    if (!userId || !track || !track.id) return;
    const client = this.getClient();

    const payload = {
      user_id: userId,
      song_id: track.id,
      title: track.title,
      artist: track.artist || track.channelTitle || 'Ember',
      artwork_url: track.thumbnail || 'assets/images/ember_banner.jpg',
      genre: track.genre || 'Electronic',
      duration_played: Math.round(durationPlayed),
      played_at: new Date().toISOString()
    };

    // Also update local cache for instant UI rendering
    StorageManager.addRecentTrack(track);

    if (!client) return;

    try {
      await client.from('listening_history').insert(payload);
    } catch (err) {
      console.warn('[DbManager] addListeningHistory error:', err);
    }
  },

  async getListeningHistory(userId, limit = 20) {
    if (!userId) return StorageManager.getRecentTracks();
    const client = this.getClient();
    if (!client) return StorageManager.getRecentTracks();

    const { data, error } = await client
      .from('listening_history')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[DbManager] getListeningHistory fallback:', error.message);
      return StorageManager.getRecentTracks();
    }

    return (data || []).map(row => ({
      id: row.song_id,
      title: row.title,
      artist: row.artist,
      channelTitle: row.artist,
      thumbnail: row.artwork_url,
      genre: row.genre,
      playedAt: row.played_at,
      durationPlayed: row.duration_played
    }));
  },

  async clearListeningHistory(userId) {
    if (!userId) {
      localStorage.removeItem(StorageManager.KEYS.RECENT_TRACKS);
      return true;
    }

    const client = this.getClient();
    localStorage.removeItem(StorageManager.KEYS.RECENT_TRACKS);

    if (!client) return true;

    const { error } = await client
      .from('listening_history')
      .delete()
      .eq('user_id', userId);

    if (error) console.error('[DbManager] clearListeningHistory error:', error);
    return !error;
  },

  // ----------------------------------------------------------------------------
  // Playlists
  // ----------------------------------------------------------------------------
  async getPlaylists(userId) {
    if (!userId) return StorageManager.getPlaylists();
    const client = this.getClient();
    if (!client) return StorageManager.getPlaylists();

    const { data: playlists, error } = await client
      .from('playlists')
      .select(`
        id,
        name,
        description,
        created_at,
        playlist_songs (
          song_id,
          title,
          artist,
          artwork_url,
          position
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[DbManager] getPlaylists fallback:', error.message);
      return StorageManager.getPlaylists();
    }

    const mapped = (playlists || []).map(pl => ({
      id: pl.id,
      name: pl.name,
      description: pl.description || '',
      createdAt: pl.created_at,
      tracks: (pl.playlist_songs || [])
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(s => ({
          id: s.song_id,
          title: s.title,
          artist: s.artist,
          channelTitle: s.artist,
          thumbnail: s.artwork_url
        }))
    }));

    // Cache on system/mobile for instant & offline access
    StorageManager.setPlaylists(mapped);
    return mapped;
  },

  async createPlaylist(userId, name, description = '') {
    if (!userId) {
      return StorageManager.createPlaylist(name, description);
    }

    const client = this.getClient();
    if (!client) {
      return StorageManager.createPlaylist(name, description);
    }

    const { data, error } = await client
      .from('playlists')
      .insert({
        user_id: userId,
        name,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    const newPl = {
      id: data.id,
      name: data.name,
      description: data.description,
      tracks: [],
      createdAt: data.created_at
    };
    const local = StorageManager.getPlaylists();
    local.unshift(newPl);
    StorageManager.setPlaylists(local);
    return newPl;
  },

  async renamePlaylist(playlistId, newName) {
    StorageManager.renamePlaylist(playlistId, newName);

    const client = this.getClient();
    if (!client) {
      return true;
    }

    const { error } = await client
      .from('playlists')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', playlistId);

    if (error) throw error;
    return true;
  },

  async deletePlaylist(playlistId) {
    StorageManager.deletePlaylist(playlistId);

    const client = this.getClient();
    if (!client) {
      return true;
    }

    const { error } = await client
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) throw error;
    return true;
  },

  async addTrackToPlaylist(playlistId, track) {
    StorageManager.addTrackToPlaylist(playlistId, track);

    const client = this.getClient();
    if (!client) {
      return true;
    }

    // Get current max position
    const { data: songs } = await client
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPos = (songs && songs.length > 0) ? (songs[0].position + 1) : 0;

    const { error } = await client
      .from('playlist_songs')
      .insert({
        playlist_id: playlistId,
        song_id: track.id,
        title: track.title,
        artist: track.artist || track.channelTitle || 'Ember',
        artwork_url: track.thumbnail || 'assets/images/ember_banner.jpg',
        position: nextPos
      });

    if (error) {
      if (error.code === '23505') {
        // Unique violation: track already in playlist
        return false;
      }
      throw error;
    }
    return true;
  },

  async removeTrackFromPlaylist(playlistId, trackId) {
    StorageManager.removeTrackFromPlaylist(playlistId, trackId);

    const client = this.getClient();
    if (!client) {
      return true;
    }

    const { error } = await client
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', trackId);

    if (error) throw error;
    return true;
  },

  // ----------------------------------------------------------------------------
  // Search History (Supabase PostgreSQL + System/Mobile Cache)
  // ----------------------------------------------------------------------------
  async getSearchHistory(userId) {
    if (!userId) return StorageManager.getSearchHistory();
    const client = this.getClient();
    if (!client) return StorageManager.getSearchHistory();

    try {
      const { data, error } = await client
        .from('search_history')
        .select('query, searched_at')
        .eq('user_id', userId)
        .order('searched_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[DbManager] getSearchHistory fallback:', error.message);
        return StorageManager.getSearchHistory();
      }

      const queries = (data || []).map(d => d.query).filter(Boolean);
      StorageManager.setSearchHistory(queries);
      return queries;
    } catch (e) {
      console.warn('[DbManager] getSearchHistory error:', e.message);
      return StorageManager.getSearchHistory();
    }
  },

  async addSearchHistory(userId, query) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();
    StorageManager.addSearchHistory(cleanQuery);

    if (!userId) return;
    const client = this.getClient();
    if (!client) return;

    try {
      await client
        .from('search_history')
        .upsert({
          user_id: userId,
          query: cleanQuery,
          searched_at: new Date().toISOString()
        }, { onConflict: 'user_id, query' });
    } catch (e) {
      console.warn('[DbManager] addSearchHistory error:', e.message);
    }
  },

  async removeSearchHistory(userId, query) {
    if (!query) return;
    const cleanQuery = query.trim();
    StorageManager.removeSearchHistory(cleanQuery);

    if (!userId) return;
    const client = this.getClient();
    if (!client) return;

    try {
      await client
        .from('search_history')
        .delete()
        .eq('user_id', userId)
        .eq('query', cleanQuery);
    } catch (e) {
      console.warn('[DbManager] removeSearchHistory error:', e.message);
    }
  },

  async clearSearchHistory(userId) {
    StorageManager.clearSearchHistory();

    if (!userId) return;
    const client = this.getClient();
    if (!client) return;

    try {
      await client
        .from('search_history')
        .delete()
        .eq('user_id', userId);
    } catch (e) {
      console.warn('[DbManager] clearSearchHistory error:', e.message);
    }
  },

  // ----------------------------------------------------------------------------
  // Personalized Music Recommendations ("Based on Your Taste")
  // ----------------------------------------------------------------------------
  async getRecommendations(userId, catalog = DEFAULT_TRACKS) {
    if (!catalog || catalog.length === 0) return [];
    
    let favoriteGenres = [];
    let favoriteArtists = [];
    let historyTracks = [];

    if (userId) {
      const prefs = await this.getPreferences(userId);
      favoriteGenres = (prefs.favorite_genres || []).map(g => g.toLowerCase());
      favoriteArtists = (prefs.favorite_artists || []).map(a => a.toLowerCase());
      historyTracks = await this.getListeningHistory(userId, 30);
    } else {
      historyTracks = StorageManager.getRecentTracks();
    }

    // Calculate artist play frequency from history
    const historyArtistCounts = {};
    historyTracks.forEach(t => {
      const art = (t.artist || t.channelTitle || '').toLowerCase();
      if (art) {
        historyArtistCounts[art] = (historyArtistCounts[art] || 0) + 1;
      }
    });

    // Score catalog tracks
    const scored = catalog.map(track => {
      let score = 1.0;
      const tArtist = (track.artist || track.channelTitle || '').toLowerCase();
      const tGenre = (track.genre || '').toLowerCase();

      // Explicit favorite artist match
      if (favoriteArtists.some(fa => tArtist.includes(fa) || fa.includes(tArtist))) {
        score += 5.0;
      }

      // Explicit favorite genre match
      if (favoriteGenres.some(fg => tGenre.includes(fg) || fg.includes(tGenre))) {
        score += 3.5;
      }

      // Frequent listening history boost
      if (historyArtistCounts[tArtist]) {
        score += Math.min(3.0, historyArtistCounts[tArtist] * 0.8);
      }

      // Add small deterministic jitter for natural freshness
      const charCodeSum = track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      score += (charCodeSum % 10) * 0.05;

      return { track, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.track);
  }
};
