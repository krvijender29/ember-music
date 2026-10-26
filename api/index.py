#!/usr/bin/env python3
"""
EMBER Music - Vercel Serverless Function & YouTube Music Discovery API
Pure Python (Standard Library Only - Zero Dependencies)
Handles /api/search, /api/suggestions, /api/playlist-items, /api/artist-tracks, /api/trending, and /api/resolve
"""

from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import re
import os
import concurrent.futures

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "AIzaSyDUnACXuxfMyOy3OrCgRSgm3eTmsEFY9xw")
YT_BASE_URL = "https://www.googleapis.com/youtube/v3"


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
    params_copy["key"] = YOUTUBE_API_KEY
    url = f"{YT_BASE_URL}/{endpoint}?" + urllib.parse.urlencode(params_copy)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=9) as resp:
        return json.loads(resp.read().decode("utf-8"))


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
# Vercel Serverless Function Handler
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

        # Route: /api/suggestions
        if path.endswith('/suggestions'):
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
                self.send_json({"success": False, "suggestions": [], "error": str(e)})
            return

        # Route: /api/search
        if path.endswith('/search'):
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

            try:
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

                    self.send_json({
                        "success": True,
                        "query": query,
                        "filter": "songs",
                        "results": tracks,
                        "nextPageToken": raw.get("nextPageToken", "")
                    })
                    return

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

                    self.send_json({
                        "success": True,
                        "query": query,
                        "filter": "artists",
                        "results": artists,
                        "nextPageToken": raw.get("nextPageToken", "")
                    })
                    return

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

                    self.send_json({
                        "success": True,
                        "query": query,
                        "filter": "albums",
                        "results": albums,
                        "nextPageToken": raw.get("nextPageToken", "")
                    })
                    return

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

                    self.send_json({
                        "success": True,
                        "query": query,
                        "filter": "playlists",
                        "results": playlists,
                        "nextPageToken": raw.get("nextPageToken", "")
                    })
                    return

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

                    artists = [format_artist_item(it) for it in artists_raw.get("items", [])]
                    artists = [a for a in artists if a]

                    albums = [format_playlist_item(it, is_album=True) for it in albums_raw.get("items", [])]
                    albums = [al for al in albums if al]

                    playlists = [format_playlist_item(it, is_album=False) for it in playlists_raw.get("items", [])]
                    playlists = [pl for pl in playlists if pl]

                    top_result = None
                    q_lower = query.lower()
                    if artists and (q_lower in artists[0]["title"].lower() or artists[0]["title"].lower() in q_lower):
                        top_result = {**artists[0], "isArtist": True}
                    elif songs:
                        top_result = {**songs[0], "isSong": True}

                    self.send_json({
                        "success": True,
                        "query": query,
                        "filter": "all",
                        "topResult": top_result,
                        "songs": songs,
                        "artists": artists,
                        "albums": albums,
                        "playlists": playlists,
                        "results": songs
                    })
                    return
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # Route: /api/playlist-items
        if path.endswith('/playlist-items'):
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

        # Route: /api/artist-tracks
        if path.endswith('/artist-tracks'):
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

        # Route: /api/trending
        if path.endswith('/trending'):
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

        # Route: /api/resolve
        if path.endswith('/resolve'):
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

        # Default info check
        self.send_json({
            "status": "online",
            "service": "Ember YouTube Music Discovery API",
            "engine": "YouTube Data API v3 & Google Suggest",
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
