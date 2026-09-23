import yfinance as yf
import pandas as pd
import numpy as np

# ==========================================
# HİSSELER
# ==========================================

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

# ==========================================
# RSI
# ==========================================

def calculate_rsi(series, period=14):
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


# ==========================================
# TEK HİSSEYİ HAZIRLA
# ==========================================

def prepare_stock(ticker):

    print(f"{ticker} verisi indiriliyor...")

    try:
        df = yf.Ticker(ticker).history(
            period="5y",
            interval="1d",
            auto_adjust=False
        )

        if df.empty:
            print(f"{ticker} veri yok.")
            return None

        df = df.copy()

        # ------------------------------
        # TEMEL İNDİKATÖRLER
        # ------------------------------

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

        df["RSI"] = calculate_rsi(close, 14)

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

        # Çok önemli:
        # Hacim ortalaması mevcut günü kullanmıyor.
        # Böylece geleceğe bakma hatası oluşmuyor.
        df["AVG_VOLUME"] = volume.shift(1).rolling(20).mean()

        # ------------------------------
        # GELECEK GETİRİLER
        # ------------------------------

        df["RETURN_1"] = (
            close.shift(-1) / close - 1
        ) * 100

        df["RETURN_3"] = (
            close.shift(-3) / close - 1
        ) * 100

        df["RETURN_5"] = (
            close.shift(-5) / close - 1
        ) * 100

        # Yeterli veri olmayan satırları çıkar
        df = df.dropna(
            subset=[
                "EMA9",
                "EMA20",
                "RSI",
                "MACD",
                "MACD_SIGNAL",
                "AVG_VOLUME",
                "RETURN_1",
                "RETURN_3",
                "RETURN_5"
            ]
        )

        print(f"{ticker} tamamlandı.")

        return df

    except Exception as e:

        print(f"{ticker} HATA: {e}")

        return None


# ==========================================
# YENİ SKOR MODELİ
# ==========================================

def calculate_score(row):

    # ------------------------------
    # EMA - %40
    # ------------------------------

    if row["Close"] > row["EMA9"] and row["EMA9"] > row["EMA20"]:
        ema_score = 100

    elif row["Close"] > row["EMA20"]:
        ema_score = 60

    elif row["Close"] > row["EMA9"]:
        ema_score = 40

    else:
        ema_score = 0


    # ------------------------------
    # MACD - %30
    # ------------------------------

    if row["MACD"] > row["MACD_SIGNAL"]:
        macd_score = 100
    else:
        macd_score = 0


    # ------------------------------
    # HACİM - %20
    # ------------------------------

    volume_ratio = (
        row["Volume"] / row["AVG_VOLUME"]
    )

    if volume_ratio >= 2:
        volume_score = 100

    elif volume_ratio >= 1.5:
        volume_score = 75

    elif volume_ratio >= 1:
        volume_score = 50

    else:
        volume_score = 25


    # ------------------------------
    # RSI - %10
    # ------------------------------

    rsi = row["RSI"]

    if 50 <= rsi <= 65:
        rsi_score = 100

    elif 40 <= rsi < 50:
        rsi_score = 67

    elif 65 < rsi < 70:
        rsi_score = 67

    elif 30 <= rsi < 40:
        rsi_score = 47

    elif rsi < 30:
        rsi_score = 33

    else:
        rsi_score = 20


    # ------------------------------
    # AĞIRLIKLI TOPLAM
    # ------------------------------

    total_score = (
        ema_score * 0.40
        + macd_score * 0.30
        + volume_score * 0.20
        + rsi_score * 0.10
    )

    return round(total_score)


# ==========================================
# VERİLERİ TOPLA
# ==========================================

all_results = []

for ticker in STOCKS:

    df = prepare_stock(ticker)

    if df is None:
        continue

    for index, row in df.iterrows():

        score = calculate_score(row)

        all_results.append({
            "ticker": ticker,
            "date": index,
            "score": score,
            "return_1": row["RETURN_1"],
            "return_3": row["RETURN_3"],
            "return_5": row["RETURN_5"]
        })


results = pd.DataFrame(all_results)


# ==========================================
# SONUÇLARI HESAPLA
# ==========================================

print()
print("=" * 60)
print("YENİ AĞIRLIKLI SKOR MODELİ")
print("=" * 60)

print()
print("EMA:    %40")
print("MACD:   %30")
print("HACİM:  %20")
print("RSI:    %10")

print()
print("=" * 60)
print("GENEL SONUÇ")
print("=" * 60)

print(f"Toplam test sayısı: {len(results)}")

print(
    f"1 gün genel ortalama: "
    f"{results['return_1'].mean():.2f}%"
)

print(
    f"3 gün genel ortalama: "
    f"{results['return_3'].mean():.2f}%"
)

print(
    f"5 gün genel ortalama: "
    f"{results['return_5'].mean():.2f}%"
)


# ==========================================
# SKOR GRUPLARI
# ==========================================

groups = [
    ("80-100", 80, 100),
    ("65-79", 65, 79),
    ("50-64", 50, 64),
    ("0-49", 0, 49)
]

print()
print("=" * 60)
print("SKOR GRUPLARI")
print("=" * 60)

for name, low, high in groups:

    group = results[
        (results["score"] >= low)
        & (results["score"] <= high)
    ]

    print()
    print(f"SKOR {name}")
    print("-" * 40)

    print(f"Örnek sayısı: {len(group)}")

    if len(group) == 0:
        print("Bu grupta veri yok.")
        continue

    print(
        f"1 gün ortalama: "
        f"{group['return_1'].mean():.2f}%"
    )

    print(
        f"3 gün ortalama: "
        f"{group['return_3'].mean():.2f}%"
    )

    print(
        f"5 gün ortalama: "
        f"{group['return_5'].mean():.2f}%"
    )

    print(
        f"1 gün pozitif oranı: "
        f"{(group['return_1'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"3 gün pozitif oranı: "
        f"{(group['return_3'] > 0).mean() * 100:.1f}%"
    )

    print(
        f"5 gün pozitif oranı: "
        f"{(group['return_5'] > 0).mean() * 100:.1f}%"
    )


# ==========================================
# SON
# ==========================================

print()
print("=" * 60)
print("YENİ MODEL TESTİ TAMAMLANDI")
print("=" * 60)
