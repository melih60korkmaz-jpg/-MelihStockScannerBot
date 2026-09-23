import yfinance as yf
import pandas as pd
import numpy as np

STOCKS = [
    "SNDL",
    "PLUG",
    "OPEN",
    "JOBY",
    "LCID",
    "GRAB",
    "SOFI",
    "NU",
    "MARA",
    "RIOT"
]


def calculate_rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss

    return 100 - (100 / (1 + rs))


def calculate_score(data):
    data = data.copy()

    data["EMA9"] = data["Close"].ewm(
        span=9,
        adjust=False
    ).mean()

    data["EMA20"] = data["Close"].ewm(
        span=20,
        adjust=False
    ).mean()

    data["RSI"] = calculate_rsi(data["Close"])

    ema12 = data["Close"].ewm(
        span=12,
        adjust=False
    ).mean()

    ema26 = data["Close"].ewm(
        span=26,
        adjust=False
    ).mean()

    data["MACD"] = ema12 - ema26

    data["SIGNAL"] = data["MACD"].ewm(
        span=9,
        adjust=False
    ).mean()

    data["AVG_VOLUME"] = data["Volume"].rolling(20).mean()

    scores = []

    for i in range(len(data)):

        row = data.iloc[i]

        price = row["Close"]
        ema9 = row["EMA9"]
        ema20 = row["EMA20"]
        rsi = row["RSI"]
        volume = row["Volume"]
        avg_volume = row["AVG_VOLUME"]
        macd = row["MACD"]
        signal = row["SIGNAL"]

        if (
            pd.isna(ema9)
            or pd.isna(ema20)
            or pd.isna(rsi)
            or pd.isna(avg_volume)
            or pd.isna(macd)
            or pd.isna(signal)
        ):
            scores.append(np.nan)
            continue

        score = 0

        # EMA - 25 puan
        if price > ema9 and ema9 > ema20:
            score += 25

        elif price > ema20:
            score += 15

        elif price > ema9:
            score += 10

        # HACİM - 20 puan
        volume_ratio = volume / avg_volume

        if volume_ratio >= 2:
            score += 20

        elif volume_ratio >= 1.5:
            score += 15

        elif volume_ratio >= 1:
            score += 10

        else:
            score += 5

        # RSI - 15 puan
        if 50 <= rsi <= 65:
            score += 15

        elif 40 <= rsi < 50:
            score += 10

        elif 65 < rsi < 70:
            score += 10

        elif 30 <= rsi < 40:
            score += 7

        elif rsi < 30:
            score += 5

        else:
            score += 3

        # MACD - 20 puan
        if macd > signal:
            score += 20

        else:
            score += 5

        scores.append(score)

    data["SCORE"] = scores

    return data


results = []

print("=" * 60)
print("MELIH STOCK SCANNER - BACKTEST")
print("=" * 60)

for symbol in STOCKS:

    print()
    print(symbol, "verisi indiriliyor...")

    try:

        data = yf.download(
            symbol,
            period="2y",
            interval="1d",
            auto_adjust=False,
            progress=False
        )

        if data.empty:
            print(symbol, "icin veri bulunamadi.")
            continue

        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)

        data = data.dropna()

        data = calculate_score(data)

        for i in range(len(data) - 5):

            score = data["SCORE"].iloc[i]

            if pd.isna(score):
                continue

            price = float(data["Close"].iloc[i])

            price_1 = float(data["Close"].iloc[i + 1])
            price_3 = float(data["Close"].iloc[i + 3])
            price_5 = float(data["Close"].iloc[i + 5])

            return_1d = ((price_1 / price) - 1) * 100
            return_3d = ((price_3 / price) - 1) * 100
            return_5d = ((price_5 / price) - 1) * 100

            results.append({
                "symbol": symbol,
                "date": data.index[i],
                "score": float(score),
                "return_1d": return_1d,
                "return_3d": return_3d,
                "return_5d": return_5d
            })

        print(symbol, "tamamlandi.")

    except Exception as e:

        print(symbol, "HATA:", e)


results_df = pd.DataFrame(results)

print()
print("=" * 60)
print("GENEL SONUCLAR")
print("=" * 60)

if results_df.empty:

    print("Hicbir backtest sonucu olusmadi.")

else:

    print("Toplam test sayisi:", len(results_df))

    print()
    print("SCORE GRUPLARI")
    print("-" * 60)

    groups = [
        ("80+", 80, 101),
        ("65-79", 65, 80),
        ("50-64", 50, 65),
        ("0-49", 0, 50)
    ]

    for name, minimum, maximum in groups:

        group = results_df[
            (results_df["score"] >= minimum)
            & (results_df["score"] < maximum)
        ]

        print()
        print("SCORE", name)
        print("Test sayisi:", len(group))

        if len(group) == 0:
            print("Yeterli veri yok.")
            continue

        positive_1d = (
            group["return_1d"] > 0
        ).mean() * 100

        positive_3d = (
            group["return_3d"] > 0
        ).mean() * 100

        positive_5d = (
            group["return_5d"] > 0
        ).mean() * 100

        print(
            "1 gun ortalama getiri:",
            round(group["return_1d"].mean(), 2),
            "%"
        )

        print(
            "3 gun ortalama getiri:",
            round(group["return_3d"].mean(), 2),
            "%"
        )

        print(
            "5 gun ortalama getiri:",
            round(group["return_5d"].mean(), 2),
            "%"
        )

        print(
            "1 gun pozitif:",
            round(positive_1d, 2),
            "%"
        )

        print(
            "3 gun pozitif:",
            round(positive_3d, 2),
            "%"
        )

        print(
            "5 gun pozitif:",
            round(positive_5d, 2),
            "%"
        )

    print()
    print("=" * 60)
    print("BACKTEST TAMAMLANDI")
    print("=" * 60)
