import os
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

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
    "RIOT",
]

DATA_PERIOD = "6mo"

TARGET_1 = 0.05
TARGET_2 = 0.08
STOP_LOSS = 0.04

NEWS_LIMIT = 5
NEWS_DAYS = 7

# GitHub Actions çalışınca Telegram'ı kısa süre dinler.
POLL_SECONDS = 45
POLL_INTERVAL = 5


# =========================================================
# TELEGRAM
# =========================================================

def telegram(method, data=None):
    if not TOKEN:
        print("BOT_TOKEN bulunamadı.")
        return None

    url = f"https://api.telegram.org/bot{TOKEN}/{method}"

    try:
        if data is None:
            request = urllib.request.Request(url)
        else:
            encoded = urllib.parse.urlencode(data).encode("utf-8")
            request = urllib.request.Request(
                url,
                data=encoded,
                method="POST"
            )

        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw)

    except Exception as e:
        print(f"Telegram HATA: {e}")
        return None


def send_message(chat_id, text):
    if not chat_id:
        return None

    # Telegram mesaj sınırı yaklaşık 4096 karakter.
    # Uzun mesajları parçalıyoruz.
    chunks = []

    while text:
        if len(text) <= 3900:
            chunks.append(text)
            break

        cut = text.rfind("\n", 0, 3900)

        if cut < 1000:
            cut = 3900

        chunks.append(text[:cut])
        text = text[cut:].lstrip()

    result = None

    for chunk in chunks:
        result = telegram(
            "sendMessage",
            {
                "chat_id": chat_id,
                "text": chunk
            }
        )

        time.sleep(0.3)

    return result


# =========================================================
# TELEGRAM UPDATE SİSTEMİ
# =========================================================

def get_updates(offset=None, timeout=1):

    data = {
        "timeout": timeout,
        "allowed_updates": json.dumps(["message"])
    }

    if offset is not None:
        data["offset"] = offset

    return telegram("getUpdates", data)


def confirm_updates(offset):
    if offset is None:
        return

    telegram(
        "getUpdates",
        {
            "offset": offset,
            "timeout": 0
        }
    )


# =========================================================
# RSI
# =========================================================

def calculate_rsi(series, period=14):

    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    rsi = 100 - (100 / (1 + rs))

    return rsi


# =========================================================
# TEKNİK GÖSTERGELER
# =========================================================

def calculate_indicators(df):

    df = df.copy()

    close = df["Close"]
    volume = df["Volume"]

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

    df["RSI"] = calculate_rsi(
        close,
        14
    )

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

    df["AVG_VOLUME20"] = volume.rolling(20).mean()

    df["VOLUME_RATIO"] = (
        volume / df["AVG_VOLUME20"]
    )

    # 20 günlük destek
    df["SUPPORT20"] = (
        df["Low"]
        .rolling(20)
        .min()
    )

    # 20 günlük direnç
    df["RESISTANCE20"] = (
        df["High"]
        .rolling(20)
        .max()
    )

    return df.dropna()


# =========================================================
# SKOR
# =========================================================

def calculate_score(row):

    close = float(row["Close"])

    ema9 = float(row["EMA9"])
    ema20 = float(row["EMA20"])
    ema50 = float(row["EMA50"])

    macd = float(row["MACD"])
    macd_signal = float(row["MACD_SIGNAL"])

    rsi = float(row["RSI"])

    volume_ratio = float(
        row["VOLUME_RATIO"]
    )

    # -----------------------------------------------------
    # EMA %40
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # MACD %30
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # HACİM %20
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # RSI %10
    # -----------------------------------------------------

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

    total = (
        ema_score * 0.40
        + macd_score * 0.30
        + volume_score * 0.20
        + rsi_score * 0.10
    )

    return round(total)


# =========================================================
# TEKNİK ETİKET
# =========================================================

def get_label(score):

    if score >= 80:
        return "🟢 AL ADAYI"

    elif score >= 65:
        return "🟡 TUT"

    elif score >= 50:
        return "🔵 İZLE"

    else:
        return "🔴 ZAYIF"


# =========================================================
# HABER ANALİZİ
# =========================================================

POSITIVE_WORDS = [
    "surge",
    "rises",
    "rising",
    "gain",
    "gains",
    "growth",
    "strong",
    "stronger",
    "positive",
    "profit",
    "profits",
    "revenue growth",
    "beat",
    "beats",
    "bullish",
    "upgrade",
    "partnership",
    "contract",
    "deal",
    "expansion",
    "record",
    "approval",
    "approved",
    "launch",
    "wins",
    "winning",
    "outperform",
    "outperforms"
]

