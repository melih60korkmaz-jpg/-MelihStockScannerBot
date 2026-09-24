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

MIN_SCORE = 80

MAX_DAYS = 5

TARGET_1 = 0.05
TARGET_2 = 0.08
STOP_LOSS = 0.04

# Basit işlem maliyeti varsayımı
COST = 0.001


def calculate_rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    return 100 - (100 / (1 + rs))


def calculate_indicators(df):

    df = df.copy()

    close = df["Close"]
    volume = df["Volume"]

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

    df["RSI"] = calculate_rsi(
        close,
        14
    )

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

    df["AVG_VOLUME20"] = volume.rolling(
        20
    ).mean()

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

    volume_ratio = float(
        row["VOLUME_RATIO"]
    )

    # EMA %40
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

    # MACD %30
    if macd > macd_signal and macd > 0:
        macd_score = 100

    elif macd > macd_signal:
        macd_score = 70

    elif macd > 0:
        macd_score = 40

    else:
        macd_score = 0

    # HACİM %20
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

    # RSI %10
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


def test_trade(df, signal_index):

    entry_index = signal_index + 1

    if entry_index >= len(df):
        return None

    entry_price = float(
        df.iloc[entry_index]["Open"]
    )

    target1 = entry_price * (
        1 + TARGET_1
    )

    target2 = entry_price * (
        1 + TARGET_2
    )

    stop = entry_price * (
        1 - STOP_LOSS
    )

    end_index = min(
        entry_index + MAX_DAYS - 1,
        len(df) - 1
    )

    for i in range(
        entry_index,
        end_index + 1
    ):

        row = df.iloc[i]

        high = float(row["High"])
        low = float(row["Low"])

        hit1 = high >= target1
        hit2 = high >= target2
        hit_stop = low <= stop

        # Aynı gün hem hedef hem stop
        if hit_stop and (hit1 or hit2):

            return {
                "result": "STOP",
                "return": -STOP_LOSS - COST,
                "days": i - entry_index + 1
            }

        if hit2:

            return {
                "result": "TARGET_2",
                "return": TARGET_2 - COST,
                "days": i - entry_index + 1
            }

        if hit1:

            return {
                "result": "TARGET_1",
                "return": TARGET_1 - COST,
                "days": i - entry_index + 1
            }

        if hit_stop:

            return {
                "result": "STOP",
                "return": -STOP_LOSS - COST,
                "days": i - entry_index + 1
            }

    final_price = float(
        df.iloc[end_index]["Close"]
    )

    final_return = (
        (final_price - entry_price)
        / entry_price
    )

    return {
        "result": "TIMEOUT",
        "return": final_return - COST,
        "days": end_index - entry_index + 1
    }


def download_stock(ticker):

    try:

        print(f"{ticker} indiriliyor...")

        df = yf.download(
            ticker,
            period=PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False
        )

        if df.empty:
            return None

        if isinstance(
            df.columns,
            pd.MultiIndex
        ):
            df.columns = (
                df.columns
                .get_level_values(0)
            )

        df = calculate_indicators(df)

        return df

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return None


def get_signals(df, start, end):

    signals = []

    last_signal = min(
        end,
        len(df) - MAX_DAYS - 1
    )

    for i in range(
        start,
        last_signal + 1
    ):

        score = calculate_score(
            df.iloc[i]
        )

        if score >= MIN_SCORE:

            signals.append(i)

    return signals


def run_period(df, start, end):

    trades = []

    signals = get_signals(
        df,
        start,
        end
    )

    for signal_index in signals:

        trade = test_trade(
            df,
            signal_index
        )

        if trade:
            trades.append(trade)

    return trades


def summarize(trades):

    if not trades:
        return None

    total = len(trades)

    target1 = sum(
        x["result"] == "TARGET_1"
        for x in trades
    )

    target2 = sum(
        x["result"] == "TARGET_2"
        for x in trades
    )

    stop = sum(
        x["result"] == "STOP"
        for x in trades
    )

    timeout = sum(
        x["result"] == "TIMEOUT"
        for x in trades
    )

    returns = [
        x["return"]
        for x in trades
    ]

    avg_return = np.mean(
        returns
    )

    positive = sum(
        x > 0
        for x in returns
    )

    positive_rate = (
        positive / total
    )

    simple_total = sum(
        returns
    )

    equity = 1.0

    for r in returns:
        equity *= (1 + r)

    compound = equity - 1

    # İşlem sırasındaki maksimum düşüş
    peak = 1.0
    current = 1.0
    max_drawdown = 0

    for r in returns:

        current *= (1 + r)

        if current > peak:
            peak = current

        drawdown = (
            current - peak
        ) / peak

        max_drawdown = min(
            max_drawdown,
            drawdown
        )

    return {
        "total": total,
        "target1": target1,
        "target2": target2,
        "stop": stop,
        "timeout": timeout,
        "avg": avg_return,
        "positive": positive_rate,
        "simple": simple_total,
        "compound": compound,
        "drawdown": max_drawdown
    }


