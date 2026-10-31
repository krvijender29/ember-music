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
import ssl
import threading

SSL_CTX = ssl._create_unverified_context()

SAAVN_API_BASE = "https://www.jiosaavn.com/api.php"

# Allowed Origin Patterns for CORS
CUSTOM_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGIN_PATTERNS = [
    re.compile(r"^https?://localhost(:\d+)?$"),
    re.compile(r"^https?://127\.0\.0\.1(:\d+)?$"),
    re.compile(r"^https?://0\.0\.0\.0(:\d+)?$"),
    re.compile(r"^https://[a-zA-Z0-9\-_]+\.vercel\.app$")
]

def is_allowed_origin(origin):
    if not origin:
        return True
    if origin in CUSTOM_ALLOWED_ORIGINS:
        return True
    return any(p.match(origin) for p in ALLOWED_ORIGIN_PATTERNS)

# Sliding Window Rate Limiter
RATE_LIMIT_MAX = int(os.environ.get("RATE_LIMIT_MAX", "100"))
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_STORE = {}
RATE_LIMIT_LOCK = threading.Lock()

def check_rate_limit(client_ip):
    now = time.time()
    with RATE_LIMIT_LOCK:
        timestamps = RATE_LIMIT_STORE.get(client_ip, [])
        timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
        if len(timestamps) >= RATE_LIMIT_MAX:
            RATE_LIMIT_STORE[client_ip] = timestamps
            retry_after = max(1, int(RATE_LIMIT_WINDOW - (now - timestamps[0])))
            return False, retry_after
        timestamps.append(now)
        RATE_LIMIT_STORE[client_ip] = timestamps
        return True, 0

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
# YouTube Music Innertube Engine (Zero Quota / No Google API Keys Required)
# Direct WEB_REMIX client for 100% Music Catalog (Indie, Underground, Unreleased,
# Live Concerts, Remixes, Lofi, Slowed+Reverb)
# ==============================================================================
YTM_SEARCH_URL = "https://music.youtube.com/youtubei/v1/search?alt=json"
YTM_BROWSE_URL = "https://music.youtube.com/youtubei/v1/browse?alt=json"
YTM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
    "X-YouTube-Client-Name": "67",
    "X-YouTube-Client-Version": "1.20240101.01.00",
    "Referer": "https://music.youtube.com/",
    "Origin": "https://music.youtube.com"
}
YTM_PARAMS = {
    "songs": "EgWKAQIIAWoSEAQQBRADEAkQChAVEA4QEBAR",
    "videos": "EgWKAQIQAWoSEAQQBRADEAkQChAVEA4QEBAR",
    "albums": "EgWKAQIYAWoSEAQQBRADEAkQChAVEA4QEBAR",
    "artists": "EgWKAQIgAWoSEAQQBRADEAkQChAVEA4QEBAR",
    "playlists": "EgeKAQQoAEABahIQBBAFEAMQCRAKEBUQDhAQEBE%3D",
}

def clean_yt_runs(runs):
    if not runs or not isinstance(runs, list):
        return ""
    return "".join(r.get("text", "") for r in runs if isinstance(r, dict))

def upgrade_yt_thumb(url):
    if not url:
        return "assets/images/ember_banner.jpg"
    if "=w120-h120" in url:
        return url.replace("=w120-h120", "=w540-h540")
    if "=s180" in url:
        return url.replace("=s180", "=s540")
    return url

