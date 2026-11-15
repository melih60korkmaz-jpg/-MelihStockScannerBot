"""Mohaç 1526 belgeseli – tam render.
Kullanım: python3 render.py [--preview t1 t2 ...] [--jobs 4]"""
import json, os, sys, subprocess
import numpy as np
import skia
from PIL import Image
from common import *
from gfx import *

TL = json.load(open(os.path.join(BUILD, "timeline.json")))
SC = {s["id"]: s for s in TL["scenes"]}
TOTAL = TL["total"]
EGEO = json.load(open(os.path.join(BUILD, "europe_geo.json")))
BGEO = json.load(open(os.path.join(BUILD, "battlefield_geo.json")))
CITY = EGEO["cities"]


def ll(lon, lat):
    return ((lon - EGEO["lon0"]) * EGEO["kx"], (EGEO["lat1"] - lat) * EGEO["ky"])


def T(scene, sent=None, frac=0.0):
    """Sahne/cümleye bağlı mutlak zaman. sent=None -> sahne başı; sent=-1 -> sahne sonu."""
    s = SC[scene]
    if sent is None:
        return s["start"] + frac
    if sent == -1:
        return s["end"] + frac
    a, b = s["sentences"][sent]
    return a + (b - a) * frac


def env(t, a, b, fi=0.5, fo=0.5):
    """a..b arası görünürlük (yumuşak giriş/çıkış)."""
    return ease((t - a) / fi) * (1 - ease((t - (b - fo)) / fo))


# ------------------------------------------------------------------ KAMERA
# (zaman, harita, cx, cy, zoom, tilt, rot)
def E(lon, lat):
    return ll(lon, lat)


MO = CITY["Mohaç"]
CAM = [
    (0.0, "eu", *E(16.5, 47.6), 0.50, 0.50, -0.03),
    (T(1, 1), "eu", *E(19.5, 46.4), 0.52, 0.52, -0.02),
    (T(1, 2), "eu", *E(24.0, 43.6), 0.56, 0.55, 0.0),
    (T(1, 3), "eu", *E(19.8, 46.9), 0.84, 0.56, 0.0),
    (T(1, 4), "eu", *E(19.3, 46.6), 0.92, 0.58, 0.0),
    (T(1, -1), "eu", *E(19.0, 46.4), 1.02, 0.58, 0.0),
    (T(2, 0, 0.1), "eu", *E(25.0, 42.6), 0.90, 0.58, 0.0),
    (T(2, 0, 0.95), "eu", *E(22.0, 43.9), 1.05, 0.58, 0.0),
    (T(2, 1, 0.5), "eu", *E(19.4, 45.35), 1.75, 0.60, 0.0),
    (T(2, 2, 0.4), "eu", *E(19.0, 46.6), 1.35, 0.58, 0.0),
    (T(2, 3, 0.3), "eu", *E(20.4, 46.3), 1.05, 0.56, 0.0),
    (T(2, -1, -1.0), "eu", MO[0], MO[1] + 10, 2.4, 0.62, 0.0),
    (T(2, -1, 0.0), "eu", MO[0], MO[1] + 10, 5.2, 0.66, 0.0),
    (T(3, None, 0.0), "bf", 2400, 1650, 0.40, 0.62, 0.0),
    (T(3, 1, 0.3), "bf", 2300, 1850, 0.42, 0.62, 0.0),
    (T(3, 2, 0.5), "bf", 2150, 1600, 0.58, 0.60, -0.02),
    (T(3, 3, 0.5), "bf", 2300, 2150, 0.58, 0.60, 0.02),
    (T(3, 4, 0.5), "bf", 2700, 1900, 0.50, 0.60, 0.02),
    (T(3, 5, 0.8), "bf", 2250, 1850, 0.42, 0.62, 0.0),
    (T(4, 0, 0.6), "bf", 1650, 1850, 0.62, 0.62, -0.03),
    (T(4, 1, 0.6), "bf", 1600, 2050, 0.85, 0.60, -0.04),
    (T(4, 2, 0.6), "bf", 1750, 2050, 0.70, 0.60, -0.02),
    (T(4, 3, 0.7), "bf", 2200, 1850, 0.78, 0.60, 0.0),
    (T(4, 4, 0.6), "bf", 2350, 2150, 1.02, 0.58, 0.0),
    (T(4, 5, 0.8), "bf", 2380, 2180, 1.10, 0.58, 0.01),
    (T(4, 6, 0.6), "bf", 2650, 1950, 0.62, 0.60, 0.03),
    (T(4, 7, 0.9), "bf", 1900, 1750, 0.40, 0.62, 0.0),
    (T(5, 0, 0.8), "bf", 2600, 1550, 0.46, 0.62, 0.0),
    (T(5, 1, 0.6), "bf", 3250, 1550, 0.62, 0.60, 0.02),
    (T(5, 2, 0.8), "bf", 2850, 1250, 0.70, 0.60, 0.02),
    (T(5, 3, 0.7), "bf", 3150, 1020, 1.00, 0.58, 0.0),
    (T(5, -1, 0.0), "bf", 3050, 1100, 0.85, 0.58, 0.0),
    (T(6, 0, 0.9), "bf", 2400, 1650, 0.38, 0.64, 0.0),
    (T(6, 0, 0.9) + 0.01, "eu", *E(19.6, 46.9), 1.25, 0.58, 0.0),
    (T(6, 1, 0.9), "eu", *E(20.3, 47.2), 0.92, 0.56, 0.0),
    (TOTAL, "eu", *E(19.4, 46.8), 0.80, 0.55, 0.0),
]
XFADES = [(T(2, -1, -0.9), T(3, None, 0.9)), (T(6, 0, 0.35), T(6, 0, 1.0) + 0.4)]


def cam_params(t):
    for i in range(len(CAM) - 1):
        a, b = CAM[i], CAM[i + 1]
        if a[0] <= t <= b[0]:
            if a[1] != b[1]:
                return (b if t > a[0] + (b[0] - a[0]) * 0.5 else a)[1:]
            u = ease_io((t - a[0]) / max(b[0] - a[0], 1e-6))
            z = a[4] * (b[4] / a[4]) ** u
            return (a[1], a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u, z, a[5] + (b[5] - a[5]) * u, a[6] + (b[6] - a[6]) * u)
    return CAM[-1][1:]


def cam_for_map(t, m):
    """Belirli harita için kamera: geçişlerde diğer haritanın kamerası tahmin edilir."""
    p = cam_params(t)
    if p[0] == m:
        return p
    # en yakın aynı-harita anahtar karesi (geçiş süresi boyunca hafif devam eden hareket)
    if m == "bf":
        if t < T(3):
            return ("bf", 2400, 1650, 0.40 * (0.82 + 0.18 * ease((t - XFADES[0][0]) / 1.8)), 0.62, 0.0)
        return ("bf", 2400, 1650, 0.38 * (1 - 0.15 * ease((t - XFADES[1][0]) / 1.5)), 0.64, 0.0)
    else:
        if t < T(4):
            return ("eu", MO[0], MO[1] + 10, 5.2 * (1 + 0.6 * ease((t - T(2, -1)) / 1.0)), 0.66, 0.0)
        return ("eu", *E(19.6, 46.9), 1.25 * (1 + 0.25 * (1 - ease((t - XFADES[1][0]) / 1.5))), 0.58, 0.0)


