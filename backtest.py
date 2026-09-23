import yfinance as yf
import pandas as pd
import numpy as np

# ============================================================
# MELİH STOCK SCANNER - TEST #5
# FİLTRE: EMA + MACD + RSI + HACİM
# ============================================================

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

PERIOD = "5y"

# ============================================================
# RSI
# ============================================================

def calculate_rsi(series, period=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    rsi = 100 - (100 / (1 + rs))

    return rsi


# ============================================================
# VERİ HAZIRLA
# ============================================================

def prepare_stock(ticker):

    try:

        df = yf.download(
            ticker,
            period=PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False
        )

        if df.empty:
            return None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.copy()

        required = ["Close", "Volume"]

        for col in required:
            if col not in df.columns:
                return None

        close = df["Close"]
        volume = df["Volume"]

        # EMA
        df["EMA20"] = close.ewm(
            span=20,
            adjust=False
        ).mean()

        df["EMA50"] = close.ewm(
            span=50,
            adjust=False
        ).mean()

        # RSI
        df["RSI"] = calculate_rsi(close)

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

        # Hacim oranı
        df["AVG_VOLUME20"] = volume.rolling(20).mean()

        df["VOLUME_RATIO"] = (
            volume / df["AVG_VOLUME20"]
        )

        df = df.dropna()

        return df

    except Exception as e:

        print(f"{ticker} HATA: {e}")

        return None


# ============================================================
# TEST #5 FİLTRESİ
# ============================================================

def strong_signal(row):

    close = float(row["Close"])
    ema20 = float(row["EMA20"])
    ema50 = float(row["EMA50"])

    rsi = float(row["RSI"])

    macd = float(row["MACD"])
    macd_signal = float(row["MACD_SIGNAL"])

    volume_ratio = float(row["VOLUME_RATIO"])

    # 1 - Fiyat EMA20 üzerinde
    condition_ema_price = close > ema20

    # 2 - EMA20, EMA50 üzerinde
    condition_ema_trend = ema20 > ema50

    # 3 - MACD sinyalin üzerinde
    condition_macd = macd > macd_signal

    # 4 - RSI sağlıklı momentum bölgesinde
    condition_rsi = 45 <= rsi <= 68

    # 5 - Hacim en az ortalama kadar
    condition_volume = volume_ratio >= 1.0

    return (
        condition_ema_price
        and condition_ema_trend
        and condition_macd
        and condition_rsi
        and condition_volume
    )


# ============================================================
# ANA TEST
# ============================================================

all_results = []

print("=" * 60)
print("MELİH STOCK SCANNER - FİLTRE TESTİ #5")
print("=" * 60)

print()
print("FİLTRE ŞARTLARI:")
print("1. Fiyat > EMA20")
print("2. EMA20 > EMA50")
print("3. MACD > MACD Sinyal")
print("4. RSI 45-68")
print("5. Hacim >= 20 günlük ortalama")
print()
print("=" * 60)


for ticker in STOCKS:

    print()
    print(f"{ticker} taranıyor...")

    df = prepare_stock(ticker)

    if df is None:
        print(f"{ticker}: Veri alınamadı.")
        continue

    tests = 0
    strong_count = 0

    returns_1 = []
    returns_3 = []
    returns_5 = []

    for i in range(len(df) - 5):

        row = df.iloc[i]

        tests += 1

        if not strong_signal(row):
            continue

        strong_count += 1

        current_price = float(df["Close"].iloc[i])

        price_1 = float(df["Close"].iloc[i + 1])
        price_3 = float(df["Close"].iloc[i + 3])
        price_5 = float(df["Close"].iloc[i + 5])

        ret_1 = (
            (price_1 / current_price) - 1
        ) * 100

        ret_3 = (
            (price_3 / current_price) - 1
        ) * 100

        ret_5 = (
            (price_5 / current_price) - 1
        ) * 100

        returns_1.append(ret_1)
        returns_3.append(ret_3)
        returns_5.append(ret_5)

        all_results.append({
            "ticker": ticker,
            "date": df.index[i],
            "signal": 1,
            "ret_1": ret_1,
            "ret_3": ret_3,
            "ret_5": ret_5
        })

    print(
        f"{ticker}: {tests} test | "
        f"{strong_count} güçlü sinyal"
    )


# ============================================================
# GENEL SONUÇ
# ============================================================

print()
print("=" * 60)
print("GENEL SONUÇ")
print("=" * 60)

if len(all_results) == 0:

    print("Hiç güçlü sinyal bulunamadı.")

else:

    result_df = pd.DataFrame(all_results)

    avg_1 = result_df["ret_1"].mean()
    avg_3 = result_df["ret_3"].mean()
    avg_5 = result_df["ret_5"].mean()

    positive_1 = (
        result_df["ret_1"] > 0
    ).mean() * 100

    positive_3 = (
        result_df["ret_3"] > 0
    ).mean() * 100

    positive_5 = (
        result_df["ret_5"] > 0
    ).mean() * 100

    print()
    print(f"Güçlü sinyal sayısı: {len(result_df)}")

    print()

    print(
        f"1 gün ortalama: {avg_1:+.2f}%"
    )

    print(
        f"3 gün ortalama: {avg_3:+.2f}%"
    )

    print(
        f"5 gün ortalama: {avg_5:+.2f}%"
    )

    print()

    print(
        f"1 gün pozitif: %{positive_1:.1f}"
    )

    print(
        f"3 gün pozitif: %{positive_3:.1f}"
    )

    print(
        f"5 gün pozitif: %{positive_5:.1f}"
    )

    # ========================================================
    # HİSSE BAZLI SONUÇ
    # ========================================================

    print()
    print("=" * 60)
    print("HİSSE BAZLI GÜÇLÜ SİNYALLER")
    print("=" * 60)

    stock_summary = []

    for ticker in STOCKS:

        stock_data = result_df[
            result_df["ticker"] == ticker
        ]

        if stock_data.empty:
            continue

        stock_summary.append({
            "hisse": ticker,
            "sinyal": len(stock_data),
            "ort_1g": stock_data["ret_1"].mean(),
            "ort_3g": stock_data["ret_3"].mean(),
            "ort_5g": stock_data["ret_5"].mean()
        })

    summary_df = pd.DataFrame(stock_summary)

    if not summary_df.empty:

        summary_df = summary_df.sort_values(
            "ort_5g",
            ascending=False
        )

        print(
            summary_df.to_string(
                index=False,
                formatters={
                    "ort_1g": "{:+.2f}%".format,
                    "ort_3g": "{:+.2f}%".format,
                    "ort_5g": "{:+.2f}%".format
                }
            )
        )

print()
print("=" * 60)
print("TEST #5 TAMAMLANDI")
print("=" * 60)
