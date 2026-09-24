import yfinance as yf

STOCKS = [
    "RIOT",
    "MARA",
    "SNDL"
]

for ticker in STOCKS:

    print()
    print("=" * 50)
    print(f"{ticker} HABERLERİ")
    print("=" * 50)

    try:
        stock = yf.Ticker(ticker)

        news = stock.get_news(
            count=5,
            tab="news"
        )

        if not news:
            print("Haber bulunamadı.")
            continue

        for i, item in enumerate(news, 1):

            content = item.get(
                "content",
                {}
            )

            title = content.get(
                "title",
                "Başlık yok"
            )

            publisher = content.get(
                "provider",
                {}
            ).get(
                "displayName",
                "Kaynak bilinmiyor"
            )

            print()
            print(f"{i}. {title}")
            print(f"Kaynak: {publisher}")

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )
