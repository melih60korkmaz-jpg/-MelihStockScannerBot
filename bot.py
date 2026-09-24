import os
import json
import urllib.request
import urllib.parse
import yfinance as yf
import pandas as pd
import numpy as np

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

# ==========================================
# HEDEF / STOP SİSTEMİ
# ==========================================

TARGET_1 = 0.05   # %5
TARGET_2 = 0.08   # %8
STOP_LOSS = 0.04  # %4

# ==========================================
# TELEGRAM
# ==========================================

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


# ==========================================
# RSI
# ==========================================

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


# ==========================================
# TEKNİK GÖSTERGELER
# ==========================================

def calculate_indicators(df):

    df = df.copy()

    close = df["Close"]

    volume = df["Volume"]

    # EMA
    df["EMA9"] = close.ewm(
        span=9,
        adjust=False
    ).mean()

    df["EMA20"] = close.ewm(
        span=20,
        adjust=False
    ).mean()

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

    df["MACD_SIGNAL"] = df["MACD"].ewm(
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


# ==========================================
# SKOR
# ==========================================

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

    # --------------------------
    # EMA %40
    # --------------------------

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

    # --------------------------
    # MACD %30
    # --------------------------

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

    # --------------------------
    # HACİM %20
    # --------------------------

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

    # --------------------------
    # RSI %10
    # --------------------------

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

    total_score = (
        ema_score * 0.40
        + macd_score * 0.30
        + volume_score * 0.20
        + rsi_score * 0.10
    )

    return round(total_score)


# ==========================================
# SİNYAL
# ==========================================

def get_signal(score):

    if score >= 80:

        return "🟢 AL ADAYI"

    elif score >= 65:

        return "🟡 TUT"

    elif score >= 50:

        return "🔵 İZLE"

    else:

        return "🔴 ZAYIF"


# ==========================================
# DESTEK / DİRENÇ
# ==========================================

def calculate_levels(df, price):

    recent = df.tail(20)

    support = float(
        recent["Low"].min()
    )

    resistance = float(
        recent["High"].max()
    )

    return support, resistance


# ==========================================
# HEDEF / STOP
# ==========================================

def calculate_targets(price):

    target_1 = price * (
        1 + TARGET_1
    )

    target_2 = price * (
        1 + TARGET_2
    )

    stop = price * (
        1 - STOP_LOSS
    )

    return (
        target_1,
        target_2,
        stop
    )


# ==========================================
# HİSSE TARAMA
# ==========================================

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

        signal = get_signal(score)

        support, resistance = (
            calculate_levels(
                df,
                price
            )
        )

        target_1, target_2, stop = (
            calculate_targets(price)
        )

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

            "signal": signal,

            "support": support,

            "resistance": resistance,

            "target_1": target_1,

            "target_2": target_2,

            "stop": stop
        }

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return None


# ==========================================
# TÜM HİSSELER
# ==========================================

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

        result = scan_stock(
            ticker
        )

        if result:

            results.append(
                result
            )

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results


# ==========================================
# DETAYLI TARAMA MESAJI
# ==========================================

def create_scan_message(results):

    if not results:

        return (
            "❌ Tarama sırasında "
            "veri alınamadı."
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
            f"{item['signal']} | "
            f"Skor: {item['score']}/100"
        )

        lines.append("")

        lines.append(
            f"📍 Giriş referansı: "
            f"${item['price']:.2f}"
        )

        lines.append(
            f"🎯 Hedef 1: "
            f"${item['target_1']:.2f} "
            f"(+%5)"
        )

        lines.append(
            f"🎯 Hedef 2: "
            f"${item['target_2']:.2f} "
            f"(+%8)"
        )

        lines.append(
            f"🛑 Stop: "
            f"${item['stop']:.2f} "
            f"(-%4)"
        )

        lines.append("")

        lines.append(
            f"📉 Destek: "
            f"${item['support']:.2f}"
        )

        lines.append(
            f"📈 Direnç: "
            f"${item['resistance']:.2f}"
        )

        lines.append("")

        lines.append(
            f"EMA20: "
            f"${item['ema20']:.2f} | "
            f"EMA50: "
            f"${item['ema50']:.2f}"
        )

        lines.append(
            f"RSI: "
            f"{item['rsi']:.1f}"
        )

        lines.append(
            f"MACD: "
            f"{item['macd']:.3f} | "
            f"Sinyal: "
            f"{item['macd_signal']:.3f}"
        )

        lines.append(
            f"Hacim: "
            f"{item['volume_ratio']:.1f}x "
            f"ortalama"
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
        "🎯 Hedef sistemi: "
        "H1 +%5 / H2 +%8 / Stop -%4"
    )

    lines.append("")

    lines.append(
        "⚠️ Skor yükselme yüzdesi değildir."
    )

    lines.append(
        "⚠️ Teknik model geleceği garanti etmez."
    )

    return "\n".join(lines)


