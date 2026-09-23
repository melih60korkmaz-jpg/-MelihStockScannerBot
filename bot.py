import os
import json
import urllib.request
import urllib.parse

import yfinance as yf
import pandas as pd
import numpy as np


TOKEN = os.getenv("BOT_TOKEN")

STOCKS = [
    "SNDL",
    "PLUG",
    "SOFI",
    "OPEN",
    "JOBY",
    "LCID",
    "NU",
    "GRAB",
    "MARA",
    "RIOT",
]


def telegram(method, data=None):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"

    if data is None:
        data = {}

    encoded = urllib.parse.urlencode(data).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=encoded,
        method="POST"
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def send_message(chat_id, text):
    telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text,
        }
    )


def calculate_rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_indicators(df):
    close = df["Close"]

    df["EMA20"] = close.ewm(span=20, adjust=False).mean()
    df["EMA50"] = close.ewm(span=50, adjust=False).mean()

    df["RSI"] = calculate_rsi(close)

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()

    df["MACD"] = ema12 - ema26
    df["MACD_SIGNAL"] = df["MACD"].ewm(span=9, adjust=False).mean()

    df["VOL_AVG20"] = df["Volume"].rolling(20).mean()

    return df


def calculate_score(row):
    score = 0

    ema20 = float(row["EMA20"])
    ema50 = float(row["EMA50"])
    close = float(row["Close"])

    macd = float(row["MACD"])
    macd_signal = float(row["MACD_SIGNAL"])

    volume = float(row["Volume"])
    volume_avg = float(row["VOL_AVG20"])

    rsi = float(row["RSI"])

    # EMA - 40 puan
    if close > ema20 > ema50:
        score += 40
    elif close > ema20:
        score += 25
    elif close > ema50:
        score += 15

    # MACD - 30 puan
    if macd > macd_signal and macd > 0:
        score += 30
    elif macd > macd_signal:
        score += 20
    elif macd > 0:
        score += 10

    # Hacim - 20 puan
    if volume_avg > 0:
        volume_ratio = volume / volume_avg
    else:
        volume_ratio = 0

    if volume_ratio >= 2:
        score += 20
    elif volume_ratio >= 1.5:
        score += 15
    elif volume_ratio >= 1:
        score += 10
    else:
        score += 5

    # RSI - 10 puan
    if 50 <= rsi <= 65:
        score += 10
    elif 40 <= rsi < 50 or 65 < rsi <= 70:
        score += 7
    elif 30 <= rsi < 40:
        score += 5
    elif rsi < 30:
        score += 4
    else:
        score += 2

    return score


def get_label(score):
    if score >= 80:
        return "🔥 GÜÇLÜ ADAY"
    elif score >= 65:
        return "🟢 POZİTİF"
    elif score >= 50:
        return "🟡 NÖTR / DİKKAT"
    else:
        return "🔴 ZAYIF"


def scan_stock(ticker):
    try:
        df = yf.download(
            ticker,
            period="6mo",
            interval="1d",
            progress=False,
            auto_adjust=False
        )

        if df.empty:
            return None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        required = [
            "Close",
            "Volume"
        ]

        for column in required:
            if column not in df.columns:
                return None

        df = df.dropna(subset=required)

        if len(df) < 60:
            return None

        df = calculate_indicators(df)

        row = df.iloc[-1]

        if pd.isna(row["RSI"]):
            return None

        if pd.isna(row["EMA50"]):
            return None

        if pd.isna(row["MACD_SIGNAL"]):
            return None

        if pd.isna(row["VOL_AVG20"]):
            return None

        score = calculate_score(row)

        close = float(row["Close"])
        ema20 = float(row["EMA20"])
        ema50 = float(row["EMA50"])
        rsi = float(row["RSI"])
        macd = float(row["MACD"])
        macd_signal = float(row["MACD_SIGNAL"])

        volume = float(row["Volume"])
        volume_avg = float(row["VOL_AVG20"])

        if volume_avg > 0:
            volume_ratio = volume / volume_avg
        else:
            volume_ratio = 0

        return {
            "ticker": ticker,
            "price": close,
            "score": score,
            "label": get_label(score),
            "ema20": ema20,
            "ema50": ema50,
            "rsi": rsi,
            "macd": macd,
            "macd_signal": macd_signal,
            "volume_ratio": volume_ratio,
        }

    except Exception as e:
        print(f"{ticker} hata: {e}")
        return None


