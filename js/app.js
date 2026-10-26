/**
 * EMBER - MUSIC FOR EVERY MOOD
 * Master Application Controller
 * Handles mobile & desktop viewport views, live streaming playback state,
 * Firebase Authentication, Supabase PostgreSQL persistence, and Now Playing drawer.
 */

async function initApp() {
  try {
  // Initialize Core Player Engine
  const player = new MusicPlayer();
  window.player = player;
  window.emberPlayer = player;

  // Application State
  const state = {
    currentTab: 'home',
    previousTab: 'home',
    activePlaylistId: null,
    searchFilter: 'all',
    searchQuery: '',
    searchDebounceTimer: null,
    historyLogTimer: null,
    isVideoMode: false,
    selectedGenres: new Set(),
    selectedArtists: new Set()
  };

  // DOM Elements Cache
  const el = {
    viewport: document.getElementById('ember-main-viewport'),
    brandHomeBtn: document.getElementById('brand-home-btn'),
    btnHeaderBell: document.getElementById('btn-header-bell'),
    btnHeaderProfile: document.getElementById('btn-header-profile'),
    headerAvatarInner: document.getElementById('header-avatar-inner'),
    navTabs: document.querySelectorAll('.nav-tab-item'),
    toastBox: document.getElementById('ember-toast-box'),

    // Mini Player
    miniPlayer: document.getElementById('mini-player-bar'),
    miniProgressLine: document.getElementById('mini-progress-line'),
    miniProgressFill: document.getElementById('mini-progress-fill'),
    miniTrackClickArea: document.getElementById('mini-track-click-area'),
    miniThumb: document.getElementById('mini-thumb'),
    miniTitle: document.getElementById('mini-title'),
    miniArtist: document.getElementById('mini-artist'),
    miniLikeBtn: document.getElementById('mini-like-btn'),
    miniPlayPauseBtn: document.getElementById('mini-play-pause-btn'),
    miniPlayIcon: document.getElementById('mini-play-icon'),
    miniPauseIcon: document.getElementById('mini-pause-icon'),
    miniNextBtn: document.getElementById('mini-next-btn'),

    // Fullscreen Sheet
    sheet: document.getElementById('now-playing-sheet'),
    btnSheetCollapse: document.getElementById('btn-sheet-collapse'),
    btnSheetOptions: document.getElementById('btn-sheet-options'),
    sheetArtwork: document.getElementById('sheet-artwork'),
    sheetTitle: document.getElementById('sheet-title'),
    sheetArtist: document.getElementById('sheet-artist'),
    sheetTimeline: document.getElementById('sheet-timeline'),
    sheetTimelineFill: document.getElementById('sheet-timeline-fill'),
    sheetTimelineHandle: document.getElementById('sheet-timeline-handle'),
    sheetTimeCur: document.getElementById('sheet-time-cur'),
    sheetTimeTot: document.getElementById('sheet-time-tot'),
    sheetShuffleBtn: document.getElementById('sheet-shuffle-btn'),
    sheetPrevBtn: document.getElementById('sheet-prev-btn'),
    sheetPlayPauseBtn: document.getElementById('sheet-play-pause-btn'),
    sheetPlayIcon: document.getElementById('sheet-play-icon'),
    sheetPauseIcon: document.getElementById('sheet-pause-icon'),
    sheetNextBtn: document.getElementById('sheet-next-btn'),
    sheetRepeatBtn: document.getElementById('sheet-repeat-btn'),
    sheetLikeBtn: document.getElementById('sheet-like-btn'),
    sheetToggleVideoBtn: document.getElementById('sheet-toggle-video-btn'),
    sheetQueueBtn: document.getElementById('sheet-queue-btn'),

    // Video Wrapper, Queue Modal & Create Playlist Modal
    ytWrapper: document.getElementById('yt-player-wrapper'),
    btnCloseVideo: document.getElementById('btn-close-video'),
    queueModal: document.getElementById('queue-modal'),
    btnCloseQueue: document.getElementById('btn-close-queue'),
    btnClearQueue: document.getElementById('btn-clear-queue'),
    queueModalList: document.getElementById('queue-modal-list'),
    createPlaylistModal: document.getElementById('create-playlist-modal'),
    newPlaylistTitleInput: document.getElementById('new-playlist-title'),
    btnCancelCreatePl: document.getElementById('btn-cancel-create-pl'),
    btnConfirmCreatePl: document.getElementById('btn-confirm-create-pl'),

    // Desktop Sidebar & Top Header
    sidebarTabs: document.querySelectorAll('.sidebar-nav-item[data-tab]'),
    sidebarBrandBtn: document.getElementById('sidebar-brand-btn'),
    sidebarLikedBtn: document.getElementById('sidebar-liked-songs-btn'),
    sidebarCreatePlBtn: document.getElementById('sidebar-create-playlist-btn'),
    sidebarPlaylistsContainer: document.getElementById('sidebar-playlists-container'),
    sidebarUserFooter: document.getElementById('sidebar-user-footer'),
    sidebarUserAvatar: document.getElementById('sidebar-user-avatar'),
    sidebarUserName: document.getElementById('sidebar-user-name'),
    sidebarUserStatus: document.getElementById('sidebar-user-status'),
    desktopNavBack: document.getElementById('desktop-nav-back'),
    desktopTopSearchInput: document.getElementById('desktop-top-search-input'),

    // Desktop Center Player
    desktopPlayPauseBtn: document.getElementById('desktop-play-pause-btn'),
    desktopPlayIcon: document.getElementById('desktop-play-icon'),
    desktopPauseIcon: document.getElementById('desktop-pause-icon'),
    desktopPrevBtn: document.getElementById('desktop-prev-btn'),
    desktopNextBtn: document.getElementById('desktop-next-btn'),
    desktopShuffleBtn: document.getElementById('desktop-shuffle-btn'),
    desktopRepeatBtn: document.getElementById('desktop-repeat-btn'),
    desktopTimeline: document.getElementById('desktop-timeline'),
    desktopTimelineFill: document.getElementById('desktop-timeline-fill'),
    desktopTimelineHandle: document.getElementById('desktop-timeline-handle'),
    desktopTimeCur: document.getElementById('desktop-time-cur'),
    desktopTimeTot: document.getElementById('desktop-time-tot'),

    // Desktop Right Player
    desktopLikeBtn: document.getElementById('desktop-like-btn'),
    desktopVideoBtn: document.getElementById('desktop-video-btn'),
    desktopQueueBtn: document.getElementById('desktop-queue-btn'),
    desktopVolumeBtn: document.getElementById('desktop-volume-btn'),
    desktopVolIconHigh: document.getElementById('desktop-vol-icon-high'),
    desktopVolIconMuted: document.getElementById('desktop-vol-icon-muted'),
    desktopVolumeSlider: document.getElementById('desktop-volume-slider'),
    desktopExpandBtn: document.getElementById('desktop-expand-btn'),

    // Authentication Modals
    authModal: document.getElementById('auth-modal'),
    btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),
    tabAuthLogin: document.getElementById('tab-auth-login'),
    tabAuthSignup: document.getElementById('tab-auth-signup'),
    authAlertBox: document.getElementById('auth-alert-box'),
    btnGoogleAuth: document.getElementById('btn-google-auth'),
    authForm: document.getElementById('auth-form'),
    authNameGroup: document.getElementById('auth-name-group'),
    authNameInput: document.getElementById('auth-name-input'),
    authEmailInput: document.getElementById('auth-email-input'),
    authPasswordInput: document.getElementById('auth-password-input'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    btnShowForgotPw: document.getElementById('btn-show-forgot-pw'),
    btnGuestContinue: document.getElementById('btn-guest-continue'),
    authForgotView: document.getElementById('auth-forgot-view'),
    authResetEmailInput: document.getElementById('auth-reset-email-input'),
    btnSendResetLink: document.getElementById('btn-send-reset-link'),
    btnBackToLogin: document.getElementById('btn-back-to-login'),

    // Onboarding Modal
    onboardingModal: document.getElementById('onboarding-modal'),
    btnCloseOnboarding: document.getElementById('btn-close-onboarding'),
    onboardingGenrePills: document.getElementById('onboarding-genre-pills'),
    onboardingArtistInput: document.getElementById('onboarding-artist-input'),
    onboardingArtistTags: document.getElementById('onboarding-artist-tags'),
    btnSkipOnboarding: document.getElementById('btn-skip-onboarding'),
    btnSaveOnboarding: document.getElementById('btn-save-onboarding'),

    // Edit Profile Modal
    editProfileModal: document.getElementById('edit-profile-modal'),
    btnCloseEditProfile: document.getElementById('btn-close-edit-profile'),
    editProfileDisplayName: document.getElementById('edit-profile-display-name'),
    editProfileUsername: document.getElementById('edit-profile-username'),
    editProfileAvatarUrl: document.getElementById('edit-profile-avatar-url'),
    btnCancelProfile: document.getElementById('btn-cancel-profile'),
    btnSaveProfile: document.getElementById('btn-save-profile'),

    // Cloud Credentials Modal
    credentialsModal: document.getElementById('credentials-modal'),
    btnCloseCredentials: document.getElementById('btn-close-credentials'),
    cfgFirebaseJson: document.getElementById('cfg-firebase-json'),
    cfgSupabaseUrl: document.getElementById('cfg-supabase-url'),
    cfgSupabaseKey: document.getElementById('cfg-supabase-key'),
    btnClearCloudCfg: document.getElementById('btn-clear-cloud-cfg'),
    btnSaveCloudCfg: document.getElementById('btn-save-cloud-cfg')
  };

  /* ==========================================================================
     Helper Utilities
     ========================================================================== */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'ember-toast';

    const iconSvg = type === 'success'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    el.toastBox.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function getInitials(name) {
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function cleanArtistName(artist, title = '') {
    let name = artist || '';
    if (!name || name === 'Ember' || name === 'Ember Collective' || name === 'Ember Artist') {
      if (title && title.includes(' - ')) {
        const parts = title.split(' - ');
        if (parts[0] && parts[0].trim().length < 35) {
          name = parts[0].trim();
        }
      }
    }
    if (!name) return '';
    const primary = name.split(/\s*(?:,|\bfeat\.?\b|\bft\.?\b|\bx\b|&|\/|\bvs\.?\b)\s*/i)[0];
    return primary
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\bVEVO\b/i, '')
      .replace(/\s*Official.*$/i, '')
      .trim();
  }

  function createSongRowHtml(track, index = 0) {
    const isPlayingThis = player.currentTrack && player.currentTrack.id === track.id;
    const user = AuthManager.getCurrentUser();
    const isLiked = StorageManager.isSongLiked(track.id);
    const isCustomPlaylistView = state.currentTab === 'playlist';

    return `
      <div class="ember-song-row ${isPlayingThis ? 'playing' : ''}" data-track-id="${escapeHtml(track.id)}">
        <img class="song-row-thumb" src="${escapeHtml(track.thumbnail || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(track.title)}" loading="lazy">
        <div class="song-row-meta">
          <div class="song-row-title">${escapeHtml(track.title)}</div>
          <div class="song-row-artist">${escapeHtml(track.artist || track.channelTitle || 'Ember Artist')}</div>
        </div>
        <div class="song-row-actions">
          <button class="btn-row-action btn-row-like ${isLiked ? 'liked' : ''}" data-track-id="${escapeHtml(track.id)}" title="Like">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          ${isCustomPlaylistView ? `
            <button class="btn-row-action btn-row-remove-from-pl" data-track-id="${escapeHtml(track.id)}" title="Remove from Playlist" style="color:var(--text-dim); font-size:0.85rem;">
              ✕
            </button>
          ` : `
            <button class="btn-row-action btn-row-add-pl" data-track-id="${escapeHtml(track.id)}" title="Add to Playlist">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><line x1="19" y1="16" x2="19" y2="22"/><line x1="16" y1="19" x2="22" y2="19"/></svg>
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Plays a track selected from search, and fills the subsequent playback queue
   * with the user's listening history in shuffled order.
   */
  async function playSearchTrackWithShuffledHistory(selectedTrack, searchResults = []) {
    if (!selectedTrack) return;

    if (AuthManager.isGuest()) {
      openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
      return;
    }

    // 1. Concurrently fetch user listening history (Supabase + LocalStorage)
    const user = AuthManager.getCurrentUser();
    let dbHistory = [];
    try {
      if (user?.uid) {
        dbHistory = await DbManager.getListeningHistory(user.uid, 50);
      }
    } catch (_) {}
    const localHistory = StorageManager.getRecentTracks() || [];

    // Map local tracks by ID and title for fast resolution of audioUrl/metadata
    const localMap = new Map();
    localHistory.forEach(t => {
      if (t && t.id) localMap.set(t.id, t);
      if (t && t.title) localMap.set(t.title.trim().toLowerCase(), t);
    });

    // 2. Deduplicate history pool and exclude the currently selected track
    const selId = (selectedTrack.id || '').trim();
    const selTitle = (selectedTrack.title || '').trim().toLowerCase();
    const selArtist = (selectedTrack.artist || selectedTrack.channelTitle || '').trim().toLowerCase();
    const selComp = `${selTitle}:::${selArtist}`;

    const seen = new Set();
    if (selId) seen.add(`id:${selId}`);
    if (selTitle) seen.add(`title:${selComp}`);

    const pool = [];
    const allHistory = [...localHistory, ...dbHistory];

    for (const t of allHistory) {
      if (!t || !t.title) continue;
      const tId = (t.id || '').trim();
      const tTitle = (t.title || '').trim().toLowerCase();
      const tArtist = (t.artist || t.channelTitle || '').trim().toLowerCase();
      const tComp = `${tTitle}:::${tArtist}`;

      if (tId && seen.has(`id:${tId}`)) continue;
      if (tTitle && seen.has(`title:${tComp}`)) continue;

      if (tId) seen.add(`id:${tId}`);
      if (tTitle) seen.add(`title:${tComp}`);

      // Prefer local copy if it has audioUrl
      const localCopy = localMap.get(tId) || localMap.get(tTitle);
      const trackObj = (localCopy && localCopy.audioUrl) ? localCopy : t;
      pool.push(trackObj);
    }

    // 3. Fallback if user has no listening history yet: use other search results
    if (pool.length === 0 && Array.isArray(searchResults)) {
      searchResults.forEach(t => {
        if (!t || !t.title) return;
        const tId = (t.id || '').trim();
        const tTitle = (t.title || '').trim().toLowerCase();
        if ((tId && tId === selId) || (tTitle && tTitle === selTitle)) return;
        pool.push(t);
      });
    }

    // 4. Shuffle the pool using Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 5. Set player queue: [selectedTrack, ...shuffledHistory] and play
    const fullQueue = [selectedTrack, ...pool];
    player.setQueue(fullQueue, 0, true);

    showToast(`Playing "${selectedTrack.title}" · Up next: Shuffled history (${pool.length} tracks)`, 'info');
  }

  function bindSongRows(container, tracksList, options = {}) {
    if (!container) return;

    // Song row click -> play track (Mandatory Auth Protected)
    container.querySelectorAll('.ember-song-row').forEach(row => {
      if (row.dataset.rowBound) return;
      row.dataset.rowBound = 'true';

      row.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-row-like') || e.target.closest('.btn-row-add-pl') || e.target.closest('.btn-row-remove-from-pl')) return;

        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream this song on EMBER.', true);
          return;
        }

        const trackId = row.dataset.trackId;
        const selectedIndex = tracksList.findIndex(t => t.id === trackId);
        if (selectedIndex >= 0) {
          const selectedTrack = tracksList[selectedIndex];
          if (options.isSearch || state.currentTab === 'search') {
            await playSearchTrackWithShuffledHistory(selectedTrack, tracksList);
          } else {
            player.setQueue(tracksList, selectedIndex, true);
          }
        }
      });
    });

    // Song like button click (Mandatory Auth Protected)
    container.querySelectorAll('.btn-row-like').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to like and save songs.', true);
          return;
        }

        const trackId = btn.dataset.trackId;
        const targetTrack = tracksList.find(t => t.id === trackId) || (player.currentTrack?.id === trackId ? player.currentTrack : null);
        if (targetTrack) {
          const user = AuthManager.getCurrentUser();
          const isLikedNow = await DbManager.toggleLikeSong(user?.uid, targetTrack);
          btn.classList.toggle('liked', isLikedNow);
          const svg = btn.querySelector('svg');
          if (svg) svg.setAttribute('fill', isLikedNow ? 'currentColor' : 'none');

          if (player.currentTrack && player.currentTrack.id === trackId) {
            updateLikeIcons(isLikedNow);
          }

          if (!user) {
            showToast(isLikedNow ? `Liked! (Saved locally · Sign in to sync across devices)` : `Removed from Liked`, 'info');
          } else {
            showToast(isLikedNow ? `Added to Liked Songs` : `Removed from Liked Songs`, 'success');
          }
        }
      });
    });

    // Add to Playlist button click
    container.querySelectorAll('.btn-row-add-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to save songs to playlists.', true);
          return;
        }
        const trackId = btn.dataset.trackId;
        const targetTrack = tracksList.find(t => t.id === trackId) || (player.currentTrack?.id === trackId ? player.currentTrack : null);
        if (targetTrack) {
          openAddToPlaylistModal(targetTrack);
        }
      });
    });

    // Remove from playlist button click
    container.querySelectorAll('.btn-row-remove-from-pl').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.trackId;
        if (state.activePlaylistId && trackId) {
          await DbManager.removeTrackFromPlaylist(state.activePlaylistId, trackId);
          showToast('Removed from playlist', 'info');
          openPlaylistView(state.activePlaylistId);
          renderSidebarPlaylists();
        }
      });
    });
  }

  async function openAddToPlaylistModal(track) {
    const modal = document.getElementById('add-to-playlist-modal');
    const listContainer = document.getElementById('add-to-playlist-list');
    const closeBtn = document.getElementById('btn-close-add-to-pl');
    const createNewBtn = document.getElementById('btn-modal-create-new-pl');
    if (!modal || !listContainer) return;

    modal.style.display = 'flex';
    listContainer.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-gray); font-size:0.8rem;">Loading your playlists...</div>';

    closeBtn.onclick = () => { modal.style.display = 'none'; };
    createNewBtn.onclick = () => {
      modal.style.display = 'none';
      el.createPlaylistModal.style.display = 'flex';
      el.newPlaylistTitleInput.value = '';
      el.newPlaylistTitleInput.focus();
    };

    const user = AuthManager.getCurrentUser();
    let playlists = StorageManager.getPlaylists();
    if (user?.uid) {
      try {
        playlists = await DbManager.getPlaylists(user.uid);
      } catch (_) {}
    }

    if (!playlists || playlists.length === 0) {
      listContainer.innerHTML = `
        <div style="padding:20px; text-align:center; color:var(--text-gray); font-size:0.82rem;">
          You don't have any custom playlists yet. Create one below!
        </div>
      `;
      return;
    }

    listContainer.innerHTML = playlists.map(pl => {
      const alreadyIn = (pl.tracks || []).some(t => t.id === track.id);
      return `
        <div class="add-pl-item" data-pl-id="${escapeHtml(pl.id)}" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-elevated); border-radius:10px; cursor:pointer; border:1px solid var(--border-subtle); transition:background 0.2s ease;">
          <div style="display:flex; align-items:center; gap:10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-gray);"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span style="font-size:0.86rem; font-weight:600; color:var(--text-white);">${escapeHtml(pl.name)}</span>
          </div>
          <span style="font-size:0.75rem; color:${alreadyIn ? '#4caf50' : 'var(--text-dim)'};">${alreadyIn ? '✓ Added' : '+ Add'}</span>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.add-pl-item').forEach(item => {
      item.addEventListener('click', async () => {
        const plId = item.dataset.plId;
        const targetPl = playlists.find(p => p.id === plId);
        try {
          const success = await DbManager.addTrackToPlaylist(plId, track);
          modal.style.display = 'none';
          if (success) {
            showToast(`Added "${track.title}" to ${targetPl ? targetPl.name : 'playlist'}`, 'success');
          } else {
            showToast(`"${track.title}" is already in this playlist`, 'info');
          }
          if (state.currentTab === 'library') renderLibraryView();
          renderSidebarPlaylists();
        } catch (err) {
          showToast('Could not save to playlist', 'warning');
        }
      });
    });
  }

  function updateLikeIcons(isLiked) {
    [el.miniLikeBtn, el.sheetLikeBtn, el.desktopLikeBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('liked', isLiked);
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
    });
  }

  function updateActiveSongRows(currentId) {
    document.querySelectorAll('.ember-song-row').forEach(row => {
      if (row.dataset.trackId === currentId) {
        row.classList.add('playing');
      } else {
        row.classList.remove('playing');
      }
    });
  }

  /* ==========================================================================
     Play Queue Modal Management
     ========================================================================== */
  function renderQueueList() {
    if (!el.queueModalList) return;
    const queue = player.queue || [];
    const currentIndex = player.queueIndex >= 0 ? player.queueIndex : 0;
    const currentTrack = player.currentTrack;

    if (queue.length === 0 && !currentTrack) {
      el.queueModalList.innerHTML = `
        <div style="text-align:center; padding:32px 14px; color:var(--text-gray); font-size:0.84rem;">
          Your queue is currently empty.<br>
          <span style="font-size:0.74rem; color:var(--text-dim); margin-top:4px; display:inline-block;">Play any song or playlist to start listening!</span>
        </div>
      `;
      return;
    }

    let html = '';
    // 1. Now Playing Section
    if (currentTrack) {
      html += `
        <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; letter-spacing:0.04em;">Now Playing</div>
        <div class="ember-song-row playing" style="background:rgba(255,255,255,0.06); border-radius:10px; margin-bottom:12px;" data-queue-index="${currentIndex}">
          <img class="song-row-thumb" src="${escapeHtml(currentTrack.thumbnail || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(currentTrack.title)}">
          <div class="song-row-meta">
            <div class="song-row-title" style="color:#ff6b4a;">${escapeHtml(currentTrack.title)}</div>
            <div class="song-row-artist">${escapeHtml(currentTrack.artist || 'Ember Artist')}</div>
          </div>
          <div style="font-size:0.75rem; color:#ff6b4a; padding-right:10px; display:flex; align-items:center; gap:4px;">
            <span>▶</span> Playing
          </div>
        </div>
      `;
    }

    // 2. Next Up Section
    const nextTracks = queue.map((t, idx) => ({ track: t, originalIndex: idx })).filter(item => item.originalIndex !== currentIndex);
    if (nextTracks.length > 0) {
      html += `<div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; letter-spacing:0.04em;">Next In Queue (${nextTracks.length})</div>`;
      html += nextTracks.map((item, i) => `
        <div class="ember-song-row queue-item-row" data-queue-index="${item.originalIndex}" style="cursor:pointer; border-radius:8px;">
          <span style="font-size:0.74rem; color:var(--text-dim); width:18px; text-align:center; flex-shrink:0;">${i + 1}</span>
          <img class="song-row-thumb" src="${escapeHtml(item.track.thumbnail || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(item.track.title)}">
          <div class="song-row-meta">
            <div class="song-row-title">${escapeHtml(item.track.title)}</div>
            <div class="song-row-artist">${escapeHtml(item.track.artist || 'Ember Artist')}</div>
          </div>
          <button class="btn-row-action btn-remove-queue-item" data-queue-index="${item.originalIndex}" title="Remove from Queue" style="color:var(--text-dim); font-size:14px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer;">
            ✕
          </button>
        </div>
      `).join('');
    } else {
      html += `<div style="text-align:center; padding:18px; color:var(--text-dim); font-size:0.75rem;">No more songs queued next.</div>`;
    }

    el.queueModalList.innerHTML = html;

    // Click to play any track from queue
    el.queueModalList.querySelectorAll('.queue-item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-queue-item')) return;
        const qIdx = parseInt(row.dataset.queueIndex, 10);
        if (!isNaN(qIdx) && qIdx >= 0 && qIdx < queue.length) {
          player.setQueue(queue, qIdx, true);
          renderQueueList();
        }
      });
    });

    // Remove single track from queue
    el.queueModalList.querySelectorAll('.btn-remove-queue-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qIdx = parseInt(btn.dataset.queueIndex, 10);
        if (!isNaN(qIdx) && qIdx >= 0 && qIdx < queue.length) {
          player.removeFromQueue(qIdx);
          showToast('Removed from queue', 'info');
          renderQueueList();
        }
      });
    });
  }

  function openQueueModal() {
    if (!el.queueModal) return;
    renderQueueList();
    el.queueModal.style.display = 'flex';
  }

  function closeQueueModal() {
    if (el.queueModal) el.queueModal.style.display = 'none';
  }

  // Sync User Header & Sidebar Avatars
  function updateUserIdentityUI(user) {
    if (user) {
      const name = user.displayName || user.email.split('@')[0];
      const initials = getInitials(name);

      if (el.sidebarUserName) el.sidebarUserName.textContent = name;
      if (el.sidebarUserStatus) el.sidebarUserStatus.textContent = '⚡ VIP 320kbps';
      if (el.sidebarUserAvatar) {
        if (user.photoURL) {
          el.sidebarUserAvatar.innerHTML = `<img src="${escapeHtml(user.photoURL)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">`;
        } else {
          el.sidebarUserAvatar.textContent = initials;
        }
      }
      if (el.headerAvatarInner) {
        if (user.photoURL) {
          el.headerAvatarInner.innerHTML = `<img src="${escapeHtml(user.photoURL)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">`;
        } else {
          el.headerAvatarInner.innerHTML = `<span style="font-size:0.75rem; font-weight:700;">${initials}</span>`;
        }
      }
    } else {
      if (el.sidebarUserName) el.sidebarUserName.textContent = 'Guest Listener';
      if (el.sidebarUserStatus) el.sidebarUserStatus.textContent = 'Tap to Sign In';
      if (el.sidebarUserAvatar) el.sidebarUserAvatar.textContent = 'G';
      if (el.headerAvatarInner) {
        el.headerAvatarInner.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      }
    }
  }

  // Render Playlists in Desktop Left Sidebar (User Saved)
  function renderSidebarPlaylists() {
    if (!el.sidebarPlaylistsContainer) return;

    const customPlaylists = StorageManager.getPlaylists();
    let html = '';
    if (customPlaylists.length > 0) {
      html = customPlaylists.map(pl => `
        <div class="sidebar-playlist-link custom-pl-link" data-playlist-id="${escapeHtml(pl.id)}">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(pl.name)}</span>
        </div>
      `).join('');
    } else {
      html = `
        <div style="font-size:0.75rem; color:var(--text-dim); padding:10px 4px; line-height:1.4;">
          No playlists yet.<br>
          <span style="font-size:0.7rem; color:var(--text-muted);">Click + Create Playlist above to add your own!</span>
        </div>
      `;
    }

    el.sidebarPlaylistsContainer.innerHTML = html;

    el.sidebarPlaylistsContainer.querySelectorAll('.sidebar-playlist-link').forEach(link => {
      link.addEventListener('click', () => {
        const plId = link.dataset.playlistId;
        if (plId) openPlaylistView(plId);
      });
    });
  }

  /* ==========================================================================
     Screen 5: HOME VIEW (Personalized History & Artist-Driven Recommendations)
     ========================================================================== */
  async function renderHomeView() {
    state.currentTab = 'home';
    const user = AuthManager.getCurrentUser();

    // 1. Concurrently load user listening history, preferences, and recommendations
    const [recentHistory, prefs, recommendedTracks] = await Promise.all([
      DbManager.getListeningHistory(user?.uid, 14).catch(() => []),
      DbManager.getPreferences(user?.uid).catch(() => null),
      DbManager.getRecommendations(user?.uid, DEFAULT_TRACKS).catch(() => DEFAULT_TRACKS)
    ]);

    // Safety guard if user navigated away during load
    if (state.currentTab !== 'home') return;

    const localRecent = StorageManager.getRecentTracks();
    const rawHistory = [...recentHistory, ...localRecent];
    const combinedHistory = [];
    const seenSongKeys = new Set();

    for (const track of rawHistory) {
      if (!track || !track.title) continue;
      const idKey = (track.id || '').trim();
      const normTitle = (track.title || '').trim().toLowerCase();
      const normArtist = cleanArtistName(track.artist || track.channelTitle || '', track.title).trim().toLowerCase();
      const compKey = `${normTitle}:::${normArtist}`;

      if (idKey && seenSongKeys.has(`id:${idKey}`)) continue;
      if (normTitle && seenSongKeys.has(`title:${compKey}`)) continue;
      if (normTitle && !normArtist && seenSongKeys.has(`t:${normTitle}`)) continue;

      if (idKey) seenSongKeys.add(`id:${idKey}`);
      if (normTitle) {
        seenSongKeys.add(`title:${compKey}`);
        seenSongKeys.add(`t:${normTitle}`);
      }

      combinedHistory.push(track);
    }

    const hasHistory = combinedHistory.length > 0;
    const displayHistoryCards = hasHistory ? combinedHistory.slice(0, 10) : DEFAULT_TRACKS.slice(0, 8);

    // 2. Extract Top Listened Artist from History & Preferences
    const favArtists = (prefs?.favorite_artists || []).map(a => cleanArtistName(a)).filter(Boolean);

    const artistCounts = {};
    favArtists.forEach(fa => {
      artistCounts[fa] = (artistCounts[fa] || 0) + 3;
    });

    combinedHistory.forEach(track => {
      const art = cleanArtistName(track.artist, track.title);
      if (art && art.toLowerCase() !== 'ember' && art.toLowerCase() !== 'ember collective' && art.toLowerCase() !== 'ember artist') {
        artistCounts[art] = (artistCounts[art] || 0) + 1;
      }
    });

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);
    const topArtist = topArtists.length > 0 ? topArtists[0] : null;

    // 3. Dynamically Fetch Songs for Top Artist (Cached in state or async loaded)
    let artistSongs = [];
    if (topArtist) {
      if (!state.artistRecommendationsCache) state.artistRecommendationsCache = {};
      if (state.artistRecommendationsCache[topArtist]) {
        artistSongs = state.artistRecommendationsCache[topArtist];
      } else {
        // Fast pre-fill from catalog if available
        const catalogMatches = DEFAULT_TRACKS.filter(t => cleanArtistName(t.artist, t.title).toLowerCase().includes(topArtist.toLowerCase()));
        if (catalogMatches.length > 0) {
          artistSongs = catalogMatches;
        }
      }
    }

    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : (hour < 18 ? 'Good Afternoon' : 'Good Evening');
    const userName = user?.displayName ? `, ${user.displayName.split(' ')[0]}` : '';

    el.viewport.innerHTML = `
      <!-- Home Search Box (Mobile) -->
      <div class="ember-search-box" id="home-search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="ember-search-input" id="home-search-input" placeholder="Search songs, artists, playlists...">
      </div>

      <!-- Hero Banner -->
      <div class="good-morning-banner" id="good-morning-hero">
        <img class="banner-bg-img" src="assets/images/ember_banner.jpg" alt="Home Banner">
        <div class="banner-gradient-overlay"></div>
        <div class="banner-text-content">
          <h2>${greeting}${escapeHtml(userName)}</h2>
          <p>${topArtist ? `Vibing with ${escapeHtml(topArtist)} and your favorite soundscapes.` : `Let's make today sound better.`}</p>
        </div>
        <button class="banner-play-circle" id="banner-play-btn" title="Resume Playback">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
      </div>

      <!-- Top Section: Jump Back In (Listening History) or Discover -->
      <div class="section-title-row">
        <div style="display:flex; align-items:center; gap:8px;">
          ${hasHistory ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-gray);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` : ''}
          <h3>${hasHistory ? 'Jump Back In' : 'Trending For You'}</h3>
        </div>
        ${hasHistory
          ? `<button class="section-see-all" id="see-all-history" style="background:none; border:none; cursor:pointer;">Play All &gt;</button>`
          : `<span class="section-see-all" id="see-all-playlists" style="cursor:pointer;">Explore &gt;</span>`
        }
      </div>

      <!-- Horizontal Cards: Recently Played Tracks -->
      <div class="horizontal-card-scroll" id="home-history-scroll">
        ${displayHistoryCards.map((track, i) => `
          <div class="ember-music-card history-song-card" data-track-id="${escapeHtml(track.id)}" data-index="${i}" title="${escapeHtml(track.title)}">
            <div class="card-img-wrapper">
              <img src="${escapeHtml(track.thumbnail || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(track.title)}" loading="lazy">
              <button class="card-play-hover-btn" data-play-track-id="${escapeHtml(track.id)}" title="Play ${escapeHtml(track.title)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
              </button>
            </div>
            <div class="card-title">${escapeHtml(track.title)}</div>
            <div class="card-subtitle">${escapeHtml(cleanArtistName(track.artist, track.title) || 'Ember')}</div>
          </div>
        `).join('')}
      </div>

      <!-- Artist Suggestion Section: Because You Listened to {topArtist} -->
      <div id="home-artist-section" style="${topArtist ? 'display:block;' : 'display:none;'}">
        <div class="section-title-row" style="margin-top:24px; margin-bottom:12px;">
          <div>
            <h3 style="display:flex; align-items:center; gap:8px;">
              <span style="color:#ff6b4a; font-size:1.1rem;">✦</span> More from <span id="home-top-artist-name">${escapeHtml(topArtist || '')}</span>
            </h3>
            <div style="font-size:0.74rem; color:var(--text-dim); margin-top:2px;">
              Recommended songs based on the artist you love listening to
            </div>
          </div>
          <button class="section-see-all" id="btn-play-all-artist" style="background:none; border:none; color:var(--text-gray); cursor:pointer; font-size:0.78rem;">Play All &gt;</button>
        </div>
        <div class="song-list-container" id="home-artist-songs">
          ${artistSongs.length > 0
            ? artistSongs.map((track, i) => createSongRowHtml(track, i)).join('')
            : '<div style="padding:14px; text-align:center; color:var(--text-dim); font-size:0.75rem;">Finding soundscapes by this artist...</div>'
          }
        </div>
      </div>

      <!-- Based on Your Taste Section (Requirement 7) -->
      <div class="section-title-row" style="margin-top:24px;">
        <h3>Based on Your Taste</h3>
        <span class="section-see-all" id="tune-taste-shortcut" style="cursor:pointer;">Tune Taste ⚡</span>
      </div>
      <div class="song-list-container" id="home-taste-songs">
        ${recommendedTracks.slice(0, 5).map((track, i) => createSongRowHtml(track, i)).join('')}
      </div>

      <!-- Made For You Banner -->
      <div class="section-title-row" style="margin-top:24px;">
        <h3>Made For You</h3>
      </div>
      <div class="made-for-you-card" id="daily-mix-card" style="cursor:pointer;">
        <div class="daily-mix-info">
          <h4>Daily Mix ${topArtist ? `• ${escapeHtml(topArtist)} &amp; More` : '1'}</h4>
          <p>${topArtist ? `Personalized soundscape featuring ${escapeHtml(topArtist)} and similar vibes.` : 'Your favourite music, all in one place.'}</p>
        </div>
        <button class="banner-play-circle" id="btn-play-daily-mix" title="Play Daily Mix">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
      </div>

      <!-- User Saved Playlists (If any exist) -->
      ${(() => {
        const customPlaylists = StorageManager.getPlaylists();
        if (!customPlaylists || customPlaylists.length === 0) return '';
        return `
          <div class="section-title-row" style="margin-top:24px;">
            <h3>Your Playlists</h3>
            <span class="section-see-all" id="see-all-playlists-bottom" style="cursor:pointer;">See All &gt;</span>
          </div>
          <div class="horizontal-card-scroll" id="home-playlists-scroll">
            ${customPlaylists.map(pl => `
              <div class="ember-music-card" data-playlist-id="${escapeHtml(pl.id)}">
                <div class="card-img-wrapper">
                  <img src="${escapeHtml(pl.cover || (pl.tracks && pl.tracks[0]?.thumbnail) || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(pl.name)}" loading="lazy">
                  <button class="card-play-hover-btn" data-play-playlist="${escapeHtml(pl.id)}" title="Play ${escapeHtml(pl.name)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                  </button>
                </div>
                <div class="card-title">${escapeHtml(pl.name)}</div>
                <div class="card-subtitle">${(pl.tracks || []).length} songs • By You</div>
              </div>
            `).join('')}
          </div>
        `;
      })()}
    `;

    // Asynchronously fetch live artist recommendations if not yet cached
    if (topArtist && (!state.artistRecommendationsCache || !state.artistRecommendationsCache[topArtist])) {
      YouTubeAPI.search(`${topArtist} songs`, 6, 'songs').then(res => {
        const results = Array.isArray(res) ? res : (res && (res.results || res.songs)) || [];
        if (results && results.length > 0) {
          const valid = results.filter(t => t.id);
          if (!state.artistRecommendationsCache) state.artistRecommendationsCache = {};
          state.artistRecommendationsCache[topArtist] = valid;

          const container = document.getElementById('home-artist-songs');
          if (container && state.currentTab === 'home') {
            container.innerHTML = valid.map((track, i) => createSongRowHtml(track, i)).join('');
            bindSongRows(container, valid);
          }
        }
      }).catch(err => console.warn('[Home] Artist recommendation async error:', err));
    }

    // Event: Home search input
    const homeSearchInput = document.getElementById('home-search-input');
    if (homeSearchInput) {
      homeSearchInput.addEventListener('focus', () => {
        if (homeSearchInput.value.trim()) state.searchQuery = homeSearchInput.value.trim();
        switchTab('search', true);
      });
      homeSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          state.searchQuery = homeSearchInput.value.trim();
          switchTab('search', true);
        }
      });
    }

    // Event: Hero Play Button (Plays History or Default Queue)
    const bannerPlayBtn = document.getElementById('banner-play-btn');
    if (bannerPlayBtn) {
      bannerPlayBtn.addEventListener('click', () => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
          return;
        }
        if (hasHistory) {
          player.setQueue(displayHistoryCards, 0, true);
          showToast(`Resuming "${displayHistoryCards[0].title}"`, 'success');
        } else if (displayHistoryCards.length > 0) {
          player.setQueue(displayHistoryCards, 0, true);
          showToast(`Playing "${displayHistoryCards[0].title}"`, 'success');
        } else {
          showToast('Search songs or artists to start listening!', 'info');
        }
      });
    }

    // Event: History cards click -> play song immediately
    document.querySelectorAll('#home-history-scroll .history-song-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
          return;
        }
        const trackId = card.dataset.trackId;
        const idx = displayHistoryCards.findIndex(t => t.id === trackId);
        if (idx >= 0) {
          player.setQueue(displayHistoryCards, idx, true);
        }
      });
    });

    // Event: "Play All" history
    const seeAllHistoryBtn = document.getElementById('see-all-history');
    if (seeAllHistoryBtn) {
      seeAllHistoryBtn.addEventListener('click', () => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
          return;
        }
        if (displayHistoryCards.length > 0) {
          player.setQueue(displayHistoryCards, 0, true);
          showToast('Playing your recent history', 'success');
        }
      });
    }

    // Event: "Play All" for Top Artist songs
    const playAllArtistBtn = document.getElementById('btn-play-all-artist');
    if (playAllArtistBtn) {
      playAllArtistBtn.addEventListener('click', () => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
          return;
        }
        const currentSongs = (state.artistRecommendationsCache && topArtist && state.artistRecommendationsCache[topArtist])
          || artistSongs
          || [];
        if (currentSongs.length > 0) {
          player.setQueue(currentSongs, 0, true);
          showToast(`Playing ${topArtist} mix`, 'success');
        } else {
          showToast(`Loading songs for ${topArtist || 'artist'}...`, 'info');
        }
      });
    }

    // Event: Daily Mix Play
    const dailyMixCard = document.getElementById('daily-mix-card');
    if (dailyMixCard) {
      dailyMixCard.addEventListener('click', () => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to play Daily Mix on EMBER.', true);
          return;
        }
        const mixQueue = artistSongs.length > 0 ? [...artistSongs, ...displayHistoryCards] : DEFAULT_TRACKS;
        player.setQueue(mixQueue, 0, true);
        showToast(`Playing Daily Mix`, 'success');
      });
    }

    // Event: Tune Taste shortcut
    const tuneTasteBtn = document.getElementById('tune-taste-shortcut');
    if (tuneTasteBtn) {
      tuneTasteBtn.addEventListener('click', () => openOnboardingModal());
    }

    // Event: Curated Playlist card clicks
    document.querySelectorAll('#home-playlists-scroll .ember-music-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.card-play-hover-btn');
        const playlistId = card.dataset.playlistId;
        if (playBtn) {
          e.stopPropagation();
          openPlaylistView(playlistId, true);
        } else {
          openPlaylistView(playlistId, false);
        }
      });
    });

    const seeAllBtn = document.getElementById('see-all-playlists');
    if (seeAllBtn) {
      seeAllBtn.addEventListener('click', () => switchTab('library'));
    }
    const seeAllBottomBtn = document.getElementById('see-all-playlists-bottom');
    if (seeAllBottomBtn) {
      seeAllBottomBtn.addEventListener('click', () => switchTab('library'));
    }

    // Bind songs lists
    if (topArtist && artistSongs.length > 0) {
      bindSongRows(document.getElementById('home-artist-songs'), artistSongs);
    }
    bindSongRows(document.getElementById('home-taste-songs'), recommendedTracks.slice(0, 5));
  }

  /* ==========================================================================
     Screen 6: SEARCH VIEW (YouTube Music Catalog Discovery Experience)
     ========================================================================== */
  function renderSearchView(autoFocus = false) {
    state.currentTab = 'search';

    const user = AuthManager.getCurrentUser();
    let recentSearches = StorageManager.getSearchHistory();

    el.viewport.innerHTML = `
      <div class="search-screen-container">
        <!-- Search Input Bar with Autocomplete Dropdown -->
        <div class="ember-search-box search-input-wrapper" id="search-input-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="ember-search-input search-main-input" id="search-input" placeholder="Search songs, artists, albums, playlists..." value="${escapeHtml(state.searchQuery)}" autocomplete="off" spellcheck="false">
          <button class="search-clear-btn" id="search-clear-btn" style="display:${state.searchQuery ? 'block' : 'none'};">✕</button>
          <div class="search-autocomplete-dropdown" id="search-autocomplete-dropdown" style="display:none;"></div>
        </div>

        <!-- Filter Chips Row (All, Songs, Artists, Albums, Playlists) -->
        <div class="filter-pills-row" style="margin-top:14px; margin-bottom:18px;">
          <button class="ember-pill ${state.searchFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="ember-pill ${state.searchFilter === 'songs' ? 'active' : ''}" data-filter="songs">Songs</button>
          <button class="ember-pill ${state.searchFilter === 'artists' ? 'active' : ''}" data-filter="artists">Artists</button>
          <button class="ember-pill ${state.searchFilter === 'albums' ? 'active' : ''}" data-filter="albums">Albums</button>
          <button class="ember-pill ${state.searchFilter === 'playlists' ? 'active' : ''}" data-filter="playlists">Playlists</button>
        </div>

        <!-- Dynamic Results or Browse Grid -->
        <div id="search-dynamic-results">
          ${state.searchQuery.trim() ? '' : renderBrowseGenresGrid(recentSearches)}
        </div>
      </div>
    `;

    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-autocomplete-dropdown');
    const clearBtn = document.getElementById('search-clear-btn');
    const dynamicResults = document.getElementById('search-dynamic-results');

    // Cross-device background sync for search history from Supabase
    if (user?.uid) {
      DbManager.getSearchHistory(user.uid).then(synced => {
        if (synced && synced.length > 0 && !state.searchQuery.trim()) {
          recentSearches = synced;
          if (dynamicResults && !dynamicResults.querySelector('.ember-song-row') && !dynamicResults.querySelector('.top-match-hero')) {
            dynamicResults.innerHTML = renderBrowseGenresGrid(recentSearches);
            bindBrowseCards();
          }
        }
      });
    }

    // Keep desktop top search bar in sync
    if (el.desktopTopSearchInput && el.desktopTopSearchInput.value !== state.searchQuery) {
      el.desktopTopSearchInput.value = state.searchQuery;
    }

    if (autoFocus && searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }

    // Filter Chips click handlers
    document.querySelectorAll('.filter-pills-row .ember-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pills-row .ember-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.searchFilter = pill.dataset.filter;
        if (state.searchQuery.trim()) {
          triggerSearch(state.searchQuery.trim());
        }
      });
    });

    // Clear Button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (el.desktopTopSearchInput) el.desktopTopSearchInput.value = '';
        clearBtn.style.display = 'none';
        if (searchDropdown) searchDropdown.style.display = 'none';
        dynamicResults.innerHTML = renderBrowseGenresGrid(recentSearches);
        bindBrowseCards();
      });
    }

    // Attach Autocomplete to Search Inputs
    setupAutocomplete(searchInput, searchDropdown);
    const desktopDropdown = document.getElementById('desktop-autocomplete-dropdown');
    if (el.desktopTopSearchInput && desktopDropdown) {
      setupAutocomplete(el.desktopTopSearchInput, desktopDropdown);
    }

    function setupAutocomplete(inputEl, dropdownEl) {
      if (!inputEl || !dropdownEl) return;
      let activeIndex = -1;

      inputEl.addEventListener('input', (e) => {
        const query = e.target.value;
        state.searchQuery = query;
        if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

        if (state.searchDebounceTimer) clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(async () => {
          if (!query.trim()) {
            dropdownEl.style.display = 'none';
            if (dynamicResults && !dynamicResults.querySelector('.ember-song-row') && !dynamicResults.querySelector('.top-match-hero')) {
              dynamicResults.innerHTML = renderBrowseGenresGrid(recentSearches);
              bindBrowseCards();
            }
            return;
          }

          try {
            const suggestions = await YouTubeAPI.getSuggestions(query.trim());
            activeIndex = -1;

            if (suggestions && suggestions.length > 0 && document.activeElement === inputEl) {
              dropdownEl.innerHTML = suggestions.map((s, idx) => `
                <div class="autocomplete-item" data-index="${idx}" data-query="${escapeHtml(s)}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span class="autocomplete-item-text">${escapeHtml(s)}</span>
                  <span class="autocomplete-item-action">Search</span>
                </div>
              `).join('');
              dropdownEl.style.display = 'flex';

              dropdownEl.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                  const q = item.dataset.query;
                  if (q) executeSearch(q);
                  dropdownEl.style.display = 'none';
                });
              });
            } else {
              dropdownEl.style.display = 'none';
            }
          } catch (_) {
            dropdownEl.style.display = 'none';
          }
        }, 160);
      });

      inputEl.addEventListener('keydown', (e) => {
        const items = dropdownEl.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
          if (items.length === 0) return;
          e.preventDefault();
          activeIndex = (activeIndex + 1) % items.length;
          highlightItem();
        } else if (e.key === 'ArrowUp') {
          if (items.length === 0) return;
          e.preventDefault();
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          highlightItem();
        } else if (e.key === 'Enter') {
          dropdownEl.style.display = 'none';
          if (activeIndex >= 0 && items[activeIndex]) {
            const q = items[activeIndex].dataset.query;
            if (q) executeSearch(q);
          } else if (inputEl.value.trim()) {
            executeSearch(inputEl.value.trim());
          }
        } else if (e.key === 'Escape') {
          dropdownEl.style.display = 'none';
        }

        function highlightItem() {
          items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
          if (items[activeIndex]) {
            inputEl.value = items[activeIndex].dataset.query;
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
          dropdownEl.style.display = 'none';
        }
      });
    }

    function executeSearch(query) {
      state.searchQuery = query;
      if (searchInput) searchInput.value = query;
      if (el.desktopTopSearchInput) el.desktopTopSearchInput.value = query;
      if (clearBtn) clearBtn.style.display = 'block';
      if (searchDropdown) searchDropdown.style.display = 'none';
      const dDropdown = document.getElementById('desktop-autocomplete-dropdown');
      if (dDropdown) dDropdown.style.display = 'none';
      triggerSearch(query);
    }

    function renderBrowseGenresGrid(recents = []) {
      const recentsHtml = (recents && recents.length > 0) ? `
        <div class="section-title-row" style="margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-gray);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h3>Recent Searches</h3>
          </div>
          <button class="section-see-all btn-clear-history" id="btn-clear-search-history" style="background:none; border:none; cursor:pointer;">Clear All</button>
        </div>
        <div class="recent-searches-row">
          ${recents.map(q => `
            <div class="recent-search-chip" data-search-query="${escapeHtml(q)}">
              <span class="recent-chip-text">${escapeHtml(q)}</span>
              <button class="btn-remove-search" data-remove-query="${escapeHtml(q)}" title="Remove search">✕</button>
            </div>
          `).join('')}
        </div>
      ` : '';

      const trending = (typeof TRENDING_SEARCHES !== 'undefined' && Array.isArray(TRENDING_SEARCHES)) ? TRENDING_SEARCHES : [];
      const genres = (typeof GENRE_CARDS !== 'undefined' && Array.isArray(GENRE_CARDS)) ? GENRE_CARDS : [];

      const trendingHtml = trending.length > 0 ? `
        <div class="section-title-row" style="margin-bottom:12px;">
          <h3>Trending Searches</h3>
        </div>
        <div class="trending-searches-list">
          ${trending.map(t => `
            <div class="trending-item-row" data-trend="${escapeHtml(t)}">
              <div class="trending-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>${escapeHtml(t)}</span>
              </div>
              <svg class="arrow-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          `).join('')}
        </div>
      ` : '';

      const genresHtml = genres.length > 0 ? `
        <div class="section-title-row" style="margin-bottom:14px; margin-top:22px;">
          <h3>Explore Moods &amp; Genres</h3>
        </div>
        <div class="browse-genres-grid">
          ${genres.map(g => `
            <div class="genre-card" data-genre-query="${escapeHtml(g.query)}" style="background:${escapeHtml(g.color)};">
              <span class="genre-card-title">${escapeHtml(g.title)}</span>
              <img class="genre-card-art" src="${escapeHtml(g.art)}" alt="${escapeHtml(g.title)}" loading="lazy">
            </div>
          `).join('')}
        </div>
      ` : '';

      return recentsHtml + trendingHtml + genresHtml;
    }

    function bindBrowseCards() {
      // 1. Recent Search Chips
      document.querySelectorAll('.recent-search-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          if (e.target.closest('.btn-remove-search')) return;
          const q = chip.dataset.searchQuery;
          if (q) executeSearch(q);
        });
      });

      // 2. Remove Single Search Item
      document.querySelectorAll('.btn-remove-search').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const q = btn.dataset.removeQuery;
          if (q) {
            recentSearches = recentSearches.filter(item => item !== q);
            const chip = btn.closest('.recent-search-chip');
            if (chip) chip.remove();
            await DbManager.removeSearchHistory(user?.uid, q);
            if (recentSearches.length === 0) {
              const recRow = document.querySelector('.recent-searches-row');
              const recTitle = recRow?.previousElementSibling;
              if (recRow) recRow.remove();
              if (recTitle) recTitle.remove();
            }
          }
        });
      });

      // 3. Clear All Search History
      const clearHistoryBtn = document.getElementById('btn-clear-search-history');
      if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
          recentSearches = [];
          await DbManager.clearSearchHistory(user?.uid);
          dynamicResults.innerHTML = renderBrowseGenresGrid([]);
          bindBrowseCards();
          showToast('Search history cleared');
        });
      }

      // 4. Genre Cards
      document.querySelectorAll('.genre-card').forEach(card => {
        card.addEventListener('click', () => {
          const q = card.dataset.genreQuery;
          if (q) executeSearch(q);
        });
      });

      // 5. Trending Items
      document.querySelectorAll('.trending-item-row').forEach(row => {
        row.addEventListener('click', () => {
          const q = row.dataset.trend;
          if (q) executeSearch(q);
        });
      });
    }

    // Deduplicate songs by ID and title+artist
    function deduplicateTracks(tracks) {
      if (!tracks || !Array.isArray(tracks)) return [];
      const seenIds = new Set();
      const seenTitles = new Set();
      return tracks.filter(t => {
        if (!t || !t.id) return false;
        if (seenIds.has(t.id)) return false;
        const normKey = `${(t.title || '').toLowerCase()}|${(t.artist || '').toLowerCase()}`;
        if (seenTitles.has(normKey)) return false;
        seenIds.add(t.id);
        seenTitles.add(normKey);
        return true;
      });
    }

    async function triggerSearch(query) {
      if (!query || !query.trim()) return;
      const cleanQ = query.trim();

      // Save search history to Supabase PostgreSQL & local storage
      const activeUser = AuthManager.getCurrentUser();
      DbManager.addSearchHistory(activeUser?.uid, cleanQ);
      if (!recentSearches.includes(cleanQ)) {
        recentSearches.unshift(cleanQ);
      }

      dynamicResults.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:50px 0; color:var(--text-gray);">
          <div style="width:32px; height:32px; border:3px solid var(--text-white); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:14px;"></div>
          <span style="font-size:0.88rem; font-weight:600; color:var(--text-white);">Searching YouTube Music...</span>
          <span style="font-size:0.75rem; color:var(--text-dim); margin-top:4px;">Finding songs, artists, albums, and playlists</span>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      `;

      try {
        const res = await YouTubeAPI.search(cleanQ, 24, state.searchFilter);
        const currentFilter = state.searchFilter || 'all';

        // ----------------------------------------------------------------------
        // 1. ALL TAB (Unified Overview: Top Result, Songs, Artists, Albums, Playlists)
        // ----------------------------------------------------------------------
        if (currentFilter === 'all') {
          const topResult = res.topResult;
          const songs = deduplicateTracks(res.songs || res.results || []);
          const artists = res.artists || [];
          const albums = res.albums || [];
          const playlists = res.playlists || [];

          const hasAny = topResult || songs.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0;
          if (!hasAny) {
            renderEmptySearchState(cleanQ);
            return;
          }

          let html = '';

          // Top Match Hero Card
          if (topResult) {
            if (topResult.isArtist) {
              html += `
                <div class="top-match-hero" data-artist-name="${escapeHtml(topResult.title)}">
                  <div class="top-match-left">
                    <img class="top-match-art is-artist-avatar" src="${escapeHtml(topResult.thumbnail || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(topResult.title)}">
                    <div class="top-match-info">
                      <span class="top-match-badge">Top Artist</span>
                      <div class="top-match-title">${escapeHtml(topResult.title)}</div>
                      <div class="top-match-subtitle">Official Artist • YouTube Music</div>
                    </div>
                  </div>
                  <button class="top-match-play-btn btn-explore-top-artist" title="Explore ${escapeHtml(topResult.title)}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              `;
            } else if (topResult.isSong) {
              html += `
                <div class="top-match-hero top-song-hero" data-track-id="${escapeHtml(topResult.id)}">
                  <div class="top-match-left">
                    <img class="top-match-art" src="${escapeHtml(topResult.thumbnail || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(topResult.title)}">
                    <div class="top-match-info">
                      <span class="top-match-badge">Top Song</span>
                      <div class="top-match-title">${escapeHtml(topResult.title)}</div>
                      <div class="top-match-subtitle">${escapeHtml(topResult.artist)} • ${escapeHtml(topResult.duration || '03:30')}</div>
                    </div>
                  </div>
                  <button class="top-match-play-btn btn-play-top-song" title="Play ${escapeHtml(topResult.title)}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                  </button>
                </div>
              `;
            }
          }

          // Songs Section
          if (songs.length > 0) {
            html += `
              <div class="section-title-row" style="margin-bottom:12px;">
                <h3>Songs &amp; Music Videos</h3>
                <button class="section-see-all btn-switch-category" data-target-filter="songs">See all</button>
              </div>
              <div class="song-list-container" id="search-all-songs-list" style="margin-bottom:28px;">
                ${songs.slice(0, 6).map((track, i) => createSongRowHtml(track, i)).join('')}
              </div>
            `;
          }

          // Artists Section
          if (artists.length > 0) {
            html += `
              <div class="section-title-row" style="margin-bottom:14px;">
                <h3>Artists</h3>
                <button class="section-see-all btn-switch-category" data-target-filter="artists">See all</button>
              </div>
              <div class="search-artists-carousel">
                ${artists.slice(0, 6).map(a => `
                  <div class="search-artist-card" data-artist-name="${escapeHtml(a.title)}">
                    <img class="artist-avatar-circle" src="${escapeHtml(a.thumbnail)}" alt="${escapeHtml(a.title)}" loading="lazy">
                    <div class="search-artist-name">${escapeHtml(a.title)}</div>
                    <div class="search-artist-role">Artist</div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          // Albums Section
          if (albums.length > 0) {
            html += `
              <div class="section-title-row" style="margin-bottom:14px; margin-top:8px;">
                <h3>Albums</h3>
                <button class="section-see-all btn-switch-category" data-target-filter="albums">See all</button>
              </div>
              <div class="search-collections-grid">
                ${albums.slice(0, 6).map(al => `
                  <div class="search-collection-card" data-collection-id="${escapeHtml(al.id)}" data-type="album">
                    <div class="collection-cover-wrapper">
                      <img src="${escapeHtml(al.cover || al.thumbnail)}" alt="${escapeHtml(al.title)}" loading="lazy">
                      <button class="collection-hover-play" title="Play ${escapeHtml(al.title)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                      </button>
                    </div>
                    <div class="collection-card-title">${escapeHtml(al.title)}</div>
                    <div class="collection-card-subtitle">${escapeHtml(al.subtitle || 'Album')}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          // Playlists Section
          if (playlists.length > 0) {
            html += `
              <div class="section-title-row" style="margin-bottom:14px; margin-top:8px;">
                <h3>Featured Playlists &amp; Moods</h3>
                <button class="section-see-all btn-switch-category" data-target-filter="playlists">See all</button>
              </div>
              <div class="search-collections-grid">
                ${playlists.slice(0, 6).map(pl => `
                  <div class="search-collection-card" data-collection-id="${escapeHtml(pl.id)}" data-type="playlist">
                    <div class="collection-cover-wrapper">
                      <img src="${escapeHtml(pl.cover || pl.thumbnail)}" alt="${escapeHtml(pl.title)}" loading="lazy">
                      <button class="collection-hover-play" title="Play ${escapeHtml(pl.title)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                      </button>
                    </div>
                    <div class="collection-card-title">${escapeHtml(pl.title)}</div>
                    <div class="collection-card-subtitle">${escapeHtml(pl.subtitle || 'Playlist')}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          dynamicResults.innerHTML = html;

          // Bind song rows
          const songsList = document.getElementById('search-all-songs-list');
          if (songsList) bindSongRows(songsList, songs, { isSearch: true, searchResults: songs });

          // Bind Top Song Hero
          const topSongHero = dynamicResults.querySelector('.top-song-hero');
          if (topSongHero && topResult && topResult.isSong) {
            topSongHero.addEventListener('click', async () => {
              if (AuthManager.isGuest()) {
                openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
                return;
              }
              await playSearchTrackWithShuffledHistory(topResult, songs);
            });
          }

          // Bind Top Artist Hero
          const topArtistHero = dynamicResults.querySelector('.top-match-hero[data-artist-name]');
          if (topArtistHero) {
            topArtistHero.addEventListener('click', () => {
              const artistName = topArtistHero.dataset.artistName;
              if (artistName) {
                switchCategoryFilter('songs', `${artistName} songs`);
              }
            });
          }

          // Bind Category Switchers ("See All")
          dynamicResults.querySelectorAll('.btn-switch-category').forEach(btn => {
            btn.addEventListener('click', () => {
              const target = btn.dataset.targetFilter;
              if (target) switchCategoryFilter(target, cleanQ);
            });
          });

          // Bind Artist Cards
          dynamicResults.querySelectorAll('.search-artist-card').forEach(card => {
            card.addEventListener('click', () => {
              const artistName = card.dataset.artistName;
              if (artistName) switchCategoryFilter('songs', `${artistName} songs`);
            });
          });

          // Bind Collection Cards (Albums & Playlists)
          dynamicResults.querySelectorAll('.search-collection-card').forEach(card => {
            card.addEventListener('click', () => {
              const pid = card.dataset.collectionId;
              const title = card.querySelector('.collection-card-title')?.textContent;
              const subtitle = card.querySelector('.collection-card-subtitle')?.textContent;
              const img = card.querySelector('img')?.src;
              if (pid) {
                openPlaylistView(pid, false, { id: pid, title, subtitle, thumbnail: img });
              }
            });
          });

        // ----------------------------------------------------------------------
        // 2. SONGS TAB (Full List with Pagination)
        // ----------------------------------------------------------------------
        } else if (currentFilter === 'songs') {
          let songs = deduplicateTracks(res.results || []);
          if (songs.length === 0) {
            renderEmptySearchState(cleanQ);
            return;
          }

          dynamicResults.innerHTML = `
            <div class="section-title-row" style="margin-bottom:12px;">
              <h3>Songs &amp; Music Videos</h3>
              <span style="font-size:0.75rem; color:var(--text-dim);" id="songs-count-badge">${songs.length} tracks</span>
            </div>
            <div class="song-list-container" id="search-songs-full-list">
              ${songs.map((track, i) => createSongRowHtml(track, i)).join('')}
            </div>
            ${res.nextPageToken ? `<button class="btn-load-more" id="btn-load-more-songs" data-token="${escapeHtml(res.nextPageToken)}">Load More Songs</button>` : ''}
          `;

          const songsContainer = document.getElementById('search-songs-full-list');
          bindSongRows(songsContainer, songs, { isSearch: true, searchResults: songs });

          const loadMoreBtn = document.getElementById('btn-load-more-songs');
          if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', async () => {
              loadMoreBtn.textContent = 'Loading more...';
              loadMoreBtn.disabled = true;
              try {
                const nextRes = await YouTubeAPI.search(cleanQ, 24, 'songs', loadMoreBtn.dataset.token);
                const newTracks = deduplicateTracks(nextRes.results || []);
                if (newTracks.length > 0) {
                  songs = [...songs, ...newTracks];
                  const newHtml = newTracks.map((track, i) => createSongRowHtml(track, songs.length - newTracks.length + i)).join('');
                  songsContainer.insertAdjacentHTML('beforeend', newHtml);
                  bindSongRows(songsContainer, songs, { isSearch: true, searchResults: songs });
                  const badge = document.getElementById('songs-count-badge');
                  if (badge) badge.textContent = `${songs.length} tracks`;
                }
                if (nextRes.nextPageToken) {
                  loadMoreBtn.dataset.token = nextRes.nextPageToken;
                  loadMoreBtn.textContent = 'Load More Songs';
                  loadMoreBtn.disabled = false;
                } else {
                  loadMoreBtn.remove();
                }
              } catch (e) {
                loadMoreBtn.textContent = 'Failed to load more';
              }
            });
          }

        // ----------------------------------------------------------------------
        // 3. ARTISTS TAB
        // ----------------------------------------------------------------------
        } else if (currentFilter === 'artists') {
          const artists = res.results || [];
          if (artists.length === 0) {
            renderEmptySearchState(cleanQ);
            return;
          }

          dynamicResults.innerHTML = `
            <div class="section-title-row" style="margin-bottom:16px;">
              <h3>Artists</h3>
              <span style="font-size:0.75rem; color:var(--text-dim);">${artists.length} found</span>
            </div>
            <div class="search-artists-carousel" id="search-artists-grid" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));">
              ${artists.map(a => `
                <div class="search-artist-card" data-artist-name="${escapeHtml(a.title)}">
                  <img class="artist-avatar-circle" src="${escapeHtml(a.thumbnail)}" alt="${escapeHtml(a.title)}" loading="lazy">
                  <div class="search-artist-name">${escapeHtml(a.title)}</div>
                  <div class="search-artist-role">Artist</div>
                </div>
              `).join('')}
            </div>
            ${res.nextPageToken ? `<button class="btn-load-more" id="btn-load-more-artists" data-token="${escapeHtml(res.nextPageToken)}">Load More Artists</button>` : ''}
          `;

          dynamicResults.querySelectorAll('.search-artist-card').forEach(card => {
            card.addEventListener('click', () => {
              const artistName = card.dataset.artistName;
              if (artistName) switchCategoryFilter('songs', `${artistName} songs`);
            });
          });

        // ----------------------------------------------------------------------
        // 4. ALBUMS TAB
        // ----------------------------------------------------------------------
        } else if (currentFilter === 'albums') {
          const albums = res.results || [];
          if (albums.length === 0) {
            renderEmptySearchState(cleanQ);
            return;
          }

          dynamicResults.innerHTML = `
            <div class="section-title-row" style="margin-bottom:16px;">
              <h3>Albums</h3>
              <span style="font-size:0.75rem; color:var(--text-dim);">${albums.length} collections</span>
            </div>
            <div class="search-collections-grid" id="search-albums-grid">
              ${albums.map(al => `
                <div class="search-collection-card" data-collection-id="${escapeHtml(al.id)}" data-type="album">
                  <div class="collection-cover-wrapper">
                    <img src="${escapeHtml(al.cover || al.thumbnail)}" alt="${escapeHtml(al.title)}" loading="lazy">
                    <button class="collection-hover-play" title="Play ${escapeHtml(al.title)}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                    </button>
                  </div>
                  <div class="collection-card-title">${escapeHtml(al.title)}</div>
                  <div class="collection-card-subtitle">${escapeHtml(al.subtitle || 'Album')}</div>
                </div>
              `).join('')}
            </div>
            ${res.nextPageToken ? `<button class="btn-load-more" id="btn-load-more-albums" data-token="${escapeHtml(res.nextPageToken)}">Load More Albums</button>` : ''}
          `;

          dynamicResults.querySelectorAll('.search-collection-card').forEach(card => {
            card.addEventListener('click', () => {
              const pid = card.dataset.collectionId;
              const title = card.querySelector('.collection-card-title')?.textContent;
              const subtitle = card.querySelector('.collection-card-subtitle')?.textContent;
              const img = card.querySelector('img')?.src;
              if (pid) openPlaylistView(pid, false, { id: pid, title, subtitle, thumbnail: img });
            });
          });

        // ----------------------------------------------------------------------
        // 5. PLAYLISTS TAB
        // ----------------------------------------------------------------------
        } else if (currentFilter === 'playlists') {
          const playlists = res.results || [];
          if (playlists.length === 0) {
            renderEmptySearchState(cleanQ);
            return;
          }

          dynamicResults.innerHTML = `
            <div class="section-title-row" style="margin-bottom:16px;">
              <h3>Playlists &amp; Mood Collections</h3>
              <span style="font-size:0.75rem; color:var(--text-dim);">${playlists.length} playlists</span>
            </div>
            <div class="search-collections-grid" id="search-playlists-grid">
              ${playlists.map(pl => `
                <div class="search-collection-card" data-collection-id="${escapeHtml(pl.id)}" data-type="playlist">
                  <div class="collection-cover-wrapper">
                    <img src="${escapeHtml(pl.cover || pl.thumbnail)}" alt="${escapeHtml(pl.title)}" loading="lazy">
                    <button class="collection-hover-play" title="Play ${escapeHtml(pl.title)}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                    </button>
                  </div>
                  <div class="collection-card-title">${escapeHtml(pl.title)}</div>
                  <div class="collection-card-subtitle">${escapeHtml(pl.subtitle || 'Playlist')}</div>
                </div>
              `).join('')}
            </div>
            ${res.nextPageToken ? `<button class="btn-load-more" id="btn-load-more-playlists" data-token="${escapeHtml(res.nextPageToken)}">Load More Playlists</button>` : ''}
          `;

          dynamicResults.querySelectorAll('.search-collection-card').forEach(card => {
            card.addEventListener('click', () => {
              const pid = card.dataset.collectionId;
              const title = card.querySelector('.collection-card-title')?.textContent;
              const subtitle = card.querySelector('.collection-card-subtitle')?.textContent;
              const img = card.querySelector('img')?.src;
              if (pid) openPlaylistView(pid, false, { id: pid, title, subtitle, thumbnail: img });
            });
          });
        }
      } catch (err) {
        console.warn('[Ember Search] Search failed, attempting catalog fallback:', err);
        const fallback = YouTubeAPI.fallbackSearch(cleanQ);
        if (fallback && fallback.length > 0) {
          dynamicResults.innerHTML = `
            <div class="section-title-row" style="margin-bottom:12px;">
              <h3>Results</h3>
              <span style="font-size:0.75rem; color:var(--text-dim);">${fallback.length} found</span>
            </div>
            <div class="song-list-container" id="search-results-list">
              ${fallback.map((track, i) => createSongRowHtml(track, i)).join('')}
            </div>
          `;
          bindSongRows(document.getElementById('search-results-list'), fallback, { isSearch: true, searchResults: fallback });
        } else {
          dynamicResults.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-gray);">
              <p style="font-size:0.95rem; color:#ff6666; margin-bottom:6px;">Unable to reach YouTube Music</p>
              <p style="font-size:0.75rem;">${escapeHtml(err.message)}</p>
            </div>
          `;
        }
      }
    }

    function switchCategoryFilter(targetFilter, newQuery = '') {
      state.searchFilter = targetFilter;
      document.querySelectorAll('.filter-pills-row .ember-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.filter === targetFilter);
      });
      if (newQuery) {
        state.searchQuery = newQuery;
        if (searchInput) searchInput.value = newQuery;
        if (el.desktopTopSearchInput) el.desktopTopSearchInput.value = newQuery;
      }
      triggerSearch(state.searchQuery);
    }

    function renderEmptySearchState(q) {
      dynamicResults.innerHTML = `
        <div style="text-align:center; padding:50px 20px; color:var(--text-gray);">
          <p style="font-size:1rem; font-weight:700; color:var(--text-white); margin-bottom:8px;">No sound found for "${escapeHtml(q)}"</p>
          <p style="font-size:0.8rem; color:var(--text-dim); margin-bottom:16px;">Try checking your spelling or search for another singer, genre, or mood.</p>
          <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
            <button class="ember-pill" onclick="window.emberExecuteSearch('Arijit Singh')">Arijit Singh</button>
            <button class="ember-pill" onclick="window.emberExecuteSearch('Kesariya')">Kesariya</button>
            <button class="ember-pill" onclick="window.emberExecuteSearch('The Weeknd')">The Weeknd</button>
            <button class="ember-pill" onclick="window.emberExecuteSearch('Hindi romantic songs')">Romantic Songs</button>
          </div>
        </div>
      `;
    }

    window.emberExecuteSearch = executeSearch;

    if (state.searchQuery.trim()) {
      triggerSearch(state.searchQuery.trim());
    } else {
      bindBrowseCards();
    }
  }

  /* ==========================================================================
     Screen 7: PLAYLIST & ALBUM VIEW (Personal & YouTube Music Collections)
     ========================================================================== */
  async function openPlaylistView(playlistId, autoPlay = false, catalogMeta = null) {
    state.previousTab = state.currentTab;
    state.currentTab = 'playlist';
    state.activePlaylistId = playlistId;

    let playlist = null;
    let playlistTracks = [];
    let isCustom = true;

    let customPlaylists = StorageManager.getPlaylists();
    let custom = customPlaylists.find(p => p.id === playlistId);
    const user = AuthManager.getCurrentUser();
    if (!custom && user?.uid) {
      try {
        customPlaylists = await DbManager.getPlaylists(user.uid);
        custom = customPlaylists.find(p => p.id === playlistId);
      } catch (_) {}
    }

    if (custom) {
      playlist = {
        id: custom.id,
        title: custom.name,
        subtitle: 'Custom Playlist',
        cover: 'assets/images/ember_banner.jpg',
        description: custom.description || 'Your personalized collection on Ember.',
        stats: `${(custom.tracks || []).length} songs`
      };
      playlistTracks = custom.tracks || [];
    } else {
      // YouTube Music playlist or album collection
      isCustom = false;
      showToast('Loading collection tracks...', 'info');
      try {
        playlistTracks = await YouTubeAPI.getPlaylistTracks(playlistId, 50);
      } catch (err) {
        console.warn('Failed to load playlist tracks:', err);
      }

      if (playlistTracks && playlistTracks.length > 0) {
        playlist = {
          id: playlistId,
          title: catalogMeta?.title || playlistTracks[0]?.channelTitle || 'YouTube Music Collection',
          subtitle: catalogMeta?.subtitle || playlistTracks[0]?.channelTitle || 'Album • YouTube Music',
          cover: catalogMeta?.cover || catalogMeta?.thumbnail || playlistTracks[0]?.thumbnail || 'assets/images/ember_banner.jpg',
          description: catalogMeta?.description || 'Curated album and playlist collection discovered via YouTube Music.',
          stats: `${playlistTracks.length} songs`
        };
      }
    }

    if (!playlist) {
      showToast('Playlist not found', 'warning');
      switchTab('library');
      return;
    }

    el.viewport.innerHTML = `
      <!-- Playlist Top Nav Row -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <button class="header-icon-btn" id="btn-playlist-back" title="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style="font-size:0.85rem; font-weight:600; color:var(--text-gray); text-transform:uppercase;">Playlist</span>
        <button class="header-icon-btn" id="btn-playlist-options" title="${isCustom ? 'Rename Playlist' : 'Options'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      <!-- Playlist Hero -->
      <div class="playlist-hero-header">
        <div class="playlist-cover-big">
          <img src="${escapeHtml(playlist.cover || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(playlist.title)}">
        </div>
        <h2 class="playlist-info-title">${escapeHtml(playlist.title)}</h2>
        <div class="playlist-info-creator">${escapeHtml(playlist.subtitle || 'Playlist • Ember')}</div>

        <div style="font-size:0.8rem; color:rgba(255,255,255,0.9); margin-bottom:6px;">
          ${escapeHtml(playlist.description || 'Curated soundscape for your mood.')}
        </div>
        <div style="font-size:0.72rem; color:var(--text-dim); margin-bottom:16px;">
          ${escapeHtml(playlist.stats || `${playlistTracks.length} songs`)}
        </div>

        <div class="playlist-action-bar">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="header-icon-btn" id="btn-share-pl" title="Share">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            ${isCustom ? `
              <button class="header-icon-btn" id="btn-delete-pl" title="Delete Playlist" style="color:#ff5252; transition:opacity 0.2s ease;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            ` : ''}
          </div>

          <button class="btn-big-play-playlist" id="btn-play-all-playlist" title="Play All">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </button>
        </div>
      </div>

      <!-- Playlist Songs List -->
      <div class="song-list-container" id="playlist-tracks-container">
        ${playlistTracks.length > 0
          ? playlistTracks.map((track, i) => createSongRowHtml(track, i)).join('')
          : '<div style="text-align:center; padding:30px; color:var(--text-gray); font-size:0.82rem;">No songs in this playlist yet. Add songs using the + button on any song row!</div>'
        }
      </div>
    `;

    document.getElementById('btn-playlist-back')?.addEventListener('click', () => {
      switchTab(state.previousTab || 'home');
    });

    document.getElementById('btn-share-pl')?.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        showToast('Playlist link copied to clipboard!', 'success');
      }
    });

    if (isCustom) {
      const deleteBtn = document.getElementById('btn-delete-pl');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
            await DbManager.deletePlaylist(playlist.id);
            showToast(`Deleted playlist "${playlist.title}"`, 'info');
            renderSidebarPlaylists();
            switchTab('library');
          }
        });
      }
    }

    const optionsBtn = document.getElementById('btn-playlist-options');
    if (optionsBtn) {
      optionsBtn.addEventListener('click', async () => {
        if (isCustom) {
          const newName = prompt('Enter new playlist name:', playlist.title);
          if (newName && newName.trim() && newName.trim() !== playlist.title) {
            await DbManager.renamePlaylist(playlist.id, newName.trim());
            showToast(`Renamed to "${newName.trim()}"`, 'success');
            openPlaylistView(playlist.id);
            renderSidebarPlaylists();
          }
        } else {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            showToast(`Playlist link copied to clipboard!`, 'success');
          }
        }
      });
    }

    const playAllBtn = document.getElementById('btn-play-all-playlist');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => {
        if (playlistTracks.length > 0) {
          player.setQueue(playlistTracks, 0, true);
          showToast(`Playing "${playlist.title}"`, 'success');
        }
      });
    }

    bindSongRows(document.getElementById('playlist-tracks-container'), playlistTracks);

    if (autoPlay && playlistTracks.length > 0) {
      player.setQueue(playlistTracks, 0, true);
    }
  }

  /* ==========================================================================
     Screen 8: DEDICATED LIKED SONGS VIEW (Requirement 6)
     ========================================================================== */
  async function openLikedSongsView() {
    state.previousTab = state.currentTab;
    state.currentTab = 'liked-songs';

    const user = AuthManager.getCurrentUser();
    const likedTracks = await DbManager.getLikedSongs(user?.uid);

    el.viewport.innerHTML = `
      <!-- Top Nav -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <button class="header-icon-btn" id="btn-liked-back" title="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style="font-size:0.85rem; font-weight:600; color:var(--text-gray); text-transform:uppercase;">Collection</span>
        <div style="width:36px;"></div>
      </div>

      <!-- Hero Banner -->
      <div class="playlist-hero-header">
        <div class="playlist-cover-big" style="background:linear-gradient(135deg, #2b2b48 0%, #0c0c14 100%); display:flex; align-items:center; justify-content:center; border:1px solid var(--border-card);">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="#ffffff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <h2 class="playlist-info-title">Liked Songs</h2>
        <div class="playlist-info-creator">${user ? escapeHtml(user.displayName) : 'Guest Collection'}</div>
        <div style="font-size:0.75rem; color:var(--text-dim); margin-bottom:16px;">
          ${likedTracks.length} ${likedTracks.length === 1 ? 'song' : 'songs'} saved
        </div>

        <div class="playlist-action-bar">
          <div></div>
          <button class="btn-big-play-playlist" id="btn-play-all-liked" title="Play All Liked">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </button>
        </div>
      </div>

      <!-- Songs List -->
      <div class="song-list-container" id="liked-tracks-container">
        ${likedTracks.length > 0
          ? likedTracks.map((track, i) => createSongRowHtml(track, i)).join('')
          : '<div style="text-align:center; padding:48px 20px; color:var(--text-gray); font-size:0.88rem;">No liked songs yet.<br><span style="font-size:0.75rem; color:var(--text-dim);">Tap the heart icon on any track to save it here.</span></div>'
        }
      </div>
    `;

    document.getElementById('btn-liked-back')?.addEventListener('click', () => {
      switchTab(state.previousTab || 'library');
    });

    document.getElementById('btn-play-all-liked')?.addEventListener('click', () => {
      if (likedTracks.length > 0) {
        player.setQueue(likedTracks, 0, true);
        showToast('Playing Liked Songs', 'success');
      } else {
        showToast('No liked songs in your collection yet', 'info');
      }
    });

    bindSongRows(document.getElementById('liked-tracks-container'), likedTracks);
  }

  /* ==========================================================================
     Screen 9: YOUR LIBRARY VIEW
     ========================================================================== */
  async function renderLibraryView() {
    state.currentTab = 'library';
    const user = AuthManager.getCurrentUser();
    const liked = await DbManager.getLikedSongs(user?.uid);
    const customPlaylists = await DbManager.getPlaylists(user?.uid);
    renderSidebarPlaylists();

    el.viewport.innerHTML = `
      <div class="section-title-row" style="margin-bottom:18px;">
        <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-white);">Your Library</h2>
      </div>

      <!-- Filter Chips -->
      <div class="filter-pills-row" style="margin-bottom:20px;">
        <button class="ember-pill active" id="lib-pill-playlists">Playlists</button>
        <button class="ember-pill" id="lib-pill-artists">Artists</button>
        <button class="ember-pill" id="lib-pill-albums">Albums</button>
      </div>

      <!-- Playlists Section -->
      <div class="section-title-row">
        <h3>Your Playlists</h3>
      </div>

      <!-- Create Playlist Button -->
      <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-card); border-radius:14px; cursor:pointer; margin-bottom:12px; border:1px solid var(--border-subtle);" id="btn-open-create-modal">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px dashed rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:20px; font-weight:700;">+</div>
        <div>
          <div style="font-size:0.88rem; font-weight:700; color:var(--text-white);">Create Playlist</div>
          <div style="font-size:0.72rem; color:var(--text-gray);">Build your custom sound collection</div>
        </div>
      </div>

      <!-- Liked Songs Playlist Row -->
      <div class="ember-song-row" id="row-liked-songs-pl" style="margin-bottom:12px; cursor:pointer;">
        <div style="width:44px; height:44px; border-radius:8px; background:linear-gradient(135deg, #2b2b48 0%, #0c0c14 100%); border:1px solid var(--border-card); display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <div class="song-row-meta">
          <div class="song-row-title">Liked Songs</div>
          <div class="song-row-artist">${liked.length} saved songs</div>
        </div>
      </div>

      <!-- User Custom Playlists -->
      <div id="library-custom-playlists">
        ${customPlaylists.map(pl => `
          <div class="ember-song-row" data-playlist-id="${escapeHtml(pl.id)}" style="margin-bottom:8px; cursor:pointer;">
            <div style="width:44px; height:44px; border-radius:8px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; color:var(--text-white); flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div class="song-row-meta">
              <div class="song-row-title">${escapeHtml(pl.name)}</div>
              <div class="song-row-artist">${(pl.tracks || []).length} songs • By You</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Liked songs row -> opens dedicated Liked Songs view
    const likedRow = document.getElementById('row-liked-songs-pl');
    if (likedRow) {
      likedRow.addEventListener('click', () => openLikedSongsView());
    }

    // Custom playlists click
    document.querySelectorAll('#library-custom-playlists .ember-song-row').forEach(row => {
      row.addEventListener('click', () => {
        openPlaylistView(row.dataset.playlistId);
      });
    });

    // Filter Chips Interactive Logic
    const libPillPlaylists = document.getElementById('lib-pill-playlists');
    const libPillArtists = document.getElementById('lib-pill-artists');
    const libPillAlbums = document.getElementById('lib-pill-albums');
    const customPlaylistsWrap = document.getElementById('library-custom-playlists');
    const openCreateBtn = document.getElementById('btn-open-create-modal');

    function setActiveLibPill(activeBtn) {
      [libPillPlaylists, libPillArtists, libPillAlbums].forEach(p => p?.classList.remove('active'));
      activeBtn?.classList.add('active');
    }

    libPillPlaylists?.addEventListener('click', () => {
      setActiveLibPill(libPillPlaylists);
      if (openCreateBtn) openCreateBtn.style.display = 'flex';
      if (likedRow) likedRow.style.display = 'flex';
      if (customPlaylistsWrap) {
        customPlaylistsWrap.innerHTML = customPlaylists.map(pl => `
          <div class="ember-song-row" data-playlist-id="${escapeHtml(pl.id)}" style="margin-bottom:8px; cursor:pointer;">
            <div style="width:44px; height:44px; border-radius:8px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; color:var(--text-white); flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div class="song-row-meta">
              <div class="song-row-title">${escapeHtml(pl.name)}</div>
              <div class="song-row-artist">${(pl.tracks || []).length} songs • By You</div>
            </div>
          </div>
        `).join('');
        customPlaylistsWrap.querySelectorAll('.ember-song-row').forEach(row => {
          row.addEventListener('click', () => openPlaylistView(row.dataset.playlistId));
        });
      }
    });

    libPillArtists?.addEventListener('click', () => {
      setActiveLibPill(libPillArtists);
      if (openCreateBtn) openCreateBtn.style.display = 'none';
      if (likedRow) likedRow.style.display = 'none';
      const artistMap = {};
      [...liked, ...customPlaylists.flatMap(p => p.tracks || [])].forEach(t => {
        const a = cleanArtistName(t.artist, t.title);
        if (a) artistMap[a] = (artistMap[a] || 0) + 1;
      });
      const artists = Object.entries(artistMap).sort((a,b) => b[1] - a[1]);
      if (customPlaylistsWrap) {
        if (artists.length === 0) {
          customPlaylistsWrap.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-gray); font-size:0.8rem;">No saved artists found. Like songs or create playlists to build your collection!</div>';
        } else {
          customPlaylistsWrap.innerHTML = artists.map(([artName, count]) => `
            <div class="ember-song-row lib-artist-item" data-artist="${escapeHtml(artName)}" style="margin-bottom:8px; cursor:pointer;">
              <div style="width:44px; height:44px; border-radius:50%; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; color:#ff6b4a; font-weight:700; flex-shrink:0;">
                ${escapeHtml(artName.slice(0, 2).toUpperCase())}
              </div>
              <div class="song-row-meta">
                <div class="song-row-title">${escapeHtml(artName)}</div>
                <div class="song-row-artist">${count} song${count > 1 ? 's' : ''} in your library</div>
              </div>
            </div>
          `).join('');
          customPlaylistsWrap.querySelectorAll('.lib-artist-item').forEach(item => {
            item.addEventListener('click', () => {
              state.searchQuery = item.dataset.artist;
              switchTab('search', false);
            });
          });
        }
      }
    });

    libPillAlbums?.addEventListener('click', () => {
      setActiveLibPill(libPillAlbums);
      if (openCreateBtn) openCreateBtn.style.display = 'none';
      if (likedRow) likedRow.style.display = 'none';
      if (customPlaylistsWrap) {
        customPlaylistsWrap.innerHTML = GENRE_CARDS.map(g => `
          <div class="ember-song-row" data-genre="${escapeHtml(g.name)}" style="margin-bottom:8px; cursor:pointer;">
            <img class="song-row-thumb" src="${escapeHtml(g.image || 'assets/images/ember_banner.jpg')}" alt="${escapeHtml(g.name)}" style="border-radius:8px;">
            <div class="song-row-meta">
              <div class="song-row-title">${escapeHtml(g.name)}</div>
              <div class="song-row-artist">Genre Collection</div>
            </div>
          </div>
        `).join('');
        customPlaylistsWrap.querySelectorAll('.ember-song-row').forEach(row => {
          row.addEventListener('click', () => {
            state.searchQuery = row.dataset.genre;
            switchTab('search', false);
          });
        });
      }
    });

    // Create modal button
    if (openCreateBtn) {
      openCreateBtn.addEventListener('click', () => {
        el.createPlaylistModal.style.display = 'flex';
        el.newPlaylistTitleInput.value = '';
        el.newPlaylistTitleInput.focus();
      });
    }
  }

  /* ==========================================================================
     Screen 10: USER PROFILE VIEW (Requirement 5 & 9 — Zero Social Data)
     ========================================================================== */
  async function renderProfileView() {
    state.currentTab = 'profile';
    const user = AuthManager.getCurrentUser();

    let profile = null;
    let prefs = { favorite_genres: [], favorite_artists: [] };
    let liked = [];
    let playlists = [];
    let history = [];

    if (user) {
      profile = await DbManager.getProfile(user.uid);
      prefs = await DbManager.getPreferences(user.uid);
      liked = await DbManager.getLikedSongs(user.uid);
      playlists = await DbManager.getPlaylists(user.uid);
      history = await DbManager.getListeningHistory(user.uid, 6);
    } else {
      liked = StorageManager.getLikedSongs();
      playlists = StorageManager.getPlaylists();
      history = StorageManager.getRecentTracks().slice(0, 6);
    }

    const displayName = profile?.display_name || user?.displayName || (user ? user.email.split('@')[0] : 'Guest Listener');
    const username = profile?.username || (user ? `@${user.email.split('@')[0]}` : '@guest');
    const initials = getInitials(displayName);
    const photoURL = profile?.avatar_url || user?.photoURL;

    el.viewport.innerHTML = `
      <div class="profile-screen-container">
        <!-- Avatar Circle -->
        <div class="profile-avatar-circle" style="overflow:hidden;">
          ${photoURL
            ? `<img src="${escapeHtml(photoURL)}" style="width:100%; height:100%; object-fit:cover;" alt="Avatar">`
            : (user ? initials : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`)
          }
        </div>

        <h2 class="profile-name">${escapeHtml(displayName)}</h2>
        <div class="profile-handle">${escapeHtml(username)}</div>

        ${user
          ? `<button class="btn-edit-profile" id="btn-edit-profile-trigger">Edit Profile</button>`
          : `<button class="btn-edit-profile" id="btn-login-profile-trigger" style="background:var(--text-white); color:#000; font-weight:700;">Sign In / Create Account</button>`
        }

        <!-- Clean Music Stats Row (Strictly Zero Followers/Following as per Req 9) -->
        <div class="profile-stats-row" style="margin:20px 0;">
          <div class="stat-item" style="flex:1;">
            <div class="stat-num">${playlists.length}</div>
            <div class="stat-lbl">Playlists</div>
          </div>
          <div class="stat-item" style="flex:1;">
            <div class="stat-num">${liked.length}</div>
            <div class="stat-lbl">Liked Songs</div>
          </div>
          <div class="stat-item" style="flex:1;">
            <div class="stat-num">${history.length}</div>
            <div class="stat-lbl">History</div>
          </div>
        </div>

        <!-- Music Preferences Section (Requirement 5) -->
        <div class="section-title-row" style="width:100%; margin-bottom:10px;">
          <h3>Music Preferences</h3>
          <span class="section-see-all" id="btn-tune-preferences">Edit ⚡</span>
        </div>
        <div style="width:100%; margin-bottom:20px; background:var(--bg-card); padding:16px; border-radius:16px; border:1px solid var(--border-card);">
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; font-weight:700; text-transform:uppercase;">Favorite Genres</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px;">
            ${(prefs.favorite_genres && prefs.favorite_genres.length > 0)
              ? prefs.favorite_genres.map(g => `<span class="ember-pill active" style="font-size:0.74rem; padding:4px 10px;">${escapeHtml(g)}</span>`).join('')
              : '<span style="font-size:0.76rem; color:var(--text-gray);">No genres selected yet. Tap Edit to tune.</span>'
            }
          </div>

          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; font-weight:700; text-transform:uppercase;">Favorite Artists</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${(prefs.favorite_artists && prefs.favorite_artists.length > 0)
              ? prefs.favorite_artists.map(a => `<span class="artist-badge-tag">${escapeHtml(a)}</span>`).join('')
              : '<span style="font-size:0.76rem; color:var(--text-gray);">No favorite artists added yet.</span>'
            }
          </div>
        </div>

        <!-- Listening History Section -->
        <div class="section-title-row" style="width:100%; margin-bottom:10px;">
          <h3>Listening History</h3>
          ${history.length > 0 ? `<span class="section-see-all" id="btn-clear-history-trigger" style="color:#ff6666;">Clear</span>` : ''}
        </div>
        <div class="song-list-container" id="profile-tracks-container" style="width:100%;">
          ${history.length > 0
            ? history.map((track, i) => createSongRowHtml(track, i)).join('')
            : '<div style="text-align:center; padding:24px; color:var(--text-gray); font-size:0.8rem;">No listening history yet. Play some tracks!</div>'
          }
        </div>

        <!-- Cloud Integration & Sign Out Actions -->
        <div style="width:100%; margin-top:24px; display:flex; flex-direction:column; gap:10px;">
          <button class="ember-pill" id="btn-open-cloud-config" style="width:100%; justify-content:center; padding:12px; font-size:0.82rem;">
            ⚙ Cloud Settings (Firebase &amp; Supabase)
          </button>
          ${user
            ? `<button class="ember-pill" id="btn-sign-out" style="width:100%; justify-content:center; padding:12px; font-size:0.82rem; background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.4); color:#fca5a5;">Sign Out</button>`
            : ''
          }
        </div>
      </div>
    `;

    // Events
    document.getElementById('btn-edit-profile-trigger')?.addEventListener('click', () => {
      openEditProfileModal(profile || user);
    });

    document.getElementById('btn-login-profile-trigger')?.addEventListener('click', () => {
      openAuthModal();
    });

    document.getElementById('btn-tune-preferences')?.addEventListener('click', () => {
      openOnboardingModal();
    });

    document.getElementById('btn-clear-history-trigger')?.addEventListener('click', async () => {
      await DbManager.clearListeningHistory(user?.uid);
      showToast('Listening history cleared', 'success');
      renderProfileView();
    });

    document.getElementById('btn-open-cloud-config')?.addEventListener('click', () => {
      openCredentialsModal();
    });

    document.getElementById('btn-sign-out')?.addEventListener('click', async () => {
      await AuthManager.signOut();
      showToast('Signed out', 'info');
      renderProfileView();
    });

    bindSongRows(document.getElementById('profile-tracks-container'), history);
  }

  /* ==========================================================================
     Tab Switching Navigation
     ========================================================================== */
  function switchTab(tabName, autoFocusSearch = false) {
    if (AuthManager.isGuest() && (tabName === 'library' || tabName === 'profile')) {
      openAuthModal('🔒 Please sign in to access ' + (tabName === 'library' ? 'Your Library' : 'Profile') + '.', true);
      return;
    }
    if (state.currentTab === tabName && tabName !== 'playlist' && tabName !== 'liked-songs') return;

    state.previousTab = state.currentTab;
    state.currentTab = tabName;

    // Update bottom nav tabs
    el.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update desktop sidebar tabs
    document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    switch (tabName) {
      case 'home':
        renderHomeView();
        break;
      case 'search':
        renderSearchView(autoFocusSearch);
        break;
      case 'library':
        renderLibraryView();
        break;
      case 'profile':
        renderProfileView();
        break;
      default:
        renderHomeView();
    }
  }
  window.switchTab = switchTab;

  // Bind Bottom Nav Tabs
  el.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchTab(target);
    });
  });

  // Header Brand and Profile buttons
  if (el.brandHomeBtn) {
    el.brandHomeBtn.addEventListener('click', () => switchTab('home'));
  }
  if (el.btnHeaderProfile) {
    el.btnHeaderProfile.addEventListener('click', () => {
      const user = AuthManager.getCurrentUser();
      if (!user) {
        openAuthModal();
      } else {
        switchTab('profile');
      }
    });
  }
  if (el.btnHeaderBell) {
    el.btnHeaderBell.addEventListener('click', () => {
      showToast('No new notifications. Your Ember soundscape is ready.', 'info');
    });
  }

  /* ==========================================================================
     Player Callbacks & Engine Sync
     ========================================================================== */
  player.onTrackChange = (track) => {
    if (!track) return;

    // Mini Player
    el.miniTitle.textContent = track.title;
    el.miniArtist.textContent = track.artist || track.channelTitle || 'Ember';
    el.miniThumb.src = track.thumbnail || 'assets/images/ember_banner.jpg';

    // Fullscreen Sheet
    el.sheetTitle.textContent = track.title;
    el.sheetArtist.textContent = track.artist || track.channelTitle || 'Ember';
    el.sheetArtwork.src = track.thumbnail || 'assets/images/ember_banner.jpg';

    // Sync Like Status
    const isLiked = StorageManager.isSongLiked(track.id);
    updateLikeIcons(isLiked);

    // Sync Active Playing highlights
    updateActiveSongRows(track.id);

    // Listening history logger (debounced 5 seconds to prevent logging skipped songs)
    if (state.historyLogTimer) clearTimeout(state.historyLogTimer);
    state.historyLogTimer = setTimeout(() => {
      const user = AuthManager.getCurrentUser();
      DbManager.addListeningHistory(user?.uid, track, player.currentTime || 5);
    }, 5000);
  };

  player.onStateChange = ({ isPlaying }) => {
    if (el.miniPlayIcon && el.miniPauseIcon) {
      el.miniPlayIcon.style.display = isPlaying ? 'none' : 'block';
      el.miniPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    if (el.sheetPlayIcon && el.sheetPauseIcon) {
      el.sheetPlayIcon.style.display = isPlaying ? 'none' : 'block';
      el.sheetPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    if (el.desktopPlayIcon && el.desktopPauseIcon) {
      el.desktopPlayIcon.style.display = isPlaying ? 'none' : 'block';
      el.desktopPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  };

  let isScrubbing = false;

  player.onTimeUpdate = ({ currentTime, duration }) => {
    if (isScrubbing) return;
    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Mini Player top bar
    if (el.miniProgressFill) el.miniProgressFill.style.width = `${progressPct}%`;

    // Sheet Scrubber
    if (el.sheetTimelineFill) el.sheetTimelineFill.style.width = `${progressPct}%`;
    if (el.sheetTimelineHandle) el.sheetTimelineHandle.style.left = `${progressPct}%`;
    if (el.sheetTimeCur) el.sheetTimeCur.textContent = formatTime(currentTime);
    if (el.sheetTimeTot) el.sheetTimeTot.textContent = formatTime(duration);

    // Desktop Timeline Scrubber
    if (el.desktopTimelineFill) el.desktopTimelineFill.style.width = `${progressPct}%`;
    if (el.desktopTimelineHandle) el.desktopTimelineHandle.style.left = `${progressPct}%`;
    if (el.desktopTimeCur) el.desktopTimeCur.textContent = formatTime(currentTime);
    if (el.desktopTimeTot) el.desktopTimeTot.textContent = formatTime(duration);
  };

  // Mini Player Controls
  el.miniPlayPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    player.togglePlay();
  });

  el.miniNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    player.next();
  });

  el.miniLikeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (player.currentTrack) {
      const user = AuthManager.getCurrentUser();
      const isLiked = await DbManager.toggleLikeSong(user?.uid, player.currentTrack);
      updateLikeIcons(isLiked);
      showToast(isLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
    }
  });

  // Open & Collapse Sheet
  el.miniTrackClickArea.addEventListener('click', () => {
    el.sheet.classList.add('active');
  });

  el.btnSheetCollapse.addEventListener('click', () => {
    el.sheet.classList.remove('active');
  });

  // Sheet Controls
  el.sheetPlayPauseBtn.addEventListener('click', () => player.togglePlay());
  el.sheetNextBtn.addEventListener('click', () => player.next());
  el.sheetPrevBtn.addEventListener('click', () => player.previous(true));

  el.sheetShuffleBtn.addEventListener('click', () => {
    const isShuffle = player.toggleShuffle();
    el.sheetShuffleBtn.classList.toggle('active', isShuffle);
    if (el.desktopShuffleBtn) el.desktopShuffleBtn.classList.toggle('active', isShuffle);
    showToast(isShuffle ? 'Shuffle is ON' : 'Shuffle is OFF');
  });

  el.sheetRepeatBtn.addEventListener('click', () => {
    const mode = player.toggleRepeat();
    const isActive = mode !== 'off';
    el.sheetRepeatBtn.classList.toggle('active', isActive);
    if (el.desktopRepeatBtn) el.desktopRepeatBtn.classList.toggle('active', isActive);
    showToast(`Repeat: ${mode.toUpperCase()}`);
  });

  el.sheetLikeBtn.addEventListener('click', async () => {
    if (player.currentTrack) {
      const user = AuthManager.getCurrentUser();
      const isLiked = await DbManager.toggleLikeSong(user?.uid, player.currentTrack);
      updateLikeIcons(isLiked);
      showToast(isLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
    }
  });

  if (el.btnSheetOptions) {
    el.btnSheetOptions.addEventListener('click', (e) => {
      e.stopPropagation();
      if (player.currentTrack) {
        openAddToPlaylistModal(player.currentTrack);
      } else {
        showToast('No song is currently playing', 'info');
      }
    });
  }

  // Music Player Scrubber & Timeline Dragging
  function getSafeDuration() {
    if (typeof player.getDuration === 'function') {
      const d = player.getDuration();
      if (d > 0) return d;
    }
    return (player.duration && player.duration > 0) ? player.duration : 0;
  }

  function commitSeek(ratio) {
    const dur = getSafeDuration();
    if (dur > 0) {
      player.seekTo(dur * ratio);
    } else if (typeof player.seekPercent === 'function') {
      player.seekPercent(ratio * 100);
    }
  }

  function renderScrubPreview(ratio) {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const pct = clampedRatio * 100;
    if (el.sheetTimelineFill) el.sheetTimelineFill.style.width = `${pct}%`;
    if (el.sheetTimelineHandle) el.sheetTimelineHandle.style.left = `${pct}%`;
    if (el.desktopTimelineFill) el.desktopTimelineFill.style.width = `${pct}%`;
    if (el.desktopTimelineHandle) el.desktopTimelineHandle.style.left = `${pct}%`;
    if (el.miniProgressFill) el.miniProgressFill.style.width = `${pct}%`;

    const dur = getSafeDuration();
    if (dur > 0) {
      const cur = dur * clampedRatio;
      if (el.sheetTimeCur) el.sheetTimeCur.textContent = formatTime(cur);
      if (el.desktopTimeCur) el.desktopTimeCur.textContent = formatTime(cur);
    }
  }

  function setupTimelineScrubber(barEl) {
    if (!barEl) return;

    function getRatio(e) {
      const rect = barEl.getBoundingClientRect();
      if (!rect.width || rect.width <= 0) return 0;
      const clientX = (e.clientX !== undefined && e.clientX !== null)
        ? e.clientX
        : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    barEl.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();
      isScrubbing = true;
      barEl.classList.add('dragging');
      try { barEl.setPointerCapture(e.pointerId); } catch (_) {}
      const ratio = getRatio(e);
      renderScrubPreview(ratio);
    });

    barEl.addEventListener('pointermove', (e) => {
      if (!isScrubbing) return;
      e.stopPropagation();
      const ratio = getRatio(e);
      renderScrubPreview(ratio);
    });

    barEl.addEventListener('pointerup', (e) => {
      if (!isScrubbing) return;
      e.stopPropagation();
      isScrubbing = false;
      barEl.classList.remove('dragging');
      try { barEl.releasePointerCapture(e.pointerId); } catch (_) {}
      const ratio = getRatio(e);
      renderScrubPreview(ratio);
      commitSeek(ratio);
    });

    barEl.addEventListener('pointercancel', (e) => {
      if (!isScrubbing) return;
      isScrubbing = false;
      barEl.classList.remove('dragging');
      try { barEl.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    // Support mouse wheel scrolling directly on the timeline bar!
    barEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dur = getSafeDuration();
      if (dur <= 0) return;
      const cur = (typeof player.getCurrentTime === 'function') ? player.getCurrentTime() : (player.currentTime || 0);
      const delta = (e.deltaY < 0 || e.deltaX > 0) ? 5 : -5;
      player.seekTo(cur + delta);
    }, { passive: false });
  }

  // Setup all scrubber bars (sheet, desktop timeline, mini player progress)
  setupTimelineScrubber(el.sheetTimeline);
  setupTimelineScrubber(el.desktopTimeline);
  setupTimelineScrubber(el.miniProgressLine);

  window.addEventListener('pointerup', () => {
    if (isScrubbing) {
      isScrubbing = false;
      if (el.sheetTimeline) el.sheetTimeline.classList.remove('dragging');
      if (el.desktopTimeline) el.desktopTimeline.classList.remove('dragging');
      if (el.miniProgressLine) el.miniProgressLine.classList.remove('dragging');
    }
  });

  window.addEventListener('pointercancel', () => {
    if (isScrubbing) {
      isScrubbing = false;
      if (el.sheetTimeline) el.sheetTimeline.classList.remove('dragging');
      if (el.desktopTimeline) el.desktopTimeline.classList.remove('dragging');
      if (el.miniProgressLine) el.miniProgressLine.classList.remove('dragging');
    }
  });

  /* ==========================================================================
     Desktop Controls & Navigation Bindings
     ========================================================================== */
  if (el.desktopPlayPauseBtn) {
    el.desktopPlayPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      player.togglePlay();
    });
  }
  if (el.desktopNextBtn) {
    el.desktopNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      player.next();
    });
  }
  if (el.desktopPrevBtn) {
    el.desktopPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      player.previous(true);
    });
  }
  if (el.desktopShuffleBtn) {
    el.desktopShuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShuffle = player.toggleShuffle();
      el.desktopShuffleBtn.classList.toggle('active', isShuffle);
      if (el.sheetShuffleBtn) el.sheetShuffleBtn.classList.toggle('active', isShuffle);
      showToast(isShuffle ? 'Shuffle ON' : 'Shuffle OFF');
    });
  }
  if (el.desktopRepeatBtn) {
    el.desktopRepeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = player.toggleRepeat();
      const isActive = mode !== 'off';
      el.desktopRepeatBtn.classList.toggle('active', isActive);
      if (el.sheetRepeatBtn) el.sheetRepeatBtn.classList.toggle('active', isActive);
      showToast(`Repeat: ${mode.toUpperCase()}`);
    });
  }
  if (el.desktopLikeBtn) {
    el.desktopLikeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (player.currentTrack) {
        const user = AuthManager.getCurrentUser();
        const isLiked = await DbManager.toggleLikeSong(user?.uid, player.currentTrack);
        updateLikeIcons(isLiked);
        showToast(isLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
      }
    });
  }

  // Desktop Volume Slider
  if (el.desktopVolumeSlider) {
    el.desktopVolumeSlider.value = player.volume;
    el.desktopVolumeSlider.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10);
      player.setVolume(vol);
      syncDesktopVolumeIcons(vol === 0 || player.isMuted);
    });
  }

  function syncDesktopVolumeIcons(isMuted) {
    if (el.desktopVolIconHigh && el.desktopVolIconMuted) {
      el.desktopVolIconHigh.style.display = isMuted ? 'none' : 'block';
      el.desktopVolIconMuted.style.display = isMuted ? 'block' : 'none';
    }
  }

  if (el.desktopVolumeBtn) {
    el.desktopVolumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = player.toggleMute();
      syncDesktopVolumeIcons(isMuted);
      if (el.desktopVolumeSlider) {
        el.desktopVolumeSlider.value = isMuted ? 0 : player.volume;
      }
    });
  }

  // Video Mode Toggle (Desktop & Mobile Sheet)
  function toggleVideoPlayer() {
    if (!el.ytWrapper) return;
    const isActive = el.ytWrapper.classList.toggle('video-active');
    if (el.desktopVideoBtn) el.desktopVideoBtn.classList.toggle('active', isActive);
    if (el.sheetToggleVideoBtn) el.sheetToggleVideoBtn.classList.toggle('active', isActive);
    showToast(isActive ? 'Video mode enabled' : 'Video mode closed', 'info');
  }

  if (el.desktopVideoBtn) {
    el.desktopVideoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideoPlayer();
    });
  }
  if (el.sheetToggleVideoBtn) {
    el.sheetToggleVideoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideoPlayer();
    });
  }
  if (el.btnCloseVideo) {
    el.btnCloseVideo.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.ytWrapper) el.ytWrapper.classList.remove('video-active');
      if (el.desktopVideoBtn) el.desktopVideoBtn.classList.remove('active');
      if (el.sheetToggleVideoBtn) el.sheetToggleVideoBtn.classList.remove('active');
    });
  }

  // Desktop Expand Player Button
  if (el.desktopExpandBtn) {
    el.desktopExpandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.sheet.classList.add('active');
    });
  }

  // Queue Buttons (Desktop & Sheet)
  if (el.desktopQueueBtn) {
    el.desktopQueueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQueueModal();
    });
  }
  if (el.sheetQueueBtn) {
    el.sheetQueueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQueueModal();
    });
  }
  if (el.btnCloseQueue) {
    el.btnCloseQueue.addEventListener('click', () => closeQueueModal());
  }
  if (el.btnClearQueue) {
    el.btnClearQueue.addEventListener('click', () => {
      player.clearQueue();
      showToast('Queue cleared', 'info');
      renderQueueList();
    });
  }

  // Desktop Sidebar Navigation
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });

  if (el.sidebarBrandBtn) {
    el.sidebarBrandBtn.addEventListener('click', () => switchTab('home'));
  }
  if (el.sidebarUserFooter) {
    el.sidebarUserFooter.addEventListener('click', () => {
      const user = AuthManager.getCurrentUser();
      if (!user) openAuthModal();
      else switchTab('profile');
    });
  }
  if (el.sidebarLikedBtn) {
    el.sidebarLikedBtn.addEventListener('click', () => openLikedSongsView());
  }
  if (el.sidebarCreatePlBtn) {
    el.sidebarCreatePlBtn.addEventListener('click', () => {
      el.createPlaylistModal.style.display = 'flex';
      el.newPlaylistTitleInput.value = '';
      el.newPlaylistTitleInput.focus();
    });
  }

  document.querySelectorAll('.sidebar-playlist-link').forEach(link => {
    link.addEventListener('click', () => {
      const plId = link.dataset.playlistId;
      if (plId) openPlaylistView(plId);
    });
  });

  if (el.desktopNavBack) {
    el.desktopNavBack.addEventListener('click', () => {
      switchTab(state.previousTab || 'home');
    });
  }
  if (el.desktopTopSearchInput) {
    el.desktopTopSearchInput.addEventListener('focus', () => {
      if (state.currentTab !== 'search') {
        switchTab('search', false);
      }
    });

    el.desktopTopSearchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      state.searchQuery = q;
      const sInput = document.getElementById('search-input');
      if (sInput && sInput.value !== q) sInput.value = q;
      const cBtn = document.getElementById('search-clear-btn');
      if (cBtn) cBtn.style.display = q ? 'block' : 'none';
    });

    el.desktopTopSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = el.desktopTopSearchInput.value.trim();
        state.searchQuery = q;
        if (state.currentTab !== 'search') {
          switchTab('search', false);
        } else if (typeof window.emberExecuteSearch === 'function') {
          window.emberExecuteSearch(q);
        }
      }
    });
  }

  // Global Keyboard Shortcuts (Hotkeys)
  window.addEventListener('keydown', (e) => {
    // 1. Search shortcut Ctrl+K / Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchTab('search', true);
      const sInput = document.getElementById('search-input') || el.desktopTopSearchInput;
      if (sInput) sInput.focus();
      return;
    }

    // Do not intercept hotkeys if typing in an input, textarea or contenteditable
    const activeEl = document.activeElement;
    const isTyping = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.isContentEditable
    );
    if (isTyping) return;

    // 2. Spacebar: Play / Pause toggle
    if (e.code === 'Space') {
      e.preventDefault();
      player.togglePlay();
    }
    // Previous track shortcut: Shift+ArrowLeft or 'p'
    else if ((e.shiftKey && e.key === 'ArrowLeft') || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      player.previous(true);
    }
    // Next track shortcut: Shift+ArrowRight or 'n'
    else if ((e.shiftKey && e.key === 'ArrowRight') || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      player.next();
    }
    // 3. ArrowLeft: Seek backward 5 seconds ("Scroll music back")
    else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const dur = getSafeDuration();
      if (dur > 0) {
        const cur = (typeof player.getCurrentTime === 'function') ? player.getCurrentTime() : (player.currentTime || 0);
        player.seekTo(cur - 5);
      }
    }
    // 4. ArrowRight: Seek forward 5 seconds ("Scroll music forward")
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const dur = getSafeDuration();
      if (dur > 0) {
        const cur = (typeof player.getCurrentTime === 'function') ? player.getCurrentTime() : (player.currentTime || 0);
        player.seekTo(cur + 5);
      }
    }
  });

  /* ==========================================================================
     Create Playlist Modal Logic
     ========================================================================== */
  el.btnCancelCreatePl.addEventListener('click', () => {
    el.createPlaylistModal.style.display = 'none';
  });

  el.btnConfirmCreatePl.addEventListener('click', async () => {
    const title = el.newPlaylistTitleInput.value.trim();
    if (!title) {
      showToast('Please enter a playlist title', 'warning');
      return;
    }

    const user = AuthManager.getCurrentUser();
    const newPl = await DbManager.createPlaylist(user?.uid, title);
    el.createPlaylistModal.style.display = 'none';
    showToast(`Created playlist "${title}"`, 'success');

    if (state.currentTab === 'library') {
      renderLibraryView();
    }
    renderSidebarPlaylists();
    if (newPl && newPl.id) {
      openPlaylistView(newPl.id);
    }
  });

  /* ==========================================================================
     Authentication Modal Logic (Requirement 1)
     ========================================================================== */
  let authMode = 'login'; // 'login' | 'signup'

  function formatAuthErrorMessage(err, isGoogle = false) {
    if (!err) return 'An unexpected authentication error occurred.';
    const code = err.code || '';
    switch (code) {
      case 'auth/unauthorized-domain':
        return `Domain "${window.location.hostname || 'localhost'}" is not authorized! In Firebase Console > Authentication > Settings > Authorized Domains, add "${window.location.hostname || 'localhost'}".`;
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        if (isGoogle) {
          return 'Google Sign-In is not enabled in your Firebase project! In Firebase Console > Authentication > Sign-in method, click Google, toggle Enable, select a Project support email, and click Save.';
        } else {
          return 'Email/Password sign-in is not enabled in your Firebase project! In Firebase Console > Authentication > Sign-in method, click "Email/Password", toggle Enable, and click Save.';
        }
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please allow popups for this site or use redirect.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In was cancelled (popup window was closed).';
      case 'auth/cancelled-popup-request':
        return 'Previous popup request was cancelled.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid.':
        return 'Invalid Firebase API Key. Please verify your credentials in js/config.js or Cloud Settings.';
      case 'auth/user-disabled':
        return 'This account has been disabled in the Firebase Console.';
      case 'auth/network-request-failed':
        return 'Network connection failed. Please check your internet connection.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/user-not-found':
        return 'No user found with this email. Please create an account first.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address. Please sign in instead.';
      default:
        if (err.message && err.message.includes('FIREBASE_NOT_CONFIGURED')) {
          return "Firebase credentials not configured! Click here to open Cloud Settings.";
        }
        return err.message || 'Authentication failed.';
    }
  }

  function openAuthModal(reason = null, mandatory = false) {
    el.authModal.style.display = 'flex';
    setAuthMode('login');
    el.authForgotView.style.display = 'none';
    el.authForm.style.display = 'block';

    const isMandatory = mandatory || AuthManager.isGuest();
    if (el.btnCloseAuthModal) {
      el.btnCloseAuthModal.style.display = isMandatory ? 'none' : 'block';
    }

    if (reason) {
      showAuthAlert(reason, 'info');
    } else if (isMandatory) {
      showAuthAlert('🔒 Sign in to start listening to music on EMBER.', 'info');
    } else if (!EmberConfig.isFirebaseConfigured()) {
      showAuthAlert('⚙️ Firebase not connected. Tap here to enter your Firebase credentials.', 'info');
      el.authAlertBox.style.cursor = 'pointer';
      el.authAlertBox.onclick = () => {
        closeAuthModal(true);
        openCredentialsModal();
      };
    } else {
      clearAuthAlert();
    }
  }

  function closeAuthModal(force = false) {
    if (!force && AuthManager.isGuest()) {
      showToast('Please sign in or create an account to access EMBER.', 'warning');
      return;
    }
    el.authModal.style.display = 'none';
    clearAuthAlert();
  }

  // Expose auth gate globally
  window.openEmberAuthGate = (reason) => openAuthModal(reason, true);

  function setAuthMode(mode) {
    authMode = mode;
    clearAuthAlert();
    if (mode === 'login') {
      el.tabAuthLogin.classList.add('active');
      el.tabAuthSignup.classList.remove('active');
      el.authNameGroup.style.display = 'none';
      el.btnAuthSubmit.textContent = 'Sign In';
      el.btnShowForgotPw.style.display = 'inline-block';
    } else {
      el.tabAuthSignup.classList.add('active');
      el.tabAuthLogin.classList.remove('active');
      el.authNameGroup.style.display = 'block';
      el.btnAuthSubmit.textContent = 'Create Account';
      el.btnShowForgotPw.style.display = 'none';
    }
  }

  function showAuthAlert(msg, type = 'error') {
    el.authAlertBox.textContent = msg;
    el.authAlertBox.className = `auth-alert ${type}`;
    el.authAlertBox.style.display = 'block';
  }

  function clearAuthAlert() {
    el.authAlertBox.textContent = '';
    el.authAlertBox.className = 'auth-alert';
    el.authAlertBox.style.display = 'none';
    el.authAlertBox.style.cursor = 'default';
    el.authAlertBox.onclick = null;
  }

  el.tabAuthLogin.addEventListener('click', () => setAuthMode('login'));
  el.tabAuthSignup.addEventListener('click', () => setAuthMode('signup'));
  el.btnCloseAuthModal.addEventListener('click', () => closeAuthModal(true));
  if (el.btnGuestContinue) {
    el.btnGuestContinue.style.display = 'none';
  }

  if (el.authForm) {
    el.authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      el.btnAuthSubmit.click();
    });
  }

  // Google Sign-In
  el.btnGoogleAuth.addEventListener('click', async () => {
    try {
      el.btnGoogleAuth.disabled = true;
      el.btnGoogleAuth.style.opacity = '0.6';
      const user = await AuthManager.signInWithGoogle();
      if (user) {
        closeAuthModal();
        showToast(`Welcome to Ember, ${user.displayName || 'listener'}!`, 'success');
      }
    } catch (err) {
      console.error('[Google Auth Error]', err);
      const msg = formatAuthErrorMessage(err, true);
      showAuthAlert(msg, 'error');

      if (err.message && err.message.includes('FIREBASE_NOT_CONFIGURED')) {
        el.authAlertBox.style.cursor = 'pointer';
        el.authAlertBox.onclick = () => {
          closeAuthModal();
          openCredentialsModal();
        };
      }
    } finally {
      el.btnGoogleAuth.disabled = false;
      el.btnGoogleAuth.style.opacity = '1';
    }
  });

  // Email/Password Submit
  el.btnAuthSubmit.addEventListener('click', async () => {
    const email = el.authEmailInput.value.trim();
    const pass = el.authPasswordInput.value.trim();
    const name = el.authNameInput.value.trim();

    if (!email || !pass) {
      showAuthAlert('Please fill in both email and password.');
      return;
    }

    try {
      el.btnAuthSubmit.disabled = true;
      el.btnAuthSubmit.textContent = authMode === 'login' ? 'Signing In...' : 'Creating Account...';

      if (authMode === 'login') {
        const user = await AuthManager.signIn(email, pass);
        closeAuthModal();
        showToast(`Welcome back, ${user.displayName}!`, 'success');
      } else {
        const user = await AuthManager.signUp(email, pass, name);
        closeAuthModal();
        showToast(`Account created! Welcome, ${user.displayName}.`, 'success');
      }
    } catch (err) {
      const msg = formatAuthErrorMessage(err, false);
      showAuthAlert(msg);
    } finally {
      el.btnAuthSubmit.disabled = false;
      el.btnAuthSubmit.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    }
  });

  // Forgot Password View
  el.btnShowForgotPw.addEventListener('click', () => {
    el.authForm.style.display = 'none';
    el.authForgotView.style.display = 'block';
    el.authResetEmailInput.value = el.authEmailInput.value;
    clearAuthAlert();
  });

  el.btnBackToLogin.addEventListener('click', () => {
    el.authForgotView.style.display = 'none';
    el.authForm.style.display = 'block';
    clearAuthAlert();
  });

  el.btnSendResetLink.addEventListener('click', async () => {
    const email = el.authResetEmailInput.value.trim();
    if (!email) {
      showAuthAlert('Please enter your email.');
      return;
    }
    try {
      el.btnSendResetLink.disabled = true;
      el.btnSendResetLink.textContent = 'Sending...';
      await AuthManager.sendPasswordReset(email);
      showAuthAlert('Password reset email sent! Check your inbox.', 'success');
    } catch (err) {
      showAuthAlert(err.message);
    } finally {
      el.btnSendResetLink.disabled = false;
      el.btnSendResetLink.textContent = 'Send Reset Email';
    }
  });

  /* ==========================================================================
     Onboarding Modal Logic (Requirement 5 — user_preferences)
     ========================================================================== */
  function openOnboardingModal(existingPrefs = null) {
    el.onboardingModal.style.display = 'flex';
    state.selectedGenres.clear();
    state.selectedArtists.clear();

    if (existingPrefs) {
      (existingPrefs.favorite_genres || []).forEach(g => state.selectedGenres.add(g));
      (existingPrefs.favorite_artists || []).forEach(a => state.selectedArtists.add(a));
    }

    renderOnboardingPills();
    renderOnboardingArtistTags();
  }

  function renderOnboardingPills() {
    el.onboardingGenrePills.querySelectorAll('.genre-select-pill').forEach(pill => {
      const g = pill.dataset.genre;
      pill.classList.toggle('selected', state.selectedGenres.has(g));
    });
  }

  function renderOnboardingArtistTags() {
    el.onboardingArtistTags.innerHTML = Array.from(state.selectedArtists).map(artist => `
      <div class="artist-badge-tag">
        <span>${escapeHtml(artist)}</span>
        <span class="remove-tag" data-artist="${escapeHtml(artist)}">✕</span>
      </div>
    `).join('');

    el.onboardingArtistTags.querySelectorAll('.remove-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        state.selectedArtists.delete(tag.dataset.artist);
        renderOnboardingArtistTags();
      });
    });
  }

  // Genre pill click
  el.onboardingGenrePills.querySelectorAll('.genre-select-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const g = pill.dataset.genre;
      if (state.selectedGenres.has(g)) {
        state.selectedGenres.delete(g);
      } else {
        state.selectedGenres.add(g);
      }
      renderOnboardingPills();
    });
  });

  // Artist input Enter
  el.onboardingArtistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = el.onboardingArtistInput.value.trim();
      if (val) {
        state.selectedArtists.add(val);
        el.onboardingArtistInput.value = '';
        renderOnboardingArtistTags();
      }
    }
  });

  if (el.btnCloseOnboarding) {
    el.btnCloseOnboarding.addEventListener('click', () => {
      el.onboardingModal.style.display = 'none';
      const user = AuthManager.getCurrentUser();
      if (user?.uid) {
        localStorage.setItem(`ember_onboarding_dismissed_${user.uid}`, 'true');
      }
    });
  }

  el.btnSkipOnboarding.addEventListener('click', async () => {
    el.onboardingModal.style.display = 'none';
    const user = AuthManager.getCurrentUser();
    if (user?.uid) {
      localStorage.setItem(`ember_onboarding_dismissed_${user.uid}`, 'true');
      try {
        await DbManager.savePreferences(user.uid, {
          favorite_genres: ['All'],
          favorite_artists: []
        });
      } catch (_) {}
    }
    showToast('Preferences set. You can customize anytime in Profile.', 'info');
  });

  el.btnSaveOnboarding.addEventListener('click', async () => {
    const user = AuthManager.getCurrentUser();
    const selected = Array.from(state.selectedGenres);
    const prefs = {
      favorite_genres: selected.length > 0 ? selected : ['All'],
      favorite_artists: Array.from(state.selectedArtists)
    };

    if (user?.uid) {
      localStorage.setItem(`ember_onboarding_dismissed_${user.uid}`, 'true');
      await DbManager.savePreferences(user.uid, prefs);
    }
    el.onboardingModal.style.display = 'none';
    showToast('Music preferences saved!', 'success');

    if (state.currentTab === 'profile') renderProfileView();
    if (state.currentTab === 'home') renderHomeView();
  });

  /* ==========================================================================
     Edit Profile Modal Logic (Requirement 5)
     ========================================================================== */
  function openEditProfileModal(profile) {
    el.editProfileModal.style.display = 'flex';
    el.editProfileDisplayName.value = profile?.display_name || profile?.displayName || '';
    el.editProfileUsername.value = profile?.username || '';
    el.editProfileAvatarUrl.value = profile?.avatar_url || profile?.photoURL || '';
  }

  el.btnCloseEditProfile.addEventListener('click', () => {
    el.editProfileModal.style.display = 'none';
  });

  el.btnCancelProfile.addEventListener('click', () => {
    el.editProfileModal.style.display = 'none';
  });

  el.btnSaveProfile.addEventListener('click', async () => {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    const updates = {
      display_name: el.editProfileDisplayName.value.trim(),
      username: el.editProfileUsername.value.trim().replace(/^@/, ''),
      avatar_url: el.editProfileAvatarUrl.value.trim() || null
    };

    try {
      await DbManager.updateProfile(user.uid, updates);
      user.displayName = updates.display_name;
      user.photoURL = updates.avatar_url;
      updateUserIdentityUI(user);
      el.editProfileModal.style.display = 'none';
      showToast('Profile updated!', 'success');
      renderProfileView();
    } catch (err) {
      showToast('Failed to update profile: ' + err.message, 'warning');
    }
  });

  /* ==========================================================================
     Credentials Modal Logic (Connect Firebase & Supabase)
     ========================================================================== */
  function openCredentialsModal() {
    el.credentialsModal.style.display = 'flex';
    el.cfgFirebaseJson.value = EmberConfig.isFirebaseConfigured()
      ? JSON.stringify(EmberConfig.FIREBASE, null, 2)
      : '';
    el.cfgSupabaseUrl.value = EmberConfig.isSupabaseConfigured()
      ? EmberConfig.SUPABASE.url
      : '';
    el.cfgSupabaseKey.value = EmberConfig.isSupabaseConfigured()
      ? EmberConfig.SUPABASE.anonKey
      : '';
  }

  el.btnCloseCredentials.addEventListener('click', () => {
    el.credentialsModal.style.display = 'none';
  });

  el.btnClearCloudCfg.addEventListener('click', () => {
    localStorage.removeItem('ember_fb_config');
    localStorage.removeItem('ember_sb_config');
    showToast('Reset to default configuration. Reloading...', 'info');
    setTimeout(() => window.location.reload(), 600);
  });

  function parseFirebaseConfigInput(input) {
    if (!input || !input.trim()) return null;
    const str = input.trim();
    try {
      return JSON.parse(str);
    } catch (_) {}

    try {
      const jsonLike = str
        .replace(/^(const|let|var)\s+\w+\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(jsonLike);
    } catch (_) {}

    const extracted = {};
    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    keys.forEach(k => {
      const match = str.match(new RegExp(`['"]?${k}['"]?\\s*:\\s*['"]([^'"]+)['"]`));
      if (match && match[1]) {
        extracted[k] = match[1];
      }
    });
    if (extracted.apiKey && extracted.projectId) {
      return extracted;
    }
    throw new Error("Could not parse Firebase configuration. Please paste valid JSON or Firebase config object containing apiKey and projectId.");
  }

  el.btnSaveCloudCfg.addEventListener('click', () => {
    try {
      let fb = null;
      if (el.cfgFirebaseJson.value.trim()) {
        fb = parseFirebaseConfigInput(el.cfgFirebaseJson.value.trim());
      }
      let sb = null;
      if (el.cfgSupabaseUrl.value.trim() && el.cfgSupabaseKey.value.trim()) {
        sb = {
          url: el.cfgSupabaseUrl.value.trim(),
          anonKey: el.cfgSupabaseKey.value.trim()
        };
      }
      EmberConfig.saveCustomOverrides(fb, sb);
      showToast('Cloud credentials saved! Initializing live services...', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      alert(e.message);
    }
  });

  // Modal Backdrop Click Dismiss
  [
    el.authModal,
    el.createPlaylistModal,
    el.onboardingModal,
    el.editProfileModal,
    el.credentialsModal,
    el.queueModal,
    document.getElementById('add-to-playlist-modal')
  ].forEach(modalEl => {
    if (!modalEl) return;
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        modalEl.style.display = 'none';
      }
    });
  });

  /* ==========================================================================
     Subscribe to Firebase Auth State Changes (Mandatory Auth Gated)
     ========================================================================== */
  AuthManager.onAuthStateChanged(async (user) => {
    updateUserIdentityUI(user);

    if (user) {
      // User is logged in: dismiss mandatory modal gate
      closeAuthModal(true);

      // Staging queue if empty
      if (player.queue.length === 0) {
        const recentTracks = StorageManager.getRecentTracks();
        const initialTracks = (recentTracks && recentTracks.length > 0) ? recentTracks : DEFAULT_TRACKS;
        player.setQueue(initialTracks, 0, false);
        if (initialTracks.length > 0) {
          player.currentTrack = initialTracks[0];
          player.onTrackChange(initialTracks[0]);
        }
      }

      // Ensure Supabase profile exists
      const { isNewUser } = await DbManager.ensureProfile(user);
      const prefs = await DbManager.getPreferences(user.uid);

      // Only offer taste onboarding once upon initial registration if not previously dismissed
      const isDismissed = localStorage.getItem(`ember_onboarding_dismissed_${user.uid}`) === 'true';
      const hasGenres = prefs && Array.isArray(prefs.favorite_genres) && prefs.favorite_genres.length > 0;
      if (isNewUser && !isDismissed && !hasGenres) {
        openOnboardingModal(prefs);
      }

      // Sync playlists and search history from Supabase
      DbManager.getPlaylists(user.uid).then(() => {
        renderSidebarPlaylists();
        if (state.currentTab === 'library') renderLibraryView();
      });
      DbManager.getSearchHistory(user.uid);
    } else {
      // User is logged out: halt playback completely and lock down app
      player.pause();
      if (player.audio) {
        player.audio.src = '';
      }
      player.currentTrack = null;
      if (player.onTrackChange) player.onTrackChange(null);

      // Enforce mandatory login gate
      openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
      renderSidebarPlaylists();
    }

    // Refresh active tab views that depend on user
    if (state.currentTab === 'profile') renderProfileView();
    if (state.currentTab === 'library') renderLibraryView();
    if (state.currentTab === 'home') renderHomeView();
  });

  // Initialize Auth
  await AuthManager.init();

  if (AuthManager.isGuest()) {
    openAuthModal('🔒 Welcome to EMBER. Please sign in to stream music.', true);
  } else {
    const recentTracks = StorageManager.getRecentTracks();
    const initialTracks = (recentTracks && recentTracks.length > 0) ? recentTracks : DEFAULT_TRACKS;
    player.setQueue(initialTracks, 0, false);
    if (initialTracks.length > 0) {
      const first = initialTracks[0];
      player.currentTrack = first;
      player.onTrackChange(first);
    }
  }

  // Initial Sidebar Playlists & View
  renderSidebarPlaylists();
  renderHomeView();

  } catch (err) {
    console.error('[Ember INIT ERROR]', err.stack || err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
