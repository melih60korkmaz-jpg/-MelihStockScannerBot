"""Seslendirmeyi işler: uzun duraklamaları kısaltır, cümle sınırlarını bulur, zaman çizelgesi + SRT üretir.
Eksik sahne sesi (audio/sN.mp3 yoksa) için metin uzunluğundan süre tahmini yapılır ve sessizlik konur."""
import json, os, subprocess, wave
import numpy as np
from common import *

SR = 48000
MAX_PAUSE = 0.45

# Ekranda gösterilecek altyazılar (cümle cümle). Seslendirme metniyle aynı sırada.
SCENES = [
    {"id": 1, "title": "GİRİŞ", "lead": 1.6, "tail": 1.4, "subs": [
        "Yıl, 1526.",
        "Avrupa, doğudan gelen bir gücün ayak seslerini dinliyor.",
        "Osmanlı İmparatorluğu, Tuna boyunca batıya ilerliyor.",
        "Hedef: Macaristan Krallığı.",
        "Bu, bir krallığın kaderini birkaç saat içinde belirleyen bir savaşın hikâyesi."]},
    {"id": 2, "title": "SAVAŞ ÖNCESİ", "lead": 0.5, "tail": 0.9, "subs": [
        "Nisan ayında İstanbul'dan yola çıkan Kanuni Sultan Süleyman, Belgrad üzerinden kuzeye yürüdü.",
        "Temmuz sonunda Petervaradin Kalesi'ni aldı, ardından Ösek'te Drava Nehri'ni geçti.",
        "Karşısında, henüz yirmi yaşındaki Macar Kralı II. Lajos vardı.",
        "Macar komutanlar, Erdel ve Hırvat birliklerini beklemeden, Mohaç ovasında savaşmaya karar verdi."]},
    {"id": 3, "title": "ORDULAR KARŞI KARŞIYA", "lead": 0.9, "tail": 0.7, "subs": [
        "29 Ağustos.",
        "Mohaç'ın güneyinde iki ordu karşı karşıya.",
        "Macar ordusunun yaklaşık 25–30 bin kişi olduğu tahmin ediliyor.",
        "Osmanlı ordusu için tahminler ise 50 binden 100 bine kadar uzanıyor.",
        "Doğuda Tuna'nın bataklıkları, güneyde yüksek bir sırt...",
        "Bu arazi, savaşın kaderinde belirleyici olacaktı."]},
    {"id": 4, "title": "MOHAÇ SAVAŞI", "lead": 0.5, "tail": 0.8, "subs": [
        "Öğleden sonra, Macar ağır süvarisi hücuma geçti.",
        "İlk darbe, İbrahim Paşa komutasındaki Rumeli birliklerine indi.",
        "Rumeli kuvvetleri geri çekildi; Macarlar zafere yakın olduklarını düşündü.",
        "Kral da merkezle birlikte ileri atıldı.",
        "Ancak hücum, Sultan'ın çevresindeki yeniçerilere ve top hattına çarptı.",
        "Yoğun ateş, zırhlı süvarileri durdurdu.",
        "Bu sırada Behram Paşa'nın Anadolu kuvvetleri karşı saldırıya geçti.",
        "Bali Bey ve Hüsrev Bey'in birlikleri ise Macar ordusunu yandan kuşattı."]},
    {"id": 5, "title": "KRALLIĞIN ÇÖKÜŞÜ", "lead": 0.5, "tail": 0.8, "subs": [
        "Macar ordusu dağıldı.",
        "Kaçanların bir kısmı bataklıklarda ve Tuna'da hayatını kaybetti.",
        "Genç kral da savaş alanından uzaklaştı.",
        "Kaynakların çoğuna göre, Csele Deresi'ni geçerken atıyla birlikte boğuldu.",
        "Ancak ölümünün ayrıntıları bugün hâlâ tartışmalıdır."]},
    {"id": 6, "title": "SONUÇ", "lead": 0.6, "tail": 4.5, "subs": [
        "Savaş, kaynaklara göre yaklaşık iki saat sürdü.",
        "Sonraki yıllarda Macaristan bölünecek, Orta Avrupa'da Osmanlı–Habsburg mücadelesi başlayacaktı.",
        "29 Ağustos 1526: Mohaç Meydan Muharebesi."]},
]
SEC_PER_CHAR = 0.060  # mevcut kayıtlardan ölçülen ortalama (kısaltılmış duraklarla)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-af", "atempo=1.08", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def process(x, nsent):
    win = int(0.02 * SR)
    n = len(x) // win
    rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    silent = db < -38
    # baş/son sessizliği kırp
    idx = np.where(~silent)[0]
    a, b = max(idx[0] - 2, 0), min(idx[-1] + 4, n)
    runs, i = [], a
    while i < b:
        if silent[i]:
            j = i
            while j < b and silent[j]:
                j += 1
            runs.append((i, j))
            i = j
        else:
            i += 1
    out, pauses, cur, t_out = [], [], a, 0.0
    for (i, j) in runs:
        dur = (j - i) * win / SR
        seg = x[cur * win: i * win]
        out.append(seg); t_out += len(seg) / SR
        keep = min(dur, MAX_PAUSE)
        k = int(keep * SR)
        mid = i * win + (j - i) * win // 2
        out.append(x[mid - k // 2: mid - k // 2 + k] * 0.0)
        pauses.append((dur, t_out + keep / 2))
        t_out += k / SR
        cur = j
    out.append(x[cur * win: b * win])
    y = np.concatenate(out)
    # en uzun (n-1) duraklama = cümle sınırları
    cand = sorted(sorted(pauses, key=lambda p: -p[0])[: nsent - 1], key=lambda p: p[1])
    bounds = [0.0] + [p[1] for p in cand] + [len(y) / SR]
    return y, bounds


def main():
    timeline, narr_tracks, srt = [], [], []
    t = 0.0
    for sc in SCENES:
        path = os.path.join(ROOT, "audio", f"s{sc['id']}.mp3")
        n = len(sc["subs"])
        if os.path.exists(path):
            y, bounds = process(decode(path), n)
            missing = False
        else:
            lens = np.array([len(s) for s in sc["subs"]], float)
            durs = lens * SEC_PER_CHAR + 0.4
            bounds = list(np.concatenate([[0], np.cumsum(durs)]))
            y = np.zeros(int(bounds[-1] * SR), np.float32)
            missing = True
        start = t
        v0 = start + sc["lead"]
        sents = [[v0 + bounds[k], v0 + bounds[k + 1]] for k in range(n)]
        end = v0 + bounds[-1] + sc["tail"]
        timeline.append({"id": sc["id"], "title": sc["title"], "start": start, "end": end, "voice_start": v0,
                         "voice_end": v0 + bounds[-1], "sentences": sents, "subs": sc["subs"], "missing_audio": missing})
        narr_tracks.append((v0, y))
        t = end
    total = t
    mix = np.zeros(int(total * SR) + SR, np.float32)
    for v0, y in narr_tracks:
        i0 = int(v0 * SR)
        mix[i0: i0 + len(y)] += y
    peak = np.abs(mix).max() + 1e-9
    mix = mix / peak * 0.89
    with wave.open(os.path.join(BUILD, "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    json.dump({"total": total, "scenes": timeline}, open(os.path.join(BUILD, "timeline.json"), "w"), ensure_ascii=False, indent=1)

    def ts(s):
        h, m = int(s // 3600), int(s % 3600 // 60)
        return f"{h:02d}:{m:02d}:{s % 60:06.3f}".replace(".", ",")
    k = 1
    for sc in timeline:
        for (a, b), txt in zip(sc["sentences"], sc["subs"]):
            srt.append(f"{k}\n{ts(a)} --> {ts(b + 0.15)}\n{txt}\n")
            k += 1
    open(os.path.join(ROOT, "altyazi_tr.srt"), "w").write("\n".join(srt))
    for sc in timeline:
        print(f"Sahne {sc['id']} {sc['title']:<24} {sc['start']:6.1f} – {sc['end']:6.1f} sn  {'(SES EKSİK, tahmini süre)' if sc['missing_audio'] else ''}")
    print("toplam", round(total, 1))


if __name__ == "__main__":
    main()
