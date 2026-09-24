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
            "plug",
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
            "nu",
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

POSITIVE_PHRASES = [
    "earnings beat",
    "revenue growth",
    "profit growth",
    "strong earnings",
    "strong results",
    "record revenue",
    "record earnings",
    "revenue rises",
    "revenue increased",
    "profit rises",
    "profit increased",
    "raises outlook",
    "raised guidance",
    "positive outlook",
    "partnership",
    "strategic partnership",
    "agreement",
    "strategic agreement",
    "contract",
    "major contract",
    "new contract",
    "expansion",
    "investment",
    "strategic investment",
    "approval",
    "regulatory approval",
    "acquisition",
    "acquires",
    "growth",
    "outperforms",
    "outperformed",
    "beats estimates",
    "beats expectations"
]


NEGATIVE_PHRASES = [
    "earnings miss",
    "revenue decline",
    "revenue fell",
    "revenue falls",
    "profit decline",
    "profit fell",
    "weak earnings",
    "weak results",
    "loss",
    "losses",
    "operating loss",
    "net loss",
    "lowers outlook",
    "lowered guidance",
    "cuts outlook",
    "cut outlook",
    "downgrade",
    "lawsuit",
    "investigation",
    "regulatory investigation",
    "bankruptcy",
    "debt",
    "high debt",
    "cash burn",
    "layoffs",
    "job cuts",
    "offering",
    "secondary offering",
    "stock offering",
    "dilution",
    "share dilution",
    "recall",
    "production halt",
    "production cuts"
]


IMPORTANT_PHRASES = [
    "earnings",
    "quarterly results",
    "revenue",
    "guidance",
    "contract",
    "agreement",
    "partnership",
    "acquisition",
    "investment",
    "lawsuit",
    "investigation",
    "approval",
    "offering",
    "dilution",
    "debt",
    "cash",
    "data center",
    "bitcoin",
    "production",
    "delivery",
    "regulatory",
    "sec",
    "ceo",
    "management"
]


# Bunlar tek başına haberin olumlu/olumsuz olduğunu göstermez.
# Özellikle finans sitelerindeki "buy / sell / hold" başlıklarını
# yanlışlıkla sinyal olarak kabul etmemek için kullanılmıyorlar.
OPINION_WORDS = [
    "buy",
    "sell",
    "hold",
    "should you buy",
    "should you sell",
    "price target"
]


# =========================================================
# YARDIMCI FONKSİYONLAR
# =========================================================

def clean_text(text):

    if not text:
        return ""

    return " ".join(
        str(text).lower().split()
    )


def company_match(title, ticker):

    text = clean_text(title)

    aliases = STOCKS[ticker]["aliases"]

    for alias in aliases:

        if alias in text:
            return True

    return False


def count_phrases(text, phrases):

    count = 0
    found = []

    for phrase in phrases:

        if phrase in text:

            count += 1
            found.append(phrase)

    return count, found


def parse_date(content):

    possible_dates = [
        content.get("pubDate"),
        content.get("displayTime"),
        content.get("published"),
        content.get("providerPublishTime")
    ]

    for value in possible_dates:

        if value is None:
            continue

        try:

            # Unix timestamp
            if isinstance(value, (int, float)):

                return datetime.fromtimestamp(
                    value,
                    tz=timezone.utc
                )

            # ISO tarih
            if isinstance(value, str):

                text = value.strip()

                if text.endswith("Z"):
                    text = text[:-1] + "+00:00"

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
            continue

    return None


def freshness_info(pub_date):

    if pub_date is None:

        return (
            "⚪ TARİH YOK",
            0.5
        )

    now = datetime.now(
        timezone.utc
    )

    age_hours = (
        now - pub_date
    ).total_seconds() / 3600

    if age_hours < 0:

        age_hours = 0

    if age_hours <= 24:

        return (
            "🔥 SON 24 SAAT",
            1.0
        )

    if age_hours <= 72:

        return (
            "🟢 SON 3 GÜN",
            0.8
        )

    if age_hours <= 168:

        return (
            "🟡 SON 7 GÜN",
            0.5
        )

    return (
        "⚪ 7 GÜNDEN ESKİ",
        0.2
    )


