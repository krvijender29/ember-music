/**
 * EMBER - MUSIC FOR EVERY MOOD
 * Master Application Controller
 * Handles mobile viewport views, live YouTube searches, playback state,
 * bottom navigation, and the fullscreen Now Playing drawer.
 */

function initApp() {
  try {
  // Initialize Core Player
  const player = new MusicPlayer();

  // Application State
  const state = {
    currentTab: 'home',
    previousTab: 'home',
    activePlaylistId: null,
    searchFilter: 'all',
    searchQuery: '',
    searchDebounceTimer: null,
    isVideoMode: false,
    followingPlaylists: new Set(['late-nights'])
  };

  // DOM Elements
  const el = {
    viewport: document.getElementById('ember-main-viewport'),
    brandHomeBtn: document.getElementById('brand-home-btn'),
    btnHeaderBell: document.getElementById('btn-header-bell'),
    btnHeaderProfile: document.getElementById('btn-header-profile'),
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

    // Video Wrapper & Modal
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
    desktopExpandBtn: document.getElementById('desktop-expand-btn')
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
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function createSongRowHtml(track, index = 0) {
    const isPlayingThis = player.currentTrack && player.currentTrack.id === track.id;
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

    // Song row click -> play track
    container.querySelectorAll('.ember-song-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-row-like')) return; // ignore like button clicks

        const trackId = row.dataset.trackId;
        const selectedIndex = tracksList.findIndex(t => t.id === trackId);
        if (selectedIndex >= 0) {
          player.setQueue(tracksList, selectedIndex, true);
        }
      });
    });

    // Song like button click
    container.querySelectorAll('.btn-row-like').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.trackId;
        const targetTrack = tracksList.find(t => t.id === trackId) || (player.currentTrack?.id === trackId ? player.currentTrack : null);
        if (targetTrack) {
          const isLikedNow = StorageManager.toggleLikeSong(targetTrack);
          btn.classList.toggle('liked', isLikedNow);
          const svg = btn.querySelector('svg');
          if (svg) svg.setAttribute('fill', isLikedNow ? 'currentColor' : 'none');

          // Sync with player current track if matching
          if (player.currentTrack && player.currentTrack.id === trackId) {
            updateLikeIcons(isLikedNow);
          }

          showToast(isLikedNow ? `Added to Liked Songs` : `Removed from Liked Songs`, 'success');
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
     Screen 5: HOME VIEW
     ========================================================================== */
  function renderHomeView() {
    state.currentTab = 'home';
    const recentlyPlayed = StorageManager.getRecentTracks();
    const displayRecent = recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 8) : DEFAULT_TRACKS.slice(0, 8);

    el.viewport.innerHTML = `
      <!-- Home Search Box -->
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
        <h3>Recently Played</h3>
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

      <!-- Music for Every Mood -->
      <div class="section-title-row">
        <h3>Music for Every Mood</h3>
      </div>
      <div class="song-list-container" id="home-mood-songs">
        ${displayRecent.map((track, i) => createSongRowHtml(track, i)).join('')}
      </div>
    `;

    // Event: Home search input
    const homeSearchInput = document.getElementById('home-search-input');
    if (homeSearchInput) {
      homeSearchInput.addEventListener('focus', () => {
        if (homeSearchInput.value.trim()) {
          state.searchQuery = homeSearchInput.value.trim();
        }
        switchTab('search', true);
      });
      homeSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          state.searchQuery = homeSearchInput.value.trim();
          switchTab('search', true);
        }
      });
    }

    // Event: Good Morning Play
    const bannerPlayBtn = document.getElementById('banner-play-btn');
    if (bannerPlayBtn) {
      bannerPlayBtn.addEventListener('click', () => {
        openPlaylistView('late-nights', true);
      });
    }

    // Event: Daily Mix Play
    const dailyMixCard = document.getElementById('daily-mix-card');
    if (dailyMixCard) {
      dailyMixCard.addEventListener('click', () => {
        player.setQueue(DEFAULT_TRACKS, 0, true);
        showToast('Playing Daily Mix 1', 'success');
      });
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

    // Bind mood song list
    const moodSongsContainer = document.getElementById('home-mood-songs');
    bindSongRows(moodSongsContainer, displayRecent);
  }

  /* ==========================================================================
     Screen 6: SEARCH VIEW
     ========================================================================== */
  function renderSearchView(autoFocus = false) {
    state.currentTab = 'search';

    el.viewport.innerHTML = `
      <!-- Search Input Bar -->
      <div class="ember-search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="ember-search-input" id="search-input" placeholder="Search artists, songs, playlists..." value="${escapeHtml(state.searchQuery)}">
        <button class="search-clear-btn" id="search-clear-btn" style="${state.searchQuery ? 'display:block;' : 'display:none;'}">✕</button>
      </div>

      <!-- Filter Pills Row -->
      <div class="filter-pills-row">
        <button class="ember-pill ${state.searchFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
        <button class="ember-pill ${state.searchFilter === 'songs' ? 'active' : ''}" data-filter="songs">Songs</button>
        <button class="ember-pill ${state.searchFilter === 'artists' ? 'active' : ''}" data-filter="artists">Artists</button>
        <button class="ember-pill ${state.searchFilter === 'playlists' ? 'active' : ''}" data-filter="playlists">Playlists</button>
        <button class="ember-pill ${state.searchFilter === 'albums' ? 'active' : ''}" data-filter="albums">Albums</button>
      </div>

      <div id="search-results-area">
        <!-- Default State: Trending Searches & Recently Searched -->
        <div id="search-discovery-content">
          <div class="section-title-row">
            <h3>Trending Searches</h3>
          </div>

          <div class="trending-searches-list">
            ${TRENDING_SEARCHES.map(query => `
              <div class="trending-item-row" data-query="${escapeHtml(query)}">
                <div class="trending-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span>${escapeHtml(query)}</span>
                </div>
                <svg class="arrow-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            `).join('')}
          </div>

          <div class="section-title-row">
            <h3>Recently Searched</h3>
          </div>
          <div class="trending-searches-list">
            <div class="trending-item-row" data-query="Ember">
              <div class="trending-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>
                <span>Ember</span>
              </div>
              <span style="color:var(--text-dim); font-size:12px;">✕</span>
            </div>
            <div class="trending-item-row" data-query="The Weeknd">
              <div class="trending-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>
                <span>The Weeknd</span>
              </div>
              <span style="color:var(--text-dim); font-size:12px;">✕</span>
            </div>
          </div>
        </div>

        <!-- Dynamic Results Container -->
        <div id="dynamic-search-results" style="display:none;"></div>
      </div>
    `;

    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear-btn');
    const discoveryContent = document.getElementById('search-discovery-content');
    const dynamicResults = document.getElementById('dynamic-search-results');

    if (autoFocus && searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }

    // Filter pills
    document.querySelectorAll('.ember-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.ember-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.searchFilter = pill.dataset.filter;
        if (state.searchQuery.trim()) {
          performSearch(state.searchQuery.trim());
        }
      });
    });

    // Trending Search Item clicks
    document.querySelectorAll('.trending-item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.textContent.trim() === '✕') {
          row.remove();
          return;
        }
        const query = row.dataset.query;
        if (query) {
          searchInput.value = query;
          state.searchQuery = query;
          searchClear.style.display = 'block';
          performSearch(query);
        }
      });
    });

    // Clear button
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      searchClear.style.display = 'none';
      discoveryContent.style.display = 'block';
      dynamicResults.style.display = 'none';
      searchInput.focus();
    });

    // Search Input debounce & Enter handler
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      state.searchQuery = q;
      searchClear.style.display = q ? 'block' : 'none';

      clearTimeout(state.searchDebounceTimer);
      if (!q) {
        discoveryContent.style.display = 'block';
        dynamicResults.style.display = 'none';
        return;
      }

      state.searchDebounceTimer = setTimeout(() => {
        performSearch(q);
      }, 350);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(state.searchDebounceTimer);
        const q = searchInput.value.trim();
        if (q) performSearch(q);
      }
    });

    async function performSearch(query) {
      if (!query || !query.trim()) return;
      query = query.trim();
      state.searchQuery = query;

      discoveryContent.style.display = 'none';
      dynamicResults.style.display = 'block';
      dynamicResults.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 0; color:var(--text-gray);">
          <div style="width:28px; height:28px; border:2px solid var(--text-white); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:12px;"></div>
          <span style="font-size:0.85rem;">Searching Soundscape...</span>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      `;

      try {
        let results = [];
        let apiQuery = query;
        if (state.searchFilter === 'songs') apiQuery += ' song';
        else if (state.searchFilter === 'artists') apiQuery += ' songs';
        else if (state.searchFilter === 'playlists') apiQuery += ' playlist';
        else if (state.searchFilter === 'albums') apiQuery += ' album';

        if (typeof YouTubeAPI !== 'undefined' && YouTubeAPI.search) {
          results = await YouTubeAPI.search(apiQuery, 20);
        }

        // If API key is depleted or error, fallback to catalog matching
        if (!results || results.length === 0) {
          const lowerQ = query.toLowerCase();
          results = DEFAULT_TRACKS.filter(t =>
            t.title.toLowerCase().includes(lowerQ) ||
            t.artist.toLowerCase().includes(lowerQ)
          );
        }

        if (results.length === 0) {
          dynamicResults.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-gray);">
              <p style="font-size:1rem; font-weight:600; color:var(--text-white); margin-bottom:6px;">No results found for "${escapeHtml(query)}"</p>
              <p style="font-size:0.8rem;">Try searching for "Arijit Singh", "The Weeknd", or "Lofi Beats".</p>
            </div>
          `;
          return;
        }

        dynamicResults.innerHTML = `
          <div class="section-title-row">
            <h3>Top Results (${results.length})</h3>
          </div>
          <div class="song-list-container" id="search-tracks-list">
            ${results.map((track, i) => createSongRowHtml(track, i)).join('')}
          </div>
        `;

        bindSongRows(document.getElementById('search-tracks-list'), results);
      } catch (err) {
        console.error('Search failure:', err);
        const lowerQ = query.toLowerCase();
        const fallback = DEFAULT_TRACKS.filter(t =>
          t.title.toLowerCase().includes(lowerQ) ||
          t.artist.toLowerCase().includes(lowerQ)
        );
        const listToShow = fallback.length > 0 ? fallback : DEFAULT_TRACKS;
        dynamicResults.innerHTML = `
          <div class="section-title-row">
            <h3>Top Recommendations (${listToShow.length})</h3>
          </div>
          <div class="song-list-container" id="search-tracks-list">
            ${listToShow.map((track, i) => createSongRowHtml(track, i)).join('')}
          </div>
        `;
        bindSongRows(document.getElementById('search-tracks-list'), listToShow);
      }
    }

    // If query already present (e.g. tab re-visit), trigger search
    if (state.searchQuery.trim()) {
      performSearch(state.searchQuery.trim());
    }
  }

  /* ==========================================================================
     Screen 7: PLAYLIST / ALBUM DETAIL VIEW ("Late Nights")
     ========================================================================== */
  function openPlaylistView(playlistId, autoPlay = false) {
    state.previousTab = state.currentTab;
    state.currentTab = 'playlist';
    state.activePlaylistId = playlistId;

    // Find in curated or user playlists
    let playlist = CURATED_PLAYLISTS.find(p => p.id === playlistId);
    let playlistTracks = [];

    if (playlist) {
      playlistTracks = playlist.trackIds.map(id => DEFAULT_TRACKS.find(t => t.id === id)).filter(Boolean);
      if (playlistTracks.length === 0) {
        playlistTracks = DEFAULT_TRACKS.slice(0, 5);
      }
    } else {
      // Check custom playlists
      const customPls = StorageManager.getPlaylists();
      playlist = customPls.find(p => p.id === playlistId);
      if (playlist) {
        playlistTracks = (playlist.trackIds || []).map(id => DEFAULT_TRACKS.find(t => t.id === id)).filter(Boolean);
      }
    }

    if (!playlist) {
      playlist = CURATED_PLAYLISTS[0]; // fallback to Late Nights
      playlistTracks = DEFAULT_TRACKS.slice(0, 5);
    }

    const isFollowing = state.followingPlaylists.has(playlist.id);

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
          ${escapeHtml(playlist.description || 'Chill vibes for the night... 🌙')}
        </div>
        <div style="font-size:0.72rem; color:var(--text-dim); margin-bottom:16px;">
          ${escapeHtml(playlist.stats || `${playlistTracks.length} songs • 2h 45m`)}
        </div>

        <div class="playlist-action-bar">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-follow-playlist" id="btn-follow-pl">
              ${isFollowing ? 'Following' : 'Follow'}
            </button>
            <button class="header-icon-btn" id="btn-download-pl" title="Download">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
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
        ${playlistTracks.map((track, i) => createSongRowHtml(track, i)).join('')}
      </div>
    `;

    // Back button
    document.getElementById('btn-playlist-back').addEventListener('click', () => {
      switchTab(state.previousTab || 'home');
    });

    // Follow toggle
    const followBtn = document.getElementById('btn-follow-pl');
    followBtn.addEventListener('click', () => {
      if (state.followingPlaylists.has(playlist.id)) {
        state.followingPlaylists.delete(playlist.id);
        followBtn.textContent = 'Follow';
        showToast(`Unfollowed "${playlist.title}"`);
      } else {
        state.followingPlaylists.add(playlist.id);
        followBtn.textContent = 'Following';
        showToast(`Following "${playlist.title}"`, 'success');
      }
    });

    // Play all button
    const playAllBtn = document.getElementById('btn-play-all-playlist');
    playAllBtn.addEventListener('click', () => {
      if (playlistTracks.length > 0) {
        player.setQueue(playlistTracks, 0, true);
        showToast(`Playing "${playlist.title}"`, 'success');
      }
    });

    // Bind songs
    bindSongRows(document.getElementById('playlist-tracks-container'), playlistTracks);

    if (autoPlay && playlistTracks.length > 0) {
      player.setQueue(playlistTracks, 0, true);
    }
  }

  /* ==========================================================================
     Screen 9: YOUR LIBRARY VIEW
     ========================================================================== */
  function renderLibraryView() {
    state.currentTab = 'library';
    const liked = StorageManager.getLikedSongs();
    const customPlaylists = StorageManager.getPlaylists();
    const recent = StorageManager.getRecentTracks();

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

      <!-- Recently Played Row -->
      <div class="section-title-row">
        <h3>Recently Played</h3>
      </div>
      <div class="horizontal-card-scroll">
        ${CURATED_PLAYLISTS.map(pl => `
          <div class="ember-music-card" data-playlist-id="${escapeHtml(pl.id)}">
            <div class="card-img-wrapper">
              <img src="${escapeHtml(pl.cover)}" alt="${escapeHtml(pl.title)}" loading="lazy">
            </div>
            <div class="card-title">${escapeHtml(pl.title)}</div>
            <div class="card-subtitle">${escapeHtml(pl.subtitle)}</div>
          </div>
        `).join('')}
      </div>

      <!-- Playlists Section -->
      <div class="section-title-row" style="margin-top:10px;">
        <h3>Your Playlists</h3>
      </div>

      <!-- Create Playlist Button -->
      <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-card); border-radius:14px; cursor:pointer; margin-bottom:12px; border:1px solid var(--border-subtle);" id="btn-open-create-modal">
        <div style="width:44px; height:44px; border-radius:10px; background:rgba(255,85,0,0.15); border:1px dashed var(--ember-orange); display:flex; align-items:center; justify-content:center; color:var(--ember-orange); font-size:20px; font-weight:700;">+</div>
        <div>
          <div style="font-size:0.88rem; font-weight:700; color:var(--text-white);">Create Playlist</div>
          <div style="font-size:0.72rem; color:var(--text-gray);">Build your custom ember vibe</div>
        </div>
      </div>

      <!-- Liked Songs Playlist Row -->
      <div class="ember-song-row" id="row-liked-songs-pl" style="margin-bottom:12px; border-color:rgba(255,85,0,0.3);">
        <div style="width:44px; height:44px; border-radius:8px; background:var(--ember-gradient); display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <div class="song-row-meta">
          <div class="song-row-title">Liked Songs</div>
          <div class="song-row-artist">${liked.length} saved songs</div>
        </div>
      </div>

      <!-- User Custom Playlists -->
      ${customPlaylists.map(pl => `
        <div class="ember-song-row" data-playlist-id="${escapeHtml(pl.id)}" style="margin-bottom:8px;">
          <div style="width:44px; height:44px; border-radius:8px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; color:var(--ember-orange); flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div class="song-row-meta">
            <div class="song-row-title">${escapeHtml(pl.name)}</div>
            <div class="song-row-artist">Playlist • By You</div>
          </div>
        </div>
      `).join('')}
    `;

    // Cards click
    document.querySelectorAll('.ember-music-card').forEach(card => {
      card.addEventListener('click', () => {
        openPlaylistView(card.dataset.playlistId);
      });
    });

    // Liked songs row click
    const likedRow = document.getElementById('row-liked-songs-pl');
    if (likedRow) {
      likedRow.addEventListener('click', () => {
        if (liked.length === 0) {
          showToast('No liked songs yet! Tap the heart icon on any song.', 'warning');
          return;
        }
        player.setQueue(liked, 0, true);
        showToast('Playing Liked Songs', 'success');
      });
    }

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
     Screen 10: USER PROFILE VIEW ("Vijender Singh")
     ========================================================================== */
  function renderProfileView() {
    state.currentTab = 'profile';
    const recent = StorageManager.getRecentTracks();
    const displayList = recent.length > 0 ? recent.slice(0, 6) : DEFAULT_TRACKS.slice(0, 6);

    el.viewport.innerHTML = `
      <div class="profile-screen-container">
        <!-- Avatar Circle -->
        <div class="profile-avatar-circle">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>

        <h2 class="profile-name">Vijender Singh</h2>
        <div class="profile-handle">@emberuser</div>
        <button class="btn-edit-profile" id="btn-edit-profile">Edit Profile</button>

        <!-- Stats Row -->
        <div class="profile-stats-row">
          <div class="stat-item">
            <div class="stat-num">32</div>
            <div class="stat-lbl">Playlists</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">12.4K</div>
            <div class="stat-lbl">Followers</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">184</div>
            <div class="stat-lbl">Following</div>
          </div>
        </div>

        <!-- Go Premium Banner (Screen 12) -->
        <div style="width:100%; padding:14px 16px; border-radius:16px; background:linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(22,22,38,0.95) 100%); border:1px solid var(--border-card); margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;" id="premium-banner">
          <div>
            <div style="font-size:0.92rem; font-weight:800; color:var(--text-white); display:flex; align-items:center; gap:6px;">
              <span>👑</span> EMBER Premium
            </div>
            <div style="font-size:0.72rem; color:var(--text-gray); margin-top:2px;">Unlimited skips • 320 kbps high fidelity</div>
          </div>
          <button class="ember-pill active" style="font-size:0.72rem; padding:6px 12px;">Active</button>
        </div>

        <!-- Preferences / Settings (Screen 11) -->
        <div class="section-title-row" style="width:100%;">
          <h3>Preferences</h3>
        </div>
        <div style="width:100%; display:flex; flex-direction:column; gap:8px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border-radius:12px;">
            <span style="font-size:0.85rem; font-weight:600;">Appearance</span>
            <span style="font-size:0.75rem; color:var(--text-white); font-weight:700;">Noir Monochrome</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border-radius:12px;">
            <span style="font-size:0.85rem; font-weight:600;">Audio Quality</span>
            <span style="font-size:0.75rem; color:var(--text-gray);">Lossless 320 kbps</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border-radius:12px;" id="pref-streaming-engine">
            <div>
              <div style="font-size:0.85rem; font-weight:600;">Audio & Streaming Engine</div>
              <div style="font-size:0.7rem; color:var(--text-gray); margin-top:2px;">
                ⚡ High-Speed CDN Engine • 320 kbps (Unlimited & Zero YouTube IFrame)
              </div>
            </div>
            <span style="font-size:0.75rem; color:#22c55e; font-weight:700;">
              ● Direct CDN (Active)
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border-radius:12px;">
            <div>
              <div style="font-size:0.85rem; font-weight:600;">Copyright & Embed Bypass</div>
              <div style="font-size:0.7rem; color:var(--text-gray); margin-top:2px;">Native HTML5 direct playback — 100% bypass of Error 101/150</div>
            </div>
            <span style="font-size:0.75rem; color:#22c55e; font-weight:700;">● Active</span>
          </div>
        </div>

        <!-- Recently Played -->
        <div class="section-title-row" style="width:100%;">
          <h3>Recently Played</h3>
        </div>
        <div class="song-list-container" id="profile-tracks-container" style="width:100%;">
          ${displayList.map((track, i) => createSongRowHtml(track, i)).join('')}
        </div>
      </div>
    `;

    // Engine toggle event
    const enginePref = document.getElementById('pref-streaming-engine');
    if (enginePref) {
      enginePref.addEventListener('click', () => {
        const cur = StorageManager.getStreamingEngine();
        const next = cur === 'piped' ? 'youtube' : 'piped';
        StorageManager.setStreamingEngine(next);
        showToast(next === 'piped' ? 'Switched to Piped Engine (Unlimited Searches)' : 'Switched to YouTube Data API', 'success');
        renderProfileView();
      });
    }

    document.getElementById('btn-edit-profile').addEventListener('click', () => {
      showToast('Profile updated!', 'success');
    });

    document.getElementById('premium-banner').addEventListener('click', () => {
      showToast('You are an Ember VIP Member! Enjoy uninterrupted sound.', 'success');
    });

    bindSongRows(document.getElementById('profile-tracks-container'), displayList);
  }

  /* ==========================================================================
     Tab Switching Navigation
     ========================================================================== */
  function switchTab(tabName, autoFocusSearch = false) {
    el.navTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Scroll viewport to top on tab switch
    el.viewport.scrollTop = 0;

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
    el.btnHeaderProfile.addEventListener('click', () => switchTab('profile'));
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
  };

  player.onStateChange = ({ isPlaying }) => {
    // Mini Player Icons
    if (el.miniPlayIcon && el.miniPauseIcon) {
      el.miniPlayIcon.style.display = isPlaying ? 'none' : 'block';
      el.miniPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    // Sheet Icons
    if (el.sheetPlayIcon && el.sheetPauseIcon) {
      el.sheetPlayIcon.style.display = isPlaying ? 'none' : 'block';
      el.sheetPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    // Desktop Player Icons
    if (el.desktopPlayIcon && el.desktopPauseIcon) {
      el.desktopPlayIcon.style.display = isPlaying ? 'none' : 'block';
      el.desktopPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  };

  let isScrubbing = false;

  player.onTimeUpdate = ({ currentTime, duration, percent, progress }) => {
    const pct = typeof percent === 'number' ? percent : (typeof progress === 'number' ? progress : 0);

    // Update mini-player bar
    if (el.miniProgressFill) {
      el.miniProgressFill.style.width = `${pct}%`;
    }

    // Update sheet scrubber only when user is not actively dragging
    if (!isScrubbing) {
      if (el.sheetTimelineFill) {
        el.sheetTimelineFill.style.width = `${pct}%`;
      }
      if (el.sheetTimelineHandle) {
        el.sheetTimelineHandle.style.left = `${pct}%`;
      }
      if (el.sheetTimeCur) {
        el.sheetTimeCur.textContent = formatTime(currentTime);
      }
      if (el.sheetTimeTot) {
        el.sheetTimeTot.textContent = formatTime(duration);
      }

      if (el.desktopTimelineFill) {
        el.desktopTimelineFill.style.width = `${pct}%`;
      }
      if (el.desktopTimelineHandle) {
        el.desktopTimelineHandle.style.left = `${pct}%`;
      }
      if (el.desktopTimeCur) {
        el.desktopTimeCur.textContent = formatTime(currentTime);
      }
      if (el.desktopTimeTot) {
        el.desktopTimeTot.textContent = formatTime(duration);
      }
    }
  };

  /* ==========================================================================
     Mini Player & Sheet Controls
     ========================================================================== */
  // Open Sheet
  el.miniTrackClickArea.addEventListener('click', () => {
    el.sheet.classList.add('active');
  });

  // Collapse Sheet
  el.btnSheetCollapse.addEventListener('click', () => {
    el.sheet.classList.remove('active');
  });

  // Mini Play/Pause
  el.miniPlayPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    player.togglePlay();
  });

  // Mini Next
  el.miniNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    player.next();
  });

  // Mini Like
  el.miniLikeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (player.currentTrack) {
      const isLiked = StorageManager.toggleLikeSong(player.currentTrack);
      updateLikeIcons(isLiked);
      showToast(isLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
    }
  });

  // Mini Player Progress Line Direct Click/Seek
  const miniProgressLine = document.querySelector('.mini-progress-line');
  if (miniProgressLine) {
    miniProgressLine.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = miniProgressLine.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const totalDur = (player.getDuration && player.getDuration()) 
        || (player.ytPlayer && typeof player.ytPlayer.getDuration === 'function' && player.ytPlayer.getDuration()) 
        || (player.currentTrack && player.currentTrack.durationSec) 
        || 0;
      if (totalDur > 0) {
        player.seekTo(totalDur * ratio);
        if (el.miniProgressFill) el.miniProgressFill.style.width = `${ratio * 100}%`;
        if (el.sheetTimelineFill) el.sheetTimelineFill.style.width = `${ratio * 100}%`;
        if (el.sheetTimelineHandle) el.sheetTimelineHandle.style.left = `${ratio * 100}%`;
      }
    });
  }

  // Sheet Play/Pause
  el.sheetPlayPauseBtn.addEventListener('click', () => {
    player.togglePlay();
  });

  // Sheet Next & Prev
  el.sheetNextBtn.addEventListener('click', () => player.next());
  el.sheetPrevBtn.addEventListener('click', () => player.previous());

  // Sheet Shuffle
  el.sheetShuffleBtn.addEventListener('click', () => {
    const isShuffled = player.toggleShuffle();
    el.sheetShuffleBtn.classList.toggle('active', isShuffled);
    showToast(isShuffled ? 'Shuffle enabled' : 'Shuffle disabled');
  });

  // Sheet Repeat
  el.sheetRepeatBtn.addEventListener('click', () => {
    const mode = player.toggleRepeat();
    el.sheetRepeatBtn.classList.toggle('active', mode !== 'off');
    showToast(`Repeat mode: ${mode.toUpperCase()}`);
  });

  // Sheet Like
  el.sheetLikeBtn.addEventListener('click', () => {
    if (player.currentTrack) {
      const isLiked = StorageManager.toggleLikeSong(player.currentTrack);
      updateLikeIcons(isLiked);
      showToast(isLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
    }
  });

  // Smooth Scrubber Dragging & Seeking (Desktop Mouse + Mobile Touch via PointerEvents)
  function getScrubberRatio(e) {
    if (!el.sheetTimeline) return 0;
    const rect = el.sheetTimeline.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const offsetX = clientX - rect.left;
    return Math.max(0, Math.min(1, offsetX / rect.width));
  }

  function renderScrubPreview(ratio) {
    const pct = ratio * 100;
    if (el.sheetTimelineFill) el.sheetTimelineFill.style.width = `${pct}%`;
    if (el.sheetTimelineHandle) el.sheetTimelineHandle.style.left = `${pct}%`;
    if (el.miniProgressFill) el.miniProgressFill.style.width = `${pct}%`;
    if (el.desktopTimelineFill) el.desktopTimelineFill.style.width = `${pct}%`;
    if (el.desktopTimelineHandle) el.desktopTimelineHandle.style.left = `${pct}%`;

    const totalDur = (player.getDuration && player.getDuration()) 
      || (player.ytPlayer && typeof player.ytPlayer.getDuration === 'function' && player.ytPlayer.getDuration()) 
      || (player.currentTrack && player.currentTrack.durationSec) 
      || 0;

    const formatted = formatTime(totalDur * ratio);
    if (el.sheetTimeCur && totalDur > 0) {
      el.sheetTimeCur.textContent = formatted;
    }
    if (el.desktopTimeCur && totalDur > 0) {
      el.desktopTimeCur.textContent = formatted;
    }
  }

  function commitSeek(ratio) {
    const totalDur = (player.getDuration && player.getDuration()) 
      || (player.ytPlayer && typeof player.ytPlayer.getDuration === 'function' && player.ytPlayer.getDuration()) 
      || (player.currentTrack && player.currentTrack.durationSec) 
      || 0;

    if (totalDur > 0) {
      const targetSec = totalDur * ratio;
      player.seekTo(targetSec);
    }
  }

  if (el.sheetTimeline) {
    el.sheetTimeline.addEventListener('pointerdown', (e) => {
      isScrubbing = true;
      el.sheetTimeline.classList.add('dragging');
      try {
        el.sheetTimeline.setPointerCapture(e.pointerId);
      } catch (_) {}
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
      try {
        el.sheetTimeline.releasePointerCapture(e.pointerId);
      } catch (_) {}
      const ratio = getScrubberRatio(e);
      renderScrubPreview(ratio);
      commitSeek(ratio);
    });

    el.sheetTimeline.addEventListener('pointercancel', (e) => {
      if (!isScrubbing) return;
      isScrubbing = false;
      el.sheetTimeline.classList.remove('dragging');
    });
  }

  // Video Mode Toggle
  el.sheetToggleVideoBtn.addEventListener('click', () => {
    state.isVideoMode = !state.isVideoMode;
    el.ytWrapper.classList.toggle('video-active', state.isVideoMode);
    el.sheetToggleVideoBtn.classList.toggle('liked', state.isVideoMode);
    showToast(state.isVideoMode ? 'Video dock opened' : 'Video dock minimized');
  });

  el.btnCloseVideo.addEventListener('click', () => {
    state.isVideoMode = false;
    el.ytWrapper.classList.remove('video-active');
    el.sheetToggleVideoBtn.classList.remove('liked');
  });

  // Sheet Queue Button
  el.sheetQueueBtn.addEventListener('click', () => {
    el.sheet.classList.remove('active');
    switchTab('library');
    showToast('Showing your queue & library');
  });

  /* ==========================================================================
     Create Playlist Modal
     ========================================================================== */
  el.btnCancelCreatePl.addEventListener('click', () => {
    el.createPlaylistModal.style.display = 'none';
  });

  el.btnConfirmCreatePl.addEventListener('click', () => {
    const title = el.newPlaylistTitleInput.value.trim();
    if (!title) {
      showToast('Please enter a playlist title', 'warning');
      return;
    }

    StorageManager.createPlaylist(title);
    el.createPlaylistModal.style.display = 'none';
    showToast(`Created playlist "${title}"!`, 'success');
    if (state.currentTab === 'library') {
      renderLibraryView();
    }
  });

  /* ==========================================================================
     Initialize Application
     ========================================================================== */
  // Pre-load default queue without autoplaying
  player.setQueue(DEFAULT_TRACKS, 0, false);

  // Set default initial track display
  if (DEFAULT_TRACKS.length > 0) {
    const first = DEFAULT_TRACKS[0];
    player.currentTrack = first;
    player.onTrackChange(first);
  }

  /* ==========================================================================
     Desktop Controls & Navigation Bindings
     ========================================================================== */
  // Desktop Play/Pause, Next, Prev
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
      player.previous();
    });
  }

  // Desktop Shuffle & Repeat
  if (el.desktopShuffleBtn) {
    el.desktopShuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShuffled = player.toggleShuffle();
      el.desktopShuffleBtn.classList.toggle('active', isShuffled);
      el.sheetShuffleBtn.classList.toggle('active', isShuffled);
      showToast(isShuffled ? 'Shuffle enabled' : 'Shuffle disabled');
    });
  }
  if (el.desktopRepeatBtn) {
    el.desktopRepeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = player.toggleRepeat();
      const isActive = mode !== 'off';
      el.desktopRepeatBtn.classList.toggle('active', isActive);
      el.sheetRepeatBtn.classList.toggle('active', isActive);
      showToast(`Repeat mode: ${mode.toUpperCase()}`);
    });
  }

  // Desktop Like Button
  if (el.desktopLikeBtn) {
    el.desktopLikeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (player.currentTrack) {
        const isLiked = StorageManager.toggleLikeSong(player.currentTrack);
        updateLikeIcons(isLiked);
        showToast(isLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
      }
    });
  }

  // Desktop Video, Queue, Expand
  if (el.desktopVideoBtn) {
    el.desktopVideoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.isVideoMode = !state.isVideoMode;
      el.ytWrapper.classList.toggle('video-active', state.isVideoMode);
      el.desktopVideoBtn.classList.toggle('liked', state.isVideoMode);
      el.sheetToggleVideoBtn.classList.toggle('liked', state.isVideoMode);
      showToast(state.isVideoMode ? 'Video dock opened' : 'Video dock minimized');
    });
  }
  if (el.desktopQueueBtn) {
    el.desktopQueueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchTab('library');
      showToast('Showing your queue & library');
    });
  }
  if (el.desktopExpandBtn) {
    el.desktopExpandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.sheet.classList.toggle('active');
    });
  }

  // Desktop Volume Slider & Mute
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

  // Desktop Timeline Scrubber Seeking (Pointer Events)
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

    el.desktopTimeline.addEventListener('pointercancel', () => {
      if (!isScrubbing) return;
      isScrubbing = false;
      el.desktopTimeline.classList.remove('dragging');
    });
  }

  // Desktop Sidebar Navigation Items
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.tab;
      switchTab(target);
    });
  });

  if (el.sidebarBrandBtn) {
    el.sidebarBrandBtn.addEventListener('click', () => switchTab('home'));
  }
  if (el.sidebarUserFooter) {
    el.sidebarUserFooter.addEventListener('click', () => switchTab('profile'));
  }
  if (el.sidebarLikedBtn) {
    el.sidebarLikedBtn.addEventListener('click', () => {
      const liked = StorageManager.getLikedSongs();
      if (liked.length > 0) {
        player.setQueue(liked, 0, true);
        showToast('Playing Liked Songs', 'success');
      } else {
        switchTab('library');
        showToast('No liked songs yet! Tap the heart on any track.', 'info');
      }
    });
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

  // Desktop Header Navigation Controls
  if (el.desktopNavBack) {
    el.desktopNavBack.addEventListener('click', () => {
      switchTab(state.previousTab || 'home');
    });
  }
  if (el.desktopTopSearchInput) {
    el.desktopTopSearchInput.addEventListener('focus', () => {
      switchTab('search');
    });
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

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K focuses search
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchTab('search', true);
      const sInput = document.getElementById('search-input') || el.desktopTopSearchInput;
      if (sInput) sInput.focus();
    }
  });

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
