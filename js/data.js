/**
 * EMBER - MUSIC FOR EVERY MOOD
 * Verified Popular Catalog & Real Hits
 */

const DEFAULT_TRACKS = [
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
    id: "vbvyNnw8Qjg",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    channelTitle: "Queen Official",
    duration: "05:55",
    durationSec: 355,
    thumbnail: "https://i.ytimg.com/vi/vbvyNnw8Qjg/hqdefault.jpg",
    category: "rock",
    badge: "Legendary"
  },
  {
    id: "u57d4_b_YgI",
    title: "Better Together",
    artist: "SZA",
    channelTitle: "Top Dawg Entertainment",
    duration: "03:42",
    durationSec: 222,
    thumbnail: "https://i.ytimg.com/vi/u57d4_b_YgI/hqdefault.jpg",
    category: "rnb",
    badge: "Soul"
  }
];

// All default demo playlists removed
const CURATED_PLAYLISTS = [];

const TRENDING_SEARCHES = [
  "Arijit Singh",
  "The Weeknd",
  "Diljit Dosanjh",
  "Taylor Swift",
  "Post Malone"
];

const GENRE_CARDS = [
  { title: "Bollywood", query: "Bollywood Hits", color: "linear-gradient(135deg, #ba68c8, #6a1b9a)", art: "https://i.ytimg.com/vi/IJq0yyWug1k/hqdefault.jpg" },
  { title: "Punjabi", query: "Punjabi Hits", color: "linear-gradient(135deg, #ffa726, #f57c00)", art: "https://i.ytimg.com/vi/jFGKJBPFdUA/hqdefault.jpg" },
  { title: "Pop", query: "Pop hits", color: "linear-gradient(135deg, #ec407a, #c2185b)", art: "assets/images/ember_rose.jpg" },
  { title: "Hip Hop", query: "Hip Hop", color: "linear-gradient(135deg, #ff7043, #e64a19)", art: "https://i.ytimg.com/vi/fHI8X483mZ4/hqdefault.jpg" },
  { title: "Lo-Fi", query: "Lofi Beats", color: "linear-gradient(135deg, #5c6bc0, #303f9f)", art: "assets/images/ember_banner.jpg" },
  { title: "R&B", query: "R&B hits", color: "linear-gradient(135deg, #ab47bc, #7b1fa2)", art: "https://i.ytimg.com/vi/fHI8X483mZ4/hqdefault.jpg" },
  { title: "Electronic", query: "Electronic EDM", color: "linear-gradient(135deg, #26c6da, #0097a7)", art: "assets/images/ember_banner.jpg" },
  { title: "Rock", query: "Classic Rock", color: "linear-gradient(135deg, #ef5350, #d32f2f)", art: "https://i.ytimg.com/vi/vbvyNnw8Qjg/hqdefault.jpg" },
  { title: "Indie", query: "Indie Alternative", color: "linear-gradient(135deg, #66bb6a, #388e3c)", art: "https://i.ytimg.com/vi/RBumgq5yVrA/hqdefault.jpg" },
  { title: "Ambient", query: "Ambient Chill", color: "linear-gradient(135deg, #78909c, #455a64)", art: "https://i.ytimg.com/vi/36YnV9STBqc/hqdefault.jpg" }
];
