"""Regional color difference between a prototype still and a fresh-seed render.

Usage: python scripts/fidelity.py REFERENCE.png RENDER.png OVERLAY.png

The score is the mean per-region RMSE on a 96×54 downsample, split into 8×6
regions. Lower is closer. The overlay draws the reference edges in red and the
render edges in cyan.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


def regional_rmse(reference: Image.Image, render: Image.Image) -> dict[str, object]:
    width, height = 96, 54
    left = reference.convert("RGB").resize((width, height), Image.Resampling.BOX)
    right = render.convert("RGB").resize((width, height), Image.Resampling.BOX)
    cols, rows = 8, 6
    cell_w, cell_h = width // cols, height // rows
    lp, rp = left.load(), right.load()
    regions: list[float] = []
    for row in range(rows):
        for col in range(cols):
            error = 0.0
            count = 0
            for y in range(row * cell_h, (row + 1) * cell_h):
                for x in range(col * cell_w, (col + 1) * cell_w):
                    ar, ag, ab = lp[x, y]
                    br, bg, bb = rp[x, y]
                    error += (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2
                    count += 1
            regions.append(math.sqrt(error / count / 3))
    return {
        "mean": round(sum(regions) / len(regions), 2),
        "max": round(max(regions), 2),
        "regions": [round(value, 1) for value in regions],
    }


def edge_overlay(reference: Image.Image, render: Image.Image) -> Image.Image:
    width, height = 640, 360
    left = reference.convert("L").resize((width, height), Image.Resampling.BOX)
    right = render.convert("L").resize((width, height), Image.Resampling.BOX)
    edges_left = left.filter(ImageFilter.FIND_EDGES).point(lambda value: 255 if value > 28 else 0)
    edges_right = right.filter(ImageFilter.FIND_EDGES).point(lambda value: 255 if value > 28 else 0)
    base = ImageOps.colorize(right, black="#1c1915", white="#d9d3c7")
    red = Image.new("RGB", (width, height), "#e23b3b")
    cyan = Image.new("RGB", (width, height), "#2aa3c7")
    base.paste(red, mask=edges_left)
    # Cyan on top where the render has an edge the reference also has stays visible.
    blended = ImageChops.subtract(edges_right, edges_left)
    base.paste(cyan, mask=edges_right)
    base.paste(red, mask=ImageChops.subtract(edges_left, edges_right))
    draw = ImageDraw.Draw(base)
    draw.rectangle((0, 0, width - 1, height - 1), outline="#20372f")
    return base


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: python scripts/fidelity.py REFERENCE.png RENDER.png OVERLAY.png")
    reference = Image.open(sys.argv[1])
    render = Image.open(sys.argv[2])
    score = regional_rmse(reference, render)
    edge_overlay(reference, render).save(sys.argv[3])
    sys.stdout.write(json.dumps(score) + "\n")


if __name__ == "__main__":
    main()
