#!/usr/bin/env python3
"""
EMBER Music - Vercel Serverless Function & Direct CDN Discovery API
JioSaavn 320kbps Akamai CDN Engine (Standard Library Only - Zero Dependencies)
Handles /api/search, /api/suggestions, /api/playlist-items, /api/artist-tracks, /api/trending, and /api/resolve
Zero API Keys Required / Zero Daily Quota Limits / Instant 320kbps MP4 Audio
"""

from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import base64
import html
import re
import os
import sys
import time
import concurrent.futures

SAAVN_API_BASE = "https://www.jiosaavn.com/api.php"

# In-memory search cache (12-hour TTL)
SEARCH_CACHE = {}
CACHE_TTL = 12 * 3600

# ==============================================================================
# Pure Python DES Decryptor (for JioSaavn Akamai 320kbps Stream Links)
# ==============================================================================
IP = [
    58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7
]

FP = [
    40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
    34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25
]

E = [
    32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
    8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1
]

P = [
    16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
    2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25
]

PC1 = [
    57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
    10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
    63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
    14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4
]

PC2 = [
    14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10,
    23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
    41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48,
    44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32
]

SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]

S_BOXES = [
    [
        14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
        0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
        4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
        15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13
    ],
    [
        15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
        3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
        0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
        13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9
    ],
    [
        10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
        13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
        13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
        1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12
    ],
    [
        7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
        13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
        10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
        3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14
    ],
    [
        2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
        14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
        4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
        11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3
    ],
    [
        12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
        10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
        9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
        4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13
    ],
    [
        4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
        13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
        1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
        6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12
    ],
    [
        13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
        1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
        7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
        2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11
    ]
]

def permute(block, table):
    return [block[i - 1] for i in table]

def bytes_to_bits(data):
    bits = []
    for b in data:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)
    return bits

def bits_to_bytes(bits):
    b = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for bit in bits[i:i+8]:
            byte = (byte << 1) | bit
        b.append(byte)
    return bytes(b)

def generate_subkeys(key_bytes):
    key_bits = bytes_to_bits(key_bytes)
    permuted = permute(key_bits, PC1)
    C = permuted[:28]
    D = permuted[28:]
    subkeys = []
    for shift in SHIFTS:
        C = C[shift:] + C[:shift]
        D = D[shift:] + D[:shift]
        subkeys.append(permute(C + D, PC2))
    return subkeys

def feistel(R, subkey):
    expanded = permute(R, E)
    xored = [a ^ b for a, b in zip(expanded, subkey)]
    out_bits = []
    for i in range(8):
        chunk = xored[i*6:(i+1)*6]
        row = (chunk[0] << 1) | chunk[5]
        col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4]
        val = S_BOXES[i][row * 16 + col]
        for shift in (3, 2, 1, 0):
            out_bits.append((val >> shift) & 1)
    return permute(out_bits, P)

def des_decrypt_block(block_bits, subkeys):
    permuted = permute(block_bits, IP)
    L = permuted[:32]
    R = permuted[32:]
    for subkey in reversed(subkeys):
        L_next = R
        R_next = [a ^ b for a, b in zip(L, feistel(R, subkey))]
        L = L_next
        R = R_next
    return permute(R + L, FP)

def des_decrypt_ecb(encrypted_bytes, key_bytes=b"38346591"):
    try:
        subkeys = generate_subkeys(key_bytes)
        all_bits = bytes_to_bits(encrypted_bytes)
        decrypted_bits = []
        for i in range(0, len(all_bits), 64):
            block = all_bits[i:i+64]
            decrypted_bits.extend(des_decrypt_block(block, subkeys))
        decrypted_bytes = bits_to_bytes(decrypted_bits)
        pad_len = decrypted_bytes[-1]
        if 1 <= pad_len <= 8:
            decrypted_bytes = decrypted_bytes[:-pad_len]
        return decrypted_bytes.decode('utf-8', errors='ignore')
    except Exception:
        return ""


# ==============================================================================
# Helper Functions for JioSaavn Catalog Data & Direct Audio Streams
# ==============================================================================
def format_duration(seconds):
    try:
        sec = int(seconds)
        m = sec // 60
        s = sec % 60
        return (f"{m:02d}:{s:02d}", sec)
    except (ValueError, TypeError):
        return ("03:30", 210)


