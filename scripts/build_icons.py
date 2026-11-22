"""
build_icons.py
Downloads open-source Lucide icons (ISC License) into static/vendor/icons/,
saves the license file, and generates static/icons.json.
"""

import os
import json
import re
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(PROJECT_ROOT, "static", "vendor", "icons")
OUTPUT_JSON = os.path.join(PROJECT_ROOT, "static", "icons.json")
LICENSE_PATH = os.path.join(ICONS_DIR, "LICENSE")

LUCIDE_RAW_URL = "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons"
LUCIDE_LICENSE_URL = "https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE"

# Icon catalog across 8 categories
ICON_CATALOG = {
    "Arrows": {
        "arrow-up": ["arrow", "up", "top", "north", "direction"],
        "arrow-down": ["arrow", "down", "bottom", "south", "direction"],
        "arrow-left": ["arrow", "left", "back", "previous", "west"],
        "arrow-right": ["arrow", "right", "forward", "next", "east"],
        "arrow-up-right": ["arrow", "up", "right", "diagonal", "growth"],
        "arrow-down-right": ["arrow", "down", "right", "diagonal", "drop"],
        "arrow-up-left": ["arrow", "up", "left", "diagonal"],
        "arrow-down-left": ["arrow", "down", "left", "diagonal"],
        "chevron-up": ["chevron", "up", "arrow", "expand"],
        "chevron-down": ["chevron", "down", "arrow", "collapse"],
        "chevron-left": ["chevron", "left", "arrow", "back"],
        "chevron-right": ["chevron", "right", "arrow", "next"],
        "chevrons-up": ["chevrons", "double", "up", "fast", "top"],
        "chevrons-down": ["chevrons", "double", "down", "bottom"],
        "rotate-cw": ["rotate", "clockwise", "reload", "turn", "refresh"],
        "rotate-ccw": ["rotate", "counter", "turn", "undo"],
        "refresh-cw": ["refresh", "reload", "sync", "loop", "update"],
        "move": ["move", "arrows", "drag", "position", "pan"]
    },
    "Files": {
        "file": ["file", "document", "page", "blank"],
        "file-text": ["file", "document", "text", "paper", "article"],
        "file-plus": ["file", "new", "create", "add", "document"],
        "file-minus": ["file", "remove", "delete", "document"],
        "file-check": ["file", "complete", "done", "verified", "approve"],
        "file-x": ["file", "cancel", "error", "reject"],
        "file-code": ["file", "code", "development", "source", "script"],
        "file-image": ["file", "image", "photo", "picture"],
        "folder": ["folder", "directory", "archive", "storage"],
        "folder-plus": ["folder", "new", "add", "create", "directory"],
        "folder-open": ["folder", "open", "browse", "directory"],
        "clipboard": ["clipboard", "copy", "notes", "board"],
        "clipboard-check": ["clipboard", "tasks", "checklist", "done", "audit"],
        "archive": ["archive", "box", "storage", "package", "history"],
        "save": ["save", "disk", "floppy", "store", "backup"],
        "download": ["download", "export", "receive", "save"],
        "upload": ["upload", "import", "publish", "send"],
        "paperclip": ["paperclip", "attachment", "link", "bind"]
    },
    "Communication": {
        "mail": ["mail", "email", "envelope", "letter", "message"],
        "message-square": ["message", "chat", "bubble", "comment", "talk"],
        "message-circle": ["message", "circle", "chat", "feedback"],
        "send": ["send", "paper-plane", "share", "transmit", "fly"],
        "inbox": ["inbox", "mail", "incoming", "tray", "archive"],
        "phone": ["phone", "call", "telephone", "contact", "dial"],
        "phone-call": ["phone", "call", "active", "speaking"],
        "phone-incoming": ["phone", "incoming", "receive"],
        "phone-outgoing": ["phone", "outgoing", "call"],
        "bell": ["bell", "notification", "alarm", "alert", "ring"],
        "bell-off": ["bell", "silent", "mute", "off", "notification"],
        "share-2": ["share", "connect", "social", "network"],
        "mic": ["mic", "microphone", "audio", "record", "speak"],
        "mic-off": ["mic", "mute", "silent", "audio", "off"],
        "volume-2": ["volume", "sound", "speaker", "loud", "audio"],
        "volume-x": ["volume", "mute", "silent", "sound", "off"]
    },
    "Devices": {
        "monitor": ["monitor", "display", "screen", "desktop", "computer"],
        "laptop": ["laptop", "computer", "notebook", "device", "work"],
        "smartphone": ["smartphone", "phone", "mobile", "cell", "device"],
        "tablet": ["tablet", "ipad", "device", "mobile", "touch"],
        "tv": ["tv", "television", "display", "stream", "show"],
        "hard-drive": ["hard-drive", "storage", "hdd", "disk", "memory"],
        "cpu": ["cpu", "chip", "processor", "hardware", "computing"],
        "server": ["server", "cloud", "backend", "database", "host"],
        "database": ["database", "storage", "sql", "data", "tables"],
        "camera": ["camera", "photo", "picture", "record", "lens"],
        "video": ["video", "camera", "film", "movie", "recording"],
        "printer": ["printer", "print", "paper", "fax", "output"],
        "keyboard": ["keyboard", "input", "typing", "hardware"],
        "mouse": ["mouse", "click", "cursor", "hardware", "input"],
        "wifi": ["wifi", "network", "internet", "wireless", "signal"],
        "bluetooth": ["bluetooth", "wireless", "connect", "device"],
        "battery": ["battery", "power", "energy", "charge", "level"],
        "cast": ["cast", "stream", "airplay", "screen", "connect"]
    },
    "Business": {
        "briefcase": ["briefcase", "business", "work", "job", "portfolio"],
        "credit-card": ["credit-card", "payment", "card", "money", "finance"],
        "dollar-sign": ["dollar", "money", "currency", "price", "cash", "finance"],
        "trending-up": ["trending", "up", "growth", "finance", "increase", "success"],
        "trending-down": ["trending", "down", "loss", "decrease", "decline"],
        "bar-chart-2": ["chart", "bar", "analytics", "statistics", "metrics"],
        "pie-chart": ["chart", "pie", "analytics", "proportions", "graph"],
        "activity": ["activity", "pulse", "health", "analytics", "metrics", "monitor"],
        "shopping-cart": ["cart", "shopping", "ecommerce", "buy", "store"],
        "shopping-bag": ["bag", "shopping", "store", "retail", "purchase"],
        "tag": ["tag", "label", "price", "discount", "category"],
        "award": ["award", "badge", "trophy", "medal", "achievement", "prize"],
        "target": ["target", "goal", "aim", "focus", "objective"],
        "percent": ["percent", "discount", "sale", "offer", "rate"],
        "calculator": ["calculator", "math", "accounting", "numbers", "finance"],
        "wallet": ["wallet", "money", "cards", "crypto", "cash"]
    },
    "Weather": {
        "sun": ["sun", "day", "light", "weather", "sunny", "warm"],
        "moon": ["moon", "night", "dark", "sleep", "lunar"],
        "cloud": ["cloud", "weather", "overcast", "sky", "storage"],
        "cloud-rain": ["cloud", "rain", "precipitation", "weather", "shower"],
        "cloud-snow": ["cloud", "snow", "cold", "winter", "weather"],
        "cloud-lightning": ["cloud", "lightning", "storm", "thunder", "flash"],
        "cloud-drizzle": ["cloud", "drizzle", "rain", "light", "weather"],
        "cloud-fog": ["cloud", "fog", "mist", "haze", "weather"],
        "wind": ["wind", "breeze", "air", "weather", "blow"],
        "droplet": ["droplet", "water", "liquid", "humidity", "tear"],
        "thermometer": ["thermometer", "temperature", "heat", "cold", "weather"],
        "umbrella": ["umbrella", "rain", "protection", "weather", "shelter"]
    },
    "People": {
        "user": ["user", "person", "account", "profile", "human"],
        "user-plus": ["user", "add", "invite", "new", "register"],
        "user-minus": ["user", "remove", "delete", "unsubscribe"],
        "user-check": ["user", "verified", "approved", "account", "member"],
        "user-x": ["user", "block", "ban", "reject", "cancel"],
        "users": ["users", "group", "team", "people", "community", "crowd"],
        "smile": ["smile", "happy", "face", "emoji", "good", "positive"],
        "frown": ["frown", "sad", "face", "emoji", "bad", "negative"],
        "meh": ["meh", "neutral", "face", "emoji", "straight"],
        "heart": ["heart", "love", "like", "favorite", "health"],
        "thumbs-up": ["thumbs-up", "like", "approve", "agree", "upvote"],
        "thumbs-down": ["thumbs-down", "dislike", "reject", "downvote"]
    },
    "Symbols": {
        "check": ["check", "tick", "yes", "confirm", "done", "ok"],
        "x": ["x", "cross", "close", "cancel", "delete", "stop"],
        "plus": ["plus", "add", "new", "create", "more"],
        "minus": ["minus", "subtract", "remove", "less", "dash"],
        "info": ["info", "help", "information", "details", "about"],
        "alert-circle": ["alert", "warning", "error", "circle", "notice"],
        "alert-triangle": ["alert", "warning", "danger", "caution", "triangle"],
        "help-circle": ["help", "question", "faq", "support", "circle"],
        "star": ["star", "favorite", "bookmark", "rating", "vip"],
        "shield": ["shield", "security", "protect", "defense", "safety"],
        "lock": ["lock", "security", "password", "secure", "private"],
        "unlock": ["unlock", "open", "insecure", "public", "access"],
        "key": ["key", "password", "access", "auth", "token"],
        "search": ["search", "find", "magnifier", "lookup", "explore"],
        "settings": ["settings", "gear", "config", "preferences", "options"],
        "trash-2": ["trash", "delete", "bin", "remove", "garbage"],
        "edit": ["edit", "pencil", "modify", "write", "update"],
        "filter": ["filter", "sort", "refine", "funnel", "query"],
        "flag": ["flag", "marker", "report", "country", "pin"],
        "clock": ["clock", "time", "watch", "schedule", "history"],
        "calendar": ["calendar", "date", "event", "schedule", "month"],
        "map-pin": ["pin", "map", "location", "marker", "place"],
        "zap": ["zap", "lightning", "energy", "fast", "flash", "power"],
        "globe": ["globe", "world", "earth", "web", "internet", "international"]
    }
}

