#!/usr/bin/env python3
"""
Generate the BCR Clear app icons from assets/icon.png.

Produces:
  - public/icon-192.png       (regular, white eagle on navy, square fill)
  - public/icon-512.png       (regular, same)
  - public/icon-512-mask.png  (maskable: eagle inset to ~70% so OS-applied
                               circle/squircle masks never crop the bird)
  - public/favicon.png        (32x32 white-on-navy)

Run:  python3 assets/make-icons.py
"""
from pathlib import Path
from PIL import Image

ROOT       = Path(__file__).resolve().parent.parent
SOURCE     = ROOT / "assets" / "icon.png"
OUT        = ROOT / "public"
NAVY       = (27, 42, 74, 255)        # #1B2A4A — header navy from the theme
WHITE      = (255, 255, 255)


def whiten(src: Image.Image) -> Image.Image:
    """Replace the eagle's pigment with pure white, keeping its alpha shape."""
    src = src.convert("RGBA")
    pixels = [(*WHITE, a) for _, _, _, a in src.getdata()]
    out = Image.new("RGBA", src.size)
    out.putdata(pixels)
    return out


def render(size: int, inset_pct: float = 0.0) -> Image.Image:
    """Navy square at `size`, with the white eagle centered.

    `inset_pct` shrinks the eagle so a circular/squircle OS mask can't crop it.
    0.0 = bird fills as much as a square crop allows (regular icon);
    0.30 = bird occupies inner 70% (maskable icon).
    """
    src = Image.open(SOURCE)
    eagle = whiten(src)

    canvas = Image.new("RGBA", (size, size), NAVY)
    target_dim = int(size * (1.0 - inset_pct))

    # Preserve aspect ratio while fitting the eagle into target_dim x target_dim.
    eagle.thumbnail((target_dim, target_dim), Image.LANCZOS)
    x = (size - eagle.width) // 2
    y = (size - eagle.height) // 2
    canvas.alpha_composite(eagle, (x, y))
    return canvas


def main() -> None:
    OUT.mkdir(exist_ok=True)
    # Regular icons fill more of the square (4% padding).
    render(192, inset_pct=0.04).save(OUT / "icon-192.png")
    render(512, inset_pct=0.04).save(OUT / "icon-512.png")
    # Maskable: 30% inset (eagle stays inside the ~80% safe zone every OS uses).
    render(512, inset_pct=0.30).save(OUT / "icon-512-mask.png")
    # Favicon: tiny, can be tighter.
    render(32, inset_pct=0.10).save(OUT / "favicon.png")
    print("Wrote:")
    for f in ("icon-192.png", "icon-512.png", "icon-512-mask.png", "favicon.png"):
        print(f"  public/{f}")


if __name__ == "__main__":
    main()
