#!/usr/bin/env node
/**
 * CRYPTO HISTORICAL DATA GATHERER
 * Termux / Node.js — CoinGecko free API (no key required)
 * Usage: node crypto-historical.js [days]
 * Example: node crypto-historical.js 30
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const DAYS = parseInt(process.argv[2]) || 30;
const OUTPUT_DIR = "./crypto-data";

const BOTTOM_5_IDS = ["dogecoin", "shiba-inu", "pepe", "floki", "bonk"];

// ─── UTILS ────────────────────────────────────────────────────────────────────

function get(url, retries = 3, backoff = 10000) {
  return new Promise((resolve, reject) => {
    const attempt = (triesLeft) => {
      https.get(url, { headers: { "User-Agent": "crypto-historical/1.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 429) {
            if (triesLeft > 0) {
              log(`  Rate limited — retrying in ${backoff / 1000}s (${triesLeft} left)...`, "yellow");
              setTimeout(() => attempt(triesLeft - 1), backoff);
            } else {
              reject(new Error("Rate limited — no retries left."));
            }
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse failed: ${data.slice(0, 100)}`));
          }
        });
      }).on("error", (err) => {
        if (retries > 0) {
          log(`  Network error — retrying in ${backoff / 1000}s (${retries} left)...`, "yellow");
          setTimeout(() => attempt(retries - 1), backoff);
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

function bar(value, min, max, width = 20) {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function log(msg, color = "") {
  const codes = {
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    reset: "\x1b[0m",
  };
  const c = codes[color] || "";
  console.log(`${c}${msg}${codes.reset}`);
}

function header(title, color = "cyan") {
  const line = "─".repeat(50);
  log(`\n${line}`, color);
  log(`  ${title}`, color);
  log(line, color);
}

// ─── FETCH FUNCTIONS ──────────────────────────────────────────────────────────

async function fetchMarkets(ids = null) {
  const base = "https://api.coingecko.com/api/v3/coins/markets";
  const params = ids
    ? `?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_asc&per_page=10&sparkline=false`
    : `?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false`;
  return get(base + params);
}

async function fetchHistory(coinId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${DAYS}`;
  return get(url);
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
  log(`  High/Low : ${fmt(coin.high_24h)} / ${fmt(coin.low_24h)}`, "dim");
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
    const b = bar(price, min, max, 25);
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
  log(`\n  Saved: ${jsonPath}`, "green");

  const allCoins = [...topCoins, ...bottomCoins];
  allCoins.forEach((coin) => {
    const hist = histories[coin.id];
    if (!hist || !hist.prices) return;

    const csvLines = ["timestamp,date,price_usd"];
    hist.prices.forEach(([ts, price]) => {
      const date = new Date(ts).toISOString().split("T")[0];
      csvLines.push(`${ts},${date},${price}`);
    });

    const csvPath = path.join(OUTPUT_DIR, `${coin.id}-${DAYS}d.csv`);
    fs.writeFileSync(csvPath, csvLines.join("\n"));
  });

  log(`  CSVs saved to ./${OUTPUT_DIR}/`, "green");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  log("\n╔══════════════════════════════════════════════════╗", "cyan");
  log("║   CRYPTO HISTORICAL DATA GATHERER                ║", "cyan");
  log("║   CoinGecko Free API · Termux Edition            ║", "cyan");
  log(`║   Window: ${DAYS} days                                 ║`.slice(0, 52) + "║", "cyan");
  log("╚══════════════════════════════════════════════════╝", "cyan");

  const histories = {};

  // ── TOP 5 ──
  header("▲ TOP 5 — MARKET CAP LEADERS", "cyan");
  log("  Fetching...", "dim");

  let topCoins;
  try {
    topCoins = await fetchMarkets();
  } catch (e) {
    log(`\n  ERROR: ${e.message}`, "red");
    process.exit(1);
  }

  for (let i = 0; i < topCoins.length; i++) {
    const coin = topCoins[i];
    displayCoinSummary(coin, i + 1, "top");

    try {
      await sleep(2000);
      log(`  Fetching ${DAYS}d history...`, "dim");
      const hist = await fetchHistory(coin.id);
      histories[coin.id] = hist;
      displayPriceChart(hist.prices, coin.name);
      displayStats(hist.prices);
    } catch (e) {
      log(`  Chart fetch failed: ${e.message}`, "red");
    }

    if (i < topCoins.length - 1) await sleep(1500);
  }

  // ── BOTTOM 5 ──
  header("▼ BOTTOM 5 — HIGH-VOLATILITY / LOW-CAP", "yellow");
  log("  Fetching...", "dim");
  await sleep(5000);

  let bottomCoins;
  try {
    bottomCoins = await fetchMarkets(BOTTOM_5_IDS);
  } catch (e) {
    log(`\n  ERROR: ${e.message}`, "red");
    process.exit(1);
  }

  bottomCoins.sort((a, b) => a.market_cap - b.market_cap);

  for (let i = 0; i < bottomCoins.length; i++) {
    const coin = bottomCoins[i];
    displayCoinSummary(coin, i + 1, "bottom");

    try {
      await sleep(2000);
      log(`  Fetching ${DAYS}d history...`, "dim");
      const hist = await fetchHistory(coin.id);
      histories[coin.id] = hist;
      displayPriceChart(hist.prices, coin.name);
      displayStats(hist.prices);
    } catch (e) {
      log(`  Chart fetch failed: ${e.message}`, "red");
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
