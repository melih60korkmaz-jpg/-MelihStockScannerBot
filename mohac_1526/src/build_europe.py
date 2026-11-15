"""1526 Avrupa haritası dokusunu (eski harita tarzı, kabartmalı) üretir -> build/europe.png + europe_geo.json"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage
from common import *

LON0, LON1, LAT0, LAT1 = 4.0, 44.0, 34.0, 56.5
KY = 151.0
KX = KY * np.cos(np.radians(46))
TW, TH = int((LON1 - LON0) * KX), int((LAT1 - LAT0) * KY)


def P(lon, lat):
    return ((lon - LON0) * KX, (LAT1 - lat) * KY)


def load_land():
    tj = json.load(open(os.path.join(ASSETS, "package", "land-50m.json")))
    sx, sy = tj["transform"]["scale"]
    tx, ty = tj["transform"]["translate"]
    arcs = []
    for a in tj["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in a:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        out = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(a if not out else a[1:])
        return out

    polys = []
    for g in tj["objects"]["land"]["geometries"]:
        if g["type"] == "Polygon":
            polys.append([ring(r) for r in g["arcs"]])
        else:
            for p in g["arcs"]:
                polys.append([ring(r) for r in p])
    return polys


RIVERS = {
    "Tuna": [(9.0, 48.0), (11.0, 48.75), (13.4, 48.57), (14.3, 48.3), (16.37, 48.21), (17.1, 48.14), (17.6, 47.75), (18.74, 47.79),
             (19.13, 47.75), (19.05, 47.5), (18.95, 47.0), (18.86, 46.63), (18.9, 46.3), (18.68, 45.99), (18.85, 45.75), (18.95, 45.53),
             (19.0, 45.35), (19.4, 45.23), (19.85, 45.25), (20.3, 45.15), (20.46, 44.82), (21.2, 44.75), (21.6, 44.65), (22.5, 44.65),
             (22.9, 44.2), (22.88, 43.99), (23.7, 43.8), (24.9, 43.7), (25.95, 43.85), (27.26, 44.12), (27.9, 44.6), (27.97, 45.27),
             (28.2, 45.45), (28.8, 45.25), (29.65, 45.15)],
    "Drava": [(13.0, 46.75), (14.3, 46.62), (15.65, 46.55), (16.33, 46.31), (17.0, 46.1), (17.46, 45.96), (18.2, 45.75), (18.69, 45.56), (18.95, 45.53)],
    "Sava": [(14.5, 46.05), (15.6, 45.85), (15.97, 45.8), (16.37, 45.48), (17.0, 45.27), (18.0, 45.15), (18.9, 44.95), (19.6, 44.85), (20.45, 44.82)],
    "Tisza": [(22.6, 48.1), (21.4, 48.12), (20.8, 47.6), (20.2, 47.18), (20.1, 46.6), (20.15, 46.25), (20.1, 45.6), (20.3, 45.2)],
    "Morava": [(21.9, 43.32), (21.4, 43.9), (21.0, 44.6)],
    "Maritsa": [(24.75, 42.15), (25.6, 42.0), (26.56, 41.68), (26.1, 40.8)],
}

MOUNTAINS = [
    [(6.8, 44.0), (7.0, 45.8), (9.0, 46.4), (11.0, 46.8), (13.0, 47.2), (15.5, 47.5), (16.0, 47.8)],
    [(17.3, 48.4), (19.0, 49.2), (21.0, 49.4), (22.5, 49.0), (24.5, 47.9), (25.5, 47.0), (25.8, 45.7), (24.5, 45.45), (22.5, 45.3), (22.3, 44.7)],
    [(21.0, 46.8), (22.5, 46.5), (23.2, 46.8)],
    [(14.5, 45.7), (16.0, 44.5), (18.0, 43.3), (19.5, 42.4), (20.5, 41.5)],
    [(22.5, 43.6), (24.0, 42.9), (26.0, 42.7), (27.5, 42.7)],
    [(23.5, 41.8), (25.5, 41.6)],
    [(21.0, 41.0), (21.5, 39.5), (22.0, 38.6)],
    [(29.0, 37.0), (32.0, 36.6), (35.0, 37.3), (37.0, 38.0), (40, 38.6)],
    [(31.0, 41.2), (35.0, 41.0), (39.0, 40.8), (42.0, 41.0)],
    [(8.0, 44.3), (11.0, 44.0), (13.5, 42.3), (15.5, 40.5), (16.0, 39.0)],
    [(12.5, 50.3), (15.5, 50.7), (16.5, 50.2)],
    [(8.0, 48.0), (9.0, 47.8)],
    [(42, 43.2), (44, 42.6)],
]

OTTOMAN_POLY = [(16.0, 44.6), (16.8, 45.15), (18.0, 45.1), (19.3, 44.9), (20.45, 44.85), (21.4, 44.75), (22.4, 44.6), (23.0, 43.9),
                (24.0, 43.7), (26.0, 44.0), (27.5, 44.1), (28.1, 45.2), (29.0, 45.6), (30.3, 46.3), (31.5, 46.6), (33.0, 45.0),
                (44.5, 43.5), (44.5, 34.0), (26.0, 34.0), (19.4, 39.7), (19.4, 41.9), (18.6, 42.4), (17.6, 43.1), (16.7, 43.6), (16.2, 44.1)]
HUNGARY_POLY = [(16.1, 48.7), (17.2, 48.9), (18.8, 49.5), (20.0, 49.4), (21.3, 49.4), (22.6, 49.1), (24.0, 48.0), (24.9, 47.7),
                (25.6, 47.0), (26.2, 46.2), (26.0, 45.6), (25.0, 45.45), (23.5, 45.3), (22.4, 44.62), (21.4, 44.75), (20.45, 44.85),
                (19.3, 44.9), (18.0, 45.1), (16.8, 45.15), (16.0, 44.6), (15.8, 44.3), (15.3, 44.2), (14.9, 45.0), (14.4, 45.35),
                (15.3, 45.7), (15.7, 46.2), (16.3, 46.6), (16.1, 47.4), (16.6, 47.8), (16.9, 48.2)]
WALLACHIA = [(22.4, 44.62), (22.7, 45.2), (24.0, 45.45), (25.5, 45.5), (26.5, 45.7), (27.2, 45.5), (28.1, 45.2), (27.5, 44.1), (26.0, 44.0), (24.0, 43.7), (23.0, 43.9)]
MOLDAVIA = [(26.2, 46.2), (25.6, 47.0), (25.0, 47.8), (26.2, 48.3), (27.5, 48.5), (29.0, 48.0), (30.0, 46.8), (30.3, 46.3), (29.0, 45.6), (28.1, 45.2), (27.2, 45.5), (26.5, 45.7)]

CITIES = {
    "İstanbul": (28.97, 41.01), "Edirne": (26.56, 41.68), "Filibe": (24.75, 42.15), "Sofya": (23.32, 42.70), "Niş": (21.9, 43.32),
    "Belgrad": (20.46, 44.82), "Petervaradin": (19.86, 45.25), "Ösek": (18.69, 45.55), "Mohaç": (18.68, 45.99), "Buda": (19.04, 47.50),
    "Viyana": (16.37, 48.21), "Prag": (14.42, 50.08), "Krakov": (19.94, 50.06), "Venedik": (12.33, 45.44), "Roma": (12.5, 41.9),
    "Tolna": (18.79, 46.43), "Zagreb": (15.97, 45.81), "Kolojvar": (23.6, 46.77), "Bursa": (29.06, 40.19), "Ragusa": (18.09, 42.65),
}

REGION_LABELS = [
    ("OSMANLI İMPARATORLUĞU", (24.9, 43.25), 64, OTTOMAN, 0.0),
    ("ANADOLU", (33.5, 39.2), 70, OTTOMAN, 0.0),
    ("MACARİSTAN KRALLIĞI", (21.0, 48.35), 60, HUNGARY, -3.0),
    ("KUTSAL ROMA-GERMEN İMP.", (11.6, 50.4), 50, INK, 0.0),
    ("LEHİSTAN", (21.0, 52.2), 56, INK, 0.0),
    ("EFLAK", (25.0, 44.65), 40, OTTOMAN, 0.0),
    ("BOĞDAN", (27.5, 47.1), 40, OTTOMAN, -20.0),
    ("HIRVATİSTAN", (16.0, 45.45), 34, HUNGARY, 0.0),
    ("ERDEL", (24.2, 46.4), 40, HUNGARY, 0.0),
]
SEA_LABELS = [("KARADENİZ", (34.0, 43.3), 70), ("ADRİYATİK DENİZİ", (15.6, 42.9), 44, -38), ("AKDENİZ", (21.0, 35.2), 70),
              ("EGE DENİZİ", (25.0, 38.8), 40)]


def poly_mask(size, polys_lonlat, scale=1.0, width=0):
    im = Image.new("L", size, 0)
    d = ImageDraw.Draw(im)
    for p in polys_lonlat:
        pts = [(x * scale, y * scale) for x, y in (P(*q) for q in p)]
        if width:
            d.line(pts + [pts[0]], fill=255, width=width, joint="curve")
        else:
            d.polygon(pts, fill=255)
    return np.asarray(im, np.float32) / 255.0


def main():
    print("doku", TW, TH)
    polys = load_land()
    # --- kara maskesi
    land_im = Image.new("L", (TW, TH), 0)
    d = ImageDraw.Draw(land_im)
    for poly in polys:
        lons = [p[0] for p in poly[0]]; lats = [p[1] for p in poly[0]]
        if max(lons) < LON0 - 2 or min(lons) > LON1 + 2 or max(lats) < LAT0 - 2 or min(lats) > LAT1 + 2:
            continue
        for k, r in enumerate(poly):
            d.polygon([P(*q) for q in r], fill=255 if k == 0 else 0)
    land = np.asarray(land_im.filter(ImageFilter.GaussianBlur(0.8)), np.float32) / 255.0

    # --- kağıt
    n1 = fbm((TH, TW), 7, seed=1)
    n2 = fbm((TH, TW), 4, seed=2, base=3)
    paper = PAPER[None, None] * (0.93 + 0.1 * n1[..., None]) - (PAPER - PAPER_DARK)[None, None] * (n2[..., None] ** 3) * 0.9

    # --- deniz + kıyı dalga çizgileri
    hs = 2
    small_land = land[::hs, ::hs] > 0.5
    dist = ndimage.distance_transform_edt(~small_land) * hs
    dist = ndimage.zoom(dist, (TH / dist.shape[0], TW / dist.shape[1]), order=1)[:TH, :TW]
    sea_col = SEA[None, None] * (0.95 + 0.08 * n1[..., None])
    ripple = ((np.mod(dist, 16.0) < 1.6) & (dist < 110) & (dist > 4)).astype(np.float32) * np.clip(1 - dist / 110, 0, 1)
    ripple = ndimage.gaussian_filter(ripple, 0.6)
    coast_shade = np.exp(-dist / 18.0) * 0.18
    sea = sea_col * (1 - coast_shade[..., None]) - ripple[..., None] * 45

    # --- kabartma (dağlar)
    sc = 2
    hh, hw = TH // sc, TW // sc
    ridge = Image.new("L", (hw, hh), 0)
    rd = ImageDraw.Draw(ridge)
    for m in MOUNTAINS:
        rd.line([(P(*q)[0] / sc, P(*q)[1] / sc) for q in m], fill=255, width=2, joint="curve")
    rdist = ndimage.distance_transform_edt(np.asarray(ridge) == 0)
    wob = fbm((hh, hw), 5, seed=9, base=10)
    sig = 16 + 22 * wob
    env = np.exp(-(rdist / sig) ** 2)
    rn = fbm((hh, hw), 7, seed=5, base=24)
    ridged = 1 - np.abs(2 * rn - 1)
    rn2 = fbm((hh, hw), 6, seed=6, base=60)
    height = env * (0.35 + 0.65 * ridged ** 2) * (0.7 + 0.3 * rn2) + 0.03 * rn
    height = ndimage.gaussian_filter(height, 0.8)
    height = ndimage.zoom(height, (TH / hh, TW / hw), order=3)[:TH, :TW]
    gy, gx = np.gradient(height * 900)
    shade = np.clip((-gx * 0.7 - gy * 0.7) / np.sqrt(gx ** 2 + gy ** 2 + 1), -1, 1)
    shade = ndimage.gaussian_filter(shade, 0.7)
    landcol = paper.copy()
    landcol *= (1 + 0.28 * shade[..., None] * land[..., None])
    landcol -= (height[..., None] * np.array([20, 26, 34])) * 0.5

    img = sea * (1 - land[..., None]) + landcol * land[..., None]

    # --- siyasi tonlar
    ott = poly_mask((TW, TH), [OTTOMAN_POLY]) * land
    hun = poly_mask((TW, TH), [HUNGARY_POLY]) * land
    vas = poly_mask((TW, TH), [WALLACHIA, MOLDAVIA]) * land
    yy, xx = np.mgrid[0:TH, 0:TW]
    hatch = (np.mod(xx + yy, 22) < 5).astype(np.float32)
    def tint(img, mask, col, a):
        return img * (1 - a * mask[..., None]) + np.array(col, np.float32)[None, None] * (a * mask[..., None])
    img = tint(img, ott, OTTOMAN_LIGHT, 0.30)
    img = tint(img, vas * (0.35 + 0.65 * hatch), OTTOMAN_LIGHT, 0.32)
    img = tint(img, hun, (60, 100, 170), 0.26)
    # sınır çizgileri (iç kenar gölgesi)
    for poly, col in ((OTTOMAN_POLY, OTTOMAN), (HUNGARY_POLY, HUNGARY)):
        m = poly_mask((TW, TH), [poly])
        edge = np.clip(m - ndimage.uniform_filter(m, 22), 0, 1) * 2.2 * land
        line = poly_mask((TW, TH), [poly], width=5) * land
        img = tint(img, np.clip(edge, 0, 1), col, 0.55)
        img = tint(img, line, col, 0.85)

    # --- kıyı mürekkep çizgisi
    coast = np.clip(np.abs(ndimage.sobel(land)) + np.abs(ndimage.sobel(land, 0)), 0, 1)
    img = tint(img, coast, INK, 0.75)

    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    # --- nehirler
    for name, pts in RIVERS.items():
        xy = [P(*q) for q in pts]
        w = 7 if name == "Tuna" else 4
        d.line(xy, fill=(70, 96, 112), width=w, joint="curve")
        d.line(xy, fill=(120, 150, 160), width=max(1, w - 4), joint="curve")

    # --- etiketler
    def text_c(txt, pos, font, fill, spacing=0, angle=0.0, alpha=255):
        if spacing:
            txt = (" " * spacing).join(txt) if False else txt
        bbox = font.getbbox(txt)
        tw, th = bbox[2] - bbox[0] + 20, bbox[3] - bbox[1] + 20
        layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        ImageDraw.Draw(layer).text((10 - bbox[0], 10 - bbox[1]), txt, font=font, fill=fill + (alpha,))
        if angle:
            layer = layer.rotate(angle, expand=True, resample=Image.BICUBIC)
        x, y = pos
        out.alpha_composite(layer, (int(x - layer.width / 2), int(y - layer.height / 2))) if out.mode == "RGBA" else out.paste(layer, (int(x - layer.width / 2), int(y - layer.height / 2)), layer)

    def spaced(t):
        return " ".join(t)

    for txt, ll, size, col, ang in REGION_LABELS:
        f = ImageFont.truetype(FONT_TITLE, size)
        text_c(spaced(txt), P(*ll), f, col, angle=ang, alpha=200)
    for item in SEA_LABELS:
        txt, ll, size = item[:3]
        ang = item[3] if len(item) > 3 else 0
        f = ImageFont.truetype(FONT_ITALIC, size)
        text_c(spaced(txt), P(*ll), f, (60, 74, 80), angle=ang, alpha=210)
    fc = ImageFont.truetype(FONT_BODY_SB, 40)
    for name, ll in CITIES.items():
        x, y = P(*ll)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=INK, width=3)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=INK)
        off = {"Mohaç": (-18, 0, "rm"), "Ösek": (-16, 34, "rm"), "Petervaradin": (14, 30, "lm"), "Tolna": (16, 0, "lm"),
               "Belgrad": (16, 26, "lm"), "Buda": (16, -6, "lm")}.get(name, (16, -4, "lm"))
        d.text((x + off[0], y + off[1]), name, font=fc, fill=INK, anchor=off[2])

    # --- çerçeve / pusula gülü
    out = out.convert("RGB")
    out.save(os.path.join(BUILD, "europe.png"))
    geo = {"tw": TW, "th": TH, "lon0": LON0, "lat1": LAT1, "kx": KX, "ky": KY,
           "cities": {k: P(*v) for k, v in CITIES.items()}}
    json.dump(geo, open(os.path.join(BUILD, "europe_geo.json"), "w"), ensure_ascii=False, indent=1)
    print("ok")


if __name__ == "__main__":
    main()
