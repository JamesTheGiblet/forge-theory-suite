#!/usr/bin/env python3
"""
UBVM Extension: trading/primitives.py
Domain-specific primitives for the LEGION trading OS.

Registered primitives:
    fetch_ohlcv  — fetch candlestick data from Binance public API
    split_data   — split OHLCV CSV into train/test sets

All primitives follow the standard UBVM signature:
    def primitive_name(params: dict, context: dict) -> dict
"""

import os
import datetime


# ─────────────────────────────────────────────────────────────
# fetch_ohlcv
# ─────────────────────────────────────────────────────────────

def primitive_fetch_ohlcv(params: dict, context: dict) -> dict:
    """
    Fetch OHLCV candlestick data from Binance public API.
    No API key required — public endpoint only.

    Params:
        symbol      (str)  — trading pair. Default: "BTCUSDT"
        interval    (str)  — candle interval. Default: "1h"
                             Valid: 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M
        limit       (int)  — number of candles. Default: 500, max: 1000
        output_path (str)  — write path. Default: data/<symbol>_<interval>.csv
        append      (bool) — append to existing file. Default: False

    Returns:
        status, symbol, interval, candles_fetched, output_path
    """
    import urllib.request
    import urllib.parse
    import json as _json
    import csv  as _csv

    VALID_INTERVALS = {
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "6h", "8h", "12h",
        "1d", "3d", "1w", "1M"
    }

    ubvm_home = context["ubvm_home"]
    data_dir  = os.path.join(ubvm_home, "data")
    os.makedirs(data_dir, exist_ok=True)

    symbol   = params.get("symbol",   "BTCUSDT").upper()
    interval = params.get("interval", "1h")
    limit    = int(params.get("limit", 500))
    append   = bool(params.get("append", False))

    if interval not in VALID_INTERVALS:
        return {
            "status": "error",
            "error":  f"Invalid interval '{interval}'. Valid: {sorted(VALID_INTERVALS)}"
        }

    if not (1 <= limit <= 1000):
        return {"status": "error", "error": f"limit must be 1-1000, got {limit}"}

    # Resolve output path
    output_path = params.get("output_path")
    if not output_path:
        output_path = os.path.join(data_dir, f"{symbol.lower()}_{interval}.csv")
    elif not os.path.isabs(output_path):
        output_path = os.path.join(ubvm_home, output_path)

    # Binance public klines endpoint
    query = urllib.parse.urlencode({
        "symbol":   symbol,
        "interval": interval,
        "limit":    limit,
    })
    url = f"https://api.binance.com/api/v3/klines?{query}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "UBVM/0.2"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
    except Exception as e:
        return {"status": "error", "error": f"HTTP request failed: {e}"}

    try:
        klines = _json.loads(raw)
    except Exception as e:
        return {"status": "error", "error": f"Failed to parse response: {e}"}

    if not isinstance(klines, list) or len(klines) == 0:
        return {"status": "error", "error": "Empty or unexpected response from Binance"}

    # Write CSV
    try:
        mode = "a" if append and os.path.exists(output_path) else "w"
        with open(output_path, mode, newline="") as f:
            writer = _csv.writer(f)
            if mode == "w":
                writer.writerow(["timestamp", "open", "high", "low", "close", "volume"])
            for k in klines:
                ts = datetime.datetime.utcfromtimestamp(int(k[0]) / 1000).strftime(
                    "%Y-%m-%dT%H:%M:%SZ"
                )
                writer.writerow([ts, k[1], k[2], k[3], k[4], k[5]])
    except Exception as e:
        return {"status": "error", "error": f"Failed to write CSV: {e}"}

    return {
        "status":          "ok",
        "symbol":          symbol,
        "interval":        interval,
        "candles_fetched": len(klines),
        "output_path":     output_path,
        "append":          append,
    }


# ─────────────────────────────────────────────────────────────
# split_data
# ─────────────────────────────────────────────────────────────

