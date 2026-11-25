"""Key white backgrounds from AI product photos → transparent PNG for stage-plot."""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

ASSETS = Path(r"C:\Users\marti\.cursor\projects\c-Proyectos-OFRN-WebApp\assets")
OUT = Path(r"c:\Proyectos\OFRN-WebApp\public\stage-plot\icons")
OUT.mkdir(parents=True, exist_ok=True)

# slug → source filename
MAP = {
    "glockenspiel": "glockenspiel-src.jpg",
    "congas": "congas-src.jpg",
    "guiro": "guiro-src.jpg",
    "crystal-glasses": "crystal-glasses-src.jpg",
    "metal-chimes": "metal-chimes-src.jpg",
    "tam-tam": "tam-tam-src.jpg",
    "maracas": "maracas-src.jpg",
    "bongo": "bongo-src.jpg",
}

# Crystal glasses need a softer key (clear glass looks near-white)
HARD = {
    "crystal-glasses": 252,
    "default": 245,
}
SOFT = {
    "crystal-glasses": 18,
    "default": 28,
}


def alpha_for(r: int, g: int, b: int, a: int, hard: int, soft: int) -> int:
    # Near-white / light gray studio bg → transparent
    if min(r, g, b) >= hard - 5 and (r + g + b) / 3 >= hard:
        return 0
    lum = (r + g + b) / 3
    # Also key very light near-neutral pixels (shadows on white seamless)
    chroma = max(r, g, b) - min(r, g, b)
    if lum >= hard and chroma < 18:
        return 0
    if lum <= hard - soft or chroma >= 40:
        return a
    t = (hard - lum) / soft
    return max(0, min(255, round(a * t)))


def flood_mark_background(im: Image.Image, thresh: int = 238) -> Image.Image:
    """Flood-fill from corners on near-white to build a soft mask."""
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * h for _ in range(w)]
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    bg = set()
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[x][y]:
            continue
        visited[x][y] = True
        r, g, b, a = px[x, y]
        lum = (r + g + b) / 3
        chroma = max(r, g, b) - min(r, g, b)
        if lum < thresh or chroma > 35:
            continue
        bg.add((x, y))
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return bg


def dilate_bg(bg: set[tuple[int, int]], w: int, h: int, radius: int = 1) -> set[tuple[int, int]]:
    out = set(bg)
    for x, y in bg:
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    out.add((nx, ny))
    return out


def process(slug: str, src_name: str) -> Path:
    src = ASSETS / src_name
    im = Image.open(src).convert("RGBA")
    hard = HARD.get(slug, HARD["default"])
    soft = SOFT.get(slug, SOFT["default"])
    # Flood from corners so bright metal/wood inside the subject stays opaque.
    bg = dilate_bg(flood_mark_background(im, thresh=hard - 8), *im.size, radius=1)
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (x, y) in bg:
                # Soft fringe near subject edge via luminance
                px[x, y] = (r, g, b, alpha_for(r, g, b, a, hard, soft))
            # else keep full alpha (protects white drum heads / bright metal)

    # Crop to opaque content with padding
    bbox = im.getbbox()
    if bbox:
        pad = 24
        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(w, bbox[2] + pad)
        y1 = min(h, bbox[3] + pad)
        im = im.crop((x0, y0, x1, y1))

    # Fit into 1024 canvas keeping aspect
    cw = ch = 1024
    im.thumbnail((cw - 40, ch - 40), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ox = (cw - im.width) // 2
    oy = (ch - im.height) // 2
    canvas.paste(im, (ox, oy), im)

    out = OUT / f"{slug}.png"
    # Compress under 1 MB
    quality_steps = [9, 7, 5, 3]
    for compress in quality_steps:
        buf = io.BytesIO()
        canvas.save(buf, format="PNG", optimize=True, compress_level=compress)
        data = buf.getvalue()
        if len(data) <= 1_048_576:
            out.write_bytes(data)
            print(f"OK {slug}: {out.name} {canvas.size} {len(data)} bytes")
            return out
    # Last resort: scale down slightly
    canvas = canvas.resize((900, 900), Image.Resampling.LANCZOS)
    # re-pad to 1024
    canvas2 = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    ox = (1024 - canvas.width) // 2
    oy = (1024 - canvas.height) // 2
    canvas2.paste(canvas, (ox, oy), canvas)
    buf = io.BytesIO()
    canvas2.save(buf, format="PNG", optimize=True, compress_level=9)
    out.write_bytes(buf.getvalue())
    print(f"OK {slug}: {out.name} resized {len(buf.getvalue())} bytes")
    return out


def main():
    for slug, src in MAP.items():
        process(slug, src)


if __name__ == "__main__":
    main()