def map_alphas(t):
    for a, b in XFADES:
        if a <= t <= b:
            u = ease_io((t - a) / (b - a))
            first = "eu" if a < T(4) else "bf"
            second = "bf" if first == "eu" else "eu"
            return [(first, 1.0), (second, u)]
    return [(cam_params(t)[0], 1.0)]


# ------------------------------------------------------------------ BİRLİKLER
SOUTH, NORTH = np.pi / 2, -np.pi / 2
U = {}


def unit(uid, side, typ, label, keys, flag=False, w=170, h=64, labeled=None):
    U[uid] = dict(id=uid, side=side, type=typ, label=label, keys=sorted(keys, key=lambda k: k[0]), flag=flag, w=w, h=h,
                  labeled=labeled or [])


t3 = T(3, 1, 0.0)
appear_h, appear_o = T(3, 1, 0.1), T(3, 1, 0.45)
S4 = lambda i, f=0.0: T(4, i, f)
S5 = lambda i, f=0.0: T(5, i, f)
END = TOTAL + 1
# keys: (t, x, y, alpha, hit)
unit("H1", "H", "hcav", "Ağır süvari – Tomori Pál", [(appear_h, 1250, 1650, 1, 0), (S4(0, 0.1), 1250, 1650, 1, 0), (S4(1, 0.2), 1330, 1985, 1, 0),
     (S4(2, 0.8), 1450, 2140, 1, 0), (S4(7, 0.2), 1460, 2130, 1, 0.3), (S4(7, 0.9), 1420, 2080, 1, 0.6), (S5(0, 0.9), 1700, 1500, 0.6, 0.6), (S5(1, 0.8), 2300, 1250, 0.0, 0.6)],
     labeled=[(T(3, 2, 0.0), T(4, 1, 1.0))])
unit("H2", "H", "hcav", "", [(appear_h, 1560, 1650, 1, 0), (S4(0, 0.15), 1560, 1650, 1, 0), (S4(1, 0.3), 1690, 1965, 1, 0), (S4(2, 0.8), 1800, 2120, 1, 0),
     (S4(4, 0.6), 1950, 2170, 1, 0.3), (S4(5, 0.8), 1930, 2150, 1, 0.9), (S5(0, 0.9), 2400, 1450, 0.5, 0.8), (S5(1, 0.8), 3500, 1500, 0.0, 0.8)])
unit("H3", "H", "inf", "Piyade", [(appear_h, 1900, 1690, 1, 0), (S4(2, 0.0), 1900, 1690, 1, 0), (S4(3, 0.9), 2050, 1990, 1, 0),
     (S4(4, 0.7), 2120, 2110, 1, 0.3), (S4(5, 0.9), 2110, 2100, 1, 1.0), (S5(0, 0.9), 2600, 1700, 0.5, 1), (S5(1, 0.9), 3650, 1750, 0.0, 1)],
     labeled=[(T(3, 2, 0.1), T(3, 3, 0.2))])
unit("H4", "H", "inf", "", [(appear_h, 2200, 1690, 1, 0), (S4(2, 0.0), 2200, 1690, 1, 0), (S4(3, 0.9), 2350, 1990, 1, 0),
     (S4(4, 0.7), 2420, 2110, 1, 0.3), (S4(5, 0.9), 2420, 2100, 1, 1.0), (S5(0, 0.9), 2950, 1600, 0.5, 1), (S5(1, 0.9), 3700, 1450, 0.0, 1)])
unit("H5", "H", "hcav", "", [(appear_h, 2560, 1650, 1, 0), (S4(3, 0.0), 2560, 1650, 1, 0), (S4(3, 0.9), 2720, 1830, 1, 0),
     (S4(6, 0.6), 2700, 1850, 1, 0.6), (S5(0, 0.9), 3150, 1400, 0.5, 0.7), (S5(1, 0.8), 3700, 1250, 0.0, 0.7)])
unit("H6", "H", "hcav", "Sol kanat", [(appear_h, 2870, 1650, 1, 0), (S4(6, 0.2), 2870, 1660, 1, 0), (S4(6, 0.9), 2830, 1700, 1, 0.6),
     (S5(0, 0.9), 3300, 1250, 0.5, 0.7), (S5(1, 0.8), 3600, 1050, 0.0, 0.7)])
unit("HA1", "H", "art", "", [(appear_h, 2050, 1820, 1, 0), (S4(4, 0.5), 2050, 1820, 1, 0), (S5(0, 0.5), 2050, 1820, 0.0, 1)], w=150, h=64)
unit("HA2", "H", "art", "Macar topları", [(appear_h, 2420, 1820, 1, 0), (S4(4, 0.5), 2420, 1820, 1, 0), (S5(0, 0.5), 2420, 1820, 0.0, 1)], w=150, h=64,
     labeled=[(T(3, 2, 0.2), T(3, 3, 0.2))])
unit("H7", "H", "hcav", "", [(appear_h, 1650, 1450, 1, 0), (S4(3, 0.0), 1650, 1450, 1, 0), (S4(3, 0.95), 1820, 1950, 1, 0),
     (S4(5, 0.9), 1800, 1930, 1, 0.6), (S5(0, 0.9), 2100, 1250, 0.4, 0.7), (S5(1, 0.8), 2600, 1000, 0.0, 0.7)])
unit("H8", "H", "hcav", "", [(appear_h, 2470, 1450, 1, 0), (S4(3, 0.0), 2470, 1450, 1, 0), (S4(3, 0.95), 2580, 1950, 1, 0),
     (S4(5, 0.9), 2560, 1930, 1, 0.6), (S5(0, 0.9), 2900, 1300, 0.4, 0.7), (S5(1, 0.8), 3550, 1300, 0.0, 0.7)])
unit("K", "H", "hcav", "II. Lajos", [(appear_h, 2060, 1430, 1, 0), (S4(3, 0.0), 2060, 1430, 1, 0), (S4(3, 0.95), 2230, 1900, 1, 0),
     (S4(5, 0.9), 2230, 1890, 1, 0.4), (S5(1, 0.9), 2250, 1800, 1, 0.4), (S5(2, 0.2), 2400, 1600, 1, 0.3), (S5(2, 0.95), 2800, 1280, 1, 0.2),
     (S5(3, 0.6), 3130, 1010, 1, 0.2), (S5(4, 0.3), 3150, 1000, 0.0, 0.2)], flag=True,
     labeled=[(T(3, 1, 0.5), T(3, 2, 0.4)), (S4(3, 0.0), S4(4, 0.4)), (S5(2, 0.0), S5(3, 0.9))])
unit("CAMP", "H", "camp", "Macar ordugâhı", [(appear_h, 3250, 1260, 1, 0), (S5(1, 0.5), 3250, 1260, 1, 0), (S5(3, 0.0), 3250, 1260, 0.0, 0)], w=240, h=90,
     labeled=[(T(3, 2, 0.3), T(3, 3, 0.1))])

