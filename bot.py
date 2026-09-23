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


def yahoo_chart(symbol, range_value, interval):
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}"
        f"?range={range_value}&interval={interval}"
    )

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))

    return data["chart"]["result"][0]


def ema_series(values, period):

    if len(values) < period:
        return []

    multiplier = 2 / (period + 1)

    value = sum(values[:period]) / period

    result = [None] * (period - 1)
    result.append(value)

    for price in values[period:]:
        value = ((price - value) * multiplier) + value
        result.append(value)

    return result


def ema(values, period):

    series = ema_series(values, period)

    if not series:
        return None

    return series[-1]


def rsi(values, period=14):

    if len(values) <= period:
        return None

    gains = []
    losses = []

    for i in range(1, len(values)):

        change = values[i] - values[i - 1]

        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))

    average_gain = sum(gains[:period]) / period
    average_loss = sum(losses[:period]) / period

    for i in range(period, len(gains)):

        average_gain = (
            (average_gain * (period - 1))
            + gains[i]
        ) / period

        average_loss = (
            (average_loss * (period - 1))
            + losses[i]
        ) / period

    if average_loss == 0:
        return 100

    rs = average_gain / average_loss

    return 100 - (100 / (1 + rs))


def calculate_macd(values):

    ema12 = ema_series(values, 12)
    ema26 = ema_series(values, 26)

    if not ema12 or not ema26:
        return None, None, None

    macd_values = []

    for i in range(len(values)):

        if (
            ema12[i] is not None
            and ema26[i] is not None
        ):
            macd_values.append(
                ema12[i] - ema26[i]
            )

    if len(macd_values) < 9:
        return None, None, None

    signal_series = ema_series(macd_values, 9)

    if not signal_series:
        return None, None, None

    macd = macd_values[-1]
    signal = signal_series[-1]
    histogram = macd - signal

    return macd, signal, histogram


def get_stock_data(symbol):

    daily = yahoo_chart(symbol, "6mo", "1d")

    meta = daily["meta"]
    price = meta.get("regularMarketPrice")

    quote = daily["indicators"]["quote"][0]

    closes = [
        x for x in quote.get("close", [])
        if x is not None
    ]

    volumes = [
        x for x in quote.get("volume", [])
        if x is not None
    ]

    previous_close = (
        closes[-2]
        if len(closes) >= 2
        else None
    )

    volume = (
        volumes[-1]
        if volumes
        else None
    )

    ema9 = ema(closes, 9)
    ema20 = ema(closes, 20)

    rsi14 = rsi(closes, 14)

    macd, macd_signal, macd_histogram = (
        calculate_macd(closes)
    )

    # Son 20 günlük ortalama hacim
    recent_volumes = volumes[-20:]

    if recent_volumes:
        average_volume = (
            sum(recent_volumes)
            / len(recent_volumes)
        )
    else:
        average_volume = None

    # 5 dakikalık veri - VWAP
    intraday = yahoo_chart(symbol, "1d", "5m")

    intraday_quote = (
        intraday["indicators"]["quote"][0]
    )

    highs = intraday_quote.get("high", [])
    lows = intraday_quote.get("low", [])
    intraday_closes = (
        intraday_quote.get("close", [])
    )
    intraday_volumes = (
        intraday_quote.get("volume", [])
    )

    price_volume = 0
    total_volume = 0

    for high, low, close, vol in zip(
        highs,
        lows,
        intraday_closes,
        intraday_volumes
    ):

        if (
            high is None
            or low is None
            or close is None
            or vol is None
        ):
            continue

        typical_price = (
            high + low + close
        ) / 3

        price_volume += (
            typical_price * vol
        )

        total_volume += vol

    if total_volume > 0:
        vwap = (
            price_volume
            / total_volume
        )
    else:
        vwap = None

    return (
        price,
        previous_close,
        volume,
        average_volume,
        ema9,
        ema20,
        rsi14,
        vwap,
        macd,
        macd_signal,
        macd_histogram
    )


def calculate_score(
    price,
    volume,
    average_volume,
    ema9,
    ema20,
    rsi14,
    vwap,
    macd,
    macd_signal
):

    score = 0

    # EMA TREND - 25 PUAN

    if (
        price > ema9
        and ema9 > ema20
    ):
        score += 25

    elif price > ema20:
        score += 15

    elif price > ema9:
        score += 10


    # HACİM - 20 PUAN

    if (
        volume is not None
        and average_volume is not None
        and average_volume > 0
    ):

        volume_ratio = (
            volume
            / average_volume
        )

        if volume_ratio >= 2:
            score += 20

        elif volume_ratio >= 1.5:
            score += 15

        elif volume_ratio >= 1:
            score += 10

        else:
            score += 5


    # RSI - 15 PUAN

    if rsi14 is not None:

        if 50 <= rsi14 <= 65:
            score += 15

        elif 40 <= rsi14 < 50:
            score += 10

        elif 65 < rsi14 < 70:
            score += 10

        elif 30 <= rsi14 < 40:
            score += 7

        elif rsi14 < 30:
            score += 5

        else:
            score += 3


    # VWAP - 20 PUAN

    if vwap is not None:

        if price > vwap:
            score += 20

        elif price >= vwap * 0.99:
            score += 10

        else:
            score += 5


    # MACD - 20 PUAN

    if (
        macd is not None
        and macd_signal is not None
    ):

        if macd > macd_signal:
            score += 20

        else:
            score += 5

    return score