def primitive_split_data(params: dict, context: dict) -> dict:
    """
    Read an OHLCV CSV and split into train (80%) and test (20%) sets.

    Expected CSV format (with header):
        timestamp,open,high,low,close,volume

    Params:
        input_path  (str)   — source CSV. Relative to UBVM_HOME.
        train_path  (str)   — output train set. Default: data/train.csv
        test_path   (str)   — output test set.  Default: data/test.csv
        ratio       (float) — train fraction. Default: 0.8
        has_header  (bool)  — whether CSV has header row. Default: True

    Returns:
        status, input_path, train_path, test_path,
        total_rows, train_rows, test_rows
    """
    import csv

    ubvm_home = context["ubvm_home"]
    data_dir  = os.path.join(ubvm_home, "data")
    os.makedirs(data_dir, exist_ok=True)

    def resolve(p, default):
        if not p:
            return os.path.join(data_dir, default)
        if os.path.isabs(p):
            return p
        return os.path.join(ubvm_home, p)

    input_path = resolve(params.get("input_path"), "ohlcv.csv")
    train_path = resolve(params.get("train_path"), "train.csv")
    test_path  = resolve(params.get("test_path"),  "test.csv")
    ratio      = float(params.get("ratio", 0.8))
    has_header = params.get("has_header", True)

    if not (0.0 < ratio < 1.0):
        return {"status": "error", "error": f"ratio must be between 0 and 1, got {ratio}"}

    if not os.path.exists(input_path):
        return {"status": "error", "error": f"Input file not found: {input_path}"}

    try:
        with open(input_path, "r", newline="") as f:
            rows = list(csv.reader(f))
    except Exception as e:
        return {"status": "error", "error": f"Failed to read CSV: {e}"}

    if not rows:
        return {"status": "error", "error": "Input CSV is empty"}

    header = rows[0] if has_header else None
    data   = rows[1:] if has_header else rows

    if not data:
        return {"status": "error", "error": "CSV has no data rows"}

    split_idx  = int(len(data) * ratio)
    train_rows = data[:split_idx]
    test_rows  = data[split_idx:]

    if not train_rows:
        return {"status": "error", "error": "Train set is empty after split"}
    if not test_rows:
        return {"status": "error", "error": "Test set is empty — need more data"}

    for path, rows_out in [(train_path, train_rows), (test_path, test_rows)]:
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", newline="") as f:
                writer = csv.writer(f)
                if header:
                    writer.writerow(header)
                writer.writerows(rows_out)
        except Exception as e:
            return {"status": "error", "error": f"Failed to write {path}: {e}"}

    return {
        "status":      "ok",
        "input_path":  input_path,
        "train_path":  train_path,
        "test_path":   test_path,
        "total_rows":  len(data),
        "train_rows":  len(train_rows),
        "test_rows":   len(test_rows),
        "ratio":       ratio,
    }


# ─────────────────────────────────────────────────────────────
# STRATEGY ENGINE — internal helpers
# ─────────────────────────────────────────────────────────────

def _load_ohlcv(path: str):
    """Load OHLCV CSV into list of dicts. Returns (header, rows) or raises."""
    import csv
    with open(path, "r", newline="") as f:
        reader = csv.DictReader(f)
        rows   = [r for r in reader]
    return rows


def _sma(values: list, period: int) -> list:
    """Simple moving average. Returns list of same length, None where insufficient data."""
    result = []
    for i in range(len(values)):
        if i < period - 1:
            result.append(None)
        else:
            result.append(sum(values[i - period + 1:i + 1]) / period)
    return result


