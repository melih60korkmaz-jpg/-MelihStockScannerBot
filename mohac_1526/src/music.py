"""Telifsiz, tamamen kodla sentezlenen gerilimli belgesel müziği + ses efektleri + anlatım miksi.
Çıktı: build/final_audio.wav (48 kHz stereo)"""
import os, subprocess, wave
import numpy as np
from scipy import signal
from common import *
import render as R

SR = 48000
TOT = R.TOTAL
N = int(TOT * SR) + SR
t = np.arange(N) / SR
rng = np.random.default_rng(42)


def lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2))
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def saw(f, tt, harm=12):
    return sum(np.sin(2 * np.pi * f * k * tt) / k for k in range(1, harm + 1))


def note(f, start, dur, amp=1.0, kind="pad", att=0.6, rel=1.2):
    i0, i1 = int(start * SR), int(min(N, (start + dur + rel) * SR))
    if i0 >= N:
        return
    tt = np.arange(i1 - i0) / SR
    e = np.clip(tt / att, 0, 1) * np.clip((dur + rel - tt) / rel, 0, 1)
    if kind == "pad":
        x = sum(saw(f * (1 + d), tt, 8) for d in (-0.003, 0, 0.0035)) / 3
        x *= 0.85 + 0.15 * np.sin(2 * np.pi * 5.2 * tt)
    elif kind == "brass":
        x = saw(f, tt, 14) * (0.6 + 0.4 * np.clip(tt / 0.15, 0, 1))
    elif kind == "cello":
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt) * np.clip(tt / 0.6, 0, 1)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph) + 0.12 * np.sin(4 * ph)
    else:
        x = np.sin(2 * np.pi * f * tt)
    BUS[kind][i0:i1] += amp * x * e


BUS = {k: np.zeros(N) for k in ("pad", "brass", "cello", "sine")}
DRUM = np.zeros(N)
SFX = np.zeros(N)


def drum(t0, amp=1.0, f0=55, decay=4.0, noise=0.3):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    L = min(N - i0, int(1.6 * SR))
    tt = np.arange(L) / SR
    x = np.sin(2 * np.pi * (f0 + f0 * 1.2 * np.exp(-tt * 18)) * tt) * np.exp(-tt * decay)
    x += noise * rng.normal(0, 1, L) * np.exp(-tt * 40)
    DRUM[i0:i0 + L] += amp * x


def cannon(t0, amp=1.0):
    i0 = int(t0 * SR)
    L = min(N - i0, int(3.0 * SR))
    tt = np.arange(L) / SR
    n = rng.normal(0, 1, L)
    body = lp(n, 900) * np.exp(-tt * 3.5) * 2.2
    thump = np.sin(2 * np.pi * (40 + 70 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 4.5) * 1.6
    crack = hp(n, 2000) * np.exp(-tt * 45) * 0.8
    tail = lp(n, 300) * np.exp(-tt * 1.2) * 0.5
    SFX[i0:i0 + L] += amp * (body + thump + crack + tail)


def rumble(a, b, amp=0.5):
    i0, i1 = int(a * SR), int(min(N, b * SR))
    L = i1 - i0
    tt = np.arange(L) / SR
    n = lp(rng.normal(0, 1, L), 180, 4) * 6
    gallop = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 2.6 * tt)) ** 4
    e = np.clip(tt / 1.0, 0, 1) * np.clip((L / SR - tt) / 1.5, 0, 1)
    SFX[i0:i1] += amp * n * gallop * e


# ------------------------------------------------ kompozisyon (Re minör)
D2, F2, G2, A2, Bb2, C3, D3 = 73.42, 87.31, 98.0, 110.0, 116.54, 130.81, 146.83
CH = {"Dm": [D3, 174.61, 220.0], "Bb": [Bb2, 146.83, 174.61], "Gm": [G2, 116.54, 146.83], "A": [A2, 138.59, 164.81],
      "F": [F2, 130.81, 174.61], "C": [C3, 164.81, 196.0]}
s = lambda k, i=None, f=0.0: R.T(k, i, f)

# drone tüm süre
for f0, a in ((D2 / 2, 0.55), (D2, 0.35), (A2 / 2, 0.25)):
    BUS["sine"] += a * np.sin(2 * np.pi * f0 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t))
# 1. ve 2. bölüm: yavaş akorlar
prog1 = ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "F", "A"]
step = 5.5
k = 0
tt0 = 1.0
while tt0 < s(3):
    for f in CH[prog1[k % len(prog1)]]:
        note(f, tt0, step, 0.16, "pad", att=1.5, rel=2.0)
    k += 1
    tt0 += step
# başlık vuruşu
drum(s(1, 4, 0.0), 2.2, 42, 2.0, 0.5)
# 2. bölüm: ostinato nabız
bpm = 84
beat = 60 / bpm
x = s(2)
while x < s(3) + 1:
    drum(x, 0.35, 70, 9, 0.1)
    x += beat * 2
# 3. bölüm: gerilim – tremolo yaylar + taiko
x = s(3)
while x < s(4):
    drum(x, 0.7, 52, 5, 0.25)
    drum(x + beat * 1.5, 0.35, 60, 7, 0.2)
    x += beat * 4
