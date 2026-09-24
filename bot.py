import os
import json
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
    "RIOT"
]

DATA_PERIOD = "6mo"

TARGET_1 = 0.05
TARGET_2 = 0.08
STOP_LOSS = 0.04

MAX_NEWS_AGE_HOURS = 7 * 24
MAX_NEWS = 15


# =========================================================
# HABER ŞİRKET BİLGİLERİ
# =========================================================

COMPANIES = {

    "SNDL": {
        "name": "SNDL Inc.",
        "aliases": [
            "sndl",
            "sndl inc",
            "sundial growers"
        ]
    },

    "PLUG": {
        "name": "Plug Power",
        "aliases": [
            "plug power",
            "plug power inc"
        ]
    },

    "SOFI": {
        "name": "SoFi Technologies",
        "aliases": [
            "sofi technologies",
            "sofi technologies inc"
        ]
    },

    "OPEN": {
        "name": "Opendoor Technologies",
        "aliases": [
            "opendoor",
            "opendoor technologies",
            "opendoor technologies inc"
        ]
    },

    "JOBY": {
        "name": "Joby Aviation",
        "aliases": [
            "joby aviation",
            "joby aviation inc"
        ]
    },

    "LCID": {
        "name": "Lucid Group",
        "aliases": [
            "lucid motors",
            "lucid group",
            "lucid group inc"
        ]
    },

    "NU": {
        "name": "Nu Holdings",
        "aliases": [
            "nu holdings",
            "nu holdings ltd"
        ]
    },

    "GRAB": {
        "name": "Grab Holdings",
        "aliases": [
            "grab holdings",
            "grab holdings limited"
        ]
    },

    "MARA": {
        "name": "MARA Holdings",
        "aliases": [
            "mara holdings",
            "marathon digital",
            "marathon digital holdings"
        ]
    },

    "RIOT": {
        "name": "Riot Platforms",
        "aliases": [
            "riot platforms",
            "riot platforms inc",
            "riot blockchain"
        ]
    }
}


# =========================================================
# HABER KELİMELERİ
# =========================================================

POSITIVE_PHRASES = {

    "earnings beat": 3.0,
    "beats estimates": 3.0,
    "beats expectations": 3.0,

    "revenue growth": 2.5,
    "revenue increased": 2.5,
    "revenue rises": 2.5,

    "profit growth": 2.5,
    "profit increased": 2.5,

    "strong earnings": 2.5,
    "strong results": 2.0,

    "record revenue": 3.0,
    "record earnings": 3.0,

    "raised guidance": 3.0,
    "raises outlook": 3.0,
    "positive outlook": 2.0,

    "major contract": 2.5,
    "new contract": 2.0,
    "contract": 1.5,

    "strategic partnership": 2.5,
    "partnership": 1.5,

    "strategic agreement": 2.5,
    "agreement": 1.5,

    "strategic investment": 2.0,
    "investment": 1.5,

    "expansion": 1.5,
    "acquisition": 1.5,
    "acquires": 1.5,

    "approval": 2.0,
    "regulatory approval": 2.5,

    "outperforms": 1.5,
    "outperformed": 1.5
}


NEGATIVE_PHRASES = {

    "earnings miss": 3.0,
    "misses estimates": 3.0,
    "missed expectations": 3.0,

    "revenue decline": 2.5,
    "revenue fell": 2.5,
    "revenue falls": 2.5,

    "profit decline": 2.5,
    "profit fell": 2.5,

    "weak earnings": 2.5,
    "weak results": 2.0,

    "net loss": 2.0,
    "operating loss": 2.0,
    "losses": 1.5,

    "lowered guidance": 3.0,
    "lowers outlook": 3.0,
    "cuts outlook": 3.0,
    "cut outlook": 3.0,

    "downgrade": 2.0,

    "lawsuit": 2.5,
    "investigation": 2.5,
    "regulatory investigation": 3.0,

    "bankruptcy": 4.0,

    "high debt": 2.0,
    "debt concerns": 2.5,
    "cash burn": 2.0,

    "layoffs": 1.5,
    "job cuts": 1.5,

    "secondary offering": 3.0,
    "stock offering": 3.0,
    "offering": 2.0,

    "dilution": 3.0,
    "share dilution": 3.0,

    "production halt": 3.0,
    "production cuts": 2.0,
    "recall": 2.0,

    "resigns": 2.5,
    "resignation": 2.5,
    "steps down": 2.5,
    "departure": 2.0
}