def scan_all():
    results = []

    for ticker in STOCKS:
        result = scan_stock(ticker)

        if result is not None:
            results.append(result)

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results


def create_scan_message(results):
    if not results:
        return "❌ Şu anda veri alınamadı."

    text = "📊 MELİH STOCK SCANNER\n\n"
    text += "🇺🇸 ABD HİSSE TARAMASI\n"
    text += "━━━━━━━━━━━━━━\n\n"

    for item in results:
        text += f"{item['ticker']} — ${item['price']:.2f}\n"
        text += f"{item['label']} | Skor: {item['score']}/100\n"

        text += (
            f"EMA20: ${item['ema20']:.2f} | "
            f"EMA50: ${item['ema50']:.2f}\n"
        )

        text += f"RSI: {item['rsi']:.1f}\n"

        text += (
            f"MACD: {item['macd']:.3f} | "
            f"Sinyal: {item['macd_signal']:.3f}\n"
        )

        text += f"Hacim: {item['volume_ratio']:.1f}x ortalama\n"

        text += "━━━━━━━━━━━━━━\n"

    text += "\n⚠️ Skor TEST modelidir.\n"
    text += "Skor, yükselme yüzdesi değildir.\n"
    text += "Geçmiş verilerle kalibrasyon yapılmıştır ancak garanti değildir."

    return text


def create_help_message():
    return (
        "🤖 MELİH STOCK SCANNER\n\n"
        "/start - Botu başlat\n"
        "/tara - Hisseleri tara\n"
        "/sinyaller - Güncel sinyaller\n"
        "/aktif - Aktif takipler\n"
        "/performans - Bot performansı\n"
        "/yardim - Yardım"
    )


def process_commands():
    try:
        response = telegram(
            "getUpdates",
            {
                "limit": 10,
                "timeout": 1
            }
        )

        updates = response.get("result", [])

        if not updates:
            return

        for update in updates:
            message = update.get("message")

            if not message:
                continue

            chat = message.get("chat")
            text = message.get("text", "")

            if not chat:
                continue

            chat_id = chat.get("id")

            if text.startswith("/start"):
                send_message(
                    chat_id,
                    "👋 Melih Stock Scanner'a hoş geldin!\n\n"
                    "Hisseleri taramak için /tara yazabilirsin."
                )

            elif text.startswith("/tara"):
                send_message(
                    chat_id,
                    "🔎 Hisseler taranıyor...\n"
                    "Biraz bekle."
                )

                results = scan_all()

                message_text = create_scan_message(results)

                send_message(
                    chat_id,
                    message_text
                )

            elif text.startswith("/sinyaller"):
                results = scan_all()

                message_text = create_scan_message(results)

                send_message(
                    chat_id,
                    message_text
                )

            elif text.startswith("/aktif"):
                send_message(
                    chat_id,
                    "📌 Aktif takip sistemi henüz geliştirme aşamasında."
                )

            elif text.startswith("/performans"):
                send_message(
                    chat_id,
                    "📈 Performans:\n\n"
                    "Model henüz canlı performans takibine bağlanmadı."
                )

            elif text.startswith("/yardim"):
                send_message(
                    chat_id,
                    create_help_message()
                )

            else:
                send_message(
                    chat_id,
                    create_help_message()
                )

    except Exception as e:
        print(f"Komut işleme hatası: {e}")


def main():
    if not TOKEN:
        print("BOT_TOKEN bulunamadı.")
        return

    print("Melih Stock Scanner başladı.")

    process_commands()

    results = scan_all()

    if results:
        print(create_scan_message(results))
    else:
        print("Sonuç alınamadı.")


if __name__ == "__main__":
    main()
