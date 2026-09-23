import yfinance as yf
import pandas as pd
import numpy as np


# ============================================================
# HİSSELER
# ============================================================

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
    "RIOT",
]


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

    return 100 - (100 / (1 + rs))


# ============================================================
# GÖSTERGELER
# ============================================================

def prepare_stock(ticker):

    try:
        df = yf.download(
            ticker,
            period="5y",
            interval="1d",
            progress=False,
            auto_adjust=False
        )

        if df.empty:
            return None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        required = ["Close", "Volume"]

        for column in required:
            if column not in df.columns:
                return None

        df = df.dropna(subset=required).copy()

        if len(df) < 100:
            return None

        close = df["Close"]

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

        # Hacim ortalaması
        df["VOL_AVG20"] = df["Volume"].rolling(20).mean()

        df = df.dropna().copy()

        return df

    except Exception as e:

        print(f"{ticker} veri hatası: {e}")

        return None


# ============================================================
# SKOR
# ============================================================

def calculate_score(row):

    score = 0

    close = float(row["Close"])

    ema9 = float(row["EMA9"])
    ema20 = float(row["EMA20"])
    ema50 = float(row["EMA50"])

    macd = float(row["MACD"])
    macd_signal = float(row["MACD_SIGNAL"])

    volume = float(row["Volume"])
    volume_avg = float(row["VOL_AVG20"])

    rsi = float(row["RSI"])

    # --------------------------------------------------------
    # EMA - 40 PUAN
    # --------------------------------------------------------

    if close > ema9 > ema20 > ema50:
        score += 40

    elif close > ema9 > ema20:
        score += 30

    elif close > ema20:
        score += 20

    elif close > ema50:
        score += 10

    # --------------------------------------------------------
    # MACD - 30 PUAN
    # --------------------------------------------------------

    if macd > macd_signal and macd > 0:
        score += 30

    elif macd > macd_signal:
        score += 20

    elif macd > 0:
        score += 10

    # --------------------------------------------------------
    # HACİM - 20 PUAN
    # --------------------------------------------------------

    if volume_avg > 0:

        volume_ratio = volume / volume_avg

    else:

        volume_ratio = 0

    if volume_ratio >= 2:
        score += 20

    elif volume_ratio >= 1.5:
        score += 15

    elif volume_ratio >= 1:
        score += 10

    else:
        score += 5

    # --------------------------------------------------------
    # RSI - 10 PUAN
    # --------------------------------------------------------

    if 50 <= rsi <= 65:
        score += 10

    elif 45 <= rsi < 50 or 65 < rsi <= 70:
        score += 8

    elif 40 <= rsi < 45:
        score += 6

    elif 30 <= rsi < 40:
        score += 4

    elif rsi < 30:
        score += 3

    else:
        score += 2

    return round(score)


# ============================================================
# GÜÇLÜ SİNYAL FİLTRESİ
# ============================================================

def strong_signal(row, score):

    close = float(row["Close"])

    ema9 = float(row["EMA9"])
    ema20 = float(row["EMA20"])

    macd = float(row["MACD"])
    macd_signal = float(row["MACD_SIGNAL"])

    volume = float(row["Volume"])
    volume_avg = float(row["VOL_AVG20"])

    rsi = float(row["RSI"])

    if volume_avg > 0:

        volume_ratio = volume / volume_avg

    else:

        volume_ratio = 0

    # 1 - Güçlü yükseliş trendi
    trend_ok = (
        close > ema9
        and ema9 > ema20
    )

    # 2 - MACD teyidi
    macd_ok = (
        macd > macd_signal
        and macd > 0
    )

    # 3 - Hacim teyidi
    volume_ok = volume_ratio >= 1.0

    # 4 - RSI aşırı şişmemiş olmalı
    rsi_ok = 45 <= rsi <= 70

    # 5 - Genel skor
    score_ok = score >= 80

    return (
        trend_ok
        and macd_ok
        and volume_ok
        and rsi_ok
        and score_ok
    )


# ============================================================
# GETİRİ HESABI
# ============================================================

def future_return(df, index, days):

    try:

        current_price = float(
            df.iloc[index]["Close"]
        )

        future_index = index + days

        if future_index >= len(df):
            return None

        future_price = float(
            df.iloc[future_index]["Close"]
        )

        return (
            (future_price - current_price)
            / current_price
        ) * 100

    except Exception:

        return None


# ============================================================
# BACKTEST
# ============================================================

all_results = []

strong_results = []


print()
print("=" * 70)
print("MELİH STOCK SCANNER - GELİŞTİRİLMİŞ BACKTEST")
print("=" * 70)
print()

print("Model:")
print("EMA      : %40")
print("MACD     : %30")
print("Hacim    : %20")
print("RSI      : %10")
print()

print("GÜÇLÜ SİNYAL TEYİDİ:")
print("Fiyat > EMA9 > EMA20")
print("MACD > Sinyal ve MACD > 0")
print("Hacim >= 1.0x ortalama")
print("RSI 45-70")
print("Skor >= 80")
print()

print("=" * 70)
print()


