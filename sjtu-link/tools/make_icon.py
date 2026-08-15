# -*- coding: utf-8 -*-
"""
生成「交我导」桌面版图标：金环 + 红色「交」字 + 红色四角星（仿原站 favicon）。
输出 icon.ico（多尺寸）与 icon.png（256px）到应用根目录。
依赖：pip install pillow
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(TOOLS_DIR)

GOLD = (216, 182, 106, 255)
RED = (157, 18, 51, 255)

FONT_CANDIDATES = [
    r'C:\Windows\Fonts\simsun.ttc',   # 宋体
    r'C:\Windows\Fonts\simhei.ttf',   # 黑体
    r'C:\Windows\Fonts\msyh.ttc',     # 微软雅黑
    r'C:\Windows\Fonts\arial.ttf',
]


def load_font(size):
    for f in FONT_CANDIDATES:
        if os.path.isfile(f):
            try:
                return ImageFont.truetype(f, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size / 2.0
    r = size * 0.42
    ring_w = max(2, int(size * 0.085))
    d.ellipse([c - r, c - r, c + r, c + r], outline=GOLD, width=ring_w)

    font = load_font(int(size * 0.50))
    bbox = d.textbbox((0, 0), '交', font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text((c - tw / 2.0 - bbox[0], c - th / 2.0 - bbox[1] + size * 0.04),
           '交', font=font, fill=RED)

    # 右上角四角星
    cx, cy = size * 0.78, size * 0.24
    pts = []
    for i in range(8):
        ang = math.pi / 4.0 * i
        rad = size * 0.10 if i % 2 == 0 else size * 0.028
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, fill=RED)
    return img


def main():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    imgs = [draw_icon(s) for s in sizes]
    png_path = os.path.join(APP_DIR, 'icon.png')
    ico_path = os.path.join(APP_DIR, 'icon.ico')
    imgs[-1].save(png_path)
    imgs[-1].save(ico_path, format='ICO',
                  sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    print('written:', ico_path, png_path)


if __name__ == '__main__':
    main()
