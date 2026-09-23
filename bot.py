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

    first_ema = sum(values[:period]) / period

    result = [None] * (period - 1)
    result.append(first_ema)

    previous_ema = first_ema

    for value in values[period:]:

        previous_ema = (
            (value - previous_ema) * multiplier
        ) + previous_ema

        result.append(previous_ema)

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

    ema12_series = ema_series(values, 12)
    ema26_series = ema_series(values, 26)

    if not ema12_series or not ema26_series:
        return None, None, None

    macd_values = []

    for i in range(len(values)):

        if (
            ema12_series[i] is not None
            and ema26_series[i] is not None
        ):

            macd_values.append(
                ema12_series[i] - ema26_series[i]
            )

    if len(macd_values) < 9:
        return None, None, None

    signal_series = ema_series(macd_values, 9)

    if not signal_series:
        return None, None, None

    macd_value = macd_values[-1]
    signal_value = signal_series[-1]

    histogram = macd_value - signal_value

    return macd_value, signal_value, histogram


def get_stock_data(symbol):

    # Günlük veri
    daily = yahoo_chart(symbol, "6mo", "1d")

    meta = daily["meta"]

    price = meta.get("regularMarketPrice")

    quote = daily["indicators"]["quote"][0]

    daily_closes = [
        x for x in quote.get("close", [])
        if x is not None
    ]

    daily_volumes = [
        x for x in quote.get("volume", [])
        if x is not None
    ]

    previous_close = None

    if len(daily_closes) >= 2:
        previous_close = daily_closes[-2]

    daily_volume = None

    if daily_volumes:
        daily_volume = daily_volumes[-1]

    ema9 = ema(daily_closes, 9)
    ema20 = ema(daily_closes, 20)

    rsi14 = rsi(daily_closes, 14)

    macd_value, macd_signal, macd_histogram = (
        calculate_macd(daily_closes)
    )

    # 5 dakikalık veri - VWAP
    intraday = yahoo_chart(symbol, "1d", "5m")

    intraday_quote = intraday["indicators"]["quote"][0]

    highs = intraday_quote.get("high", [])
    lows = intraday_quote.get("low", [])
    closes = intraday_quote.get("close", [])
    volumes = intraday_quote.get("volume", [])

    cumulative_price_volume = 0
    cumulative_volume = 0

    for high, low, close, volume in zip(
        highs,
        lows,
        closes,
        volumes
    ):

        if (
            high is None
            or low is None
            or close is None
            or volume is None
        ):
            continue

        typical_price = (
            high + low + close
        ) / 3

        cumulative_price_volume += (
            typical_price * volume
        )

        cumulative_volume += volume

    if cumulative_volume > 0:

        vwap = (
            cumulative_price_volume
            / cumulative_volume
        )

    else:

        vwap = None

    return (
        price,
        previous_close,
        daily_volume,
        ema9,
        ema20,
        rsi14,
        vwap,
        macd_value,
        macd_signal,
        macd_histogram
    )


def main():

    print("MelihStockScannerBot başlatılıyor...")

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
                ema9,
                ema20,
                rsi14,
                vwap,
                macd_value,
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

            # EMA trendi
            if (
                ema9 is not None
                and ema20 is not None
            ):

                if price > ema9 > ema20:
                    trend = "YUKARI"

                elif price < ema9 < ema20:
                    trend = "AŞAĞI"

                else:
                    trend = "KARMA"

            else:

                trend = "YETERSİZ VERİ"

            # RSI
            if rsi14 is not None:

                if rsi14 >= 70:
                    rsi_status = "AŞIRI ALIM"

                elif rsi14 <= 30:
                    rsi_status = "AŞIRI SATIM"

                else:
                    rsi_status = "NORMAL"

            else:

                rsi_status = "YETERSİZ VERİ"

            # VWAP
            if vwap is not None:

                if price > vwap:
                    vwap_status = "VWAP ÜSTÜ"

                elif price < vwap:
                    vwap_status = "VWAP ALTI"

                else:
                    vwap_status = "VWAP CİVARI"

            else:

                vwap_status = "YETERSİZ VERİ"

            # MACD
            if (
                macd_value is not None
                and macd_signal is not None
            ):

                if macd_value > macd_signal:
                    macd_status = "POZİTİF"

                elif macd_value < macd_signal:
                    macd_status = "NEGATİF"

                else:
                    macd_status = "NÖTR"

            else:

                macd_status = "YETERSİZ VERİ"

            print(
                f"{symbol}: "
                f"${price:.2f} | "
                f"%{change:.2f} | "
                f"Hacim: {volume} | "
                f"EMA9: {ema9:.2f} | "
                f"EMA20: {ema20:.2f} | "
                f"RSI: {rsi14:.2f} | "
                f"VWAP: {vwap:.2f} | "
                f"MACD: {macd_value:.4f} | "
                f"Sinyal: {macd_signal:.4f} | "
                f"{macd_status}"
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
                        macd_value,
                        macd_signal,
                        macd_histogram,
                        trend,
                        rsi_status,
                        vwap_status,
                        macd_status
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

        for (
            symbol,
            price,
            change,
            volume,
            ema9,
            ema20,
            rsi14,
            vwap,
            macd_value,
            macd_signal,
            macd_histogram,
            trend,
            rsi_status,
            vwap_status,
            macd_status
        ) in results:

            if change > 0:
                emoji = "📈"

            elif change < 0:
                emoji = "📉"

            else:
                emoji = "➡️"

            volume_text = (
                f"{volume:,.0f}"
                if volume
                else "Yok"
            )

            text += (
                f"{emoji} {symbol}\n"
                f"💵 ${price:.2f}\n"
                f"📊 Günlük: %{change:.2f}\n"
                f"📦 Hacim: {volume_text}\n"
                f"📐 EMA9: ${ema9:.2f}\n"
                f"📐 EMA20: ${ema20:.2f}\n"
                f"🔎 Trend: {trend}\n"
                f"📊 RSI14: {rsi14:.2f}\n"
                f"📌 RSI: {rsi_status}\n"
                f"⚖️ VWAP: ${vwap:.2f}\n"
                f"📍 {vwap_status}\n"
                f"〽️ MACD: {macd_value:.4f}\n"
                f"〽️ Sinyal: {macd_signal:.4f}\n"
                f"📈 MACD: {macd_status}\n\n"
            )

    else:

        text += (
            "Bu taramada $1–10 aralığında "
            "hisse bulunamadı."
        )

    text += (
        "⚠️ Bu aşama teknik veri toplama testidir.\n"
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
    print(
        "Telegram'a tarama sonucu gönderildi."
    )


if __name__ == "__main__":
    main()
