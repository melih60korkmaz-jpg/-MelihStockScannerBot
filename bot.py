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


def get_stock_price(symbol):
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}?range=1d&interval=5m"
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
    previous = meta.get("previousClose")

    return price, previous


def main():
    print("MelihStockScannerBot başlatılıyor...")

    # Telegram bağlantısını test et
    me = telegram("getMe")
    username = me["result"]["username"]

    print("Bot bağlantısı:", username)

    # Telegram'dan gelen mesajları kontrol et
    updates = telegram("getUpdates")

    if not updates.get("result"):
        print("Henüz Telegram mesajı yok.")
        print("Telegram'da botuna /start yaz.")

        # ABD piyasası veri bağlantısını yine de test et
        price, previous = get_stock_price("AAPL")

        print("AAPL fiyatı:", price)
        print("AAPL önceki kapanış:", previous)

        return

    # Son mesajın chat ID'sini al
    last_update = updates["result"][-1]

    message = last_update.get("message")

    if not message:
        print("Mesaj bulunamadı.")
        return

    chat_id = message["chat"]["id"]

    # ABD hisse verisini al
    price, previous = get_stock_price("AAPL")

    if previous:
        change = ((price - previous) / previous) * 100
    else:
        change = 0

    text = (
        "🤖 MelihStockScannerBot\n\n"
        "📊 İlk veri testi başarılı!\n\n"
        f"🇺🇸 AAPL\n"
        f"💵 Fiyat: ${price:.2f}\n"
        f"📈 Günlük değişim: %{change:.2f}\n\n"
        "✅ Telegram bağlantısı çalışıyor.\n"
        "✅ ABD hisse verisi alınabiliyor.\n"
    )

    telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )

    print("Test mesajı Telegram'a gönderildi.")


if __name__ == "__main__":
    main()
