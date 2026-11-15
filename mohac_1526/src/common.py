"""Ortak yardımcılar: yollar, fontlar, renkler, gürültü, kamera (perspektif homografi)."""
import os
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FONTS = os.path.join(ASSETS, "fonts")
BUILD = os.path.join(ROOT, "build")
os.makedirs(BUILD, exist_ok=True)

W, H = 1920, 1080
FPS = 30

FONT_TITLE = os.path.join(FONTS, "Cinzel-Bold.ttf")
FONT_TITLE_R = os.path.join(FONTS, "Cinzel-Regular.ttf")
FONT_BODY = os.path.join(FONTS, "EBGaramond-Regular.ttf")
FONT_BODY_SB = os.path.join(FONTS, "EBGaramond-SemiBold.ttf")
FONT_ITALIC = os.path.join(FONTS, "EBGaramond-Italic.ttf")

# Renk paleti (eski harita)
PAPER = np.array([226, 208, 166], np.float32)
PAPER_DARK = np.array([196, 168, 118], np.float32)
SEA = np.array([176, 184, 160], np.float32)
INK = (58, 40, 26)
OTTOMAN = (150, 32, 28)
OTTOMAN_LIGHT = (196, 70, 52)
HUNGARY = (34, 62, 110)
HUNGARY_LIGHT = (70, 110, 165)
GOLD = (196, 158, 76)


def fbm(shape, octaves=6, seed=0, base=4):
    """Çok oktavlı değer gürültüsü, 0..1."""
    rng = np.random.default_rng(seed)
    h, w = shape
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        gh, gw = max(2, int(n * h / max(h, w)) + 2), max(2, int(n * w / max(h, w)) + 2)
        g = rng.random((gh, gw)).astype(np.float32)
        z = ndimage.zoom(g, (h / gh, w / gw), order=3)[:h, :w]
        if z.shape != shape:
            z = np.pad(z, ((0, h - z.shape[0]), (0, w - z.shape[1])), mode="edge")
        out += amp * z
        tot += amp
        amp *= 0.5
    out /= tot
    out = (out - out.min()) / (out.max() - out.min() + 1e-6)
    return out


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def ease_io(t):
    t = min(1.0, max(0.0, t))
    return 0.5 - 0.5 * np.cos(np.pi * t)


def camera_matrix(cx, cy, zoom, tilt=0.0, rot=0.0, d=1800.0):
    """Dünya(doku pikseli) -> ekran 3x3 homografi.
    cx,cy: ekran merkezine gelen dünya noktası; zoom: merkezde ekran px / dünya px;
    tilt: haritanın yatay eksende yatırılma açısı (radyan) -> hafif 3B görünüm."""
    T = np.array([[1, 0, -cx], [0, 1, -cy], [0, 0, 1]], np.float64)
    S = np.diag([zoom, zoom, 1.0])
    c, s = np.cos(rot), np.sin(rot)
    R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], np.float64)
    ct, st = np.cos(tilt), np.sin(tilt)
    # x' = d*x/(d + y*st), y' = d*y*ct/(d + y*st)
    P = np.array([[d, 0, 0], [0, d * ct, 0], [0, st, d]], np.float64)
    C = np.array([[1, 0, W / 2], [0, 1, H / 2], [0, 0, 1]], np.float64)
    M = C @ P @ R @ S @ T
    return M / M[2, 2]


def project(M, x, y):
    v = M @ np.array([x, y, 1.0])
    return v[0] / v[2], v[1] / v[2]


def local_scale(M, x, y):
    x0, y0 = project(M, x, y)
    x1, y1 = project(M, x + 1, y)
    return float(np.hypot(x1 - x0, y1 - y0))
