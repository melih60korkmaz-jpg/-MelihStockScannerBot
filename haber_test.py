import yfinance as yf
from datetime import datetime, timezone

STOCKS = {
    "RIOT": [
        "riot platforms",
        "riot",
        "riot blockchain"
    ],
    "MARA": [
        "mara holdings",
        "marathon digital",
        "mara"
    ],
    "SNDL": [
        "sndl",
        "sndl inc",
        "sundial growers"
    ]
}

POSITIVE_WORDS = [
    "earnings beat",
    "revenue growth",
    "profit",
    "profitability",
    "partnership",
    "agreement",
    "contract",
    "deal",
    "expansion",
    "growth",
    "investment",
    "approval",
    "record revenue",
    "strong results",
    "raises outlook",
    "upgrade"
]

NEGATIVE_WORDS = [
    "loss",
    "losses",
    "revenue decline",
    "decline",
    "debt",
    "lawsuit",
    "investigation",
    "downgrade",
    "cut outlook",
    "weak results",
    "bankruptcy",
    "offering",
    "dilution",
    "layoffs"
]

IMPORTANT_WORDS = [
    "earnings",
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
    "bitcoin",
    "data center"
]


def clean_text(text):
    if not text:
        return ""

    return " ".join(
        text.lower().split()
    )


def company_match(title, ticker):

    title = clean_text(title)

    aliases = STOCKS[ticker]

    for alias in aliases:

        if alias in title:
            return True

    return False


def analyze_news(title, ticker):

    text = clean_text(title)

    positive = 0
    negative = 0
    important = 0

    for word in POSITIVE_WORDS:

        if word in text:
            positive += 1

    for word in NEGATIVE_WORDS:

        if word in text:
            negative += 1

    for word in IMPORTANT_WORDS:

        if word in text:
            important += 1

    if positive > negative:

        sentiment = "🟢 POZİTİF"

    elif negative > positive:

        sentiment = "🔴 NEGATİF"

    else:

        sentiment = "⚪ NÖTR"

    if important >= 2:

        importance = "🔥 YÜKSEK"

    elif important == 1:

        importance = "🟡 ORTA"

    else:

        importance = "⚪ DÜŞÜK"

    return (
        sentiment,
        importance,
        positive,
        negative
    )


def get_news(ticker):

    print()
    print("=" * 60)
    print(f"{ticker} HABER ANALİZİ")
    print("=" * 60)

    try:

        stock = yf.Ticker(ticker)

        news = stock.get_news(
            count=10,
            tab="news"
        )

        if not news:

            print("Haber bulunamadı.")
            return

        accepted = 0

        for item in news:

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

            # Şirketle ilgili mi?
            if not company_match(
                title,
                ticker
            ):

                print()
                print(
                    f"⛔ ELENDİ: {title}"
                )

                continue

            (
                sentiment,
                importance,
                positive,
                negative
            ) = analyze_news(
                title,
                ticker
            )

            provider = content.get(
                "provider",
                {}
            ).get(
                "displayName",
                "Bilinmiyor"
            )

            accepted += 1

            print()
            print(
                f"📰 {title}"
            )

            print(
                f"Kaynak: {provider}"
            )

            print(
                f"Şirket eşleşmesi: ✅"
            )

            print(
                f"Haber etkisi: {sentiment}"
            )

            print(
                f"Önem: {importance}"
            )

            print(
                f"Pozitif kelime: {positive} | "
                f"Negatif kelime: {negative}"
            )

            print("-" * 60)

        print()

        print(
            f"✅ {ticker}: "
            f"{accepted} ilgili haber bulundu."
        )

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )


def main():

    print()
    print(
        "📰 MELİH STOCK SCANNER"
    )

    print(
        "HABER FİLTRE + ANALİZ TESTİ"
    )

    for ticker in STOCKS:

        get_news(ticker)

    print()
    print(
        "TEST TAMAMLANDI."
    )


if __name__ == "__main__":

    main()