NEGATIVE_WORDS = [
    "fall",
    "falls",
    "falling",
    "drop",
    "drops",
    "decline",
    "declines",
    "loss",
    "losses",
    "weak",
    "weaker",
    "negative",
    "miss",
    "misses",
    "bearish",
    "downgrade",
    "lawsuit",
    "investigation",
    "resigns",
    "resignation",
    "cuts",
    "cut",
    "debt",
    "offering",
    "dilution",
    "bankruptcy",
    "warning",
    "risk",
    "risks"
]


def normalize_text(text):

    if not text:
        return ""

    return str(text).lower()


def analyze_news_text(title):

    text = normalize_text(title)

    positive = []
    negative = []

    for word in POSITIVE_WORDS:

        if word in text:
            positive.append(word)

    for word in NEGATIVE_WORDS:

        if word in text:
            negative.append(word)

    if len(positive) > len(negative):
        effect = "🟢 POZİTİF"

    elif len(negative) > len(positive):
        effect = "🔴 NEGATİF"

    else:
        effect = "⚪ NÖTR"

    return effect, positive, negative


def extract_news_date(item):

    try:

        ts = item.get("providerPublishTime")

        if ts:
            return datetime.fromtimestamp(
                int(ts),
                tz=timezone.utc
            )

    except Exception:
        pass

    return None


def get_news(ticker):

    try:

        stock = yf.Ticker(ticker)

        news = stock.news

        if not news:
            return {
                "status": "insufficient",
                "items": [],
                "positive": 0,
                "negative": 0
            }

        now = datetime.now(timezone.utc)

        selected = []

        for item in news:

            content = item.get("content", item)

            title = (
                content.get("title")
                or item.get("title")
                or ""
            )

            publisher = (
                content.get("provider", {})
                .get("displayName")
                or item.get("publisher")
                or "Bilinmeyen kaynak"
            )

            date = extract_news_date(item)

            if date is None:

                pub_time = (
                    content
                    .get("pubDate")
                )

                if pub_time:

                    try:
                        date = datetime.fromisoformat(
                            pub_time.replace(
                                "Z",
                                "+00:00"
                            )
                        )
                    except Exception:
                        date = None

            if date:

                age_hours = (
                    now - date
                ).total_seconds() / 3600

                if age_hours > NEWS_DAYS * 24:
                    continue

            else:
                age_hours = None

            effect, positive, negative = analyze_news_text(
                title
            )

            selected.append(
                {
                    "title": title,
                    "publisher": publisher,
                    "date": date,
                    "age_hours": age_hours,
                    "effect": effect,
                    "positive": positive,
                    "negative": negative
                }
            )

        selected = selected[:NEWS_LIMIT]

        positive_count = sum(
            len(x["positive"])
            for x in selected
        )

        negative_count = sum(
            len(x["negative"])
            for x in selected
        )

        if not selected:

            return {
                "status": "insufficient",
                "items": [],
                "positive": 0,
                "negative": 0
            }

        if positive_count > negative_count:

            overall = "🟢 POZİTİF"

        elif negative_count > positive_count:

            overall = "🔴 NEGATİF"

        else:

            overall = "⚪ NÖTR"

        return {
            "status": "ok",
            "items": selected,
            "positive": positive_count,
            "negative": negative_count,
            "overall": overall
        }

    except Exception as e:

        print(
            f"{ticker} haber HATA: {e}"
        )

        return {
            "status": "error",
            "items": [],
            "positive": 0,
            "negative": 0
        }


# =========================================================
# HİSSE TARAMA
# =========================================================

def scan_stock(ticker):

    try:

        print(
            f"{ticker} taranıyor..."
        )

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

        price = float(row["Close"])

        score = calculate_score(row)

        label = get_label(score)

        # -------------------------------------------------
        # HEDEF / STOP
        # -------------------------------------------------

        target1 = price * (
            1 + TARGET_1
        )

        target2 = price * (
            1 + TARGET_2
        )

        stop = price * (
            1 - STOP_LOSS
        )

        # -------------------------------------------------
        # DESTEK / DİRENÇ
        # -------------------------------------------------

        support = float(
            row["SUPPORT20"]
        )

        resistance = float(
            row["RESISTANCE20"]
        )

        # -------------------------------------------------
        # HABER
        # -------------------------------------------------

        news = get_news(ticker)

        return {
            "ticker": ticker,
            "price": price,
            "score": score,
            "label": label,

            "target1": target1,
            "target2": target2,
            "stop": stop,

            "support": support,
            "resistance": resistance,

            "ema20": float(
                row["EMA20"]
            ),

            "ema50": float(
                row["EMA50"]
            ),

            "rsi": float(
                row["RSI"]
            ),

            "macd": float(
                row["MACD"]
            ),

            "macd_signal": float(
                row["MACD_SIGNAL"]
            ),

            "volume_ratio": float(
                row["VOLUME_RATIO"]
            ),

            "news": news
        }

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return None