for ticker in STOCKS:

    print(f"{ticker} taranıyor...")

    df = prepare_stock(ticker)

    if df is None:

        print(f"{ticker}: veri alınamadı")
        continue

    ticker_count = 0
    ticker_strong = 0

    # Son 5 yılın tamamını dolaş
    for i in range(len(df) - 5):

        row = df.iloc[i]

        score = calculate_score(row)

        ret_1 = future_return(df, i, 1)
        ret_3 = future_return(df, i, 3)
        ret_5 = future_return(df, i, 5)

        if ret_1 is None:
            continue

        result = {
            "ticker": ticker,
            "score": score,
            "ret_1": ret_1,
            "ret_3": ret_3,
            "ret_5": ret_5,
        }

        all_results.append(result)

        ticker_count += 1

        # Güçlü sinyal kontrolü
        if strong_signal(row, score):

            strong_results.append(result)

            ticker_strong += 1

    print(
        f"{ticker}: "
        f"{ticker_count} test | "
        f"{ticker_strong} güçlü sinyal"
    )


# ============================================================
# GENEL SONUÇLAR
# ============================================================

print()
print("=" * 70)
print("GENEL SONUÇ")
print("=" * 70)


if not all_results:

    print("Sonuç bulunamadı.")

else:

    df_all = pd.DataFrame(all_results)

    print()
    print(f"Toplam test: {len(df_all)}")

    print()
    print(
        f"Ortalama 1 gün : "
        f"{df_all['ret_1'].mean():+.2f}%"
    )

    print(
        f"Ortalama 3 gün : "
        f"{df_all['ret_3'].mean():+.2f}%"
    )

    print(
        f"Ortalama 5 gün : "
        f"{df_all['ret_5'].mean():+.2f}%"
    )


# ============================================================
# SKOR GRUPLARI
# ============================================================

print()
print("=" * 70)
print("SKOR GRUPLARI")
print("=" * 70)


def print_group(name, condition):

    group = df_all[condition]

    if len(group) == 0:

        print()
        print(name)
        print("Sonuç yok.")

        return

    print()
    print(name)
    print("-" * 50)

    print(f"Örnek sayısı: {len(group)}")

    print(
        f"1 gün : {group['ret_1'].mean():+.2f}%"
    )

    print(
        f"3 gün : {group['ret_3'].mean():+.2f}%"
    )

    print(
        f"5 gün : {group['ret_5'].mean():+.2f}%"
    )

    print(
        f"1 gün pozitif: "
        f"{(group['ret_1'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"3 gün pozitif: "
        f"{(group['ret_3'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"5 gün pozitif: "
        f"{(group['ret_5'] > 0).mean() * 100:.1f}%"
    )


print_group(
    "SKOR 80-100",
    df_all["score"] >= 80
)

print_group(
    "SKOR 65-79",
    (df_all["score"] >= 65)
    & (df_all["score"] < 80)
)

print_group(
    "SKOR 50-64",
    (df_all["score"] >= 50)
    & (df_all["score"] < 65)
)

print_group(
    "SKOR 0-49",
    df_all["score"] < 50
)


# ============================================================
# GELİŞTİRİLMİŞ GÜÇLÜ SİNYAL SONUCU
# ============================================================

print()
print("=" * 70)
print("GÜÇLÜ SİNYAL FİLTRESİ SONUCU")
print("=" * 70)


if not strong_results:

    print()
    print("Hiç güçlü sinyal bulunamadı.")

else:

    df_strong = pd.DataFrame(strong_results)

    print()
    print(
        f"Güçlü sinyal sayısı: "
        f"{len(df_strong)}"
    )

    print()

    print(
        f"1 gün ortalama : "
        f"{df_strong['ret_1'].mean():+.2f}%"
    )

    print(
        f"3 gün ortalama : "
        f"{df_strong['ret_3'].mean():+.2f}%"
    )

    print(
        f"5 gün ortalama : "
        f"{df_strong['ret_5'].mean():+.2f}%"
    )

    print()

    print(
        f"1 gün pozitif: "
        f"{(df_strong['ret_1'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"3 gün pozitif: "
        f"{(df_strong['ret_3'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"5 gün pozitif: "
        f"{(df_strong['ret_5'] > 0).mean() * 100:.1f}%"
    )


# ============================================================
# HİSSE BAZLI GÜÇLÜ SİNYALLER
# ============================================================

print()
print("=" * 70)
print("HİSSE BAZLI GÜÇLÜ SİNYALLER")
print("=" * 70)

if strong_results:

    df_strong = pd.DataFrame(strong_results)

    summary = (
        df_strong
        .groupby("ticker")
        .agg(
            sinyal=("ticker", "count"),
            ort_1g=("ret_1", "mean"),
            ort_3g=("ret_3", "mean"),
            ort_5g=("ret_5", "mean")
        )
        .sort_values(
            "ort_5g",
            ascending=False
        )
    )

    print()

    print(summary.to_string())

else:

    print()
    print("Güçlü sinyal yok.")


print()
print("=" * 70)
print("BACKTEST TAMAMLANDI")
print("=" * 70)
print()
