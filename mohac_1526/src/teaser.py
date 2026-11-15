"""5 saniyelik fragman: Avrupa haritası -> Osmanlı ilerleyişi -> Mohaç'a yakınlaşma -> başlık."""
import json, os, subprocess, sys
import numpy as np
import skia
from PIL import Image
from common import *

geo = json.load(open(os.path.join(BUILD, "europe_geo.json")))
C = geo["cities"]
DUR = 5.0
N = int(DUR * FPS)


def ll(lon, lat):
    return ((lon - geo["lon0"]) * geo["kx"], (geo["lat1"] - lat) * geo["ky"])


def tf(path):
    return skia.Typeface.MakeFromFile(path)


TF_TITLE, TF_TITLE_R, TF_BODY, TF_IT = tf(FONT_TITLE), tf(FONT_TITLE_R), tf(FONT_BODY_SB), tf(FONT_ITALIC)


def load_tex():
    im = np.asarray(Image.open(os.path.join(BUILD, "europe.png")).convert("RGBA"))
    return skia.Image.fromarray(im.copy()).withDefaultMipmaps()


def smat(M):
    return skia.Matrix.MakeAll(*[float(v) for v in M.flatten()])


def catmull(points, n=24):
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


def arrow_path(pts, prog, w0, w1, head=2.6):
    """Kalınlığı w0->w1 incelen, ucunda ok başı olan dolu yol (dünya koordinatı)."""
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1] * prog
    if L < 1:
        return None
    k = np.searchsorted(cum, L)
    k = max(1, min(k, len(pts) - 1))
    t = (L - cum[k - 1]) / max(seg[k - 1], 1e-6)
    end = pts[k - 1] + (pts[k] - pts[k - 1]) * t
    P = np.vstack([pts[:k], end])
    hl = w1 * head * 1.3
    # ok başı için gövdeyi kısalt
    c2 = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    body_len = max(c2[-1] - hl, 0.0)
    kb = max(1, np.searchsorted(c2, body_len))
    if kb >= len(P):
        kb = len(P) - 1
    tb = (body_len - c2[kb - 1]) / max(c2[kb] - c2[kb - 1], 1e-6)
    bend = P[kb - 1] + (P[kb] - P[kb - 1]) * tb
    B = np.vstack([P[:kb], bend])
    if len(B) < 2:
        B = np.vstack([P[0], P[0] + (P[-1] - P[0]) * 0.01])
    d = np.gradient(B, axis=0)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    fr = np.linspace(0, 1, len(B))[:, None] * (body_len / max(c2[-1], 1e-6))
    w = (w0 + (w1 - w0) * fr) / 2
    left, right = B + nrm * w, B - nrm * w
    tip = P[-1]
    dirv = tip - bend
    dirv /= np.linalg.norm(dirv) + 1e-9
    hn = np.array([-dirv[1], dirv[0]])
    path = skia.Path()
    path.moveTo(*left[0])
    for q in left[1:]:
        path.lineTo(*q)
    path.lineTo(*(bend + hn * w1 * head / 2 * 1.15))
    path.lineTo(*tip)
    path.lineTo(*(bend - hn * w1 * head / 2 * 1.15))
    for q in right[::-1]:
        path.lineTo(*q)
    path.close()
    return path


def draw_text(canvas, txt, x, y, tf_, size, color, alpha=1.0, align="center", spacing=0.0, shadow=True):
    font = skia.Font(tf_, size)
    font.setEdging(skia.Font.Edging.kSubpixelAntiAlias)
    glyphs = font.textToGlyphs(txt)
    widths = font.getWidths(glyphs)
    total = sum(widths) + spacing * (len(widths) - 1)
    x0 = x - total / 2 if align == "center" else (x - total if align == "right" else x)
    pos, cx = [], x0
    for wd in widths:
        pos.append(skia.Point(cx, y)); cx += wd + spacing
    blob = skia.TextBlob.MakeFromPosText(txt, pos, font) if False else None
    builder = skia.TextBlobBuilder()
    builder.allocRunPos(font, glyphs, pos)
    blob = builder.make()
    if shadow:
        sp = skia.Paint(AntiAlias=True, Color=skia.Color4f(0, 0, 0, 0.55 * alpha),
                        MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.08))
        canvas.drawTextBlob(blob, 0, size * 0.04, sp)
    p = skia.Paint(AntiAlias=True, Color=skia.Color4f(color[0] / 255, color[1] / 255, color[2] / 255, alpha))
    canvas.drawTextBlob(blob, 0, 0, p)
    return total


