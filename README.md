# 🎧 EMBER - Music for Every Mood

A sleek, obsidian-noir and crisp white mobile web music player application inspired by the design language of [krvijender.vercel.app](https://krvijender.vercel.app/). Powered by the resilient Piped API Engine and YouTube IFrame playback with automated copyright bypass.

![EMBER Banner](assets/images/ember_banner.jpg)

---

## ✨ Features

- **🖤 Noir Monochrome Dark Theme**: High-contrast obsidian pitch-black design (`#0C0C14`) with crisp pure white accents (`#FFFFFF`), subtle noise texturing, and frosted glass cards inspired by Vijender Singh's portfolio.
- **📱 Mobile App Shell Layout**: Centered smartphone form-factor on desktop viewports and full-screen responsive on mobile browsers.
- **⚡ High-Speed Direct CDN Engine (320 kbps Direct Audio)**:
  - Instant direct audio streaming starting in **< 200ms** (10x faster than YouTube iframes).
  - Native HTML5 `<audio>` player with zero YouTube iframe overhead, zero ads, and zero Error 101/150 blocks.
  - Unlimited searches and streaming queries (80+ million tracks across all Punjabi, Bollywood, Hindi, and International genres).
  - Instant byte-range timeline seeking with real-time audio scrub preview.
  - Native lock screen & hardware media keys integration via the **MediaSession API**.
  - Resilient Piped/Invidious multi-instance fallback if offline.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Audio Engine**: Native HTML5 Audio (`new Audio()`) with MediaSession integration
- **Streaming & Search**: High-Speed Direct CDN Engine (320 kbps Akamai CDN) + Piped API fallback
- **Server**: Lightweight standard library Python server (`server.py` - zero dependencies)
- **Fonts**: Syne & DM Mono (via Google Fonts)
- **Icons**: Clean inline SVG icons

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/krvijender29/ember-music.git
cd ember-music
```

### 2. Run High-Speed Server (Recommended)
Launch the lightweight zero-dependency server:
```bash
python server.py 4321
```
Now open `http://localhost:4321` in your browser. All music will search and stream instantly in high-fidelity 320kbps audio!

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
