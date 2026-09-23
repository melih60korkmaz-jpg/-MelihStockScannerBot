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


def prepare_data(df):
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

    df["RSI14"] = rsi(close)

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

    # ÖNCEKİ 20 GÜNÜ kullanıyoruz.
    # Böylece bugünün hacmi geçmiş ortalamaya sızmıyor.
    df["AVG_VOLUME_20"] = volume.shift(1).rolling(20).mean()

    df["VOLUME_RATIO"] = (
        volume / df["AVG_VOLUME_20"]
    )

    # Gelecek getiriler
    df["RET_1"] = (
        close.shift(-1) / close - 1
    )

    df["RET_3"] = (
        close.shift(-3) / close - 1
    )

    df["RET_5"] = (
        close.shift(-5) / close - 1
    )

    # İndikatör sinyalleri

    # EMA
    df["EMA_SIGNAL"] = (
        (close > df["EMA9"]) &
        (df["EMA9"] > df["EMA20"])
    )

    # RSI
    df["RSI_SIGNAL"] = (
        (df["RSI14"] >= 50) &
        (df["RSI14"] <= 65)
    )

    # Hacim
    df["VOLUME_SIGNAL"] = (
        df["VOLUME_RATIO"] >= 1.5
    )

    # MACD
    df["MACD_SIGNAL_TEST"] = (
        df["MACD"] > df["MACD_SIGNAL"]
    )

    return df


def analyse(df, signal_column):
    data = df.dropna(
        subset=[
            signal_column,
            "RET_1",
            "RET_3",
            "RET_5"
        ]
    ).copy()

    signal = data[data[signal_column] == True]

    if len(signal) == 0:
        return None

    return {
        "count": len(signal),

        "ret1": signal["RET_1"].mean() * 100,
        "ret3": signal["RET_3"].mean() * 100,
        "ret5": signal["RET_5"].mean() * 100,

        "pos1": (
            signal["RET_1"] > 0
        ).mean() * 100,

        "pos3": (
            signal["RET_3"] > 0
        ).mean() * 100,

        "pos5": (
            signal["RET_5"] > 0
        ).mean() * 100,
    }


def print_result(name, result):

    print("")
    print("=" * 45)
    print(name)
    print("=" * 45)

    if result is None:
        print("Yeterli veri yok.")
        return

    print(f"Örnek sayısı: {result['count']}")

    print(
        f"1 gün ortalama: "
        f"{result['ret1']:.2f}%"
    )

    print(
        f"3 gün ortalama: "
        f"{result['ret3']:.2f}%"
    )

    print(
        f"5 gün ortalama: "
        f"{result['ret5']:.2f}%"
    )

    print(
        f"1 gün pozitif oranı: "
        f"{result['pos1']:.1f}%"
    )

    print(
        f"3 gün pozitif oranı: "
        f"{result['pos3']:.1f}%"
    )

    print(
        f"5 gün pozitif oranı: "
        f"{result['pos5']:.1f}%"
    )


all_data = []

print("=" * 45)
print("İNDİKATÖR ANALİZİ BAŞLIYOR")
print("=" * 45)

for stock in STOCKS:

    print("")
    print(f"{stock} verisi indiriliyor...")

    try:
        data = yf.download(
            stock,
            period="5y",
            interval="1d",
            auto_adjust=False,
            progress=False,
            threads=False
        )

        if data.empty:
            print(f"{stock}: Veri bulunamadı.")
            continue

        # Bazı Yahoo sonuçlarında sütunlar MultiIndex olabilir.
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)

        data = prepare_data(data)

        data["STOCK"] = stock

        all_data.append(data)

        print(f"{stock} tamamlandı.")

    except Exception as e:
        print(f"{stock} HATA: {e}")


if not all_data:
    print("")
    print("Hiç veri alınamadı.")
    raise SystemExit


df = pd.concat(
    all_data,
    ignore_index=True
)

print("")
print("=" * 45)
print("GENEL SONUÇ")
print("=" * 45)

valid = df.dropna(
    subset=[
        "RET_1",
        "RET_3",
        "RET_5"
    ]
)

print(
    f"Toplam test sayısı: {len(valid)}"
)

print(
    f"1 gün genel ortalama: "
    f"{valid['RET_1'].mean() * 100:.2f}%"
)

print(
    f"3 gün genel ortalama: "
    f"{valid['RET_3'].mean() * 100:.2f}%"
)

print(
    f"5 gün genel ortalama: "
    f"{valid['RET_5'].mean() * 100:.2f}%"
)


# İNDİKATÖRLERİ TEK TEK TEST ET

ema_result = analyse(
    df,
    "EMA_SIGNAL"
)

rsi_result = analyse(
    df,
    "RSI_SIGNAL"
)

volume_result = analyse(
    df,
    "VOLUME_SIGNAL"
)

macd_result = analyse(
    df,
    "MACD_SIGNAL_TEST"
)


print_result(
    "EMA SİNYALİ",
    ema_result
)

print_result(
    "RSI SİNYALİ",
    rsi_result
)

print_result(
    "HACİM SİNYALİ",
    volume_result
)

print_result(
    "MACD SİNYALİ",
    macd_result
)


print("")
print("=" * 45)
print("ANALİZ TAMAMLANDI")
print("=" * 45)