def lerp(a, b, t):
    return a + (b - a) * t


ROUTE = [C[k] for k in ["İstanbul", "Edirne", "Filibe", "Sofya", "Niş", "Belgrad", "Petervaradin", "Ösek", "Mohaç"]]
ROUTE_S = catmull(ROUTE, 30)
GRAIN = [np.random.default_rng(i).normal(0, 1, (H // 2, W // 2)).astype(np.float32) for i in range(8)]


def render_frame(tex, f):
    t = f / FPS
    surface = skia.Surface(W, H)
    cv = surface.getCanvas()
    cv.clear(skia.Color(214, 196, 152))
    # --- kamera
    u = ease_io(t / DUR)
    start = ll(24.5, 43.4)
    mo = C["Mohaç"]
    cx = lerp(start[0], mo[0], u)
    cy = lerp(start[1], mo[1] + 60, u)
    zoom = 0.47 * (1.45 / 0.47) ** (u ** 1.5)
    tilt = lerp(0.50, 0.62, u)
    rot = lerp(-0.04, 0.0, u)
    M = camera_matrix(cx, cy, zoom, tilt, rot)
    cv.save()
    cv.concat(smat(M))
    cv.drawImage(tex, 0, 0, skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear))
    # --- Osmanlı ilerleyiş oku
    prog = ease((t - 0.3) / 3.0)
    path = arrow_path(ROUTE_S, prog, 18, 44, head=2.2)
    if path is not None:
        sh = skia.Paint(AntiAlias=True, Color=skia.Color4f(0.1, 0.03, 0.02, 0.35),
                        MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 9))
        cv.save(); cv.translate(10, 14); cv.drawPath(path, sh); cv.restore()
        cv.drawPath(path, skia.Paint(AntiAlias=True, Color=skia.Color(150, 30, 26, 235)))
        cv.drawPath(path, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4,
                                     Color=skia.Color(70, 12, 10, 255)))
    # --- Mohaç nabız halkası
    if t > 3.0:
        for k in range(3):
            ph = ((t - 3.0) * 0.8 + k / 3) % 1.0
            r = 20 + 140 * ph
            cv.drawCircle(mo[0], mo[1], r, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=6,
                                                       Color=skia.Color4f(0.6, 0.08, 0.05, (1 - ph) * 0.8 * ease(t - 3.0))))
    cv.restore()

    # --- ufuk sisi (perspektifin üst kısmı)
    haze = skia.Paint(Shader=skia.GradientShader.MakeLinear(
        [skia.Point(0, 0), skia.Point(0, H * 0.42)],
        [skia.Color4f(0.84, 0.78, 0.64, 0.92), skia.Color4f(0.84, 0.78, 0.64, 0.0)]))
    cv.drawRect(skia.Rect(0, 0, W, H * 0.42), haze)
    # --- vinyet
    vig = skia.Paint(Shader=skia.GradientShader.MakeRadial(
        skia.Point(W / 2, H * 0.55), W * 0.72,
        [skia.Color4f(0, 0, 0, 0), skia.Color4f(0.08, 0.04, 0.02, 0.0), skia.Color4f(0.08, 0.04, 0.02, 0.72)], [0, 0.55, 1.0]))
    cv.drawRect(skia.Rect(0, 0, W, H), vig)

    # --- yıl etiketi (sol üst)
    a0 = ease(t / 0.8) * (1 - ease((t - 2.6) / 0.5))
    if a0 > 0:
        draw_text(cv, "AVRUPA", 120, 150, TF_TITLE_R, 30, (240, 228, 200), a0, "left", 10)
        draw_text(cv, "1526", 116, 250, TF_TITLE, 110, (236, 214, 160), a0, "left", 6)
        cv.drawRect(skia.Rect(122, 172, 122 + 260 * a0, 174), skia.Paint(Color=skia.Color4f(0.85, 0.7, 0.4, a0)))

    # --- başlık
    if t > 2.8:
        a = ease((t - 2.8) / 0.9)
        dark = skia.Paint(Color=skia.Color4f(0.05, 0.03, 0.02, 0.45 * a))
        cv.drawRect(skia.Rect(0, 0, W, H), dark)
        sp = lerp(40, 18, ease((t - 2.8) / 2.0))
        draw_text(cv, "MOHAÇ 1526", W / 2, H / 2 - 10, TF_TITLE, 150, (232, 200, 120), a, spacing=sp)
        lw = 520 * a
        gp = skia.Paint(AntiAlias=True, Color=skia.Color4f(0.82, 0.66, 0.36, a))
        cv.drawRect(skia.Rect(W / 2 - lw, H / 2 + 30, W / 2 + lw, H / 2 + 32), gp)
        a2 = ease((t - 3.4) / 0.8)
        if a2 > 0:
            draw_text(cv, "İKİ SAATTE ÇÖKEN KRALLIK", W / 2, H / 2 + 100, TF_TITLE_R, 52, (240, 230, 210), a2, spacing=14)

    img = surface.makeImageSnapshot().toarray()[:, :, :3].astype(np.float32)  # BGRA? -> handled below
    # --- film greni + fade
    g = GRAIN[f % len(GRAIN)]
    g = np.repeat(np.repeat(g, 2, 0), 2, 1)
    img += g[..., None] * 5.0
    fade = ease(t / 0.6) * (1 - ease((t - (DUR - 0.35)) / 0.35))
    img *= fade
    return np.clip(img, 0, 255).astype(np.uint8)


