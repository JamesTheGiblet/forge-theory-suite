const fs = require('fs');

// ─── STRATEGY CONFIG (tune these) ────────────────────────────────────────────
const CONFIG = {
  trailingStop:    1.5,    // % trailing stop from peak
  minRedStreak:    3,      // min consecutive reds before looking for entry
  minMomentum:     0.7,    // min % momentum uptick to confirm reversal
  lookback:        6,      // candles to measure momentum over
  holdPeriod:      24,     // candles to hold position
  stopLoss:        2.0,    // % stop loss
  takeProfit:      3.0,    // % take profit
  excludeCoins:    ["tether","dogecoin","shiba-inu","pepe","floki","bonk","ripple","binancecoin"],
};

// ─── PARSE DATA ───────────────────────────────────────────────────────────────
const raw = fs.readFileSync('./crypto-data/all-coins-30d.csv', 'utf8').trim().split('\n');
raw.shift();

const coins = {};
raw.forEach(line => {
  const [coin, ts, date, price] = line.split(',');
  if (!coins[coin]) coins[coin] = [];
  coins[coin].push({ ts: parseInt(ts), price: parseFloat(price) });
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pct(a, b) { return ((b - a) / a) * 100; }
function avg(arr)  { return arr.reduce((a,b) => a+b,0) / arr.length; }

// ─── STRATEGY SIGNAL ─────────────────────────────────────────────────────────
function getSignal(prices, i) {
  if (i < CONFIG.lookback + CONFIG.minRedStreak) return null;

  // Count recent red candles leading up to i
  let redStreak = 0;
  for (let j = i - 1; j >= 0; j--) {
    if (prices[j] < prices[j - 1 >= 0 ? j - 1 : j]) redStreak++;
    else break;
    if (redStreak >= CONFIG.minRedStreak + 3) break;
  }

  if (redStreak < CONFIG.minRedStreak) return null;

  // Momentum: compare last lookback avg to prior lookback avg
  const recent = avg(prices.slice(i - CONFIG.lookback, i));
  const prior  = avg(prices.slice(i - CONFIG.lookback * 2, i - CONFIG.lookback));
  const momentum = pct(prior, recent);

  if (momentum < CONFIG.minMomentum) return null;

  return { redStreak, momentum: momentum.toFixed(2) };
}

// ─── BACKTEST ─────────────────────────────────────────────────────────────────
function backtest(coin, rows) {
  const prices = rows.map(r => r.price);
  const trades = [];
  let i = CONFIG.lookback * 2;

  while (i < prices.length - CONFIG.holdPeriod) {
    const signal = getSignal(prices, i);
    if (!signal) { i++; continue; }

    const entry = prices[i];
    const sl    = entry * (1 - CONFIG.stopLoss / 100);
    const tp    = entry * (1 + CONFIG.takeProfit / 100);

    let exitPrice = prices[i + CONFIG.holdPeriod];
    let exitReason = 'HOLD_EXPIRE';
    let exitIdx = i + CONFIG.holdPeriod;

    // Walk forward to check SL/TP hit
    FIG.holdPeriod && j < prices.length; j++) {
  if (prices[j] > peak) peak = prices[j];
  const trailSL = peak * (1 - CONFIG.trailingStop / 100);
  if (prices[j] <= trailSL && peak > entry) {
    exitPrice = prices[j];
    exitReason = 'TRAIL_STOP';
    exitIdx = j;
    break;
  }
  if (prices[j] <= sl) {
    exitPrice = sl;
    exitReason = 'STOP_LOSS';
    exitIdx = j;
    break;
  }
  if (prices[j] >= tp) {
    exitPrice = tp;
    exitReason = 'TAKE_PROFIT';
    exitIdx = j;
    break;
  }

}for (let j = i + 1; j <= i + CONFIG.holdPeriod && j < prices.length; j++) {
      if (prices[j] <= sl) {
        exitPrice = sl;
        exitReason = 'STOP_LOSS';
        exitIdx = j;
        break;
      }
      if (prices[j] >= tp) {
        exitPrice = tp;
        exitReason = 'TAKE_PROFIT';
        exitIdx = j;
        break;
      }
    }

    const returnPct = pct(entry, exitPrice);
    trades.push({
      entryIdx: i,
      exitIdx,
      entry: entry.toFixed(6),
      exit: exitPrice.toFixed(6),
      returnPct: returnPct.toFixed(2),
      exitReason,
      redStreak: signal.redStreak,
      momentum: signal.momentum,
    });

    // Skip ahead past this trade
    i = exitIdx + 1;
  }

  return trades;
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function calcStats(trades) {
  if (trades.length === 0) return null;
  const returns = trades.map(t => parseFloat(t.returnPct));
  const wins    = returns.filter(r => r > 0);
  const losses  = returns.filter(r => r <= 0);
  const total   = returns.reduce((a,b) => a+b, 0);
  const avgWin  = wins.length   ? avg(wins).toFixed(2)   : '0';
  const avgLoss = losses.length ? avg(losses).toFixed(2) : '0';
  const winRate = ((wins.length / trades.length) * 100).toFixed(1);
  const profitFactor = losses.length
    ? (Math.abs(wins.reduce((a,b)=>a+b,0)) / Math.abs(losses.reduce((a,b)=>a+b,0))).toFixed(2)
    : '∞';
  const maxDD = Math.min(...returns).toFixed(2);
  const best  = Math.max(...returns).toFixed(2);

  return { total: total.toFixed(2), winRate, avgWin, avgLoss, profitFactor, maxDD, best, count: trades.length };
}

// ─── RUN + REPORT ─────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  BACKTEST — MEAN REVERSION + MOMENTUM CONFIRMATION      ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('\n  CONFIG:');
console.log('  Min red streak    : ' + CONFIG.minRedStreak);
console.log('  Min momentum      : ' + CONFIG.minMomentum + '%');
console.log('  Lookback          : ' + CONFIG.lookback + ' candles');
console.log('  Hold period       : ' + CONFIG.holdPeriod + ' candles');
console.log('  Stop loss         : ' + CONFIG.stopLoss + '%');
console.log('  Take profit       : ' + CONFIG.takeProfit + '%');

const allResults = [];

Object.entries(coins).forEach(([coin, rows]) => {
  if (CONFIG.excludeCoins.includes(coin)) return;
  const trades = backtest(coin, rows);
  const stats  = calcStats(trades);
  if (!stats) return;
  allResults.push({ coin, trades, stats });
});

// Sort by total return
allResults.sort((a,b) => parseFloat(b.stats.total) - parseFloat(a.stats.total));

console.log('\n  ── PER COIN RESULTS ─────────────────────────────────────');
console.log('  ' + 'COIN'.padEnd(16) + 'TRADES'.padEnd(8) + 'WIN%'.padEnd(8) + 'TOTAL%'.padEnd(10) + 'PF'.padEnd(8) + 'BEST'.padEnd(9) + 'WORST');
console.log('  ' + '─'.repeat(65));

allResults.forEach(({ coin, stats }) => {
  const totalStr = (parseFloat(stats.total) >= 0 ? '+' : '') + stats.total + '%';
  console.log(
    '  ' + coin.padEnd(16) +
    String(stats.count).padEnd(8) +
    (stats.winRate + '%').padEnd(8) +
    totalStr.padEnd(10) +
    ('PF:' + stats.profitFactor).padEnd(8) +
    ('+' + stats.best + '%').padEnd(9) +
    stats.maxDD + '%'
  );
});

// Aggregate stats
const allTrades = allResults.flatMap(r => r.trades);
const aggStats  = calcStats(allTrades);

console.log('\n  ── AGGREGATE (ALL COINS) ────────────────────────────────');
console.log('  Total trades      : ' + aggStats.count);
console.log('  Win rate          : ' + aggStats.winRate + '%');
console.log('  Total return      : ' + (parseFloat(aggStats.total) >= 0 ? '+' : '') + aggStats.total + '%');
console.log('  Profit factor     : ' + aggStats.profitFactor);
console.log('  Avg win           : +' + aggStats.avgWin + '%');
console.log('  Avg loss          : ' + aggStats.avgLoss + '%');
console.log('  Best trade        : +' + aggStats.best + '%');
console.log('  Worst trade       : ' + aggStats.maxDD + '%');

// Trade log for top coin
const top = allResults[0];
console.log('\n  ── TRADE LOG: ' + top.coin.toUpperCase() + ' ──────────────────────────────────');
console.log('  ' + 'ENTRY'.padEnd(14) + 'EXIT'.padEnd(14) + 'RETURN'.padEnd(10) + 'REASON'.padEnd(14) + 'REDS  MOM%');
top.trades.forEach(t => {
  const ret = (parseFloat(t.returnPct) >= 0 ? '+' : '') + t.returnPct + '%';
  console.log(
    '  $' + String(t.entry).padEnd(13) +
    '$' + String(t.exit).padEnd(13) +
    ret.padEnd(10) +
    t.exitReason.padEnd(14) +
    String(t.redStreak).padEnd(6) +
    t.momentum + '%'
  );
});

console.log('\n  ── OPTIMISATION HINTS ───────────────────────────────────');
const tpHits = allTrades.filter(t => t.exitReason === 'TAKE_PROFIT').length;
const slHits = allTrades.filter(t => t.exitReason === 'STOP_LOSS').length;
const expHits = allTrades.filter(t => t.exitReason === 'HOLD_EXPIRE').length;
console.log('  Take profit hits  : ' + tpHits + ' (' + ((tpHits/allTrades.length)*100).toFixed(1) + '%)');
console.log('  Stop loss hits    : ' + slHits + ' (' + ((slHits/allTrades.length)*100).toFixed(1) + '%)');
console.log('  Hold expired      : ' + expHits + ' (' + ((expHits/allTrades.length)*100).toFixed(1) + '%)');

if (tpHits > slHits * 2) console.log('  HINT: TP hitting well — consider raising take profit target');
if (slHits > tpHits)     console.log('  HINT: SL triggering too often — widen stop or raise momentum filter');
if (expHits > tpHits + slHits) console.log('  HINT: Most trades expiring — reduce hold period or add trailing stop');

console.log('\n╚══════════════════════════════════════════════════════════╝\n');