def scan_all():

    results = []

    print()
    print(
        "=" * 55
    )

    print(
        "MELİH STOCK SCANNER"
    )

    print(
        "=" * 55
    )

    for ticker in STOCKS:

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


# =========================================================
# TEK HİSSE MESAJI
# =========================================================

def create_stock_message(item):

    news = item["news"]

    lines = []

    lines.append(
        f"📌 {item['ticker']} — "
        f"${item['price']:.2f}"
    )

    lines.append(
        f"{item['label']} | "
        f"Skor: {item['score']}/100"
    )

    # -----------------------------------------------------
    # TEKNİK DURUM
    # -----------------------------------------------------

    if item["score"] >= 80:
        technical = "🟢 GÜÇLÜ TEKNİK DURUM"

    elif item["score"] >= 65:
        technical = "🟡 POZİTİF TEKNİK DURUM"

    elif item["score"] >= 50:
        technical = "🔵 İZLE / BEKLE"

    else:
        technical = "🔴 ZAYIF TEKNİK DURUM"

    lines.append(
        f"🧠 {technical}"
    )

    lines.append("")

    # -----------------------------------------------------
    # FİYAT PLANI
    # -----------------------------------------------------

    lines.append(
        f"📍 Giriş referansı: "
        f"${item['price']:.2f}"
    )

    lines.append(
        f"🎯 H1: "
        f"${item['target1']:.2f} (+%5)"
    )

    lines.append(
        f"🎯 H2: "
        f"${item['target2']:.2f} (+%8)"
    )

    lines.append(
        f"🛑 Stop: "
        f"${item['stop']:.2f} (-%4)"
    )

    lines.append("")

    # -----------------------------------------------------
    # DESTEK / DİRENÇ
    # -----------------------------------------------------

    lines.append(
        f"📉 Destek: "
        f"${item['support']:.2f}"
    )

    lines.append(
        f"📈 Direnç: "
        f"${item['resistance']:.2f}"
    )

    lines.append("")

    # -----------------------------------------------------
    # GÖSTERGELER
    # -----------------------------------------------------

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
        f"{item['volume_ratio']:.1f}x"
    )

    lines.append("")

    # -----------------------------------------------------
    # HABER
    # -----------------------------------------------------

    if news["status"] == "ok":

        lines.append(
            f"📰 Haber: "
            f"{news.get('overall', '⚪ NÖTR')}"
        )

        if news["negative"] > 0:

            lines.append(
                "⚠️ Negatif haber kelimeleri: "
                f"{news['negative']}"
            )

        if news["positive"] > 0:

            lines.append(
                "🟢 Pozitif haber kelimeleri: "
                f"{news['positive']}"
            )

        lines.append("")

        for n in news["items"][:3]:

            title = n["title"]

            if len(title) > 180:
                title = title[:177] + "..."

            if n["age_hours"] is not None:

                hours = n["age_hours"]

                if hours < 24:
                    age_text = (
                        f"{hours:.0f} saat önce"
                    )

                else:
                    age_text = (
                        f"{hours / 24:.0f} gün önce"
                    )

            else:
                age_text = "tarih bilinmiyor"

            lines.append(
                f"• {title}"
            )

            lines.append(
                f"  Kaynak: {n['publisher']} | "
                f"{age_text}"
            )

    else:

        lines.append(
            "📰 Haber: ⚪ YETERSİZ GÜNCEL VERİ"
        )

    return "\n".join(lines)


# =========================================================
# TAM TARAMA MESAJI
# =========================================================

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

        lines.append(
            create_stock_message(
                item
            )
        )

        lines.append(
            "━━━━━━━━━━━━━━━━━━"
        )

    lines.append(
        "🧠 MODEL"
    )

    lines.append(
        "EMA %40 | MACD %30 | "
        "Hacim %20 | RSI %10"
    )

    lines.append("")

    lines.append(
        "🎯 H1/H2/Stop seviyeleri "
        "model referansıdır."
    )

    lines.append(
        "⚠️ Skor yükselme yüzdesi değildir."
    )

    lines.append(
        "⚠️ Bu otomatik teknik taramadır; "
        "gelecekteki getiriyi garanti etmez."
    )

    return "\n".join(lines)


# =========================================================
# GÜÇLÜ SİNYALLER
# =========================================================