def analyze_title(title):

    text = clean_text(title)

    positive_count, positive_found = (
        count_phrases(
            text,
            POSITIVE_PHRASES
        )
    )

    negative_count, negative_found = (
        count_phrases(
            text,
            NEGATIVE_PHRASES
        )
    )

    important_count, important_found = (
        count_phrases(
            text,
            IMPORTANT_PHRASES
        )
    )

    opinion_count, opinion_found = (
        count_phrases(
            text,
            OPINION_WORDS
        )
    )

    # -----------------------------------------------------
    # Buy / Sell / Hold başlığı tek başına sentiment değildir.
    # -----------------------------------------------------

    if (
        positive_count == 0
        and negative_count == 0
    ):

        sentiment = "⚪ NÖTR"

    elif positive_count > negative_count:

        sentiment = "🟢 POZİTİF"

    elif negative_count > positive_count:

        sentiment = "🔴 NEGATİF"

    else:

        sentiment = "🟡 KARIŞIK"

    # -----------------------------------------------------
    # ÖNEM
    # -----------------------------------------------------

    if important_count >= 2:

        importance = "🔥 YÜKSEK"

    elif important_count == 1:

        importance = "🟡 ORTA"

    else:

        importance = "⚪ DÜŞÜK"

    return {
        "sentiment": sentiment,
        "importance": importance,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "important_count": important_count,
        "positive_found": positive_found,
        "negative_found": negative_found,
        "important_found": important_found,
        "opinion_count": opinion_count,
        "opinion_found": opinion_found
    }


# =========================================================
# HABER AĞIRLIĞI
# =========================================================

def article_weight(importance, freshness):

    importance_score = {
        "🔥 YÜKSEK": 3.0,
        "🟡 ORTA": 2.0,
        "⚪ DÜŞÜK": 1.0
    }.get(
        importance,
        1.0
    )

    return (
        importance_score * freshness
    )


# =========================================================
# TEK HİSSE HABER ANALİZİ
# =========================================================

