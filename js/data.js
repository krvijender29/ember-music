/**
 * EMBER - MUSIC FOR EVERY MOOD
 * Curated Catalog, Playlists & Initial Tracks
 */

const DEFAULT_TRACKS = [
  {
    id: "DWcJFNfaw9c",
    title: "Midnight",
    artist: "Ember",
    channelTitle: "Ember Soundscape",
    duration: "03:56",
    durationSec: 236,
    thumbnail: "assets/images/ember_midnight.jpg",
    category: "ember",
    badge: "Ember Exclusive"
  },
  {
    id: "fHI8X483mZ4",
    title: "After Hours",
    artist: "The Weeknd",
    channelTitle: "The Weeknd",
    duration: "06:01",
    durationSec: 361,
    thumbnail: "https://i.ytimg.com/vi/fHI8X483mZ4/hqdefault.jpg",
    category: "rnb",
    badge: "Trending"
  },
  {
    id: "4NRXx6U8ABQ",
    title: "Blinding Lights",
    artist: "The Weeknd",
    channelTitle: "The Weeknd",
    duration: "03:20",
    durationSec: 200,
    thumbnail: "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
    category: "pop",
    badge: "Chart Buster"
  },
  {
    id: "u57d4_b_YgI",
    title: "Better Together",
    artist: "SZA",
    channelTitle: "Top Dawg Entertainment",
    duration: "03:42",
    durationSec: 222,
    thumbnail: "assets/images/ember_rose.jpg",
    category: "rnb",
    badge: "Soul"
  },
  {
    id: "1fuDDqU6n4o",
    title: "Space",
    artist: "Ember",
    channelTitle: "M83",
    duration: "04:04",
    durationSec: 244,
    thumbnail: "assets/images/ember_drive.jpg",
    category: "ember",
    badge: "Atmosphere"
  },
  {
    id: "RBumgq5yVrA",
    title: "Let Her Go",
    artist: "Passenger",
    channelTitle: "Passenger",
    duration: "04:14",
    durationSec: 254,
    thumbnail: "https://i.ytimg.com/vi/RBumgq5yVrA/hqdefault.jpg",
    category: "acoustic",
    badge: "Acoustic Hit"
  },
  {
    id: "ApXoWvfEYVU",
    title: "Sunflower",
    artist: "Post Malone",
    channelTitle: "Post Malone",
    duration: "02:41",
    durationSec: 161,
    thumbnail: "https://i.ytimg.com/vi/ApXoWvfEYVU/hqdefault.jpg",
    category: "pop",
    badge: "Global Hit"
  },
  {
    id: "jFGKJBPFdUA",
    title: "Apna Time Aayega",
    artist: "Ranveer Singh & DIVINE",
    channelTitle: "Zee Music Company",
    duration: "02:10",
    durationSec: 130,
    thumbnail: "https://i.ytimg.com/vi/jFGKJBPFdUA/hqdefault.jpg",
    category: "hiphop",
    badge: "Rap Anthem"
  },
  {
    id: "BddP6PYo2gs",
    title: "Kesariya",
    artist: "Arijit Singh",
    channelTitle: "Sony Music India",
    duration: "04:28",
    durationSec: 268,
    thumbnail: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
    category: "indian",
    badge: "Love Anthem"
  },
  {
    id: "IJq0yyWug1k",
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    channelTitle: "T-Series",
    duration: "04:22",
    durationSec: 262,
    thumbnail: "https://i.ytimg.com/vi/IJq0yyWug1k/hqdefault.jpg",
    category: "indian",
    badge: "Timeless"
  },
  {
    id: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio - Beats to Relax/Study to",
    artist: "Lofi Girl",
    channelTitle: "Lofi Girl",
    duration: "LIVE",
    durationSec: 0,
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    category: "lofi",
    badge: "Live 24/7"
  },
  {
    id: "4xDzrJKXOOY",
    title: "synthwave radio - chill synth / retro beats",
    artist: "Lofi Girl",
    channelTitle: "Lofi Girl",
    duration: "LIVE",
    durationSec: 0,
    thumbnail: "https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg",
    category: "synthwave",
    badge: "Live Synth"
  },
  {
    id: "e-ORhEE9VVg",
    title: "Blank Space",
    artist: "Taylor Swift",
    channelTitle: "Taylor Swift",
    duration: "04:33",
    durationSec: 273,
    thumbnail: "https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg",
    category: "pop",
    badge: "Chart Buster"
  },
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    channelTitle: "Ed Sheeran",
    duration: "04:23",
    durationSec: 263,
    thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    category: "pop",
    badge: "Worldwide #1"
  },
  {
    id: "vbvyNnw8Qjg",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    channelTitle: "Queen Official",
    duration: "05:55",
    durationSec: 355,
    thumbnail: "https://i.ytimg.com/vi/vbvyNnw8Qjg/hqdefault.jpg",
    category: "rock",
    badge: "Legendary"
  }
];

const CURATED_PLAYLISTS = [
  {
    id: "late-nights",
    title: "Late Nights",
    subtitle: "Playlist • Ember",
    description: "Chill vibes for the night... 🌙",
    stats: "50 songs • 2h 45m",
    cover: "assets/images/ember_midnight.jpg",
    trackIds: ["DWcJFNfaw9c", "fHI8X483mZ4", "u57d4_b_YgI", "1fuDDqU6n4o", "4NRXx6U8ABQ"]
  },
  {
    id: "heartbreaks-heels",
    title: "Heartbreaks & Heels",
    subtitle: "Playlist • Ember",
    description: "Passionate rhythms, burning roses & moody ember melodies",
    stats: "38 songs • 2h 10m",
    cover: "assets/images/ember_rose.jpg",
    trackIds: ["u57d4_b_YgI", "RBumgq5yVrA", "IJq0yyWug1k", "e-ORhEE9VVg"]
  },
  {
    id: "drive",
    title: "Drive",
    subtitle: "Playlist • Ember",
    description: "Cruising down late night highways into glowing horizons",
    stats: "44 songs • 2h 30m",
    cover: "assets/images/ember_drive.jpg",
    trackIds: ["DWcJFNfaw9c", "4NRXx6U8ABQ", "1fuDDqU6n4o", "4xDzrJKXOOY"]
  },
  {
    id: "chill-vibes",
    title: "Chill Vibes",
    subtitle: "Playlist • Ember",
    description: "Sunset acoustics and gentle lo-fi melodies to unwind",
    stats: "62 songs • 3h 15m",
    cover: "assets/images/ember_banner.jpg",
    trackIds: ["jfKfPfyJRdk", "RBumgq5yVrA", "ApXoWvfEYVU", "JGwWNGJdvx8"]
  },
  {
    id: "focus-mode",
    title: "Focus Mode",
    subtitle: "Playlist • Ember",
    description: "Ambient frequencies for deep coding, reading and flow",
    stats: "30 songs • 1h 50m",
    cover: "https://i.ytimg.com/vi/36YnV9STBqc/hqdefault.jpg",
    trackIds: ["4xDzrJKXOOY", "DWcJFNfaw9c", "jfKfPfyJRdk"]
  }
];

const TRENDING_SEARCHES = [
  "Arijit Singh",
  "The Weeknd",
  "Lofi Beats",
  "Atif Aslam",
  "Taylor Swift"
];