def create_signal_message(results):

    strong = [
        x for x in results
        if x["score"] >= 80
    ]

    if not strong:

        return (
            "🔎 Şu anda 80+ teknik "
            "skora ulaşan hisse yok."
        )

    lines = []

    lines.append(
        "🔥 GÜÇLÜ TEKNİK SİNYALLER"
    )

    lines.append(
        "━━━━━━━━━━━━━━━━━━"
    )

    for item in strong:

        news = item["news"]

        if news["status"] == "ok":
            news_text = news.get(
                "overall",
                "⚪ NÖTR"
            )
        else:
            news_text = (
                "⚪ VERİ YETERSİZ"
            )

        lines.append(
            f"📌 {item['ticker']} "
            f"${item['price']:.2f}"
        )

        lines.append(
            f"🟢 Skor: "
            f"{item['score']}/100"
        )

        lines.append(
            f"📰 Haber: {news_text}"
        )

        lines.append(
            f"🎯 H1 ${item['target1']:.2f} | "
            f"H2 ${item['target2']:.2f}"
        )

        lines.append(
            f"🛑 Stop ${item['stop']:.2f}"
        )

        lines.append(
            "━━━━━━━━━━━━━━━━━━"
        )

    lines.append(
        "⚠️ Teknik tarama sonucudur."
    )

    return "\n".join(lines)


# =========================================================
# YARDIM
# =========================================================

def help_message():

    return (
        "📚 MELİH STOCK SCANNER\n\n"

        "/tara\n"
        "→ 10 ABD hissesini teknik + haber "
        "verileriyle tarar.\n\n"

        "/sinyaller\n"
        "→ 80+ teknik skor alanları gösterir.\n\n"

        "/yardim\n"
        "→ Komutları gösterir.\n\n"

        "📊 Model:\n"
        "EMA %40\n"
        "MACD %30\n"
        "Hacim %20\n"
        "RSI %10\n\n"

        "🎯 Hedef modeli:\n"
        "H1 +%5\n"
        "H2 +%8\n"
        "Stop -%4\n\n"

        "⚠️ Bunlar model seviyeleridir, "
        "garanti değildir."
    )


# =========================================================
# KOMUT İŞLEME
# =========================================================

def process_update(update):

    if not update:
        return None

    message = update.get(
        "message"
    )

    if not message:
        return None

    chat = message.get(
        "chat"
    )

    if not chat:
        return None

    chat_id = chat.get(
        "id"
    )

    text = message.get(
        "text",
        ""
    ).strip().lower()

    if not text:
        return chat_id

    print(
        f"Telegram komutu: "
        f"{text}"
    )

    if text in (
        "/start",
        "/yardim",
        "yardım"
    ):

        send_message(
            chat_id,
            help_message()
        )

    elif text in (
        "/tara",
        "tara"
    ):

        send_message(
            chat_id,
            "🔄 Tarama başladı...\n"
            "Teknik göstergeler + haberler "
            "kontrol ediliyor."
        )

        results = scan_all()

        message_text = (
            create_scan_message(
                results
            )
        )

        send_message(
            chat_id,
            message_text
        )

    elif text in (
        "/sinyaller",
        "sinyaller"
    ):

        send_message(
            chat_id,
            "🔄 Güçlü sinyaller kontrol ediliyor..."
        )

        results = scan_all()

        message_text = (
            create_signal_message(
                results
            )
        )

        send_message(
            chat_id,
            message_text
        )

    else:

        send_message(
            chat_id,
            "❓ Komutu anlayamadım.\n\n"
            "/tara\n"
            "/sinyaller\n"
            "/yardim"
        )

    return chat_id


# =========================================================
# TELEGRAM DİNLEME
# =========================================================

def listen_for_commands():

    print(
        "Telegram komutları dinleniyor..."
    )

    start_time = time.time()

    offset = None

    while (
        time.time() - start_time
        < POLL_SECONDS
    ):

        result = get_updates(
            offset=offset,
            timeout=1
        )

        if not result:
            time.sleep(
                POLL_INTERVAL
            )
            continue

        if not result.get("ok"):
            time.sleep(
                POLL_INTERVAL
            )
            continue

        updates = result.get(
            "result",
            []
        )

        if not updates:

            time.sleep(
                POLL_INTERVAL
            )

            continue

        max_update_id = None

        for update in updates:

            update_id = update.get(
                "update_id"
            )

            if update_id is not None:

                if (
                    max_update_id is None
                    or update_id > max_update_id
                ):
                    max_update_id = update_id

            process_update(
                update
            )

        # İşlenen güncellemeleri
        # Telegram kuyruğundan onayla.
        if max_update_id is not None:

            offset = (
                max_update_id + 1
            )

            confirm_updates(
                offset
            )

        time.sleep(
            POLL_INTERVAL
        )


# =========================================================
# MAIN
# =========================================================

def main():

    print()
    print(
        "=========================================="
    )

    print(
        "MELİH STOCK SCANNER BAŞLADI"
    )

    print(
        "=========================================="
    )

    if not TOKEN:

        print(
            "❌ BOT_TOKEN bulunamadı."
        )

        return

    # Önce Telegram komutlarını dinle.
    listen_for_commands()

    print()
    print(
        "Bot çalışması tamamlandı."
    )


if __name__ == "__main__":

    main()
