import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

import yfinance as yf
import pandas as pd
import numpy as np


# ============================================================
# MELİH STOCK SCANNER BOT
# Yeni ağırlıklı model
# EMA %40 - MACD %30 - HACİM %20 - RSI %10
# ============================================================

TOKEN = os.environ.get("BOT_TOKEN")

STOCKS = [
    "SNDL",
    "PLUG",
    "SOFI",
    "OPEN",
    "JOBY",
    "LCID",
    "GRAB",
    "NU",
    "MARA",
    "RIOT",
]


# ============================================================
# TELEGRAM
# ============================================================

def telegram(method, data=None):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"

    if data is not None:
        encoded = json.dumps(data).encode("utf-8")

        request = urllib.request.Request(
            url,
            data=encoded,
            headers={"Content-Type": "application/json"}
        )
    else:
        request = urllib.request.Request(url)

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def send_message(chat_id, text):
    return telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )


# ============================================================
# RSI
# ============================================================

def calculate_rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(
        alpha=1 / period,
        adjust=False
    ).mean()

    avg_loss = loss.ewm(
        alpha=1 / period,
        adjust=False
    ).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    rsi = 100 - (100 / (1 + rs))

    return rsi


# ============================================================
# HİSSE VERİSİ
# ============================================================

def get_stock_data(symbol):

    try:

        daily = yf.Ticker(symbol).history(
            period="6mo",
            interval="1d",
            auto_adjust=False
        )

        if daily.empty:
            return None

        daily = daily.dropna()

        close = daily["Close"]
        volume = daily["Volume"]

        # EMA
        daily["EMA9"] = close.ewm(
            span=9,
            adjust=False
        ).mean()

        daily["EMA20"] = close.ewm(
            span=20,
            adjust=False
        ).mean()

        # RSI
        daily["RSI"] = calculate_rsi(close)

        # MACD
        ema12 = close.ewm(
            span=12,
            adjust=False
        ).mean()

        ema26 = close.ewm(
            span=26,
            adjust=False
        ).mean()

        daily["MACD"] = ema12 - ema26

        daily["MACD_SIGNAL"] = daily["MACD"].ewm(
            span=9,
            adjust=False
        ).mean()

        # Hacim ortalaması
        daily["AVG_VOLUME"] = volume.shift(1).rolling(
            20
        ).mean()

        latest = daily.iloc[-1]

        price = float(latest["Close"])
        previous_close = float(daily["Close"].iloc[-2])

        ema9 = float(latest["EMA9"])
        ema20 = float(latest["EMA20"])

        rsi = float(latest["RSI"])

        macd = float(latest["MACD"])
        macd_signal = float(latest["MACD_SIGNAL"])

        current_volume = float(latest["Volume"])
        average_volume = float(latest["AVG_VOLUME"])

        if average_volume <= 0:
            volume_ratio = 0
        else:
            volume_ratio = current_volume / average_volume

        # ====================================================
        # VWAP - gün içi
        # ====================================================

        vwap = None

        try:

            intraday = yf.Ticker(symbol).history(
                period="1d",
                interval="5m",
                auto_adjust=False
            )

            if not intraday.empty:

                intraday = intraday.dropna()

                typical_price = (
                    intraday["High"]
                    + intraday["Low"]
                    + intraday["Close"]
                ) / 3

                total_volume = intraday["Volume"].sum()

                if total_volume > 0:

                    vwap = float(
                        (typical_price * intraday["Volume"]).sum()
                        / total_volume
                    )

        except Exception:
            vwap = None

        # ====================================================
        # YENİ SKOR MODELİ
        #
        # EMA     %40
        # MACD    %30
        # HACİM   %20
        # RSI     %10
        # ====================================================

        score = 0

        # ----------------------------------------------------
        # EMA - 40 PUAN
        # ----------------------------------------------------

        if price > ema9 and ema9 > ema20:
            score += 40

        elif price > ema20:
            score += 25

        elif price > ema9:
            score += 15

        else:
            score += 0

        # ----------------------------------------------------
        # MACD - 30 PUAN
        # ----------------------------------------------------

        if macd > macd_signal and macd > 0:
            score += 30

        elif macd > macd_signal:
            score += 20

        elif macd > 0:
            score += 10

        else:
            score += 0

        # ----------------------------------------------------
        # HACİM - 20 PUAN
        # ----------------------------------------------------

        if volume_ratio >= 2:
            score += 20

        elif volume_ratio >= 1.5:
            score += 15

        elif volume_ratio >= 1:
            score += 10

        elif volume_ratio >= 0.75:
            score += 5

        else:
            score += 0

        # ----------------------------------------------------
        # RSI - 10 PUAN
        # ----------------------------------------------------

        if 50 <= rsi <= 65:
            score += 10

        elif 45 <= rsi < 50:
            score += 7

        elif 65 < rsi <= 70:
            score += 7

        elif 40 <= rsi < 45:
            score += 5

        elif 30 <= rsi < 40:
            score += 3

        else:
            score += 0

        # ====================================================
        # ETİKET
        # ====================================================

        if score >= 80:
            label = "AL ADAYI"

        elif score >= 65:
            label = "TUT"

        elif score >= 50:
            label = "DİKKAT"

        else:
            label = "RİSKLİ"

        # ====================================================
        # GÜN İÇİ VWAP DURUMU
        # ====================================================

        if vwap is not None:

            if price > vwap:
                vwap_status = "ÜSTÜNDE"

            elif price >= vwap * 0.99:
                vwap_status = "YAKIN"

            else:
                vwap_status = "ALTINDA"

        else:
            vwap_status = "VERİ YOK"

        # ====================================================
        # GÜNLÜK DEĞİŞİM
        # ====================================================

        daily_change = (
            (price - previous_close)
            / previous_close
        ) * 100

        return {
            "symbol": symbol,
            "price": price,
            "change": daily_change,
            "ema9": ema9,
            "ema20": ema20,
            "rsi": rsi,
            "macd": macd,
            "macd_signal": macd_signal,
            "volume_ratio": volume_ratio,
            "vwap": vwap,
            "vwap_status": vwap_status,
            "score": int(score),
            "label": label
        }

    except Exception as e:

        print(f"{symbol} hata: {e}")

        return None


