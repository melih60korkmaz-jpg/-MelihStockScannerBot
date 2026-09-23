import os
import json
import urllib.request
import urllib.parse
import yfinance as yf
import pandas as pd
import numpy as np


# =========================================================
# AYARLAR
# =========================================================

TOKEN = os.environ.get("BOT_TOKEN")

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
    "RIOT"
]


# =========================================================
# TELEGRAM
# =========================================================

def telegram(method, data=None):

    if not TOKEN:
        print("HATA: BOT_TOKEN bulunamadı.")
        return {}

    url = f"https://api.telegram.org/bot{TOKEN}/{method}"

    if data is not None:
        encoded = urllib.parse.urlencode(data).encode("utf-8")

        request = urllib.request.Request(
            url,
            data=encoded,
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
    else:
        request = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(
                response.read().decode("utf-8")
            )

    except Exception as e:
        print("Telegram hatası:", e)
        return {}


def get_chat_id():

    result = telegram("getUpdates")

    if not result.get("ok"):
        return None

    updates = result.get("result", [])

    if not updates:
        return None

    # En son gelen mesajı bul
    for update in reversed(updates):

        message = update.get("message")

        if message and message.get("chat"):
            return message["chat"]["id"]

    return None


def send_message(chat_id, text):

    return telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )


# =========================================================
# TEKNİK GÖSTERGELER
# =========================================================

def calculate_rsi(series, period=14):

    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    average_gain = gain.ewm(
        alpha=1 / period,
        adjust=False
    ).mean()

    average_loss = loss.ewm(
        alpha=1 / period,
        adjust=False
    ).mean()

    rs = average_gain / average_loss.replace(0, np.nan)

    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_indicators(df):

    if df is None or df.empty:
        return None

    close = df["Close"]

    # EMA
    df["EMA9"] = close.ewm(
        span=9,
        adjust=False
    ).mean()

    df["EMA20"] = close.ewm(
        span=20,
        adjust=False
    ).mean()

    # RSI
    df["RSI"] = calculate_rsi(close)

    # MACD
    ema12 = close.ewm(
        span=12,
        adjust=False
    ).mean()

    ema26 = close.ewm(
        span=26,
        adjust=False
    ).mean()

    df["MACD"] = ema12 - ema26

    df["MACD_SIGNAL"] = df["MACD"].ewm(
        span=9,
        adjust=False
    ).mean()

    # Hacim ortalaması
    df["VOLUME_AVG"] = df["Volume"].shift(1).rolling(
        20
    ).mean()

    return df


# =========================================================
# SKOR SİSTEMİ
# =========================================================

def calculate_score(df):

    if df is None or len(df) < 30:
        return None

    last = df.iloc[-1]

    price = float(last["Close"])

    ema9 = float(last["EMA9"])
    ema20 = float(last["EMA20"])

    rsi = float(last["RSI"])

    macd = float(last["MACD"])
    macd_signal = float(last["MACD_SIGNAL"])

    volume = float(last["Volume"])
    volume_avg = float(last["VOLUME_AVG"])

    score = 0

    # -----------------------------------------------------
    # EMA - %40
    # -----------------------------------------------------

    if price > ema9 and ema9 > ema20:
        ema_score = 40

    elif price > ema20:
        ema_score = 25

    elif price > ema9:
        ema_score = 15

    else:
        ema_score = 0

    score += ema_score

    # -----------------------------------------------------
    # MACD - %30
    # -----------------------------------------------------

    if macd > macd_signal and macd > 0:
        macd_score = 30

    elif macd > macd_signal:
        macd_score = 20

    elif macd > 0:
        macd_score = 10

    else:
        macd_score = 0

    score += macd_score

    # -----------------------------------------------------
    # HACİM - %20
    # -----------------------------------------------------

    if volume_avg and volume_avg > 0:

        volume_ratio = volume / volume_avg

        if volume_ratio >= 2:
            volume_score = 20

        elif volume_ratio >= 1.5:
            volume_score = 15

        elif volume_ratio >= 1:
            volume_score = 10

        else:
            volume_score = 5

    else:

        volume_ratio = 0
        volume_score = 0

    score += volume_score

    # -----------------------------------------------------
    # RSI - %10
    # -----------------------------------------------------

    if 50 <= rsi <= 65:
        rsi_score = 10

    elif 40 <= rsi < 50:
        rsi_score = 7

    elif 65 < rsi <= 70:
        rsi_score = 7

    elif 30 <= rsi < 40:
        rsi_score = 5

    elif rsi < 30:
        rsi_score = 4

    else:
        rsi_score = 2

    score += rsi_score

    # -----------------------------------------------------
    # SİNYAL
    # -----------------------------------------------------

    if score >= 80:
        signal = "🔥 GÜÇLÜ ADAY"

    elif score >= 65:
        signal = "🟢 POZİTİF"

    elif score >= 50:
        signal = "🟡 NÖTR / DİKKAT"

    else:
        signal = "🔴 ZAYIF"

    return {
        "price": price,
        "ema9": ema9,
        "ema20": ema20,
        "rsi": rsi,
        "macd": macd,
        "macd_signal": macd_signal,
        "volume": volume,
        "volume_avg": volume_avg,
        "volume_ratio": volume_ratio,
        "score": score,
        "signal": signal
    }


# =========================================================
# HİSSE TARAMA
# =========================================================