# ==========================================
# GÜÇLÜ SİNYALLER
# ==========================================

def create_signal_message(results):

    strong = [
        x for x in results
        if x["score"] >= 80
    ]

    if not strong:

        return (
            "🔎 Şu anda "
            "80+ güçlü aday bulunamadı."
        )

    lines = []

    lines.append(
        "🔥 GÜÇLÜ SİNYALLER"
    )

    lines.append(
        "━━━━━━━━━━━━━━━━━━"
    )

    for item in strong:

        lines.append("")

        lines.append(
            f"🟢 {item['ticker']} "
            f"— {item['score']}/100"
        )

        lines.append(
            f"💵 ${item['price']:.2f}"
        )

        lines.append(
            f"🎯 H1 ${item['target_1']:.2f}"
        )

        lines.append(
            f"🎯 H2 ${item['target_2']:.2f}"
        )

        lines.append(
            f"🛑 Stop ${item['stop']:.2f}"
        )

        lines.append(
            f"📉 Destek ${item['support']:.2f}"
        )

        lines.append(
            f"📈 Direnç ${item['resistance']:.2f}"
        )

        lines.append(
            f"RSI {item['rsi']:.1f} | "
            f"Hacim "
            f"{item['volume_ratio']:.1f}x"
        )

        lines.append(
            "━━━━━━━━━━━━━━━━━━"
        )

    lines.append("")

    lines.append(
        "⚠️ Bu liste otomatik "
        "teknik taramadır."
    )

    return "\n".join(lines)


# ==========================================
# KOMUTLAR
# ==========================================

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

    # /start
    if text == "/start":

        send_message(
            chat_id,

            "👋 Melih Stock Scanner'a "
            "hoş geldin!\n\n"

            "📊 ABD hisselerini teknik "
            "olarak tarıyorum.\n\n"

            "Komutlar:\n"

            "/tara - Detaylı tarama\n"

            "/sinyaller - 80+ adaylar\n"

            "/aktif - Aktif takipler\n"

            "/performans - Performans\n"

            "/yardim - Yardım"
        )

    # /tara
    elif text == "/tara":

        results = scan_all()

        message = (
            create_scan_message(
                results
            )
        )

        send_message(
            chat_id,
            message
        )

    # /sinyaller
    elif text == "/sinyaller":

        results = scan_all()

        message = (
            create_signal_message(
                results
            )
        )

        send_message(
            chat_id,
            message
        )

    # /yardim
    elif text == "/yardim":

        send_message(
            chat_id,

            "📚 MELİH STOCK SCANNER\n\n"

            "/tara\n"
            "→ 10 ABD hissesini "
            "detaylı tarar.\n\n"

            "/sinyaller\n"
            "→ 80+ skor alanları "
            "gösterir.\n\n"

            "/aktif\n"
            "→ Aktif takip sistemi.\n\n"

            "/performans\n"
            "→ Geçmiş performans."
        )


# ==========================================
# MAIN
# ==========================================

def main():

    print(
        "Melih Stock Scanner başladı."
    )

    print(
        "📊 MELİH STOCK SCANNER"
    )

    process_commands()

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
                f"{item['signal']} "
                f"| H1 ${item['target_1']:.2f} "
                f"| H2 ${item['target_2']:.2f} "
                f"| STOP ${item['stop']:.2f}"
            )


if __name__ == "__main__":

    main()