def _rsi(values: list, period: int = 14) -> list:
    """Relative Strength Index. Returns list of same length, None where insufficient data."""
    result = [None] * len(values)
    if len(values) < period + 1:
        return result

    gains  = []
    losses = []
    for i in range(1, len(values)):
        diff = values[i] - values[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    for i in range(period, len(values)):
        idx    = i - period
        avg_g  = sum(gains[idx:idx + period]) / period
        avg_l  = sum(losses[idx:idx + period]) / period
        if avg_l == 0:
            result[i] = 100.0
        else:
            rs         = avg_g / avg_l
            result[i]  = 100 - (100 / (1 + rs))

    return result


def _run_strategy(rows: list, strategy: dict) -> dict:
    """
    Dispatch strategy execution based on strategy['type'].
    Returns trades list and equity curve.

    Supported types:
        crossover — SMA fast/slow crossover
        rsi       — RSI overbought/oversold

    Trade dict: {bar, signal, price, pnl}
    """
    stype = strategy.get("type", "crossover")

    closes = [float(r["close"]) for r in rows]
    trades = []
    equity = [1.0]  # start at 1.0 (normalised)
    position = 0    # 0 = flat, 1 = long

    if stype == "crossover":
        fast_p = int(strategy.get("params", {}).get("fast", 10))
        slow_p = int(strategy.get("params", {}).get("slow", 30))

        if slow_p >= len(closes):
            return {"error": f"Not enough data for slow period {slow_p} (have {len(closes)} bars)"}

        fast_ma = _sma(closes, fast_p)
        slow_ma = _sma(closes, slow_p)

        for i in range(1, len(closes)):
            if fast_ma[i] is None or slow_ma[i] is None:
                equity.append(equity[-1])
                continue
            if fast_ma[i - 1] is None or slow_ma[i - 1] is None:
                equity.append(equity[-1])
                continue

            prev_diff = fast_ma[i - 1] - slow_ma[i - 1]
            curr_diff = fast_ma[i]     - slow_ma[i]

            if prev_diff <= 0 and curr_diff > 0 and position == 0:
                # Golden cross — buy
                position   = 1
                entry_price = closes[i]
                trades.append({"bar": i, "signal": "buy", "price": closes[i], "pnl": 0.0})

            elif prev_diff >= 0 and curr_diff < 0 and position == 1:
                # Death cross — sell
                position = 0
                pnl      = (closes[i] - entry_price) / entry_price
                trades[-1]["pnl"] = 0.0
                trades.append({"bar": i, "signal": "sell", "price": closes[i], "pnl": pnl})
                equity.append(equity[-1] * (1 + pnl))
                continue

            equity.append(equity[-1])

    elif stype == "rsi":
        period      = int(strategy.get("params", {}).get("period",     14))
        oversold    = float(strategy.get("params", {}).get("oversold",  30))
        overbought  = float(strategy.get("params", {}).get("overbought", 70))

        rsi_vals = _rsi(closes, period)

        for i in range(1, len(closes)):
            if rsi_vals[i] is None:
                equity.append(equity[-1])
                continue

            if rsi_vals[i] < oversold and position == 0:
                position    = 1
                entry_price = closes[i]
                trades.append({"bar": i, "signal": "buy", "price": closes[i], "pnl": 0.0})

            elif rsi_vals[i] > overbought and position == 1:
                position = 0
                pnl      = (closes[i] - entry_price) / entry_price
                trades.append({"bar": i, "signal": "sell", "price": closes[i], "pnl": pnl})
                equity.append(equity[-1] * (1 + pnl))
                continue

            equity.append(equity[-1])

    else:
        return {"error": f"Unknown strategy type: '{stype}'"}

    return {"trades": trades, "equity": equity}


def _compute_metrics(trades: list, equity: list) -> dict:
    """
    Compute backtest metrics from trades and equity curve.
    Returns: total_return, profit_factor, sharpe_ratio, max_drawdown,
             total_trades, winning_trades, win_rate
    """
    import math

    completed = [t for t in trades if t["signal"] == "sell"]
    total_trades   = len(completed)
    winning_trades = len([t for t in completed if t["pnl"] > 0])
    win_rate       = winning_trades / total_trades if total_trades else 0.0

    gross_profit = sum(t["pnl"] for t in completed if t["pnl"] > 0)
    gross_loss   = abs(sum(t["pnl"] for t in completed if t["pnl"] < 0))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 0.0)

    total_return = (equity[-1] - 1.0) if equity else 0.0

    # Max drawdown
    peak      = equity[0]
    max_dd    = 0.0
    for e in equity:
        if e > peak:
            peak = e
        dd = (peak - e) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd

    # Sharpe ratio (annualised, assuming hourly bars, rf=0)
    if len(equity) > 1:
        returns = [(equity[i] - equity[i-1]) / equity[i-1]
                   for i in range(1, len(equity)) if equity[i-1] != 0]
        if returns:
            mean_r  = sum(returns) / len(returns)
            std_r   = math.sqrt(sum((r - mean_r) ** 2 for r in returns) / len(returns))
            sharpe  = (mean_r / std_r * math.sqrt(8760)) if std_r > 0 else 0.0
        else:
            sharpe = 0.0
    else:
        sharpe = 0.0

    return {
        "total_return":   round(total_return,   4),
        "profit_factor":  round(profit_factor,  4),
        "sharpe_ratio":   round(sharpe,          4),
        "max_drawdown":   round(max_dd,          4),
        "total_trades":   total_trades,
        "winning_trades": winning_trades,
        "win_rate":       round(win_rate,        4),
    }


# ─────────────────────────────────────────────────────────────
# backtest
# ─────────────────────────────────────────────────────────────