IMPORTANT_PHRASES = {

    "earnings": 2,
    "quarterly results": 2,
    "revenue": 2,
    "guidance": 3,

    "contract": 2,
    "agreement": 2,
    "partnership": 2,

    "acquisition": 2,
    "investment": 2,

    "lawsuit": 3,
    "investigation": 3,

    "approval": 2,

    "offering": 3,
    "dilution": 3,

    "debt": 2,
    "data center": 2,
    "bitcoin": 1,

    "production": 2,
    "delivery": 2,

    "regulatory": 3,
    "sec": 3,

    "ceo": 2,
    "cfo": 2,
    "coo": 2,
    "management": 1,

    "resigns": 3,
    "resignation": 3,
    "steps down": 3
}


# =========================================================
# TELEGRAM
# =========================================================

def telegram(method, data=None):

    if not TOKEN:
        print("BOT_TOKEN bulunamadı.")
        return None

    url = (
        f"https://api.telegram.org/"
        f"bot{TOKEN}/{method}"
    )

    try:

        if data is None:

            request = urllib.request.Request(
                url
            )

        else:

            encoded = (
                urllib.parse
                .urlencode(data)
                .encode()
            )

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

        print(
            f"Telegram HATA: {e}"
        )

        return None


def send_message(
    chat_id,
    text
):

    return telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )


# =========================================================
# RSI
# =========================================================

def calculate_rsi(
    series,
    period=14
):

    delta = series.diff()

    gain = delta.clip(
        lower=0
    )

    loss = -delta.clip(
        upper=0
    )

    avg_gain = gain.rolling(
        period
    ).mean()

    avg_loss = loss.rolling(
        period
    ).mean()

    rs = (
        avg_gain /
        avg_loss.replace(
            0,
            np.nan
        )
    )

    return (
        100 -
        (
            100 /
            (1 + rs)
        )
    )


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

    df["MACD"] = (
        ema12 - ema26
    )

    df["MACD_SIGNAL"] = (
        df["MACD"].ewm(
            span=9,
            adjust=False
        ).mean()
    )

    df["AVG_VOLUME20"] = (
        volume.rolling(20).mean()
    )

    df["VOLUME_RATIO"] = (
        volume /
        df["AVG_VOLUME20"]
    )

    return df.dropna()


# =========================================================
# TEKNİK SKOR
# =========================================================

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

    # EMA %40
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

    # MACD %30
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

    # HACİM %20
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

    # RSI %10
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
# TEKNİK SİNYAL
# =========================================================

def technical_signal(score):

    if score >= 80:
        return "🟢 AL ADAYI"

    if score >= 65:
        return "🟡 TUT"

    if score >= 50:
        return "🔵 İZLE"

    return "🔴 ZAYIF"


# =========================================================
# HABER YARDIMCILARI
# =========================================================

def clean_text(text):

    if not text:
        return ""

    return " ".join(
        str(text).lower().split()
    )