unit("R1", "O", "cav", "Rumeli – İbrahim Paşa", [(appear_o, 1350, 2150, 1, 0), (S4(1, 0.4), 1350, 2150, 1, 0), (S4(1, 0.9), 1330, 2170, 1, 0.6),
     (S4(2, 0.9), 900, 2330, 1, 0.2), (S4(6, 0.0), 900, 2330, 1, 0), (S4(7, 0.9), 1150, 2150, 1, 0), (S5(0, 0.9), 1500, 1700, 1, 0), (S5(-1 if False else 4, 0.9), 1700, 1500, 1, 0)],
     labeled=[(T(3, 3, 0.0), T(4, 2, 0.9))])
unit("R2", "O", "cav", "", [(appear_o, 1700, 2120, 1, 0), (S4(1, 0.4), 1700, 2120, 1, 0), (S4(1, 0.9), 1720, 2140, 1, 0.6),
     (S4(2, 0.9), 1450, 2420, 1, 0.2), (S4(6, 0.0), 1450, 2420, 1, 0), (S4(7, 0.9), 1650, 2250, 1, 0), (S5(0, 0.9), 1950, 1750, 1, 0)])
unit("R3", "O", "cav", "", [(appear_o, 2010, 2110, 1, 0), (S4(2, 0.1), 2010, 2110, 1, 0), (S4(2, 0.9), 2950, 2330, 1, 0),
     (S4(6, 0.0), 2950, 2330, 1, 0), (S4(6, 0.9), 2900, 2100, 1, 0), (S5(0, 0.9), 3100, 1700, 1, 0)])
unit("A1", "O", "cav", "Anadolu – Behram Paşa", [(appear_o, 2700, 2180, 1, 0), (S4(6, 0.0), 2700, 2180, 1, 0), (S4(6, 0.9), 2560, 2030, 1, 0),
     (S5(0, 0.9), 2700, 1650, 1, 0), (S5(2, 0.9), 2900, 1450, 1, 0)], labeled=[(T(3, 3, 0.1), T(3, 4, 0.0)), (S4(6, 0.0), S4(7, 0.3))])
unit("A2", "O", "cav", "", [(appear_o, 3050, 2140, 1, 0), (S4(6, 0.0), 3050, 2140, 1, 0), (S4(6, 0.9), 3020, 1860, 1, 0),
     (S5(0, 0.9), 3250, 1500, 1, 0), (S5(2, 0.9), 3350, 1250, 1, 0)])
unit("J1", "O", "inf", "", [(appear_o, 2250, 2370, 1, 0), (S5(0, 0.0), 2250, 2370, 1, 0), (S5(1, 0.9), 2300, 2050, 1, 0)])
unit("J2", "O", "inf", "Yeniçeriler", [(appear_o, 2550, 2370, 1, 0), (S5(0, 0.0), 2550, 2370, 1, 0), (S5(1, 0.9), 2550, 2050, 1, 0)],
     labeled=[(T(3, 3, 0.2), T(3, 4, 0.0)), (S4(4, 0.0), S4(5, 0.8))])
unit("G1", "O", "art", "", [(appear_o, 2140, 2250, 1, 0)], w=150, h=64)
unit("G2", "O", "art", "Top hattı", [(appear_o, 2400, 2240, 1, 0)], w=150, h=64, labeled=[(T(3, 3, 0.3), T(3, 4, 0.0)), (S4(4, 0.2), S4(5, 0.8))])
unit("G3", "O", "art", "", [(appear_o, 2660, 2250, 1, 0)], w=150, h=64)
unit("SU", "O", "inf", "Sultan Süleyman", [(appear_o, 2400, 2530, 1, 0), (S5(1, 0.0), 2400, 2530, 1, 0), (S5(2, 0.9), 2400, 2300, 1, 0)], flag=True,
     labeled=[(T(3, 1, 0.6), T(3, 3, 0.9)), (S4(4, 0.0), S4(4, 0.9))])
unit("AK1", "O", "akinci", "Bali Bey", [(appear_o, 650, 2380, 1, 0), (S4(7, 0.0), 650, 2380, 1, 0), (S4(7, 0.55), 900, 1800, 1, 0),
     (S4(7, 1.0) + 0.6, 1550, 1330, 1, 0), (S5(2, 0.9), 2300, 1150, 1, 0)], labeled=[(T(3, 3, 0.4), T(3, 4, 0.0)), (S4(7, 0.0), S5(0, 0.5))])
unit("AK2", "O", "akinci", "Hüsrev Bey", [(appear_o, 430, 2120, 1, 0), (S4(7, 0.05), 430, 2120, 1, 0), (S4(7, 0.6), 550, 1550, 1, 0),
     (S4(7, 1.0) + 0.6, 1150, 1180, 1, 0), (S5(2, 0.9), 1900, 1000, 1, 0)], labeled=[(S4(7, 0.1), S5(0, 0.5))])


def unit_state(u, t):
    k = u["keys"]
    if t < k[0][0] - 0.6:
        return None
    if t <= k[0][0]:
        a = ease((t - (k[0][0] - 0.6)) / 0.6)
        return k[0][1], k[0][2], a * k[0][3], k[0][4], 0.0, (k[0][0] - t) / 0.6
    for i in range(len(k) - 1):
        a, b = k[i], k[i + 1]
        if a[0] <= t <= b[0]:
            u_ = ease_io((t - a[0]) / max(b[0] - a[0], 1e-6))
            x, y = a[1] + (b[1] - a[1]) * u_, a[2] + (b[2] - a[2]) * u_
            spd = np.hypot(b[1] - a[1], b[2] - a[2]) / max(b[0] - a[0], 1e-6) * (np.sin(np.pi * u_) if b[0] - a[0] > 0 else 0)
            return x, y, a[3] + (b[3] - a[3]) * u_, a[4] + (b[4] - a[4]) * u_, spd, 0.0
    l = k[-1]
    return l[1], l[2], l[3], l[4], 0.0, 0.0


