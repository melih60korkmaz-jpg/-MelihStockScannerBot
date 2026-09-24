import yfinance as yf
from datetime import datetime, timezone


# =========================================================
# HİSSELER
# =========================================================

STOCKS = {
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
# AYARLAR
# =========================================================

MAX_NEWS = 15

# 7 günden eski haberler haber skoruna girmez.
MAX_AGE_HOURS = 7 * 24


# =========================================================
# POZİTİF OLAYLAR
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


# =========================================================
# NEGATİF OLAYLAR
# =========================================================

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
    "recall": 2.0
}


# =========================================================
# ÖNEMLİ KONULAR
# =========================================================

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

    "ceo": 1,
    "management": 1,

    "sec": 3
}


# =========================================================
# YARDIMCI
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


def age_hours(pub_date):

    if pub_date is None:
        return None

    now = datetime.now(
        timezone.utc
    )

    hours = (
        now - pub_date
    ).total_seconds() / 3600

    return max(
        0,
        hours
    )


def freshness_label(hours):

    if hours is None:
        return "⚪ TARİH YOK"

    if hours <= 24:
        return "🔥 SON 24 SAAT"

    if hours <= 72:
        return "🟢 SON 3 GÜN"

    if hours <= 168:
        return "🟡 SON 7 GÜN"

    return "⚪ 7 GÜNDEN ESKİ"


def freshness_weight(hours):

    if hours is None:
        return 0.25

    if hours <= 24:
        return 1.00

    if hours <= 72:
        return 0.80

    if hours <= 168:
        return 0.50

    return 0.00


# =========================================================
# ŞİRKET EŞLEŞMESİ
# =========================================================

def company_match(
    ticker,
    title,
    content
):

    text = clean_text(
        title
    )

    aliases = STOCKS[
        ticker
    ]["aliases"]

    # Başlıkta şirket adı
    for alias in aliases:

        if alias in text:

            return "DOĞRUDAN"

    # Yahoo relatedTickers alanı
    related = content.get(
        "relatedTickers",
        []
    )

    if isinstance(
        related,
        list
    ):

        for item in related:

            if str(item).upper() == ticker:

                return "İLİŞKİLİ"

    return None


# =========================================================
# SENTIMENT
# =========================================================

def analyze_sentiment(title):

    text = clean_text(
        title
    )

    positive_score = 0
    negative_score = 0

    positive_found = []
    negative_found = []

    for phrase, weight in (
        POSITIVE_PHRASES.items()
    ):

        if phrase in text:

            positive_score += weight

            positive_found.append(
                phrase
            )

    for phrase, weight in (
        NEGATIVE_PHRASES.items()
    ):

        if phrase in text:

            negative_score += weight

            negative_found.append(
                phrase
            )

    difference = (
        positive_score
        - negative_score
    )

    # Çok küçük farklarda taraf tutma.
    if difference >= 1.5:

        sentiment = "🟢 POZİTİF"

    elif difference <= -1.5:

        sentiment = "🔴 NEGATİF"

    elif (
        positive_score > 0
        or negative_score > 0
    ):

        sentiment = "🟡 KARIŞIK"

    else:

        sentiment = "⚪ NÖTR"

    return {
        "sentiment": sentiment,
        "positive_score": positive_score,
        "negative_score": negative_score,
        "positive_found": positive_found,
        "negative_found": negative_found
    }


# =========================================================
# ÖNEM ANALİZİ
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

        importance = "🔥 YÜKSEK"

    elif score >= 2:

        importance = "🟡 ORTA"

    else:

        importance = "⚪ DÜŞÜK"

    return {
        "score": score,
        "importance": importance,
        "found": found
    }


# =========================================================
# HABER AĞIRLIĞI
# =========================================================

def calculate_weight(
    sentiment,
    importance,
    hours
):

    fresh = freshness_weight(
        hours
    )

    if fresh == 0:
        return 0

    importance_multiplier = {
        "🔥 YÜKSEK": 3.0,
        "🟡 ORTA": 2.0,
        "⚪ DÜŞÜK": 1.0
    }.get(
        importance,
        1.0
    )

    if sentiment == "🟢 POZİTİF":

        return (
            importance_multiplier
            * fresh
        )

    if sentiment == "🔴 NEGATİF":

        return (
            importance_multiplier
            * fresh
        )

    if sentiment == "🟡 KARIŞIK":

        return (
            importance_multiplier
            * fresh
            * 0.5
        )

    return 0


# =========================================================
# HABER NORMALİZASYONU
# =========================================================