def parse_date(content):

    values = [
        content.get("pubDate"),
        content.get("displayTime"),
        content.get("published"),
        content.get(
            "providerPublishTime"
        )
    ]

    for value in values:

        if value is None:
            continue

        try:

            if isinstance(
                value,
                (int, float)
            ):

                return datetime.fromtimestamp(
                    value,
                    tz=timezone.utc
                )

            if isinstance(
                value,
                str
            ):

                text = value.strip()

                if text.endswith("Z"):

                    text = (
                        text[:-1]
                        + "+00:00"
                    )

                dt = datetime.fromisoformat(
                    text
                )

                if dt.tzinfo is None:

                    dt = dt.replace(
                        tzinfo=timezone.utc
                    )

                return dt.astimezone(
                    timezone.utc
                )

        except Exception:
            pass

    return None


def age_hours(date):

    if date is None:
        return None

    now = datetime.now(
        timezone.utc
    )

    return max(
        0,
        (
            now - date
        ).total_seconds() / 3600
    )


def freshness_weight(hours):

    if hours is None:
        return 0.25

    if hours <= 24:
        return 1.0

    if hours <= 72:
        return 0.8

    if hours <= 168:
        return 0.5

    return 0.0


def company_match(
    ticker,
    title,
    content
):

    text = clean_text(
        title
    )

    aliases = COMPANIES[
        ticker
    ]["aliases"]

    for alias in aliases:

        if alias in text:

            return True

    related = content.get(
        "relatedTickers",
        []
    )

    if isinstance(
        related,
        list
    ):

        for item in related:

            if (
                str(item).upper()
                == ticker
            ):

                return True

    return False


# =========================================================
# HABER SENTIMENT
# =========================================================

def analyze_sentiment(title):

    text = clean_text(
        title
    )

    positive = 0
    negative = 0

    for phrase, weight in (
        POSITIVE_PHRASES.items()
    ):

        if phrase in text:
            positive += weight

    for phrase, weight in (
        NEGATIVE_PHRASES.items()
    ):

        if phrase in text:
            negative += weight

    difference = (
        positive - negative
    )

    if difference >= 1.5:

        return (
            "🟢 POZİTİF",
            positive,
            negative
        )

    if difference <= -1.5:

        return (
            "🔴 NEGATİF",
            positive,
            negative
        )

    if (
        positive > 0
        or negative > 0
    ):

        return (
            "🟡 KARIŞIK",
            positive,
            negative
        )

    return (
        "⚪ NÖTR",
        positive,
        negative
    )


# =========================================================
# HABER ÖNEMİ
# =========================================================

def analyze_importance(title):

    text = clean_text(
        title
    )

    score = 0
    found = []

    for phrase, weight in (
        IMPORTANT_PHRASES.items()
    ):

        if phrase in text:

            score += weight
            found.append(
                phrase
            )

    if score >= 4:

        return (
            "🔥 YÜKSEK",
            found
        )

    if score >= 2:

        return (
            "🟡 ORTA",
            found
        )

    return (
        "⚪ DÜŞÜK",
        found
    )


# =========================================================
# HABER AĞIRLIĞI
# =========================================================

def news_weight(
    sentiment,
    importance,
    hours
):

    fresh = freshness_weight(
        hours
    )

    if fresh == 0:
        return 0

    multipliers = {
        "🔥 YÜKSEK": 3.0,
        "🟡 ORTA": 2.0,
        "⚪ DÜŞÜK": 1.0
    }

    multiplier = multipliers.get(
        importance,
        1.0
    )

    if sentiment == "🟡 KARIŞIK":

        multiplier *= 0.5

    if sentiment == "⚪ NÖTR":

        return 0

    return (
        multiplier * fresh
    )


# =========================================================
# HABER FORMAT
# =========================================================

def normalize_news(
    item
):

    if isinstance(
        item.get("content"),
        dict
    ):

        content = item.get(
            "content",
            {}
        )

        title = content.get(
            "title",
            ""
        )

        publisher = content.get(
            "provider",
            {}
        ).get(
            "displayName",
            "Bilinmiyor"
        )

        return {
            "title": title,
            "publisher": publisher,
            "content": content
        }

    title = item.get(
        "title",
        ""
    )

    publisher = item.get(
        "publisher",
        item.get(
            "provider",
            "Bilinmiyor"
        )
    )

    return {
        "title": title,
        "publisher": publisher,
        "content": item
    }


