/**
 * EMBER - Universal Audio & YouTube Music Player Engine
 * Seamless Dual-Engine Architecture:
 *   1. Official YouTube IFrame Player (Supported, Legal, Full Catalog Streaming)
 *   2. Native HTML5 Audio (Direct Audio Streams & CDN)
 * Full hardware media keys & lockscreen integration via MediaSession API
 * Automatic embed error resolution, queue management, and autoplay.
 */

class MusicPlayer {
  constructor() {
    this.audio = document.getElementById('ember-audio-player') || new Audio();
    this.audio.preload = 'auto';

    // Engine state
    this.activeEngine = 'youtube'; // 'youtube' | 'audio'
    this.ytPlayer = null;
    this.isYtReady = false;
    this.pendingYtTrack = null;
    this.ytTicker = null;

    this.isReady = true;
    this.currentTrack = null;
    this.queue = [];
    this.originalQueue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = StorageManager.getSettings().volume ?? 80;
    this.audio.volume = Math.max(0, Math.min(1, this.volume / 100));
    this.repeatMode = StorageManager.getSettings().repeat ?? 'all'; // 'off' | 'all' | 'one'
    this.isShuffled = StorageManager.getSettings().shuffle ?? false;
    this.infiniteAutoplay = StorageManager.getSettings().infiniteAutoplay ?? true;
    this.isFetchingAutoplay = false;
    this.isVideoVisible = false;

    // Sleep Timer
    this.sleepTimerTicker = null;
    this.sleepTimerSecondsRemaining = 0;
    this.sleepTimerEndOfSong = false;
    this.onSleepTimerTick = null;

    // 5-Band Equalizer & Web Audio API
    this.audioCtx = null;
    this.audioSourceNode = null;
    this.eqFilters = [];
    this.eqMasterGain = null;
    this.eqFrequencies = [60, 230, 910, 3600, 14000];
    this.eqTypes = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
    this.eqPresets = {
      'Flat': [0, 0, 0, 0, 0],
      'Ember Bass Boost': [6, 4, -1, 1, 3],
      'Vocal Clarity': [-2, 1, 4, 3, 1],
      'Electronic / EDM': [5, 3, -2, 2, 5],
      'Acoustic / Rock': [4, 2, 0, 2, 4],
      'Podcast / Speech': [-4, 2, 5, 2, -2]
    };
    const savedEq = (typeof StorageManager !== 'undefined' && StorageManager.getEqSettings) ? StorageManager.getEqSettings() : { enabled: true, preset: 'Flat', bands: [0, 0, 0, 0, 0] };
    this.eqEnabled = savedEq.enabled ?? true;
    this.eqPreset = savedEq.preset || 'Flat';
    this.eqBands = Array.isArray(savedEq.bands) && savedEq.bands.length === 5 ? savedEq.bands : [0, 0, 0, 0, 0];

    // Callbacks
    this.onTrackChange = null;
    this.onStateChange = null;
    this.onTimeUpdate = null;
    this.onQueueChange = null;

    this.bindAudioEvents();
    this.initYouTubePlayer();

    window.emberPlayer = this;
    console.log('[Ember] Universal Player Engine initialized.');
  }

