"""Landmark gate for prototype 00.

Usage: python scripts/landmark_score.py RENDER.png

Reference boxes live in docs/prototypes/landmark-boxes.json. They were measured
once on prototype 00 and are not refit per render. A render box is the connected
component of the landmark color nearest that reference box. The gate is the mean
IoU of those boxes, plus SSIM of grayscale edges at 320x180. Color RMSE is
printed only as information.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BOXES = ROOT / "docs" / "prototypes" / "landmark-boxes.json"
REFERENCE = ROOT / "docs" / "prototypes" / "prototype-00.png"


def iou(a: tuple[int, int, int, int] | None, b: tuple[int, int, int, int]) -> float:
    if a is None:
        return 0.0
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x0, y0 = max(ax, bx), max(ay, by)
    x1, y1 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, x1 - x0) * max(0, y1 - y0)
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0


def components(mask: np.ndarray) -> list[tuple[int, int, int, int]]:
    height, width = mask.shape
    seen = np.zeros(mask.shape, dtype=bool)
    found: list[tuple[int, int, int, int]] = []
    ys, xs = np.where(mask)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        minx = maxx = sx
        miny = maxy = sy
        count = 0
        while stack:
            y, x = stack.pop()
            count += 1
            if x < minx:
                minx = x
            if x > maxx:
                maxx = x
            if y < miny:
                miny = y
            if y > maxy:
                maxy = y
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if count >= 40:
            found.append((minx, miny, maxx - minx + 1, maxy - miny + 1))
    return found


def union_box(boxes: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int] | None:
    if not boxes:
        return None
    x0 = min(box[0] for box in boxes)
    y0 = min(box[1] for box in boxes)
    x1 = max(box[0] + box[2] for box in boxes)
    y1 = max(box[1] + box[3] for box in boxes)
    return (x0, y0, x1 - x0, y1 - y0)


def predicates(rgb: np.ndarray) -> dict[str, np.ndarray]:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    redish = (red > 130) & (green < 100) & (blue < 90) & (red > green + 40)
    navy = (red < 70) & (blue > 120) & (blue > green + 10) & (green > 25)
    yellow = (red > 200) & (green > 145) & (green < 230) & (blue < 80)
    # Saturated frame cyan, above the canal's duller blue so the water is not a frame.
    frame_cyan = (red < 140) & (green > 180) & (blue > 200)
    water = (red > 25) & (red < 120) & (green > 130) & (green < 215) & (blue > 145) & (blue < 235) & (green > red + 30)
    return {
        "cafe": navy | yellow,
        "tower": redish | ((red < 90) & (green > 50) & (green < 150) & (blue > 130)),
        "sculpture": redish | navy | frame_cyan,
        "pavilion": redish,
        "bus": yellow,
        "houses": navy | yellow,
        "bridge_far": redish,
        "bridge_near": redish,
        "canal": water,
    }


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    out = mask.copy()
    height, width = mask.shape
    for dy in range(-radius, radius + 1):
        y_dest = slice(max(0, dy), min(height, height + dy))
        y_src = slice(max(0, -dy), min(height, height - dy))
        for dx in range(-radius, radius + 1):
            if dy * dy + dx * dx > radius * radius:
                continue
            x_dest = slice(max(0, dx), min(width, width + dx))
            x_src = slice(max(0, -dx), min(width, width - dx))
            out[y_dest, x_dest] |= mask[y_src, x_src]
    return out


def detect(
    mask: np.ndarray,
    box: tuple[int, int, int, int],
    whole: bool,
    radius: int,
    unite: bool = False,
) -> tuple[int, int, int, int] | None:
    if whole:
        return union_box(components(mask))
    height, width = mask.shape
    x, y, w, h = box
    pad = 180
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(width, x + w + pad), min(height, y + h + pad)
    window = np.zeros_like(mask)
    window[y0:y1, x0:x1] = dilate(mask, radius)[y0:y1, x0:x1]
    cx, cy = x + w / 2, y + h / 2
    # Two cottages are separate roof colors. Unite the pieces that meet the box.
    if unite:
        inflate = 28
        near: list[tuple[int, int, int, int]] = []
        for found in components(window):
            if found[2] * found[3] < 80:
                continue
            ox0 = max(found[0], x - inflate)
            oy0 = max(found[1], y - inflate)
            ox1 = min(found[0] + found[2], x + w + inflate)
            oy1 = min(found[1] + found[3], y + h + inflate)
            if ox1 > ox0 and oy1 > oy0:
                near.append(found)
        return union_box(near)
    best: tuple[int, int, int, int] | None = None
    best_d = 140 * 140
    for found in components(window):
        if found[2] * found[3] < 80:
            continue
        dx = found[0] + found[2] / 2 - cx
        dy = found[1] + found[3] / 2 - cy
        dist = dx * dx + dy * dy
        if dist < best_d:
            best_d = dist
            best = found
    return best


def edge_ssim(reference: Image.Image, render: Image.Image) -> float:
    size = (320, 180)
    left = np.asarray(reference.convert("L").resize(size, Image.Resampling.BOX).filter(ImageFilter.FIND_EDGES), dtype=np.float64)
    right = np.asarray(render.convert("L").resize(size, Image.Resampling.BOX).filter(ImageFilter.FIND_EDGES), dtype=np.float64)
    kernel = 8
    def window(image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        integral = np.pad(image, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
        integral2 = np.pad(image * image, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
        def area(src: np.ndarray) -> np.ndarray:
            return src[kernel:, kernel:] - src[:-kernel, kernel:] - src[kernel:, :-kernel] + src[:-kernel, :-kernel]
        count = kernel * kernel
        mean = area(integral) / count
        var = area(integral2) / count - mean * mean
        return mean, var
    mu_l, var_l = window(left)
    mu_r, var_r = window(right)
    product = left * right
    integral_p = np.pad(product, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    cov = (integral_p[kernel:, kernel:] - integral_p[:-kernel, kernel:] - integral_p[kernel:, :-kernel] + integral_p[:-kernel, :-kernel]) / (kernel * kernel) - mu_l * mu_r
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2
    num = (2 * mu_l * mu_r + c1) * (2 * cov + c2)
    den = (mu_l * mu_l + mu_r * mu_r + c1) * (var_l + var_r + c2)
    return float(np.mean(num / den))


def color_rmse(reference: Image.Image, render: Image.Image) -> float:
    left = np.asarray(reference.convert("RGB").resize((96, 54), Image.Resampling.BOX), dtype=np.float64)
    right = np.asarray(render.convert("RGB").resize((96, 54), Image.Resampling.BOX), dtype=np.float64)
    return float(np.sqrt(np.mean((left - right) ** 2)))


def score(render_path: Path) -> dict[str, object]:
    spec = json.loads(BOXES.read_text())
    reference = Image.open(REFERENCE)
    render = Image.open(render_path)
    ref_rgb = np.asarray(reference.convert("RGB"))
    ren_rgb = np.asarray(render.convert("RGB"))
    ref_pred = predicates(ref_rgb)
    ren_pred = predicates(ren_rgb)
    rows = []
    for name, box in spec["landmarks"].items():
        frozen = tuple(box)
        mask = ren_pred[name]
        # The canal is navy, so a house union must not swallow the water.
        if name == "houses":
            mask = mask & ~ren_pred["canal"]
        found = detect(mask, frozen, name == "canal", 0 if name == "bus" else 4, name == "houses")
        rows.append({
            "landmark": name,
            "reference": list(frozen),
            "render": None if found is None else list(found),
            "iou": round(iou(found, frozen), 3),
        })
    mean_iou = sum(row["iou"] for row in rows) / len(rows)
    return {
        "iou_mean": round(mean_iou, 3),
        "ssim": round(edge_ssim(reference, render), 4),
        "rmse": round(color_rmse(reference, render), 2),
        "landmarks": rows,
    }


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/landmark_score.py RENDER.png")
    sys.stdout.write(json.dumps(score(Path(sys.argv[1]))) + "\n")


if __name__ == "__main__":
    main()
