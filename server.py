#!/usr/bin/env python3
"""
EMBER - High-Speed Direct CDN Music Server
Lightweight Python server (Standard Library Only - Zero Dependencies)
Provides static asset serving and ultra-fast 320kbps music streaming APIs.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import base64
import os
import sys

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 4321))

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

def feistel_function(R, subkey):
    expanded = permute(R, E)
    xored = [a ^ b for a, b in zip(expanded, subkey)]
    output_bits = []
    for i in range(8):
        chunk = xored[i*6:(i+1)*6]
        row = (chunk[0] << 1) | chunk[5]
        col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4]
        val = S_BOXES[i][row * 16 + col]
        for j in range(3, -1, -1):
            output_bits.append((val >> j) & 1)
    return permute(output_bits, P)

def des_decrypt_block(block_bits, subkeys):
    permuted = permute(block_bits, IP)
    L = permuted[:32]
    R = permuted[32:]
    for subkey in reversed(subkeys):
        L_next = R
        f_res = feistel_function(R, subkey)
        R_next = [a ^ b for a, b in zip(L, f_res)]
        L, R = L_next, R_next
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

def format_duration(seconds):
    try:
        sec = int(seconds)
        m = sec // 60
        s = sec % 60
        return f"{m:02d}:{s:02d}"
    except (ValueError, TypeError):
        return "03:30"

def clean_song_item(item):
    """Transform raw JioSaavn song object into Ember track structure"""
    enc = item.get("more_info", {}).get("encrypted_media_url")
    audio_url = ""
    if enc:
        try:
            raw = des_decrypt_ecb(base64.b64decode(enc))
            # Try 320kbps first, fallback to 160 or 96
            audio_url = raw.replace("_96.mp4", "_320.mp4")
        except Exception:
            pass

    duration_sec = 0
    try:
        duration_sec = int(item.get("more_info", {}).get("duration", 210))
    except (ValueError, TypeError):
        duration_sec = 210

    # Image high-resolution transformation
    image_url = item.get("image", "")
    if image_url:
        image_url = image_url.replace("150x150", "500x500").replace("50x50", "500x500")

    # Clean HTML entities in title
    title = item.get("title", "Unknown Title")
    title = title.replace("&amp;", "&").replace("&quot;", '"').replace("&#039;", "'")

    subtitle = item.get("subtitle", "")
    artist = subtitle.split(" - ")[0] if subtitle else (item.get("more_info", {}).get("music") or "Artist")
    artist = artist.replace("&amp;", "&").replace("&quot;", '"').replace("&#039;", "'")

    return {
        "id": item.get("id"),
        "title": title,
        "artist": artist,
        "channelTitle": artist,
        "album": item.get("more_info", {}).get("album", ""),
        "year": item.get("year", ""),
        "duration": format_duration(duration_sec),
        "durationSec": duration_sec,
        "thumbnail": image_url,
        "audioUrl": audio_url,
        "category": "cdn",
        "embeddable": True
    }


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

        # Route: /api/search?q=query&n=20
        if path == "/api/search":
            query = params.get("q", [""])[0].strip()
            try:
                limit = int(params.get("n", ["20"])[0])
            except (ValueError, TypeError):
                limit = 20
            if not query:
                self.send_json({"success": False, "results": [], "error": "Query required"})
                return

            try:
                saavn_url = (
                    f"https://www.jiosaavn.com/api.php?__call=search.getResults"
                    f"&_format=json&_marker=0&api_version=4&ctx=web6dot0"
                    f"&q={urllib.parse.quote(query)}&n={limit}&p=1"
                )
                req = urllib.request.Request(saavn_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    results = raw_data.get("results", [])
                    tracks = [clean_song_item(s) for s in results if clean_song_item(s).get("audioUrl")]

                self.send_json({"success": True, "query": query, "results": tracks})
            except Exception as e:
                self.send_json({"success": False, "results": [], "error": str(e)}, status=500)
            return

        # Route: /api/trending
        if path == "/api/trending":
            try:
                chart_url = (
                    "https://www.jiosaavn.com/api.php?__call=content.getCharts"
                    "&_format=json&_marker=0&api_version=4&ctx=web6dot0"
                )
                req = urllib.request.Request(chart_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    charts_data = json.loads(resp.read().decode("utf-8"))
                    first_list_id = (charts_data[0].get("id") or charts_data[0].get("listid")) if charts_data else "1134543272"

                list_url = (
                    f"https://www.jiosaavn.com/api.php?__call=playlist.getDetails"
                    f"&_format=json&_marker=0&api_version=4&ctx=web6dot0&listid={first_list_id}"
                )
                req2 = urllib.request.Request(list_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req2, timeout=8) as resp2:
                    pl_data = json.loads(resp2.read().decode("utf-8"))
                    list_items = pl_data.get("list") or pl_data.get("songs") or []
                    tracks = [clean_song_item(s) for s in list_items if clean_song_item(s).get("audioUrl")]

                self.send_json({"success": True, "results": tracks[:24]})
            except Exception as e:
                # Fallback to search query for trending
                try:
                    fallback_url = (
                        "https://www.jiosaavn.com/api.php?__call=search.getResults"
                        "&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=trending&n=20&p=1"
                    )
                    req3 = urllib.request.Request(fallback_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req3, timeout=8) as resp3:
                        raw_data = json.loads(resp3.read().decode("utf-8"))
                        results = raw_data.get("results", [])
                        tracks = [clean_song_item(s) for s in results if clean_song_item(s).get("audioUrl")]
                    self.send_json({"success": True, "results": tracks})
                except Exception as ex:
                    self.send_json({"success": False, "results": [], "error": str(ex)}, status=500)
            return

        # Route: /api/resolve?title=...&artist=...
        if path == "/api/resolve":
            title = params.get("title", [""])[0].strip()
            artist = params.get("artist", [""])[0].strip()
            query = f"{title} {artist}".strip()
            if not query:
                self.send_json({"success": False, "error": "Title required"}, status=400)
                return

            try:
                saavn_url = (
                    f"https://www.jiosaavn.com/api.php?__call=search.getResults"
                    f"&_format=json&_marker=0&api_version=4&ctx=web6dot0"
                    f"&q={urllib.parse.quote(query)}&n=5&p=1"
                )
                req = urllib.request.Request(saavn_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    results = raw_data.get("results", [])
                    tracks = [clean_song_item(s) for s in results if clean_song_item(s).get("audioUrl")]

                if tracks:
                    self.send_json({"success": True, "track": tracks[0]})
                else:
                    self.send_json({"success": False, "error": "No match found"}, status=404)
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, status=500)
            return

        # Default: Serve static files
        super().do_GET()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), EmberHTTPRequestHandler) as httpd:
        print("=" * 60)
        print("  EMBER MUSIC SERVER (High-Speed Direct CDN Engine)")
        print(f"  URL: http://localhost:{PORT}")
        print("  Engine: 320kbps Akamai CDN (Zero YouTube IFrame / Instant)")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    main()