  /**
   * Initialize YouTube IFrame Player API
   */
  initYouTubePlayer() {
    if (this.ytPlayer) return;

    if (typeof YT !== 'undefined' && YT.Player) {
      try {
        const targetEl = document.getElementById('yt-player-target');
        if (!targetEl) return;

        this.ytPlayer = new YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              this.isYtReady = true;
              console.log('[Ember] YouTube IFrame Player ready.');
              try {
                this.ytPlayer.setVolume(this.volume);
              } catch (_) {}
              if (this.pendingYtTrack) {
                const { track, autoPlay } = this.pendingYtTrack;
                this.pendingYtTrack = null;
                this.loadTrack(track, autoPlay);
              }
            },
            onStateChange: (event) => {
              this.handleYtStateChange(event);
            },
            onError: (event) => {
              this.handleYtError(event);
            }
          }
        });
      } catch (err) {
        console.warn('[Ember] YouTube player init error:', err);
      }
    } else {
      // Retry in 300ms if script is still downloading
      setTimeout(() => this.initYouTubePlayer(), 300);
    }
  }

  handleYtStateChange(event) {
    if (this.activeEngine !== 'youtube') return;

    // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (event.data === 1) { // Playing
      this.isPlaying = true;

    // Resume AudioContext for Equalizer if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (_) {}
    }
      this.startYtTicker();
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
    } else if (event.data === 2) { // Paused
      this.isPlaying = false;
      this.stopYtTicker();
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
    } else if (event.data === 3) { // Buffering
      if (this.onStateChange) this.onStateChange({ isPlaying: this.isPlaying, isBuffering: true });
    } else if (event.data === 0) { // Ended
      this.stopYtTicker();
      this.handleTrackEnded();
    }
  }

  async handleYtError(event) {
    console.warn('[Ember] YouTube Player error event:', event.data);
    const track = this.currentTrack;
    if (!track) return;

    // Error codes: 100 (not found/private), 101/150 (not allowed to play in embedded player)
    window.dispatchEvent(new CustomEvent('aurawave:notification', {
      detail: { message: `Finding embeddable stream for "${track.title}"...`, type: 'warning' }
    }));

    try {
      if (typeof YouTubeAPI !== 'undefined' && YouTubeAPI.findEmbeddableAlternative) {
        const altTrack = await YouTubeAPI.findEmbeddableAlternative(track.title, track.artist, track.id);
        if (altTrack && altTrack.id && altTrack.id !== track.id) {
          console.log(`[Ember] Switching to alternative video ID: ${altTrack.id}`);
          track.id = altTrack.id;
          if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
            this.ytPlayer.loadVideoById(altTrack.id);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[Ember] Alternative resolution error:', e);
    }

    // If no alternative found, notify and advance to next track
    window.dispatchEvent(new CustomEvent('aurawave:notification', {
      detail: { message: `"${track.title}" is restricted from embedding. Playing next...`, type: 'warning' }
    }));

    setTimeout(() => {
      this.next(false);
    }, 1500);
  }

  startYtTicker() {
    this.stopYtTicker();
    this.ytTicker = setInterval(() => {
      if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || (this.currentTrack ? this.currentTrack.durationSec : 0) || 0;
        const pct = dur > 0 ? (cur / dur) * 100 : 0;
        if (this.onTimeUpdate) {
          this.onTimeUpdate({
            currentTime: cur,
            duration: dur,
            percent: pct,
            progress: pct,
            currentTimeFormatted: this.formatTime(cur),
            durationFormatted: this.formatTime(dur)
          });
        }
      }
    }, 250);
  }

  stopYtTicker() {
    if (this.ytTicker) {
      clearInterval(this.ytTicker);
      this.ytTicker = null;
    }
  }

  /**
   * Bind Native HTML5 Audio Events
   */
  bindAudioEvents() {
    const a = this.audio;

    a.addEventListener('play', () => {
      if (this.activeEngine === 'audio') {
        this.isPlaying = true;

    // Resume AudioContext for Equalizer if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (_) {}
    }
        if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
      }
    });

    a.addEventListener('playing', () => {
      if (this.activeEngine === 'audio') {
        this.isPlaying = true;

    // Resume AudioContext for Equalizer if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (_) {}
    }
        if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
      }
    });

    a.addEventListener('pause', () => {
      if (this.activeEngine === 'audio') {
        this.isPlaying = false;
        if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
      }
    });

    a.addEventListener('waiting', () => {
      if (this.activeEngine === 'audio') {
        if (this.onStateChange) this.onStateChange({ isPlaying: this.isPlaying, isBuffering: true });
      }
    });

    a.addEventListener('loadedmetadata', () => {
      if (this.activeEngine === 'audio') this._emitTimeUpdate();
    });

    a.addEventListener('durationchange', () => {
      if (this.activeEngine === 'audio') this._emitTimeUpdate();
    });

    a.addEventListener('seeked', () => {
      if (this.activeEngine === 'audio') this._emitTimeUpdate();
    });

    a.addEventListener('timeupdate', () => {
      if (this.activeEngine === 'audio') this._emitTimeUpdate();
    });

    a.addEventListener('ended', () => {
      if (this.activeEngine === 'audio') this.handleTrackEnded();
    });

    a.addEventListener('error', (e) => {
      if (this.activeEngine === 'audio') {
        console.warn('[Ember] HTML5 Audio error, trying YouTube fallback:', e);
        this.handleAudioError();
      }
    });
  }

  handleTrackEnded() {
    if (this.sleepTimerEndOfSong) {
      this.cancelSleepTimer();
      this.pause();
      if (typeof window.showToast === 'function') {
        window.showToast('🌙 Sleep timer finished at the end of song. Goodnight!', 'info');
      }
      return;
    }
    if (this.repeatMode === 'one') {
      this.seekTo(0);
      this.play();
    } else {
      this.next(false); // Autoplay advance
    }
  }

  async handleAudioError() {
    const track = this.currentTrack;
    if (!track) return;

    // Fall back to YouTube stream
    if (track.id && this.ytPlayer) {
      this.activeEngine = 'youtube';
      if (this.audio) this.audio.src = '';
      this.ytPlayer.loadVideoById(track.id);
      return;
    }

    setTimeout(() => {
      this.next(false);
    }, 1200);
  }

  /**
   * Load and play track
   */
  async loadTrack(track, autoPlay = true) {
    if (!track) return;

    if (typeof AuthManager !== 'undefined' && AuthManager.isGuest()) {
      this.pause();
      if (this.audio) this.audio.src = '';
      if (typeof window.openEmberAuthGate === 'function') {
        window.openEmberAuthGate('🔒 Sign in or create an account to stream music.');
      }
      return;
    }

    this.currentTrack = track;
    StorageManager.addRecentTrack(track);

    // Make sure track is in queue
    const existingIndex = this.queue.findIndex(t => 
      (t.id && track.id && t.id === track.id) || 
      (t.title === track.title && t.artist === track.artist)
    );
    if (existingIndex >= 0) {
      this.queueIndex = existingIndex;
    } else {
      this.queue.push(track);
      this.queueIndex = this.queue.length - 1;
      this.notifyQueueChange();
    }

    if (this.onTrackChange) this.onTrackChange(track);
    this.updateMediaSession(track);

    // Auto-resolve direct 320kbps CDN stream if missing (Spotube / BlackHole resolver)
    if (!track.audioUrl && track.title) {
      if (track.previewUrl && this.audio) {
        this.activeEngine = 'audio';
        this.audio.src = track.previewUrl;
        if (autoPlay) this.play();
      }

      try {
        const res = await fetch(`/api/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.track && data.track.audioUrl) {
            track.audioUrl = data.track.audioUrl;
            if (!track.thumbnail && data.track.thumbnail) track.thumbnail = data.track.thumbnail;

            // Seamlessly upgrade from preview to full 320kbps stream
            if (this.currentTrack && (this.currentTrack.id === track.id || this.currentTrack.title === track.title)) {
              const curTime = this.audio ? (this.audio.currentTime || 0) : 0;
              this.activeEngine = 'audio';
              if (this.audio) {
                this.audio.src = track.audioUrl;
                this.audio.currentTime = curTime;
                if (this.isPlaying) this.play();
              }
            }
          }
        }
      } catch (_) {}
    }

    // Engine Selection:
    // If track has direct audioUrl (e.g. from local server or CDN), use HTML5 audio.
    // Otherwise use YouTube IFrame player engine.
    if (track.audioUrl) {
      this.activeEngine = 'audio';
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try { this.ytPlayer.pauseVideo(); } catch (_) {}
      }
      this.stopYtTicker();

      if (this.audio.src !== track.audioUrl) {
        this.audio.src = track.audioUrl;
      }
      if (autoPlay) {
        this.play();
      } else {
        this.pause();
      }
    } else {
      this.activeEngine = 'youtube';
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
      }

      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        try {
          this.ytPlayer.setVolume(this.volume);
          if (autoPlay) {
            this.ytPlayer.loadVideoById(track.id);
            this.isPlaying = true;

    // Resume AudioContext for Equalizer if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (_) {}
    }
            this.startYtTicker();
          } else {
            this.ytPlayer.cueVideoById(track.id);
            this.isPlaying = false;
          }
        } catch (err) {
          console.warn('[Ember] loadVideoById error:', err);
        }
      } else {
        this.pendingYtTrack = { track, autoPlay };
        this.initYouTubePlayer();
      }
    }
  }

  play() {
    if (typeof AuthManager !== 'undefined' && AuthManager.isGuest()) {
      this.pause();
      if (this.audio) this.audio.src = '';
      if (typeof window.openEmberAuthGate === 'function') {
        window.openEmberAuthGate('🔒 Sign in or create an account to stream music.');
      }
      return;
    }

    this.isPlaying = true;

    // Resume AudioContext for Equalizer if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (_) {}
    }
    if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      try {
        this.ytPlayer.playVideo();
        this.startYtTicker();
      } catch (err) {
        console.warn('[Ember] YouTube play error:', err);
      }
    } else if (this.audio && this.audio.src) {
      const p = this.audio.play();
      if (p !== undefined) {
        p.catch(err => {
          console.log('[Ember] HTML5 Audio play prevented:', err);
          this.isPlaying = false;
          if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
        });
      }
    }

    if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
  }

  pause() {
    this.isPlaying = false;
    if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
        this.stopYtTicker();
      } catch (_) {}
    } else if (this.audio) {
      this.audio.pause();
    }

    if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
  }

  togglePlay() {
    if (typeof AuthManager !== 'undefined' && AuthManager.isGuest()) {
      this.pause();
      if (this.audio) this.audio.src = '';
      if (typeof window.openEmberAuthGate === 'function') {
        window.openEmberAuthGate('🔒 Sign in or create an account to stream music.');
      }
      return;
    }

    if (this.isPlaying) {
      this.pause();
    } else {
      if (!this.currentTrack && this.queue.length > 0) {
        this.loadTrack(this.queue[0], true);
      } else {
        this.play();
      }
    }
  }

  async next(manual = true) {
    if (this.queue.length === 0) return;

    if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex++;
      this.loadTrack(this.queue[this.queueIndex], true);
      // Pre-fetch infinite flow if listener reaches the last song
      if (this.infiniteAutoplay && this.queueIndex === this.queue.length - 1) {
        this.fetchAutoplayRecommendations(this.queue[this.queueIndex]);
      }
    } else {
      // Reached the end of queue - trigger Smart Infinite Autoplay
      if (this.infiniteAutoplay) {
        const added = await this.fetchAutoplayRecommendations(this.currentTrack);
        if (added && added.length > 0 && this.queueIndex < this.queue.length - 1) {
          this.queueIndex++;
          this.loadTrack(this.queue[this.queueIndex], true);
          return;
        }
      }

      if (this.repeatMode === 'all' || manual) {
        this.queueIndex = 0;
        this.loadTrack(this.queue[0], true);
      } else {
        this.pause();
        this.isPlaying = false;
        if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
      }
    }
  }

  /**
   * Smart Infinite Autoplay (Ember Flow)
   * Automatically discovers and appends similar tracks when queue reaches the end.
   */
  async fetchAutoplayRecommendations(track) {
    if (this.isFetchingAutoplay || !this.infiniteAutoplay) return [];
    this.isFetchingAutoplay = true;

    try {
      const artist = track?.artist || track?.channelTitle || '';
      let targetQuery = '';
      if (typeof cleanArtistName === 'function' && artist) {
        targetQuery = cleanArtistName(artist, track?.title);
      } else {
        targetQuery = artist || track?.title || 'Trending Hits';
      }

      let candidates = [];
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(targetQuery)}&filter=songs&n=15`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.results && data.results.length > 0) {
            candidates = data.results;
          }
        }
      } catch (err) {
        console.warn('[Ember] Autoplay search fallback:', err);
      }

      if (candidates.length === 0) {
        try {
          const res = await fetch('/api/trending');
          if (res.ok) {
            const data = await res.json();
            if (data && data.results) candidates = data.results;
          }
        } catch (_) {}
      }

      // Filter out songs already in the queue or current track
      const existingIds = new Set(this.queue.map(t => String(t.id)));
      if (this.currentTrack) existingIds.add(String(this.currentTrack.id));

      const newTracks = candidates.filter(t => t && t.id && !existingIds.has(String(t.id)));

      if (newTracks.length > 0) {
        const toAppend = newTracks.slice(0, 8);
        this.queue.push(...toAppend);
        this.notifyQueueChange();
        if (typeof showToast === 'function') {
          showToast(`♾️ Ember Flow: Added ${toAppend.length} similar songs based on ${targetQuery}`, 'info');
        }
        return toAppend;
      }
    } catch (err) {
      console.warn('[Ember] Failed to fetch autoplay flow:', err);
    } finally {
      this.isFetchingAutoplay = false;
    }
    return [];
  }

  setInfiniteAutoplay(enable) {
    this.infiniteAutoplay = !!enable;
    StorageManager.saveSettings({ infiniteAutoplay: this.infiniteAutoplay });
    return this.infiniteAutoplay;
  }

  previous(forceTrackChange = true) {
    if (this.queue.length === 0) return;

    if (!forceTrackChange && this.currentTime > 3) {
      this.seekTo(0);
      return;
    }

    if (this.queueIndex > 0) {
      this.queueIndex--;
    } else {
      this.queueIndex = this.queue.length - 1;
    }
    this.loadTrack(this.queue[this.queueIndex], true);
  }

  prev(forceTrackChange = true) {
    this.previous(forceTrackChange);
  }

  _emitTimeUpdate() {
    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (this.onTimeUpdate) {
      this.onTimeUpdate({
        currentTime,
        duration,
        percent,
        progress: percent,
        currentTimeFormatted: this.formatTime(currentTime),
        durationFormatted: this.formatTime(duration)
      });
    }
  }

  getDuration() {
    if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      const d = this.ytPlayer.getDuration();
      if (d && !isNaN(d) && d > 0) return d;
    }
    if (this.audio && !isNaN(this.audio.duration) && isFinite(this.audio.duration) && this.audio.duration > 0) {
      return this.audio.duration;
    }
    return (this.currentTrack && this.currentTrack.durationSec) ? this.currentTrack.durationSec : 0;
  }

  getCurrentTime() {
    if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      const c = this.ytPlayer.getCurrentTime();
      if (c !== undefined && !isNaN(c)) return c;
    }
    return (this.audio && !isNaN(this.audio.currentTime)) ? this.audio.currentTime : 0;
  }

  get duration() {
    return this.getDuration();
  }

  get currentTime() {
    return this.getCurrentTime();
  }

  seekTo(seconds) {
    const dur = this.getDuration();
    const targetSec = dur > 0 ? Math.max(0, Math.min(seconds, dur)) : Math.max(0, seconds);

    if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      try {
        this.ytPlayer.seekTo(targetSec, true);
      } catch (err) {
        console.warn('[Ember] YouTube Seek error:', err);
      }
    } else if (this.audio) {
      try {
        this.audio.currentTime = targetSec;
      } catch (err) {
        console.warn('[Ember] HTML5 Audio Seek error:', err);
      }
    }

    this._emitTimeUpdate();
  }

  seekPercent(percent) {
    const duration = this.getDuration();
    if (duration > 0) {
      const targetSec = (Math.max(0, Math.min(100, percent)) / 100) * duration;
      this.seekTo(targetSec);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
    StorageManager.saveSettings({ volume: this.volume });

    if (this.audio) {
      this.audio.volume = this.volume / 100;
    }
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(this.volume);
      } catch (_) {}
    }

    if (this.isMuted && this.volume > 0) {
      this.isMuted = false;
      if (this.audio) this.audio.muted = false;
      if (this.ytPlayer && typeof this.ytPlayer.unMute === 'function') {
        try { this.ytPlayer.unMute(); } catch (_) {}
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
    }
    if (this.ytPlayer) {
      try {
        if (this.isMuted && typeof this.ytPlayer.mute === 'function') {
          this.ytPlayer.mute();
        } else if (!this.isMuted && typeof this.ytPlayer.unMute === 'function') {
          this.ytPlayer.unMute();
        }
      } catch (_) {}
    }
    return this.isMuted;
  }

  toggleRepeat() {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'off';
    }
    StorageManager.saveSettings({ repeat: this.repeatMode });
    return this.repeatMode;
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    StorageManager.saveSettings({ shuffle: this.isShuffled });

    if (this.isShuffled) {
      this.originalQueue = [...this.queue];
      const cur = this.currentTrack;
      const rest = this.queue.filter(t => t.id !== (cur ? cur.id : null));
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      this.queue = cur ? [cur, ...rest] : rest;
      this.queueIndex = 0;
    } else {
      if (this.originalQueue.length > 0) {
        const cur = this.currentTrack;
        this.queue = [...this.originalQueue];
        this.queueIndex = cur ? this.queue.findIndex(t => t.id === cur.id) : 0;
      }
    }

    this.notifyQueueChange();
    return this.isShuffled;
  }

  setQueue(trackList, startIndex = 0, autoPlay = true) {
    if (!trackList || trackList.length === 0) return;
    if (typeof AuthManager !== 'undefined' && AuthManager.isGuest() && autoPlay) {
      this.pause();
      if (this.audio) this.audio.src = '';
      if (typeof window.openEmberAuthGate === 'function') {
        window.openEmberAuthGate('🔒 Sign in or create an account to stream music.');
      }
      return;
    }
    this.queue = [...trackList];
    this.originalQueue = [...trackList];
    this.queueIndex = Math.max(0, Math.min(trackList.length - 1, startIndex));
    this.notifyQueueChange();
    this.loadTrack(this.queue[this.queueIndex], autoPlay);
  }

  addToQueue(track) {
    if (!track) return;
    const wasEmpty = this.queue.length === 0 && !this.currentTrack;
    this.queue.push(track);
    this.originalQueue.push(track);
    if (wasEmpty) {
      this.queueIndex = 0;
      this.loadTrack(track, false);
    }
    this.notifyQueueChange();
  }

  playNext(track) {
    if (!track) return;
    if (this.queue.length === 0 || !this.currentTrack) {
      this.loadTrack(track, true);
      return;
    }
    const nextIdx = Math.max(0, this.queueIndex + 1);
    this.queue.splice(nextIdx, 0, track);
    this.originalQueue.push(track);
    this.notifyQueueChange();
  }

  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.queue.splice(index, 1);
    if (index < this.queueIndex) {
      this.queueIndex--;
    } else if (index === this.queueIndex) {
      if (this.queue.length > 0) {
        if (this.queueIndex >= this.queue.length) this.queueIndex = 0;
        this.loadTrack(this.queue[this.queueIndex], this.isPlaying);
      } else {
        this.currentTrack = null;
        this.pause();
        if (this.onTrackChange) this.onTrackChange(null);
      }
    }
    this.notifyQueueChange();
  }

  clearQueue() {
    const cur = this.currentTrack;
    this.queue = cur ? [cur] : [];
    this.queueIndex = cur ? 0 : -1;
    this.notifyQueueChange();
  }

  notifyQueueChange() {
    if (this.onQueueChange) {
      this.onQueueChange(this.queue, this.queueIndex);
    }
  }

  updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Artist',
        album: track.album || 'Ember Music',
        artwork: [
          { src: track.thumbnail || 'assets/images/ember_banner.jpg', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seekTo(details.seekTime);
      });
    } catch (_) {}
  }

  reorderQueue(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.queue.length || toIndex < 0 || toIndex >= this.queue.length) return;
    const curTrack = this.currentTrack;
    const [moved] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, moved);
    if (curTrack) {
      this.queueIndex = this.queue.findIndex(t =>
        (t.id && curTrack.id && t.id === curTrack.id) ||
        (t.title === curTrack.title && t.artist === curTrack.artist)
      );
    }
    this.notifyQueueChange();
  }

  // ==========================================
  // Web Audio API 5-Band Interactive Equalizer
  // ==========================================
  initAudioContext() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        try { this.audioCtx.resume(); } catch (_) {}
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx();

      this.eqFilters = this.eqFrequencies.map((freq, idx) => {
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = this.eqTypes[idx];
        filter.frequency.value = freq;
        filter.gain.value = this.eqEnabled ? this.eqBands[idx] : 0;
        if (filter.type === 'peaking') filter.Q.value = 1.0;
        return filter;
      });

      this.eqMasterGain = this.audioCtx.createGain();
      this.eqMasterGain.gain.value = 1.0;

      if (!this.audioSourceNode && this.audio) {
        try {
          this.audio.crossOrigin = 'anonymous';
          this.audioSourceNode = this.audioCtx.createMediaElementSource(this.audio);
          let lastNode = this.audioSourceNode;
          this.eqFilters.forEach(f => {
            lastNode.connect(f);
            lastNode = f;
          });
          lastNode.connect(this.eqMasterGain);
          this.eqMasterGain.connect(this.audioCtx.destination);
        } catch (srcErr) {
          console.warn('[Ember EQ] Audio element routing:', srcErr);
        }
      }
    } catch (err) {
      console.warn('[Ember EQ] AudioContext error:', err);
    }
  }

  setEqBandGain(index, gainDb) {
    if (index < 0 || index >= this.eqBands.length) return;
    const clampedGain = Math.max(-12, Math.min(12, Math.round(gainDb)));
    this.eqBands[index] = clampedGain;
    this.eqPreset = 'Custom';

    this.initAudioContext();
    if (this.eqFilters[index] && this.audioCtx) {
      const targetGain = this.eqEnabled ? clampedGain : 0;
      try {
        this.eqFilters[index].gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.05);
      } catch (_) {
        this.eqFilters[index].gain.value = targetGain;
      }
    }

    if (typeof StorageManager !== 'undefined' && StorageManager.setEqSettings) {
      StorageManager.setEqSettings({
        enabled: this.eqEnabled,
        preset: this.eqPreset,
        bands: [...this.eqBands]
      });
    }
  }

  applyEqPreset(presetName) {
    if (!this.eqPresets[presetName]) return;
    this.eqPreset = presetName;
    this.eqBands = [...this.eqPresets[presetName]];

    this.initAudioContext();
    this.eqFilters.forEach((filter, idx) => {
      if (filter && this.audioCtx) {
        const targetGain = this.eqEnabled ? this.eqBands[idx] : 0;
        try {
          filter.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.05);
        } catch (_) {
          filter.gain.value = targetGain;
        }
      }
    });

    if (typeof StorageManager !== 'undefined' && StorageManager.setEqSettings) {
      StorageManager.setEqSettings({
        enabled: this.eqEnabled,
        preset: this.eqPreset,
        bands: [...this.eqBands]
      });
    }
  }

  setEqEnabled(enabled) {
    this.eqEnabled = !!enabled;
    this.initAudioContext();
    this.eqFilters.forEach((filter, idx) => {
      if (filter && this.audioCtx) {
        const targetGain = this.eqEnabled ? this.eqBands[idx] : 0;
        try {
          filter.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.05);
        } catch (_) {
          filter.gain.value = targetGain;
        }
      }
    });

    if (typeof StorageManager !== 'undefined' && StorageManager.setEqSettings) {
      StorageManager.setEqSettings({
        enabled: this.eqEnabled,
        preset: this.eqPreset,
        bands: [...this.eqBands]
      });
    }
  }

  getEqSettings() {
    return {
      enabled: this.eqEnabled,
      preset: this.eqPreset,
      bands: [...this.eqBands]
    };
  }

  // ==========================================
  // Sleep Timer with Gentle 5s Fade-Out
  // ==========================================
  startSleepTimer(minutes, endOfSong = false) {
    this.cancelSleepTimer(false);

    if (endOfSong) {
      this.sleepTimerEndOfSong = true;
      this.sleepTimerSecondsRemaining = 0;
      this._emitSleepTimerTick();
      if (typeof window.showToast === 'function') {
        window.showToast('🌙 Sleep timer active: Music will pause after this song', 'info');
      }
      return;
    }

    const totalSeconds = Math.max(1, Math.round(minutes * 60));
    this.sleepTimerSecondsRemaining = totalSeconds;
    this.sleepTimerEndOfSong = false;
    this._emitSleepTimerTick();

    if (typeof window.showToast === 'function') {
      window.showToast(`🌙 Sleep timer set for ${minutes} min`, 'info');
    }

    const initialVolume = this.volume;

    this.sleepTimerTicker = setInterval(() => {
      if (this.sleepTimerSecondsRemaining > 0) {
        this.sleepTimerSecondsRemaining--;
        this._emitSleepTimerTick();

        // Smooth 5-second fade-out before pausing
        if (this.sleepTimerSecondsRemaining <= 5 && this.sleepTimerSecondsRemaining > 0) {
          const fadeFactor = this.sleepTimerSecondsRemaining / 5;
          const fadedVol = Math.max(0, Math.min(1, (initialVolume / 100) * fadeFactor));
          if (this.audio) this.audio.volume = fadedVol;
          if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
            try { this.ytPlayer.setVolume(Math.round(fadedVol * 100)); } catch (_) {}
          }
        }

        if (this.sleepTimerSecondsRemaining <= 0) {
          this.cancelSleepTimer(false);
          this.pause();
          this.setVolume(initialVolume);
          if (typeof window.showToast === 'function') {
            window.showToast('🌙 Sleep timer finished. Goodnight!', 'info');
          }
        }
      }
    }, 1000);
  }

  cancelSleepTimer(notify = true) {
    if (this.sleepTimerTicker) {
      clearInterval(this.sleepTimerTicker);
      this.sleepTimerTicker = null;
    }
    this.sleepTimerSecondsRemaining = 0;
    this.sleepTimerEndOfSong = false;
    this.setVolume(this.volume);
    if (notify) {
      this._emitSleepTimerTick();
      if (typeof window.showToast === 'function') {
        window.showToast('🌙 Sleep timer turned off', 'info');
      }
    }
  }

  getSleepTimerStatus() {
    return {
      isActive: this.sleepTimerSecondsRemaining > 0 || this.sleepTimerEndOfSong,
      remainingSeconds: this.sleepTimerSecondsRemaining,
      endOfSong: this.sleepTimerEndOfSong
    };
  }

  _emitSleepTimerTick() {
    const detail = this.getSleepTimerStatus();
    if (typeof this.onSleepTimerTick === 'function') {
      this.onSleepTimerTick(detail);
    }
    window.dispatchEvent(new CustomEvent('ember:sleeptimer', { detail }));
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Global hook for YouTube IFrame API callback
window.onYouTubeIframeAPIReady = function() {
  if (window.emberPlayer) {
    window.emberPlayer.initYouTubePlayer();
  }
};