def parse_ytmusic_item(item):
    if not isinstance(item, dict):
        return None
    flex_cols = item.get("flexColumns", [])
    if not flex_cols:
        return None

    col0_runs = flex_cols[0].get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [])
    title = clean_yt_runs(col0_runs).strip()
    if not title:
        return None

    artist = ""
    album = ""
    duration = "3:30"
    item_type = "song"
    if len(flex_cols) > 1:
        col1_runs = flex_cols[1].get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [])
        parts = [r.get("text", "").strip() for r in col1_runs if r.get("text", "").strip() and r.get("text", "").strip() != "•"]
        
        if parts:
            first_low = parts[0].lower()
            if first_low in ("artist",):
                item_type = "artist"
            elif first_low in ("album", "single", "ep"):
                item_type = "album"
            elif first_low in ("playlist",):
                item_type = "playlist"
            elif first_low in ("song", "video"):
                item_type = "song"

        clean_parts = [p for p in parts if p.lower() not in ("song", "video", "artist", "album", "single", "ep", "playlist")]
        if clean_parts:
            artist = clean_parts[0]
        if len(clean_parts) > 2:
            album = clean_parts[1]
            if ":" in clean_parts[-1]:
                duration = clean_parts[-1]
        elif len(clean_parts) == 2:
            if ":" in clean_parts[1]:
                duration = clean_parts[1]
            else:
                album = clean_parts[1]

    play_btn = item.get("overlay", {}).get("musicItemThumbnailOverlayRenderer", {}).get("content", {}).get("musicPlayButtonRenderer", {})
    watch_ep = play_btn.get("playNavigationEndpoint", {}).get("watchEndpoint", {})
    vid = watch_ep.get("videoId", "")
    if not vid:
        nav_ep = item.get("navigationEndpoint", {}).get("watchEndpoint", {})
        vid = nav_ep.get("videoId", "")
    if not vid and col0_runs:
        c0_ep = col0_runs[0].get("navigationEndpoint", {}).get("watchEndpoint", {})
        vid = c0_ep.get("videoId", "")

    nav_browse = item.get("navigationEndpoint", {}).get("browseEndpoint", {})
    browse_id = nav_browse.get("browseId", "")
    if not browse_id and col0_runs:
        browse_id = col0_runs[0].get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId", "")

    thumbs = item.get("thumbnail", {}).get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails", [])
    thumb_url = upgrade_yt_thumb(thumbs[-1]["url"]) if thumbs else (f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else "assets/images/ember_banner.jpg")

    dur_sec = 210
    if duration and ":" in duration:
        try:
            d_parts = duration.split(":")
            if len(d_parts) == 2:
                dur_sec = int(d_parts[0]) * 60 + int(d_parts[1])
            elif len(d_parts) == 3:
                dur_sec = int(d_parts[0]) * 3600 + int(d_parts[1]) * 60 + int(d_parts[2])
        except Exception:
            dur_sec = 210

    if item_type == "artist":
        return {
            "id": browse_id or f"yt_art_{title.lower().replace(' ', '_')}",
            "title": title,
            "subtitle": f"{artist or 'Artist'}",
            "thumbnail": thumb_url,
            "avatar": thumb_url,
            "role": "Artist",
            "source": "ytmusic",
            "isArtist": True,
            "type": "artist"
        }
    elif item_type == "album":
        return {
            "id": browse_id,
            "title": title,
            "subtitle": f"{artist or 'Album'} • {album}".strip(" •"),
            "thumbnail": thumb_url,
            "cover": thumb_url,
            "source": "ytmusic",
            "isAlbum": True,
            "type": "album"
        }
    elif item_type == "playlist":
        pl_clean = browse_id[2:] if browse_id.startswith("VL") else browse_id
        return {
            "id": pl_clean,
            "browseId": browse_id,
            "title": title,
            "subtitle": artist or "Playlist",
            "thumbnail": thumb_url,
            "cover": thumb_url,
            "source": "ytmusic",
            "isAlbum": False,
            "type": "playlist"
        }
    else:
        if not vid:
            return None
        return {
            "id": vid,
            "title": title,
            "artist": artist or "YouTube Music",
            "channelTitle": artist or "YouTube Music",
            "album": album or "YouTube Music",
            "thumbnail": thumb_url,
            "cover": thumb_url,
            "duration": duration,
            "durationSec": dur_sec,
            "source": "ytmusic",
            "isSong": True,
            "type": "song"
        }