# ------------------------------------------------------------------ OKLAR (dünya koordinatı)
H_ARROW = ((60, 100, 170), (16, 30, 60))
O_ARROW = ((176, 36, 30), (70, 12, 10))
BF_ARROWS = [  # (görünür_baş, görünür_son, büyüme süresi, renk, noktalar, w0, w1)
    (S4(0, 0.1), S4(2, 0.6), 1.8, H_ARROW, [(1250, 1720), (1290, 1880), (1320, 2050)], 40, 90),
    (S4(0, 0.2), S4(2, 0.6), 1.8, H_ARROW, [(1560, 1720), (1640, 1880), (1700, 2030)], 40, 90),
    (S4(2, 0.0), S4(2, 1.0), 1.4, O_ARROW, [(1350, 2200), (1150, 2290), (900, 2380)], 30, 70),
    (S4(2, 0.1), S4(2, 1.0), 1.4, O_ARROW, [(2010, 2160), (2500, 2300), (2950, 2380)], 30, 70),
    (S4(3, 0.0), S4(4, 0.6), 2.0, H_ARROW, [(2060, 1500), (2140, 1750), (2220, 2050)], 46, 100),
    (S4(3, 0.1), S4(4, 0.6), 2.0, H_ARROW, [(1650, 1520), (1740, 1760), (1840, 2000)], 34, 80),
    (S4(3, 0.15), S4(4, 0.6), 2.0, H_ARROW, [(2470, 1520), (2520, 1760), (2580, 2000)], 34, 80),
    (S4(6, 0.0), S4(7, 0.5), 1.8, O_ARROW, [(2750, 2220), (2700, 2050), (2560, 1920)], 40, 95),
    (S4(6, 0.05), S4(7, 0.5), 1.8, O_ARROW, [(3080, 2180), (3060, 1990), (2950, 1800)], 40, 95),
    (S4(7, 0.0), S5(0, 0.6), 2.6, O_ARROW, [(650, 2440), (760, 2000), (1000, 1650), (1500, 1340)], 40, 100),
    (S4(7, 0.05), S5(0, 0.6), 2.6, O_ARROW, [(430, 2180), (480, 1750), (700, 1400), (1100, 1180)], 40, 100),
    (S5(0, 0.0), S5(1, 0.9), 1.6, H_ARROW, [(2400, 1800), (2900, 1600), (3450, 1500)], 30, 70),
    (S5(0, 0.05), S5(1, 0.9), 1.6, H_ARROW, [(2000, 1800), (2300, 1450), (2700, 1150)], 30, 70),
]
EU_ARROWS = [
    (T(1, 2, 0.0), T(1, 4, 0.2), 3.0, O_ARROW, [E(32.0, 39.5), E(28.9, 41.0), E(25.0, 42.6), E(22.0, 43.6), E(20.6, 44.7)], 26, 60),
    (T(2, 0, 0.0), T(6, 0, 0.0), 5.2, O_ARROW, [CITY[k] for k in ["İstanbul", "Edirne", "Filibe", "Sofya", "Niş", "Belgrad"]], 11, 24),
    (T(2, 1, 0.0), T(6, 0, 0.0), 3.4, O_ARROW, [CITY["Belgrad"], CITY["Petervaradin"], CITY["Ösek"], MO], 11, 24),
    (T(2, 2, 0.3), T(6, 0, 0.0), 2.6, H_ARROW, [CITY["Buda"], CITY["Tolna"], (MO[0] + 6, MO[1] - 18)], 10, 22),
]
EU_DASHED = [  # yetişemeyen birlikler
    (T(2, 3, 0.15), T(3, None, 0.0), 2.2, (34, 62, 110), [CITY["Kolojvar"], E(22.6, 46.5), E(21.1, 46.3)], "Szapolyai (Erdel) – yetişemedi"),
    (T(2, 3, 0.35), T(3, None, 0.0), 2.0, (34, 62, 110), [CITY["Zagreb"], E(16.8, 45.9), E(17.4, 45.95)], "Hırvat birlikleri – gecikti"),
]

# ------------------------------------------------------------------ OLAYLAR (ses efektleri için de kullanılır)
CANNON_TIMES = sorted([S4(4, 0.75) + k * 0.33 + (0.12 if k % 2 else 0) for k in range(10)] + [S4(5, f) for f in (0.1, 0.35, 0.6, 0.85)]
                      + [T(3, 2, 0.5), T(3, 2, 0.8)])
CANNON_POS = [(2140, 2205), (2400, 2195), (2660, 2205)]
H_CANNON = [T(3, 2, 0.5), T(3, 2, 0.8)]
CLASH = [((1330, 2060), S4(1, 0.3), S4(2, 0.4)), ((1710, 2040), S4(1, 0.35), S4(2, 0.4)),
         ((2150, 2160), S4(4, 0.5), S4(6, 0.2)), ((2430, 2160), S4(4, 0.55), S4(6, 0.2)),
         ((2600, 1910), S4(6, 0.7), S5(0, 0.3)), ((1400, 2050), S4(7, 0.8), S5(0, 0.5))]
CHARGE_TIMES = [S4(0, 0.15), S4(3, 0.05), S4(6, 0.05), S4(7, 0.05)]


def smoke(cv, M, t):
    rng_seed = 7
    for i, tc in enumerate(CANNON_TIMES):
        dt = t - tc
        if dt < -0.05 or dt > 3.2:
            continue
        hun = tc in H_CANNON
        pos = [(2050, 1790), (2420, 1790)][i % 2] if hun else CANNON_POS[i % 3]
        sx, sy = project(M, *pos)
        s = local_scale(M, *pos)
        if 0 <= dt < 0.18:
            f = 1 - dt / 0.18
            cv.drawCircle(sx, sy - 20 * s, 90 * s * (0.6 + f), paint((255, 236, 170), 0.85 * f, blur=30 * s))
            cv.drawCircle(sx, sy - 20 * s, 30 * s, paint((255, 255, 230), f))
        rng = np.random.default_rng(i * 31 + rng_seed)
        for k in range(7):
            ang = rng.uniform(0, 2 * np.pi)
            dirn = -1 if not hun else 1
            dx = np.cos(ang) * 40 + 60 * dt * rng.uniform(0.5, 1.5)
            dy = dirn * (-80 * dt - rng.uniform(0, 60)) - 60 * dt
            r = (40 + 120 * max(dt, 0.0) ** 0.6) * rng.uniform(0.7, 1.3)
            a = 0.55 * (1 - dt / 3.2) * ease(dt / 0.25)
            px, py = project(M, pos[0] + dx, pos[1] + dirn * 30 + rng.uniform(-30, 30))
            cv.drawCircle(px, py - 40 * s - 60 * s * dt, r * s, paint((226, 222, 212), a, blur=r * s * 0.45))


def dust(cv, M, u, x, y, spd, t):
    if spd < 120:
        return
    a = min(1, (spd - 120) / 300) * 0.45
    rng = np.random.default_rng(int(t * 7) % 1000 + hash(u["id"]) % 100)
    s = local_scale(M, x, y)
    for k in range(6):
        px, py = project(M, x + rng.uniform(-110, 110), y + (-1 if u["side"] == "H" else 1) * rng.uniform(40, 140))
        r = rng.uniform(40, 80) * s
        cv.drawCircle(px, py - 10 * s, r, paint((196, 172, 130), a, blur=r * 0.6))


def clash(cv, M, t):
    for (x, y), a, b in CLASH:
        al = env(t, a, b, 0.3, 0.6)
        if al <= 0:
            continue
        sx, sy = project(M, x, y)
        s = local_scale(M, x, y)
        pulse = 0.5 + 0.5 * np.sin(t * 9 + x)
        cv.drawCircle(sx, sy - 30 * s, 120 * s, paint((255, 180, 90), 0.35 * al * pulse, blur=50 * s))
        L = 44 * s
        p = paint((40, 24, 12), al, stroke=max(2, 7 * s))
        p2 = paint((250, 236, 200), al, stroke=max(1.5, 4 * s))
        for sg in (-1, 1):
            cv.drawLine(sx - L * sg, sy - 30 * s - L, sx + L * sg, sy - 30 * s + L, p)
            cv.drawLine(sx - L * sg, sy - 30 * s - L, sx + L * sg, sy - 30 * s + L, p2)


