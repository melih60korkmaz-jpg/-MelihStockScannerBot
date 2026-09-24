import os
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

import yfinance as yf
import pandas as pd
import numpy as np


# =========================================================
# MELİH STOCK SCANNER
# TEKNİK + HABER + GİRİŞ + HEDEF + STOP
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

MAX_NEWS = 15
MAX_NEWS_AGE_HOURS = 168

TARGET_1_PERCENT = 0.05
TARGET_2_PERCENT = 0.08
STOP_PERCENT = 0.04


# =========================================================
# ŞİRKETLER
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
            "sofi",
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
            "joby",
            "joby aviation",
            "joby aviation inc"
        ]
    },

    "LCID": {
        "name": "Lucid Group",
        "aliases": [
            "lucid",
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
            "grab",
            "grab holdings",
            "grab holdings limited"
        ]
    },

    "MARA": {
        "name": "MARA Holdings",
        "aliases": [
            "mara",
            "mara holdings",
            "marathon digital",
            "marathon digital holdings"
        ]
    },

    "RIOT": {
        "name": "Riot Platforms",
        "aliases": [
            "riot",
            "riot platforms",
            "riot platforms inc",
            "riot blockchain"
        ]
    }
}


# =========================================================
# HABER KELİMELERİ
# =========================================================

POSITIVE_WORDS = {
    "earnings beat": 3,
    "beats estimates": 3,
    "beats expectations": 3,
    "revenue growth": 2.5,
    "revenue increased": 2.5,
    "revenue rises": 2.5,
    "profit growth": 2.5,
    "strong earnings": 2.5,
    "strong results": 2,
    "record revenue": 3,
    "record earnings": 3,
    "raised guidance": 3,
    "raises outlook": 3,
    "positive outlook": 2,
    "major contract": 2.5,
    "new contract": 2,
    "contract": 1.5,
    "strategic partnership": 2.5,
    "partnership": 1.5,
    "strategic agreement": 2.5,
    "agreement": 1.5,
    "strategic investment": 2,
    "investment": 1.5,
    "expansion": 1.5,
    "acquisition": 1.5,
    "approval": 2,
    "regulatory approval": 2.5,
    "outperforms": 1.5,
    "outperformed": 1.5
}

NEGATIVE_WORDS = {
    "earnings miss": 3,
    "misses estimates": 3,
    "missed expectations": 3,
    "revenue decline": 2.5,
    "revenue fell": 2.5,
    "revenue falls": 2.5,
    "profit decline": 2.5,
    "profit fell": 2.5,
    "weak earnings": 2.5,
    "weak results": 2,
    "net loss": 2,
    "operating loss": 2,
    "losses": 1.5,
    "lowered guidance": 3,
    "lowers outlook": 3,
    "cuts outlook": 3,
    "cut outlook": 3,
    "downgrade": 2,
    "lawsuit": 2.5,
    "investigation": 2.5,
    "regulatory investigation": 3,
    "bankruptcy": 4,
    "high debt": 2,
    "debt concerns": 2.5,
    "cash burn": 2,
    "layoffs": 1.5,
    "job cuts": 1.5,
    "secondary offering": 3,
    "stock offering": 3,
    "offering": 2,
    "dilution": 3,
    "share dilution": 3,
    "production halt": 3,
    "production cuts": 2,
    "recall": 2,
    "resigns": 2.5,
    "resignation": 2.5,
    "steps down": 2.5,
    "departure": 2
}

