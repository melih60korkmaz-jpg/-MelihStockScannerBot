import yfinance as yf
import pandas as pd
import numpy as np

STOCKS = [
    "SNDL", "PLUG", "OPEN", "JOBY", "LCID",
    "GRAB", "SOFI", "NU", "MARA", "RIOT"
]


def rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(
        alpha=1 / period,
        adjust=False
    ).mean()

    avg_loss = loss.ewm(
        alpha=1 / period,
        adjust=False
    ).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    return 100 - (100 / (1 + rs))


def add_indicators(data):
    data = data.copy()

    close = data["Close"]

    data["EMA9"] = close.ewm(
        span=9,
        adjust=False
    ).mean()

    data["EMA20"] = close.ewm(
        span=20,
        adjust=False
    ).mean()

    data["RSI"] = rsi(close)

    ema12 = close.ewm(
        span=12,
        adjust=False
    ).mean()

    ema26 = close.ewm(
        span=26,
        adjust=False
    ).mean()

    data["MACD"] = ema12 - ema26

    data["SIGNAL"] = data["MACD"].ewm(
        span=9,
        adjust=False
    ).mean()

    data["AVG_VOLUME"] = (
        data["Volume"]
        .shift(1)
        .rolling(20)
        .mean()
    )

    return data


def calculate_score(row):

    price = float(row["Close"])
    ema9 = float(row["EMA9"])
    ema20 = float(row["EMA20"])

    rsi_value = float(row["RSI"])

    volume = float(row["Volume"])
    avg_volume = float(row["AVG_VOLUME"])

    macd = float(row["MACD"])
    signal = float(row["SIGNAL"])

    raw = 0

    # EMA - 25 puan
    if price > ema9 and ema9 > ema20:
        raw += 25

    elif price > ema20:
        raw += 15

    elif price > ema9:
        raw += 10


    # HACIM - 20 puan
    volume_ratio = (
        volume / avg_volume
        if avg_volume > 0
        else 0
    )

    if volume_ratio >= 2:
        raw += 20

    elif volume_ratio >= 1.5:
        raw += 15

    elif volume_ratio >= 1:
        raw += 10

    else:
        raw += 5


    # RSI - 15 puan
    if 50 <= rsi_value <= 65:
        raw += 15

    elif 40 <= rsi_value < 50:
        raw += 10

    elif 65 < rsi_value < 70:
        raw += 10

    elif 30 <= rsi_value < 40:
        raw += 7

    elif rsi_value < 30:
        raw += 5

    else:
        raw += 3


    # MACD - 20 puan
    if macd > signal:
        raw += 20

    else:
        raw += 5


    # VWAP ilk backtestte kullanilmiyor.
    # Gunluk Yahoo verisinde gercek intraday VWAP yok.
    # 80 puanlik skor 100'e olceklendiriliyor.

    return round((raw / 80) * 100, 2)


def get_bucket(score):

    if score >= 80:
        return "80-100"

    if score >= 65:
        return "65-79"

    if score >= 50:
        return "50-64"

    return "0-49"


all_results = []

print("=" * 70)
print("MELIH STOCK SCANNER - BACKTEST")
print("=" * 70)

print(
    "Not: VWAP ilk testte kullanilmiyor."
)

print()


for symbol in STOCKS:

    print(symbol, "verisi indiriliyor...")

    try:

        data = yf.download(
            symbol,
            period="5y",
            interval="1d",
            auto_adjust=False,
            progress=False,
            threads=False
        )

        if data.empty:

            print(symbol, "icin veri yok.")

            continue


        if isinstance(
            data.columns,
            pd.MultiIndex
        ):

            data.columns = (
                data.columns
                .get_level_values(0)
            )


        needed = [
            "Close",
            "Volume"
        ]

        if not all(
            col in data.columns
            for col in needed
        ):

            print(
                symbol,
                "icin gerekli kolonlar yok."
            )

            continue


        data = data[
            needed
        ].dropna()


        data = add_indicators(
            data
        )


        # Ilk 60 gun indikatorlerin
        # oturmasi icin kullanilmiyor.
        #
        # Sonraki 5 gun de gelecekteki
        # getiriyi olcmek icin gerekiyor.

        for i in range(
            60,
            len(data) - 5
        ):

            row = data.iloc[i]


            values = [
                row["EMA9"],
                row["EMA20"],
                row["RSI"],
                row["AVG_VOLUME"],
                row["MACD"],
                row["SIGNAL"]
            ]


            if any(
                pd.isna(x)
                for x in values
            ):

                continue


            price = float(
                data["Close"].iloc[i]
            )

            price_1 = float(
                data["Close"].iloc[i + 1]
            )

            price_3 = float(
                data["Close"].iloc[i + 3]
            )

            price_5 = float(
                data["Close"].iloc[i + 5]
            )


            score = calculate_score(
                row
            )


            all_results.append({

                "symbol": symbol,

                "date": str(
                    data.index[i].date()
                ),

                "score": score,

                "bucket": get_bucket(
                    score
                ),

                "return_1d": (
                    price_1 / price - 1
                ) * 100,

                "return_3d": (
                    price_3 / price - 1
                ) * 100,

                "return_5d": (
                    price_5 / price - 1
                ) * 100

            })


        print(
            symbol,
            "tamamlandi."
        )


    except Exception as e:

        print(
            symbol,
            "HATA:",
            e
        )


results = pd.DataFrame(
    all_results
)


print()

print("=" * 70)
print("GENEL SONUCLAR")
print("=" * 70)


if results.empty:

    print(
        "Hicbir backtest sonucu olusmadi."
    )

    raise SystemExit(0)


print(
    "Toplam test sayisi:",
    len(results)
)


print(
    "1 gun ortalama getiri: %.2f%%"
    % results["return_1d"].mean()
)


print(
    "3 gun ortalama getiri: %.2f%%"
    % results["return_3d"].mean()
)


print(
    "5 gun ortalama getiri: %.2f%%"
    % results["return_5d"].mean()
)


print()

print("SKOR GRUPLARI")
print("-" * 70)


for bucket in [
    "80-100",
    "65-79",
    "50-64",
    "0-49"
]:

    group = results[
        results["bucket"] == bucket
    ]


    if group.empty:

        print(
            bucket,
            ": veri yok"
        )

        continue


    win1 = (
        group["return_1d"] > 0
    ).mean() * 100


    win3 = (
        group["return_3d"] > 0
    ).mean() * 100


    win5 = (
        group["return_5d"] > 0
    ).mean() * 100


    print()

    print(
        "SKOR",
        bucket
    )


    print(
        "Ornek sayisi:",
        len(group)
    )


    print(
        "1 gun ortalama: %.2f%%"
        % group["return_1d"].mean()
    )


    print(
        "3 gun ortalama: %.2f%%"
        % group["return_3d"].mean()
    )


    print(
        "5 gun ortalama: %.2f%%"
        % group["return_5d"].mean()
    )


    print(
        "1 gun pozitif oran: %.1f%%"
        % win1
    )


    print(
        "3 gun pozitif oran: %.1f%%"
        % win3
    )


    print(
        "5 gun pozitif oran: %.1f%%"
        % win5
    )


results.to_csv(
    "backtest_sonuclari.csv",
    index=False
)


print()

print("=" * 70)
print("BACKTEST TAMAMLANDI")
print(
    "Detaylar backtest_sonuclari.csv dosyasina kaydedildi."
)
print("=" * 70)