# ------------------------------------------------------------------ METİN / ARAYÜZ
DATES = [(T(1, None), T(2, 0, 0.0), ""), (T(2, 0, 0.0), T(2, 1, 0.0), "NİSAN 1526 · İSTANBUL"),
         (T(2, 1, 0.0), T(2, 2, 0.0), "TEMMUZ – AĞUSTOS 1526"), (T(2, 2, 0.0), T(3, None), "AĞUSTOS 1526"),
         (T(3, None, 0.3), T(4, 0, 0.0), "29 AĞUSTOS 1526"), (T(4, 0, 0.0), T(5, None), "29 AĞUSTOS 1526 · ÖĞLEDEN SONRA"),
         (T(5, None), T(6, 0, 0.9), "29 AĞUSTOS 1526 · AKŞAMA DOĞRU"), (T(6, 0, 0.9), T(6, 2, 0.0), "1526 VE SONRASI")]
CARDS = [  # (başla, bitir, x, y, w, başlık, satırlar)
    (T(3, 2, 0.05), T(3, 3, 0.15), 60, 200, 560, "MACAR ORDUSU", ["Komutan: Tomori Pál (Kalocsa başpiskoposu) ve Szapolyai György",
                                                                  "Yaklaşık 25–30 bin asker, ~80 top", "(Sayılar tahminidir; kaynaklar farklıdır.)"]),
    (T(3, 3, 0.05), T(3, 4, 0.1), 60, 200, 560, "OSMANLI ORDUSU", ["Başkomutan: Sultan Süleyman, serasker İbrahim Paşa",
                                                                    "Tahminler 50 binden 100 bine kadar uzanır; çok sayıda top",
                                                                    "(Çağdaş kaynaklardaki daha yüksek rakamlar abartılıdır.)"]),
    (T(3, 4, 0.1), T(3, 5, 0.95), 60, 200, 560, "ARAZİ", ["Doğu: Tuna ve geniş bataklıklar – geri çekilme yolunu daraltır",
                                                          "Güney: teras sırtı – Osmanlı merkezinin konuşlandığı yüksek arazi"]),
    (T(4, 4, 0.2), T(4, 5, 0.95), 60, 200, 540, "TOP HATTI VE YENİÇERİLER", ["Hücum, merkezde topçu ve tüfekli piyadenin ateşiyle durduruldu."]),
    (T(4, 7, 0.15), T(5, 0, 0.9), 60, 200, 540, "KUŞATMA", ["Akıncı ve hafif süvari birlikleri Macar ordusunun kanadına ve gerisine yöneldi."]),
    (T(5, 4, 0.0), T(5, -1, 0.0), 60, 200, 600, "TARTIŞMALI AYRINTI", ["Kralın tam olarak nerede ve nasıl öldüğü kaynaklarda farklı anlatılır.",
                                                                        "Cesedinin haftalar sonra Csele Deresi yakınında bulunduğu aktarılır."]),
    (T(6, 0, 0.1), T(6, 1, 0.1), 60, 200, 600, "ASKERÎ SONUÇ", ["Savaş kaynaklara göre yaklaşık iki saat sürdü.",
                                                                "Tomori, birçok piskopos ve soylu ile binlerce asker hayatını kaybetti (kesin sayı bilinmiyor)."]),
    (T(6, 1, 0.1), T(6, 2, 0.2), W - 700, 200, 620, "SİYASİ SONUÇ", ["Taht için iki kral: Szapolyai János ve Habsburg Ferdinand.",
                                                               "1541'de Budin'in alınmasıyla Macaristan uzun süre üçe bölündü.",
                                                               "Orta Avrupa'da Osmanlı–Habsburg rekabeti başladı."]),
]
PORTRAITS = [("suleyman", T(2, 0, 0.0), T(2, 1, 0.9), 300, 520, "KANUNİ SULTAN SÜLEYMAN", "Osmanlı padişahı · 1520–1566"),
             ("lajos", T(2, 2, 0.0), T(2, 3, 0.7), W - 300, 520, "II. LAJOS", "Macaristan ve Bohemya kralı · 1516–1526"),
             ("suleyman", T(3, 1, 0.2), T(3, 2, 0.0), 180, 330, "", ""), ("lajos", T(3, 1, 0.2), T(3, 2, 0.0), W - 180, 330, "", "")]
EU_MARKERS = [("Petervaradin kuşatması", "≈ 27 Temmuz", CITY["Petervaradin"], T(2, 1, 0.15), T(2, 3, 0.0)),
              ("Drava geçişi (Ösek köprüsü)", "Ağustos ortası", CITY["Ösek"], T(2, 1, 0.55), T(2, 3, 0.0))]


def subtitles(cv, t):
    for s in TL["scenes"]:
        for (a, b), txt in zip(s["sentences"], s["subs"]):
            if a - 0.1 <= t <= b + 0.25:
                al = env(t, a - 0.1, b + 0.25, 0.18, 0.25)
                lines = wrap(txt, TF_BODY_SB, 46, 1500)
                y0 = H - 70 - (len(lines) - 1) * 56
                wmax = max(measure(l, TF_BODY_SB, 46) for l in lines)
                r = skia.Rect(W / 2 - wmax / 2 - 30, y0 - 50, W / 2 + wmax / 2 + 30, y0 + (len(lines) - 1) * 56 + 22)
                cv.drawRoundRect(r, 6, 6, paint((10, 7, 5), 0.55 * al))
                for i, l in enumerate(lines):
                    text(cv, l, W / 2, y0 + i * 56, TF_BODY_SB, 46, (250, 244, 228), al, shadow=0.8)


def chapter(cv, t):
    for s in TL["scenes"]:
        if s["id"] == 1:
            continue
        a = s["start"] + 0.2
        al = env(t, a, a + 3.6, 0.5, 0.8)
        if al > 0:
            text(cv, f"BÖLÜM {s['id'] - 1}", 80, 90, TF_TITLE_R, 24, (226, 200, 140), al, "left", 8)
            text(cv, s["title"], 80, 140, TF_TITLE, 44, (246, 236, 214), al, "left", 5)
            cv.drawRect(skia.Rect(82, 160, 82 + 380 * ease((t - a) / 1.2), 162), paint((214, 172, 90), al))


def datestamp(cv, t):
    for a, b, txt in DATES:
        al = env(t, a, b, 0.6, 0.6)
        if al > 0 and txt:
            wd = measure(txt, TF_TITLE_R, 28, 5)
            x = W - 80
            cv.drawRect(skia.Rect(x - wd - 34, 62, x + 14, 116), paint((20, 14, 10), 0.55 * al))
            cv.drawRect(skia.Rect(x - wd - 34, 62, x + 14, 116), paint((214, 172, 90), 0.8 * al, stroke=1.5))
            text(cv, txt, x - 10, 100, TF_TITLE_R, 28, (240, 226, 196), al, "right", 5, shadow=0)