def signal_label(score):

    if score >= 80:
        return "AL ADAYI"

    elif score >= 65:
        return "TUT"

    elif score >= 50:
        return "DİKKAT"

    else:
        return "RİSKLİ"


def main():

    print(
        "MelihStockScannerBot başlatılıyor..."
    )

    me = telegram("getMe")

    print(
        "Bot bağlantısı:",
        me["result"]["username"]
    )

    updates = telegram("getUpdates")

    if not updates.get("result"):

        print(
            "Telegram'da bekleyen mesaj bulunamadı."
        )

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

            (
                price,
                previous_close,
                volume,
                average_volume,
                ema9,
                ema20,
                rsi14,
                vwap,
                macd,
                macd_signal,
                macd_histogram
            ) = get_stock_data(symbol)

            if price is None:
                continue

            if previous_close:
                change = (
                    (price - previous_close)
                    / previous_close
                ) * 100
            else:
                change = 0

            score = calculate_score(
                price,
                volume,
                average_volume,
                ema9,
                ema20,
                rsi14,
                vwap,
                macd,
                macd_signal
            )

            label = signal_label(score)

            if price > ema9 > ema20:
                trend = "YUKARI"

            elif price < ema9 < ema20:
                trend = "AŞAĞI"

            else:
                trend = "KARMA"

            if rsi14 >= 70:
                rsi_status = "AŞIRI ALIM"

            elif rsi14 <= 30:
                rsi_status = "AŞIRI SATIM"

            else:
                rsi_status = "NORMAL"

            if price > vwap:
                vwap_status = "VWAP ÜSTÜ"
            else:
                vwap_status = "VWAP ALTI"

            if macd > macd_signal:
                macd_status = "POZİTİF"
            else:
                macd_status = "NEGATİF"

            print(
                f"{symbol}: "
                f"${price:.2f} | "
                f"Skor: {score}/100 | "
                f"{label}"
            )

            if 1 <= price <= 10:

                results.append(
                    (
                        symbol,
                        price,
                        change,
                        volume,
                        ema9,
                        ema20,
                        rsi14,
                        vwap,
                        macd,
                        macd_signal,
                        trend,
                        rsi_status,
                        vwap_status,
                        macd_status,
                        score,
                        label
                    )
                )

        except Exception as error:

            print(
                f"{symbol}: veri alınamadı"
            )

            print(error)


    text = (
        "🤖 MelihStockScannerBot\n\n"
        "🇺🇸 $1–10 ABD Hisse Taraması\n\n"
    )


    if results:

        # En yüksek skoru üste al
        results.sort(
            key=lambda x: x[14],
            reverse=True
        )

        for item in results:

            (
                symbol,
                price,
                change,
                volume,
                ema9,
                ema20,
                rsi14,
                vwap,
                macd,
                macd_signal,
                trend,
                rsi_status,
                vwap_status,
                macd_status,
                score,
                label
            ) = item

            if score >= 80:
                emoji = "🟢"

            elif score >= 65:
                emoji = "🟡"

            elif score >= 50:
                emoji = "🟠"

            else:
                emoji = "🔴"

            text += (
                f"{emoji} {symbol}\n"
                f"💵 ${price:.2f}\n"
                f"📊 Günlük: %{change:.2f}\n"
                f"📦 Hacim: {volume:,.0f}\n"
                f"📐 EMA9: ${ema9:.2f}\n"
                f"📐 EMA20: ${ema20:.2f}\n"
                f"🔎 Trend: {trend}\n"
                f"📊 RSI14: {rsi14:.2f}\n"
                f"⚖️ VWAP: ${vwap:.2f}\n"
                f"〽️ MACD: {macd:.4f}\n"
                f"📈 Sinyal: {macd_signal:.4f}\n"
                f"⭐ SKOR: {score}/100\n"
                f"📌 {label}\n\n"
            )

    else:

        text += (
            "Bu taramada $1–10 aralığında "
            "hisse bulunamadı."
        )


    text += (
        "⚠️ Skor şu an TEST modelidir.\n"
        "Skor, yükselme yüzdesi değildir.\n"
        "Henüz geçmiş verilerle kalibre edilmemiştir."
    )


    telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text
        }
    )

    print("")
    print(
        "Telegram'a tarama sonucu gönderildi."
    )


if __name__ == "__main__":
    main()
