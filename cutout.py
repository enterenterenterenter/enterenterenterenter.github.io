#!/usr/bin/env python3
"""Cut out TV shells: remove near-white background (edge flood-fill, so it
stops at gray bodies), then punch out the screen hole and report its bbox."""
import sys, json
from collections import deque
from PIL import Image

ASSETS = "/Users/DaniParker/dani-site/assets"

def near_white(px, thr):
    r, g, b = px[0], px[1], px[2]
    return r >= 255 - thr and g >= 255 - thr and b >= 255 - thr

def flood_from_borders(img, thr):
    """Set alpha=0 on near-white pixels connected to any border."""
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    q = deque()
    def consider(x, y):
        i = y * w + x
        if seen[i]:
            return
        seen[i] = 1
        if near_white(px[x, y], thr):
            px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
            q.append((x, y))
    for x in range(w):
        consider(x, 0); consider(x, h - 1)
    for y in range(h):
        consider(0, y); consider(w - 1, y)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                consider(nx, ny)

def largest_white_blob(img, thr):
    """Find the largest connected near-white *opaque* region (the screen).
    Returns (bbox, pixel_list)."""
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    best = None
    for sy in range(h):
        for sx in range(w):
            i = sy * w + sx
            if seen[i]:
                continue
            p = px[sx, sy]
            if p[3] == 0 or not near_white(p, thr):
                seen[i] = 1
                continue
            # BFS this blob
            comp = []
            q = deque([(sx, sy)])
            seen[i] = 1
            minx = maxx = sx; miny = maxy = sy
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j]:
                            pp = px[nx, ny]
                            if pp[3] != 0 and near_white(pp, thr):
                                seen[j] = 1
                                q.append((nx, ny))
                            else:
                                seen[j] = 1
            if best is None or len(comp) > len(best[1]):
                best = ((minx, miny, maxx, maxy), comp)
    return best

def process(name, bg_thr=18, screen_thr=22, punch_screen=True):
    src = f"{ASSETS}/{name}"
    img = Image.open(src).convert("RGBA")
    flood_from_borders(img, bg_thr)
    bbox_pct = None
    if punch_screen:
        blob = largest_white_blob(img, screen_thr)
        if blob:
            (minx, miny, maxx, maxy), comp = blob
            px = img.load()
            for (x, y) in comp:
                p = px[x, y]
                px[x, y] = (p[0], p[1], p[2], 0)
            w, h = img.size
            bbox_pct = {
                "sl": round(minx / w * 100, 1),
                "st": round(miny / h * 100, 1),
                "sw": round((maxx - minx) / w * 100, 1),
                "sh": round((maxy - miny) / h * 100, 1),
            }
    out = src.rsplit(".", 1)[0] + "_cut.png"
    img.save(out)
    return out, bbox_pct

if __name__ == "__main__":
    # name -> (bg_thr, screen_thr, punch_screen)
    jobs = {
        "shell 1.jpg": (18, 22, True),
        "shell 2.jpg": (18, 22, True),
        "shell 3.jpg": (18, 22, True),
        "shell 4.jpg": (18, 22, True),
        "shell 5.jpg": (22, 26, True),
        "shell 6.jpg": (22, 26, True),
        "shell 7.jpg": (18, 22, True),
        "shell 8.jpg": (18, 22, True),
        "shell 9.jpg": (18, 22, True),
        "shell 10.jpg": (18, 22, True),
        "shell 11.jpg": (18, 22, True),
        "shell 12.jpg": (18, 22, True),
    }
    results = {}
    for name, (bt, st, ps) in jobs.items():
        out, bbox = process(name, bt, st, ps)
        results[name] = bbox
        print(f"{name:14s} -> {out.split('/')[-1]:20s} screen={bbox}")
    print("\nJSON:", json.dumps(results))