IMPORTANT_WORDS = {
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
        "https://api.telegram.org/"
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


def send_message(chat_id, text):

    if not text:
        return None

    max_length = 3800
    parts = []

    while len(text) > max_length:

        cut = text.rfind(
            "\n",
            0,
            max_length
        )

        if cut <= 0:
            cut = max_length

        parts.append(
            text[:cut]
        )

        text = text[cut:].lstrip()

    if text:
        parts.append(text)

    results = []

    for part in parts:

        results.append(
            telegram(
                "sendMessage",
                {
                    "chat_id": chat_id,
                    "text": part
                }
            )
        )

    return results


# =========================================================
# RSI
# =========================================================

def calculate_rsi(series, period=14):

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
    high = df["High"]
    low = df["Low"]
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

    # ATR 14
    previous_close = close.shift(1)

    tr1 = high - low

    tr2 = (
        high -
        previous_close
    ).abs()

    tr3 = (
        low -
        previous_close
    ).abs()

    true_range = pd.concat(
        [
            tr1,
            tr2,
            tr3
        ],
        axis=1
    ).max(axis=1)

    df["ATR14"] = (
        true_range
        .rolling(14)
        .mean()
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
    if volume_ratio >= 2:
        volume_score = 100

    elif volume_ratio >= 1.5:
        volume_score = 75

    elif volume_ratio >= 1:
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
        content.get("providerPublishTime")
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

        for ticker_name in related:

            if (
                str(ticker_name).upper()
                == ticker
            ):
                return True

    return False


def sentiment(title):

    text = clean_text(
        title
    )

    positive = 0
    negative = 0

    for phrase, weight in (
        POSITIVE_WORDS.items()
    ):

        if phrase in text:
            positive += weight

    for phrase, weight in (
        NEGATIVE_WORDS.items()
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


def importance(title):

    text = clean_text(
        title
    )

    score = 0
    topics = []

    for phrase, weight in (
        IMPORTANT_WORDS.items()
    ):

        if phrase in text:

            score += weight
            topics.append(
                phrase
            )

    if score >= 4:
        level = "🔥 YÜKSEK"

    elif score >= 2:
        level = "🟡 ORTA"

    else:
        level = "⚪ DÜŞÜK"

    return (
        level,
        topics
    )


# =========================================================
# HABER ÇEKME
# =========================================================

def normalize_news(item):

    if isinstance(
        item.get("content"),
        dict
    ):

        content = item.get(
            "content",
            {}
        )

        return {
            "title":
                content.get(
                    "title",
                    ""
                ),

            "publisher":
                content.get(
                    "provider",
                    {}
                ).get(
                    "displayName",
                    "Bilinmiyor"
                ),

            "content":
                content
        }

    return {
        "title":
            item.get(
                "title",
                ""
            ),

        "publisher":
            item.get(
                "publisher",
                item.get(
                    "provider",
                    "Bilinmiyor"
                )
            ),

        "content":
            item
    }


def fetch_news(ticker):

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
            f"{ticker} haber "
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
            f"{ticker} Search "
            f"hatası: {e}"
        )

    return results


# =========================================================
# HABER ANALİZİ
# =========================================================

def analyze_news(ticker):

    raw_news = fetch_news(
        ticker
    )

    unique = {}

    for item in raw_news:

        title = clean_text(
            item.get(
                "title",
                ""
            )
        )

        if title and title not in unique:

            unique[
                title
            ] = item

    articles = []

    positive_total = 0
    negative_total = 0

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

        if (
            hours is not None
            and hours > MAX_NEWS_AGE_HOURS
        ):
            continue

        news_sentiment, pos, neg = (
            sentiment(title)
        )

        news_importance, topics = (
            importance(title)
        )

        freshness = 1.0

        if hours is not None:

            if hours <= 24:
                freshness = 1.0

            elif hours <= 72:
                freshness = 0.8

            else:
                freshness = 0.5

        importance_multiplier = {
            "🔥 YÜKSEK": 3,
            "🟡 ORTA": 2,
            "⚪ DÜŞÜK": 1
        }.get(
            news_importance,
            1
        )

        weight = (
            freshness
            * importance_multiplier
        )

        if news_sentiment == "🟢 POZİTİF":

            positive_total += weight

        elif news_sentiment == "🔴 NEGATİF":

            negative_total += weight

        elif news_sentiment == "🟡 KARIŞIK":

            positive_total += (
                weight * 0.5
            )

            negative_total += (
                weight * 0.5
            )

        articles.append({

            "title":
                item.get(
                    "title",
                    ""
                ),

            "publisher":
                item.get(
                    "publisher",
                    "Bilinmiyor"
                ),

            "date":
                date,

            "hours":
                hours,

            "sentiment":
                news_sentiment,

            "importance":
                news_importance,

            "topics":
                topics
        })

    articles.sort(
        key=lambda x:
        999999
        if x["hours"] is None
        else x["hours"]
    )

    if not articles:

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
            round(
                positive_total,
                1
            ),

        "negative":
            round(
                negative_total,
                1
            ),

        "articles":
            articles[:5]
    }


# =========================================================
# DİNAMİK GİRİŞ / HEDEF / STOP
# =========================================================

def calculate_levels(df, score):

    row = df.iloc[-1]

    price = float(
        row["Close"]
    )

    ema9 = float(
        row["EMA9"]
    )

    ema20 = float(
        row["EMA20"]
    )

    ema50 = float(
        row["EMA50"]
    )

    atr = float(
        row["ATR14"]
    )

    recent20 = df.tail(20)

    recent_low = float(
        recent20["Low"].min()
    )

    recent_high = float(
        recent20["High"].max()
    )

    recent10 = df.tail(10)

    support10 = float(
        recent10["Low"].min()
    )

    resistance10 = float(
        recent10["High"].max()
    )

    # -----------------------------------------------------
    # DESTEK
    # -----------------------------------------------------

    support_candidates = [
        recent_low,
        support10,
        ema20,
        ema50
    ]

    supports = [
        x for x in support_candidates
        if x < price
    ]

    if supports:

        support = max(
            supports
        )

    else:

        support = max(
            0.01,
            price - atr
        )

    # -----------------------------------------------------
    # DİRENÇ
    # -----------------------------------------------------

    resistance_candidates = [
        recent_high,
        resistance10
    ]

    resistances = [
        x for x in resistance_candidates
        if x > price
    ]

    if resistances:

        resistance = min(
            resistances
        )

    else:

        resistance = (
            price + atr * 2
        )

    # -----------------------------------------------------
    # GİRİŞ BÖLGESİ
    # -----------------------------------------------------

    # Güçlü trendde fiyatı kovalamamak için
    # EMA9 / EMA20 / ATR çevresinde referans oluşturuyoruz.

    if score >= 80:

        preferred_entry = min(
            price,
            max(
                ema9,
                ema20
            )
        )

    elif score >= 65:

        preferred_entry = min(
            price,
            ema20 + (
                atr * 0.25
            )
        )

    else:

        preferred_entry = min(
            price,
            ema20
        )

    # Giriş referansının destekten çok
    # uzaklaşmasını engelle.

    max_entry_distance = (
        atr * 1.25
    )

    if (
        price - preferred_entry
        > max_entry_distance
    ):

        preferred_entry = (
            price -
            max_entry_distance
        )

    # Aşırı düşük seviyeye düşmesini engelle.

    preferred_entry = max(
        preferred_entry,
        support
    )

    # Eğer hesaplanan giriş mevcut fiyatın
    # çok üstüne çıkarsa mevcut fiyatı kullan.

    if preferred_entry > price:

        preferred_entry = price

    # -----------------------------------------------------
    # STOP
    # -----------------------------------------------------

    atr_stop = (
        preferred_entry -
        atr * 1.5
    )

    percentage_stop = (
        preferred_entry *
        (1 - STOP_PERCENT)
    )

    # İki yöntemin daha korumacı olanını
    # destek çevresiyle birlikte değerlendir.

    stop_candidates = [
        atr_stop,
        percentage_stop,
        support - (
            atr * 0.20
        )
    ]

    valid_stops = [
        x for x in stop_candidates
        if x < preferred_entry
        and x > 0
    ]

    if valid_stops:

        stop = max(
            valid_stops
        )

    else:

        stop = (
            preferred_entry *
            (1 - STOP_PERCENT)
        )

    # Stop çok yakınsa minimum mesafe bırak.

    minimum_stop_distance = (
        preferred_entry * 0.025
    )

    if (
        preferred_entry - stop
        < minimum_stop_distance
    ):

        stop = (
            preferred_entry
            - minimum_stop_distance
        )

    # -----------------------------------------------------
    # H1
    # -----------------------------------------------------

    mathematical_h1 = (
        preferred_entry *
        (1 + TARGET_1_PERCENT)
    )

    # İlk hedef mümkünse yakın direncin
    # biraz üzerinde olacak.

    resistance_target = (
        resistance * 1.005
    )

    target1_candidates = [
        mathematical_h1,
        resistance_target
    ]

    target1_candidates = [
        x for x in target1_candidates
        if x > preferred_entry
    ]

    if target1_candidates:

        target1 = min(
            target1_candidates
        )

    else:

        target1 = mathematical_h1

    # H1'in çok uzağa gitmesini engelle.

    maximum_target1 = (
        preferred_entry +
        atr * 3
    )

    target1 = min(
        target1,
        maximum_target1
    )

    # -----------------------------------------------------
    # H2
    # -----------------------------------------------------

    mathematical_h2 = (
        preferred_entry *
        (1 + TARGET_2_PERCENT)
    )

    atr_target2 = (
        preferred_entry +
        atr * 4
    )

    target2 = max(
        mathematical_h2,
        atr_target2
    )

    # H2, H1'den kesinlikle yukarıda.

    if target2 <= target1:

        target2 = (
            target1 +
            atr * 1.5
        )

    return {

        "entry":
            preferred_entry,

        "entry_low":
            max(
                support,
                preferred_entry -
                atr * 0.35
            ),

        "entry_high":
            min(
                price,
                preferred_entry +
                atr * 0.25
            ),

        "target1":
            target1,

        "target2":
            target2,

        "stop":
            stop,

        "support":
            support,

        "resistance":
            resistance,

        "atr":
            atr,

        "recent_high":
            recent_high,

        "recent_low":
            recent_low
    }


# =========================================================
# HİSSE ANALİZİ
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

        levels = calculate_levels(
            df,
            score
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

            "ema9":
                float(
                    row["EMA9"]
                ),

            "ema20":
                float(
                    row["EMA20"]
                ),

            "ema50":
                float(
                    row["EMA50"]
                ),

            "rsi":
                float(
                    row["RSI"]
                ),

            "macd":
                float(
                    row["MACD"]
                ),

            "macd_signal":
                float(
                    row["MACD_SIGNAL"]
                ),

            "volume_ratio":
                float(
                    row["VOLUME_RATIO"]
                ),

            "atr":
                levels["atr"],

            "entry":
                levels["entry"],

            "entry_low":
                levels["entry_low"],

            "entry_high":
                levels["entry_high"],

            "target1":
                levels["target1"],

            "target2":
                levels["target2"],

            "stop":
                levels["stop"],

            "support":
                levels["support"],

            "resistance":
                levels["resistance"],

            "recent_high":
                levels["recent_high"],

            "recent_low":
                levels["recent_low"],

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
        "MELİH STOCK SCANNER"
    )

    print(
        "TEKNİK + HABER ANALİZİ"
    )

    print(
        "=" * 60
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
        key=lambda x:
        x["score"],
        reverse=True
    )

    print(
        "Tarama tamamlandı."
    )

    return results


# =========================================================
# YORUM
# =========================================================

def final_comment(item):

    score = item["score"]

    news_status = item[
        "news"
    ]["status"]

    rsi = item["rsi"]

    volume = item[
        "volume_ratio"
    ]

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

        if rsi > 70:

            return (
                "⚠️ POZİTİF AMA RSI YÜKSEK"
            )

        if volume < 0.8:

            return (
                "⚠️ POZİTİF AMA HACİM ZAYIF"
            )

        if news_status.startswith(
            "🔴"
        ):

            return (
                "⚠️ TEKNİK POZİTİF "
                "+ NEGATİF HABER"
            )

        return (
            "🟡 POZİTİF TEKNİK DURUM"
        )

    if score >= 50:

        return (
            "🔵 İZLE / TEYİT BEKLE"
        )

    return (
        "🔴 TEKNİK OLARAK ZAYIF"
    )


# =========================================================
# DETAYLI MESAJ
# =========================================================

def create_scan_message(results):

    if not results:

        return (
            "❌ Hisse verisi alınamadı."
        )

    lines = []

    lines.append(
        "📊 MELİH STOCK SCANNER"
    )

    lines.append(
        "🇺🇸 TEKNİK + HABER ANALİZİ"
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
            f"📍 Giriş bölgesi: "
            f"${item['entry_low']:.2f}"
            f" – "
            f"${item['entry_high']:.2f}"
        )

        lines.append(
            f"📍 Giriş referansı: "
            f"${item['entry']:.2f}"
        )

        lines.append(
            f"🎯 H1: "
            f"${item['target1']:.2f}"
        )

        lines.append(
            f"🎯 H2: "
            f"${item['target2']:.2f}"
        )

        lines.append(
            f"🛑 Stop: "
            f"${item['stop']:.2f}"
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

        lines.append(
            f"〽️ ATR: "
            f"${item['atr']:.3f}"
        )

        lines.append("")

        lines.append(
            f"EMA9: "
            f"${item['ema9']:.2f}"
        )

        lines.append(
            f"EMA20: "
            f"${item['ema20']:.2f}"
        )

        lines.append(
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

                title = article[
                    "title"
                ]

                # Telegram mesajının gereksiz
                # uzamasını engelle.
                if len(title) > 150:

                    title = (
                        title[:147]
                        + "..."
                    )

                lines.append(
                    f"• {title}"
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
        "🧠 TEKNİK MODEL"
    )

    lines.append(
        "EMA %40 | MACD %30 | "
        "Hacim %20 | RSI %10"
    )

    lines.append("")

    lines.append(
        "📐 Seviyeler; fiyat, ATR, "
        "EMA, destek ve direnç "
        "birlikte değerlendirilerek "
        "hesaplanır."
    )

    lines.append("")

    lines.append(
        "⚠️ Bu otomatik teknik analizdir."
    )

    lines.append(
        "⚠️ Skor ve seviyeler garanti değildir."
    )

    return "\n".join(
        lines
    )


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
            "🔎 Şu anda 80+ "
            "teknik aday bulunamadı."
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
            f"📍 Giriş "
            f"${item['entry_low']:.2f}"
            f"–${item['entry_high']:.2f}"
        )

        lines.append(
            f"🎯 H1 "
            f"${item['target1']:.2f}"
        )

        lines.append(
            f"🎯 H2 "
            f"${item['target2']:.2f}"
        )

        lines.append(
            f"🛑 Stop "
            f"${item['stop']:.2f}"
        )

        lines.append(
            "━━━━━━━━━━━━━━━━━━"
        )

    lines.append("")

    lines.append(
        "⚠️ Otomatik teknik taramadır."
    )

    return "\n".join(
        lines
    )


# =========================================================
# AKTİF TAKİP
# =========================================================

def create_active_message(results):

    active = [
        x for x in results
        if x["score"] >= 65
    ]

    if not active:

        return (
            "📭 Şu anda 65+ skor alan "
            "aktif aday bulunamadı."
        )

    lines = []

    lines.append(
        "👁 AKTİF İZLEME ADAYLARI"
    )

    lines.append(
        "━━━━━━━━━━━━━━━━━━"
    )

    for item in active:

        lines.append(
            f"{item['ticker']} "
            f"| {item['score']}/100 "
            f"| ${item['price']:.2f}"
        )

        lines.append(
            f"Giriş: "
            f"${item['entry_low']:.2f}"
            f"–${item['entry_high']:.2f}"
        )

        lines.append(
            f"H1: ${item['target1']:.2f} "
            f"| H2: ${item['target2']:.2f}"
        )

        lines.append(
            f"Stop: ${item['stop']:.2f}"
        )

        lines.append("")

    return "\n".join(
        lines
    )


# =========================================================
# KOMUTLAR
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

                "👋 Melih Stock Scanner'a "
                "hoş geldin!\n\n"

                "📊 Teknik + haber "
                "analiz sistemi aktif.\n\n"

                "/tara\n"
                "→ 10 hisseyi detaylı analiz eder.\n\n"

                "/sinyaller\n"
                "→ 80+ güçlü teknik adayları gösterir.\n\n"

                "/aktif\n"
                "→ 65+ adayları gösterir.\n\n"

                "/yardim\n"
                "→ Komutları gösterir."
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

        elif text == "/aktif":

            results = scan_all()

            send_message(
                chat_id,
                create_active_message(
                    results
                )
            )

        elif text == "/yardim":

            send_message(
                chat_id,

                "📚 MELİH STOCK SCANNER\n\n"

                "/tara\n"
                "→ Teknik + haber + "
                "giriş/hedef/stop analizi.\n\n"

                "/sinyaller\n"
                "→ 80+ güçlü adaylar.\n\n"

                "/aktif\n"
                "→ 65+ izleme adayları.\n\n"

                "/yardim\n"
                "→ Yardım."
            )

    # Telegram kuyruğunu ileri taşı.
    # Böylece aynı komutun her dakika
    # tekrar işlenmesi engellenir.

    if last_update_id is not None:

        telegram(
            "getUpdates",
            {
                "offset":
                    last_update_id + 1
            }
        )


# =========================================================
# ANA PROGRAM
# =========================================================

def main():

    print(
        "======================================"
    )

    print(
        "MELİH STOCK SCANNER BAŞLADI"
    )

    print(
        "TEKNİK + HABER + SEVİYE MOTORU"
    )

    print(
        "======================================"
    )

    process_commands()

    # Komut gelmese bile veri kontrolü yapılır.
    # Telegram'a otomatik mesaj göndermez.

    results = scan_all()

    if results:

        print()

        print(
            "SONUÇLAR:"
        )

        for item in results:

            print(
                f"{item['ticker']} | "
                f"{item['score']}/100 | "
                f"{item['signal']} | "
                f"${item['price']:.2f} | "
                f"Haber: "
                f"{item['news']['status']}"
            )


if __name__ == "__main__":

    main()
