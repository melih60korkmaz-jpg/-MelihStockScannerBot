import os
import json
import urllib.request
import urllib.parse
import yfinance as yf
import pandas as pd
import numpy as np

# ============================================================
# MELİH STOCK SCANNER BOT
# ANA SİNYAL MODELİ
#
# EMA      %40
# MACD     %30
# HACİM    %20
# RSI      %10
#
# Güçlü aday >= 80
# Pozitif    >= 65
# Nötr       >= 50
# Zayıf      < 50
#
# NOT:
# Skor bir yükseliş yüzdesi değildir.
# Yatırım tavsiyesi değildir.
# ============================================================


# ============================================================
# AYARLAR
# ============================================================

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

DATA_PERIOD = "6mo"


# ============================================================
# TELEGRAM
# ============================================================

def telegram(method, data=None):

    if not TOKEN:
        print("BOT_TOKEN bulunamadı.")
        return None

    url = f"https://api.telegram.org/bot{TOKEN}/{method}"

    try:

        if data is None:
            request = urllib.request.Request(url)

        else:

            encoded = urllib.parse.urlencode(data).encode()

            request = urllib.request.Request(
                url,
                data=encoded
            )

        with urllib.request.urlopen(
            request,
            timeout=30
        ) as response:

            return json.loads(
                response.read().decode()
            )

    except Exception as e:

        print(f"Telegram HATA: {e}")
        return None


def send_message(chat_id, text):

    return telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )


# ============================================================
# CHAT ID
# ============================================================

def get_chat_id():

    result = telegram("getUpdates")

    if not result:
        return None

    if not result.get("ok"):
        return None

    updates = result.get("result", [])

    if not updates:
        return None

    latest = updates[-1]

    message = latest.get("message")

    if not message:
        return None

    chat = message.get("chat")

    if not chat:
        return None

    return chat.get("id")


# ============================================================
# RSI
# ============================================================

def calculate_rsi(series, period=14):

    delta = series.diff()

    gain = delta.clip(lower=0)

    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()

    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(
        0,
        np.nan
    )

    rsi = 100 - (
        100 / (1 + rs)
    )

    return rsi


# ============================================================
# VERİ VE İNDİKATÖRLER
# ============================================================

def calculate_indicators(df):

    df = df.copy()

    close = df["Close"]

    volume = df["Volume"]

    # EMA 9
    df["EMA9"] = close.ewm(
        span=9,
        adjust=False
    ).mean()

    # EMA 20
    df["EMA20"] = close.ewm(
        span=20,
        adjust=False
    ).mean()

    # EMA 50
    df["EMA50"] = close.ewm(
        span=50,
        adjust=False
    ).mean()

    # RSI
    df["RSI"] = calculate_rsi(
        close,
        14
    )

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

    df["MACD_SIGNAL"] = df[
        "MACD"
    ].ewm(
        span=9,
        adjust=False
    ).mean()

    # Hacim
    df["AVG_VOLUME20"] = volume.rolling(
        20
    ).mean()

    df["VOLUME_RATIO"] = (
        volume /
        df["AVG_VOLUME20"]
    )

    return df.dropna()


# ============================================================
# SKOR MODELİ
# ============================================================

