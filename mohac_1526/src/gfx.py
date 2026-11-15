"""Skia çizim yardımcıları: metin, ok, portre madalyonu, bilgi kartı, birlik simgesi."""
import numpy as np
import skia
from common import *


def tf(path):
    return skia.Typeface.MakeFromFile(path)


TF_TITLE, TF_TITLE_R, TF_BODY, TF_BODY_SB, TF_IT = tf(FONT_TITLE), tf(FONT_TITLE_R), tf(FONT_BODY), tf(FONT_BODY_SB), tf(FONT_ITALIC)


def c4(rgb, a=1.0):
    return skia.Color4f(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, max(0.0, min(1.0, a)))


def paint(rgb, a=1.0, stroke=0, blur=0, dash=None):
    p = skia.Paint(AntiAlias=True, Color4f=c4(rgb, a))
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeCap(skia.Paint.kRound_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    if blur:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    if dash:
        p.setPathEffect(skia.DashPathEffect.Make(dash, 0))
    return p


def measure(txt, tf_, size, spacing=0.0):
    font = skia.Font(tf_, size)
    g = font.textToGlyphs(txt)
    return sum(font.getWidths(g)) + spacing * max(0, len(g) - 1)


def text(cv, txt, x, y, tf_, size, color, alpha=1.0, align="center", spacing=0.0, shadow=0.55):
    if alpha <= 0.003 or not txt:
        return 0
    font = skia.Font(tf_, size)
    font.setEdging(skia.Font.Edging.kAntiAlias)
    font.setSubpixel(True)
    glyphs = font.textToGlyphs(txt)
    widths = font.getWidths(glyphs)
    total = sum(widths) + spacing * (len(widths) - 1)
    x0 = x - total / 2 if align == "center" else (x - total if align == "right" else x)
    pos, cx = [], x0
    for wd in widths:
        pos.append(skia.Point(cx, y)); cx += wd + spacing
    b = skia.TextBlobBuilder()
    b.allocRunPos(font, glyphs, pos)
    blob = b.make()
    if shadow:
        cv.drawTextBlob(blob, 0, size * 0.05, paint((0, 0, 0), shadow * alpha, blur=size * 0.07))
    cv.drawTextBlob(blob, 0, 0, paint(color, alpha))
    return total


def wrap(txt, tf_, size, maxw):
    words, lines, cur = txt.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if measure(t, tf_, size) > maxw and cur:
            lines.append(cur); cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def catmull(points, n=24):
    p = np.array(points, float)
    if len(p) < 2:
        return p
    p = np.vstack([p[0], p, p[-1]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(p[-2])
    return np.array(out)


def partial(pts, prog):
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1] * prog
    k = int(np.clip(np.searchsorted(cum, L), 1, len(pts) - 1))
    t = (L - cum[k - 1]) / max(seg[k - 1], 1e-6)
    return np.vstack([pts[:k], pts[k - 1] + (pts[k] - pts[k - 1]) * t]), cum[-1]


def arrow_path(pts, prog, w0, w1, head=2.3):
    if prog <= 0.01:
        return None
    P, _ = partial(pts, prog)
    c2 = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    if c2[-1] < 2:
        return None
    hl = min(w1 * head * 1.25, c2[-1] * 0.6)
    body_len = c2[-1] - hl
    kb = int(np.clip(np.searchsorted(c2, body_len), 1, len(P) - 1))
    tb = (body_len - c2[kb - 1]) / max(c2[kb] - c2[kb - 1], 1e-6)
    bend = P[kb - 1] + (P[kb] - P[kb - 1]) * tb
    B = np.vstack([P[:kb], bend])
    if len(B) < 2 or np.linalg.norm(B[-1] - B[0]) < 1e-3:
        B = np.vstack([P[0], bend + (P[0] - bend) * 0.0 + 1e-3])
    d = np.gradient(B, axis=0) if len(B) > 2 else np.repeat((B[1] - B[0])[None], 2, 0)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    fr = np.linspace(0, 1, len(B))[:, None]
    w = (w0 + (w1 - w0) * fr) / 2
    left, right = B + nrm * w, B - nrm * w
    tip = P[-1]
    dv = tip - bend
    dv /= np.linalg.norm(dv) + 1e-9
    hn = np.array([-dv[1], dv[0]])
    path = skia.Path()
    path.moveTo(*left[0])
    for q in left[1:]:
        path.lineTo(*q)
    path.lineTo(*(bend + hn * w1 * head * 0.55))
    path.lineTo(*tip)
    path.lineTo(*(bend - hn * w1 * head * 0.55))
    for q in right[::-1]:
        path.lineTo(*q)
    path.close()
    return path


def draw_arrow(cv, pts, prog, col, dark, w0, w1, alpha=1.0, head=2.3):
    path = arrow_path(pts, prog, w0, w1, head)
    if path is None or alpha <= 0:
        return
    cv.save(); cv.translate(w1 * 0.25, w1 * 0.35)
    cv.drawPath(path, paint((20, 10, 5), 0.35 * alpha, blur=w1 * 0.25))
    cv.restore()
    cv.drawPath(path, paint(col, 0.88 * alpha))
    cv.drawPath(path, paint(dark, alpha, stroke=max(2.0, w1 * 0.08)))


def dashed_line(cv, pts, prog, col, width, alpha=1.0, dash=(30, 22)):
    if prog <= 0:
        return
    P, _ = partial(np.asarray(pts, float), prog)
    path = skia.Path()
    path.moveTo(*P[0])
    for q in P[1:]:
        path.lineTo(*q)
    cv.drawPath(path, paint(col, alpha, stroke=width, dash=list(dash)))


# ---------------------------------------------------------------- portreler (stilize siluet madalyonlar)
def _poly(pts, s, ox, oy):
    p = skia.Path()
    p.moveTo(ox + pts[0][0] * s, oy + pts[0][1] * s)
    for x, y in pts[1:]:
        p.lineTo(ox + x * s, oy + y * s)
    p.close()
    return p


def _smooth(pts, s, ox, oy, n=10):
    return _poly([tuple(q) for q in catmull(pts + [pts[0]], n)], s, ox, oy)


def portrait(cv, x, y, r, who, alpha=1.0, rim=(214, 172, 90)):
    if alpha <= 0.01:
        return
    cv.saveLayerAlpha(skia.Rect(x - r * 1.3, y - r * 1.3, x + r * 1.3, y + r * 1.3), int(255 * alpha))
    cv.drawCircle(x + r * 0.06, y + r * 0.1, r * 1.08, paint((0, 0, 0), 0.6, blur=r * 0.12))
    bg = (110, 30, 24) if who == "suleyman" else (28, 48, 88)
    grad = skia.GradientShader.MakeRadial(skia.Point(x - r * 0.25, y - r * 0.35), r * 1.3,
                                         [c4(tuple(min(255, int(c * 1.9)) for c in bg)), c4(bg), c4(tuple(int(c * 0.45) for c in bg))], [0, 0.55, 1])
    cv.drawCircle(x, y, r, skia.Paint(AntiAlias=True, Shader=grad))
    cv.save()
    clip = skia.Path(); clip.addCircle(x, y, r * 0.97)
    cv.clipPath(clip, doAntiAlias=True)
    s = r / 100.0
    ox, oy = x - 100 * s, y - 100 * s
    sil = (24, 16, 12)
    hi = (232, 196, 120)
    if who == "suleyman":
        body = [(10, 210), (22, 165), (55, 145), (88, 138), (118, 138), (150, 146), (182, 168), (196, 210)]
        cv.drawPath(_smooth(body, s, ox, oy), paint((56, 20, 16)))
        # kaftan yakası (kürk)
        cv.drawPath(_smooth([(60, 146), (92, 136), (104, 176), (86, 210), (70, 210)], s, ox, oy), paint((120, 96, 70)))
        head = [(86, 70), (112, 66), (128, 80), (134, 96), (142, 104), (134, 110), (136, 118), (130, 124), (126, 136),
                (112, 146), (96, 142), (86, 128), (80, 104)]
        cv.drawPath(_smooth(head, s, ox, oy), paint(sil))
        beard = [(108, 128), (128, 124), (124, 150), (112, 160), (98, 150)]
        cv.drawPath(_smooth(beard, s, ox, oy), paint(sil))
        # kavuk (büyük sarık) + sorguç
        turban = [(66, 78), (60, 44), (72, 16), (100, 4), (128, 14), (142, 40), (138, 72), (120, 82), (92, 84)]
        cv.drawPath(_smooth(turban, s, ox, oy), paint((236, 228, 210)))
        for k in range(5):
            yy = 22 + k * 12
            cv.drawLine(ox + 64 * s, oy + (yy + 6) * s, ox + 140 * s, oy + (yy - 4) * s, paint((170, 160, 140), 0.9, stroke=2.2 * s))
        cv.drawPath(_smooth([(88, 84), (90, 70), (124, 66), (130, 80), (110, 88)], s, ox, oy), paint((150, 36, 30)))
        cv.drawPath(_poly([(100, 6), (96, -18), (104, -24), (108, -2)], s, ox, oy), paint((214, 172, 90)))
        cv.drawCircle(ox + 104 * s, oy + 12 * s, 5 * s, paint((60, 120, 70)))
        # kenar ışığı
        cv.drawPath(_smooth(head, s, ox, oy), paint(hi, 0.55, stroke=2.4 * s))
    else:
        body = [(8, 210), (20, 168), (52, 146), (90, 140), (122, 142), (156, 150), (186, 172), (198, 210)]
        cv.drawPath(_smooth(body, s, ox, oy), paint((22, 30, 54)))
        # ermin yaka
        collar = [(40, 156), (80, 146), (130, 146), (168, 160), (160, 176), (120, 166), (84, 166), (48, 174)]
        cv.drawPath(_smooth(collar, s, ox, oy), paint((232, 226, 214)))
        for k in range(9):
            cv.drawCircle(ox + (58 + k * 12) * s, oy + (162 - (k % 2) * 3) * s, 2.2 * s, paint((20, 20, 20)))
        hair = [(70, 56), (100, 44), (128, 56), (134, 84), (124, 92), (90, 96), (76, 130), (62, 136), (58, 100)]
        cv.drawPath(_smooth(hair, s, ox, oy), paint((40, 26, 16)))
        head = [(84, 62), (110, 58), (126, 72), (132, 92), (140, 102), (132, 108), (134, 116), (126, 122), (122, 134),
                (104, 142), (90, 136), (82, 118), (78, 90)]
        cv.drawPath(_smooth(head, s, ox, oy), paint(sil))
        cv.drawPath(_smooth(hair[:3] + [(120, 70), (86, 72)], s, ox, oy), paint((40, 26, 16)))
        # taç
        crown = [(74, 60), (80, 26), (88, 46), (98, 18), (108, 44), (118, 20), (124, 46), (132, 28), (132, 62), (104, 54)]
        cv.drawPath(_poly(crown, s, ox, oy), paint((214, 172, 90)))
        cv.drawRect(skia.Rect(ox + 74 * s, oy + 50 * s, ox + 132 * s, oy + 62 * s), paint((184, 140, 60)))
        for px_, col in ((86, (170, 30, 30)), (103, (40, 90, 160)), (120, (170, 30, 30))):
            cv.drawCircle(ox + px_ * s, oy + 56 * s, 3.4 * s, paint(col))
        cv.drawPath(_smooth(head, s, ox, oy), paint(hi, 0.5, stroke=2.4 * s))
    cv.restore()
    cv.drawCircle(x, y, r, paint(rim, 1.0, stroke=r * 0.07))
    cv.drawCircle(x, y, r * 1.06, paint((70, 50, 24), 1.0, stroke=r * 0.02))
    cv.drawCircle(x, y, r * 0.93, paint((70, 50, 24), 0.8, stroke=r * 0.015))
    cv.restore()


def card(cv, x, y, w, title, lines, alpha, accent=(196, 158, 76), tsize=31, bsize=32, align="left"):
    """Belgesel bilgi kartı (koyu, altın kenarlı)."""
    if alpha <= 0.01:
        return 0
    if title:
        w = max(w, measure(title, TF_TITLE, tsize, 2.5) + 80)
    body = []
    for ln in lines:
        body += wrap(ln, TF_BODY, bsize, w - 60)
    h = 34 + (tsize + 18 if title else 0) + len(body) * bsize * 1.25 + 22
    dx = (1 - ease(alpha)) * (-40 if align == "left" else 40)
    cv.save(); cv.translate(dx, 0)
    r = skia.Rect(x, y, x + w, y + h)
    cv.drawRect(r.makeOffset(6, 8), paint((0, 0, 0), 0.45 * alpha, blur=14))
    cv.drawRect(r, paint((24, 18, 14), 0.9 * alpha))
    cv.drawRect(r, paint(accent, 0.9 * alpha, stroke=2))
    cv.drawRect(skia.Rect(x, y, x + 8, y + h), paint(accent, alpha))
    yy = y + 30
    if title:
        text(cv, title, x + 34, yy + tsize * 0.75, TF_TITLE, tsize, (232, 200, 130), alpha, "left", 2.5, shadow=0)
        yy += tsize + 18
        cv.drawRect(skia.Rect(x + 34, yy - 8, x + w - 30, yy - 6.5), paint(accent, 0.6 * alpha))
    for ln in body:
        yy += bsize * 1.25
        text(cv, ln, x + 34, yy - bsize * 0.3, TF_BODY, bsize, (238, 228, 208), alpha, "left", shadow=0)
    cv.restore()
    return h


# ---------------------------------------------------------------- birlik simgeleri
UNIT_STYLE = {
    "H": dict(top=(52, 84, 140), side=(26, 44, 80), edge=(16, 26, 50), sym=(236, 236, 240)),
    "O": dict(top=(168, 40, 34), side=(96, 20, 16), edge=(60, 12, 10), sym=(246, 222, 160)),
}


def draw_unit(cv, M, u, x, y, ang, alpha=1.0, glow=0.0, hit=0.0, scale=1.0):
    """Hafif 3B blok birlik simgesi. Taban dörtgeni dünya koordinatında, yükseklik ekranda."""
    if alpha <= 0.01:
        return None
    st = UNIT_STYLE[u["side"]]
    w, h = u.get("w", 200) * scale, u.get("h", 78) * scale
    ca, sa = np.cos(ang), np.sin(ang)
    corners = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    base = []
    for cx, cy in corners:
        wx, wy = x + cx * ca - cy * sa, y + cx * sa + cy * ca
        base.append(project(M, wx, wy))
    base = np.array(base)
    s = local_scale(M, x, y)
    hpx = 20 * s * scale
    top = base - np.array([0, hpx])
    cv.saveLayerAlpha(None, int(255 * alpha))
    # gölge
    sh = skia.Path(); sh.addPoly([skia.Point(*(p + np.array([hpx * 0.6, hpx * 0.35]))) for p in base], True)
    cv.drawPath(sh, paint((30, 18, 8), 0.45, blur=max(1.5, hpx * 0.35)))
    if glow > 0:
        g = skia.Path(); g.addPoly([skia.Point(*p) for p in base], True)
        cv.drawPath(g, paint((255, 230, 150), 0.65 * glow, blur=hpx * 1.6))
    # yan yüzler: kameraya bakanlar (ekranda alt kenarlar)
    for i in range(4):
        a, b = base[i], base[(i + 1) % 4]
        if (b[0] - a[0]) * 1 > 0 and True:
            pass
        edge_mid_y = (a[1] + b[1]) / 2
        center_y = base[:, 1].mean()
        if edge_mid_y >= center_y - 0.5:
            f = skia.Path(); f.addPoly([skia.Point(*a), skia.Point(*b), skia.Point(*top[(i + 1) % 4]), skia.Point(*top[i])], True)
            cv.drawPath(f, paint(st["side"]))
            cv.drawPath(f, paint(st["edge"], 1, stroke=max(1, s * 2)))
    tp = skia.Path(); tp.addPoly([skia.Point(*p) for p in top], True)
    topcol = tuple(int(c * (1 - 0.35 * hit) + 40 * hit) for c in st["top"])
    cv.drawPath(tp, paint(topcol))
    cv.drawPath(tp, paint(st["edge"], 1, stroke=max(1.2, s * 3)))

    def bl(u_, v_):  # üst yüzde iki doğrusal konum (u,v in 0..1)
        a = top[0] + (top[1] - top[0]) * u_
        b = top[3] + (top[2] - top[3]) * u_
        return a + (b - a) * v_
    sw = max(1.5, s * 5.5)
    sp = paint(st["sym"], 1, stroke=sw)
    inset = [bl(0.12, 0.18), bl(0.88, 0.18), bl(0.88, 0.82), bl(0.12, 0.82)]
    fr = skia.Path(); fr.addPoly([skia.Point(*p) for p in inset], True)
    cv.drawPath(fr, paint(st["sym"], 0.9, stroke=max(1, s * 2.5)))
    t = u["type"]
    if t in ("cav", "hcav", "akinci"):
        cv.drawLine(*bl(0.12, 0.82), *bl(0.88, 0.18), sp)
        if t == "hcav":
            cv.drawLine(*bl(0.12, 0.5), *bl(0.6, 0.18), sp)
            cv.drawLine(*bl(0.4, 0.82), *bl(0.88, 0.5), sp)
        if t == "akinci":
            p = skia.Path(); p.moveTo(*bl(0.2, 0.62)); p.lineTo(*bl(0.32, 0.4)); p.lineTo(*bl(0.44, 0.62))
            cv.drawPath(p, sp)
    elif t == "inf":
        cv.drawLine(*bl(0.12, 0.18), *bl(0.88, 0.82), sp)
        cv.drawLine(*bl(0.12, 0.82), *bl(0.88, 0.18), sp)
    elif t == "art":
        c = bl(0.5, 0.5)
        cv.drawCircle(*c, max(2, s * 13), paint(st["sym"]))
        cv.drawLine(*bl(0.5, 0.5), *bl(0.85, 0.5), sp)
    elif t == "camp":
        for k in range(5):
            cv.drawCircle(*bl(0.2 + k * 0.15, 0.5), max(1.5, s * 7), paint(st["sym"], 1, stroke=max(1, s * 3)))
    if hit > 0.05:
        c = bl(0.5, 0.5)
        cv.drawCircle(*c, s * 60, paint((255, 200, 120), 0.35 * hit, blur=s * 30))
    cv.restore()
    # sancak (komutanlar)
    anchor = top.mean(0)
    if u.get("flag"):
        px, py = anchor
        ph = 90 * s * scale
        cv.drawLine(px, py, px, py - ph, paint((40, 28, 18), alpha, stroke=max(1.5, s * 4)))
        fl = skia.Path()
        wv = np.sin(np.linspace(0, 3, 6)) * 4 * s
        fl.moveTo(px, py - ph)
        fw = 60 * s * scale
        fl.lineTo(px + fw, py - ph + 6 * s + wv[2])
        fl.lineTo(px + fw * 0.8, py - ph + 22 * s)
        fl.lineTo(px + fw, py - ph + 38 * s + wv[4])
        fl.lineTo(px, py - ph + 34 * s)
        fl.close()
        col = (196, 32, 28) if u["side"] == "O" else (240, 236, 226)
        cv.drawPath(fl, paint(col, alpha))
        cv.drawPath(fl, paint((40, 20, 10), alpha, stroke=max(1, s * 2)))
        if u["side"] == "O":
            cv.drawCircle(px + fw * 0.42, py - ph + 18 * s, 9 * s, paint((246, 230, 190), alpha))
            cv.drawCircle(px + fw * 0.47, py - ph + 17 * s, 7.5 * s, paint(col, alpha))
        else:
            cx_, cy_ = px + fw * 0.42, py - ph + 18 * s
            cv.drawLine(cx_, cy_ - 11 * s, cx_, cy_ + 11 * s, paint((190, 30, 30), alpha, stroke=3 * s))
            cv.drawLine(cx_ - 7 * s, cy_ - 4 * s, cx_ + 7 * s, cy_ - 4 * s, paint((190, 30, 30), alpha, stroke=3 * s))
            cv.drawLine(cx_ - 5 * s, cy_ + 3 * s, cx_ + 5 * s, cy_ + 3 * s, paint((190, 30, 30), alpha, stroke=3 * s))
        anchor = np.array([px, py - ph])
    return anchor, s


def unit_label(cv, anchor, s, txt, alpha, side):
    if alpha <= 0.02 or not txt:
        return
    size = float(np.clip(30 * s / 0.5, 20, 34))
    w = measure(txt, TF_BODY_SB, size) + 26
    x, y = anchor[0], anchor[1] - 18
    col = (150, 30, 26) if side == "O" else (34, 62, 110)
    r = skia.Rect(x - w / 2, y - size - 8, x + w / 2, y + 4)
    cv.drawRoundRect(r, 4, 4, paint((240, 228, 200), 0.92 * alpha))
    cv.drawRoundRect(r, 4, 4, paint(col, alpha, stroke=2))
    text(cv, txt, x, y - 8, TF_BODY_SB, size, col, alpha, shadow=0)