for i, c in enumerate(["Dm", "Gm", "A", "Dm"]):
    for f in CH[c]:
        note(f, s(3) + i * 5.2, 5.2, 0.15, "pad", att=0.8, rel=1.5)
# 4. bölüm: savaş – davullar + bakır vurgular
bpm4 = 96
b4 = 60 / bpm4
x = s(4)
while x < s(5):
    for off, a, f0 in ((0, 1.0, 48), (b4 * 0.75, 0.5, 58), (b4 * 1.5, 0.7, 52), (b4 * 2, 0.9, 48), (b4 * 3, 0.6, 64), (b4 * 3.5, 0.4, 70)):
        drum(x + off, a * 0.8, f0, 5, 0.35)
    x += b4 * 4
prog4 = ["Dm", "Dm", "Bb", "C", "Dm", "A", "Gm", "A"]
for i, c in enumerate(prog4):
    st = s(4) + i * (s(5) - s(4)) / len(prog4)
    for f in CH[c]:
        note(f * 2, st, (s(5) - s(4)) / len(prog4) * 0.9, 0.10, "brass", att=0.08, rel=0.6)
        note(f, st, (s(5) - s(4)) / len(prog4), 0.12, "pad", att=0.3, rel=0.8)
# 5. bölüm: hüzün – çello melodisi
mel = [(D3, 1.6), (F2 * 2, 1.2), (A2 * 2, 2.0), (G2 * 2, 1.4), (F2 * 2, 1.0), (196.0, 1.6), (D3, 2.6), (C3, 1.4), (A2, 2.8)]
x = s(5) + 0.3
for f, d in mel:
    note(f, x, d, 0.22, "cello", att=0.25, rel=0.6)
    x += d
for i, c in enumerate(["Dm", "Bb", "Gm", "A"]):
    for f in CH[c]:
        note(f, s(5) + i * 4.6, 4.6, 0.13, "pad", att=1.2, rel=1.5)
# 6. bölüm: final kreşendo
for i, c in enumerate(["Dm", "Bb", "F", "A", "Dm"]):
    dur = (TOT - s(6)) / 5
    for f in CH[c]:
        note(f, s(6) + i * dur, dur, 0.15 + 0.03 * i, "pad", att=1.0, rel=1.5)
        if i >= 3:
            note(f * 2, s(6) + i * dur, dur, 0.06, "brass", att=0.5, rel=1.5)
drum(s(6, 2, 0.0), 2.4, 40, 1.6, 0.6)

# ------------------------------------------------ efektler
for tc in R.CANNON_TIMES:
    cannon(tc, 0.55 if tc in R.H_CANNON else 0.8)
for tc in R.CHARGE_TIMES:
    rumble(tc, tc + 4.5, 0.6)
rumble(s(5, 0, 0.0), s(5, 1, 0.9), 0.35)


def reverb(x, secs=2.2, wet=0.25):
    L = int(secs * SR)
    ir = rng.normal(0, 1, L) * np.exp(-np.arange(L) / SR * 3.0)
    ir = lp(ir, 3500)
    ir /= np.abs(ir).sum() ** 0.5 * 30
    y = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - wet) + y * wet * 8


pad = lp(BUS["pad"], 2200)
brass = lp(BUS["brass"], 1800)
cello = lp(BUS["cello"], 2500)
music = reverb(pad * 0.9 + brass * 0.8 + cello * 1.0, 2.8, 0.35) + BUS["sine"] * 0.25 + lp(DRUM, 4000) * 0.8
music = music / (np.abs(music).max() + 1e-9)
if os.environ.get("MUSIC", "0") != "1":
    music = music * 0.0
# giriş/çıkış
music *= np.clip(t / 2.0, 0, 1) * np.clip((TOT - t) / 2.5, 0, 1)

# anlatım
npath = os.path.join(BUILD, "narration.wav")
if os.path.exists(npath):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", npath, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
else:
    voice = np.zeros(N, np.float32)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
# ducking: anlatım varken müzik -10 dB
envv = signal.filtfilt(*signal.butter(2, 3 / (SR / 2)), np.abs(voice))
duck = 1 - 0.75 * np.clip(envv / 0.04, 0, 1)
sfx = reverb(SFX, 1.8, 0.3)
sfx = sfx / (np.abs(sfx).max() + 1e-9)
mix_l = voice * 1.0 + music * 0.48 * duck + sfx * 0.42 * (1 - 0.35 * np.clip(envv / 0.04, 0, 1))
pan = 0.15 * np.sin(np.arange(N) / SR * 0.5)
L = voice + music * 0.48 * duck * (1 - pan) + sfx * 0.42 * (1 - 0.35 * np.clip(envv / 0.04, 0, 1)) * (1 + pan * 0.5)
Rr = voice + music * 0.48 * duck * (1 + pan) + sfx * 0.42 * (1 - 0.35 * np.clip(envv / 0.04, 0, 1)) * (1 - pan * 0.5)
st = np.stack([L, Rr], 1)
st = np.tanh(st / (np.abs(st).max() + 1e-9) * 1.3) * 0.9
n_out = int(TOT * SR)
with wave.open(os.path.join(BUILD, "final_audio.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st[:n_out] * 32767).astype(np.int16).tobytes())
print("ses tamam", TOT)
