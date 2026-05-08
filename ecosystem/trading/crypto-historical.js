#!/usr/bin/env node
/**
 * CRYPTO HISTORICAL DATA GATHERER
 * Termux / Node.js
 * Primary: CoinGecko free API (no key)
 * Fallback: CoinCap API (no key)
 * Usage: node crypto-historical.js [days]
 * Example: node crypto-historical.js 30
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const DAYS = parseInt(process.argv[2]) || 30;
const OUTPUT_DIR = "./crypto-data";

// CoinGecko IDs → CoinCap IDs (mostly identical, a few differ)
const TOP_5_COINGECKO    = null; // null = fetch top 5 by market cap dynamically
const BOTTOM_5_COINGECKO = ["dogecoin", "shiba-inu", "pepe", "floki", "bonk"];
const BOTTOM_5_COINCAP   = ["dogecoin", "shiba-inu", "pepe", "floki", "bonk"];

// CoinCap uses different IDs for some coins
const COINCAP_ID_MAP = {
  "shiba-inu": "shiba-inu",
  "pepe":      "pepe",
  "floki":     "floki",
  "bonk":      "bonk",
};

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function get(url, retries = 3, backoff = 10000) {
  return new Promise((resolve, reject) => {
    const attempt = (triesLeft) => {
      const req = https.get(url, { headers: { "User-Agent": "crypto-historical/1.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 429) {
            if (triesLeft > 0) {
              log(`  Rate limited — retrying in ${backoff / 1000}s (${triesLeft} left)...`, "yellow");
              setTimeout(() => attempt(triesLeft - 1), backoff);
            } else {
              reject(new Error("RATE_LIMITED"));
            }
            return;
          }
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP_${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse failed: ${data.slice(0, 100)}`));
          }
        });
      });
      req.on("error", (err) => {
        if (triesLeft > 0) {
          log(`  Network error — retrying in ${backoff / 1000}s (${triesLeft} left)...`, "yellow");
          setTimeout(() => attempt(triesLeft - 1), backoff);
        } else {
          reject(err);
        }
      });
    };
    attempt(retries);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return "N/A";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${Number(n).toFixed(6)}`;
}

function pct(n) {
  if (n == null) return "N/A";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function bar(value, min, max, width = 25) {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function log(msg, color = "") {
  const codes = {
    cyan:   "\x1b[36m",
    green:  "\x1b[32m",
    yellow: "\x1b[33m",
    red:    "\x1b[31m",
    dim:    "\x1b[2m",
    bold:   "\x1b[1m",
    reset:  "\x1b[0m",
  };
  console.log(`${codes[color] || ""}${msg}${codes.reset}`);
}

function header(title, color = "cyan") {
  const line = "─".repeat(50);
  log(`\n${line}`, color);
  log(`  ${title}`, color);
  log(line, color);
}

// ─── COINGECKO ADAPTER ────────────────────────────────────────────────────────

const CoinGecko = {
  name: "CoinGecko",

  async fetchMarkets(ids = null) {
    const base = "https://api.coingecko.com/api/v3/coins/markets";
    const params = ids
      ? `?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_asc&per_page=10&sparkline=false`
      : `?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false`;
    return get(base + params);
  },

  async fetchHistory(coinId) {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${DAYS}`;
    const data = await get(url);
    // Normalise to [[timestamp, price], ...]
    return data.prices;
  },
};

// ─── COINCAP ADAPTER ──────────────────────────────────────────────────────────

const CoinCap = {
  name: "CoinCap",

  // Normalise CoinCap asset → CoinGecko-style market object
  _normalise(asset) {
    return {
      id:                          asset.id,
      symbol:                      asset.symbol,
      name:                        asset.name,
      current_price:               parseFloat(asset.priceUsd),
      market_cap:                  parseFloat(asset.marketCapUsd),
      total_volume:                parseFloat(asset.volumeUsd24Hr),
      high_24h:                    null, // not provided by CoinCap
      low_24h:                     null,
      price_change_percentage_24h: parseFloat(asset.changePercent24Hr),
      _source:                     "coincap",
    };
  },

  async fetchMarkets(ids = null) {
    if (ids) {
      // Fetch each individually and collect
      const results = [];
      for (const id of ids) {
        try {
          const data = await get(`https://api.coincap.io/v2/assets/${id}`);
          if (data && data.data) results.push(this._normalise(data.data));
          await sleep(300);
        } catch (e) {
          log(`  CoinCap: skipping ${id} (${e.message})`, "yellow");
        }
      }
      return results;
    } else {
      const data = await get("https://api.coincap.io/v2/assets?limit=5");
      return data.data.map((a) => this._normalise(a));
    }
  },

  async fetchHistory(coinId) {
    // CoinCap interval: m1, m5, m15, m30, h1, h2, h6, h12, d1
    const interval = DAYS <= 7 ? "h1" : DAYS <= 90 ? "h6" : "d1";
    const end = Date.now();
    const start = end - DAYS * 24 * 60 * 60 * 1000;
    const url = `https://api.coincap.io/v2/assets/${coinId}/history?interval=${interval}&start=${start}&end=${end}`;
    const data = await get(url);
    // Normalise to [[timestamp, price], ...]
    return data.data.map((p) => [p.time, parseFloat(p.priceUsd)]);
  },
};

// ─── SMART FETCH (CoinGecko → CoinCap fallback) ───────────────────────────────

async function fetchMarkets(ids = null) {
  try {
    log("  Source: CoinGecko", "dim");
    const result = await CoinGecko.fetchMarkets(ids);
    return { data: result, source: "CoinGecko" };
  } catch (e) {
    log(`  CoinGecko failed (${e.message}) — switching to CoinCap...`, "yellow");
    const result = await CoinCap.fetchMarkets(ids);
    return { data: result, source: "CoinCap" };
  }
}

async function fetchHistory(coinId, source) {
  if (source === "CoinGecko") {
    try {
      return await CoinGecko.fetchHistory(coinId);
    } catch (e) {
      log(`  CoinGecko chart failed — falling back to CoinCap...`, "yellow");
      return await CoinCap.fetchHistory(coinId);
    }
  } else {
    try {
      return await CoinCap.fetchHistory(coinId);
    } catch (e) {
      log(`  CoinCap chart also failed: ${e.message}`, "red");
      return [];
    }
  }
}

// ─── DISPLAY ──────────────────────────────────────────────────────────────────

function displayCoinSummary(coin, rank, tier) {
  const tierLabel = tier === "top" ? "TOP" : "LOW";
  const pct24 = coin.price_change_percentage_24h;
  const pctColor = pct24 >= 0 ? "green" : "red";
  const arrow = pct24 >= 0 ? "▲" : "▼";

  log(`\n  [${tierLabel} #${rank}] ${coin.name} (${coin.symbol.toUpperCase()})`, "bold");
  log(`  Price    : ${fmt(coin.current_price)}`, "cyan");
  log(`  24h      : ${arrow} ${pct(pct24)}`, pctColor);
  log(`  Mkt Cap  : ${fmt(coin.market_cap)}`);
  log(`  Vol 24h  : ${fmt(coin.total_volume)}`);
  if (coin.high_24h) {
    log(`  High/Low : ${fmt(coin.high_24h)} / ${fmt(coin.low_24h)}`, "dim");
  }
}

function displayPriceChart(prices, coinName) {
  if (!prices || prices.length < 2) {
    log("  No chart data available.", "dim");
    return;
  }

  const step = Math.max(1, Math.floor(prices.length / 20));
  const sampled = prices.filter((_, i) => i % step === 0);
  const vals = sampled.map(([, p]) => p);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  log(`\n  ${coinName} — ${DAYS}d Price Chart (${sampled.length} points)`, "dim");
  log(`  High: ${fmt(max)}  Low: ${fmt(min)}`, "dim");
  log("");

  sampled.forEach(([ts, price]) => {
    const date = new Date(ts).toLocaleDateString("en-GB", { month: "short", day: "2-digit" });
    const b = bar(price, min, max);
    const priceStr = fmt(price).padStart(12);
    log(`  ${date}  ${b}  ${priceStr}`, "dim");
  });
}

function displayStats(prices) {
  if (!prices || prices.length < 2) return;

  const vals = prices.map(([, p]) => p);
  const first = vals[0];
  const last = vals[vals.length - 1];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const change = ((last - first) / first) * 100;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

  const returns = [];
  for (let i = 1; i < vals.length; i++) {
    returns.push((vals[i] - vals[i - 1]) / vals[i - 1]);
  }
  const meanR = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - meanR, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * 100;

  log(`\n  ── ${DAYS}d Stats ──────────────────────────────`, "dim");
  log(`  Period Return : ${pct(change)}`, change >= 0 ? "green" : "red");
  log(`  Avg Price     : ${fmt(avg)}`, "dim");
  log(`  Range         : ${fmt(min)} → ${fmt(max)}`, "dim");
  log(`  Volatility    : ${volatility.toFixed(2)}% (daily std dev)`, "yellow");
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

function saveData(topCoins, bottomCoins, histories) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const payload = {
    generated: new Date().toISOString(),
    days: DAYS,
    top5: topCoins,
    bottom5: bottomCoins,
    histories,
  };

  const jsonPath = path.join(OUTPUT_DIR, `crypto-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  log(`\n  Saved JSON : ${jsonPath}`, "green");

  const allCoins = [...topCoins, ...bottomCoins];
  allCoins.forEach((coin) => {
    const hist = histories[coin.id];
    if (!hist || hist.length === 0) return;

    const csvLines = ["timestamp,date,price_usd"];
    hist.forEach(([ts, price]) => {
      const date = new Date(ts).toISOString().split("T")[0];
      csvLines.push(`${ts},${date},${price}`);
    });

    const csvPath = path.join(OUTPUT_DIR, `${coin.id}-${DAYS}d.csv`);
    fs.writeFileSync(csvPath, csvLines.join("\n"));
  });

  log(`  Saved CSVs : ./${OUTPUT_DIR}/`, "green");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  log("\n╔══════════════════════════════════════════════════╗", "cyan");
  log("║   CRYPTO HISTORICAL DATA GATHERER                ║", "cyan");
  log("║   CoinGecko → CoinCap fallback · Termux          ║", "cyan");
  log(`║   Window: ${DAYS} days                                 ║`.slice(0, 52) + "║", "cyan");
  log("╚══════════════════════════════════════════════════╝", "cyan");

  const histories = {};

  // ── TOP 5 ──
  header("▲ TOP 5 — MARKET CAP LEADERS", "cyan");
  log("  Fetching...", "dim");

  let topCoins, topSource;
  try {
    const result = await fetchMarkets(null);
    topCoins = result.data;
    topSource = result.source;
    log(`  Data source: ${topSource}`, "dim");
  } catch (e) {
    log(`\n  FATAL: ${e.message}`, "red");
    process.exit(1);
  }

  for (let i = 0; i < topCoins.length; i++) {
    const coin = topCoins[i];
    displayCoinSummary(coin, i + 1, "top");

    try {
      await sleep(2000);
      log(`  Fetching ${DAYS}d history...`, "dim");
      const prices = await fetchHistory(coin.id, topSource);
      histories[coin.id] = prices;
      displayPriceChart(prices, coin.name);
      displayStats(prices);
    } catch (e) {
      log(`  Chart failed: ${e.message}`, "red");
    }

    if (i < topCoins.length - 1) await sleep(1500);
  }

  // ── BOTTOM 5 ──
  header("▼ BOTTOM 5 — HIGH-VOLATILITY / LOW-CAP", "yellow");
  log("  Fetching...", "dim");
  await sleep(5000);

  let bottomCoins, bottomSource;
  try {
    const result = await fetchMarkets(BOTTOM_5_COINGECKO);
    bottomCoins = result.data;
    bottomSource = result.source;
    log(`  Data source: ${bottomSource}`, "dim");
  } catch (e) {
    log(`\n  FATAL: ${e.message}`, "red");
    process.exit(1);
  }

  bottomCoins.sort((a, b) => a.market_cap - b.market_cap);

  for (let i = 0; i < bottomCoins.length; i++) {
    const coin = bottomCoins[i];
    displayCoinSummary(coin, i + 1, "bottom");

    try {
      await sleep(2000);
      log(`  Fetching ${DAYS}d history...`, "dim");
      const prices = await fetchHistory(coin.id, bottomSource);
      histories[coin.id] = prices;
      displayPriceChart(prices, coin.name);
      displayStats(prices);
    } catch (e) {
      log(`  Chart failed: ${e.message}`, "red");
    }

    if (i < bottomCoins.length - 1) await sleep(1500);
  }

  // ── SAVE ──
  header("◈ SAVING DATA", "green");
  saveData(topCoins, bottomCoins, histories);

  log("\n  Done. All data saved.\n", "green");
}

main().catch((e) => {
  log(`\nFatal: ${e.message}`, "red");
  process.exit(1);
});
