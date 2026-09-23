import yfinance as yf
import pandas as pd
import numpy as np

STOCKS = [
    "SNDL", "PLUG", "SOFI", "OPEN", "JOBY",
    "LCID", "NU", "GRAB", "MARA", "RIOT"
]


def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    return 100 - (100 / (1 + rs))


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

        df = df.dropna(subset=["Close", "Volume"]).copy()

        if len(df) < 100:
            return None

        close = df["Close"]

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

        df["RSI"] = calculate_rsi(close)

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

        df["VOL_AVG20"] = df["Volume"].rolling(20).mean()

        return df.dropna().copy()

    except Exception as e:
        print(f"{ticker} HATA: {e}")
        return None


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

    # EMA - 40
    if close > ema9 > ema20 > ema50:
        score += 40
    elif close > ema9 > ema20:
        score += 30
    elif close > ema20:
        score += 20
    elif close > ema50:
        score += 10

    # MACD - 30
    if macd > macd_signal and macd > 0:
        score += 30
    elif macd > macd_signal:
        score += 20
    elif macd > 0:
        score += 10

    # HACİM - 20
    volume_ratio = volume / volume_avg if volume_avg > 0 else 0

    if volume_ratio >= 2:
        score += 20
    elif volume_ratio >= 1.5:
        score += 15
    elif volume_ratio >= 1:
        score += 10
    else:
        score += 5

    # RSI - 10
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


def future_return(df, index, days):

    if index + days >= len(df):
        return None

    current = float(df.iloc[index]["Close"])
    future = float(df.iloc[index + days]["Close"])

    return ((future - current) / current) * 100


all_results = []
strong_results = []


print()
print("=" * 70)
print("MELİH STOCK SCANNER - FİLTRE TESTİ #2")
print("=" * 70)
print()
print("SKOR SİSTEMİ DEĞİŞMEDİ.")
print()
print("YENİ GÜÇLÜ SİNYAL:")
print("Skor >= 80")
print("Fiyat > EMA9 > EMA20")
print("MACD > MACD Sinyal")
print("RSI ve hacim zorunlu değil.")
print()
print("=" * 70)


for ticker in STOCKS:

    print()
    print(f"{ticker} taranıyor...")

    df = prepare_stock(ticker)

    if df is None:
        print(f"{ticker}: veri alınamadı.")
        continue

    count = 0
    strong_count = 0

    for i in range(len(df) - 5):

        row = df.iloc[i]

        score = calculate_score(row)

        ret1 = future_return(df, i, 1)
        ret3 = future_return(df, i, 3)
        ret5 = future_return(df, i, 5)

        if ret1 is None or ret3 is None or ret5 is None:
            continue

        result = {
            "ticker": ticker,
            "score": score,
            "ret1": ret1,
            "ret3": ret3,
            "ret5": ret5
        }

        all_results.append(result)
        count += 1

        # YENİ FİLTRE
        trend_ok = (
            row["Close"] > row["EMA9"]
            and row["EMA9"] > row["EMA20"]
        )

        macd_ok = (
            row["MACD"] > row["MACD_SIGNAL"]
        )

        if score >= 80 and trend_ok and macd_ok:

            strong_results.append(result)
            strong_count += 1

    print(
        f"{ticker}: {count} test | "
        f"{strong_count} güçlü sinyal"
    )


# ============================================================
# GENEL SONUÇ
# ============================================================

df_all = pd.DataFrame(all_results)

print()
print("=" * 70)
print("GENEL SONUÇ")
print("=" * 70)

print(f"Toplam test: {len(df_all)}")

print(
    f"1 gün : {df_all['ret1'].mean():+.2f}%"
)

print(
    f"3 gün : {df_all['ret3'].mean():+.2f}%"
)

print(
    f"5 gün : {df_all['ret5'].mean():+.2f}%"
)


# ============================================================
# 80+ SKOR
# ============================================================

score80 = df_all[df_all["score"] >= 80]

print()
print("=" * 70)
print("SKOR 80-100")
print("=" * 70)

print(f"Örnek sayısı: {len(score80)}")

print(
    f"1 gün : {score80['ret1'].mean():+.2f}%"
)

print(
    f"3 gün : {score80['ret3'].mean():+.2f}%"
)

print(
    f"5 gün : {score80['ret5'].mean():+.2f}%"
)

print(
    f"1 gün pozitif: "
    f"{(score80['ret1'] > 0).mean() * 100:.1f}%"
)

print(
    f"3 gün pozitif: "
    f"{(score80['ret3'] > 0).mean() * 100:.1f}%"
)

print(
    f"5 gün pozitif: "
    f"{(score80['ret5'] > 0).mean() * 100:.1f}%"
)


# ============================================================
# YENİ GÜÇLÜ SİNYAL
# ============================================================

print()
print("=" * 70)
print("YENİ GÜÇLÜ SİNYAL FİLTRESİ")
print("=" * 70)

if len(strong_results) == 0:

    print("Güçlü sinyal bulunamadı.")

else:

    df_strong = pd.DataFrame(strong_results)

    print(
        f"Güçlü sinyal sayısı: "
        f"{len(df_strong)}"
    )

    print()

    print(
        f"1 gün ortalama : "
        f"{df_strong['ret1'].mean():+.2f}%"
    )

    print(
        f"3 gün ortalama : "
        f"{df_strong['ret3'].mean():+.2f}%"
    )

    print(
        f"5 gün ortalama : "
        f"{df_strong['ret5'].mean():+.2f}%"
    )

    print()

    print(
        f"1 gün pozitif: "
        f"{(df_strong['ret1'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"3 gün pozitif: "
        f"{(df_strong['ret3'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"5 gün pozitif: "
        f"{(df_strong['ret5'] > 0).mean() * 100:.1f}%"
    )


# ============================================================
# HİSSE BAZLI
# ============================================================

print()
print("=" * 70)
print("HİSSE BAZLI GÜÇLÜ SİNYALLER")
print("=" * 70)

if len(strong_results) > 0:

    summary = (
        pd.DataFrame(strong_results)
        .groupby("ticker")
        .agg(
            sinyal=("ticker", "count"),
            ort_1g=("ret1", "mean"),
            ort_3g=("ret3", "mean"),
            ort_5g=("ret5", "mean")
        )
    )

    print(summary.to_string())

else:

    print("Güçlü sinyal yok.")


print()
print("=" * 70)
print("TEST TAMAMLANDI")
print("=" * 70)