def download_file(url, target_path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as response:
        content = response.read().decode("utf-8")
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        return content

def main():
    os.makedirs(ICONS_DIR, exist_ok=True)

    # 1. Download LICENSE
    if not os.path.exists(LICENSE_PATH):
        print("Downloading Lucide ISC License...")
        try:
            download_file(LUCIDE_LICENSE_URL, LICENSE_PATH)
            print("  -> Saved LICENSE")
        except Exception as e:
            print(f"  -> Error downloading license: {e}")
            # Write fallback ISC license
            with open(LICENSE_PATH, "w", encoding="utf-8") as f:
                f.write("ISC License\n\nCopyright (c) Lucide Icons and Contributors\n\nPermission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.\n")

    # 2. Download SVG icons
    icons_list = []
    total_downloaded = 0
    total_existing = 0

    print("Fetching Lucide icon SVGs...")
    for category, icons in ICON_CATALOG.items():
        for icon_name, tags in icons.items():
            svg_filename = f"{icon_name}.svg"
            svg_path = os.path.join(ICONS_DIR, svg_filename)

            svg_content = None
            if os.path.exists(svg_path):
                with open(svg_path, "r", encoding="utf-8") as f:
                    svg_content = f.read()
                total_existing += 1
            else:
                url = f"{LUCIDE_RAW_URL}/{svg_filename}"
                try:
                    svg_content = download_file(url, svg_path)
                    total_downloaded += 1
                except Exception as e:
                    print(f"  Error fetching {icon_name}: {e}")
                    continue

            if not svg_content:
                continue

            # Clean and normalize svg content
            # Extract elements inside <svg ...>...</svg>
            clean_svg = svg_content.strip()
            # Extract inner paths/polygons/circles
            inner_match = re.search(r"<svg[^>]*>(.*?)</svg>", clean_svg, re.DOTALL)
            inner_content = inner_match.group(1).strip() if inner_match else clean_svg

            icons_list.append({
                "name": icon_name,
                "category": category,
                "tags": tags,
                "svg": clean_svg,
                "inner": inner_content
            })

    # 3. Write static/icons.json
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(icons_list, f, indent=2)

    print(f"\nDone! Processed {len(icons_list)} icons across {len(ICON_CATALOG)} categories.")
    print(f"  Existing on disk: {total_existing}")
    print(f"  Newly downloaded: {total_downloaded}")
    print(f"  Wrote manifest to: {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