def legend(cv, t):
    al = env(t, T(3, 1, 0.6), T(5, -1, 0.0), 0.8, 0.8)
    if al <= 0:
        return
    x, y, w, h = W - 330, 140, 250, 236
    cv.drawRect(skia.Rect(x, y, x + w, y + h), paint((20, 14, 10), 0.62 * al))
    cv.drawRect(skia.Rect(x, y, x + w, y + h), paint((214, 172, 90), 0.8 * al, stroke=1.5))
    text(cv, "LEJANT", x + 20, y + 34, TF_TITLE_R, 20, (226, 200, 140), al, "left", 4, shadow=0)
    rows = [("hcav", "Ağır süvari"), ("cav", "Süvari (sipahi)"), ("akinci", "Akıncı / hafif süvari"), ("inf", "Piyade"), ("art", "Topçu")]
    Mi = np.eye(3)
    for i, (typ, lab) in enumerate(rows):
        yy = y + 70 + i * 32
        for j, side in enumerate(("H", "O")):
            draw_unit(cv, np.array([[1, 0, x + 32 + j * 46], [0, 1, yy], [0, 0, 1.0]]), {"side": side, "type": typ, "w": 100, "h": 45},
                      0, 0, 0, al, scale=0.4)
        text(cv, lab, x + 110, yy + 2, TF_BODY, 22, (236, 226, 206), al, "left", shadow=0)
    text(cv, "Macar", x + 20, y + h - 6, TF_BODY_SB, 18, (120, 150, 210), al, "left", shadow=0)
    text(cv, "Osmanlı", x + 90, y + h - 6, TF_BODY_SB, 18, (220, 110, 90), al, "left", shadow=0)


def title_cards(cv, t):
    # Giriş başlığı
    a, b = T(1, 4, 0.0), T(2, None, 0.6)
    al = env(t, a, b, 1.0, 0.7)
    if al > 0:
        cv.drawRect(skia.Rect(0, 0, W, H), paint((8, 5, 3), 0.5 * al))
        sp = 34 - 16 * ease((t - a) / 4)
        text(cv, "MOHAÇ 1526", W / 2, H / 2 - 30, TF_TITLE, 150, (232, 200, 120), al, spacing=sp)
        lw = 520 * ease((t - a) / 1.5)
        cv.drawRect(skia.Rect(W / 2 - lw, H / 2 + 10, W / 2 + lw, H / 2 + 12), paint((214, 172, 90), al))
        text(cv, "İKİ SAATTE ÇÖKEN KRALLIK", W / 2, H / 2 + 86, TF_TITLE_R, 54, (240, 230, 210), env(t, a + 0.7, b, 0.8, 0.7), spacing=14)
    # 1526 açılış yazısı
    al = env(t, 0.6, T(1, 1, 0.5), 1.0, 0.8)
    if al > 0:
        text(cv, "AVRUPA", 120, 300, TF_TITLE_R, 30, (246, 236, 214), al, "left", 10)
        text(cv, "1526", 116, 410, TF_TITLE, 120, (236, 214, 160), al, "left", 6)
        cv.drawRect(skia.Rect(122, 322, 122 + 270 * al, 324), paint((214, 172, 90), al))
    # Bitiş
    a = T(6, 2, 0.0)
    al = ease((t - a) / 1.2)
    if al > 0:
        fo = 1 - ease((t - (TOTAL - 1.2)) / 1.1)
        cv.drawRect(skia.Rect(0, 0, W, H), paint((6, 4, 2), 0.62 * al))
        text(cv, "29 AĞUSTOS 1526", W / 2, H / 2 - 70, TF_TITLE_R, 58, (240, 230, 210), al * fo, spacing=16)
        cv.drawRect(skia.Rect(W / 2 - 600 * al, H / 2 - 30, W / 2 + 600 * al, H / 2 - 28), paint((214, 172, 90), al * fo))
        text(cv, "MOHAÇ MEYDAN MUHAREBESİ", W / 2, H / 2 + 70, TF_TITLE, 96, (232, 200, 120), ease((t - a - 0.5) / 1.2) * fo, spacing=8)


def portraits(cv, t):
    for who, a, b, x, y, name, sub in PORTRAITS:
        al = env(t, a, b, 0.7, 0.6)
        if al <= 0:
            continue
        r = 150 if name else 95
        yy = y + (1 - ease(al)) * 30
        portrait(cv, x, yy, r, who, al)
        if name:
            w = max(measure(name, TF_TITLE, 34, 3), measure(sub, TF_BODY, 28)) + 50
            rr = skia.Rect(x - w / 2, yy + r + 26, x + w / 2, yy + r + 130)
            cv.drawRect(rr, paint((20, 14, 10), 0.75 * al))
            cv.drawRect(rr, paint((214, 172, 90), 0.8 * al, stroke=1.5))
            text(cv, name, x, yy + r + 74, TF_TITLE, 34, (236, 210, 150), al, spacing=3, shadow=0)
            text(cv, sub, x, yy + r + 112, TF_BODY, 28, (232, 222, 200), al, shadow=0)


# ------------------------------------------------------------------ ÇİZİM
def draw_europe(cv, M, t, tex):
    cv.save(); cv.concat(skia.Matrix.MakeAll(*[float(v) for v in M.flatten()]))
    cv.drawImage(tex, 0, 0, skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear))
    # Osmanlı / Macaristan vurgusu
    from build_europe import OTTOMAN_POLY, HUNGARY_POLY
    for poly, col, a, b in ((OTTOMAN_POLY, (190, 40, 30), T(1, 2, 0.0), T(1, 3, 0.2)), (HUNGARY_POLY, (40, 90, 190), T(1, 3, 0.0), T(2, None, 0.4))):
        al = env(t, a, b, 0.6, 0.8)
        if al > 0:
            p = skia.Path(); p.addPoly([skia.Point(*ll(*q)) for q in poly], True)
            pulse = 0.6 + 0.4 * np.sin((t - a) * 3)
            cv.drawPath(p, paint(col, 0.22 * al * pulse))
            cv.drawPath(p, paint(col, 0.9 * al, stroke=10, blur=4))
    # 1541 sonrası bölünme
    al = env(t, T(6, 1, 0.2), TOTAL + 5, 1.0, 0.5)
    if al > 0:
        for poly, col, lab, pos in PARTITION:
            p = skia.Path(); p.addPoly([skia.Point(*ll(*q)) for q in poly], True)
            cv.drawPath(p, paint(col, 0.30 * al))
            cv.drawPath(p, paint(col, 0.9 * al, stroke=6))
    for a, b, grow, (col, dark), pts, w0, w1 in EU_ARROWS:
        al = env(t, a, b, 0.3, 0.8)
        if al > 0:
            pts_s = catmull(pts, 28)
            draw_arrow(cv, pts_s, ease((t - a) / grow), col, dark, w0, w1, al)
    for a, b, grow, col, pts, lab in EU_DASHED:
        al = env(t, a, b, 0.3, 0.8)
        if al > 0:
            dashed_line(cv, catmull(pts, 20), ease((t - a) / grow), col, 9, al, (26, 18))
    if env(t, T(2, 2, 0.5), T(3, None, 0.5), 0.5, 0.5) > 0 or env(t, T(1, 3, 0.2), T(2, 0, 0.2), 0.5, 0.5) > 0:
        for k in range(3):
            ph = ((t * 0.7) + k / 3) % 1.0
            cv.drawCircle(MO[0], MO[1], 14 + 110 * ph, paint((170, 20, 15), (1 - ph) * 0.8, stroke=5))
    cv.restore()
    # ekran-uzayı etiketleri
    for name, sub, pos, a, b in EU_MARKERS:
        al = env(t, a, b, 0.5, 0.6)
        if al > 0:
            sx, sy = project(M, *pos)
            castle(cv, sx, sy, al)
            text(cv, name, sx + 34, sy - 26, TF_BODY_SB, 30, (40, 26, 16), al, "left", shadow=0)
            text(cv, sub, sx + 34, sy + 6, TF_IT, 26, (120, 30, 24), al, "left", shadow=0)
    for a, b, grow, col, pts, lab in EU_DASHED:
        al = env(t, a + grow * 0.8, b, 0.4, 0.6)
        if al > 0:
            sx, sy = project(M, *catmull(pts, 20)[-1])
            text(cv, "?", sx + 18, sy + 14, TF_TITLE, 46, (150, 30, 26), al, "left", shadow=0.3)
            text(cv, lab, sx - 10, sy + 54, TF_BODY_SB, 26, col, al, "center", shadow=0)
    al = env(t, T(6, 1, 0.2), TOTAL + 5, 1.0, 0.5)
    if al > 0:
        for poly, col, lab, pos in PARTITION:
            sx, sy = project(M, *ll(*pos))
            ls = lab.split("\n")
            wd = max(measure(ls[0], TF_TITLE, 32, 4), measure(ls[1], TF_BODY_SB, 28)) + 40
            cv.drawRect(skia.Rect(sx - wd / 2, sy - 40, sx + wd / 2, sy + 46), paint((244, 234, 210), 0.88 * al))
            cv.drawRect(skia.Rect(sx - wd / 2, sy - 40, sx + wd / 2, sy + 46), paint(col, al, stroke=3))
            text(cv, ls[0], sx, sy - 4, TF_TITLE, 32, tuple(int(c * 0.7) for c in col), al, spacing=4, shadow=0)
            text(cv, ls[1], sx, sy + 34, TF_BODY_SB, 28, (50, 36, 24), al, shadow=0)
        text(cv, "Yaklaşık sınırlar · 1541 sonrası", W / 2, 205, TF_IT, 30, (60, 40, 24), al, shadow=0)


