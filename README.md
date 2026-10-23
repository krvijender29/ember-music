# 🔥 EMBER - Music for Every Mood

A sleek, obsidian-dark and fiery ember-themed mobile web music player application powered by the YouTube Data & IFrame APIs. Designed with modern aesthetics, fluid transitions, and a mobile-first app shell.

![EMBER Banner](assets/images/ember_banner.jpg)

---

## ✨ Features

- **🔥 Obsidian & Ember Dark Theme**: Premium pitch-black design (`#08090D`) with fiery orange accents (`#FF5500`), ambient glows, and glassmorphic card elements.
- **📱 Mobile App Shell Layout**: Centered smartphone form-factor on desktop viewports and full-screen responsive on mobile browsers.
- **🔍 Live YouTube Music Search**:
  - Real-time search with 350ms debounce and instant `Enter` key execution.
  - Search filters: `All`, `Songs`, `Artists`, `Playlists`, `Albums`.
  - Trending search shortcuts: *Arijit Singh*, *The Weeknd*, *Lofi Beats*, *Atif Aslam*, *Taylor Swift*.
  - Strict embeddability checks to minimize playback issues.
- **🎧 Fullscreen "Now Playing" Drawer**:
  - Slides up smoothly from the bottom mini-player bar.
  - Artwork, title, and artist display.
  - Interactive scrubbing timeline with live timestamps.
  - Controls: Play/Pause, Next, Previous, Shuffle, Repeat.
  - Quick action buttons for Liking tracks, Queue access, and Video mode popup.
- **🎛️ Persistent Mini-Player**:
  - Sits directly above the bottom navigation bar.
  - Top orange progress line, album thumbnail, track title, play/pause, and skip controls.
- **📚 Curated & Custom Playlists**:
  - Curated mixes: *Late Nights*, *Heartbreaks & Heels*, *Drive*, *Chill Vibes*, *Focus Mode*.
  - Dedicated playlist detail screens with follow toggles, tracklist, and play-all buttons.
  - Custom playlist creation with `localStorage` persistence.
- **👤 User Profile & Settings**:
  - Profile screen for *Vijender Singh* (`@emberuser`) with stats (32 Playlists, 12.4K Followers, 184 Following).
  - Quick preference indicators (Theme, Audio Quality, Streaming Engine).
- **🛡️ Copyright Fallback Engine**:
  - Automatically handles YouTube embedding restrictions (errors 101/150) by finding and streaming embeddable topic/lyric alternatives.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **APIs**: YouTube Data API v3 & YouTube IFrame Player API
- **Fonts**: Outfit & JetBrains Mono (via Google Fonts)
- **Icons**: Clean inline SVG icons

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/krvijender29/ember-music.git
cd ember-music
```

### 2. Run Locally
You can run it with any static web server. For example, using Python:
```bash
# Python 3
python -m http.server 4321
```

Now open `http://127.0.0.1:4321` in your browser.

---

## 📂 Project Structure

```
├── assets/
│   └── images/          # Artwork, banners, and logos
├── css/
│   └── style.css        # Master design system & mobile shell styling
├── js/
│   ├── app.js           # Main app controller, routing, and views
│   ├── data.js          # Catalog data & default playlists
│   ├── player.js        # YouTube IFrame playback engine
│   ├── storage.js       # LocalStorage manager
│   ├── visualizer.js    # Canvas audio visualizer
│   └── yt-api.js        # YouTube Data API v3 integration & search
├── index.html           # Main HTML5 entry point
├── .gitignore
└── README.md
```

---

## 📄 License

MIT License. Free to use and customize.