# ============================================================
# TARAMA
# ============================================================

def scan_stocks():

    results = []

    print()
    print("ABD HİSSE TARAMASI")
    print("===================")

    for symbol in STOCKS:

        print(f"{symbol} taranıyor...")

        result = get_stock_data(symbol)

        if result:
            results.append(result)

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results


# ============================================================
# TELEGRAM MESAJI
# ============================================================

def create_scan_message(results):

    now = datetime.now().strftime("%d.%m.%Y %H:%M")

    message = (
        "📊 MELİH STOCK SCANNER\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"🕐 {now}\n\n"
        "🎯 YENİ SKOR MODELİ\n"
        "EMA %40 | MACD %30\n"
        "Hacim %20 | RSI %10\n\n"
    )

    for r in results:

        emoji = "🟢"

        if r["label"] == "AL ADAYI":
            emoji = "🚀"

        elif r["label"] == "TUT":
            emoji = "🟢"

        elif r["label"] == "DİKKAT":
            emoji = "🟡"

        else:
            emoji = "🔴"

        message += (
            f"{emoji} {r['symbol']}  ${r['price']:.2f}\n"
            f"   Skor: {r['score']}/100 → {r['label']}\n"
            f"   Günlük: {r['change']:+.2f}%\n"
            f"   EMA9: ${r['ema9']:.2f}\n"
            f"   EMA20: ${r['ema20']:.2f}\n"
            f"   RSI: {r['rsi']:.1f}\n"
            f"   MACD: {r['macd']:.3f}\n"
            f"   Hacim: {r['volume_ratio']:.2f}x\n"
            f"   VWAP: {r['vwap_status']}\n\n"
        )

    message += (
        "━━━━━━━━━━━━━━━━━━\n"
        "⚠️ Bu skor geçmiş verilerle geliştirilen "
        "tarama modelidir.\n"
        "Skor kesin yükseliş garantisi değildir."
    )

    return message


# ============================================================
# KOMUTLAR
# ============================================================

def help_message():

    return (
        "🤖 MELİH STOCK SCANNER\n\n"
        "/start - Botu başlat\n"
        "/tara - Hisseleri tara\n"
        "/sinyaller - Güncel sinyaller\n"
        "/aktif - Aktif takipler\n"
        "/performans - Model bilgisi\n"
        "/yardim - Yardım\n"
    )


def performance_message():

    return (
        "📈 MODEL BİLGİSİ\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Yeni ağırlıklı model:\n\n"
        "EMA → %40\n"
        "MACD → %30\n"
        "Hacim → %20\n"
        "RSI → %10\n\n"
        "Model 12.000+ tarihsel test örneği "
        "üzerinde analiz edilerek oluşturuldu.\n\n"
        "⚠️ Geçmiş sonuçlar gelecekteki getiriyi "
        "garanti etmez."
    )


# ============================================================
# GÜNCEL TELEGRAM MESAJLARINI KONTROL ET
# ============================================================

def get_updates():

    try:

        result = telegram(
            "getUpdates",
            {
                "timeout": 1
            }
        )

        return result.get("result", [])

    except Exception as e:

        print("Telegram güncelleme hatası:", e)

        return []


# ============================================================
# ANA PROGRAM
# ============================================================

def main():

    print()
    print("================================")
    print("MelihStockScannerBot başlatılıyor")
    print("================================")

    if not TOKEN:

        print("BOT_TOKEN bulunamadı!")

        return

    updates = get_updates()

    chat_ids = set()

    for update in updates:

        message = update.get("message")

        if not message:
            continue

        chat_id = message["chat"]["id"]

        chat_ids.add(chat_id)

        text = message.get(
            "text",
            ""
        ).strip().lower()

        if text in ["/start", "/yardim", "/yardım"]:

            send_message(
                chat_id,
                help_message()
            )

        elif text in ["/tara", "/sinyaller"]:

            results = scan_stocks()

            if results:

                send_message(
                    chat_id,
                    create_scan_message(results)
                )

        elif text == "/performans":

            send_message(
                chat_id,
                performance_message()
            )

        elif text == "/aktif":

            send_message(
                chat_id,
                "📌 Aktif takip sistemi bir sonraki aşamada "
                "devreye alınacak."
            )

    # ========================================================
    # Eğer yeni mesaj varsa tarama sonucunu gönder
    # ========================================================

    if chat_ids:

        results = scan_stocks()

        if results:

            message = create_scan_message(
                results
            )

            for chat_id in chat_ids:

                try:

                    send_message(
                        chat_id,
                        message
                    )

                except Exception as e:

                    print(
                        f"Telegram gönderim hatası: {e}"
                    )

    else:

        print(
            "Yeni Telegram mesajı bulunamadı."
        )


if __name__ == "__main__":
    main()
