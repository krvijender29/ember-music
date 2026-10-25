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

    // Video Wrapper & Create Playlist Modal
    ytWrapper: document.getElementById('yt-player-wrapper'),
    btnCloseVideo: document.getElementById('btn-close-video'),
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

  function createSongRowHtml(track, index = 0) {
    const isPlayingThis = player.currentTrack && player.currentTrack.id === track.id;
    const user = AuthManager.getCurrentUser();
    const isLiked = StorageManager.isSongLiked(track.id);

    return `
      <div class="ember-song-row ${isPlayingThis ? 'playing' : ''}" data-track-id="${escapeHtml(track.id)}">
        <img class="song-row-thumb" src="${escapeHtml(track.thumbnail || 'assets/images/ember_midnight.jpg')}" alt="${escapeHtml(track.title)}" loading="lazy">
        <div class="song-row-meta">
          <div class="song-row-title">${escapeHtml(track.title)}</div>
          <div class="song-row-artist">${escapeHtml(track.artist || track.channelTitle || 'Ember Artist')}</div>
        </div>
        <div class="song-row-actions">
          <button class="btn-row-action btn-row-like ${isLiked ? 'liked' : ''}" data-track-id="${escapeHtml(track.id)}" title="Like">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function bindSongRows(container, tracksList) {
    if (!container) return;

    // Song row click -> play track (Mandatory Auth Protected)
    container.querySelectorAll('.ember-song-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-row-like')) return;

        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream this song on EMBER.', true);
          return;
        }

        const trackId = row.dataset.trackId;
        const selectedIndex = tracksList.findIndex(t => t.id === trackId);
        if (selectedIndex >= 0) {
          player.setQueue(tracksList, selectedIndex, true);
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

  /* ==========================================================================
     Screen 5: HOME VIEW (With Taste Recommendations & Recent History)
     ========================================================================== */
  async function renderHomeView() {
    state.currentTab = 'home';
    const user = AuthManager.getCurrentUser();

    // Load user recommendations & listening history
    const recommendedTracks = await DbManager.getRecommendations(user?.uid, DEFAULT_TRACKS);
    const recentHistory = await DbManager.getListeningHistory(user?.uid, 8);
    const displayRecent = recentHistory.length > 0 ? recentHistory : DEFAULT_TRACKS.slice(0, 8);

    el.viewport.innerHTML = `
      <!-- Home Search Box (Mobile) -->
      <div class="ember-search-box" id="home-search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="ember-search-input" id="home-search-input" placeholder="Search songs, artists, playlists...">
      </div>

      <!-- Good Morning Banner -->
      <div class="good-morning-banner" id="good-morning-hero">
        <img class="banner-bg-img" src="assets/images/ember_banner.jpg" alt="Good Morning Banner">
        <div class="banner-gradient-overlay"></div>
        <div class="banner-text-content">
          <h2>Good Morning</h2>
          <p>Let's make today sound better.</p>
        </div>
        <button class="banner-play-circle" id="banner-play-btn" title="Play Good Morning Mix">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
      </div>

      <!-- Recently Played / Featured Carousels -->
      <div class="section-title-row">
        <h3>Featured Playlists</h3>
        <span class="section-see-all" id="see-all-playlists">See All &gt;</span>
      </div>

      <div class="horizontal-card-scroll" id="home-playlists-scroll">
        ${CURATED_PLAYLISTS.map(pl => `
          <div class="ember-music-card" data-playlist-id="${escapeHtml(pl.id)}">
            <div class="card-img-wrapper">
              <img src="${escapeHtml(pl.cover)}" alt="${escapeHtml(pl.title)}" loading="lazy">
              <button class="card-play-hover-btn" data-play-playlist="${escapeHtml(pl.id)}" title="Play ${escapeHtml(pl.title)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg>
              </button>
            </div>
            <div class="card-title">${escapeHtml(pl.title)}</div>
            <div class="card-subtitle">${escapeHtml(pl.subtitle)}</div>
          </div>
        `).join('')}
      </div>

      <!-- Based on Your Taste Section (Requirement 7) -->
      <div class="section-title-row">
        <h3>Based on Your Taste</h3>
        <span class="section-see-all" id="tune-taste-shortcut">Tune Taste ⚡</span>
      </div>
      <div class="song-list-container" id="home-taste-songs">
        ${recommendedTracks.slice(0, 5).map((track, i) => createSongRowHtml(track, i)).join('')}
      </div>

      <!-- Made For You Banner -->
      <div class="section-title-row">
        <h3>Made For You</h3>
      </div>
      <div class="made-for-you-card" id="daily-mix-card">
        <div class="daily-mix-info">
          <h4>Daily Mix 1</h4>
          <p>Your favourite music, all in one place.</p>
        </div>
        <button class="banner-play-circle" id="btn-play-daily-mix" title="Play Daily Mix 1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
      </div>

      <!-- Recently Played Listening History -->
      <div class="section-title-row">
        <h3>Recently Played</h3>
      </div>
      <div class="song-list-container" id="home-mood-songs">
        ${displayRecent.map((track, i) => createSongRowHtml(track, i)).join('')}
      </div>
    `;

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

    // Event: Good Morning Play (Auth Protected)
    const bannerPlayBtn = document.getElementById('banner-play-btn');
    if (bannerPlayBtn) {
      bannerPlayBtn.addEventListener('click', () => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to stream music on EMBER.', true);
          return;
        }
        openPlaylistView('late-nights', true);
      });
    }

    // Event: Daily Mix Play (Auth Protected)
    const dailyMixCard = document.getElementById('daily-mix-card');
    if (dailyMixCard) {
      dailyMixCard.addEventListener('click', () => {
        if (AuthManager.isGuest()) {
          openAuthModal('🔒 Please sign in to play Daily Mix on EMBER.', true);
          return;
        }
        player.setQueue(DEFAULT_TRACKS, 0, true);
        showToast('Playing Daily Mix 1', 'success');
      });
    }

    // Event: Tune Taste shortcut
    const tuneTasteBtn = document.getElementById('tune-taste-shortcut');
    if (tuneTasteBtn) {
      tuneTasteBtn.addEventListener('click', () => openOnboardingModal());
    }

    // Event: Playlist card clicks
    document.querySelectorAll('.ember-music-card').forEach(card => {
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

    // Bind songs lists
    bindSongRows(document.getElementById('home-taste-songs'), recommendedTracks.slice(0, 5));
    bindSongRows(document.getElementById('home-mood-songs'), displayRecent);
  }

  /* ==========================================================================
     Screen 6: SEARCH VIEW
     ========================================================================== */
  function renderSearchView(autoFocus = false) {
    state.currentTab = 'search';

    el.viewport.innerHTML = `
      <div class="search-screen-container">
        <!-- Search Input Bar -->
        <div class="search-input-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="search-main-input" id="search-input" placeholder="Search songs, artists, playlists..." value="${escapeHtml(state.searchQuery)}">
          <button class="search-clear-btn" id="search-clear-btn" style="display:${state.searchQuery ? 'block' : 'none'};">✕</button>
        </div>

        <!-- Filter Chips Row -->
        <div class="filter-pills-row" style="margin-top:14px; margin-bottom:18px;">
          <button class="ember-pill ${state.searchFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="ember-pill ${state.searchFilter === 'songs' ? 'active' : ''}" data-filter="songs">Songs</button>
          <button class="ember-pill ${state.searchFilter === 'artists' ? 'active' : ''}" data-filter="artists">Artists</button>
          <button class="ember-pill ${state.searchFilter === 'playlists' ? 'active' : ''}" data-filter="playlists">Playlists</button>
        </div>

        <!-- Dynamic Results or Browse Grid -->
        <div id="search-dynamic-results">
          ${state.searchQuery.trim() ? '' : renderBrowseGenresGrid()}
        </div>
      </div>
    `;

    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const dynamicResults = document.getElementById('search-dynamic-results');

    if (autoFocus && searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }

    // Filter Chips
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
        searchInput.value = '';
        clearBtn.style.display = 'none';
        dynamicResults.innerHTML = renderBrowseGenresGrid();
        bindGenreCards();
      });
    }

    // Live Debounced Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        state.searchQuery = query;
        if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

        if (state.searchDebounceTimer) clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
          if (query.trim()) {
            triggerSearch(query.trim());
          } else {
            dynamicResults.innerHTML = renderBrowseGenresGrid();
            bindGenreCards();
          }
        }, 350);
      });
    }

    function renderBrowseGenresGrid() {
      return `
        <div class="section-title-row" style="margin-bottom:14px;">
          <h3>Explore Moods &amp; Genres</h3>
        </div>
        <div class="browse-genres-grid">
          ${GENRE_CARDS.map(g => `
            <div class="genre-card" data-genre-query="${escapeHtml(g.query)}" style="background:${escapeHtml(g.color)};">
              <span class="genre-card-title">${escapeHtml(g.title)}</span>
              <img class="genre-card-art" src="${escapeHtml(g.art)}" alt="${escapeHtml(g.title)}" loading="lazy">
            </div>
          `).join('')}
        </div>
      `;
    }

    function bindGenreCards() {
      document.querySelectorAll('.genre-card').forEach(card => {
        card.addEventListener('click', () => {
          const q = card.dataset.genreQuery;
          if (q && searchInput) {
            searchInput.value = q;
            state.searchQuery = q;
            if (clearBtn) clearBtn.style.display = 'block';
            triggerSearch(q);
          }
        });
      });
    }

    async function triggerSearch(query) {
      dynamicResults.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 0; color:var(--text-gray);">
          <div style="width:28px; height:28px; border:2px solid var(--text-white); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:12px;"></div>
          <span style="font-size:0.85rem;">Searching Soundscape...</span>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      `;

      try {
        const results = await YouTubeAPI.search(query, 24, state.searchFilter);
        if (!results || results.length === 0) {
          dynamicResults.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-gray);">
              <p style="font-size:0.95rem; font-weight:600; color:var(--text-white); margin-bottom:6px;">No sound found for "${escapeHtml(query)}"</p>
              <p style="font-size:0.75rem;">Check your spelling or search for another artist, mood, or track.</p>
            </div>
          `;
          return;
        }

        dynamicResults.innerHTML = `
          <div class="section-title-row" style="margin-bottom:12px;">
            <h3>Top Results</h3>
            <span style="font-size:0.75rem; color:var(--text-dim);">${results.length} found</span>
          </div>
          <div class="song-list-container" id="search-results-list">
            ${results.map((track, i) => createSongRowHtml(track, i)).join('')}
          </div>
        `;

        bindSongRows(document.getElementById('search-results-list'), results);
      } catch (err) {
        dynamicResults.innerHTML = `
          <div style="text-align:center; padding:40px 20px; color:var(--text-gray);">
            <p style="font-size:0.9rem; color:#ff6666; margin-bottom:6px;">Unable to reach search stream</p>
            <p style="font-size:0.75rem;">${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }

    if (state.searchQuery.trim()) {
      triggerSearch(state.searchQuery.trim());
    } else {
      bindGenreCards();
    }
  }

  /* ==========================================================================
     Screen 7: PLAYLIST VIEW (Zero Social Follow/Following Features)
     ========================================================================== */
  function openPlaylistView(playlistId, autoPlay = false) {
    state.previousTab = state.currentTab;
    state.currentTab = 'playlist';
    state.activePlaylistId = playlistId;

    let playlist = CURATED_PLAYLISTS.find(p => p.id === playlistId);
    let playlistTracks = [];

    if (playlist) {
      playlistTracks = playlist.tracks || DEFAULT_TRACKS;
    } else {
      const customPlaylists = StorageManager.getPlaylists();
      const custom = customPlaylists.find(p => p.id === playlistId);
      if (custom) {
        playlist = {
          id: custom.id,
          title: custom.name,
          subtitle: 'Custom Playlist',
          cover: 'assets/images/ember_rose.jpg',
          description: custom.description || 'Your personalized collection on Ember.',
          stats: `${custom.tracks.length} songs`
        };
        playlistTracks = custom.tracks;
      }
    }

    if (!playlist) {
      playlist = CURATED_PLAYLISTS[0];
      playlistTracks = DEFAULT_TRACKS.slice(0, 5);
    }

    el.viewport.innerHTML = `
      <!-- Playlist Top Nav Row -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <button class="header-icon-btn" id="btn-playlist-back" title="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style="font-size:0.85rem; font-weight:600; color:var(--text-gray); text-transform:uppercase;">Playlist</span>
        <button class="header-icon-btn" id="btn-playlist-options" title="More">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      <!-- Playlist Hero -->
      <div class="playlist-hero-header">
        <div class="playlist-cover-big">
          <img src="${escapeHtml(playlist.cover || 'assets/images/ember_midnight.jpg')}" alt="${escapeHtml(playlist.title)}">
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
          : '<div style="text-align:center; padding:30px; color:var(--text-gray); font-size:0.82rem;">No songs in this playlist yet.</div>'
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

    // Create modal button
    const openCreateBtn = document.getElementById('btn-open-create-modal');
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

        <!-- VIP Membership Banner -->
        <div style="width:100%; padding:14px 16px; border-radius:16px; background:linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(22,22,38,0.95) 100%); border:1px solid var(--border-card); margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;" id="premium-banner">
          <div>
            <div style="font-size:0.92rem; font-weight:800; color:var(--text-white); display:flex; align-items:center; gap:6px;">
              <span>⚡</span> VIP 320kbps Audio Engine
            </div>
            <div style="font-size:0.72rem; color:var(--text-gray); margin-top:2px;">Akamai High-Fidelity CDN • Unlimited Skips</div>
          </div>
          <button class="ember-pill active" style="font-size:0.72rem; padding:6px 12px;">Active</button>
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
    el.miniThumb.src = track.thumbnail || 'assets/images/ember_midnight.jpg';

    // Fullscreen Sheet
    el.sheetTitle.textContent = track.title;
    el.sheetArtist.textContent = track.artist || track.channelTitle || 'Ember';
    el.sheetArtwork.src = track.thumbnail || 'assets/images/ember_midnight.jpg';

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
  el.sheetPrevBtn.addEventListener('click', () => player.prev());

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

  // Sheet Scrubber Dragging
  function getScrubberRatio(e) {
    const rect = el.sheetTimeline.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function commitSeek(ratio) {
    if (player.duration > 0) {
      player.seekTo(player.duration * ratio);
    }
  }

  function renderScrubPreview(ratio) {
    const pct = ratio * 100;
    if (el.sheetTimelineFill) el.sheetTimelineFill.style.width = `${pct}%`;
    if (el.sheetTimelineHandle) el.sheetTimelineHandle.style.left = `${pct}%`;
    if (el.desktopTimelineFill) el.desktopTimelineFill.style.width = `${pct}%`;
    if (el.desktopTimelineHandle) el.desktopTimelineHandle.style.left = `${pct}%`;
    if (player.duration > 0) {
      const cur = player.duration * ratio;
      if (el.sheetTimeCur) el.sheetTimeCur.textContent = formatTime(cur);
      if (el.desktopTimeCur) el.desktopTimeCur.textContent = formatTime(cur);
    }
  }

  el.sheetTimeline.addEventListener('pointerdown', (e) => {
    isScrubbing = true;
    el.sheetTimeline.classList.add('dragging');
    try { el.sheetTimeline.setPointerCapture(e.pointerId); } catch (_) {}
    const ratio = getScrubberRatio(e);
    renderScrubPreview(ratio);
  });

  el.sheetTimeline.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    const ratio = getScrubberRatio(e);
    renderScrubPreview(ratio);
  });

  el.sheetTimeline.addEventListener('pointerup', (e) => {
    if (!isScrubbing) return;
    isScrubbing = false;
    el.sheetTimeline.classList.remove('dragging');
    try { el.sheetTimeline.releasePointerCapture(e.pointerId); } catch (_) {}
    const ratio = getScrubberRatio(e);
    renderScrubPreview(ratio);
    commitSeek(ratio);
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
      player.prev();
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

  // Desktop Timeline Pointer Seeking
  if (el.desktopTimeline) {
    function getDesktopScrubberRatio(e) {
      const rect = el.desktopTimeline.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    el.desktopTimeline.addEventListener('pointerdown', (e) => {
      isScrubbing = true;
      el.desktopTimeline.classList.add('dragging');
      try { el.desktopTimeline.setPointerCapture(e.pointerId); } catch (_) {}
      const ratio = getDesktopScrubberRatio(e);
      renderScrubPreview(ratio);
    });

    el.desktopTimeline.addEventListener('pointermove', (e) => {
      if (!isScrubbing) return;
      const ratio = getDesktopScrubberRatio(e);
      renderScrubPreview(ratio);
    });

    el.desktopTimeline.addEventListener('pointerup', (e) => {
      if (!isScrubbing) return;
      isScrubbing = false;
      el.desktopTimeline.classList.remove('dragging');
      try { el.desktopTimeline.releasePointerCapture(e.pointerId); } catch (_) {}
      const ratio = getDesktopScrubberRatio(e);
      renderScrubPreview(ratio);
      commitSeek(ratio);
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
    el.desktopTopSearchInput.addEventListener('focus', () => switchTab('search'));
    el.desktopTopSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = el.desktopTopSearchInput.value.trim();
        if (q) {
          state.searchQuery = q;
          switchTab('search', true);
        }
      }
    });
  }

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchTab('search', true);
      const sInput = document.getElementById('search-input') || el.desktopTopSearchInput;
      if (sInput) sInput.focus();
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
    await DbManager.createPlaylist(user?.uid, title);
    el.createPlaylistModal.style.display = 'none';
    showToast(`Created playlist "${title}"`, 'success');

    if (state.currentTab === 'library') {
      renderLibraryView();
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
  el.btnCloseAuthModal.addEventListener('click', () => closeAuthModal());
  if (el.btnGuestContinue) {
    el.btnGuestContinue.style.display = 'none';
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

  el.btnSkipOnboarding.addEventListener('click', () => {
    el.onboardingModal.style.display = 'none';
    showToast('Skipped for now. You can tune your taste anytime in Profile.', 'info');
  });

  el.btnSaveOnboarding.addEventListener('click', async () => {
    const user = AuthManager.getCurrentUser();
    const prefs = {
      favorite_genres: Array.from(state.selectedGenres),
      favorite_artists: Array.from(state.selectedArtists)
    };

    await DbManager.savePreferences(user?.uid, prefs);
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
        player.setQueue(DEFAULT_TRACKS, 0, false);
        if (DEFAULT_TRACKS.length > 0) {
          player.currentTrack = DEFAULT_TRACKS[0];
          player.onTrackChange(DEFAULT_TRACKS[0]);
        }
      }

      // Ensure Supabase profile exists
      const { isNewUser } = await DbManager.ensureProfile(user);
      const prefs = await DbManager.getPreferences(user.uid);

      // Offer first-time onboarding if new or no genres chosen
      if (isNewUser || (!prefs.favorite_genres || prefs.favorite_genres.length === 0)) {
        openOnboardingModal(prefs);
      }
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
    player.setQueue(DEFAULT_TRACKS, 0, false);
    if (DEFAULT_TRACKS.length > 0) {
      const first = DEFAULT_TRACKS[0];
      player.currentTrack = first;
      player.onTrackChange(first);
    }
  }

  // Initial View
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