def normalize_news_item(
    item,
    source_type
):

    # -----------------------------------------------------
    # Ticker.get_news formatı
    # -----------------------------------------------------

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

        link = content.get(
            "canonicalUrl",
            {}
        ).get(
            "url",
            ""
        )

        if not link:

            link = content.get(
                "clickThroughUrl",
                {}
            ).get(
                "url",
                ""
            )

        return {
            "title": title,
            "publisher": publisher,
            "link": link,
            "content": content,
            "source_type": source_type
        }

    # -----------------------------------------------------
    # Search.news formatı
    # -----------------------------------------------------

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

    link = item.get(
        "link",
        item.get(
            "url",
            ""
        )
    )

    return {
        "title": title,
        "publisher": publisher,
        "link": link,
        "content": item,
        "source_type": source_type
    }


# =========================================================
# HABERLERİ ÇEK
# =========================================================

def fetch_news(ticker):

    collected = []

    # -----------------------------------------------------
    # Kaynak 1 — Ticker.get_news
    # -----------------------------------------------------

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

                normalized = (
                    normalize_news_item(
                        item,
                        "Ticker"
                    )
                )

                collected.append(
                    normalized
                )

    except Exception as e:

        print(
            f"Ticker haber hatası: {e}"
        )

    # -----------------------------------------------------
    # Kaynak 2 — Yahoo Finance Search
    # -----------------------------------------------------

    try:

        company_name = STOCKS[
            ticker
        ]["name"]

        search = yf.Search(
            company_name,
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

                normalized = (
                    normalize_news_item(
                        item,
                        "Search"
                    )
                )

                collected.append(
                    normalized
                )

    except Exception as e:

        print(
            f"Search haber hatası: {e}"
        )

    return collected


# =========================================================
# TEKRAR EDEN HABERLERİ TEMİZLE
# =========================================================

def deduplicate_news(news):

    unique = {}

    for item in news:

        title = clean_text(
            item.get(
                "title",
                ""
            )
        )

        link = item.get(
            "link",
            ""
        )

        key = link or title

        if not key:
            continue

        if key not in unique:

            unique[key] = item

    return list(
        unique.values()
    )


# =========================================================
# TEK HİSSE ANALİZİ
# =========================================================

def analyze_stock(ticker):

    print()
    print("=" * 75)
    print(
        f"📰 {ticker} — "
        f"{STOCKS[ticker]['name']}"
    )
    print("=" * 75)

    news = fetch_news(
        ticker
    )

    news = deduplicate_news(
        news
    )

    if not news:

        print(
            "❌ Haber alınamadı."
        )

        return

    direct = []
    related = []
    rejected = []

    for item in news:

        title = item.get(
            "title",
            ""
        )

        if not title:
            continue

        content = item.get(
            "content",
            {}
        )

        match = company_match(
            ticker,
            title,
            content
        )

        if match == "DOĞRUDAN":

            direct.append(
                item
            )

        elif match == "İLİŞKİLİ":

            related.append(
                item
            )

        else:

            rejected.append(
                item
            )

    # =====================================================
    # SADECE 7 GÜNLÜK HABERLER
    # =====================================================

    valid_direct = []

    for item in direct:

        content = item.get(
            "content",
            {}
        )

        date = parse_date(
            content
        )

        hours = age_hours(
            date
        )

        if (
            hours is not None
            and hours <= MAX_AGE_HOURS
        ):

            item["_date"] = date
            item["_hours"] = hours

            valid_direct.append(
                item
            )

    # En yeni haber üstte
    valid_direct.sort(
        key=lambda x: (
            x.get(
                "_hours",
                999999
            )
        )
    )

    # =====================================================
    # HABERLERİ GÖSTER
    # =====================================================

    print()
    print(
        f"Toplam benzersiz haber: "
        f"{len(news)}"
    )

    print(
        f"Şirketle doğrudan ilgili: "
        f"{len(direct)}"
    )

    print(
        f"İlişkili/yan haber: "
        f"{len(related)}"
    )

    print(
        f"Alakasız ve elenen: "
        f"{len(rejected)}"
    )

    print(
        f"Son 7 gündeki doğrudan haber: "
        f"{len(valid_direct)}"
    )

    # =====================================================
    # GÜNCEL HABER YOK
    # =====================================================

    if not valid_direct:

        print()
        print(
            "⚪ YETERSİZ GÜNCEL HABER VERİSİ"
        )

        print(
            "Bu hisse için son 7 gün içinde "
            "doğrudan şirket haberi bulunamadı."
        )

        return

    # =====================================================
    # TOPLAM SKOR
    # =====================================================

    positive_total = 0
    negative_total = 0
    mixed_total = 0

    high_importance = 0

    last_24h = 0
    last_3d = 0

    # En fazla 10 güncel haber göster
    for item in valid_direct[:10]:

        title = item[
            "title"
        ]

        content = item[
            "content"
        ]

        date = item.get(
            "_date"
        )

        hours = item.get(
            "_hours"
        )

        sentiment = analyze_sentiment(
            title
        )

        importance = analyze_importance(
            title
        )

        weight = calculate_weight(
            sentiment["sentiment"],
            importance["importance"],
            hours
        )

        # -------------------------------------------------
        # TOPLAM
        # -------------------------------------------------

        if sentiment[
            "sentiment"
        ] == "🟢 POZİTİF":

            positive_total += weight

        elif sentiment[
            "sentiment"
        ] == "🔴 NEGATİF":

            negative_total += weight

        elif sentiment[
            "sentiment"
        ] == "🟡 KARIŞIK":

            mixed_total += weight

        if importance[
            "importance"
        ] == "🔥 YÜKSEK":

            high_importance += 1

        if hours <= 24:

            last_24h += 1

        if hours <= 72:

            last_3d += 1

        publisher = item.get(
            "publisher",
            "Bilinmiyor"
        )

        if date:

            date_text = date.strftime(
                "%Y-%m-%d %H:%M UTC"
            )

        else:

            date_text = (
                "Tarih yok"
            )

        print()
        print(
            f"📰 {title}"
        )

        print(
            f"Kaynak: {publisher}"
        )

        print(
            f"📅 {date_text}"
        )

        print(
            f"⏱ {freshness_label(hours)}"
        )

        print(
            f"📊 Etki: "
            f"{sentiment['sentiment']}"
        )

        print(
            f"🔥 Önem: "
            f"{importance['importance']}"
        )

        if sentiment[
            "positive_found"
        ]:

            print(
                "🟢 Pozitif: "
                + ", ".join(
                    sentiment[
                        "positive_found"
                    ]
                )
            )

        if sentiment[
            "negative_found"
        ]:

            print(
                "🔴 Negatif: "
                + ", ".join(
                    sentiment[
                        "negative_found"
                    ]
                )
            )

        if importance[
            "found"
        ]:

            print(
                "📌 Konular: "
                + ", ".join(
                    importance[
                        "found"
                    ]
                )
            )

        print(
            "-" * 75
        )

    # =====================================================
    # GENEL HABER DURUMU
    # =====================================================

    difference = (
        positive_total
        - negative_total
    )

    if (
        positive_total == 0
        and negative_total == 0
    ):

        final_status = (
            "⚪ NÖTR / YETERLİ YÖN YOK"
        )

    elif difference >= 2.0:

        final_status = (
            "🟢 POZİTİF HABER AKIŞI"
        )

    elif difference <= -2.0:

        final_status = (
            "🔴 NEGATİF HABER AKIŞI"
        )

    else:

        final_status = (
            "🟡 KARIŞIK HABER AKIŞI"
        )

    print()
    print("=" * 75)
    print(
        f"📢 {ticker} HABER SONUCU"
    )
    print("=" * 75)

    print(
        f"Son 24 saat: {last_24h}"
    )

    print(
        f"Son 3 gün: {last_3d}"
    )

    print(
        f"Yüksek önem: {high_importance}"
    )

    print(
        f"Pozitif ağırlık: "
        f"{positive_total:.2f}"
    )

    print(
        f"Negatif ağırlık: "
        f"{negative_total:.2f}"
    )

    print(
        f"Karışık ağırlık: "
        f"{mixed_total:.2f}"
    )

    print()
    print(
        f"🎯 SONUÇ: {final_status}"
    )

    print(
        "⚠️ Haber sonucu tek başına "
        "AL/SAT sinyali değildir."
    )


# =========================================================
# ANA TEST
# =========================================================

def main():

    print()
    print(
        "=============================================================="
    )

    print(
        "🧠 MELİH STOCK SCANNER"
    )

    print(
        "GÜNCEL HABER MOTORU — SON TEST"
    )

    print(
        "=============================================================="
    )

    print()
    print(
        "Kaynak: Yahoo Finance / yfinance"
    )

    print(
        "Haber yaşı: maksimum 7 gün"
    )

    print(
        "Buy/Sell/Hold başlıkları tek başına sinyal değildir."
    )

    print(
        "Haber sonucu teknik modelden bağımsız test edilmektedir."
    )

    print()

    for ticker in STOCKS:

        analyze_stock(
            ticker
        )

    print()
    print(
        "=============================================================="
    )

    print(
        "✅ TÜM HABER TESTİ TAMAMLANDI"
    )

    print(
        "=============================================================="
    )


if __name__ == "__main__":

    main()