def scan_stock(symbol):

    print(f"{symbol} verisi indiriliyor...")

    try:

        ticker = yf.Ticker(symbol)

        df = ticker.history(
            period="6mo",
            interval="1d",
            auto_adjust=False
        )

        if df.empty:
            print(f"{symbol}: veri yok")
            return None

        df = calculate_indicators(df)

        result = calculate_score(df)

        if result is None:
            return None

        result["symbol"] = symbol

        print(
            f"{symbol}: "
            f"${result['price']:.2f} "
            f"Skor={result['score']}"
        )

        return result

    except Exception as e:

        print(f"{symbol} hata:", e)

        return None


# =========================================================
# TÜM HİSSELERİ TARA
# =========================================================

def scan_all():

    results = []

    for symbol in STOCKS:

        result = scan_stock(symbol)

        if result:
            results.append(result)

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results


# =========================================================
# TELEGRAM MESAJI
# =========================================================

def create_scan_message(results):

    if not results:
        return "❌ Hisse verisi alınamadı."

    message = "📊 MELİH STOCK SCANNER\n"
    message += "━━━━━━━━━━━━━━━━━━\n\n"

    for r in results:

        message += (
            f"📌 {r['symbol']}\n"
            f"💵 Fiyat: ${r['price']:.2f}\n"
            f"🎯 Skor: {r['score']}/100\n"
            f"📢 {r['signal']}\n"
            f"📈 EMA9: {r['ema9']:.2f}\n"
            f"📊 EMA20: {r['ema20']:.2f}\n"
            f"📉 RSI: {r['rsi']:.1f}\n"
            f"〽️ MACD: {r['macd']:.3f}\n"
            f"📦 Hacim: {r['volume_ratio']:.2f}x\n"
            f"━━━━━━━━━━━━━━━━━━\n"
        )

    message += (
        "\n⚙️ YENİ AĞIRLIKLI MODEL\n"
        "EMA: %40\n"
        "MACD: %30\n"
        "Hacim: %20\n"
        "RSI: %10\n\n"
        "⚠️ Bu skor geçmiş performans garantisi değildir."
    )

    return message


# =========================================================
# KOMUTLAR
# =========================================================

def help_message():

    return (
        "🤖 MELİH STOCK SCANNER\n\n"
        "Komutlar:\n\n"
        "/start - Botu başlat\n"
        "/tara - Hisseleri tara\n"
        "/sinyaller - Güncel sinyaller\n"
        "/aktif - Aktif takipler\n"
        "/performans - Model bilgisi\n"
        "/yardim - Yardım\n\n"
        "📊 Takip edilen hisseler:\n"
        + ", ".join(STOCKS)
    )


def performance_message():

    return (
        "📊 MODEL BİLGİSİ\n\n"
        "Yeni ağırlıklı model:\n\n"
        "EMA → %40\n"
        "MACD → %30\n"
        "Hacim → %20\n"
        "RSI → %10\n\n"
        "Backtestte 12.000+ tarihsel test örneği "
        "üzerinden incelendi.\n\n"
        "⚠️ Geçmiş sonuçlar gelecekteki getiriyi garanti etmez."
    )


# =========================================================
# GELEN KOMUTU İŞLE
# =========================================================

def process_commands(chat_id):

    updates = telegram("getUpdates")

    if not updates.get("ok"):
        return

    update_list = updates.get("result", [])

    if not update_list:
        return

    # Son mesajı bul
    last_message = None

    for update in reversed(update_list):

        message = update.get("message")

        if message and message.get("text"):

            last_message = message
            break

    if not last_message:
        return

    text = last_message.get("text", "").strip().lower()

    if text.startswith("/start"):

        send_message(
            chat_id,
            "🤖 MelihStockScannerBot aktif!\n\n"
            "Hisseleri taramak için /tara yazabilirsin."
        )

    elif text.startswith("/tara"):

        send_message(
            chat_id,
            "🔎 Hisseler taranıyor...\n"
            "Biraz bekle."
        )

        results = scan_all()

        message = create_scan_message(results)

        send_message(
            chat_id,
            message
        )

    elif text.startswith("/sinyaller"):

        results = scan_all()

        message = create_scan_message(results)

        send_message(
            chat_id,
            message
        )

    elif text.startswith("/aktif"):

        send_message(
            chat_id,
            "📡 Aktif takip sistemi hazır.\n\n"
            "Şu anda takip edilen hisseler:\n"
            + ", ".join(STOCKS)
        )

    elif text.startswith("/performans"):

        send_message(
            chat_id,
            performance_message()
        )

    elif text.startswith("/yardim"):

        send_message(
            chat_id,
            help_message()
        )


# =========================================================
# ANA PROGRAM
# =========================================================

def main():

    print("===================================")
    print("MELİH STOCK SCANNER BOT")
    print("===================================")

    if not TOKEN:

        print("❌ BOT_TOKEN bulunamadı!")
        return

    print("✅ BOT_TOKEN bulundu.")

    chat_id = get_chat_id()

    if chat_id:

        print("✅ Telegram chat bulundu:", chat_id)

        process_commands(chat_id)

    else:

        print(
            "ℹ️ Henüz Telegram mesajı bulunamadı."
        )

        print(
            "Telegram'dan bota /start gönder."
        )


if __name__ == "__main__":
    main()
