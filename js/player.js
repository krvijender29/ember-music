/**
 * EMBER - High-Speed Native HTML5 Audio Engine
 * Ultra-fast direct CDN streaming (< 200ms loading)
 * Full hardware media keys & lockscreen integration via MediaSession API
 * Supports instant byte-range timeline seeking and seamless queue management.
 */

class MusicPlayer {
  constructor() {
    this.audio = document.getElementById('ember-audio-player') || new Audio();
    this.audio.preload = 'auto';
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
    this.isVideoVisible = false;

    // Callbacks
    this.onTrackChange = null;
    this.onStateChange = null;
    this.onTimeUpdate = null;
    this.onQueueChange = null;

    this.bindAudioEvents();
    console.log('[Ember] High-Speed HTML5 Audio Engine initialized.');
  }

  /**
   * Bind Native HTML5 Audio Events
   */
  bindAudioEvents() {
    const a = this.audio;

    a.addEventListener('play', () => {
      this.isPlaying = true;
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
    });

    a.addEventListener('playing', () => {
      this.isPlaying = true;
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
    });

    a.addEventListener('pause', () => {
      this.isPlaying = false;
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
    });

    a.addEventListener('waiting', () => {
      if (this.onStateChange) this.onStateChange({ isPlaying: this.isPlaying, isBuffering: true });
    });

    a.addEventListener('loadedmetadata', () => {
      this._emitTimeUpdate();
    });

    a.addEventListener('durationchange', () => {
      this._emitTimeUpdate();
    });

    a.addEventListener('seeked', () => {
      this._emitTimeUpdate();
    });

    a.addEventListener('timeupdate', () => {
      this._emitTimeUpdate();
    });

    a.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    a.addEventListener('error', (e) => {
      console.warn('[Ember] Audio stream error:', e);
      this.handleAudioError();
    });
  }

  handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.seekTo(0);
      this.play();
    } else {
      this.next(false); // auto-advance
    }
  }

  async handleAudioError() {
    const track = this.currentTrack;
    if (!track) return;

    window.dispatchEvent(new CustomEvent('aurawave:notification', {
      detail: { message: `Re-resolving stream for "${track.title}"...`, type: 'warning' }
    }));

    try {
      if (typeof YouTubeAPI !== 'undefined' && YouTubeAPI.resolveTrackStream) {
        const freshUrl = await YouTubeAPI.resolveTrackStream(track, true);
        if (freshUrl && freshUrl !== this.audio.src) {
          this.audio.src = freshUrl;
          this.play();
          return;
        }
      }
    } catch (err) {
      console.warn('[Ember] Stream re-resolution failed:', err);
    }

    window.dispatchEvent(new CustomEvent('aurawave:notification', {
      detail: { message: `Cannot play "${track.title}". Skipping to next...`, type: 'warning' }
    }));

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

    // Resolve direct audio stream if not yet populated
    let streamUrl = track.audioUrl;
    if (!streamUrl && typeof YouTubeAPI !== 'undefined' && YouTubeAPI.resolveTrackStream) {
      streamUrl = await YouTubeAPI.resolveTrackStream(track);
      if (streamUrl) {
        track.audioUrl = streamUrl;
      }
    }

    if (streamUrl) {
      if (this.audio.src !== streamUrl) {
        this.audio.src = streamUrl;
      }
      if (autoPlay) {
        this.play();
      } else {
        this.pause();
      }
    } else {
      console.warn('[Ember] No stream URL found for track:', track.title);
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

    if (this.audio && this.audio.src) {
      const p = this.audio.play();
      if (p !== undefined) {
        p.catch(err => {
          console.log('[Ember] Play request deferred/prevented:', err);
          this.isPlaying = false;
          if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
        });
      }
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
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

  next(manual = true) {
    if (this.queue.length === 0) return;

    if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex++;
      this.loadTrack(this.queue[this.queueIndex], true);
    } else {
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

  previous(forceTrackChange = true) {
    if (this.queue.length === 0) return;

    // If more than 3 seconds played and caller didn't force track change, restart current track
    if (!forceTrackChange && this.audio && this.audio.currentTime > 3) {
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
    if (this.audio && !isNaN(this.audio.duration) && isFinite(this.audio.duration) && this.audio.duration > 0) {
      return this.audio.duration;
    }
    return (this.currentTrack && this.currentTrack.durationSec) ? this.currentTrack.durationSec : 0;
  }

  getCurrentTime() {
    return (this.audio && !isNaN(this.audio.currentTime)) ? this.audio.currentTime : 0;
  }

  get duration() {
    return this.getDuration();
  }

  get currentTime() {
    return this.getCurrentTime();
  }

  seekTo(seconds) {
    if (this.audio) {
      const duration = this.getDuration();
      const targetSec = duration > 0 ? Math.max(0, Math.min(seconds, duration)) : Math.max(0, seconds);
      try {
        this.audio.currentTime = targetSec;
      } catch (err) {
        console.warn('[Ember] Seek error:', err);
      }
      this._emitTimeUpdate();
      if (this.isPlaying && this.audio.paused) {
        this.play();
      }
    }
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
      if (this.isMuted && this.volume > 0) {
        this.isMuted = false;
        this.audio.muted = false;
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
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
      // Fisher-Yates shuffle
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
    this.queue.push(track);
    this.originalQueue.push(track);
    this.notifyQueueChange();
  }

  playNext(track) {
    if (!track) return;
    if (this.queue.length === 0) {
      this.loadTrack(track, true);
      return;
    }
    this.queue.splice(this.queueIndex + 1, 0, track);
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
          { src: track.thumbnail || 'assets/images/ember_midnight.jpg', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seekTo(details.seekTime);
      });
    } catch (e) {
      // Ignored
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