# =========================================================
# HABER ÇEK
# =========================================================

def fetch_news(
    ticker
):

    results = []

    # Yahoo Ticker haberleri
    try:

        stock = yf.Ticker(
            ticker
        )

        news = stock.get_news(
            count=MAX_NEWS,
            tab="news"
        )

        if news:

            for item in news:

                results.append(
                    normalize_news(
                        item
                    )
                )

    except Exception as e:

        print(
            f"{ticker} Ticker haber "
            f"hatası: {e}"
        )

    # Yahoo Search haberleri
    try:

        search = yf.Search(
            COMPANIES[
                ticker
            ]["name"],

            max_results=5,

            news_count=MAX_NEWS,

            lists_count=0,

            include_cb=False,

            include_nav_links=False,

            include_research=False,

            include_cultural_assets=False,

            enable_fuzzy_query=False,

            recommended=5,

            raise_errors=False
        )

        search_news = getattr(
            search,
            "news",
            []
        )

        if search_news:

            for item in search_news:

                results.append(
                    normalize_news(
                        item
                    )
                )

    except Exception as e:

        print(
            f"{ticker} Search haber "
            f"hatası: {e}"
        )

    return results


# =========================================================
# HABER ANALİZİ
# =========================================================

def analyze_news(
    ticker
):

    news = fetch_news(
        ticker
    )

    unique = {}

    for item in news:

        title = clean_text(
            item.get(
                "title",
                ""
            )
        )

        if not title:
            continue

        if title not in unique:

            unique[
                title
            ] = item

    positive_total = 0
    negative_total = 0

    current_news = []

    for item in unique.values():

        title = item.get(
            "title",
            ""
        )

        content = item.get(
            "content",
            {}
        )

        if not company_match(
            ticker,
            title,
            content
        ):

            continue

        date = parse_date(
            content
        )

        hours = age_hours(
            date
        )

        # Tarihi bilinen ve 7 günden eski
        # haberleri karar hesabından çıkar.
        if (
            hours is not None
            and hours > MAX_NEWS_AGE_HOURS
        ):

            continue

        sentiment, positive, negative = (
            analyze_sentiment(
                title
            )
        )

        importance, topics = (
            analyze_importance(
                title
            )
        )

        weight = news_weight(
            sentiment,
            importance,
            hours
        )

        if sentiment == "🟢 POZİTİF":

            positive_total += weight

        elif sentiment == "🔴 NEGATİF":

            negative_total += weight

        elif sentiment == "🟡 KARIŞIK":

            positive_total += weight * 0.5
            negative_total += weight * 0.5

        current_news.append({

            "title": title,

            "publisher": item.get(
                "publisher",
                "Bilinmiyor"
            ),

            "date": date,

            "hours": hours,

            "sentiment": sentiment,

            "importance": importance,

            "topics": topics
        })

    current_news.sort(
        key=lambda x:
        999999
        if x["hours"] is None
        else x["hours"]
    )

    if not current_news:

        return {
            "status":
                "⚪ YETERSİZ VERİ",

            "positive":
                0,

            "negative":
                0,

            "articles":
                []
        }

    difference = (
        positive_total
        - negative_total
    )

    if difference >= 2:

        status = (
            "🟢 POZİTİF HABER AKIŞI"
        )

    elif difference <= -2:

        status = (
            "🔴 NEGATİF HABER AKIŞI"
        )

    else:

        status = (
            "🟡 KARIŞIK / NÖTR"
        )

    return {

        "status":
            status,

        "positive":
            positive_total,

        "negative":
            negative_total,

        "articles":
            current_news[:5]
    }


# =========================================================
# HİSSE TARAMA
# =========================================================

