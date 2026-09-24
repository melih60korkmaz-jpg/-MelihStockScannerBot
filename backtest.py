import yfinance as yf
import pandas as pd
import numpy as np

STOCKS = [
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

PERIOD = "5y"

# AL sinyali için minimum skor
MIN_SCORE = 80

# Hedef ve zarar-kes
TARGET_1 = 0.04   # +%4
TARGET_2 = 0.07   # +%7
STOP_LOSS = 0.03  # -%3

# Sinyalden sonra maksimum takip günü
MAX_DAYS = 5


def calculate_rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_indicators(df):
    df = df.copy()

    close = df["Close"]
    volume = df["Volume"]

    # EMA
    df["EMA9"] = close.ewm(
        span=9,
        adjust=False
    ).mean()

    df["EMA20"] = close.ewm(
        span=20,
        adjust=False
    ).mean()

    df["EMA50"] = close.ewm(
        span=50,
        adjust=False
    ).mean()

    # RSI
    df["RSI"] = calculate_rsi(close, 14)

    # MACD
    ema12 = close.ewm(
        span=12,
        adjust=False
    ).mean()

    ema26 = close.ewm(
        span=26,
        adjust=False
    ).mean()

    df["MACD"] = ema12 - ema26

    df["MACD_SIGNAL"] = df["MACD"].ewm(
        span=9,
        adjust=False
    ).mean()

    # Hacim
    df["AVG_VOLUME20"] = volume.rolling(20).mean()

    df["VOLUME_RATIO"] = (
        volume / df["AVG_VOLUME20"]
    )

    return df.dropna()


def calculate_score(row):

    close = float(row["Close"])

    ema9 = float(row["EMA9"])
    ema20 = float(row["EMA20"])
    ema50 = float(row["EMA50"])

    macd = float(row["MACD"])
    macd_signal = float(row["MACD_SIGNAL"])

    rsi = float(row["RSI"])

    volume_ratio = float(row["VOLUME_RATIO"])

    # =========================
    # EMA - %40
    # =========================

    if close > ema9 and ema9 > ema20 and ema20 > ema50:
        ema_score = 100

    elif close > ema20 and ema20 > ema50:
        ema_score = 75

    elif close > ema20:
        ema_score = 50

    elif close > ema50:
        ema_score = 25

    else:
        ema_score = 0

    # =========================
    # MACD - %30
    # =========================

    if macd > macd_signal and macd > 0:
        macd_score = 100

    elif macd > macd_signal:
        macd_score = 70

    elif macd > 0:
        macd_score = 40

    else:
        macd_score = 0

    # =========================
    # HACİM - %20
    # =========================

    if volume_ratio >= 2.0:
        volume_score = 100

    elif volume_ratio >= 1.5:
        volume_score = 75

    elif volume_ratio >= 1.0:
        volume_score = 50

    elif volume_ratio >= 0.7:
        volume_score = 25

    else:
        volume_score = 0

    # =========================
    # RSI - %10
    # =========================

    if 50 <= rsi <= 65:
        rsi_score = 100

    elif 45 <= rsi < 50:
        rsi_score = 75

    elif 65 < rsi <= 70:
        rsi_score = 75

    elif 35 <= rsi < 45:
        rsi_score = 50

    elif 70 < rsi <= 75:
        rsi_score = 40

    elif rsi < 35:
        rsi_score = 30

    else:
        rsi_score = 20

    score = (
        ema_score * 0.40
        + macd_score * 0.30
        + volume_score * 0.20
        + rsi_score * 0.10
    )

    return round(score)


def check_trade(df, signal_index):

    entry_price = float(
        df.iloc[signal_index]["Close"]
    )

    target1 = entry_price * (1 + TARGET_1)
    target2 = entry_price * (1 + TARGET_2)
    stop = entry_price * (1 - STOP_LOSS)

    target1_hit = False
    target2_hit = False
    stop_hit = False

    target1_day = None
    target2_day = None
    stop_day = None

    # Sinyal gününden sonraki günlerden başla
    end_index = min(
        signal_index + MAX_DAYS,
        len(df) - 1
    )

    for future_index in range(
        signal_index + 1,
        end_index + 1
    ):

        row = df.iloc[future_index]

        high = float(row["High"])
        low = float(row["Low"])

        # Aynı gün hem stop hem hedef görülürse
        # gün içi sıralamayı bilemediğimiz için
        # TEMKİNLİ olarak STOP kabul ediyoruz.

        hit_target2 = high >= target2
        hit_target1 = high >= target1
        hit_stop = low <= stop

        # Hem stop hem hedef aynı gün
        if hit_stop and (hit_target1 or hit_target2):

            stop_hit = True
            stop_day = future_index - signal_index

            return {
                "result": "STOP",
                "days": stop_day,
                "entry": entry_price,
                "target1": target1,
                "target2": target2,
                "stop": stop
            }

        # Önce Target 2
        if hit_target2:

            target2_hit = True
            target2_day = future_index - signal_index

            return {
                "result": "TARGET_2",
                "days": target2_day,
                "entry": entry_price,
                "target1": target1,
                "target2": target2,
                "stop": stop
            }

        # Sonra Target 1
        if hit_target1:

            target1_hit = True
            target1_day = future_index - signal_index

            return {
                "result": "TARGET_1",
                "days": target1_day,
                "entry": entry_price,
                "target1": target1,
                "target2": target2,
                "stop": stop
            }

        # Stop
        if hit_stop:

            stop_hit = True
            stop_day = future_index - signal_index

            return {
                "result": "STOP",
                "days": stop_day,
                "entry": entry_price,
                "target1": target1,
                "target2": target2,
                "stop": stop
            }

    # 5 gün içerisinde hiçbir seviyeye ulaşmadı
    last_price = float(
        df.iloc[end_index]["Close"]
    )

    change = (
        (last_price - entry_price)
        / entry_price
    ) * 100

    return {
        "result": "TIMEOUT",
        "days": end_index - signal_index,
        "entry": entry_price,
        "target1": target1,
        "target2": target2,
        "stop": stop,
        "final_price": last_price,
        "change": change
    }


def analyze_stock(ticker):

    print()
    print("=" * 60)
    print(f"{ticker} ANALİZ EDİLİYOR")
    print("=" * 60)

    try:

        df = yf.download(
            ticker,
            period=PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False
        )

        if df.empty:
            print("Veri alınamadı.")
            return []

        # Bazı Yahoo Finance sürümlerinde MultiIndex geliyor
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = calculate_indicators(df)

        if df.empty:
            print("Yeterli veri yok.")
            return []

        trades = []

        # Son 5 gün için ileri veri gerektiğinden
        # son MAX_DAYS günü sinyal olarak kullanmıyoruz.
        last_signal_index = len(df) - MAX_DAYS - 1

        for i in range(0, last_signal_index + 1):

            row = df.iloc[i]

            score = calculate_score(row)

            # Sadece 80+ AL sinyallerini test et
            if score < MIN_SCORE:
                continue

            trade = check_trade(df, i)

            trade["ticker"] = ticker
            trade["date"] = df.index[i]
            trade["score"] = score

            trades.append(trade)

        print(
            f"{ticker}: {len(trades)} adet "
            f"{MIN_SCORE}+ sinyal bulundu."
        )

        return trades

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return []


def print_stock_results(trades):

    if not trades:
        return

    ticker = trades[0]["ticker"]

    total = len(trades)

    target1 = sum(
        1 for x in trades
        if x["result"] == "TARGET_1"
    )

    target2 = sum(
        1 for x in trades
        if x["result"] == "TARGET_2"
    )

    stop = sum(
        1 for x in trades
        if x["result"] == "STOP"
    )

    timeout = sum(
        1 for x in trades
        if x["result"] == "TIMEOUT"
    )

    print()
    print(f"📊 {ticker}")
    print("-" * 40)

    print(f"Toplam sinyal : {total}")

    print(
        f"🎯 Hedef 1    : {target1} "
        f"(%{target1 / total * 100:.1f})"
    )

    print(
        f"🎯 Hedef 2    : {target2} "
        f"(%{target2 / total * 100:.1f})"
    )

    print(
        f"🛑 Stop       : {stop} "
        f"(%{stop / total * 100:.1f})"
    )

    print(
        f"⏱️ 5 gün       : {timeout} "
        f"(%{timeout / total * 100:.1f})"
    )


def main():

    print()
    print("=" * 60)
    print("🎯 MELİH STOCK SCANNER")
    print("GİRİŞ / HEDEF / ZARAR-KES BACKTEST")
    print("=" * 60)

    print()
    print(f"Minimum skor : {MIN_SCORE}")
    print(f"Hedef 1      : +{TARGET_1 * 100:.0f}%")
    print(f"Hedef 2      : +{TARGET_2 * 100:.0f}%")
    print(f"Zarar-kes    : -{STOP_LOSS * 100:.0f}%")
    print(f"Takip süresi : {MAX_DAYS} işlem günü")

    all_trades = []

    for ticker in STOCKS:

        trades = analyze_stock(ticker)

        all_trades.extend(trades)

        print_stock_results(trades)

    # =========================
    # GENEL SONUÇ
    # =========================

    print()
    print("=" * 60)
    print("🔥 GENEL SONUÇ")
    print("=" * 60)

    if not all_trades:

        print("Hiç sinyal bulunamadı.")
        return

    total = len(all_trades)

    target1 = sum(
        1 for x in all_trades
        if x["result"] == "TARGET_1"
    )

    target2 = sum(
        1 for x in all_trades
        if x["result"] == "TARGET_2"
    )

    stop = sum(
        1 for x in all_trades
        if x["result"] == "STOP"
    )

    timeout = sum(
        1 for x in all_trades
        if x["result"] == "TIMEOUT"
    )

    print()
    print(f"Toplam 80+ sinyal : {total}")

    print()
    print(
        f"🎯 Hedef 1'e ulaşan : {target1} "
        f"(%{target1 / total * 100:.1f})"
    )

    print(
        f"🎯 Hedef 2'ye ulaşan: {target2} "
        f"(%{target2 / total * 100:.1f})"
    )

    print(
        f"🛑 Stop olan        : {stop} "
        f"(%{stop / total * 100:.1f})"
    )

    print(
        f"⏱️ 5 günde sonuçlanmayan: {timeout} "
        f"(%{timeout / total * 100:.1f})"
    )

    # =========================
    # Hedef 1 veya 2 başarı oranı
    # =========================

    successful = target1 + target2

    print()

    print(
        f"📈 En az Hedef 1'e ulaşma: "
        f"%{successful / total * 100:.1f}"
    )

    # =========================
    # Sonuç dağılımı
    # =========================

    print()
    print("📋 SONUÇ DAĞILIMI")
    print("-" * 40)

    print(
        f"TARGET_2 : {target2}"
    )

    print(
        f"TARGET_1 : {target1}"
    )

    print(
        f"STOP     : {stop}"
    )

    print(
        f"TIMEOUT  : {timeout}"
    )

    print()
    print("=" * 60)
    print("⚠️ Bu backtest geçmiş veriye dayanır.")
    print("⚠️ Geçmiş performans geleceği garanti etmez.")
    print("=" * 60)


if __name__ == "__main__":
    main()
