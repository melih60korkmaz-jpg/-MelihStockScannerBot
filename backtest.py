import yfinance as yf
import pandas as pd
import numpy as np

# ============================================================
# MELİH STOCK SCANNER
# GELİŞMİŞ GİRİŞ / HEDEF / STOP BACKTEST
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
    "RIOT"
]

PERIOD = "5y"

# Sadece güçlü teknik sinyaller
MIN_SCORE = 80

# Maksimum pozisyon süresi
MAX_DAYS = 5

# Test edilecek farklı sistemler
SYSTEMS = [
    {
        "name": "Sistem A",
        "target1": 0.03,
        "target2": 0.06,
        "stop": 0.02
    },
    {
        "name": "Sistem B",
        "target1": 0.04,
        "target2": 0.07,
        "stop": 0.03
    },
    {
        "name": "Sistem C",
        "target1": 0.05,
        "target2": 0.10,
        "stop": 0.03
    },
    {
        "name": "Sistem D",
        "target1": 0.05,
        "target2": 0.08,
        "stop": 0.04
    },
    {
        "name": "Sistem E",
        "target1": 0.06,
        "target2": 0.10,
        "stop": 0.04
    }
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

    rsi = 100 - (100 / (1 + rs))

    return rsi


# ============================================================
# TEKNİK GÖSTERGELER
# ============================================================

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
    df["RSI"] = calculate_rsi(
        close,
        14
    )

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
    df["AVG_VOLUME20"] = volume.rolling(
        20
    ).mean()

    df["VOLUME_RATIO"] = (
        volume / df["AVG_VOLUME20"]
    )

    return df.dropna()


# ============================================================
# SKOR
# ============================================================

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

    # --------------------------------------------------------
    # EMA %40
    # --------------------------------------------------------

    if (
        close > ema9
        and ema9 > ema20
        and ema20 > ema50
    ):
        ema_score = 100

    elif (
        close > ema20
        and ema20 > ema50
    ):
        ema_score = 75

    elif close > ema20:
        ema_score = 50

    elif close > ema50:
        ema_score = 25

    else:
        ema_score = 0

    # --------------------------------------------------------
    # MACD %30
    # --------------------------------------------------------

    if (
        macd > macd_signal
        and macd > 0
    ):
        macd_score = 100

    elif macd > macd_signal:
        macd_score = 70

    elif macd > 0:
        macd_score = 40

    else:
        macd_score = 0

    # --------------------------------------------------------
    # HACİM %20
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # RSI %10
    # --------------------------------------------------------

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


# ============================================================
# TEK İŞLEM TESTİ
# ============================================================

def test_trade(
    df,
    signal_index,
    target1,
    target2,
    stop
):

    # --------------------------------------------------------
    # Sinyal kapanışından sonra giriş:
    # Ertesi işlem gününün OPEN fiyatı
    # --------------------------------------------------------

    entry_index = signal_index + 1

    if entry_index >= len(df):
        return None

    entry_row = df.iloc[entry_index]

    entry_price = float(
        entry_row["Open"]
    )

    target1_price = (
        entry_price
        * (1 + target1)
    )

    target2_price = (
        entry_price
        * (1 + target2)
    )

    stop_price = (
        entry_price
        * (1 - stop)
    )

    # --------------------------------------------------------
    # Maksimum 5 işlem günü
    # --------------------------------------------------------

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

        hit_target1 = (
            high >= target1_price
        )

        hit_target2 = (
            high >= target2_price
        )

        hit_stop = (
            low <= stop_price
        )

        # ----------------------------------------------------
        # Aynı gün hem hedef hem stop:
        # Gün içindeki sırayı bilemediğimiz için
        # temkinli olarak STOP kabul ediyoruz.
        # ----------------------------------------------------

        if hit_stop and (
            hit_target1
            or hit_target2
        ):

            return {
                "result": "STOP",
                "return": -stop,
                "days": i - entry_index + 1
            }

        # ----------------------------------------------------
        # Target 2
        # ----------------------------------------------------

        if hit_target2:

            return {
                "result": "TARGET_2",
                "return": target2,
                "days": i - entry_index + 1
            }

        # ----------------------------------------------------
        # Target 1
        # ----------------------------------------------------

        if hit_target1:

            return {
                "result": "TARGET_1",
                "return": target1,
                "days": i - entry_index + 1
            }

        # ----------------------------------------------------
        # Stop
        # ----------------------------------------------------

        if hit_stop:

            return {
                "result": "STOP",
                "return": -stop,
                "days": i - entry_index + 1
            }

    # --------------------------------------------------------
    # 5 gün içinde hedef veya stop olmadı.
    # Son kapanıştan çıkıyoruz.
    # --------------------------------------------------------

    final_price = float(
        df.iloc[end_index]["Close"]
    )

    final_return = (
        (final_price - entry_price)
        / entry_price
    )

    return {
        "result": "TIMEOUT",
        "return": final_return,
        "days": end_index - entry_index + 1
    }


# ============================================================
# HİSSE VERİSİNİ AL
# ============================================================

def download_stock(ticker):

    try:

        print(
            f"{ticker} verisi indiriliyor..."
        )

        df = yf.download(
            ticker,
            period=PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False
        )

        if df.empty:
            print(
                f"{ticker}: veri yok."
            )
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

        if df.empty:
            return None

        return df

    except Exception as e:

        print(
            f"{ticker} HATA: {e}"
        )

        return None


# ============================================================
# TÜM SİNYALLERİ ÇIKAR
# ============================================================

def find_signals(df):

    signals = []

    # Son günlerde ileri veri olmadığı için
    # son MAX_DAYS günü kullanmıyoruz.
    last_signal = (
        len(df)
        - MAX_DAYS
        - 1
    )

    for i in range(
        0,
        last_signal + 1
    ):

        row = df.iloc[i]

        score = calculate_score(
            row
        )

        if score >= MIN_SCORE:

            signals.append({
                "index": i,
                "date": df.index[i],
                "score": score
            })

    return signals


# ============================================================
# BİR SİSTEMİ TEST ET
# ============================================================

def test_system(
    all_stock_data,
    system
):

    trades = []

    for ticker, df in all_stock_data.items():

        signals = find_signals(df)

        for signal in signals:

            trade = test_trade(
                df,
                signal["index"],
                system["target1"],
                system["target2"],
                system["stop"]
            )

            if trade is None:
                continue

            trade["ticker"] = ticker
            trade["score"] = signal["score"]
            trade["date"] = signal["date"]

            trades.append(trade)

    return trades


# ============================================================
# SONUÇLARI HESAPLA
# ============================================================

def summarize(
    trades,
    system
):

    if not trades:
        return None

    total = len(trades)

    target1 = sum(
        1
        for x in trades
        if x["result"] == "TARGET_1"
    )

    target2 = sum(
        1
        for x in trades
        if x["result"] == "TARGET_2"
    )

    stop = sum(
        1
        for x in trades
        if x["result"] == "STOP"
    )

    timeout = sum(
        1
        for x in trades
        if x["result"] == "TIMEOUT"
    )

    # --------------------------------------------------------
    # Ortalama işlem getirisi
    # --------------------------------------------------------

    avg_return = np.mean([
        x["return"]
        for x in trades
    ])

    # --------------------------------------------------------
    # Basit toplam getiri
    # --------------------------------------------------------

    total_return = sum(
        x["return"]
        for x in trades
    )

    # --------------------------------------------------------
    # Bileşik getiri
    # Her işlemde sermayenin tamamı kullanılıyor varsayımı.
    # --------------------------------------------------------

    equity = 1.0

    for trade in trades:

        equity *= (
            1 + trade["return"]
        )

    compound_return = (
        equity - 1
    )

    # --------------------------------------------------------
    # Pozitif işlem oranı
    # --------------------------------------------------------

    positive = sum(
        1
        for x in trades
        if x["return"] > 0
    )

    positive_rate = (
        positive / total
    )

    # --------------------------------------------------------
    # Maksimum düşüş
    # --------------------------------------------------------

    equity_curve = 1.0
    peak = 1.0
    max_drawdown = 0.0

    for trade in trades:

        equity_curve *= (
            1 + trade["return"]
        )

        if equity_curve > peak:
            peak = equity_curve

        drawdown = (
            equity_curve - peak
        ) / peak

        if drawdown < max_drawdown:
            max_drawdown = drawdown

    return {
        "name": system["name"],
        "target1": system["target1"],
        "target2": system["target2"],
        "stop": system["stop"],
        "total": total,
        "target1_count": target1,
        "target2_count": target2,
        "stop_count": stop,
        "timeout_count": timeout,
        "positive_rate": positive_rate,
        "avg_return": avg_return,
        "total_return": total_return,
        "compound_return": compound_return,
        "max_drawdown": max_drawdown
    }


# ============================================================
# ANA PROGRAM
# ============================================================

def main():

    print()
    print("=" * 70)
    print("🔥 MELİH STOCK SCANNER")
    print("GELİŞMİŞ HEDEF / STOP KARŞILAŞTIRMASI")
    print("=" * 70)

    print()
    print(
        f"📊 Hisseler       : {len(STOCKS)}"
    )

    print(
        f"📅 Veri           : {PERIOD}"
    )

    print(
        f"🧠 Minimum skor   : {MIN_SCORE}+"
    )

    print(
        f"⏱️ Takip süresi   : {MAX_DAYS} işlem günü"
    )

    print()
    print(
        "⚠️ Giriş fiyatı sinyalden sonraki "
        "işlem gününün açılışıdır."
    )

    # --------------------------------------------------------
    # Verileri sadece bir kez indir
    # --------------------------------------------------------

    all_stock_data = {}

    for ticker in STOCKS:

        df = download_stock(
            ticker
        )

        if df is not None:

            all_stock_data[ticker] = df

    print()
    print("=" * 70)
    print("📊 VERİ HAZIR")
    print("=" * 70)

    print(
        f"Başarılı hisseler: "
        f"{len(all_stock_data)} / {len(STOCKS)}"
    )

    # --------------------------------------------------------
    # Bütün sistemleri test et
    # --------------------------------------------------------

    results = []

    for system in SYSTEMS:

        print()
        print(
            f"🔬 {system['name']} test ediliyor..."
        )

        trades = test_system(
            all_stock_data,
            system
        )

        summary = summarize(
            trades,
            system
        )

        if summary:

            results.append(
                summary
            )

    # --------------------------------------------------------
    # Sonuç tablosu
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("🔥 TÜM SİSTEMLERİN KARŞILAŞTIRMASI")
    print("=" * 70)

    print()

    for result in results:

        print(
            f"📌 {result['name']}"
        )

        print(
            f"   H1: +%{result['target1'] * 100:.0f}"
            f" | H2: +%{result['target2'] * 100:.0f}"
            f" | Stop: -%{result['stop'] * 100:.0f}"
        )

        print(
            f"   İşlem: {result['total']}"
        )

        print(
            f"   H1: {result['target1_count']}"
        )

        print(
            f"   H2: {result['target2_count']}"
        )

        print(
            f"   Stop: {result['stop_count']}"
        )

        print(
            f"   Timeout: {result['timeout_count']}"
        )

        print(
            f"   Pozitif işlem: "
            f"%{result['positive_rate'] * 100:.1f}"
        )

        print(
            f"   Ortalama işlem: "
            f"%{result['avg_return'] * 100:.3f}"
        )

        print(
            f"   Basit toplam: "
            f"%{result['total_return'] * 100:.1f}"
        )

        print(
            f"   Bileşik sonuç: "
            f"%{result['compound_return'] * 100:.1f}"
        )

        print(
            f"   Maks. düşüş: "
            f"%{result['max_drawdown'] * 100:.1f}"
        )

        print(
            "   " + "-" * 55
        )

    # --------------------------------------------------------
    # En yüksek ortalama işlem getirisi
    # --------------------------------------------------------

    if results:

        best = max(
            results,
            key=lambda x: x["avg_return"]
        )

        print()
        print("=" * 70)
        print("🏁 İSTATİSTİKSEL SONUÇ")
        print("=" * 70)

        print()

        print(
            "En yüksek ortalama işlem "
            "getirisine sahip sistem:"
        )

        print()

        print(
            f"👉 {best['name']}"
        )

        print(
            f"Hedef 1: "
            f"+%{best['target1'] * 100:.0f}"
        )

        print(
            f"Hedef 2: "
            f"+%{best['target2'] * 100:.0f}"
        )

        print(
            f"Zarar-kes: "
            f"-%{best['stop'] * 100:.0f}"
        )

        print()

        print(
            f"Ortalama işlem: "
            f"%{best['avg_return'] * 100:.3f}"
        )

        print(
            f"Pozitif işlem oranı: "
            f"%{best['positive_rate'] * 100:.1f}"
        )

        print(
            f"Maksimum düşüş: "
            f"%{best['max_drawdown'] * 100:.1f}"
        )

    # --------------------------------------------------------
    # Hisse bazlı sonuç
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("📈 HİSSE BAZLI ANALİZ")
    print("=" * 70)

    if results:

        best_system = max(
            results,
            key=lambda x: x["avg_return"]
        )

        trades = test_system(
            all_stock_data,
            {
                "name": "Final",
                "target1": best_system["target1"],
                "target2": best_system["target2"],
                "stop": best_system["stop"]
            }
        )

        for ticker in STOCKS:

            ticker_trades = [
                x
                for x in trades
                if x["ticker"] == ticker
            ]

            if not ticker_trades:
                continue

            avg = np.mean([
                x["return"]
                for x in ticker_trades
            ])

            positive = sum(
                1
                for x in ticker_trades
                if x["return"] > 0
            )

            print(
                f"{ticker:<6} "
                f"İşlem: {len(ticker_trades):<4} "
                f"Pozitif: "
                f"%{positive / len(ticker_trades) * 100:>5.1f} "
                f"Ort: "
                f"%{avg * 100:>7.3f}"
            )

    print()
    print("=" * 70)
    print("⚠️ ÖNEMLİ")
    print("=" * 70)

    print(
        "Bu sonuçlar geçmiş verilere dayanır."
    )

    print(
        "Komisyon, spread ve kayma "
        "(slippage) hesaba katılmamıştır."
    )

    print(
        "Geçmiş performans gelecekteki "
        "sonuçları garanti etmez."
    )

    print("=" * 70)


if __name__ == "__main__":
    main()