def calculate_score(row):

    close = float(row["Close"])

    ema9 = float(row["EMA9"])

    ema20 = float(row["EMA20"])

    ema50 = float(row["EMA50"])

    macd = float(row["MACD"])

    macd_signal = float(
        row["MACD_SIGNAL"]
    )

    rsi = float(row["RSI"])

    volume_ratio = float(
        row["VOLUME_RATIO"]
    )


    # ========================================================
    # EMA %40
    # ========================================================

    if (
        close > ema9
        and ema9 > ema20
        and ema20 > ema50
    ):

        ema_score = 100

    elif (
        close > ema20
        and ema20 > ema50
    ):

        ema_score = 75

    elif close > ema20:

        ema_score = 50

    elif close > ema50:

        ema_score = 25

    else:

        ema_score = 0


    # ========================================================
    # MACD %30
    # ========================================================

    if (
        macd > macd_signal
        and macd > 0
    ):

        macd_score = 100

    elif macd > macd_signal:

        macd_score = 70

    elif macd > 0:

        macd_score = 40

    else:

        macd_score = 0


    # ========================================================
    # HACİM %20
    # ========================================================

    if volume_ratio >= 2.0:

        volume_score = 100

    elif volume_ratio >= 1.5:

        volume_score = 75

    elif volume_ratio >= 1.0:

        volume_score = 50

    elif volume_ratio >= 0.7:

        volume_score = 25

    else:

        volume_score = 0


    # ========================================================
    # RSI %10
    # ========================================================

    if 50 <= rsi <= 65:

        rsi_score = 100

    elif 45 <= rsi < 50:

        rsi_score = 75

    elif 65 < rsi <= 70:

        rsi_score = 75

    elif 35 <= rsi < 45:

        rsi_score = 50

    elif 70 < rsi <= 75:

        rsi_score = 40

    elif rsi < 35:

        rsi_score = 30

    else:

        rsi_score = 20


    # ========================================================
    # AĞIRLIKLI TOPLAM
    # ========================================================

    total_score = (

        ema_score * 0.40

        + macd_score * 0.30

        + volume_score * 0.20

        + rsi_score * 0.10

    )

    return round(total_score)


# ============================================================
# ETİKET
# ============================================================

def get_label(score):

    if score >= 80:

        return "🔥 GÜÇLÜ ADAY"

    elif score >= 65:

        return "🟢 POZİTİF"

    elif score >= 50:

        return "🟡 NÖTR / DİKKAT"

    else:

        return "🔴 ZAYIF"


# ============================================================
# HİSSE TARAMA
# ============================================================

def scan_stock(ticker):

    try:

        df = yf.download(
            ticker,
            period=DATA_PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False
        )

        if df.empty:

            return None

        if isinstance(
            df.columns,
            pd.MultiIndex
        ):

            df.columns = (
                df.columns
                .get_level_values(0)
            )

        df = calculate_indicators(df)

        if df.empty:

            return None

        row = df.iloc[-1]

        price = float(
            row["Close"]
        )

        ema20 = float(
            row["EMA20"]
        )

        ema50 = float(
            row["EMA50"]
        )

        rsi = float(
            row["RSI"]
        )

        macd = float(
            row["MACD"]
        )

        macd_signal = float(
            row["MACD_SIGNAL"]
        )

        volume_ratio = float(
            row["VOLUME_RATIO"]
        )

        score = calculate_score(row)

        label = get_label(score)

        return {
            "ticker": ticker,
            "price": price,
            "ema20": ema20,
            "ema50": ema50,
            "rsi": rsi,
            "macd": macd,
            "macd_signal": macd_signal,
            "volume_ratio": volume_ratio,
            "score": score,
            "label": label
        }

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return None


# ============================================================
# TÜM HİSSELERİ TARA
# ============================================================

def scan_all():

    results = []

    print()
    print("=" * 50)
    print("ABD HİSSE TARAMASI")
    print("=" * 50)

    for ticker in STOCKS:

        print(
            f"{ticker} taranıyor..."
        )

        result = scan_stock(ticker)

        if result:

            results.append(result)

    # En yüksek skor üstte
    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results


# ============================================================
# TELEGRAM MESAJI
# ============================================================

def create_scan_message(results):

    if not results:

        return (
            "❌ Tarama sırasında veri "
            "alınamadı."
        )

    lines = []

    lines.append(
        "📊 MELİH STOCK SCANNER"
    )

    lines.append(
        "🇺🇸 ABD HİSSE TARAMASI"
    )

    lines.append(
        "━━━━━━━━━━━━━━━━━━"
    )

    for item in results:

        lines.append("")

        lines.append(
            f"📌 {item['ticker']} "
            f"— ${item['price']:.2f}"
        )

        lines.append(
            f"{item['label']} | "
            f"Skor: {item['score']}/100"
        )

        lines.append(
            f"EMA20: ${item['ema20']:.2f} | "
            f"EMA50: ${item['ema50']:.2f}"
        )

        lines.append(
            f"RSI: {item['rsi']:.1f}"
        )

        lines.append(
            f"MACD: {item['macd']:.3f} | "
            f"Sinyal: {item['macd_signal']:.3f}"
        )

        lines.append(
            f"Hacim: "
            f"{item['volume_ratio']:.1f}x ortalama"
        )

        lines.append(
            "━━━━━━━━━━━━━━━━━━"
        )

    lines.append("")

    lines.append(
        "🧠 MODEL"
    )

    lines.append(
        "EMA %40 | MACD %30 | "
        "Hacim %20 | RSI %10"
    )

    lines.append("")

    lines.append(
        "⚠️ Skor yükselme yüzdesi değildir."
    )

    lines.append(
        "⚠️ Geçmiş testler geleceği "
        "garanti etmez."
    )

    return "\n".join(lines)


