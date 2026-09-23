import os
import json
import urllib.request
import urllib.parse

TOKEN = os.environ.get("BOT_TOKEN")


def telegram(method, data=None):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"

    if data is not None:
        encoded = json.dumps(data).encode("utf-8")

        request = urllib.request.Request(
            url,
            data=encoded,
            headers={"Content-Type": "application/json"}
        )
    else:
        request = urllib.request.Request(url)

    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def get_stock_data(symbol):
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}"
        f"?range=5d&interval=1d"
    )

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))

    result = data["chart"]["result"][0]

    meta = result["meta"]
    price = meta.get("regularMarketPrice")

    indicators = result["indicators"]["quote"][0]

    closes = indicators.get("close", [])
    volumes = indicators.get("volume", [])

    previous_close = None
    volume = None

    valid_closes = [x for x in closes if x is not None]
    valid_volumes = [x for x in volumes if x is not None]

    if len(valid_closes) >= 2:
        previous_close = valid_closes[-2]

    if valid_volumes:
        volume = valid_volumes[-1]

    return price, previous_close, volume


def main():

    print("MelihStockScannerBot başlatılıyor...")

    me = telegram("getMe")

    print("Bot bağlantısı:", me["result"]["username"])

    updates = telegram("getUpdates")

    if not updates.get("result"):
        print("Telegram'da bekleyen mesaj bulunamadı.")
        return

    last_update = updates["result"][-1]

    message = last_update.get("message")

    if not message:
        print("Mesaj bulunamadı.")
        return

    chat_id = message["chat"]["id"]

    stocks = [
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

    results = []

    print("")
    print("ABD HİSSE TARAMASI")
    print("------------------")

    for symbol in stocks:

        try:

            price, previous_close, volume = get_stock_data(symbol)

            if price is None:
                continue

            if previous_close:
                change = (
                    (price - previous_close)
                    / previous_close
                ) * 100
            else:
                change = 0

            print(
                f"{symbol}: ${price:.2f} | "
                f"%{change:.2f} | "
                f"Hacim: {volume}"
            )

            if 1 <= price <= 10:

                results.append(
                    (
                        symbol,
                        price,
                        change,
                        volume
                    )
                )

        except Exception as error:

            print(f"{symbol}: veri alınamadı")
            print(error)

    text = "🤖 MelihStockScannerBot\n\n"

    text += "🇺🇸 $1–10 ABD Hisse Taraması\n\n"

    if results:

        for symbol, price, change, volume in results:

            if change > 0:
                emoji = "📈"
            elif change < 0:
                emoji = "📉"
            else:
                emoji = "➡️"

            if volume:
                volume_text = f"{volume:,.0f}"
            else:
                volume_text = "Yok"

            text += (
                f"{emoji} {symbol}\n"
                f"💵 ${price:.2f}\n"
                f"📊 Günlük: %{change:.2f}\n"
                f"📦 Hacim: {volume_text}\n\n"
            )

    else:

        text += "Bu taramada $1–10 aralığında hisse bulunamadı."

    text += (
        "⚠️ Bu aşama yalnızca fiyat + günlük değişim + "
        "hacim verisidir.\n"
        "Henüz AL/TUT sinyali değildir."
    )

    telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )

    print("")
    print("Telegram'a tarama sonucu gönderildi.")


if __name__ == "__main__":
    main()