PARTITION = [
    ([(16.1, 48.7), (17.2, 48.9), (18.8, 49.5), (20.0, 49.4), (21.3, 49.4), (22.6, 49.1), (22.0, 48.4), (21.0, 48.15), (19.5, 47.95), (18.5, 47.75),
      (17.6, 47.45), (17.3, 47.0), (16.9, 46.5), (16.5, 46.0), (16.4, 45.4), (15.8, 45.2), (15.3, 44.4), (14.9, 45.0), (14.4, 45.35), (15.3, 45.7),
      (15.7, 46.2), (16.3, 46.6), (16.1, 47.4), (16.6, 47.8), (16.9, 48.2)], (60, 60, 150), "HABSBURG\nKraliyet Macaristanı", (18.3, 48.45)),
    ([(17.3, 47.0), (17.6, 47.45), (18.5, 47.75), (19.5, 47.95), (21.0, 48.15), (21.4, 47.3), (21.5, 46.5), (21.6, 45.4), (21.4, 44.75), (20.45, 44.85),
      (19.3, 44.9), (18.0, 45.1), (16.8, 45.15), (16.4, 45.4), (16.5, 46.0), (16.9, 46.5)], (170, 40, 30), "OSMANLI\nBudin Eyaleti", (19.6, 46.75)),
    ([(22.6, 49.1), (24.0, 48.0), (24.9, 47.7), (25.6, 47.0), (26.2, 46.2), (26.0, 45.6), (25.0, 45.45), (23.5, 45.3), (22.4, 44.62), (21.4, 44.75),
      (21.6, 45.4), (21.5, 46.5), (21.4, 47.3), (21.0, 48.15), (22.0, 48.4)], (150, 110, 40), "ERDEL\nPrensliği", (23.4, 46.25)),
]


def castle(cv, x, y, al):
    p = paint((60, 40, 24), al)
    cv.drawRect(skia.Rect(x - 16, y - 14, x + 16, y + 4), paint((220, 200, 160), al))
    cv.drawRect(skia.Rect(x - 16, y - 14, x + 16, y + 4), paint((60, 40, 24), al, stroke=2.5))
    for k in (-16, -4, 8):
        cv.drawRect(skia.Rect(x + k, y - 22, x + k + 8, y - 14), p)
    cv.drawLine(x, y - 22, x, y - 40, paint((60, 40, 24), al, stroke=2))
    fl = skia.Path(); fl.moveTo(x, y - 40); fl.lineTo(x + 16, y - 35); fl.lineTo(x, y - 30); fl.close()
    cv.drawPath(fl, paint((170, 30, 26), al))