def scan_stock(
    ticker
):

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

        df = calculate_indicators(
            df
        )

        if df.empty:
            return None

        row = df.iloc[-1]

        price = float(
            row["Close"]
        )

        score = calculate_score(
            row
        )

        target_1 = (
            price * 1.05
        )

        target_2 = (
            price * 1.08
        )

        stop = (
            price * 0.96
        )

        recent = df.tail(20)

        support = float(
            recent["Low"].min()
        )

        resistance = float(
            recent["High"].max()
        )

        news = analyze_news(
            ticker
        )

        return {

            "ticker":
                ticker,

            "price":
                price,

            "score":
                score,

            "signal":
                technical_signal(
                    score
                ),

            "ema20":
                float(row["EMA20"]),

            "ema50":
                float(row["EMA50"]),

            "rsi":
                float(row["RSI"]),

            "macd":
                float(row["MACD"]),

            "macd_signal":
                float(
                    row["MACD_SIGNAL"]
                ),

            "volume_ratio":
                float(
                    row["VOLUME_RATIO"]
                ),

            "support":
                support,

            "resistance":
                resistance,

            "target_1":
                target_1,

            "target_2":
                target_2,

            "stop":
                stop,

            "news":
                news
        }

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return None


# =========================================================
# TÜM HİSSELER
# =========================================================

def scan_all():

    results = []

    print()
    print(
        "=" * 60
    )

    print(
        "ABD HİSSE TARAMASI"
    )

    print(
        "=" * 60
    )

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
        key=lambda x:
        x["score"],
        reverse=True
    )

    return results


# =========================================================
# SONUÇ YORUMU
# =========================================================

def final_comment(
    item
):

    score = item[
        "score"
    ]

    news_status = item[
        "news"
    ]["status"]

    if score >= 80:

        if news_status.startswith(
            "🟢"
        ):

            return (
                "🟢 TEKNİK + HABER UYUMLU"
            )

        if news_status.startswith(
            "🔴"
        ):

            return (
                "⚠️ TEKNİK GÜÇLÜ "
                "+ NEGATİF HABER RİSKİ"
            )

        return (
            "🟢 TEKNİK OLARAK GÜÇLÜ"
        )

    if score >= 65:

        if news_status.startswith(
            "🔴"
        ):

            return (
                "⚠️ POZİTİF TEKNİK "
                "+ NEGATİF HABER"
            )

        return (
            "🟡 POZİTİF TEKNİK DURUM"
        )

    if score >= 50:

        return (
            "🔵 İZLE / VERİLERİ BEKLE"
        )

    return (
        "🔴 TEKNİK OLARAK ZAYIF"
    )


# =========================================================
# TELEGRAM DETAYLI MESAJ
# =========================================================

def create_scan_message(
    results
):

    if not results:

        return (
            "❌ Veri alınamadı."
        )

    lines = []

    lines.append(
        "📊 MELİH STOCK SCANNER"
    )

    lines.append(
        "🇺🇸 ABD HİSSE ANALİZİ"
    )

    lines.append(
        "━━━━━━━━━━━━━━━━━━"
    )

    for item in results:

        news = item[
            "news"
        ]

        lines.append("")

        lines.append(
            f"📌 {item['ticker']} "
            f"— ${item['price']:.2f}"
        )

        lines.append(
            f"{item['signal']} | "
            f"Skor: "
            f"{item['score']}/100"
        )

        lines.append(
            f"🧠 {final_comment(item)}"
        )

        lines.append("")

        lines.append(
            f"📍 Giriş referansı: "
            f"${item['price']:.2f}"
        )

        lines.append(
            f"🎯 H1: "
            f"${item['target_1']:.2f} "
            f"(+%5)"
        )

        lines.append(
            f"🎯 H2: "
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
            f"{item['volume_ratio']:.1f}x"
        )

        lines.append("")

        lines.append(
            f"📰 Haber: "
            f"{news['status']}"
        )

        if news["articles"]:

            for article in news[
                "articles"
            ][:2]:

                lines.append(
                    f"• {article['title']}"
                )

                lines.append(
                    f"  {article['sentiment']} "
                    f"| {article['importance']}"
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
        "🎯 Hedef: H1 +%5 / "
        "H2 +%8 / Stop -%4"
    )

    lines.append("")

    lines.append(
        "⚠️ Teknik ve haber verileri "
        "otomatik analiz edilir."
    )

    lines.append(
        "⚠️ Skor olasılık veya garanti "
        "anlamına gelmez."
    )

    return "\n".join(
        lines
    )