# ============================================================
# KOMUTLAR
# ============================================================

def process_commands():

    result = telegram(
        "getUpdates"
    )

    if not result:
        return

    if not result.get("ok"):
        return

    updates = result.get(
        "result",
        []
    )

    if not updates:
        return

    latest = updates[-1]

    message = latest.get(
        "message"
    )

    if not message:
        return

    text = message.get(
        "text",
        ""
    ).strip().lower()

    chat = message.get(
        "chat"
    )

    if not chat:
        return

    chat_id = chat.get(
        "id"
    )

    # --------------------------------------------------------
    # /start
    # --------------------------------------------------------

    if text == "/start":

        send_message(
            chat_id,
            "👋 Melih Stock Scanner'a "
            "hoş geldin!\n\n"
            "Hisseleri taramak için "
            "/tara yazabilirsin.\n\n"
            "Komutlar:\n"
            "/tara - Hisseleri tara\n"
            "/sinyaller - Güncel sinyaller\n"
            "/aktif - Aktif takipler\n"
            "/performans - Bot performansı\n"
            "/yardim - Yardım"
        )

    # --------------------------------------------------------
    # /tara
    # --------------------------------------------------------

    elif text == "/tara":

        results = scan_all()

        message = create_scan_message(
            results
        )

        send_message(
            chat_id,
            message
        )

    # --------------------------------------------------------
    # /sinyaller
    # --------------------------------------------------------

    elif text == "/sinyaller":

        results = scan_all()

        strong = [
            x for x in results
            if x["score"] >= 80
        ]

        if not strong:

            send_message(
                chat_id,
                "🔎 Şu anda 80+ "
                "güçlü aday bulunamadı."
            )

        else:

            lines = [
                "🔥 GÜÇLÜ SİNYALLER",
                "━━━━━━━━━━━━━━━━━━"
            ]

            for item in strong:

                lines.append(
                    f"{item['ticker']} "
                    f"— Skor {item['score']}/100"
                )

                lines.append(
                    f"${item['price']:.2f} | "
                    f"RSI {item['rsi']:.1f} | "
                    f"Hacim "
                    f"{item['volume_ratio']:.1f}x"
                )

            lines.append("")
            lines.append(
                "⚠️ Bu liste otomatik "
                "teknik taramadır."
            )

            send_message(
                chat_id,
                "\n".join(lines)
            )

    # --------------------------------------------------------
    # /yardim
    # --------------------------------------------------------

    elif text == "/yardim":

        send_message(
            chat_id,
            "📚 MELİH STOCK SCANNER\n\n"
            "/tara\n"
            "→ 10 ABD hissesini tarar.\n\n"
            "/sinyaller\n"
            "→ 80+ skor alanları gösterir.\n\n"
            "/aktif\n"
            "→ Aktif takip sistemi.\n\n"
            "/performans\n"
            "→ Geçmiş performans bilgisi."
        )


# ============================================================
# ANA PROGRAM
# ============================================================

def main():

    print(
        "Melih Stock Scanner başladı."
    )

    print(
        "📊 MELİH STOK TARAMA SİSTEMİ"
    )

    # Telegram komutlarını kontrol et
    process_commands()

    # Otomatik tarama
    results = scan_all()

    if results:

        print()
        print(
            "Tarama tamamlandı."
        )

        for item in results:

            print(
                f"{item['ticker']}: "
                f"{item['score']}/100 "
                f"{item['label']}"
            )


if __name__ == "__main__":

    main()
