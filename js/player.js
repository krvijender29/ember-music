/**
 * AuraWave Music - YouTube IFrame Player Engine
 * Orchestrates audio playback, queue management, repeat/shuffle logic,
 * embeds handling, and time scrubbing.
 */

class MusicPlayer {
  constructor() {
    this.ytPlayer = null;
    this.isReady = false;
    this.currentTrack = null;
    this.queue = [];
    this.originalQueue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = StorageManager.getSettings().volume ?? 80;
    this.repeatMode = StorageManager.getSettings().repeat ?? 'all'; // 'off' | 'all' | 'one'
    this.isShuffled = StorageManager.getSettings().shuffle ?? false;
    this.tickerInterval = null;
    this.isVideoVisible = false;
    this.retriedFallbacks = new Set();

    // Callbacks
    this.onTrackChange = null;
    this.onStateChange = null;
    this.onTimeUpdate = null;
    this.onQueueChange = null;

    this.initYouTubeIFrameAPI();
  }

  /**
   * Load the YouTube IFrame API script tag dynamically
   */
  initYouTubeIFrameAPI() {
    if (window.YT && window.YT.Player) {
      this.createPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.createPlayer();
    };
  }

  /**
   * Instantiate YT.Player in #yt-player-target
   */
  createPlayer() {
    try {
      this.ytPlayer = new YT.Player('yt-player-target', {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => this.handlePlayerReady(event),
          onStateChange: (event) => this.handlePlayerStateChange(event),
          onError: (event) => this.handlePlayerError(event)
        }
      });
    } catch (e) {
      console.error('Error creating YouTube player instance', e);
    }
  }

  handlePlayerReady(event) {
    this.isReady = true;
    this.ytPlayer.setVolume(this.volume);
    console.log('YouTube IFrame Player Ready');

    // Preload first track if queue has items
    if (this.queue.length > 0 && this.queueIndex >= 0) {
      const track = this.queue[this.queueIndex];
      this.currentTrack = track;
      this.ytPlayer.cueVideoById(track.id);
      if (this.onTrackChange) this.onTrackChange(track);
    }
  }

  handlePlayerStateChange(event) {
    // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
    if (event.data === YT.PlayerState.PLAYING) {
      this.isPlaying = true;
      this.startProgressTicker();
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isBuffering: false });
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.isPlaying = false;
      this.stopProgressTicker();
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
    } else if (event.data === YT.PlayerState.BUFFERING) {
      if (this.onStateChange) this.onStateChange({ isPlaying: this.isPlaying, isBuffering: true });
    } else if (event.data === YT.PlayerState.ENDED) {
      this.handleTrackEnded();
    }
  }

  handleTrackEnded() {
    this.stopProgressTicker();
    if (this.repeatMode === 'one') {
      this.seekTo(0);
      this.play();
    } else {
      this.next(false); // auto-advance
    }
  }

  async handlePlayerError(event) {
    console.warn('YouTube Player Error code:', event.data);
    const track = this.currentTrack;

    // Error 101 or 150: The video owner does not allow embedding
    if ((event.data === 101 || event.data === 150) && track && !this.retriedFallbacks.has(track.id)) {
      this.retriedFallbacks.add(track.id);

      window.dispatchEvent(new CustomEvent('aurawave:notification', {
        detail: { message: `Finding alternative audio stream for "${track.title}"...`, type: 'warning' }
      }));

      const alt = await YouTubeAPI.findEmbeddableAlternative(track.title, track.artist, track.id);
      if (alt && alt.id) {
        if (this.queue[this.queueIndex]) {
          this.queue[this.queueIndex].id = alt.id;
        }
        this.currentTrack.id = alt.id;

        window.dispatchEvent(new CustomEvent('aurawave:notification', {
          detail: { message: `Playing alternate stream for "${track.title}"!`, type: 'success' }
        }));

        this.ytPlayer.loadVideoById(alt.id);
        this.play();
        return;
      }
    }

    let errorMsg = 'Error playing video.';
    if (event.data === 101 || event.data === 150) {
      errorMsg = 'Cannot embed this video due to copyright settings. Skipping...';
    } else if (event.data === 100) {
      errorMsg = 'Video not found or removed. Skipping...';
    }

    window.dispatchEvent(new CustomEvent('aurawave:notification', {
      detail: { message: errorMsg, type: 'warning' }
    }));

    // Auto-skip to next track after 1.2s
    setTimeout(() => {
      this.next(false);
    }, 1200);
  }

  /**
   * Load and play track
   */
  loadTrack(track, autoPlay = true) {
    if (!track || !track.id) return;
    this.currentTrack = track;
    StorageManager.addRecentTrack(track);

    // Make sure track is in queue
    const existingIndex = this.queue.findIndex(t => t.id === track.id);
    if (existingIndex >= 0) {
      this.queueIndex = existingIndex;
    } else {
      this.queue.push(track);
      this.queueIndex = this.queue.length - 1;
      this.notifyQueueChange();
    }

    if (this.onTrackChange) this.onTrackChange(track);

    if (this.isReady && this.ytPlayer) {
      if (autoPlay) {
        this.ytPlayer.loadVideoById(track.id);
        this.isPlaying = true;
      } else {
        this.ytPlayer.cueVideoById(track.id);
        this.isPlaying = false;
      }
    }
  }

  play() {
    if (this.isReady && this.ytPlayer) {
      this.ytPlayer.playVideo();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.isReady && this.ytPlayer) {
      this.ytPlayer.pauseVideo();
      this.isPlaying = false;
    }
  }

  togglePlay() {
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
      if (this.repeatMode === 'all') {
        this.queueIndex = 0;
        this.loadTrack(this.queue[0], true);
      } else if (manual) {
        // If manual next at end, loop back
        this.queueIndex = 0;
        this.loadTrack(this.queue[0], true);
      } else {
        this.pause();
        this.isPlaying = false;
        if (this.onStateChange) this.onStateChange({ isPlaying: false, isBuffering: false });
      }
    }
  }

  previous() {
    if (this.queue.length === 0) return;

    // If more than 3 seconds played, restart current track
    if (this.isReady && this.ytPlayer && this.ytPlayer.getCurrentTime() > 3) {
      this.seekTo(0);
      return;
    }

    if (this.queueIndex > 0) {
      this.queueIndex--;
      this.loadTrack(this.queue[this.queueIndex], true);
    } else {
      this.queueIndex = this.queue.length - 1;
      this.loadTrack(this.queue[this.queueIndex], true);
    }
  }

  seekTo(seconds) {
    if (this.isReady && this.ytPlayer) {
      this.ytPlayer.seekTo(seconds, true);
    }
  }

  seekPercent(percent) {
    if (this.isReady && this.ytPlayer) {
      const duration = this.ytPlayer.getDuration() || (this.currentTrack ? this.currentTrack.durationSec : 0);
      if (duration > 0) {
        const targetSec = (percent / 100) * duration;
        this.seekTo(targetSec);
      }
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
    StorageManager.saveSettings({ volume: this.volume });
    if (this.isReady && this.ytPlayer) {
      this.ytPlayer.setVolume(this.volume);
      if (this.isMuted && this.volume > 0) {
        this.isMuted = false;
        this.ytPlayer.unMute();
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isReady && this.ytPlayer) {
      if (this.isMuted) {
        this.ytPlayer.mute();
      } else {
        this.ytPlayer.unMute();
      }
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

  startProgressTicker() {
    this.stopProgressTicker();
    this.tickerInterval = setInterval(() => {
      if (!this.isReady || !this.ytPlayer) return;
      try {
        const currentTime = this.ytPlayer.getCurrentTime() || 0;
        const duration = this.ytPlayer.getDuration() || (this.currentTrack ? this.currentTrack.durationSec : 0);
        const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

        if (this.onTimeUpdate) {
          this.onTimeUpdate({
            currentTime,
            duration,
            percent,
            currentTimeFormatted: this.formatTime(currentTime),
            durationFormatted: this.formatTime(duration)
          });
        }
      } catch (err) {
        // Ignored
      }
    }, 250);
  }

  stopProgressTicker() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