def clean_song_item(item):
    """Transform raw JioSaavn song object into Ember track structure"""
    enc = item.get("encrypted_media_url") or item.get("more_info", {}).get("encrypted_media_url")
    audio_url = ""
    if enc:
        try:
            raw = des_decrypt_ecb(base64.b64decode(enc))
            # 320kbps Akamai CDN direct audio stream
            audio_url = raw.replace("http:", "https:").replace("_96.mp4", "_320.mp4")
        except Exception:
            pass

    duration_sec = 210
    raw_dur = item.get("duration") or item.get("more_info", {}).get("duration", 210)
    try:
        duration_sec = int(raw_dur)
    except (ValueError, TypeError):
        duration_sec = 210

    dur_txt, dur_sec = format_duration(duration_sec)

    image_url = item.get("image", "")
    if image_url:
        image_url = image_url.replace("150x150", "500x500").replace("50x50", "500x500")

    title = html.unescape(item.get("song") or item.get("title") or "Unknown Title")

    primary = item.get("primary_artists") or item.get("singers")
    if not primary and "more_info" in item:
        arts = item.get("more_info", {}).get("artistMap", {}).get("primary_artists", [])
        if arts:
            primary = ", ".join([a.get("name", "") for a in arts if a.get("name")])
    if not primary:
        primary = item.get("subtitle", "Ember Artist")
    primary = html.unescape(str(primary))

    album = html.unescape(item.get("album") or item.get("more_info", {}).get("album", ""))

    return {
        "id": str(item.get("id")),
        "title": title,
        "artist": primary,
        "channelTitle": primary,
        "album": album,
        "thumbnail": image_url or "assets/images/ember_banner.jpg",
        "audioUrl": audio_url,
        "duration": dur_txt,
        "durationSec": dur_sec,
        "category": item.get("language", "general")
    }


def clean_album_item(item):
    aid = str(item.get("albumid") or item.get("id") or "")
    title = html.unescape(item.get("title") or item.get("name") or "Album")
    img = item.get("image", "").replace("150x150", "500x500").replace("50x50", "500x500")
    sub = html.unescape(item.get("subtitle") or item.get("artist") or f"{item.get('year', '')} Album".strip())
    return {
        "id": aid,
        "title": title,
        "subtitle": sub or "Album",
        "thumbnail": img or "assets/images/ember_banner.jpg",
        "cover": img or "assets/images/ember_banner.jpg",
        "isAlbum": True,
        "type": "album"
    }


def clean_playlist_item(item):
    pid = str(item.get("listid") or item.get("id") or "")
    title = html.unescape(item.get("title") or item.get("listname") or item.get("name") or "Playlist")
    img = item.get("image", "").replace("150x150", "500x500").replace("50x50", "500x500")
    sub = html.unescape(item.get("subtitle") or f"{item.get('count', '')} Songs".strip() or "Playlist")
    return {
        "id": pid,
        "title": title,
        "subtitle": sub,
        "thumbnail": img or "assets/images/ember_banner.jpg",
        "cover": img or "assets/images/ember_banner.jpg",
        "isAlbum": False,
        "type": "playlist"
    }


def clean_artist_item(item):
    aid = str(item.get("id") or "")
    name = html.unescape(item.get("name") or item.get("title") or "Artist")
    img = item.get("image", "").replace("50x50", "500x500").replace("150x150", "500x500")
    return {
        "id": aid,
        "title": name,
        "thumbnail": img or "assets/images/ember_banner.jpg",
        "avatar": img or "assets/images/ember_banner.jpg",
        "role": "Artist",
        "type": "artist"
    }


def saavn_get(call_name, extra_params=None):
    params = {
        "__call": call_name,
        "_format": "json",
        "_marker": "0",
        "api_version": "4",
        "ctx": "web6dot0"
    }
    if extra_params:
        params.update(extra_params)
    url = f"{SAAVN_API_BASE}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=9) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ==============================================================================
