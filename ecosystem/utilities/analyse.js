const fs = require('fs');
const raw = fs.readFileSync('./crypto-data/all-coins-30d.csv', 'utf8').trim().split('\n');
raw.shift();

const coins = {};
raw.forEach(line => {
  const [coin, ts, date, price] = line.split(',');
  if (!coins[coin]) coins[coin] = [];
  coins[coin].push({ ts: parseInt(ts), price: parseFloat(price) });
});

function pct(a, b) { return (((b - a) / a) * 100).toFixed(2); }
function avg(arr) { return arr.reduce((a,b) => a+b,0) / arr.length; }
function stddev(arr) {
  const m = avg(arr);
  return Math.sqrt(arr.reduce((a,b) => a + Math.pow(b-m,2),0) / arr.length);
}

const results = [];

Object.entries(coins).forEach(([coin, rows]) => {
  const prices = rows.map(r => r.price);
  const first = prices[0], last = prices[prices.length-1];
  const min = Math.min(...prices), max = Math.max(...prices);

  const returns = [];
  for (let i = 1; i < prices.length; i++)
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);

  const vol = stddev(returns) * 100;
  const periodReturn = parseFloat(pct(first, last));

  const half = Math.floor(prices.length / 2);
  const firstHalfAvg = avg(prices.slice(0, half));
  const secondHalfAvg = avg(prices.slice(half));
  const trend = secondHalfAvg > firstHalfAvg ? 'RISING' : 'FALLING';
  const trendStrength = Math.abs(pct(firstHalfAvg, secondHalfAvg));

  let peak = prices[0], maxDD = 0;
  prices.forEach(p => {
    if (p > peak) peak = p;
    const dd = ((peak - p) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  });

  const green = returns.filter(r => r > 0).length;
  const winRate = ((green / returns.length) * 100).toFixed(1);

  let maxRed = 0, curRed = 0;
  returns.forEach(r => {
    if (r < 0) { curRed++; if (curRed > maxRed) maxRed = curRed; }
    else curRed = 0;
  });

  const recent = prices.slice(-84);
  const prior  = prices.slice(-168, -84);
  const momentum = prior.length > 0 ? parseFloat(pct(avg(prior), avg(recent))) : 0;

  results.push({ coin, periodReturn, vol, trend, trendStrength, maxDD: maxDD.toFixed(2), winRate, maxRed, momentum });
});

results.sort((a,b) => b.periodReturn - a.periodReturn);

console.log('\n═══════════════════════════════════════════════════════');
console.log('  PATTERN ANALYSIS — 30d ALL COINS');
console.log('═══════════════════════════════════════════════════════\n');

console.log('  ── PERFORMANCE RANKING ──────────────────────────────');
results.forEach((r, i) => {
  const arrow = r.periodReturn >= 0 ? '▲' : '▼';
  const bar = '█'.repeat(Math.min(Math.round(Math.abs(r.periodReturn)), 20));
  console.log('  #' + (i+1) + ' ' + r.coin.padEnd(16) + arrow + ' ' + String(r.periodReturn).padStart(7) + '%  ' + bar);
});

console.log('\n  ── VOLATILITY RANKING ───────────────────────────────');
[...results].sort((a,b) => b.vol - a.vol).forEach(r => {
  console.log('  ' + r.coin.padEnd(16) + 'Vol: ' + parseFloat(r.vol).toFixed(3).padStart(6) + '%  MaxDD: ' + String(r.maxDD).padStart(6) + '%');
});

console.log('\n  ── TREND + MOMENTUM ─────────────────────────────────');
results.forEach(r => {
  const mom = r.momentum >= 0 ? '+' + r.momentum : String(r.momentum);
  console.log('  ' + r.coin.padEnd(16) + r.trend.padEnd(8) + '  Strength: ' + String(r.trendStrength).padStart(5) + '%  7d Mom: ' + mom.padStart(7) + '%');
});

console.log('\n  ── WIN RATE + DRAWDOWN ──────────────────────────────');
results.forEach(r => {
  console.log('  ' + r.coin.padEnd(16) + 'WinRate: ' + String(r.winRate).padStart(5) + '%  MaxRed: ' + String(r.maxRed).padStart(2) + ' consecutive  MaxDD: ' + r.maxDD + '%');
});

console.log('\n  ── KEY SIGNALS ──────────────────────────────────────');
const bullish = results.filter(r => r.trend === 'RISING' && r.momentum > 0);
const bearish = results.filter(r => r.trend === 'FALLING' && r.momentum < 0);
const highVol = [...results].sort((a,b) => b.vol - a.vol).slice(0,3);
const stable  = [...results].sort((a,b) => a.maxDD - b.maxDD).slice(0,3);

console.log('  BULLISH  (rising + positive momentum):');
bullish.forEach(r => console.log('    ✓ ' + r.coin.padEnd(16) + 'mom: +' + r.momentum + '%'));
console.log('  BEARISH  (falling + negative momentum):');
bearish.forEach(r => console.log('    ✗ ' + r.coin.padEnd(16) + 'mom: ' + r.momentum + '%'));
console.log('  HIGH VOL (top 3):');
highVol.forEach(r => console.log('    ~ ' + r.coin.padEnd(16) + parseFloat(r.vol).toFixed(3) + '%'));
console.log('  STABLE   (lowest drawdown):');
stable.forEach(r => console.log('    = ' + r.coin.padEnd(16) + 'DD: ' + r.maxDD + '%'));

console.log('\n═══════════════════════════════════════════════════════\n');