def primitive_backtest(params: dict, context: dict) -> dict:
    """
    Run a strategy against in-sample (train) data.

    Params:
        data_path  (str)  — path to CSV. Default: data/train.csv
        strategy   (dict) — strategy JSON. Default: SMA crossover 10/30
                            Format: {"type": "crossover", "params": {"fast": 10, "slow": 30}}
                            Types:  crossover | rsi
        output_path (str) — where to save results JSON. Default: results/backtest_<name>.json

    Returns:
        status, strategy_name, metrics dict, trades_count, output_path
    """
    import json as _json

    ubvm_home = context["ubvm_home"]
    data_dir  = os.path.join(ubvm_home, "data")
    res_dir   = os.path.join(ubvm_home, "results")
    os.makedirs(res_dir, exist_ok=True)

    # Resolve data path
    data_path = params.get("data_path")
    if not data_path:
        data_path = os.path.join(data_dir, "train.csv")
    elif not os.path.isabs(data_path):
        data_path = os.path.join(ubvm_home, data_path)

    if not os.path.exists(data_path):
        return {"status": "error", "error": f"Data file not found: {data_path}"}

    # Strategy
    strategy = params.get("strategy", {
        "name": "sma_crossover_10_30",
        "type": "crossover",
        "params": {"fast": 10, "slow": 30}
    })
    strategy_name = strategy.get("name", f"{strategy.get('type','unknown')}_{context['timestamp'][:10]}")

    # Load data
    try:
        rows = _load_ohlcv(data_path)
    except Exception as e:
        return {"status": "error", "error": f"Failed to load data: {e}"}

    if len(rows) < 2:
        return {"status": "error", "error": f"Insufficient data: {len(rows)} rows"}

    # Run strategy
    run_result = _run_strategy(rows, strategy)
    if "error" in run_result:
        return {"status": "error", "error": run_result["error"]}

    # Compute metrics
    metrics = _compute_metrics(run_result["trades"], run_result["equity"])

    # Save results
    output_path = params.get("output_path")
    if not output_path:
        safe_name   = strategy_name.replace("/", "_").replace(" ", "_")
        output_path = os.path.join(res_dir, f"backtest_{safe_name}.json")
    elif not os.path.isabs(output_path):
        output_path = os.path.join(ubvm_home, output_path)

    result_doc = {
        "strategy_name": strategy_name,
        "strategy":      strategy,
        "data_path":     data_path,
        "metrics":       metrics,
        "bars":          len(rows),
        "ts":            context["timestamp"],
    }

    try:
        with open(output_path, "w") as f:
            _json.dump(result_doc, f, indent=2)
    except Exception as e:
        return {"status": "error", "error": f"Failed to save results: {e}"}

    return {
        "status":        "ok",
        "strategy_name": strategy_name,
        "metrics":       metrics,
        "bars":          len(rows),
        "output_path":   output_path,
    }


# ─────────────────────────────────────────────────────────────
# forward_validate
# ─────────────────────────────────────────────────────────────

def primitive_forward_validate(params: dict, context: dict) -> dict:
    """
    Run a strategy against out-of-sample (test) data and compute fitness score.

    Params:
        data_path       (str)   — path to test CSV. Default: data/test.csv
        strategy        (dict)  — strategy JSON (same format as backtest)
        backtest_metrics (dict) — metrics from the backtest run (for fitness calc)
        output_path     (str)   — where to save validation JSON

    Fitness score (0–1):
        0.6 * backtest_score + 0.4 * validation_score
        where score = clamp((sharpe + profit_factor + win_rate) / 3, 0, 1)

    Returns:
        status, strategy_name, validation_metrics, fitness_score, output_path
    """
    import json as _json

    ubvm_home = context["ubvm_home"]
    data_dir  = os.path.join(ubvm_home, "data")
    res_dir   = os.path.join(ubvm_home, "results")
    os.makedirs(res_dir, exist_ok=True)

    # Resolve test data path
    data_path = params.get("data_path")
    if not data_path:
        data_path = os.path.join(data_dir, "test.csv")
    elif not os.path.isabs(data_path):
        data_path = os.path.join(ubvm_home, data_path)

    if not os.path.exists(data_path):
        return {"status": "error", "error": f"Test data not found: {data_path}"}

    strategy = params.get("strategy", {
        "name": "sma_crossover_10_30",
        "type": "crossover",
        "params": {"fast": 10, "slow": 30}
    })
    strategy_name    = strategy.get("name", "unknown")
    backtest_metrics = params.get("backtest_metrics", {})

    # Load and run
    try:
        rows = _load_ohlcv(data_path)
    except Exception as e:
        return {"status": "error", "error": f"Failed to load test data: {e}"}

    if len(rows) < 2:
        return {"status": "error", "error": f"Insufficient test data: {len(rows)} rows"}

    run_result = _run_strategy(rows, strategy)
    if "error" in run_result:
        return {"status": "error", "error": run_result["error"]}

    val_metrics = _compute_metrics(run_result["trades"], run_result["equity"])

    # Fitness score — normalise each metric to 0–1 range then blend
    def _score(metrics: dict) -> float:
        sharpe = min(max(metrics.get("sharpe_ratio", 0) / 3.0, 0), 1)
        pf     = min(max((metrics.get("profit_factor", 0) - 1) / 2.0, 0), 1)
        wr     = min(max(metrics.get("win_rate", 0), 0), 1)
        return round((sharpe + pf + wr) / 3.0, 4)

    bt_score  = _score(backtest_metrics) if backtest_metrics else _score(val_metrics)
    val_score = _score(val_metrics)
    fitness   = round(0.6 * bt_score + 0.4 * val_score, 4)

    # Save
    output_path = params.get("output_path")
    if not output_path:
        safe_name   = strategy_name.replace("/","_").replace(" ","_")
        output_path = os.path.join(res_dir, f"validation_{safe_name}.json")
    elif not os.path.isabs(output_path):
        output_path = os.path.join(ubvm_home, output_path)

    result_doc = {
        "strategy_name":      strategy_name,
        "strategy":           strategy,
        "data_path":          data_path,
        "validation_metrics": val_metrics,
        "backtest_metrics":   backtest_metrics,
        "bt_score":           bt_score,
        "val_score":          val_score,
        "fitness_score":      fitness,
        "ts":                 context["timestamp"],
    }

    try:
        with open(output_path, "w") as f:
            _json.dump(result_doc, f, indent=2)
    except Exception as e:
        return {"status": "error", "error": f"Failed to save validation: {e}"}

    return {
        "status":             "ok",
        "strategy_name":      strategy_name,
        "validation_metrics": val_metrics,
        "fitness_score":      fitness,
        "output_path":        output_path,
    }