# Vercel Serverless Handler
# ==============================================================================
class handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        params = urllib.parse.parse_qs(parsed.query)

        # ----------------------------------------------------------------------
        # Route 1: /api/suggestions?q=query
        # ----------------------------------------------------------------------
        if path == "/api/suggestions" or path.endswith("/suggestions"):
            query = params.get("q", [""])[0].strip()
            if not query:
                self.send_json({"success": True, "suggestions": []})
                return

            try:
                data = saavn_get("autocomplete.get", {"query": query})
                suggestions = []
                seen = set()
                for it in (data.get("topquery", {}).get("data", []) +
                          data.get("songs", {}).get("data", []) +
                          data.get("artists", {}).get("data", [])):
                    t = html.unescape(it.get("title") or it.get("name") or "").strip()
                    if t and t.lower() not in seen:
                        suggestions.append(t)
                        seen.add(t.lower())

                if not suggestions:
                    g_url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(query)}"
                    g_req = urllib.request.Request(g_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(g_req, timeout=4) as g_resp:
                        g_data = json.loads(g_resp.read().decode("utf-8"))
                        suggestions = g_data[1] if len(g_data) > 1 else []

                self.send_json({"success": True, "query": query, "suggestions": suggestions[:8]})
            except Exception as e:
                self.send_json({"success": False, "suggestions": [], "error": str(e)}, status=200)
            return

        # ----------------------------------------------------------------------
        # Route 2: /api/search?q=query&filter=all|songs|artists|albums|playlists&n=24
        # ----------------------------------------------------------------------
        if path == "/api/search" or path.endswith("/search"):
            query = params.get("q", [""])[0].strip()
            search_filter = params.get("filter", ["all"])[0].lower().strip()
            page_token = params.get("pageToken", [""])[0].strip()
            try:
                limit = int(params.get("n", ["24"])[0])
            except (ValueError, TypeError):
                limit = 24

            if not query:
                self.send_json({"success": False, "results": [], "error": "Query required"})
                return

            cache_key = f"{query.lower()}::{search_filter}::{limit}::{page_token}"
            now = time.time()
            if not page_token and cache_key in SEARCH_CACHE:
                cached_time, cached_payload = SEARCH_CACHE[cache_key]
                if now - cached_time < CACHE_TTL:
                    self.send_json(cached_payload)
                    return

            try:
                if search_filter == "songs":
                    raw = saavn_get("search.getResults", {"q": query, "n": min(limit, 30), "p": 1})
                    tracks = [clean_song_item(s) for s in raw.get("results", [])]
                    tracks = [t for t in tracks if t.get("audioUrl")]
                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "songs",
                        "results": tracks,
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                elif search_filter == "artists":
                    raw = saavn_get("search.getArtistResults", {"q": query, "n": min(limit, 20), "p": 1})
                    artists = [clean_artist_item(a) for a in raw.get("results", [])]
                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "artists",
                        "results": artists,
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                elif search_filter == "albums":
                    raw = saavn_get("search.getAlbumResults", {"q": query, "n": min(limit, 20), "p": 1})
                    albums = [clean_album_item(al) for al in raw.get("results", [])]
                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "albums",
                        "results": albums,
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                elif search_filter == "playlists":
                    raw = saavn_get("search.getPlaylistResults", {"q": query, "n": min(limit, 20), "p": 1})
                    playlists = [clean_playlist_item(pl) for pl in raw.get("results", [])]
                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "playlists",
                        "results": playlists,
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                else:
                    def _fetch_songs():
                        return saavn_get("search.getResults", {"q": query, "n": 10, "p": 1})

                    def _fetch_artists():
                        return saavn_get("search.getArtistResults", {"q": query, "n": 6, "p": 1})

                    def _fetch_albums():
                        return saavn_get("search.getAlbumResults", {"q": query, "n": 6, "p": 1})

                    def _fetch_playlists():
                        return saavn_get("search.getPlaylistResults", {"q": query, "n": 6, "p": 1})

                    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                        f_songs = executor.submit(_fetch_songs)
                        f_artists = executor.submit(_fetch_artists)
                        f_albums = executor.submit(_fetch_albums)
                        f_playlists = executor.submit(_fetch_playlists)

                        songs_raw = f_songs.result()
                        artists_raw = f_artists.result()
                        albums_raw = f_albums.result()
                        playlists_raw = f_playlists.result()

                    songs = [clean_song_item(s) for s in songs_raw.get("results", [])]
                    songs = [s for s in songs if s.get("audioUrl")]

                    artists = [clean_artist_item(a) for a in artists_raw.get("results", [])]
                    albums = [clean_album_item(al) for al in albums_raw.get("results", [])]
                    playlists = [clean_playlist_item(pl) for pl in playlists_raw.get("results", [])]

                    top_result = None
                    q_lower = query.lower()
                    if artists and (q_lower in artists[0]["title"].lower() or artists[0]["title"].lower() in q_lower):
                        top_result = {**artists[0], "isArtist": True}
                    elif songs:
                        top_result = {**songs[0], "isSong": True}

                    payload = {
                        "success": True,
                        "query": query,
                        "filter": "all",
                        "source": "saavn_cdn_320kbps",
                        "topResult": top_result,
                        "songs": songs,
                        "artists": artists,
                        "albums": albums,
                        "playlists": playlists,
                        "results": songs
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, payload)
                    self.send_json(payload)
                    return

            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 3: /api/playlist-items?id=playlistId&n=30
        # ----------------------------------------------------------------------
        if path == "/api/playlist-items" or path.endswith("/playlist-items"):
            pid = params.get("id", [""])[0].strip()
            if not pid:
                self.send_json({"success": False, "results": [], "error": "Playlist ID required"})
                return

            try:
                songs = []
                try:
                    data = saavn_get("content.getAlbumDetails", {"albumid": pid})
                    raw_songs = data.get("list") or data.get("songs") or []
                    songs = [clean_song_item(s) for s in raw_songs if clean_song_item(s).get("audioUrl")]
                except Exception:
                    pass

                if not songs:
                    try:
                        data = saavn_get("playlist.getDetails", {"listid": pid})
                        raw_songs = data.get("list") or data.get("songs") or []
                        songs = [clean_song_item(s) for s in raw_songs if clean_song_item(s).get("audioUrl")]
                    except Exception:
                        pass

                self.send_json({
                    "success": True,
                    "playlistId": pid,
                    "results": songs,
                    "nextPageToken": ""
                })
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 4: /api/artist-tracks?id=channelId&n=20
        # ----------------------------------------------------------------------
        if path == "/api/artist-tracks" or path.endswith("/artist-tracks"):
            cid = params.get("id", [""])[0].strip()
            try:
                data = saavn_get("artist.getArtistPageDetails", {"artistId": cid, "n_song": 25})
                raw_songs = data.get("topSongs", [])
                tracks = [clean_song_item(s) for s in raw_songs if clean_song_item(s).get("audioUrl")]
                self.send_json({"success": True, "artistId": cid, "results": tracks})
            except Exception:
                try:
                    raw = saavn_get("search.getResults", {"q": cid, "n": 20, "p": 1})
                    tracks = [clean_song_item(s) for s in raw.get("results", []) if clean_song_item(s).get("audioUrl")]
                    self.send_json({"success": True, "artistId": cid, "results": tracks})
                except Exception as ex:
                    self.send_json({"success": False, "results": [], "error": str(ex)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 5: /api/trending
        # ----------------------------------------------------------------------
        if path == "/api/trending" or path.endswith("/trending"):
            try:
                data = saavn_get("search.getResults", {"q": "hindi trending hits", "n": 24, "p": 1})
                tracks = [clean_song_item(s) for s in data.get("results", []) if clean_song_item(s).get("audioUrl")]
                self.send_json({"success": True, "results": tracks})
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 6: /api/resolve?title=...&artist=...
        # ----------------------------------------------------------------------
        if path == "/api/resolve" or path.endswith("/resolve"):
            title = params.get("title", [""])[0].strip()
            artist = params.get("artist", [""])[0].strip()
            query = f"{title} {artist}".strip()
            if not query:
                self.send_json({"success": False, "error": "Title required"}, status=400)
                return

            try:
                raw = saavn_get("search.getResults", {"q": query, "n": 5, "p": 1})
                tracks = [clean_song_item(s) for s in raw.get("results", []) if clean_song_item(s).get("audioUrl")]
                if tracks:
                    self.send_json({"success": True, "track": tracks[0]})
                else:
                    self.send_json({"success": False, "error": "No match found"}, status=404)
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, status=500)
            return

        # Default info
        self.send_json({
            "status": "online",
            "service": "Ember Direct CDN Music Discovery API",
            "engine": "JioSaavn 320kbps Akamai CDN Engine",
            "endpoints": [
                "/api/search?q={query}&filter={all|songs|artists|albums|playlists}",
                "/api/suggestions?q={query}",
                "/api/playlist-items?id={playlistId}",
                "/api/artist-tracks?id={channelId}",
                "/api/trending",
                "/api/resolve?title={title}&artist={artist}"
            ]
        })

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