# =========================================================
# GÜÇLÜ SİNYALLER
# =========================================================

def create_signal_message(
    results
):

    strong = [
        x for x in results
        if x["score"] >= 80
    ]

    if not strong:

        return (
            "🔎 Şu anda "
            "80+ teknik aday yok."
        )

    lines = []

    lines.append(
        "🔥 GÜÇLÜ TEKNİK ADAYLAR"
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
            f"${item['price']:.2f}"
        )

        lines.append(
            f"🧠 {final_comment(item)}"
        )

        lines.append(
            f"📰 {item['news']['status']}"
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
            "━━━━━━━━━━━━━━━━━━"
        )

    return "\n".join(
        lines
    )


# =========================================================
# TELEGRAM KOMUTLARI
# =========================================================

def process_commands():

    result = telegram(
        "getUpdates"
    )

    if not result:
        return

    if not result.get(
        "ok"
    ):
        return

    updates = result.get(
        "result",
        []
    )

    if not updates:
        return

    last_update_id = None

    for update in updates:

        last_update_id = update.get(
            "update_id"
        )

        message = update.get(
            "message"
        )

        if not message:
            continue

        text = message.get(
            "text",
            ""
        ).strip().lower()

        chat = message.get(
            "chat"
        )

        if not chat:
            continue

        chat_id = chat.get(
            "id"
        )

        if text == "/start":

            send_message(
                chat_id,

                "👋 Melih Stock Scanner\n\n"
                "📊 Teknik + haber analiz sistemi.\n\n"
                "/tara - Detaylı analiz\n"
                "/sinyaller - 80+ adaylar\n"
                "/aktif - Aktif takipler\n"
                "/performans - Performans\n"
                "/yardim - Yardım"
            )

        elif text == "/tara":

            results = scan_all()

            send_message(
                chat_id,
                create_scan_message(
                    results
                )
            )

        elif text == "/sinyaller":

            results = scan_all()

            send_message(
                chat_id,
                create_signal_message(
                    results
                )
            )

        elif text == "/yardim":

            send_message(
                chat_id,

                "📚 KOMUTLAR\n\n"
                "/tara\n"
                "→ 10 hisseyi teknik + "
                "haber analiziyle tarar.\n\n"
                "/sinyaller\n"
                "→ 80+ teknik skorları "
                "gösterir.\n\n"
                "/aktif\n"
                "→ Aktif takip sistemi.\n\n"
                "/performans\n"
                "→ Geçmiş performans."
            )

    # Telegram update kuyruğunu onayla.
    if last_update_id is not None:

        telegram(
            "getUpdates",
            {
                "offset":
                    last_update_id + 1
            }
        )


# =========================================================
# MAIN
# =========================================================

def main():

    print(
        "Melih Stock Scanner başladı."
    )

    print(
        "📊 Teknik + Haber sistemi"
    )

    process_commands()

    # Workflow çalıştığında teknik tarama
    # yapılır. Telegram'a yalnızca komut
    # geldiğinde mesaj gönderilir.

    results = scan_all()

    if results:

        print()

        print(
            "Tarama tamamlandı."
        )

        for item in results:

            print(
                f"{item['ticker']}: "
                f"{item['score']}/100 | "
                f"{item['signal']} | "
                f"Haber: "
                f"{item['news']['status']}"
            )


if __name__ == "__main__":

    main()