def main():

    print()
    print("=" * 65)
    print("🔥 MELİH STOCK SCANNER")
    print("SON DOĞRULAMA TESTİ")
    print("=" * 65)

    print()
    print("🎯 Sistem")
    print("Hedef 1 : +%5")
    print("Hedef 2 : +%8")
    print("Stop    : -%4")
    print("Skor    : 80+")
    print("Takip   : 5 işlem günü")
    print("Maliyet : %0.10")

    all_data = {}

    for ticker in STOCKS:

        df = download_stock(
            ticker
        )

        if df is not None:

            all_data[ticker] = df

    print()
    print("=" * 65)
    print("📚 VERİ AYRILIYOR")
    print("=" * 65)

    # --------------------------------------------------------
    # Her hissenin ilk %70'i eğitim,
    # son %30'u test.
    # --------------------------------------------------------

    train_trades = []
    test_trades = []

    for ticker, df in all_data.items():

        split = int(
            len(df) * 0.70
        )

        train = run_period(
            df,
            0,
            split
        )

        test = run_period(
            df,
            split,
            len(df)
        )

        train_trades.extend(
            train
        )

        test_trades.extend(
            test
        )

        print(
            f"{ticker}: "
            f"eğitim={len(train)} "
            f"test={len(test)}"
        )

    train_result = summarize(
        train_trades
    )

    test_result = summarize(
        test_trades
    )

    # ========================================================
    # EĞİTİM
    # ========================================================

    print()
    print("=" * 65)
    print("📚 İLK %70 — GEÇMİŞ DÖNEM")
    print("=" * 65)

    if train_result:

        print(
            f"İşlem: {train_result['total']}"
        )

        print(
            f"H1: {train_result['target1']}"
        )

        print(
            f"H2: {train_result['target2']}"
        )

        print(
            f"Stop: {train_result['stop']}"
        )

        print(
            f"Pozitif: "
            f"%{train_result['positive'] * 100:.1f}"
        )

        print(
            f"Ortalama işlem: "
            f"%{train_result['avg'] * 100:.3f}"
        )

        print(
            f"Basit toplam: "
            f"%{train_result['simple'] * 100:.1f}"
        )

        print(
            f"Maks. düşüş: "
            f"%{train_result['drawdown'] * 100:.1f}"
        )

    # ========================================================
    # TEST
    # ========================================================

    print()
    print("=" * 65)
    print("🧪 SON %30 — GÖRÜLMEMİŞ TEST DÖNEMİ")
    print("=" * 65)

    if test_result:

        print(
            f"İşlem: {test_result['total']}"
        )

        print(
            f"H1: {test_result['target1']}"
        )

        print(
            f"H2: {test_result['target2']}"
        )

        print(
            f"Stop: {test_result['stop']}"
        )

        print(
            f"Timeout: {test_result['timeout']}"
        )

        print(
            f"Pozitif: "
            f"%{test_result['positive'] * 100:.1f}"
        )

        print(
            f"Ortalama işlem: "
            f"%{test_result['avg'] * 100:.3f}"
        )

        print(
            f"Basit toplam: "
            f"%{test_result['simple'] * 100:.1f}"
        )

        print(
            f"Maks. düşüş: "
            f"%{test_result['drawdown'] * 100:.1f}"
        )

    # ========================================================
    # KARAR DESTEK
    # ========================================================

    print()
    print("=" * 65)
    print("🔎 MODEL KONTROLÜ")
    print("=" * 65)

    if train_result and test_result:

        print()

        print(
            "Eğitim ortalama: "
            f"%{train_result['avg'] * 100:.3f}"
        )

        print(
            "Test ortalama:   "
            f"%{test_result['avg'] * 100:.3f}"
        )

        difference = (
            test_result["avg"]
            - train_result["avg"]
        )

        print(
            "Fark:            "
            f"%{difference * 100:.3f}"
        )

        print()

        if (
            test_result["avg"] > 0
            and test_result["positive"] >= 0.35
        ):

            print(
                "🟢 TEST DÖNEMİ POZİTİF"
            )

            print(
                "Sistem canlı bot için "
                "incelenebilir durumda."
            )

        else:

            print(
                "🟡 TEST DÖNEMİ ZAYIF"
            )

            print(
                "Canlıya almadan önce "
                "modeli geliştirmek gerekiyor."
            )

    print()
    print("=" * 65)
    print("⚠️ Bu bir geçmiş veri testidir.")
    print("⚠️ Sonuçlar geleceği garanti etmez.")
    print("⚠️ Gerçek işlem maliyetleri değişebilir.")
    print("=" * 65)


if __name__ == "__main__":
    main()