def ytmusic_search(query, search_filter="all", limit=24):
    clean_q = (query or "").strip()
    if not clean_q:
        return {"songs": [], "artists": [], "albums": [], "playlists": [], "topResult": None, "results": []}

    f_key = (search_filter or "all").lower()
    param_val = YTM_PARAMS.get(f_key)

    payload = {
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240101.01.00",
                "hl": "en",
                "gl": "IN"
            }
        },
        "query": clean_q
    }
    if param_val:
        payload["params"] = param_val

    req = urllib.request.Request(
        YTM_SEARCH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=YTM_HEADERS
    )

    try:
        with urllib.request.urlopen(req, timeout=8, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[YTM Search Error] {e}")
        return {"songs": [], "artists": [], "albums": [], "playlists": [], "topResult": None, "results": []}

    contents = data.get("contents", {})
    tabs = contents.get("tabbedSearchResultsRenderer", {}).get("tabs", [])
    if not tabs:
        return {"songs": [], "artists": [], "albums": [], "playlists": [], "topResult": None, "results": []}

    section_list = tabs[0].get("tabRenderer", {}).get("content", {}).get("sectionListRenderer", {}).get("contents", [])
    
    songs = []
    artists = []
    albums = []
    playlists = []
    top_result = None

    for sec in section_list:
        if "musicCardShelfRenderer" in sec:
            card = sec["musicCardShelfRenderer"]
            c_title = clean_yt_runs(card.get("title", {}).get("runs", []))
            c_sub = clean_yt_runs(card.get("subtitle", {}).get("runs", []))
            c_thumbs = card.get("thumbnail", {}).get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails", [])
            c_thumb = upgrade_yt_thumb(c_thumbs[-1]["url"]) if c_thumbs else "assets/images/ember_banner.jpg"
            c_vid = card.get("onTap", {}).get("watchEndpoint", {}).get("videoId", "")
            
            is_artist = "artist" in c_sub.lower()
            if not top_result and c_title:
                if is_artist:
                    top_result = {
                        "id": f"yt_art_{c_title.lower().replace(' ', '_')}",
                        "title": c_title,
                        "subtitle": c_sub,
                        "thumbnail": c_thumb,
                        "avatar": c_thumb,
                        "isArtist": True,
                        "role": "Top Artist",
                        "type": "artist",
                        "source": "ytmusic"
                    }
                elif c_vid:
                    sub_parts = [p.strip() for p in c_sub.split("•") if p.strip()]
                    c_art = sub_parts[1] if len(sub_parts) > 1 else "YouTube Music"
                    top_result = {
                        "id": c_vid,
                        "title": c_title,
                        "artist": c_art,
                        "thumbnail": c_thumb,
                        "cover": c_thumb,
                        "isSong": True,
                        "type": "song",
                        "source": "ytmusic"
                    }
                    songs.append(top_result)

        elif "musicShelfRenderer" in sec:
            shelf = sec["musicShelfRenderer"]
            for it in shelf.get("contents", []):
                parsed = parse_ytmusic_item(it.get("musicResponsiveListItemRenderer"))
                if not parsed:
                    continue
                if parsed["type"] == "artist":
                    artists.append(parsed)
                elif parsed["type"] == "album":
                    albums.append(parsed)
                elif parsed["type"] == "playlist":
                    playlists.append(parsed)
                else:
                    songs.append(parsed)

        elif "itemSectionRenderer" in sec:
            for sub_it in sec["itemSectionRenderer"].get("contents", []):
                parsed = parse_ytmusic_item(sub_it.get("musicResponsiveListItemRenderer"))
                if not parsed:
                    continue
                if parsed["type"] == "artist":
                    artists.append(parsed)
                elif parsed["type"] == "album":
                    albums.append(parsed)
                elif parsed["type"] == "playlist":
                    playlists.append(parsed)
                else:
                    songs.append(parsed)

    results = []
    if f_key == "songs":
        results = songs[:limit]
    elif f_key == "artists":
        results = artists[:limit]
    elif f_key == "albums":
        results = albums[:limit]
    elif f_key == "playlists":
        results = playlists[:limit]
    else:
        results = songs[:limit]

    return {
        "success": True,
        "query": clean_q,
        "filter": f_key,
        "source": "ytmusic_innertube",
        "topResult": top_result or (songs[0] if songs else None),
        "songs": songs[:limit],
        "artists": artists[:min(limit, 10)],
        "albums": albums[:min(limit, 10)],
        "playlists": playlists[:min(limit, 10)],
        "results": results
    }

def ytmusic_browse(browse_id):
    clean_id = (browse_id or "").strip()
    if not clean_id:
        return []
    if clean_id.startswith("PL") or clean_id.startswith("RD"):
        clean_id = f"VL{clean_id}"
    payload = {
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240101.01.00",
                "hl": "en",
                "gl": "IN"
            }
        },
        "browseId": clean_id
    }
    req = urllib.request.Request(
        YTM_BROWSE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=YTM_HEADERS
    )
    try:
        with urllib.request.urlopen(req, timeout=9, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[YTM Browse Error] {e}")
        return []

    tracks = []
    def find_items(obj):
        if isinstance(obj, dict):
            if "musicResponsiveListItemRenderer" in obj:
                yield obj["musicResponsiveListItemRenderer"]
            for v in obj.values():
                yield from find_items(v)
        elif isinstance(obj, list):
            for it in obj:
                yield from find_items(it)

    for item in find_items(data):
        parsed = parse_ytmusic_item(item)
        if parsed and parsed.get("type") == "song" and parsed.get("id"):
            tracks.append(parsed)
    return tracks


# ==============================================================================
# Spotube & BlackHole Engine Helpers (iTunes / Apple Music + Spotify Importer)
# ==============================================================================
def itunes_search(query, entity="song", limit=20):
    try:
        params = {
            "term": query,
            "entity": entity,
            "limit": limit
        }
        url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            items = []
            for it in results:
                if entity == "song":
                    tid = f"itunes_{it.get('trackId')}"
                    title = it.get("trackName") or ""
                    artist = it.get("artistName") or ""
                    album = it.get("collectionName") or ""
                    art = (it.get("artworkUrl100") or "").replace("100x100bb.jpg", "600x600bb.jpg")
                    preview = it.get("previewUrl") or ""
                    dur_ms = it.get("trackTimeMillis") or 0
                    dur_sec = round(dur_ms / 1000) if dur_ms else 210
                    mins = dur_sec // 60
                    secs = dur_sec % 60
                    items.append({
                        "id": tid,
                        "title": title,
                        "artist": artist,
                        "album": album,
                        "thumbnail": art or "assets/images/ember_banner.jpg",
                        "cover": art or "assets/images/ember_banner.jpg",
                        "previewUrl": preview,
                        "duration": f"{mins}:{secs:02d}",
                        "source": "apple_music_itunes",
                        "isSong": True,
                        "type": "song"
                    })
                elif entity == "musicArtist":
                    aid = f"itunes_art_{it.get('artistId')}"
                    name = it.get("artistName") or ""
                    items.append({
                        "id": aid,
                        "title": name,
                        "thumbnail": "assets/images/ember_banner.jpg",
                        "avatar": "assets/images/ember_banner.jpg",
                        "role": it.get("primaryGenreName") or "Artist",
                        "source": "apple_music_itunes",
                        "type": "artist"
                    })
                elif entity == "album":
                    al_id = f"itunes_al_{it.get('collectionId')}"
                    title = it.get("collectionName") or ""
                    artist = it.get("artistName") or ""
                    art = (it.get("artworkUrl100") or "").replace("100x100bb.jpg", "600x600bb.jpg")
                    items.append({
                        "id": al_id,
                        "title": title,
                        "subtitle": artist,
                        "thumbnail": art or "assets/images/ember_banner.jpg",
                        "cover": art or "assets/images/ember_banner.jpg",
                        "source": "apple_music_itunes",
                        "isAlbum": True,
                        "type": "album"
                    })
            return items
    except Exception as e:
        print(f"[iTunes Search Error] {e}")
        return []


def fetch_top_charts(country="us", limit=50):
    try:
        url = f"https://itunes.apple.com/{country}/rss/topsongs/limit={limit}/json"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            entries = data.get("feed", {}).get("entry", [])
            tracks = []
            for idx, e in enumerate(entries):
                title = e.get("im:name", {}).get("label") or ""
                artist = e.get("im:artist", {}).get("label") or ""
                album = e.get("im:collection", {}).get("im:name", {}).get("label") or ""
                images = e.get("im:image", [])
                art = images[-1].get("label") if images else ""
                if art:
                    art = art.replace("170x170bb.png", "600x600bb.jpg").replace("170x170bb.jpg", "600x600bb.jpg")
                link = e.get("link", [])
                preview = ""
                if isinstance(link, list):
                    for l in link:
                        if l.get("im:contentType", {}).get("attributes", {}).get("term") == "Audio":
                            preview = l.get("attributes", {}).get("href")
                            break
                tracks.append({
                    "id": f"chart_{country}_{idx+1}",
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "thumbnail": art or "assets/images/ember_banner.jpg",
                    "cover": art or "assets/images/ember_banner.jpg",
                    "previewUrl": preview,
                    "rank": idx + 1,
                    "source": "apple_top_chart"
                })
            return tracks
    except Exception as e:
        print(f"[Top Charts Error] {e}")
        return []


def fetch_spotify_playlist(input_str):
    try:
        m = re.search(r'playlist[/:]+([a-zA-Z0-9]+)', input_str)
        pid = m.group(1) if m else input_str.strip()
        url = f"https://open.spotify.com/embed/playlist/{pid}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=8) as r:
            html_text = r.read().decode("utf-8")
            m_json = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html_text)
            if not m_json:
                return None
            data = json.loads(m_json.group(1))
            entity = data.get("props", {}).get("pageProps", {}).get("state", {}).get("data", {}).get("entity", {})
            title = entity.get("name") or "Imported Spotify Playlist"
            cover_sources = entity.get("coverArt", {}).get("sources", [])
            cover = cover_sources[-1].get("url") if cover_sources else ""
            raw_tracks = entity.get("trackList", [])
            tracks = []
            for idx, t in enumerate(raw_tracks):
                s_title = t.get("title") or ""
                s_artist = t.get("subtitle") or ""
                dur_ms = t.get("duration") or 0
                dur_sec = round(dur_ms / 1000) if dur_ms else 200
                mins = dur_sec // 60
                secs = dur_sec % 60
                tracks.append({
                    "id": f"sp_{t.get('id') or idx}",
                    "title": s_title,
                    "artist": s_artist,
                    "thumbnail": cover or "assets/images/ember_banner.jpg",
                    "cover": cover or "assets/images/ember_banner.jpg",
                    "duration": f"{mins}:{secs:02d}",
                    "source": "spotify_import"
                })
            return {
                "id": pid,
                "name": title,
                "title": title,
                "cover": cover,
                "trackCount": len(tracks),
                "tracks": tracks
            }
    except Exception as e:
        print(f"[Spotify Playlist Import Error] {e}")
        return None


