#!/usr/bin/env python3
"""Study-only picture of the existing Shared World in the 3B lighting language.

This is not the PixiJS renderer and not a catalog asset. It reads the
neighborhood placements and draws a still, so the owner can compare the
prototype-00 world under Soft 3D Isometric Diorama lighting. See STUDY.md.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
TILE_W = 128
TILE_H = 64

# Ground ribbon copied from src/domain/district.ts for this still only.
CANAL = [
    (-4.17, 7.86), (-0.70, 8.35), (3.52, 8.94), (8.50, 8.95), (14.15, 10.05), (17.40, 10.69),
    (16.54, 8.82), (13.29, 8.19), (7.50, 7.06), (2.48, 7.05), (-1.64, 6.47), (-5.11, 5.99),
]
CANAL_BANK = [
    (-3.94, 8.33), (-0.46, 8.82), (3.78, 9.42), (8.75, 9.43), (14.36, 10.52), (17.61, 11.15),
    (16.33, 8.36), (13.08, 7.72), (7.25, 6.59), (2.21, 6.58), (-1.88, 6.00), (-5.35, 5.52),
]
PLAZAS = [(5, 3, 5, 5), (3, -3, 5, 5), (7, 1, 5, 4)]
CORNER_CUTS = [
    (5, 10, "left", 1.8), (5, 10, "bottom", 1.8), (10, 10, "top", 0.85),
    (5, 5, "top", 0.8), (5, 5, "left", 0.8), (0, 5, "bottom", 0.9),
    (0, 0, "bottom", 0.7), (0, 0, "left", 0.7), (5, -10, "bottom", 1.3), (5, -5, "right", 1.3),
]
MODULE = 5
BLOCK = 4

PATH = (240, 232, 216)
CURB = (213, 227, 196)
GRASS = (16, 96, 72)
GRASS_LIT = (36, 128, 90)
PLAZA = (244, 239, 228)
WATER = (56, 168, 188)
WATER_LIT = (126, 214, 222)
SHADOW = (8, 48, 38)


def load_places() -> list[tuple[str, float, float, float, float]]:
    text = (ROOT / "src/server/neighborhood.ts").read_text()
    found = re.findall(
        r'place\(\d+,\s*"([^"]+)",\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)',
        text,
    )
    return [(name, float(x), float(y), float(w), float(h)) for name, x, y, w, h in found]


def cell(x: float, y: float) -> tuple[float, float]:
    return ((x - y) * (TILE_W / 2), (x + y) * (TILE_H / 2))


def camera_for(view_w: int, view_h: int) -> tuple[float, float, float]:
    wide = view_w >= 800
    zoom = 0.96 if wide else 0.515
    focus = cell(9.5, 3.5)
    focus_x = 0.7 if wide else 0.695
    focus_y = 0.58 if wide else 0.49
    center_x = focus[0] - (focus_x - 0.5) * view_w / zoom
    center_y = focus[1] - (focus_y - 0.5) * view_h / zoom
    return zoom, view_w / 2 - center_x * zoom, view_h / 2 - center_y * zoom


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def lighten(color: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    warm = (255, 248, 230)
    return mix(color, warm, t)


def darken(color: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return mix(color, (18, 32, 28), t)


class Study:
    def __init__(self, view_w: int, view_h: int, scale: int = 2):
        self.view_w = view_w
        self.view_h = view_h
        self.scale = scale
        self.zoom, self.cam_x, self.cam_y = camera_for(view_w, view_h)
        self.image = Image.new("RGBA", (view_w * scale, view_h * scale), (*PATH, 255))
        self.draw = ImageDraw.Draw(self.image)

    def p(self, x: float, y: float, lift: float = 0) -> tuple[float, float]:
        sx, sy = cell(x, y)
        return (
            (self.cam_x + sx * self.zoom) * self.scale,
            (self.cam_y + sy * self.zoom) * self.scale - lift,
        )

    def cell_px(self) -> float:
        return TILE_H * self.zoom * self.scale

    def poly(self, points: list[tuple[float, float]], color: tuple[int, int, int], alpha: int = 255) -> None:
        if len(points) < 3:
            return
        self.draw.polygon(points, fill=(*color, alpha))

    def shadow(self, cx: float, cy: float, rx: float, ry: float, alpha: int = 78, blur: int = 10) -> None:
        pad = blur * 3
        width = max(1, int(rx * 2 + pad * 2))
        height = max(1, int(ry * 2 + pad * 2))
        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        ImageDraw.Draw(layer).ellipse([pad, pad, pad + rx * 2, pad + ry * 2], fill=(*SHADOW, alpha))
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
        self.image.alpha_composite(layer, (int(cx - rx - pad), int(cy - ry - pad)))

    def sphere(self, cx: float, cy: float, radius: float, body: tuple[int, int, int], shade: tuple[int, int, int], lit: tuple[int, int, int]) -> None:
        r = max(2, int(radius))
        size = r * 2 + 4
        yy, xx = np.mgrid[0:size, 0:size]
        dx = xx - (r + 2)
        dy = yy - (r + 2)
        dist = np.sqrt(dx * dx + dy * dy)
        inside = dist <= r - 0.4
        edge = (dist <= r + 0.6) & ~inside
        light = np.sqrt((dx + r * 0.42) ** 2 + (dy + r * 0.55) ** 2)
        shade_t = np.clip((light - r * 0.15) / (r * 1.55), 0, 1)
        bloom = np.clip(1 - light / (r * 0.95), 0, 1) ** 1.35
        body_a = np.array(body, dtype=np.float32)
        shade_a = np.array(shade, dtype=np.float32)
        lit_a = np.array(lit, dtype=np.float32)
        color = body_a * (1 - shade_t[..., None]) + shade_a * shade_t[..., None]
        color = color * (1 - bloom[..., None]) + lit_a * bloom[..., None]
        layer = np.zeros((size, size, 4), dtype=np.uint8)
        rgb = np.clip(color, 0, 255).astype(np.uint8)
        layer[inside, :3] = rgb[inside]
        layer[inside, 3] = 255
        layer[edge, :3] = rgb[edge]
        layer[edge, 3] = 140
        paste = Image.fromarray(layer, "RGBA")
        self.image.alpha_composite(paste, (int(cx - r - 2), int(cy - r - 2)))

    def ground(self) -> None:
        def mod(n: float) -> float:
            return n % MODULE

        plots: list[tuple[float, float, float, float]] = []
        y = -10
        while y < 24:
            if mod(y) >= BLOCK:
                y += 1
                continue
            y0 = y
            while y < 24 and mod(y) < BLOCK:
                y += 1
            x = -12
            while x < 28:
                if mod(x) >= BLOCK:
                    x += 1
                    continue
                x0 = x
                while x < 28 and mod(x) < BLOCK:
                    x += 1
                plots.append((x0, y0, x - x0, y - y0))

        def cuts(px: float, py: float) -> dict[str, float]:
            cut = {"top": 0.0, "right": 0.0, "bottom": 0.0, "left": 0.0}
            for cx, cy, corner, cells in CORNER_CUTS:
                if cx == px and cy == py:
                    cut[corner] = max(cut[corner], cells)
            return cut

        def lawn(x: float, y: float, w: float, h: float, cut: dict[str, float]) -> list[tuple[float, float]]:
            pts: list[tuple[float, float]] = []
            if cut["top"] > 0:
                pts += [self.p(x, y + cut["top"]), self.p(x + cut["top"], y)]
            else:
                pts.append(self.p(x, y))
            if cut["right"] > 0:
                pts += [self.p(x + w - cut["right"], y), self.p(x + w, y + cut["right"])]
            else:
                pts.append(self.p(x + w, y))
            if cut["bottom"] > 0:
                pts += [self.p(x + w, y + h - cut["bottom"]), self.p(x + w - cut["bottom"], y + h)]
            else:
                pts.append(self.p(x + w, y + h))
            if cut["left"] > 0:
                pts += [self.p(x + cut["left"], y + h), self.p(x, y + h - cut["left"])]
            else:
                pts.append(self.p(x, y + h))
            return pts

        for x, y, w, h in plots:
            cut = cuts(x, y)
            quad = lawn(x - 0.05, y - 0.05, w + 0.1, h + 0.1, cut)
            south = self.p(x + w / 2, y + h)
            self.shadow(south[0] + 6 * self.scale, south[1] + 8 * self.scale, w * 28 * self.scale, h * 10 * self.scale, 46, 8 * self.scale)
            self.poly(quad, CURB)
            inner = dict(cut)
            self.poly(lawn(x + 0.02, y + 0.02, w - 0.04, h - 0.04, inner), GRASS)
            north = self.p(x + w * 0.32, y + h * 0.28)
            rx, ry = w * 30 * self.scale, h * 12 * self.scale
            pad = 8 * self.scale
            layer = Image.new("RGBA", (int(rx * 2 + pad * 2), int(ry * 2 + pad * 2)), (0, 0, 0, 0))
            ImageDraw.Draw(layer).ellipse([pad, pad, pad + rx * 2, pad + ry * 2], fill=(*GRASS_LIT, 78))
            layer = layer.filter(ImageFilter.GaussianBlur(5 * self.scale))
            self.image.alpha_composite(layer, (int(north[0] - rx - pad), int(north[1] - ry - pad)))

        for x, y, w, h in PLAZAS:
            self.poly([self.p(x, y), self.p(x + w, y), self.p(x + w, y + h), self.p(x, y + h)], PLAZA)
            for i in range(1, int(w)):
                a, b = self.p(x + i, y), self.p(x + i, y + h)
                self.draw.line([a, b], fill=(217, 203, 182, 255), width=max(1, self.scale))
            for i in range(1, int(h)):
                a, b = self.p(x, y + i), self.p(x + w, y + i)
                self.draw.line([a, b], fill=(217, 203, 182, 255), width=max(1, self.scale))

        def ribbon(poly: list[tuple[float, float]], color: tuple[int, int, int]) -> None:
            side = len(poly) // 2
            left = [self.p(x, y) for x, y in poly[:side]]
            right = [self.p(x, y) for x, y in reversed(poly[side:])]
            for i in range(side - 1):
                self.poly([left[i], left[i + 1], right[i + 1], right[i]], color)

        ribbon(CANAL_BANK, lighten(PATH, 0.04))
        ribbon(CANAL, WATER)
        # A soft light streak on the water, from the upper-left key.
        near = self.p(2, 7.2)
        far = self.p(14, 9.2)
        streak = Image.new("RGBA", self.image.size, (0, 0, 0, 0))
        ImageDraw.Draw(streak).line([near, far], fill=(*WATER_LIT, 90), width=18 * self.scale)
        streak = streak.filter(ImageFilter.GaussianBlur(7 * self.scale))
        self.image.alpha_composite(streak)

    def prism(self, x: float, y: float, w: float, h: float, rise: float, color: tuple[int, int, int]) -> tuple[tuple[float, float], ...]:
        n, e, s, wv = self.p(x, y, rise), self.p(x + w, y, rise), self.p(x + w, y + h, rise), self.p(x, y + h, rise)
        g_w, g_s, g_e = self.p(x, y + h), self.p(x + w, y + h), self.p(x + w, y)
        foot = self.p(x + w * 0.55, y + h * 0.72)
        self.shadow(foot[0] + rise * 0.18, foot[1] + rise * 0.28, (w + h) * 16 * self.scale, (w + h) * 7 * self.scale, 88, 7 * self.scale)
        left = [g_w, g_s, s, wv]
        right = [g_e, g_s, s, e]
        top = [n, e, s, wv]
        self.poly(left, lighten(color, 0.08))
        self.poly(right, darken(color, 0.28))
        self.poly(top, lighten(color, 0.22))
        return top, left, right

    def on_face(self, face: list[tuple[float, float]], u: float, v: float) -> tuple[float, float]:
        bottom = (face[0][0] + (face[1][0] - face[0][0]) * u, face[0][1] + (face[1][1] - face[0][1]) * u)
        top = (face[3][0] + (face[2][0] - face[3][0]) * u, face[3][1] + (face[2][1] - face[3][1]) * u)
        return (bottom[0] + (top[0] - bottom[0]) * v, bottom[1] + (top[1] - bottom[1]) * v)

    def objects(self, places: list[tuple[str, float, float, float, float]]) -> None:
        depth = {
            "bench": 1, "canal_boat": 2, "canal_boat_blue": 2, "blue_bird": 2, "red_bird": 2,
            "gold_bird": 2, "bird_cyclist": 2, "shrub": 2, "red_bridge": 2, "red_bridge_near": 2,
            "round_tree": 3, "pointed_tree": 3, "yellow_bus": 3, "house_blue": 4, "house_gold": 4,
            "red_pavilion": 4, "color_frames": 5, "cafe_for_birds": 6, "red_tower": 8,
        }
        ordered = sorted(places, key=lambda item: (item[1] + item[2] + item[3] + item[4], depth.get(item[0], 3)))
        for name, x, y, w, h in ordered:
            getattr(self, f"draw_{name}", self.draw_unknown)(x, y, w, h)

    def draw_unknown(self, x: float, y: float, w: float, h: float) -> None:
        return

    def draw_round_tree(self, x: float, y: float, w: float, h: float) -> None:
        foot = self.p(x + 0.5, y + 0.5)
        radius = self.cell_px() * 0.46
        trunk_top = (foot[0], foot[1] - radius * 1.55)
        self.shadow(foot[0] + radius * 0.28, foot[1] + radius * 0.22, radius * 0.85, radius * 0.28, 96, 6 * self.scale)
        self.draw.polygon(
            [(trunk_top[0] - radius * 0.07, trunk_top[1]), (trunk_top[0] + radius * 0.09, trunk_top[1]),
             (trunk_top[0] + radius * 0.05, foot[1]), (trunk_top[0] - radius * 0.04, foot[1])],
            fill=(74, 50, 36, 255),
        )
        self.sphere(trunk_top[0] - radius * 0.02, trunk_top[1], radius, (60, 150, 72), (31, 90, 56), (246, 241, 212))

    def draw_pointed_tree(self, x: float, y: float, w: float, h: float) -> None:
        foot = self.p(x + 0.5, y + 0.5)
        height = self.cell_px() * 1.35
        self.shadow(foot[0] + 8 * self.scale, foot[1] + 4 * self.scale, height * 0.28, height * 0.12, 80, 5 * self.scale)
        tip = (foot[0], foot[1] - height)
        left = (foot[0] - height * 0.28, foot[1] - height * 0.18)
        right = (foot[0] + height * 0.28, foot[1] - height * 0.18)
        self.poly([tip, right, (foot[0] + height * 0.08, foot[1])], (18, 78, 58))
        self.poly([tip, left, (foot[0] - height * 0.04, foot[1])], lighten((24, 110, 74), 0.18))

    def draw_shrub(self, x: float, y: float, w: float, h: float) -> None:
        foot = self.p(x + 0.5, y + 0.62)
        radius = self.cell_px() * 0.22
        self.shadow(foot[0] + 4 * self.scale, foot[1] + 2 * self.scale, radius * 0.8, radius * 0.3, 70, 4 * self.scale)
        self.sphere(foot[0], foot[1] - radius * 0.8, radius, (47, 154, 98), (20, 92, 62), (186, 214, 120))

    def draw_bench(self, x: float, y: float, w: float, h: float) -> None:
        c = self.p(x + 0.5, y + 0.55)
        u = self.cell_px() * 0.16
        self.shadow(c[0] + 4 * self.scale, c[1] + 3 * self.scale, u * 1.4, u * 0.45, 70, 3 * self.scale)
        seat = (92, 64, 40)
        self.poly([(c[0] - u, c[1]), (c[0] + u * 0.2, c[1] - u * 0.45), (c[0] + u * 1.3, c[1]), (c[0] + u * 0.1, c[1] + u * 0.4)], darken(seat, 0.15))
        self.poly([(c[0] - u, c[1] - u * 0.15), (c[0] + u * 0.2, c[1] - u * 0.55), (c[0] + u * 1.2, c[1] - u * 0.12), (c[0], c[1])], lighten(seat, 0.12))

    def draw_bird(self, x: float, y: float, color: tuple[int, int, int]) -> None:
        c = self.p(x + 0.55, y + 0.55)
        r = self.cell_px() * 0.11
        self.shadow(c[0] + 2 * self.scale, c[1] + 2 * self.scale, r * 0.7, r * 0.28, 60, 2 * self.scale)
        self.sphere(c[0], c[1] - r, r, color, darken(color, 0.25), lighten(color, 0.45))

    def draw_blue_bird(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_bird(x, y, (46, 120, 210))

    def draw_red_bird(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_bird(x, y, (196, 64, 58))

    def draw_gold_bird(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_bird(x, y, (224, 168, 48))

    def draw_bird_cyclist(self, x: float, y: float, w: float, h: float) -> None:
        c = self.p(x + 0.55, y + 0.58)
        u = self.cell_px() * 0.16
        self.shadow(c[0], c[1] + 2 * self.scale, u * 1.1, u * 0.3, 60, 2 * self.scale)
        ink = (36, 40, 44, 255)
        for dx in (-u * 0.55, u * 0.45):
            self.draw.ellipse([c[0] + dx - u * 0.28, c[1] - u * 0.28, c[0] + dx + u * 0.28, c[1] + u * 0.28], outline=ink, width=max(2, self.scale))
        self.draw.line([(c[0] - u * 0.55, c[1]), (c[0] + u * 0.45, c[1]), (c[0], c[1] - u * 0.7), (c[0] - u * 0.55, c[1])], fill=ink, width=max(2, self.scale))
        self.sphere(c[0] - u * 0.05, c[1] - u * 0.85, u * 0.34, (46, 120, 210), (24, 70, 140), (180, 214, 245))

    def draw_boat(self, x: float, y: float, color: tuple[int, int, int]) -> None:
        c = self.p(x + 0.5, y + 0.55)
        u = self.cell_px() * 0.34
        self.poly([(c[0] - u, c[1]), (c[0] + u * 0.9, c[1] - u * 0.28), (c[0] + u * 0.7, c[1] + u * 0.18), (c[0] - u * 0.7, c[1] + u * 0.28)], darken(color, 0.35))
        self.poly([(c[0] - u * 0.15, c[1] - u * 0.15), (c[0] + u * 0.35, c[1] - u * 0.32), (c[0] + u * 0.28, c[1] - u * 0.02)], lighten(color, 0.2))

    def draw_canal_boat(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_boat(x, y, (28, 42, 56))

    def draw_canal_boat_blue(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_boat(x, y, (36, 78, 150))

    def draw_red_bridge(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_bridge(x, y, w, h)

    def draw_red_bridge_near(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_bridge(x, y, w, h)

    def draw_bridge(self, x: float, y: float, w: float, h: float) -> None:
        rise = self.cell_px() * 0.55
        red = (198, 58, 52)
        self.prism(x + 0.02, y + 0.18, 0.42, h * 0.62, rise, red)
        self.prism(x + w - 0.44, y + 0.18, 0.42, h * 0.62, rise, red)
        deck = rise * 0.92
        thick = rise * 0.34
        top, _left, right = self.prism(x, y + 0.22, w, h * 0.5, deck, red)
        # Cut an arch through the near face so the canal reads underneath.
        face_low = [self.p(x + 0.28, y + h * 0.62, deck - thick), self.p(x + w - 0.28, y + h * 0.62, deck - thick)]
        crown = self.p(x + w * 0.5, y + h * 0.48, deck * 0.72)
        arch = [face_low[0]]
        for step in range(1, 8):
            t = step / 8
            arch.append((
                face_low[0][0] + (face_low[1][0] - face_low[0][0]) * t,
                face_low[0][1] + (face_low[1][1] - face_low[0][1]) * t - (crown[1] - face_low[0][1]) * (1 - (t * 2 - 1) ** 2) * 0.15
                - abs(crown[1] - max(face_low[0][1], face_low[1][1])) * (1 - (t * 2 - 1) ** 2),
            ))
        arch.append(face_low[1])
        self.poly(arch, darken(WATER, 0.08))
        self.poly(top, lighten(red, 0.18))
        self.poly(right, darken(red, 0.2))

    def draw_house(self, x: float, y: float, roof: tuple[int, int, int]) -> None:
        rise = self.cell_px() * 0.72
        wall = (246, 241, 230)
        self.prism(x + 0.15, y + 0.15, 1.7, 1.7, rise, wall)
        ridge = self.cell_px() * 0.38
        n = self.p(x + 0.25, y + 0.25, rise + ridge)
        e = self.p(x + 1.75, y + 0.25, rise + ridge * 0.15)
        s = self.p(x + 1.75, y + 1.75, rise)
        wv = self.p(x + 0.25, y + 1.75, rise + ridge * 0.2)
        self.poly([wv, s, e], darken(roof, 0.22))
        self.poly([n, e, wv], lighten(roof, 0.12))
        door = self.p(x + 0.7, y + 1.35, rise * 0.25)
        self.draw.rectangle([door[0], door[1], door[0] + 8 * self.scale, door[1] + 16 * self.scale], fill=(120, 78, 48, 255))

    def draw_house_blue(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_house(x, y, (42, 92, 176))

    def draw_house_gold(self, x: float, y: float, w: float, h: float) -> None:
        self.draw_house(x, y, (239, 176, 13))

    def draw_red_pavilion(self, x: float, y: float, w: float, h: float) -> None:
        rise = self.cell_px() * 0.85
        red = (196, 52, 48)
        top, _left, _right = self.prism(x + 0.25, y + 0.2, 1.5, 1.5, rise * 0.45, lighten(red, 0.05))
        n, e, s, wv = top
        tip = self.p(x + 1.0, y + 0.85, rise)
        self.poly([tip, e, s], darken(red, 0.2))
        self.poly([tip, wv, s], lighten(red, 0.08))
        self.poly([tip, n, e], lighten(red, 0.2))
        mouth = [self.p(x + 0.7, y + 1.35), self.p(x + 1.35, y + 1.15), self.p(x + 1.05, y + 0.9, rise * 0.35)]
        self.poly(mouth, (28, 24, 28))

    def draw_yellow_bus(self, x: float, y: float, w: float, h: float) -> None:
        rise = self.cell_px() * 0.48
        yellow = (240, 186, 32)
        self.prism(x + 0.08, y + 0.12, w - 0.16, h - 0.2, rise, yellow)
        glass = (186, 214, 228)
        a = self.p(x + 0.35, y + h * 0.55, rise * 0.55)
        b = self.p(x + w * 0.75, y + h * 0.4, rise * 0.55)
        self.draw.line([a, b], fill=(*glass, 255), width=max(3, 3 * self.scale))
        for t in (0.3, 0.7):
            wheel = self.p(x + w * t, y + h * 0.8)
            self.draw.ellipse([wheel[0] - 5 * self.scale, wheel[1] - 4 * self.scale, wheel[0] + 5 * self.scale, wheel[1] + 4 * self.scale], fill=(36, 38, 42, 255))

    def draw_color_frames(self, x: float, y: float, w: float, h: float) -> None:
        self.prism(x + 0.02, y + 0.12, 1.95, 1.75, self.cell_px() * 0.1, (244, 239, 228))
        frames = [((0.08, 0.95), (70, 196, 206)), ((0.62, 0.48), (198, 58, 52)), ((1.15, 0.08), (48, 86, 196))]
        for (ox, oy), color in frames:
            rise = self.cell_px() * 1.15
            _top, left, _right = self.prism(x + ox, y + oy, 0.62, 0.42, rise, color)
            opening = [self.on_face(left, u, v) for u, v in ((0.22, 0.18), (0.78, 0.18), (0.78, 0.78), (0.22, 0.78))]
            self.poly(opening, lighten(PLAZA, 0.04))

    def draw_red_tower(self, x: float, y: float, w: float, h: float) -> None:
        rise = self.cell_px() * 2.15
        red = (206, 54, 48)
        top, left, right = self.prism(x + 0.2, y + 0.15, 1.6, 1.6, rise, red)
        window = (255, 214, 130)
        for face, shaded in ((left, False), (right, True)):
            for row in range(4):
                for col in (0.32, 0.62):
                    p0 = self.on_face(face, col, 0.22 + row * 0.16)
                    color = darken(window, 0.2) if shaded else lighten(window, 0.08)
                    self.draw.rectangle([p0[0] - 4 * self.scale, p0[1] - 5 * self.scale, p0[0] + 4 * self.scale, p0[1] + 5 * self.scale], fill=(*color, 255))
        for u, v in ((0.35, 0.4), (0.62, 0.55)):
            spot = self.on_face(top, u, v)
            self.poly([(spot[0], spot[1] - 12 * self.scale), (spot[0] + 7 * self.scale, spot[1] + 4 * self.scale), (spot[0] - 7 * self.scale, spot[1] + 4 * self.scale)], (28, 122, 78))

    def draw_cafe_for_birds(self, x: float, y: float, w: float, h: float) -> None:
        rise = self.cell_px() * 1.05
        blue = (21, 72, 155)
        top, left, right = self.prism(x + 0.15, y + 0.1, 2.7, 2.7, rise, blue)
        n, e, s, wv = top
        gold = (239, 176, 13)
        for start, end in ((wv, n), (n, e)):
            for i in range(4):
                t0, t1, tip_t = i / 4, (i + 1) / 4, (i + 0.5) / 4
                a = (start[0] + (end[0] - start[0]) * t0, start[1] + (end[1] - start[1]) * t0)
                b = (start[0] + (end[0] - start[0]) * t1, start[1] + (end[1] - start[1]) * t1)
                tip = (start[0] + (end[0] - start[0]) * tip_t, start[1] + (end[1] - start[1]) * tip_t - self.cell_px() * 0.28)
                self.poly([a, tip, b], lighten(gold, 0.08) if i % 2 == 0 else gold)
        # Striped awning on the lit wall, and the fish on that same face.
        band = self.cell_px() * 0.16
        for i in range(7):
            u0, u1 = i / 7, (i + 1) / 7
            color = (255, 250, 242) if i % 2 == 0 else gold
            self.poly([
                self.on_face(left, u0, 0.58), self.on_face(left, u1, 0.58),
                self.on_face(left, u1, 0.58 - band / rise), self.on_face(left, u0, 0.58 - band / rise),
            ], color)
        fish = self.on_face(left, 0.62, 0.72)
        self.draw.ellipse([fish[0] - 18 * self.scale, fish[1] - 9 * self.scale, fish[0] + 16 * self.scale, fish[1] + 9 * self.scale], fill=(*gold, 255))
        self.poly([(fish[0] - 14 * self.scale, fish[1]), (fish[0] - 26 * self.scale, fish[1] - 8 * self.scale), (fish[0] - 26 * self.scale, fish[1] + 8 * self.scale)], gold)
        for i, bird in enumerate(((46, 120, 210), (196, 64, 58), (224, 168, 48), (46, 120, 210), (196, 64, 58))):
            spot = self.on_face(left, 0.18 + i * 0.14, 0.16)
            self.sphere(spot[0], spot[1], self.cell_px() * 0.07, bird, darken(bird, 0.2), lighten(bird, 0.35))

    def finish(self) -> Image.Image:
        # One warm key from the upper left, kept light so landmark colors stay readable.
        wash = Image.new("RGBA", self.image.size, (0, 0, 0, 0))
        span = max(self.image.size)
        ImageDraw.Draw(wash).ellipse([-span * 0.2, -span * 0.35, span * 0.85, span * 0.7], fill=(255, 236, 196, 28))
        self.image.alpha_composite(wash.filter(ImageFilter.GaussianBlur(40 * self.scale)))
        rgb = self.image.convert("RGB")
        small = rgb.resize((self.view_w, self.view_h), Image.Resampling.LANCZOS)
        arr = np.array(small).astype(np.int16)
        noise = np.random.default_rng(7).integers(-6, 7, size=arr.shape, dtype=np.int16)
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
        return Image.fromarray(arr, "RGB")


def main() -> None:
    places = load_places()
    assert sum(1 for name, *_ in places if name == "round_tree") == 31
    desktop = Study(1280, 720)
    desktop.ground()
    desktop.objects(places)
    wide = desktop.finish()
    wide.save(OUT / "study-1280x720.png")
    narrow = Study(390, 844)
    narrow.ground()
    narrow.objects(places)
    tall = narrow.finish()
    tall.save(OUT / "study-390x844.png")
    print("wrote", OUT / "study-1280x720.png", OUT / "study-390x844.png")


if __name__ == "__main__":
    main()