def analyze_stock_news(ticker):

    print()
    print("=" * 70)
    print(
        f"📰 {ticker} — "
        f"{STOCKS[ticker]['name']}"
    )
    print("=" * 70)

    try:

        stock = yf.Ticker(
            ticker
        )

        news = stock.get_news(
            count=10,
            tab="news"
        )

        if not news:

            print(
                "❌ Haber bulunamadı."
            )

            return

        total_checked = 0
        accepted = 0
        recent_count = 0

        positive_weight = 0.0
        negative_weight = 0.0
        neutral_weight = 0.0

        for item in news:

            total_checked += 1

            content = item.get(
                "content",
                {}
            )

            title = content.get(
                "title",
                ""
            )

            if not title:
                continue

            # -------------------------------------------------
            # 1 — ŞİRKET EŞLEŞMESİ
            # -------------------------------------------------

            if not company_match(
                title,
                ticker
            ):

                print()
                print(
                    f"⛔ ELENDİ — Şirket "
                    f"eşleşmesi yok:"
                )

                print(
                    f"   {title}"
                )

                continue

            # -------------------------------------------------
            # 2 — TARİH
            # -------------------------------------------------

            pub_date = parse_date(
                content
            )

            freshness_label, freshness = (
                freshness_info(
                    pub_date
                )
            )

            if pub_date:

                date_text = (
                    pub_date.strftime(
                        "%Y-%m-%d %H:%M UTC"
                    )
                )

            else:

                date_text = (
                    "Tarih alınamadı"
                )

            # -------------------------------------------------
            # 3 — ANALİZ
            # -------------------------------------------------

            analysis = analyze_title(
                title
            )

            sentiment = analysis[
                "sentiment"
            ]

            importance = analysis[
                "importance"
            ]

            weight = article_weight(
                importance,
                freshness
            )

            accepted += 1

            if freshness >= 0.5:

                recent_count += 1

            if sentiment == "🟢 POZİTİF":

                positive_weight += weight

            elif sentiment == "🔴 NEGATİF":

                negative_weight += weight

            else:

                neutral_weight += weight

            # -------------------------------------------------
            # 4 — HABERİ YAZDIR
            # -------------------------------------------------

            provider = content.get(
                "provider",
                {}
            ).get(
                "displayName",
                "Bilinmiyor"
            )

            print()
            print(
                f"📰 {title}"
            )

            print(
                f"Kaynak: {provider}"
            )

            print(
                f"📅 {date_text}"
            )

            print(
                f"⏱ {freshness_label}"
            )

            print(
                "🏢 Şirket eşleşmesi: ✅"
            )

            print(
                f"📊 Haber etkisi: "
                f"{sentiment}"
            )

            print(
                f"🔥 Önem: "
                f"{importance}"
            )

            print(
                f"Pozitif: "
                f"{analysis['positive_count']} "
                f"{analysis['positive_found']}"
            )

            print(
                f"Negatif: "
                f"{analysis['negative_count']} "
                f"{analysis['negative_found']}"
            )

            print(
                f"Önemli konu: "
                f"{analysis['important_found']}"
            )

            if analysis[
                "opinion_count"
            ] > 0:

                print(
                    "ℹ️ Bu başlıkta "
                    "analist/yorum dili var; "
                    "tek başına sinyal "
                    "olarak kullanılmadı."
                )

            print(
                "-" * 70
            )

        # =====================================================
        # TOPLU HABER SONUCU
        # =====================================================

        print()
        print(
            f"📌 {ticker} HABER ÖZETİ"
        )

        print(
            "-" * 70
        )

        print(
            f"Çekilen haber: "
            f"{total_checked}"
        )

        print(
            f"Şirketle ilgili: "
            f"{accepted}"
        )

        print(
            f"Güncel haber: "
            f"{recent_count}"
        )

        print(
            f"Pozitif ağırlık: "
            f"{positive_weight:.2f}"
        )

        print(
            f"Negatif ağırlık: "
            f"{negative_weight:.2f}"
        )

        print(
            f"Nötr ağırlık: "
            f"{neutral_weight:.2f}"
        )

        # -----------------------------------------------------
        # GENEL HABER DURUMU
        # -----------------------------------------------------

        if accepted == 0:

            final_status = (
                "⚪ YETERSİZ VERİ"
            )

        elif (
            positive_weight == 0
            and negative_weight == 0
        ):

            final_status = (
                "⚪ NÖTR / BELİRSİZ"
            )

        elif (
            positive_weight
            > negative_weight * 1.5
        ):

            final_status = (
                "🟢 POZİTİF HABER AKIŞI"
            )

        elif (
            negative_weight
            > positive_weight * 1.5
        ):

            final_status = (
                "🔴 NEGATİF HABER AKIŞI"
            )

        else:

            final_status = (
                "🟡 KARIŞIK HABER AKIŞI"
            )

        print()
        print(
            f"📢 SONUÇ: {final_status}"
        )

        print(
            "⚠️ Bu sonuç yatırım kararı "
            "değildir; haber başlıklarının "
            "otomatik sınıflandırmasıdır."
        )

    except Exception as e:

        print()
        print(
            f"❌ {ticker} HATA:"
        )

        print(e)


# =========================================================
# TÜM TEST
# =========================================================

def main():

    print()
    print(
        "======================================================"
    )

    print(
        "🧠 MELİH STOCK SCANNER"
    )

    print(
        "GELİŞMİŞ HABER ANALİZ TESTİ"
    )

    print(
        "======================================================"
    )

    print()

    print(
        "Sistem:"
    )

    print(
        "1. Şirket eşleşmesi"
    )

    print(
        "2. Haber tarihi"
    )

    print(
        "3. Güncellik"
    )

    print(
        "4. Önem analizi"
    )

    print(
        "5. Pozitif / negatif analiz"
    )

    print(
        "6. Çoklu haber ağırlığı"
    )

    print(
        "7. Toplu haber sonucu"
    )

    print()

    for ticker in STOCKS:

        analyze_stock_news(
            ticker
        )

    print()
    print(
        "======================================================"
    )

    print(
        "✅ HABER TESTİ TAMAMLANDI"
    )

    print(
        "======================================================"
    )


if __name__ == "__main__":

    main()