# ==============================================================================
# Vercel Serverless Handler
# ==============================================================================
class handler(BaseHTTPRequestHandler):
    def end_headers(self):
        origin = self.headers.get("Origin")
        if is_allowed_origin(origin):
            self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Range, Authorization, X-Requested-With")
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Vary", "Origin")

        # Security Hardening Headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        params = urllib.parse.parse_qs(parsed.query)

        # Rate Limit check for /api/ routes
        if path.startswith("/api"):
            client_ip = self.headers.get("x-forwarded-for", "").split(",")[0].strip() or (self.client_address[0] if self.client_address else "127.0.0.1")
            allowed, retry_after = check_rate_limit(client_ip)
            if not allowed:
                body = json.dumps({
                    "success": False,
                    "error": "Rate limit exceeded. Too many requests. Please wait a moment.",
                    "retry_after": retry_after
                }).encode("utf-8")
                self.send_response(429)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Retry-After", str(retry_after))
                self.end_headers()
                self.wfile.write(body)
                return

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
        if path == "/api/search" or path == "/search":
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
                # 1. Filter: SONGS
                if search_filter == "songs":
                    def _fetch_saavn_songs():
                        try:
                            raw = saavn_get("search.getResults", {"q": query, "n": min(limit, 30), "p": 1})
                            return [clean_song_item(s) for s in raw.get("results", []) if clean_song_item(s).get("audioUrl")]
                        except Exception:
                            return []

                    def _fetch_yt_songs():
                        try:
                            yt_res = ytmusic_search(query, search_filter="songs", limit=min(limit, 30))
                            return yt_res.get("results", [])
                        except Exception:
                            return []

                    def _fetch_itunes_songs():
                        return itunes_search(query, entity="song", limit=min(limit, 15))

                    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                        f_s = executor.submit(_fetch_saavn_songs)
                        f_yt = executor.submit(_fetch_yt_songs)
                        f_it = executor.submit(_fetch_itunes_songs)
                        saavn_tracks = f_s.result()
                        yt_tracks = f_yt.result()
                        it_tracks = f_it.result()

                    seen_titles = set()
                    merged = []
                    
                    for st in saavn_tracks:
                        clean_t = st["title"].lower().strip()
                        if clean_t not in seen_titles:
                            seen_titles.add(clean_t)
                            merged.append(st)

                    for yt in yt_tracks:
                        clean_t = yt["title"].lower().strip()
                        if clean_t not in seen_titles:
                            seen_titles.add(clean_t)
                            merged.append(yt)

                    for it in it_tracks:
                        clean_t = it["title"].lower().strip()
                        if clean_t not in seen_titles:
                            seen_titles.add(clean_t)
                            merged.append(it)

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "songs",
                        "source": "ytmusic_saavn_hybrid",
                        "results": merged[:limit],
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # 2. Filter: ARTISTS
                elif search_filter == "artists":
                    def _fetch_saavn_artists():
                        try:
                            raw = saavn_get("search.getArtistResults", {"q": query, "n": min(limit, 20), "p": 1})
                            return [clean_artist_item(a) for a in raw.get("results", [])]
                        except Exception:
                            return []

                    def _fetch_yt_artists():
                        try:
                            yt_res = ytmusic_search(query, search_filter="artists", limit=min(limit, 20))
                            return yt_res.get("artists", []) or yt_res.get("results", [])
                        except Exception:
                            return []

                    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                        f_sa = executor.submit(_fetch_saavn_artists)
                        f_ya = executor.submit(_fetch_yt_artists)
                        saavn_artists = f_sa.result()
                        yt_artists = f_ya.result()

                    seen_artists = set()
                    merged_artists = []
                    for a in yt_artists + saavn_artists:
                        c_name = a["title"].lower().strip()
                        if c_name not in seen_artists:
                            seen_artists.add(c_name)
                            merged_artists.append(a)

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "artists",
                        "source": "ytmusic_saavn_hybrid",
                        "results": merged_artists[:limit],
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # 3. Filter: ALBUMS
                elif search_filter == "albums":
                    def _fetch_saavn_albums():
                        try:
                            raw = saavn_get("search.getAlbumResults", {"q": query, "n": min(limit, 20), "p": 1})
                            return [clean_album_item(al) for al in raw.get("results", [])]
                        except Exception:
                            return []

                    def _fetch_yt_albums():
                        try:
                            yt_res = ytmusic_search(query, search_filter="albums", limit=min(limit, 20))
                            return yt_res.get("albums", []) or yt_res.get("results", [])
                        except Exception:
                            return []

                    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                        f_sal = executor.submit(_fetch_saavn_albums)
                        f_yal = executor.submit(_fetch_yt_albums)
                        saavn_albums = f_sal.result()
                        yt_albums = f_yal.result()

                    seen_albums = set()
                    merged_albums = []
                    for al in yt_albums + saavn_albums:
                        c_title = al["title"].lower().strip()
                        if c_title not in seen_albums:
                            seen_albums.add(c_title)
                            merged_albums.append(al)

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "albums",
                        "source": "ytmusic_saavn_hybrid",
                        "results": merged_albums[:limit],
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # 4. Filter: PLAYLISTS
                elif search_filter == "playlists":
                    def _fetch_saavn_playlists():
                        try:
                            raw = saavn_get("search.getPlaylistResults", {"q": query, "n": min(limit, 20), "p": 1})
                            return [clean_playlist_item(pl) for pl in raw.get("results", [])]
                        except Exception:
                            return []

                    def _fetch_yt_playlists():
                        try:
                            yt_res = ytmusic_search(query, search_filter="playlists", limit=min(limit, 20))
                            return yt_res.get("playlists", []) or yt_res.get("results", [])
                        except Exception:
                            return []

                    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                        f_spl = executor.submit(_fetch_saavn_playlists)
                        f_ypl = executor.submit(_fetch_yt_playlists)
                        saavn_playlists = f_spl.result()
                        yt_playlists = f_ypl.result()

                    seen_pl = set()
                    merged_pl = []
                    for pl in yt_playlists + saavn_playlists:
                        c_title = pl["title"].lower().strip()
                        if c_title not in seen_pl:
                            seen_pl.add(c_title)
                            merged_pl.append(pl)

                    resp_data = {
                        "success": True,
                        "query": query,
                        "filter": "playlists",
                        "source": "ytmusic_saavn_hybrid",
                        "results": merged_pl[:limit],
                        "nextPageToken": ""
                    }
                    if not page_token:
                        SEARCH_CACHE[cache_key] = (now, resp_data)
                    self.send_json(resp_data)
                    return

                # 5. Default: ALL TAB (Concurrent Parallel Fetching - YouTube Music + JioSaavn Hybrid)
                else:
                    def _fetch_yt_all():
                        try:
                            return ytmusic_search(query, search_filter="all", limit=limit)
                        except Exception:
                            return {}

                    def _fetch_saavn_songs():
                        try:
                            raw = saavn_get("search.getResults", {"q": query, "n": 10, "p": 1})
                            return [clean_song_item(s) for s in raw.get("results", []) if clean_song_item(s).get("audioUrl")]
                        except Exception:
                            return []

                    def _fetch_saavn_artists():
                        try:
                            raw = saavn_get("search.getArtistResults", {"q": query, "n": 6, "p": 1})
                            return [clean_artist_item(a) for a in raw.get("results", [])]
                        except Exception:
                            return []

                    def _fetch_saavn_albums():
                        try:
                            raw = saavn_get("search.getAlbumResults", {"q": query, "n": 6, "p": 1})
                            return [clean_album_item(al) for al in raw.get("results", [])]
                        except Exception:
                            return []

                    def _fetch_saavn_playlists():
                        try:
                            raw = saavn_get("search.getPlaylistResults", {"q": query, "n": 6, "p": 1})
                            return [clean_playlist_item(pl) for pl in raw.get("results", [])]
                        except Exception:
                            return []

                    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                        f_yt = executor.submit(_fetch_yt_all)
                        f_ss = executor.submit(_fetch_saavn_songs)
                        f_sa = executor.submit(_fetch_saavn_artists)
                        f_sal = executor.submit(_fetch_saavn_albums)
                        f_spl = executor.submit(_fetch_saavn_playlists)

                        yt_all = f_yt.result()
                        saavn_songs = f_ss.result()
                        saavn_artists = f_sa.result()
                        saavn_albums = f_sal.result()
                        saavn_playlists = f_spl.result()

                    seen_titles = set()
                    songs = []
                    for s in saavn_songs:
                        c_t = s["title"].lower().strip()
                        if c_t not in seen_titles:
                            seen_titles.add(c_t)
                            songs.append(s)

                    for yt_s in yt_all.get("songs", []):
                        c_t = yt_s["title"].lower().strip()
                        if c_t not in seen_titles:
                            seen_titles.add(c_t)
                            songs.append(yt_s)

                    seen_art = set()
                    artists = []
                    for a in (yt_all.get("artists", []) + saavn_artists):
                        c_a = a["title"].lower().strip()
                        if c_a not in seen_art:
                            seen_art.add(c_a)
                            artists.append(a)

                    seen_alb = set()
                    albums = []
                    for al in (yt_all.get("albums", []) + saavn_albums):
                        c_al = al["title"].lower().strip()
                        if c_al not in seen_alb:
                            seen_alb.add(c_al)
                            albums.append(al)

                    seen_pls = set()
                    playlists = []
                    for pl in (yt_all.get("playlists", []) + saavn_playlists):
                        c_pl = pl["title"].lower().strip()
                        if c_pl not in seen_pls:
                            seen_pls.add(c_pl)
                            playlists.append(pl)

                    top_result = yt_all.get("topResult")
                    q_lower = query.lower()
                    if not top_result:
                        if artists and (q_lower in artists[0]["title"].lower() or artists[0]["title"].lower() in q_lower):
                            top_result = {**artists[0], "isArtist": True}
                        elif songs:
                            top_result = {**songs[0], "isSong": True}

                    payload = {
                        "success": True,
                        "query": query,
                        "filter": "all",
                        "source": "ytmusic_saavn_hybrid",
                        "topResult": top_result,
                        "songs": songs[:limit],
                        "artists": artists[:min(limit, 10)],
                        "albums": albums[:min(limit, 10)],
                        "playlists": playlists[:min(limit, 10)],
                        "results": songs[:limit]
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
        # Load all tracks from YouTube Music or JioSaavn album/playlist
        # ----------------------------------------------------------------------
        if path == "/api/playlist-items" or path.endswith("/playlist-items"):
            pid = params.get("id", [""])[0].strip()
            if not pid:
                self.send_json({"success": False, "results": [], "error": "Playlist ID required"})
                return

            try:
                if pid.startswith("MPRE") or pid.startswith("PL") or pid.startswith("VL") or pid.startswith("RD"):
                    yt_tracks = ytmusic_browse(pid)
                    if yt_tracks:
                        self.send_json({"success": True, "source": "ytmusic", "playlistId": pid, "results": yt_tracks})
                        return

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

                if not songs:
                    songs = ytmusic_browse(pid)

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
                if cid.startswith("UC") or cid.startswith("FE") or cid.startswith("yt_art"):
                    clean_name = cid.replace("yt_art_", "").replace("_", " ")
                    yt_res = ytmusic_search(f"{clean_name} songs", search_filter="songs", limit=25)
                    yt_tracks = yt_res.get("results", [])
                    if yt_tracks:
                        self.send_json({"success": True, "source": "ytmusic", "artistId": cid, "results": yt_tracks})
                        return

                data = saavn_get("artist.getArtistPageDetails", {"artistId": cid, "n_song": 25})
                raw_songs = data.get("topSongs", [])
                tracks = [clean_song_item(s) for s in raw_songs if clean_song_item(s).get("audioUrl")]
                if tracks:
                    self.send_json({"success": True, "artistId": cid, "results": tracks})
                    return

                raw = saavn_get("search.getResults", {"q": cid, "n": 20, "p": 1})
                tracks = [clean_song_item(s) for s in raw.get("results", []) if clean_song_item(s).get("audioUrl")]
                if not tracks:
                    yt_res = ytmusic_search(f"{cid} songs", search_filter="songs", limit=20)
                    tracks = yt_res.get("results", [])
                self.send_json({"success": True, "artistId": cid, "results": tracks})
            except Exception as ex:
                self.send_json({"success": False, "results": [], "error": str(ex)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 5: /api/trending
        # Top Charts & Trending Hits (Direct 320kbps Streams)
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
        # Spotube Audio Matcher: Resolves metadata to 320kbps Akamai CDN stream
        # with YouTube Music Innertube zero-fail fallback
        # ----------------------------------------------------------------------
        if path == "/api/resolve" or path.endswith("/resolve"):
            title = params.get("title", [""])[0].strip()
            artist = params.get("artist", [""])[0].strip()
            query = f"{title} {artist}".strip()
            if not query:
                self.send_json({"success": False, "error": "Title required"}, status=400)
                return

            try:
                raw = saavn_get("search.getResults", {"q": query, "n": 6, "p": 1})
                tracks = [clean_song_item(s) for s in raw.get("results", []) if clean_song_item(s).get("audioUrl")]
                if tracks:
                    self.send_json({"success": True, "source": "saavn_320kbps", "track": tracks[0]})
                    return

                if artist:
                    raw_title = saavn_get("search.getResults", {"q": title, "n": 4, "p": 1})
                    t_tracks = [clean_song_item(s) for s in raw_title.get("results", []) if clean_song_item(s).get("audioUrl")]
                    if t_tracks:
                        self.send_json({"success": True, "source": "saavn_320kbps", "track": t_tracks[0]})
                        return

                yt_res = ytmusic_search(query, search_filter="songs", limit=3)
                if yt_res.get("results"):
                    self.send_json({"success": True, "source": "ytmusic", "track": yt_res["results"][0]})
                    return

                self.send_json({"success": False, "error": "No match found"}, status=404)
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 7: /api/charts?country=us|in&n=50
        # Apple Music Real-Time Official Top Charts
        # ----------------------------------------------------------------------
        if path == "/api/charts" or path.endswith("/charts"):
            country = params.get("country", ["us"])[0].lower().strip() or "us"
            try:
                limit_n = int(params.get("n", ["50"])[0])
            except (ValueError, TypeError):
                limit_n = 50
            charts = fetch_top_charts(country=country, limit=limit_n)
            self.send_json({"success": True, "country": country, "results": charts})
            return

        # ----------------------------------------------------------------------
        # Route 8: /api/spotify-import?url=...
        # Spotube/BlackHole Spotify Playlist Extractor
        # ----------------------------------------------------------------------
        if path == "/api/spotify-import" or path.endswith("/spotify-import"):
            sp_url = params.get("url", [""])[0].strip() or params.get("id", [""])[0].strip()
            if not sp_url:
                self.send_json({"success": False, "error": "Spotify playlist URL or ID required"}, status=400)
                return
            playlist_data = fetch_spotify_playlist(sp_url)
            if playlist_data:
                self.send_json({"success": True, "playlist": playlist_data, "results": playlist_data.get("tracks", [])})
            else:
                self.send_json({"success": False, "error": "Failed to parse Spotify playlist. Ensure it is public."}, status=404)
            return

        # ----------------------------------------------------------------------
        # Route 9: /api/youtube/search?q=query&type=video|playlist&pageToken=...
        # Zero-Quota YouTube Music Innertube Search (Standard Library - No API Keys)
        # ----------------------------------------------------------------------
        if path == "/api/youtube/search" or path.endswith("/youtube/search"):
            query = params.get("q", [""])[0].strip()
            item_type = params.get("type", ["video"])[0].strip()
            page_token = params.get("pageToken", [""])[0].strip()

            if not query:
                self.send_json({"success": False, "items": [], "error": "Query required"})
                return

            yt_cache_key = f"yt::search::{query.lower()}::{item_type}::{page_token}"
            if yt_cache_key in SEARCH_CACHE and not page_token:
                c_time, c_data = SEARCH_CACHE[yt_cache_key]
                if time.time() - c_time < 3600:
                    self.send_json(c_data)
                    return

            try:
                filter_map = {
                    "video": "videos",
                    "song": "songs",
                    "playlist": "playlists",
                    "channel": "artists"
                }
                ytm_f = filter_map.get(item_type, "videos")
                yt_res = ytmusic_search(query, search_filter=ytm_f, limit=25)

                items = []
                if item_type in ("video", "song"):
                    for s in yt_res.get("results", []):
                        items.append({
                            "id": {"kind": "youtube#video", "videoId": s["id"]},
                            "snippet": {
                                "title": s["title"],
                                "channelTitle": s.get("artist", "YouTube Music"),
                                "thumbnails": {"high": {"url": s.get("thumbnail", "")}}
                            }
                        })
                elif item_type == "playlist":
                    for p in yt_res.get("playlists", []) or yt_res.get("results", []):
                        items.append({
                            "id": {"kind": "youtube#playlist", "playlistId": p["id"]},
                            "snippet": {
                                "title": p["title"],
                                "channelTitle": p.get("subtitle", "Playlist"),
                                "thumbnails": {"high": {"url": p.get("thumbnail", "")}}
                            }
                        })
                elif item_type == "channel":
                    for a in yt_res.get("artists", []) or yt_res.get("results", []):
                        items.append({
                            "id": {"kind": "youtube#channel", "channelId": a["id"]},
                            "snippet": {
                                "title": a["title"],
                                "channelTitle": a["title"],
                                "thumbnails": {"high": {"url": a.get("thumbnail", "")}}
                            }
                        })

                result = {
                    "success": True,
                    "nextPageToken": "",
                    "items": items,
                    "results": yt_res.get("results", [])
                }
                SEARCH_CACHE[yt_cache_key] = (time.time(), result)
                self.send_json(result)
            except Exception as e:
                self.send_json({"success": False, "items": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 10: /api/youtube/playlist?id=playlistId
        # Zero-Quota YouTube Music Playlist Items Extractor (No API Keys)
        # ----------------------------------------------------------------------
        if path == "/api/youtube/playlist" or path.endswith("/youtube/playlist"):
            pl_id = params.get("id", [""])[0].strip()
            page_token = params.get("pageToken", [""])[0].strip()

            if not pl_id:
                self.send_json({"success": False, "items": [], "error": "Playlist ID required"})
                return

            pl_cache_key = f"yt::pl::{pl_id}::{page_token}"
            if pl_cache_key in SEARCH_CACHE:
                c_time, c_data = SEARCH_CACHE[pl_cache_key]
                if time.time() - c_time < 3600:
                    self.send_json(c_data)
                    return

            try:
                tracks = ytmusic_browse(pl_id)
                items = []
                for t in tracks:
                    items.append({
                        "contentDetails": {"videoId": t["id"]},
                        "snippet": {
                            "title": t["title"],
                            "videoOwnerChannelTitle": t.get("artist", "YouTube Music"),
                            "channelTitle": t.get("artist", "YouTube Music"),
                            "resourceId": {"videoId": t["id"]},
                            "thumbnails": {"high": {"url": t.get("thumbnail", "")}}
                        }
                    })

                result = {
                    "success": True,
                    "nextPageToken": "",
                    "items": items,
                    "results": tracks
                }
                SEARCH_CACHE[pl_cache_key] = (time.time(), result)
                self.send_json(result)
            except Exception as e:
                self.send_json({"success": False, "items": [], "error": str(e)}, status=500)
            return

        # Default info
        self.send_json({
            "status": "online",
            "service": "Ember Direct CDN Music Discovery API",
            "engine": "JioSaavn 320kbps Akamai CDN & Spotube Hybrid Engine",
            "endpoints": [
                "/api/search?q={query}&filter={all|songs|artists|albums|playlists}",
                "/api/suggestions?q={query}",
                "/api/playlist-items?id={playlistId}",
                "/api/artist-tracks?id={channelId}",
                "/api/trending",
                "/api/resolve?title={title}&artist={artist}",
                "/api/charts?country={us|in}",
                "/api/spotify-import?url={spotifyPlaylistUrl}"
            ]
        })

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