def make_audio(out):
    sr = 48000
    n = int(DUR * sr)
    tt = np.arange(n) / sr
    rng = np.random.default_rng(0)
    # düşük drone (Re minör) + yavaş tremolo
    drone = sum(a * np.sin(2 * np.pi * f * tt + p) for f, a, p in [(36.71, 0.5, 0), (55.0, 0.35, 1), (73.42, 0.25, 2), (110.0, 0.08, 0.5), (146.8, 0.05, 0.2)])
    drone *= (0.75 + 0.25 * np.sin(2 * np.pi * 0.35 * tt)) * np.clip(tt / 1.5, 0, 1)
    # gerilim yayları: hafif detune edilmiş testere dalgaları, alçak geçiren
    strings = np.zeros(n)
    for f0 in (293.66, 349.23, 440.0):
        for det in (-0.6, 0.0, 0.7):
            ph = 2 * np.pi * (f0 + det) * tt
            strings += np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    strings *= 0.018 * np.clip((tt - 1.0) / 2.5, 0, 1)
    # başlık vuruşu (timpani/boom) t=2.8
    boom = np.zeros(n)
    for t0, amp in ((2.8, 1.0), (0.05, 0.5)):
        i0 = int(t0 * sr)
        tb = tt[: n - i0]
        env = np.exp(-tb * 3.2)
        b = (np.sin(2 * np.pi * (48 + 30 * np.exp(-tb * 8)) * tb) * env + rng.normal(0, 1, len(tb)) * np.exp(-tb * 30) * 0.3)
        boom[i0:] += amp * b
    mus = 0.35 * drone + strings + 0.6 * boom
    mus *= 1 - np.clip((tt - (DUR - 0.6)) / 0.6, 0, 1)
    mus = mus / (np.abs(mus).max() + 1e-9) * 0.5
    path = os.path.join(BUILD, "teaser_music.wav")
    import wave
    st = np.stack([mus, mus], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    return path


def main():
    out = os.path.join(BUILD, "fragman_5sn.mp4")
    tex = load_tex()
    music = make_audio(None)
    narr = os.path.join(ROOT, "audio", "s1.mp3")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", music, "-ss", "0", "-t", "3.6", "-i", narr,
           "-filter_complex", "[2:a]adelay=500|500,volume=1.5[n];[1:a][n]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-t", str(DUR), "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(N):
        fr = render_frame(tex, f)
        p.stdin.write(fr.tobytes())
        if f % 30 == 0:
            print("kare", f, flush=True)
    p.stdin.close(); p.wait()
    print(out)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        tex = load_tex()
        for f in map(int, sys.argv[1:]):
            fr = render_frame(tex, f)
            Image.fromarray(fr[:, :, ::-1]).save(f"/tmp/claude-0/tz_{f}.png")
    else:
        main()