# ─────────────────────────────────────────────────────────────
# select_best_strategy
# ─────────────────────────────────────────────────────────────

def primitive_select_best_strategy(params: dict, context: dict) -> dict:
    """
    Scan results/validation_*.json files, select the strategy with the
    highest fitness score, and write it to strategies/selected/current_best.json.

    Params:
        results_dir   (str) — directory to scan. Default: results/
        output_path   (str) — where to write best strategy. Default: strategies/selected/current_best.json
        min_fitness   (float) — minimum fitness to qualify. Default: 0.0
        min_trades    (int)   — minimum trades to qualify. Default: 1

    Returns:
        status, best_strategy_name, fitness_score, output_path, candidates_evaluated
    """
    import json as _json
    import glob

    ubvm_home   = context["ubvm_home"]
    results_dir = params.get("results_dir")
    if not results_dir:
        results_dir = os.path.join(ubvm_home, "results")
    elif not os.path.isabs(results_dir):
        results_dir = os.path.join(ubvm_home, results_dir)

    output_path = params.get("output_path")
    if not output_path:
        output_path = os.path.join(ubvm_home, "strategies", "selected", "current_best.json")
    elif not os.path.isabs(output_path):
        output_path = os.path.join(ubvm_home, output_path)

    min_fitness = float(params.get("min_fitness", 0.0))
    min_trades  = int(params.get("min_trades", 1))

    # Scan validation files
    pattern = os.path.join(results_dir, "validation_*.json")
    files   = sorted(glob.glob(pattern))

    if not files:
        return {
            "status": "error",
            "error":  f"No validation files found in {results_dir}"
        }

    candidates = []
    for fpath in files:
        try:
            with open(fpath) as f:
                data = _json.load(f)
            fitness = data.get("fitness_score", 0.0)
            trades  = data.get("validation_metrics", {}).get("total_trades", 0)
            if fitness >= min_fitness and trades >= min_trades:
                candidates.append({
                    "strategy_name": data.get("strategy_name", "unknown"),
                    "strategy":      data.get("strategy", {}),
                    "fitness_score": fitness,
                    "metrics":       data.get("validation_metrics", {}),
                    "file":          fpath,
                })
        except Exception as e:
            # Skip unreadable files
            continue

    if not candidates:
        return {
            "status": "error",
            "error":  f"No qualifying strategies found (min_fitness={min_fitness}, min_trades={min_trades})"
        }

    # Pick best by fitness score
    best = max(candidates, key=lambda c: c["fitness_score"])

    # Write current_best.json
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    best_doc = {
        "strategy_name": best["strategy_name"],
        "strategy":      best["strategy"],
        "fitness_score": best["fitness_score"],
        "metrics":       best["metrics"],
        "selected_at":   context["timestamp"],
        "source_file":   best["file"],
    }

    try:
        with open(output_path, "w") as f:
            _json.dump(best_doc, f, indent=2)
    except Exception as e:
        return {"status": "error", "error": f"Failed to write best strategy: {e}"}

    return {
        "status":               "ok",
        "best_strategy_name":   best["strategy_name"],
        "fitness_score":        best["fitness_score"],
        "output_path":          output_path,
        "candidates_evaluated": len(candidates),
    }


# ─────────────────────────────────────────────────────────────
# mutate_strategy
# ─────────────────────────────────────────────────────────────

