"""Mohaç ovası savaş alanı dokusu (şematik ama coğrafi olarak makul): Tuna, bataklıklar, Csele/Borza dereleri,
güneydeki teras sırtı, ormanlar, köyler. -> build/battlefield.png + battlefield_geo.json"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage
from common import *

BW, BH = 4800, 3200


def catmull(points, n=20):
    p = np.array(points, float)
    p = np.vstack([p[0], p, p[-1]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(p[-2])
    return np.array(out)


DANUBE = [(4420, -100), (4300, 300), (4120, 700), (4060, 1100), (4160, 1500), (4330, 1950), (4280, 2450), (4380, 2900), (4460, 3300)]
ARM1 = [(4120, 760), (3900, 1050), (3820, 1450), (3960, 1800), (4250, 1980)]
ARM2 = [(4290, 2300), (4060, 2550), (4100, 2900), (4390, 3050)]
CSELE = [(300, 640), (800, 720), (1250, 800), (1700, 900), (2150, 860), (2600, 950), (3000, 980), (3350, 1040), (3700, 1110), (3880, 1120)]
BORZA = [(2800, 2560), (3000, 2250), (3250, 2060), (3550, 1980), (3820, 1960)]
TERRACE = [(-100, 2480), (500, 2400), (1100, 2330), (1700, 2270), (2200, 2260), (2700, 2330), (3150, 2240), (3450, 2080), (3640, 1880), (3700, 1700)]
ROADS = [[(3880, 430), (3500, 900), (3150, 1300), (2700, 1900), (2450, 2400), (2300, 3300)],
         [(3880, 430), (2600, 380), (1700, 330), (500, 250)], [(3880, 430), (4000, -100)]]
VILLAGES = {"Mohaç": (3880, 430, 3), "Nagynyárád": (700, 1180, 1), "Lánycsók": (1800, 330, 1), "Sátorhely": (1450, 1560, 1),
            "Majs": (900, 2780, 1), "Udvar": (2150, 2900, 1), "Kölked": (3780, 2700, 1), "Földvár": (2580, 2120, 1)}
FORESTS = [((1200, 2700), 380, 1.0), ((1700, 3050), 300, 1.0), ((2900, 2700), 330, 1.0), ((350, 2950), 300, 1.0),
           ((4600, 600), 260, 0.9), ((4620, 1500), 280, 0.9), ((4620, 2300), 260, 0.9), ((4600, 3000), 240, 0.9),
           ((3550, 2450), 200, 0.8), ((150, 1600), 220, 0.8), ((2600, 150), 200, 0.7)]


def main():
    yy, xx = np.mgrid[0:BH, 0:BW].astype(np.float32)
    n1 = fbm((BH, BW), 7, seed=11)
    n2 = fbm((BH, BW), 5, seed=12, base=3)
    # --- yükseklik
    tp = catmull(TERRACE, 30)
    edge_y = np.interp(np.arange(BW), tp[:, 0], tp[:, 1])
    rel = yy - edge_y[None, :] - 120 * (n2 - 0.5)
    h = 1 / (1 + np.exp(-rel / 70.0))
    hn = fbm((BH, BW), 6, seed=13, base=10)
    gul = 1 - np.abs(2 * fbm((BH, BW), 5, seed=14, base=14) - 1)
    h = h * (1.0 + 0.35 * hn - 0.25 * gul ** 6) + 0.12 * hn
    river = catmull(DANUBE, 40)
    rx = np.interp(yy[:, 0], river[:, 1], river[:, 0])
    flood = np.clip((xx - (rx[:, None] - 750 + 220 * n2)) / 300, 0, 1)
    h = h * (1 - 0.85 * flood) - 0.15 * flood
    h = ndimage.gaussian_filter(h, 2)

    gy, gx = np.gradient(h * 220)
    shade = np.clip((-gx * 0.6 - gy * 0.8) / np.sqrt(gx ** 2 + gy ** 2 + 1), -1, 1)
    base = PAPER[None, None] * (0.92 + 0.11 * n1[..., None]) - (PAPER - PAPER_DARK)[None, None] * (n2[..., None] ** 3)
    img = base * (1 + 0.42 * shade[..., None])
    img -= np.clip(h, 0, 2)[..., None] * np.array([6, 10, 18])
    # tarlalar (ovada hafif şeritler)
    fields = (np.sin((xx * 0.8 + yy * 0.3) / 9) > 0.6).astype(np.float32) * (fbm((BH, BW), 3, seed=15, base=12) > 0.62)
    

    # --- bataklık
    marsh = np.clip(flood * 1.3 - 0.25, 0, 1) * (fbm((BH, BW), 5, seed=16, base=9) * 0.7 + 0.5)
    marsh = np.clip(marsh, 0, 1) * np.clip((yy - 500) / 500, 0, 1)
    marsh_col = np.array([150, 160, 128], np.float32)
    img = img * (1 - 0.55 * marsh[..., None]) + marsh_col * 0.55 * marsh[..., None]

    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(out, "RGBA")
    rng = np.random.default_rng(3)

    # bataklık otları
    for _ in range(9000):
        x, y = rng.uniform(0, BW), rng.uniform(700, BH)
        if marsh[int(y), int(x)] > 0.45 and rng.random() < marsh[int(y), int(x)]:
            c = (78, 90, 64, 200)
            for dx in (-6, 0, 6):
                d.line([(x, y), (x + dx * 1.3, y - 14 - abs(dx))], fill=c, width=2)
            d.line([(x - 10, y), (x + 10, y)], fill=c, width=2)
    # su gölcükleri
    for _ in range(70):
        x, y = rng.uniform(3300, 4700), rng.uniform(900, BH)
        if marsh[int(min(y, BH - 1)), int(min(x, BW - 1))] > 0.6:
            r = rng.uniform(15, 45)
            d.ellipse([x - r * 1.6, y - r * 0.7, x + r * 1.6, y + r * 0.7], fill=(118, 146, 152, 200), outline=(60, 80, 86, 220), width=3)

    # --- teras tarama çizgileri (hachure)
    for i in range(len(tp) - 1):
        p, q = tp[i], tp[i + 1]
        dv = q - p
        L = np.linalg.norm(dv)
        if L < 1:
            continue
        nrm = np.array([-dv[1], dv[0]]) / L
        if nrm[1] < 0:
            nrm = -nrm
        for s in np.arange(0, L, 21):
            o = p + dv * s / L
            ln = rng.uniform(45, 95)
            jitter = rng.normal(0, 6)
            d.line([tuple(o - nrm * 30 + jitter), tuple(o + nrm * ln)], fill=(84, 60, 38, 120), width=3)

    # --- su yolları
    def water(pts, w, n=30):
        cp = catmull(pts, n)
        xy = [tuple(p) for p in cp]
        d.line(xy, fill=(55, 74, 80, 255), width=w + 8, joint="curve")
        d.line(xy, fill=(120, 150, 156, 255), width=w, joint="curve")
        return cp
    water(ARM1, 34); water(ARM2, 30)
    dan = water(DANUBE, 150)
    for k in range(1, 4):  # akıntı çizgileri
        off = (k - 2) * 38
        d.line([(p[0] + off, p[1]) for p in dan], fill=(150, 176, 180, 160), width=3, joint="curve")
    cs = water(CSELE, 22)
    bz = water(BORZA, 18)

    # --- yollar
    for r in ROADS:
        cp = catmull(r, 20)
        seg = np.linalg.norm(np.diff(cp, axis=0), axis=1)
        cum = np.concatenate([[0], np.cumsum(seg)])
        for s in np.arange(0, cum[-1], 60):
            a = np.searchsorted(cum, s); b = np.searchsorted(cum, s + 34)
            if b >= len(cp): break
            d.line([tuple(cp[a]), tuple(cp[b])], fill=(96, 70, 44, 210), width=6)

    # --- ormanlar (ağaç simgeleri, gölgeli)
    trees = []
    for (cx, cy), r, dens in FORESTS:
        for _ in range(int(r * r / 900 * dens)):
            a, rr = rng.uniform(0, 2 * np.pi), r * np.sqrt(rng.random())
            x, y = cx + np.cos(a) * rr * 1.3, cy + np.sin(a) * rr * 0.9
            if 0 < x < BW and 0 < y < BH:
                trees.append((y, x))
    trees.sort()
    for y, x in trees:
        s = rng.uniform(16, 26)
        d.ellipse([x - s + 10, y - s * 0.4 + 12, x + s + 14, y + s * 0.5 + 12], fill=(60, 44, 26, 70))
        d.line([(x, y + s * 0.2), (x, y + s * 0.9)], fill=(70, 50, 30, 255), width=4)
        d.ellipse([x - s, y - s * 1.1, x + s, y + s * 0.5], fill=(104, 112, 72, 255), outline=(52, 56, 34, 255), width=3)
        d.ellipse([x - s * 0.55, y - s * 0.95, x + s * 0.1, y - s * 0.35], fill=(140, 146, 96, 200))

    # --- köyler
    for name, (x, y, size) in VILLAGES.items():
        nh = 7 if size == 1 else 26
        sp = 50 if size == 1 else 70
        for k in range(nh):
            hx = x + rng.normal(0, sp); hy = y + rng.normal(0, sp * 0.6)
            w_, h_ = rng.uniform(26, 38), rng.uniform(18, 24)
            d.rectangle([hx - w_ / 2 + 6, hy - h_ / 2 + 8, hx + w_ / 2 + 6, hy + h_ / 2 + 8], fill=(50, 34, 20, 70))
            d.rectangle([hx - w_ / 2, hy - h_ / 2, hx + w_ / 2, hy + h_ / 2], fill=(200, 168, 124, 255), outline=(70, 46, 28, 255), width=3)
            d.polygon([(hx - w_ / 2 - 3, hy - h_ / 2), (hx, hy - h_ / 2 - 16), (hx + w_ / 2 + 3, hy - h_ / 2)], fill=(150, 64, 44, 255), outline=(70, 30, 20, 255))
        # kilise
        d.rectangle([x - 14, y - 70, x + 14, y - 20], fill=(206, 180, 140, 255), outline=(60, 40, 26, 255), width=3)
        d.polygon([(x - 18, y - 70), (x, y - 110), (x + 18, y - 70)], fill=(90, 60, 40, 255))
        d.line([(x, y - 132), (x, y - 108)], fill=(60, 40, 26, 255), width=4)
        d.line([(x - 8, y - 124), (x + 8, y - 124)], fill=(60, 40, 26, 255), width=4)

    # --- etiketler
    def label(txt, pos, path, size, fill, angle=0, alpha=230, spacing=False):
        f = ImageFont.truetype(path, size)
        if spacing:
            txt = " ".join(txt)
        bb = f.getbbox(txt)
        lay = Image.new("RGBA", (bb[2] - bb[0] + 30, bb[3] - bb[1] + 30), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        ld.text((15 - bb[0], 15 - bb[1]), txt, font=f, fill=(236, 222, 190, int(alpha * 0.7)), stroke_width=5, stroke_fill=(236, 222, 190, int(alpha * 0.55)))
        ld.text((15 - bb[0], 15 - bb[1]), txt, font=f, fill=fill + (alpha,))
        if angle:
            lay = lay.rotate(angle, expand=True, resample=Image.BICUBIC)
        out.alpha_composite(lay, (int(pos[0] - lay.width / 2), int(pos[1] - lay.height / 2)))

    for name, (x, y, size) in VILLAGES.items():
        if name == "Mohaç":
            label("MOHAÇ", (x - 430, y - 20), FONT_TITLE, 90, INK, spacing=True)
        elif name == "Földvár":
            label("Földvár", (x + 170, y - 70), FONT_BODY_SB, 54, INK)
        else:
            label(name, (x, y + 95), FONT_BODY_SB, 54, INK)
    label("TUNA", (4350, 1250), FONT_ITALIC, 110, (40, 60, 70), angle=-80, spacing=True)
    label("TUNA", (4320, 2700), FONT_ITALIC, 90, (40, 60, 70), angle=-95, spacing=True)
    label("Csele Deresi", (1500, 790), FONT_ITALIC, 64, (40, 60, 70), angle=-6)
    label("Borza Deresi", (3330, 1940), FONT_ITALIC, 50, (40, 60, 70), angle=14)
    label("BATAKLIK", (3700, 1500), FONT_ITALIC, 70, (52, 64, 44), angle=-75, spacing=True)
    label("BATAKLIK", (3820, 2350), FONT_ITALIC, 60, (52, 64, 44), angle=-60, spacing=True)
    label("MOHAÇ OVASI", (1900, 1220), FONT_TITLE, 96, (90, 66, 40), alpha=170, spacing=True)
    label("Teras sırtı (yüksek arazi)", (1000, 2560), FONT_ITALIC, 58, (84, 58, 36), angle=5)
    label("Mohaç Adası", (4620, 1900), FONT_ITALIC, 50, (52, 64, 44), angle=-88)

    # --- ölçek / pusula
    sx, sy = 260, 3020
    d.line([(sx, sy), (sx + 640, sy)], fill=INK + (255,), width=6)
    for k in range(3):
        d.line([(sx + k * 320, sy - 14), (sx + k * 320, sy + 14)], fill=INK + (255,), width=4)
    f = ImageFont.truetype(FONT_BODY, 40)
    d.text((sx + 320, sy + 46), "≈ 2 km (şematik ölçek)", font=f, fill=INK + (255,), anchor="mm")

    out = out.convert("RGB")
    # kenarları düz kâğıda yumuşakça karıştır (kamera dışarı taştığında dikiş görünmesin)
    arr = np.asarray(out, np.float32)
    m = 420.0
    ex = np.minimum(np.minimum(xx, BW - 1 - xx), np.minimum(yy, BH - 1 - yy)) / m
    wgt = np.clip(ex + 0.15 * (n2 - 0.5), 0, 1) ** 1.5
    bg = np.array([212, 194, 150], np.float32)[None, None] * (0.97 + 0.06 * n1[..., None])
    arr = arr * wgt[..., None] + bg * (1 - wgt[..., None])
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(BUILD, "battlefield.png"))
    json.dump({"bw": BW, "bh": BH, "csele": cs.tolist(), "danube": dan.tolist(), "villages": VILLAGES},
              open(os.path.join(BUILD, "battlefield_geo.json"), "w"), ensure_ascii=False)
    print("ok")


if __name__ == "__main__":
    main()