def draw_battlefield(cv, M, t, tex):
    cv.save(); cv.concat(skia.Matrix.MakeAll(*[float(v) for v in M.flatten()]))
    cv.drawImage(tex, 0, 0, skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear))
    # arazi vurguları
    al = env(t, T(3, 4, 0.0), T(3, 5, 0.9), 0.6, 0.8)
    if al > 0:
        pulse = 0.55 + 0.45 * np.sin((t - T(3, 4)) * 3.5)
        mp = skia.Path(); mp.addOval(skia.Rect(3480, 900, 4500, 3000))
        cv.drawPath(mp, paint((60, 120, 150), 0.18 * al * pulse))
        cv.drawPath(mp, paint((40, 90, 120), 0.9 * al, stroke=14, dash=[50, 30]))
        from build_battlefield import TERRACE
        tp = catmull(TERRACE, 20)
        rp = skia.Path(); rp.moveTo(*tp[0])
        for q in tp[1:]:
            rp.lineTo(*q)
        cv.drawPath(rp, paint((200, 120, 40), 0.75 * al * pulse, stroke=46, blur=12))
        cv.drawPath(rp, paint((120, 60, 20), al, stroke=10, dash=[60, 30]))
    # Csele vurgusu (kralın ölümü)
    al = env(t, T(5, 2, 0.6), T(6, 0, 0.5), 0.6, 0.8)
    if al > 0:
        cs = np.array(BGEO["csele"])
        p = skia.Path(); p.moveTo(*cs[0])
        for q in cs[1:]:
            p.lineTo(*q)
        cv.drawPath(p, paint((90, 170, 220), 0.7 * al, stroke=60, blur=18))
    # oklar
    for a, b, grow, (col, dark), pts, w0, w1 in BF_ARROWS:
        al = env(t, a, b, 0.3, 0.8)
        if al > 0:
            draw_arrow(cv, catmull(pts, 24), ease((t - a) / grow), col, dark, w0, w1, al * 0.8)
    # kralın kaçış izi
    kp = [(2230, 1890), (2400, 1600), (2800, 1280), (3130, 1010)]
    al = env(t, S5(2, 0.0), T(6, 0, 0.5), 0.4, 0.8)
    if al > 0:
        dashed_line(cv, catmull(kp, 20), ease((t - S5(2, 0.0)) / (S5(3, 0.6) - S5(2, 0.0))), (34, 62, 110), 12, al, (34, 22))
    cv.restore()

    # birlikler (arkadan öne: ekran y'sine göre)
    items = []
    for u in U.values():
        st = unit_state(u, t)
        if st is None:
            continue
        x, y, a, hit, spd, drop = st
        if a <= 0.01:
            continue
        sx, sy = project(M, x, y)
        if sx < -300 or sx > W + 300 or sy < -300 or sy > H + 300:
            continue
        items.append((sy, u, x, y, a, hit, spd, drop))
    items.sort(key=lambda k: k[0])
    for sy, u, x, y, a, hit, spd, drop in items:
        dust(cv, M, u, x, y, spd, t)
    labels = []
    for sy, u, x, y, a, hit, spd, drop in items:
        ang = 0.0
        flick = hit * (0.85 + 0.15 * np.sin(t * 20 + x)) if hit > 0.5 else hit
        glow = 0.0
        if u["id"] == "K" and S5(2, 0.0) <= t <= S5(4, 0.3):
            glow = 0.6 + 0.4 * np.sin(t * 5)
        res = draw_unit(cv, M, u, x, y - drop * 260, ang, a, glow, flick)
        if res is None:
            continue
        anchor, s = res
        for la, lb in u["labeled"]:
            al = env(t, la, lb, 0.4, 0.5) * a
            if al > 0 and u["label"]:
                labels.append((anchor, s, u["label"], al, u["side"]))
    smoke(cv, M, t)
    clash(cv, M, t)
    for anchor, s, txt, al, side in labels:
        unit_label(cv, anchor, s, txt, al, side)
    # Csele ölüm işareti
    al = env(t, S5(3, 0.5), T(6, 0, 0.5), 0.6, 0.8)
    if al > 0:
        sx, sy = project(M, 3150, 990)
        cv.drawCircle(sx, sy, 34, paint((20, 14, 10), 0.7 * al))
        cv.drawCircle(sx, sy, 34, paint((214, 172, 90), al, stroke=3))
        cv.drawLine(sx, sy - 20, sx, sy + 20, paint((240, 230, 210), al, stroke=5))
        cv.drawLine(sx - 12, sy - 8, sx + 12, sy - 8, paint((240, 230, 210), al, stroke=5))
        text(cv, "II. Lajos (1506–1526)", sx + 52, sy - 6, TF_BODY_SB, 32, (30, 20, 12), al, "left", shadow=0)
        text(cv, "Csele Deresi yakınında · ayrıntılar tartışmalı", sx + 52, sy + 28, TF_IT, 26, (120, 30, 24), al, "left", shadow=0)
    # arazi etiketleri (sahne 3)
    al = env(t, T(3, 4, 0.1), T(3, 5, 0.9), 0.5, 0.6)
    if al > 0:
        for txt, (wx, wy) in (("BATAKLIK", (3700, 1700)), ("TERAS SIRTI", (1300, 2380))):
            sx, sy = project(M, wx, wy)
            w = measure(txt, TF_TITLE, 34, 6) + 40
            cv.drawRect(skia.Rect(sx - w / 2, sy - 44, sx + w / 2, sy + 10), paint((20, 14, 10), 0.7 * al))
            text(cv, txt, sx, sy - 6, TF_TITLE, 34, (240, 220, 170), al, spacing=6, shadow=0)


TEX = {}
GRAIN = None


def load():
    global GRAIN
    if not TEX:
        for k, f in (("eu", "europe.png"), ("bf", "battlefield.png")):
            im = np.asarray(Image.open(os.path.join(BUILD, f)).convert("RGBA")).copy()
            TEX[k] = skia.Image.fromarray(im).withDefaultMipmaps()
        GRAIN = [np.random.default_rng(i).normal(0, 1, (H // 2, W // 2)).astype(np.float32) for i in range(10)]


def render_frame(f):
    load()
    t = f / FPS
    surf = skia.Surface(W, H)
    cv = surf.getCanvas()
    cv.clear(skia.Color(212, 194, 150))
    for m, a in map_alphas(t):
        p = cam_for_map(t, m)
        sh = 0.0
        if m == "bf":
            for tc in CANNON_TIMES:
                if 0 <= t - tc < 0.35 and tc not in H_CANNON:
                    sh += (1 - (t - tc) / 0.35) * 5
        M = camera_matrix(p[1] + np.sin(t * 61) * sh / p[3], p[2] + np.cos(t * 53) * sh / p[3], p[3], p[4], p[5])
        if a < 0.999:
            cv.saveLayerAlpha(None, int(255 * a))
        (draw_europe if m == "eu" else draw_battlefield)(cv, M, t, TEX[m])
        if a < 0.999:
            cv.restore()
    # ufuk sisi + vinyet
    cv.drawRect(skia.Rect(0, 0, W, H * 0.4), skia.Paint(Shader=skia.GradientShader.MakeLinear(
        [skia.Point(0, 0), skia.Point(0, H * 0.4)], [skia.Color4f(0.83, 0.77, 0.62, 0.9), skia.Color4f(0.83, 0.77, 0.62, 0)])))
    cv.drawRect(skia.Rect(0, 0, W, H), skia.Paint(Shader=skia.GradientShader.MakeRadial(
        skia.Point(W / 2, H * 0.55), W * 0.72, [skia.Color4f(0, 0, 0, 0), skia.Color4f(0.08, 0.04, 0.02, 0), skia.Color4f(0.08, 0.04, 0.02, 0.7)], [0, 0.55, 1])))
    # arayüz
    title_cards(cv, t)
    chapter(cv, t)
    datestamp(cv, t)
    legend(cv, t)
    portraits(cv, t)
    for a, b, x, y, w, title, lines in CARDS:
        card(cv, x, y, w, title, lines, env(t, a, b, 0.5, 0.5))
    subtitles(cv, t)
    img = surf.makeImageSnapshot().toarray()[:, :, :3].astype(np.float32)
    g = GRAIN[f % len(GRAIN)]
    img += np.repeat(np.repeat(g, 2, 0), 2, 1)[..., None] * 4.5
    fade = ease(t / 1.0) * (1 - ease((t - (TOTAL - 0.6)) / 0.6))
    img *= fade
    return np.clip(img, 0, 255).astype(np.uint8)


def render_range(args):
    a, b, out = args
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(a, b):
        p.stdin.write(render_frame(f).tobytes())
    p.stdin.close(); p.wait()
    return out


def main():
    if "--preview" in sys.argv:
        for ts in sys.argv[sys.argv.index("--preview") + 1:]:
            fr = render_frame(int(float(ts) * FPS))
            Image.fromarray(fr[:, :, ::-1]).save(f"/tmp/claude-0/pv_{ts}.png")
        return
    jobs = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 4
    N = int(TOTAL * FPS)
    parts, step = [], int(np.ceil(N / (jobs * 3)))
    for i, a in enumerate(range(0, N, step)):
        parts.append((a, min(N, a + step), os.path.join(BUILD, f"part_{i:03d}.mp4")))
    from multiprocessing import Pool
    with Pool(jobs) as pool:
        for k, out in enumerate(pool.imap(render_range, parts)):
            print(f"parça {k + 1}/{len(parts)}", flush=True)
    with open(os.path.join(BUILD, "parts.txt"), "w") as fh:
        for _, _, o in parts:
            fh.write(f"file '{o}'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(BUILD, "parts.txt"),
                    "-c", "copy", os.path.join(BUILD, "video_silent.mp4")], check=True)
    print("video tamam")


if __name__ == "__main__":
    main()