def primitive_mutate_strategy(params: dict, context: dict) -> dict:
    """
    Generate mutated offspring from a parent strategy.
    Tries LLM-guided mutation via Gemini first; falls back to random ±10%.
    Tries LLM-guided mutation via Ollama first; falls back to random ±10%.

    Params:
        strategy      (dict) — parent strategy JSON. Default: reads current_best.json
        n_offspring   (int)  — number of offspring to generate. Default: 3
        magnitude     (float)— mutation magnitude 0–1. Default: 0.1 (±10%)
        gemini_key    (str)  — Gemini API key. Uses GEMINI_API_KEY env var if not set.
        ollama_url    (str)  — Ollama API URL. Uses OLLAMA_HOST env var if not set. Default: http://178.105.96.89:11434
        ollama_model  (str)  — Ollama model to use. Uses OLLAMA_MODEL env var if not set. Default: gemma2:2b
        output_dir    (str)  — where to write offspring. Default: strategies/mutated/

    Returns:
        status, parent_name, offspring list, output_paths
    """
    import json as _json
    import random
    import math

    ubvm_home  = context["ubvm_home"]
    output_dir = params.get("output_dir")
    if not output_dir:
        output_dir = os.path.join(ubvm_home, "strategies", "mutated")
    elif not os.path.isabs(output_dir):
        output_dir = os.path.join(ubvm_home, output_dir)
    os.makedirs(output_dir, exist_ok=True)

    # Load parent strategy
    strategy = params.get("strategy")
    if not strategy:
        best_path = os.path.join(ubvm_home, "strategies", "selected", "current_best.json")
        if not os.path.exists(best_path):
            return {"status": "error", "error": "No strategy provided and current_best.json not found"}
        try:
            with open(best_path) as f:
                best_doc = _json.load(f)
            strategy = best_doc.get("strategy", {})
        except Exception as e:
            return {"status": "error", "error": f"Failed to load current_best.json: {e}"}

    n_offspring = int(params.get("n_offspring", 3))
    magnitude   = float(params.get("magnitude", 0.1))
    parent_name = strategy.get("name", "unknown")

    def _random_mutate(strategy: dict, idx: int) -> dict:
        """Apply random ±magnitude mutation to each numeric parameter."""
        import copy
        child = copy.deepcopy(strategy)
        child_params = child.get("params", {})
        for key, val in child_params.items():
            if isinstance(val, (int, float)):
                delta = val * magnitude * random.choice([-1, 1]) * random.uniform(0.5, 1.5)
                new_val = val + delta
                # Keep integers as integers, enforce positive values
                if isinstance(val, int):
                    new_val = max(1, int(round(new_val)))
                else:
                    new_val = max(0.01, round(new_val, 4))
                child_params[key] = new_val
        # Enforce fast < slow for crossover strategies
        if child.get("type") == "crossover":
            fast = child_params.get("fast", 5)
            slow = child_params.get("slow", 20)
            if fast >= slow:
                child_params["slow"] = fast + max(5, int(fast * 0.5))
        child["name"]   = f"{parent_name}_mut{idx}"
        child["params"] = child_params
        return child

    def _llm_mutate(strategy: dict, n: int, api_key: str) -> list:
        """Call Gemini to generate n mutated offspring."""
    def _llm_mutate(strategy: dict, n: int, url_base: str, model_name: str) -> list:
        """Call Ollama to generate n mutated offspring."""
        import urllib.request
        import urllib.parse
        import json as _j

        prompt = (
            f"You are a quantitative trading strategy optimizer. "
            f"Given this strategy: {_j.dumps(strategy)}, "
            f"generate {n} improved variations. "
            f"Each variation should adjust parameters by ±{int(magnitude*100)}% "
            f"to explore better configurations. "
            f"Return ONLY a JSON array of strategy objects with the same structure. "
            f"No explanation. Valid JSON only."
        )

        url  = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
        body = _j.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
        url  = f"{url_base.rstrip('/')}/api/generate"
        body = _j.dumps({
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }).encode("utf-8")
        req  = urllib.request.Request(url, data=body,
                                      headers={"Content-Type": "application/json"})
        try:
            # Increased timeout for self-hosted LLMs which can be slower
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw  = resp.read().decode()
                data = _j.loads(raw)
                text = data.get("response", "")
                # Strip markdown fences if present
                if "```" in text:
                    parts = text.split("```")
                    if len(parts) >= 3:
                        text = parts[1]
                        if text.lower().startswith("json"):
                            text = text[4:]
                text = text.strip()
                offspring = _j.loads(text)
                if isinstance(offspring, list):
                    for i, child in enumerate(offspring):
                        if "name" not in child:
                            child["name"] = f"{parent_name}_llm{i}"
                    return offspring[:n]
        except Exception:
            pass
        return []

    # Try LLM first
    offspring = []
    api_key   = params.get("gemini_key") or os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        offspring = _llm_mutate(strategy, n_offspring, api_key)
    ollama_url   = params.get("ollama_url") or os.environ.get("OLLAMA_HOST", "http://178.105.96.89:11434")
    ollama_model = params.get("ollama_model") or os.environ.get("OLLAMA_MODEL", "gemma2:2b")
    
    if ollama_url:
        offspring = _llm_mutate(strategy, n_offspring, ollama_url, ollama_model)

    # Fill remaining with random mutation
    while len(offspring) < n_offspring:
        idx   = len(offspring)
        child = _random_mutate(strategy, idx)
        offspring.append(child)

    # Write offspring to disk
    output_paths = []
    ts           = context["timestamp"].replace(":", "-").replace("Z", "")
    for i, child in enumerate(offspring):
        safe_name = child.get("name", f"offspring_{i}").replace("/", "_").replace(" ", "_")
        out_path  = os.path.join(output_dir, f"{safe_name}_{ts}.json")
        try:
            with open(out_path, "w") as f:
                _json.dump(child, f, indent=2)
            output_paths.append(out_path)
        except Exception as e:
            return {"status": "error", "error": f"Failed to write offspring {i}: {e}"}

    return {
        "status":       "ok",
        "parent_name":  parent_name,
        "n_offspring":  len(offspring),
        "offspring":    offspring,
        "output_paths": output_paths,
        "method":       "llm" if api_key and len(offspring) > 0 else ("random (llm failed)" if api_key else "random"),
        "method":       "llm" if ollama_url and len(offspring) > 0 else ("random (llm failed)" if ollama_url else "random"),
    }


