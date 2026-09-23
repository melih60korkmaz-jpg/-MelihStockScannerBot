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

    return meta.get("regularMarketPrice")


def main():

    print("MelihStockScannerBot başlatılıyor...")

    me = telegram("getMe")
    print("Bot bağlantısı:", me["result"]["username"])

    # Telegram'dan gelen mesajları al
    updates = telegram("getUpdates")

    if not updates.get("result"):
        print("Telegram'da bekleyen mesaj bulunamadı.")
        return

    # Son mesajın chat ID'sini al
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
            price = get_stock_data(symbol)

            if price is None:
                continue

            print(f"{symbol}: ${price:.2f}")

            if 1 <= price <= 10:
                results.append((symbol, price))

        except Exception as error:
            print(f"{symbol}: veri alınamadı")
            print(error)

    text = "🤖 MelihStockScannerBot\n\n"
    text += "🇺🇸 $1–10 ABD Hisse Taraması\n\n"

    if results:

        for symbol, price in results:
            text += f"✅ {symbol} — ${price:.2f}\n"

    else:

        text += "Bu taramada $1–10 aralığında hisse bulunamadı."

    text += "\n\n⚠️ Bu yalnızca fiyat filtresidir. Henüz AL/TUT sinyali değildir."

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
