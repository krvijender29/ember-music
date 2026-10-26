#!/usr/bin/env python3
"""
EMBER - YouTube Music Discovery & Streaming Server
Lightweight Python server (Standard Library Only - Zero Dependencies)
Provides static asset serving, live YouTube Music catalog search,
autocomplete suggestions, and playlist/album resolution.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import os
import sys
import time
import base64
import html
import concurrent.futures

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 4321))
YOUTUBE_API_KEYS = [
    k.strip() for k in os.environ.get("YOUTUBE_API_KEY", "").split(",") if k.strip()
] or [
    "AIzaSyBRrPickOQtOYJUh9bXNzMjIJuBIqZwCpM",
    "AIzaSyDUnACXuxfMyOy3OrCgRSgm3eTmsEFY9xw"
]
YT_BASE_URL = "https://www.googleapis.com/youtube/v3"

# In-memory search cache (12-hour TTL) for zero-quota repeat queries
SEARCH_CACHE = {}
CACHE_TTL = 12 * 3600


# ==============================================================================
# Helper Functions for YouTube Catalog Data
# ==============================================================================
def parse_iso_duration(iso_duration):
    if not iso_duration:
        return ("03:30", 210)
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return ("03:30", 210)
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    tot = h * 3600 + m * 60 + s
    if h > 0:
        return (f"{h}:{m:02d}:{s:02d}", tot)
    return (f"{m}:{s:02d}", tot)


def format_count(val):
    try:
        n = int(val)
        if n >= 1_000_000_000:
            return f"{n / 1_000_000_000:.1f}B"
        if n >= 1_000_000:
            return f"{n / 1_000_000:.1f}M"
        if n >= 1_000:
            return f"{n / 1_000:.1f}K"
        return str(n)
    except (ValueError, TypeError):
        return ""


def clean_title(title):
    if not title:
        return ""
    t = (
        title.replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    t = re.sub(r"\[.*?\]", "", t)
    t = re.sub(r"\(Official\s*(?:Music\s*)?Video.*?\)", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\(Lyric\s*(?:Video)?.*?\)", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\(Audio.*?\)", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\|.*$", "", t)
    return t.strip()


def yt_fetch(endpoint, params):
    params_copy = dict(params)
    last_err = None
    for api_key in YOUTUBE_API_KEYS:
        params_copy["key"] = api_key
        url = f"{YT_BASE_URL}/{endpoint}?" + urllib.parse.urlencode(params_copy)
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "http://localhost:4321/"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=9) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (403, 429):
                # Quota or referrer restriction on this key -> failover to next key in pool
                continue
            raise e
        except Exception as e:
            last_err = e
            continue
    if last_err:
        raise last_err
    return {}


def enrich_videos(video_ids):
    if not video_ids:
        return {}
    try:
        data = yt_fetch("videos", {
            "part": "contentDetails,statistics,snippet,status",
            "id": ",".join(video_ids[:50])
        })
        res = {}
        for item in data.get("items", []):
            vid = item.get("id")
            dur_txt, dur_sec = parse_iso_duration(item.get("contentDetails", {}).get("duration"))
            res[vid] = {
                "duration": dur_txt,
                "durationSec": dur_sec,
                "viewCount": format_count(item.get("statistics", {}).get("viewCount")),
                "embeddable": item.get("status", {}).get("embeddable", True)
            }
        return res
    except Exception as e:
        print("[Ember] Error enriching videos:", e)
        return {}


def format_video_track(item, details_map=None):
    vid = item.get("id", {}).get("videoId") if isinstance(item.get("id"), dict) else item.get("id")
    if not vid:
        return None
    snippet = item.get("snippet", {})
    details = (details_map or {}).get(vid, {})
    title = clean_title(snippet.get("title", ""))
    channel = snippet.get("channelTitle", "Artist")

    thumb = (
        snippet.get("thumbnails", {}).get("high", {}).get("url")
        or snippet.get("thumbnails", {}).get("medium", {}).get("url")
        or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
    )

    return {
        "id": vid,
        "title": title or snippet.get("title", "Unknown Track"),
        "artist": channel,
        "channelTitle": channel,
        "channelId": snippet.get("channelId", ""),
        "duration": details.get("duration", "03:30"),
        "durationSec": details.get("durationSec", 210),
        "thumbnail": thumb,
        "viewCount": details.get("viewCount", ""),
        "embeddable": details.get("embeddable", True),
        "category": "song"
    }


def format_artist_item(item):
    cid = item.get("id", {}).get("channelId") if isinstance(item.get("id"), dict) else item.get("id")
    if not cid:
        return None
    snippet = item.get("snippet", {})
    thumb = (
        snippet.get("thumbnails", {}).get("high", {}).get("url")
        or snippet.get("thumbnails", {}).get("medium", {}).get("url")
        or snippet.get("thumbnails", {}).get("default", {}).get("url")
        or "assets/images/ember_banner.jpg"
    )
    title = snippet.get("title", "Artist")
    # Clean topic suffix if present (e.g. "Arijit Singh - Topic")
    clean_artist_name = re.sub(r"\s*-\s*Topic$", "", title, flags=re.IGNORECASE).strip()

    return {
        "id": cid,
        "channelId": cid,
        "title": clean_artist_name,
        "rawTitle": title,
        "description": snippet.get("description", ""),
        "thumbnail": thumb,
        "category": "artist"
    }


def format_playlist_item(item, is_album=False):
    pid = item.get("id", {}).get("playlistId") if isinstance(item.get("id"), dict) else item.get("id")
    if not pid:
        return None
    snippet = item.get("snippet", {})
    thumb = (
        snippet.get("thumbnails", {}).get("high", {}).get("url")
        or snippet.get("thumbnails", {}).get("medium", {}).get("url")
        or snippet.get("thumbnails", {}).get("default", {}).get("url")
        or "assets/images/ember_banner.jpg"
    )
    raw_title = snippet.get("title", "Playlist")
    clean_pl_title = clean_title(raw_title)

    return {
        "id": pid,
        "playlistId": pid,
        "title": clean_pl_title or raw_title,
        "subtitle": snippet.get("channelTitle", "Ember Collection"),
        "channelTitle": snippet.get("channelTitle", "Ember Collection"),
        "channelId": snippet.get("channelId", ""),
        "thumbnail": thumb,
        "cover": thumb,
        "category": "album" if is_album else "playlist"
    }


# ==============================================================================
# Pure Python DES Decryptor & Unlimited Fallback Catalog (JioSaavn 320kbps)
# Used automatically if YouTube API keys reach daily quota
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
E = [
    32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
    8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1
]
S_BOXES = [
    [[14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
     [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
     [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
     [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]],
    [[15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
     [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
     [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
     [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9]],
    [[10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
     [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
     [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
     [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12]],
    [[7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
     [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
     [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
     [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14]],
    [[2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
     [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
     [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
     [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3]],
    [[12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
     [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
     [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
     [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13]],
    [[4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
     [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
     [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
     [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12]],
    [[13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
     [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
     [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
     [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11]]
]
P = [
    16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
    2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25
]

def permute(bits, table): return [bits[x - 1] for x in table]
def bytes_to_bits(b):
    res = []
    for byte in b:
        for i in range(7, -1, -1): res.append((byte >> i) & 1)
    return res
def bits_to_bytes(bits):
    b = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for bit in bits[i:i+8]: byte = (byte << 1) | bit
        b.append(byte)
    return bytes(b)
def generate_subkeys(key_bytes):
    bits = permute(bytes_to_bits(key_bytes), PC1)
    C, D = bits[:28], bits[28:]
    subkeys = []
    for s in SHIFTS:
        C = C[s:] + C[:s]
        D = D[s:] + D[:s]
        subkeys.append(permute(C + D, PC2))
    return subkeys
def feistel_function(R, subkey):
    exp_R = permute(R, E)
    xored = [a ^ b for a, b in zip(exp_R, subkey)]
    output_bits = []
    for i in range(8):
        block = xored[i*6:(i+1)*6]
        row = (block[0] << 1) | block[5]
        col = (block[1] << 3) | (block[2] << 2) | (block[3] << 1) | block[4]
        val = S_BOXES[i][row][col]
        for j in range(3, -1, -1): output_bits.append((val >> j) & 1)
    return permute(output_bits, P)
def des_decrypt_block(block_bits, subkeys):
    permuted = permute(block_bits, IP)
    L, R = permuted[:32], permuted[32:]
    for subkey in reversed(subkeys):
        L_next = R
        f_res = feistel_function(R, subkey)
        R_next = [a ^ b for a, b in zip(L, f_res)]
        L, R = L_next, R_next
    return permute(R + L, FP)
def des_decrypt_ecb(encrypted_bytes, key_bytes=b'38346591'):
    try:
        subkeys = generate_subkeys(key_bytes)
        all_bits = bytes_to_bits(encrypted_bytes)
        dec_bits = []
        for i in range(0, len(all_bits), 64):
            dec_bits.extend(des_decrypt_block(all_bits[i:i+64], subkeys))
        dec_bytes = bits_to_bytes(dec_bits)
        pad_len = dec_bytes[-1]
        if 1 <= pad_len <= 8: dec_bytes = dec_bytes[:-pad_len]
        return dec_bytes.decode('utf-8', errors='ignore')
    except Exception: return ''

def fallback_music_search(query, limit=20):
    """Zero-quota fallback catalog powered by high-bitrate streaming"""
    try:
        url = (
            f"https://www.jiosaavn.com/api.php?__call=search.getResults"
            f"&_format=json&_marker=0&api_version=4&ctx=web6dot0"
            f"&q={urllib.parse.quote(query)}&n={min(limit, 25)}&p=1"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw_data = json.loads(resp.read().decode("utf-8"))
            results = raw_data.get("results", [])
            songs = []
            for item in results:
                title = html.unescape(item.get("title", ""))
                artists_arr = [a.get("name") for a in item.get("more_info", {}).get("artistMap", {}).get("primary_artists", [])]
                artist_name = ", ".join(artists_arr) if artists_arr else item.get("subtitle", "Artist")
                img = item.get("image", "").replace("150x150", "500x500")
                audio_url = ""
                enc = item.get("more_info", {}).get("encrypted_media_url")
                if enc:
                    try:
                        raw = des_decrypt_ecb(base64.b64decode(enc))
                        audio_url = raw.replace("http:", "https:").replace("_96.mp4", "_320.mp4")
                    except Exception:
                        pass

                songs.append({
                    "id": item.get("id"),
                    "title": title,
                    "artist": artist_name,
                    "channelTitle": artist_name,
                    "thumbnail": img or "assets/images/ember_banner.jpg",
                    "audioUrl": audio_url,
                    "duration": "03:30",
                    "durationSec": 210,
                    "category": "fallback_track"
                })

            top_res = {**songs[0], "isSong": True} if songs else None
            return {
                "success": True,
                "query": query,
                "filter": "all",
                "source": "fallback_catalog",
                "topResult": top_res,
                "songs": songs,
                "artists": [],
                "albums": [],
                "playlists": [],
                "results": songs
            }
    except Exception as err:
        print("[Ember Fallback Catalog Error]:", err)
        return {"success": False, "query": query, "songs": [], "results": []}


# ==============================================================================
# Ember Request Handler
# ==============================================================================
class EmberHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local and cross-origin tools
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # ----------------------------------------------------------------------
        # Route 1: /api/suggestions?q=query
        # Live Google YouTube Autocomplete suggestions
        # ----------------------------------------------------------------------
        if path == "/api/suggestions":
            query = params.get("q", [""])[0].strip()
            if not query:
                self.send_json({"success": True, "suggestions": []})
                return

            try:
                suggest_url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(query)}"
                req = urllib.request.Request(suggest_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    suggestions = raw_data[1] if len(raw_data) > 1 else []
                self.send_json({"success": True, "query": query, "suggestions": suggestions[:8]})
            except Exception as e:
                self.send_json({"success": False, "suggestions": [], "error": str(e)}, status=200)
            return

        # ----------------------------------------------------------------------
        # Route 2: /api/search?q=query&filter=all|songs|artists|albums|playlists&n=24
        # Multi-category YouTube Music Catalog Search
        # ----------------------------------------------------------------------
        if path == "/api/search":
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

            # Check zero-quota 12-hour search cache for instant repeat results
            cache_key = f"{query.lower()}::{search_filter}::{limit}::{page_token}"
            now = time.time()
            if not page_token and cache_key in SEARCH_CACHE:
                cached_time, cached_payload = SEARCH_CACHE[cache_key]
                if now - cached_time < CACHE_TTL:
                    print(f"[Ember Cache HIT] {cache_key}")
                    self.send_json(cached_payload)
                    return

            try:
                # Filter: songs
                if search_filter == "songs":
                    req_params = {
                        "part": "snippet",
                        "type": "video",
                        "videoCategoryId": "10",
                        "videoEmbeddable": "true",
                        "q": query,
                        "maxResults": min(limit, 50)
                    }
                    if page_token:
                        req_params["pageToken"] = page_token

                    raw = yt_fetch("search", req_params)
                    items = raw.get("items", [])
                    vids = [it["id"]["videoId"] for it in items if "videoId" in it.get("id", {})]
                    details_map = enrich_videos(vids)
                    tracks = [format_video_track(it, details_map) for it in items]
                    tracks = [t for t in tracks if t]

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "songs",
                        "results": tracks,
                        "nextPageToken": raw.get("nextPageToken", "")
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # Filter: artists
                elif search_filter == "artists":
                    req_params = {
                        "part": "snippet",
                        "type": "channel",
                        "q": query,
                        "maxResults": min(limit, 30)
                    }
                    if page_token:
                        req_params["pageToken"] = page_token

                    raw = yt_fetch("search", req_params)
                    items = raw.get("items", [])
                    artists = [format_artist_item(it) for it in items]
                    artists = [a for a in artists if a]

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "artists",
                        "results": artists,
                        "nextPageToken": raw.get("nextPageToken", "")
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # Filter: albums
                elif search_filter == "albums":
                    req_params = {
                        "part": "snippet",
                        "type": "playlist",
                        "q": f"{query} album",
                        "maxResults": min(limit, 30)
                    }
                    if page_token:
                        req_params["pageToken"] = page_token

                    raw = yt_fetch("search", req_params)
                    items = raw.get("items", [])
                    albums = [format_playlist_item(it, is_album=True) for it in items]
                    albums = [a for a in albums if a]

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "albums",
                        "results": albums,
                        "nextPageToken": raw.get("nextPageToken", "")
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # Filter: playlists
                elif search_filter == "playlists":
                    req_params = {
                        "part": "snippet",
                        "type": "playlist",
                        "q": f"{query} playlist",
                        "maxResults": min(limit, 30)
                    }
                    if page_token:
                        req_params["pageToken"] = page_token

                    raw = yt_fetch("search", req_params)
                    items = raw.get("items", [])
                    playlists = [format_playlist_item(it, is_album=False) for it in items]
                    playlists = [p for p in playlists if p]

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "playlists",
                        "results": playlists,
                        "nextPageToken": raw.get("nextPageToken", "")
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # Default: ALL Tab (Unified Multi-Category Overview in Parallel)
                else:
                    def _fetch_songs():
                        return yt_fetch("search", {
                            "part": "snippet",
                            "type": "video",
                            "videoCategoryId": "10",
                            "videoEmbeddable": "true",
                            "q": query,
                            "maxResults": 8
                        })

                    def _fetch_artists():
                        return yt_fetch("search", {
                            "part": "snippet",
                            "type": "channel",
                            "q": query,
                            "maxResults": 4
                        })

                    def _fetch_albums():
                        return yt_fetch("search", {
                            "part": "snippet",
                            "type": "playlist",
                            "q": f"{query} album",
                            "maxResults": 6
                        })

                    def _fetch_playlists():
                        return yt_fetch("search", {
                            "part": "snippet",
                            "type": "playlist",
                            "q": f"{query} playlist",
                            "maxResults": 6
                        })

                    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                        f_songs = executor.submit(_fetch_songs)
                        f_artists = executor.submit(_fetch_artists)
                        f_albums = executor.submit(_fetch_albums)
                        f_playlists = executor.submit(_fetch_playlists)

                        songs_raw = f_songs.result()
                        artists_raw = f_artists.result()
                        albums_raw = f_albums.result()
                        playlists_raw = f_playlists.result()

                    song_items = songs_raw.get("items", [])
                    vids = [it["id"]["videoId"] for it in song_items if "videoId" in it.get("id", {})]
                    details_map = enrich_videos(vids)
                    songs = [format_video_track(it, details_map) for it in song_items]
                    songs = [s for s in songs if s]

                    artist_items = artists_raw.get("items", [])
                    artists = [format_artist_item(it) for it in artist_items]
                    artists = [a for a in artists if a]

                    album_items = albums_raw.get("items", [])
                    albums = [format_playlist_item(it, is_album=True) for it in album_items]
                    albums = [al for al in albums if al]

                    playlist_items = playlists_raw.get("items", [])
                    playlists = [format_playlist_item(it, is_album=False) for it in playlist_items]
                    playlists = [pl for pl in playlists if pl]

                    # Identify Top Result
                    top_result = None
                    q_lower = query.lower()
                    # Check if query matches artist closely
                    if artists and (q_lower in artists[0]["title"].lower() or artists[0]["title"].lower() in q_lower):
                        top_result = {**artists[0], "isArtist": True}
                    elif songs:
                        top_result = {**songs[0], "isSong": True}

                    payload = {
                        "success": True,
                        "query": query,
                        "filter": "all",
                        "topResult": top_result,
                        "songs": songs,
                        "artists": artists,
                        "albums": albums,
                        "playlists": playlists,
                        "results": songs
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, payload)
                        print(f"[Ember Cache STORE] {cache_key}")
                    self.send_json(payload)
                    return

            except Exception as e:
                print(f"[Ember Search Error] {e} -> Failing over to zero-quota fallback catalog")
                fallback_res = fallback_music_search(query, limit)
                if fallback_res.get("songs"):
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, fallback_res)
                    self.send_json(fallback_res)
                    return
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 3: /api/playlist-items?id=playlistId&n=25
        # Fetch tracks inside any YouTube Music playlist or album
        # ----------------------------------------------------------------------
        if path == "/api/playlist-items":
            pid = params.get("id", [""])[0].strip()
            page_token = params.get("pageToken", [""])[0].strip()
            try:
                limit = int(params.get("n", ["30"])[0])
            except (ValueError, TypeError):
                limit = 30

            if not pid:
                self.send_json({"success": False, "results": [], "error": "Playlist ID required"})
                return

            try:
                req_params = {
                    "part": "snippet,contentDetails",
                    "playlistId": pid,
                    "maxResults": min(limit, 50)
                }
                if page_token:
                    req_params["pageToken"] = page_token

                raw = yt_fetch("playlistItems", req_params)
                items = raw.get("items", [])
                vids = []
                for it in items:
                    v_id = it.get("contentDetails", {}).get("videoId") or it.get("snippet", {}).get("resourceId", {}).get("videoId")
                    if v_id:
                        vids.append(v_id)

                details_map = enrich_videos(vids)
                tracks = []
                for it in items:
                    snip = it.get("snippet", {})
                    v_id = it.get("contentDetails", {}).get("videoId") or snip.get("resourceId", {}).get("videoId")
                    if not v_id:
                        continue
                    dtl = details_map.get(v_id, {})
                    tracks.append({
                        "id": v_id,
                        "title": clean_title(snip.get("title", "")),
                        "artist": snip.get("videoOwnerChannelTitle", snip.get("channelTitle", "Artist")),
                        "channelTitle": snip.get("videoOwnerChannelTitle", snip.get("channelTitle", "Artist")),
                        "duration": dtl.get("duration", "03:30"),
                        "durationSec": dtl.get("durationSec", 210),
                        "thumbnail": snip.get("thumbnails", {}).get("high", {}).get("url") or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
                        "viewCount": dtl.get("viewCount", ""),
                        "category": "playlist_track"
                    })

                self.send_json({
                    "success": True,
                    "playlistId": pid,
                    "results": tracks,
                    "nextPageToken": raw.get("nextPageToken", "")
                })
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 4: /api/artist-tracks?id=channelId&n=20
        # Fetch top music videos for an artist channel
        # ----------------------------------------------------------------------
        if path == "/api/artist-tracks":
            cid = params.get("id", [""])[0].strip()
            try:
                limit = int(params.get("n", ["20"])[0])
            except (ValueError, TypeError):
                limit = 20

            if not cid:
                self.send_json({"success": False, "results": [], "error": "Channel ID required"})
                return

            try:
                raw = yt_fetch("search", {
                    "part": "snippet",
                    "channelId": cid,
                    "type": "video",
                    "videoCategoryId": "10",
                    "videoEmbeddable": "true",
                    "maxResults": min(limit, 50)
                })
                items = raw.get("items", [])
                vids = [it["id"]["videoId"] for it in items if "videoId" in it.get("id", {})]
                details_map = enrich_videos(vids)
                tracks = [format_video_track(it, details_map) for it in items]
                tracks = [t for t in tracks if t]

                self.send_json({"success": True, "channelId": cid, "results": tracks})
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 5: /api/trending
        # Official YouTube Top Music Chart
        # ----------------------------------------------------------------------
        if path == "/api/trending":
            try:
                raw = yt_fetch("videos", {
                    "part": "snippet,contentDetails,statistics,status",
                    "chart": "mostPopular",
                    "videoCategoryId": "10",
                    "maxResults": 24
                })
                items = raw.get("items", [])
                tracks = []
                for it in items:
                    if it.get("status", {}).get("embeddable") is False:
                        continue
                    vid = it.get("id")
                    snip = it.get("snippet", {})
                    dur_txt, dur_sec = parse_iso_duration(it.get("contentDetails", {}).get("duration"))
                    tracks.append({
                        "id": vid,
                        "title": clean_title(snip.get("title", "")),
                        "artist": snip.get("channelTitle", "Artist"),
                        "channelTitle": snip.get("channelTitle", "Artist"),
                        "duration": dur_txt,
                        "durationSec": dur_sec,
                        "thumbnail": snip.get("thumbnails", {}).get("high", {}).get("url") or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                        "viewCount": format_count(it.get("statistics", {}).get("viewCount")),
                        "category": "trending",
                        "badge": "Hot"
                    })

                self.send_json({"success": True, "results": tracks})
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 6: /api/resolve?title=...&artist=...
        # ----------------------------------------------------------------------
        if path == "/api/resolve":
            title = params.get("title", [""])[0].strip()
            artist = params.get("artist", [""])[0].strip()
            query = f"{title} {artist}".strip()
            if not query:
                self.send_json({"success": False, "error": "Title required"}, status=400)
                return

            try:
                raw = yt_fetch("search", {
                    "part": "snippet",
                    "type": "video",
                    "videoCategoryId": "10",
                    "videoEmbeddable": "true",
                    "q": f"{query} audio topic",
                    "maxResults": 3
                })
                items = raw.get("items", [])
                if items:
                    vids = [it["id"]["videoId"] for it in items if "videoId" in it.get("id", {})]
                    details_map = enrich_videos(vids)
                    track = format_video_track(items[0], details_map)
                    self.send_json({"success": True, "track": track})
                else:
                    self.send_json({"success": False, "error": "No match found"}, status=404)
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, status=500)
            return

        # Default: Serve static files
        super().do_GET()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), EmberHTTPRequestHandler) as httpd:
        print("=" * 60)
        print("  EMBER MUSIC SERVER (YouTube Music Discovery Engine)")
        print(f"  URL: http://localhost:{PORT}")
        print("  Catalog: YouTube Data API v3 & Google Suggest")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")


if __name__ == "__main__":
    main()
