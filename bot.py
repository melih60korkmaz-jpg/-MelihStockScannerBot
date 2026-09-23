import os
import urllib.request
import json
import time

TOKEN = os.environ.get("BOT_TOKEN")

def telegram(method, data=None):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    if data:
        data = json.dumps(data).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
    else:
        request = urllib.request.Request(url)

    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))

def main():
    print("MelihStockScannerBot başlatılıyor...")

    me = telegram("getMe")
    print("Bot bağlantısı:", me["result"]["username"])

    print("Bot hazır.")

if __name__ == "__main__":
    main()
