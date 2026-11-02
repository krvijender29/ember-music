#!/usr/bin/env python3
"""
EMBER - High-Speed Music Server (YouTube Music Innertube Engine)
Lightweight Python server (Standard Library Only - Zero Dependencies)
Provides static asset serving, zero-quota multi-category search,
live YouTube Music autocomplete suggestions, and full music catalog streaming.
Zero Google Cloud API Keys Required / Zero Quota Limits.
"""

import http.server
import socketserver
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

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ==============================================================================
# Environment & Security Configuration
# ==============================================================================
def load_dotenv():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"[Env] Warning reading .env: {e}")

load_dotenv()

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 4321))

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

# Sliding Window Rate Limiter (Default: 100 requests per 60s per IP for /api/ routes)
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

# In-memory search cache (12-hour TTL) for instant response (< 10ms)
SEARCH_CACHE = {}
CACHE_TTL = 12 * 3600

def format_duration(seconds):
    try:
        sec = int(seconds)
        m = sec // 60
        s = sec % 60
        return (f"{m:02d}:{s:02d}", sec)
    except (ValueError, TypeError):
        return ("03:30", 210)


# ==============================================================================
# YouTube Music Innertube Engine (Zero Quota / No Google API Keys Required)
# Direct WEB_REMIX client for 100% Music Catalog (Indie, Underground, Unreleased,
# Live Concerts, Remixes, Lofi, Slowed+Reverb)
# ==============================================================================
YTM_SEARCH_URL = "https://music.youtube.com/youtubei/v1/search?alt=json"
YTM_BROWSE_URL = "https://music.youtube.com/youtubei/v1/browse?alt=json"
YTM_SUGGEST_URL = "https://music.youtube.com/youtubei/v1/music/get_search_suggestions?alt=json"
YTM_NEXT_URL = "https://music.youtube.com/youtubei/v1/next?alt=json"
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