# ─────────────────────────────────────────────────────────────
# dry_run
# ─────────────────────────────────────────────────────────────

def primitive_dry_run(params: dict, context: dict) -> dict:
    """
    Run the current best strategy against live market data (paper trading).
    Generates buy/sell signals and logs them — no real orders placed.

    Params:
        symbol      (str)  — trading pair. Default: BTCUSDT
        interval    (str)  — candle interval. Default: 1h
        limit       (int)  — candles to fetch. Default: 100
        strategy    (dict) — strategy to run. Default: reads current_best.json
        signals_log (str)  — path to append signals CSV. Default: logs/dry_run_signals.csv

    Returns:
        status, symbol, strategy_name, signals_count, last_signal, signals_log
    """
    import csv
    import json as _json

    ubvm_home = context["ubvm_home"]

    # Load strategy
    strategy = params.get("strategy")
    if not strategy:
        best_path = os.path.join(ubvm_home, "strategies", "selected", "current_best.json")
        if not os.path.exists(best_path):
            return {"status": "error", "error": "No strategy provided and current_best.json not found"}
        try:
            with open(best_path) as f:
                best_doc = _json.load(f)
            strategy = best_doc.get("strategy", {})
        except Exception as e:
            return {"status": "error", "error": f"Failed to load current_best.json: {e}"}

    strategy_name = strategy.get("name", "unknown")
    symbol        = params.get("symbol", "BTCUSDT").upper()
    interval      = params.get("interval", "1h")
    limit         = int(params.get("limit", 100))

    # Fetch live candles
    fetch_result = primitive_fetch_ohlcv(
        {"symbol": symbol, "interval": interval, "limit": limit,
         "output_path": f"data/dryrun_{symbol.lower()}_{interval}.csv"},
        context
    )
    if fetch_result["status"] != "ok":
        return {"status": "error", "error": f"Failed to fetch live data: {fetch_result.get('error')}"}

    # Load fetched data
    try:
        rows = _load_ohlcv(fetch_result["output_path"])
    except Exception as e:
        return {"status": "error", "error": f"Failed to load live data: {e}"}

    if len(rows) < 2:
        return {"status": "error", "error": "Insufficient live data for dry run"}

    # Run strategy
    run_result = _run_strategy(rows, strategy)
    if "error" in run_result:
        return {"status": "error", "error": run_result["error"]}

    trades = run_result["trades"]

    # Resolve signals log path
    signals_log = params.get("signals_log")
    if not signals_log:
        signals_log = os.path.join(ubvm_home, "logs", "dry_run_signals.csv")
    elif not os.path.isabs(signals_log):
        signals_log = os.path.join(ubvm_home, signals_log)

    os.makedirs(os.path.dirname(signals_log), exist_ok=True)

    # Write header if new file
    write_header = not os.path.exists(signals_log)
    last_signal  = None

    try:
        with open(signals_log, "a", newline="") as f:
            writer = csv.writer(f)
            if write_header:
                writer.writerow(["ts", "strategy", "symbol", "interval",
                                  "signal", "price", "bar"])
            for trade in trades:
                row = [
                    context["timestamp"],
                    strategy_name,
                    symbol,
                    interval,
                    trade["signal"],
                    trade["price"],
                    trade["bar"],
                ]
                writer.writerow(row)
                last_signal = trade["signal"]
    except Exception as e:
        return {"status": "error", "error": f"Failed to write signals log: {e}"}

    return {
        "status":        "ok",
        "symbol":        symbol,
        "strategy_name": strategy_name,
        "signals_count": len(trades),
        "last_signal":   last_signal,
        "signals_log":   signals_log,
        "bars_analysed": len(rows),
    }


# ─────────────────────────────────────────────────────────────
# audit_event
# ─────────────────────────────────────────────────────────────

