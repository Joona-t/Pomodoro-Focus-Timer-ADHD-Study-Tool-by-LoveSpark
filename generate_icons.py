#!/usr/bin/env python3
"""
LoveSpark Focus — generate_icons.py
Generates pink clock face icons at 16, 48, and 128px using Pillow.

Install dependency:
    pip install Pillow

Run:
    python3 generate_icons.py
"""

import os
import math
from PIL import Image, ImageDraw

# ── Color palette ──────────────────────────────────────────────────────────
HOT_PINK   = (255, 105, 180, 255)   # #FF69B4  — clock body
LIGHT_PINK = (255, 208, 232, 255)   # #FFD0E8  — sparkle
FACE_WHITE = (255, 255, 255, 230)   # white clock face (slightly transparent)
HAND_WHITE = (255, 255, 255, 255)   # clock hands
GLOW_PINK  = (255, 105, 180, 60)    # soft glow halo


def draw_sparkle(draw, cx, cy, r, color, points=4):
    """Draw a small multi-point star sparkle at (cx, cy)."""
    pts = []
    for i in range(points * 2):
        angle = math.radians(i * (360 / (points * 2)) - 90)
        radius = r if i % 2 == 0 else r * 0.35
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(pts, fill=color)


def draw_clock_hand(draw, cx, cy, angle_deg, length, width, color):
    """Draw a clock hand from center outward at given angle."""
    rad = math.radians(angle_deg - 90)  # 0 deg = 12 o'clock
    end_x = cx + length * math.cos(rad)
    end_y = cy + length * math.sin(rad)

    # Draw as a thick line with round ends
    draw.line([(cx, cy), (end_x, end_y)], fill=color, width=width)
    # Round cap at end
    r = width / 2
    draw.ellipse([end_x - r, end_y - r, end_x + r, end_y + r], fill=color)


def generate_icon(size):
    """Create a single RGBA icon at the given pixel size."""
    img  = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size / 2, size / 2
    margin = size * 0.06

    # ── Outer glow (soft, larger circle) ────────────────────────────────────
    if size >= 48:
        glow_r = cx - margin * 0.2
        draw.ellipse(
            [cx - glow_r - 3, cy - glow_r - 3, cx + glow_r + 3, cy + glow_r + 3],
            fill=GLOW_PINK
        )

    # ── Main clock circle (hot pink body) ───────────────────────────────────
    outer_r = cx - margin
    draw.ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        fill=HOT_PINK
    )

    if size >= 48:
        # ── Inner white clock face ───────────────────────────────────────────
        face_r = outer_r * 0.76
        draw.ellipse(
            [cx - face_r, cy - face_r, cx + face_r, cy + face_r],
            fill=FACE_WHITE
        )

        # ── Clock hands at 10:10 position ───────────────────────────────────
        # 10:10 means: hour hand at 10 (300°), minute hand at 2 (60°)
        # Using the classic display angle (hour hand between 10 and 11)
        hour_length   = face_r * 0.52
        minute_length = face_r * 0.68
        hand_width_h  = max(2, int(size * 0.045))
        hand_width_m  = max(1, int(size * 0.032))

        # Hour hand: points to "10" = 300 degrees
        draw_clock_hand(draw, cx, cy, 300, hour_length, hand_width_h, HOT_PINK)
        # Minute hand: points to "2" = 60 degrees
        draw_clock_hand(draw, cx, cy, 60, minute_length, hand_width_m, HOT_PINK)

        # Center dot
        center_r = max(2, size * 0.04)
        draw.ellipse(
            [cx - center_r, cy - center_r, cx + center_r, cy + center_r],
            fill=HOT_PINK
        )

        # ── Sparkle accent (top-right of clock) ────────────────────────────
        sp_r  = outer_r * 0.16
        sp_cx = cx + outer_r * 0.60
        sp_cy = cy - outer_r * 0.60
        draw_sparkle(draw, sp_cx, sp_cy, sp_r, LIGHT_PINK, points=4)

        # Tiny companion sparkle
        if size >= 128:
            draw_sparkle(draw, sp_cx - size * 0.08, sp_cy + size * 0.12,
                        sp_r * 0.45, LIGHT_PINK, points=4)

    else:
        # ── 16px: simplified clock — just body + two minimal hands ──────────
        hand_r = outer_r * 0.52
        # Hour: 10 o'clock
        draw_clock_hand(draw, cx, cy, 300, hand_r * 0.65, max(1, int(size * 0.08)), FACE_WHITE)
        # Minute: 2 o'clock
        draw_clock_hand(draw, cx, cy, 60, hand_r * 0.85, max(1, int(size * 0.06)), FACE_WHITE)

    return img


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
    os.makedirs(out_dir, exist_ok=True)

    sizes = [16, 48, 128]
    for size in sizes:
        img  = generate_icon(size)
        path = os.path.join(out_dir, f'icon-{size}.png')
        img.save(path, 'PNG', optimize=True)
        print(f'  Generated {path}  ({size}x{size})')

    print('\nDone! Icons saved to icons/')


if __name__ == '__main__':
    main()