def ytmusic_suggestions(query):
    clean_q = (query or "").strip()
    if not clean_q:
        return []

    payload = {
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240101.01.00",
                "hl": "en",
                "gl": "IN"
            }
        },
        "input": clean_q
    }
    req = urllib.request.Request(
        YTM_SUGGEST_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=YTM_HEADERS
    )
    suggs = []
    try:
        with urllib.request.urlopen(req, timeout=4, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            contents = data.get("contents", [])
            if contents:
                sec = contents[0].get("searchSuggestionsSectionRenderer", {})
                for item in sec.get("contents", []):
                    r = item.get("searchSuggestionRenderer", {})
                    runs = r.get("suggestion", {}).get("runs", [])
                    txt = "".join(x.get("text", "") for x in runs).strip()
                    if txt and txt not in suggs:
                        suggs.append(txt)
    except Exception as e:
        print(f"[YTM Suggest Error] {e}")

    # Fallback to Google YouTube suggestions if YTM is empty
    if not suggs:
        try:
            g_url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(clean_q)}"
            g_req = urllib.request.Request(g_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(g_req, timeout=3, context=SSL_CTX) as g_resp:
                g_data = json.loads(g_resp.read().decode("utf-8"))
                if len(g_data) > 1 and isinstance(g_data[1], list):
                    suggs = g_data[1]
        except Exception:
            pass

    return suggs[:10]

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

def ytmusic_recommendations(video_id, limit=25):
    """
    YouTube Music Automix / Radio Recommendation Engine
    Uses YouTube Music's proprietary RDAMVM automix playlist to fetch
    acoustically and algorithmically matched songs based on the seed track.
    """
    clean_vid = (video_id or "").strip()
    if not clean_vid:
        return []

    cache_key = f"rec::{clean_vid}::{limit}"
    now = time.time()
    if cache_key in SEARCH_CACHE:
        c_time, c_data = SEARCH_CACHE[cache_key]
        if now - c_time < 3600:
            return c_data

    payload = {
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240101.01.00",
                "hl": "en",
                "gl": "IN"
            }
        },
        "videoId": clean_vid,
        "playlistId": f"RDAMVM{clean_vid}",
        "isAudioOnly": True
    }

    req = urllib.request.Request(
        YTM_NEXT_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=YTM_HEADERS
    )

    tracks = []
    try:
        with urllib.request.urlopen(req, timeout=9, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        tabs = data.get("contents", {}).get("singleColumnMusicWatchNextResultsRenderer", {}).get("tabbedRenderer", {}).get("watchNextTabbedResultsRenderer", {}).get("tabs", [])
        if tabs:
            tab0 = tabs[0].get("tabRenderer", {})
            pl_panel = tab0.get("content", {}).get("musicQueueRenderer", {}).get("content", {}).get("playlistPanelRenderer", {})
            items = pl_panel.get("contents", [])

            seen = {clean_vid}

            for item in items:
                panel_item = item.get("playlistPanelVideoRenderer")
                if not panel_item:
                    continue
                vid = panel_item.get("videoId")
                if not vid or vid in seen:
                    continue
                seen.add(vid)

                title = clean_yt_runs(panel_item.get("title", {}).get("runs", [])).strip()
                if not title:
                    continue

                byline_runs = panel_item.get("longBylineText", {}).get("runs", [])
                byline_text = clean_yt_runs(byline_runs).strip()
                byline_parts = [p.strip() for p in byline_text.split("•") if p.strip()]
                artist = byline_parts[0] if byline_parts else "YouTube Music"
                album = byline_parts[1] if len(byline_parts) > 1 else "YouTube Music"

                dur_text = clean_yt_runs(panel_item.get("lengthText", {}).get("runs", [])).strip() or "3:30"
                dur_sec = 210
                if dur_text and ":" in dur_text:
                    try:
                        parts = dur_text.split(":")
                        if len(parts) == 2:
                            dur_sec = int(parts[0]) * 60 + int(parts[1])
                        elif len(parts) == 3:
                            dur_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    except Exception:
                        dur_sec = 210

                thumbs = panel_item.get("thumbnail", {}).get("thumbnails", [])
                thumb_url = upgrade_yt_thumb(thumbs[-1]["url"]) if thumbs else f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"

                tracks.append({
                    "id": vid,
                    "title": title,
                    "artist": artist,
                    "channelTitle": artist,
                    "album": album,
                    "thumbnail": thumb_url,
                    "cover": thumb_url,
                    "duration": dur_text,
                    "durationSec": dur_sec,
                    "source": "ytmusic_recommendation",
                    "isSong": True,
                    "type": "song"
                })
                if len(tracks) >= limit:
                    break
    except Exception as e:
        print(f"[YTM Rec Error] {e}")

    SEARCH_CACHE[cache_key] = (now, tracks)
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
# Ember Request Handler
# ==============================================================================
class EmberHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

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
            client_ip = self.client_address[0] if self.client_address else "127.0.0.1"
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
        # Live Autocomplete suggestions powered by YouTube Music Innertube
        # ----------------------------------------------------------------------
        if path == "/api/suggestions" or path.endswith("/suggestions"):
            query = params.get("q", [""])[0].strip()
            if not query:
                self.send_json({"success": True, "suggestions": []})
                return

            try:
                suggestions = ytmusic_suggestions(query)
                self.send_json({"success": True, "query": query, "suggestions": suggestions[:8]})
            except Exception as e:
                self.send_json({"success": False, "suggestions": [], "error": str(e)}, status=200)
            return

        # ----------------------------------------------------------------------
        # Route 2: /api/search?q=query&filter=all|songs|artists|albums|playlists&n=24
        # Multi-category Search: 100% YouTube Music Innertube
        # Zero Quota / Unlimited / 100% Music Catalog (Indie, Underground, Remixes, Unreleased)
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

            # Check in-memory 12-hour cache
            cache_key = f"{query.lower()}::{search_filter}::{limit}::{page_token}"
            now = time.time()
            if not page_token and cache_key in SEARCH_CACHE:
                cached_time, cached_payload = SEARCH_CACHE[cache_key]
                if now - cached_time < CACHE_TTL:
                    self.send_json(cached_payload)
                    return

            try:
                yt_res = ytmusic_search(query, search_filter=search_filter, limit=limit)
                resp_data = {
                    "success": True,
                    "query": query,
                    "filter": search_filter,
                    "source": "ytmusic_innertube",
                    "topResult": yt_res.get("topResult"),
                    "songs": yt_res.get("songs", []),
                    "artists": yt_res.get("artists", []),
                    "albums": yt_res.get("albums", []),
                    "playlists": yt_res.get("playlists", []),
                    "results": yt_res.get("results", []),
                    "nextPageToken": ""
                }
                if not page_token:
                    SEARCH_CACHE[cache_key] = (now, resp_data)
                self.send_json(resp_data)
                return
            except Exception as e:
                print(f"[Ember Search Error] {e}")
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 3: /api/playlist-items?id=playlistId&n=30
        # Load all tracks from YouTube Music album/playlist
        # ----------------------------------------------------------------------
        if path == "/api/playlist-items" or path.endswith("/playlist-items"):
            pid = params.get("id", [""])[0].strip()
            if not pid:
                self.send_json({"success": False, "results": [], "error": "Playlist ID required"})
                return

            try:
                yt_tracks = ytmusic_browse(pid)
                self.send_json({
                    "success": True,
                    "source": "ytmusic",
                    "playlistId": pid,
                    "results": yt_tracks,
                    "nextPageToken": ""
                })
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 4: /api/artist-tracks?id=channelId&n=20
        # Load tracks by Artist via YouTube Music
        # ----------------------------------------------------------------------
        if path == "/api/artist-tracks" or path.endswith("/artist-tracks"):
            cid = params.get("id", [""])[0].strip()
            try:
                clean_name = cid.replace("yt_art_", "").replace("_", " ")
                yt_res = ytmusic_search(f"{clean_name} songs", search_filter="songs", limit=25)
                tracks = yt_res.get("results", []) or yt_res.get("songs", [])
                self.send_json({"success": True, "source": "ytmusic", "artistId": cid, "results": tracks})
            except Exception as ex:
                self.send_json({"success": False, "results": [], "error": str(ex)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 5: /api/trending
        # Top Charts & Trending Hits from YouTube Music
        # ----------------------------------------------------------------------
        if path == "/api/trending" or path.endswith("/trending"):
            try:
                yt_res = ytmusic_search("top hits trending songs", search_filter="songs", limit=24)
                tracks = yt_res.get("results", []) or yt_res.get("songs", [])
                self.send_json({"success": True, "source": "ytmusic", "results": tracks})
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 6: /api/resolve?title=...&artist=...
        # Spotube Audio Matcher: Resolves metadata to official YouTube Music videoId
        # ----------------------------------------------------------------------
        if path == "/api/resolve" or path.endswith("/resolve"):
            title = params.get("title", [""])[0].strip()
            artist = params.get("artist", [""])[0].strip()
            query = f"{title} {artist}".strip()
            if not query:
                self.send_json({"success": False, "error": "Title required"}, status=400)
                return

            try:
                yt_res = ytmusic_search(query, search_filter="songs", limit=5)
                results = yt_res.get("results") or yt_res.get("songs") or []
                if results:
                    self.send_json({"success": True, "source": "ytmusic", "track": results[0]})
                    return

                if artist:
                    yt_res_title = ytmusic_search(title, search_filter="songs", limit=3)
                    r_title = yt_res_title.get("results") or yt_res_title.get("songs") or []
                    if r_title:
                        self.send_json({"success": True, "source": "ytmusic", "track": r_title[0]})
                        return

                self.send_json({"success": False, "error": "No match found"}, status=404)
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, status=500)
            return

        # ----------------------------------------------------------------------
        # Route 6B: /api/recommendations?videoId=...&n=20 (or /api/radio)
        # YouTube Music Native Up Next & Automix AI Recommendation Algorithm
        # ----------------------------------------------------------------------
        if path in ("/api/recommendations", "/api/radio") or path.endswith("/recommendations") or path.endswith("/radio"):
            vid = params.get("videoId", [""])[0].strip() or params.get("id", [""])[0].strip()
            if not vid:
                self.send_json({"success": False, "results": [], "error": "videoId required"}, status=400)
                return

            try:
                limit = int(params.get("n", ["20"])[0])
            except (ValueError, TypeError):
                limit = 20

            try:
                recs = ytmusic_recommendations(vid, limit=limit)
                self.send_json({
                    "success": True,
                    "videoId": vid,
                    "source": "ytmusic_automix",
                    "results": recs
                })
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
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
        print("  EMBER MUSIC SERVER (YouTube Music Innertube Engine)")
        print(f"  URL: http://localhost:{PORT}")
        print("  Zero Quota Limits / 100% YouTube Music Catalog")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")


if __name__ == "__main__":
    main()