def primitive_audit_event(params: dict, context: dict) -> dict:
    """
    Append a structured audit entry to logs/audit.csv.

    Params:
        event_type  (str)  — type of event being audited
        data        (dict) — arbitrary data to record
        audit_log   (str)  — path to audit log. Default: logs/audit.csv

    Returns:
        status, audit_log, entry
    """
    import csv
    import json as _json

    ubvm_home  = context["ubvm_home"]
    event_type = params.get("event_type", "unknown")
    data       = params.get("data", {})

    audit_log = params.get("audit_log")
    if not audit_log:
        audit_log = os.path.join(ubvm_home, "logs", "audit.csv")
    elif not os.path.isabs(audit_log):
        audit_log = os.path.join(ubvm_home, audit_log)

    os.makedirs(os.path.dirname(audit_log), exist_ok=True)

    write_header = not os.path.exists(audit_log)
    entry = {
        "ts":         context["timestamp"],
        "scp_id":     context["scp_id"],
        "event_type": event_type,
        "data":       _json.dumps(data),
    }

    try:
        with open(audit_log, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["ts", "scp_id", "event_type", "data"])
            if write_header:
                writer.writeheader()
            writer.writerow(entry)
    except Exception as e:
        return {"status": "error", "error": f"Failed to write audit log: {e}"}

    return {"status": "ok", "audit_log": audit_log, "entry": entry}


# ─────────────────────────────────────────────────────────────
# anchor_strategy
# ─────────────────────────────────────────────────────────────

def primitive_anchor_strategy(params: dict, context: dict) -> dict:
    """
    Copy the current best strategy to anchors/ as an immutable snapshot.

    Params:
        strategy    (dict) — strategy to anchor. Default: reads current_best.json
        anchors_dir (str)  — where to write. Default: anchors/

    Returns:
        status, anchor_path, strategy_name, fitness_score
    """
    import json as _json
    import shutil

    ubvm_home   = context["ubvm_home"]
    anchors_dir = params.get("anchors_dir")
    if not anchors_dir:
        anchors_dir = os.path.join(ubvm_home, "anchors")
    elif not os.path.isabs(anchors_dir):
        anchors_dir = os.path.join(ubvm_home, anchors_dir)
    os.makedirs(anchors_dir, exist_ok=True)

    # Load current best
    best_path = os.path.join(ubvm_home, "strategies", "selected", "current_best.json")
    if not os.path.exists(best_path):
        return {"status": "error", "error": "current_best.json not found — nothing to anchor"}

    try:
        with open(best_path) as f:
            best_doc = _json.load(f)
    except Exception as e:
        return {"status": "error", "error": f"Failed to load current_best.json: {e}"}

    strategy_name = best_doc.get("strategy_name", "unknown")
    fitness_score = best_doc.get("fitness_score", 0.0)

    # Write timestamped snapshot
    ts_safe     = context["timestamp"].replace(":", "-").replace("Z", "")
    safe_name   = strategy_name.replace("/", "_").replace(" ", "_")
    anchor_path = os.path.join(anchors_dir, f"{safe_name}_{ts_safe}.json")

    snapshot = {
        **best_doc,
        "anchored_at": context["timestamp"],
        "anchor_note": params.get("note", ""),
    }

    try:
        with open(anchor_path, "w") as f:
            _json.dump(snapshot, f, indent=2)
    except Exception as e:
        return {"status": "error", "error": f"Failed to write anchor: {e}"}

    return {
        "status":        "ok",
        "anchor_path":   anchor_path,
        "strategy_name": strategy_name,
        "fitness_score": fitness_score,
    }


# ─────────────────────────────────────────────────────────────
# cleanup_legion
# ─────────────────────────────────────────────────────────────

def primitive_cleanup_legion(params: dict, context: dict) -> dict:
    """
    Cleans up intermediate artifacts (backtests, validations, mutated offspring)
    generated during the Legion strategy evolution cycle.
    """
    import os
    import glob

    ubvm_home = context["ubvm_home"]
    results_dir = os.path.join(ubvm_home, "results")
    mutated_dir = os.path.join(ubvm_home, "strategies", "mutated")

    removed_count = 0

    # Clean intermediate results
    for pattern in ["backtest_*.json", "validation_*.json"]:
        for f in glob.glob(os.path.join(results_dir, pattern)):
            try:
                os.remove(f)
                removed_count += 1
            except Exception:
                pass

    # Clean mutated strategies
    for f in glob.glob(os.path.join(mutated_dir, "*.json")):
        try:
            os.remove(f)
            removed_count += 1
        except Exception:
            pass

    return {"status": "ok", "removed_files": removed_count}


# REGISTER
# ─────────────────────────────────────────────────────────────

def register() -> dict:
    return {
        "fetch_ohlcv":          primitive_fetch_ohlcv,
        "split_data":           primitive_split_data,
        "backtest":             primitive_backtest,
        "forward_validate":     primitive_forward_validate,
        "select_best_strategy": primitive_select_best_strategy,
        "mutate_strategy":      primitive_mutate_strategy,
        "dry_run":              primitive_dry_run,
        "audit_event":          primitive_audit_event,
        "anchor_strategy":      primitive_anchor_strategy,
        "cleanup_legion":       primitive_cleanup_legion,
    }