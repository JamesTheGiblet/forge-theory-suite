// scripts/generate-report.js
// CCE Platform Core — Full Analytics Report Generator
// Queries all engine databases and outputs TXT, CSV, and HTML reports
// Run from ~/cce-crypto: node scripts/generate-report.js

'use strict';

const http = require('http');

const fs   = require('fs');
const path = require('path');

// ============================================================================
// DATABASE LOADER
// ============================================================================

async function loadDB(dbPath) {
  if (!fs.existsSync(dbPath)) return null;
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(dbPath);
  return new SQL.Database(buf);
}

function query(db, sql) {
  if (!db) return [];
  try {
    const result = db.exec(sql);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  } catch (e) {
    return [];
  }
}

// ============================================================================
// DATA COLLECTION
// ============================================================================


// ============================================================================
// LIVE STATUS FETCHER — merges real-time data over DB snapshots
// ============================================================================

function fetchLive(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: 3000, path }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

async function fetchAllLiveStatus() {
  console.log('🔴 Fetching live status from dashboard API...');
  const [crypto, rme, cme, como, grid, mom, brk, egp, dxy, sentinel] = await Promise.all([
    fetchLive('/api/ticker'),
    fetchLive('/api/rme/status'),
    fetchLive('/api/cme/status'),
    fetchLive('/api/como/status'),
    fetchLive('/api/grid/status'),
    fetchLive('/api/mom/status'),
    fetchLive('/api/brk/status'),
    fetchLive('/api/egp/status'),
    fetchLive('/api/dxy/status'),
    fetchLive('/api/sentinel/status'),
  ]);

  const live = { crypto, rme, cme, como, grid, mom, brk, egp, dxy, sentinel };
  const connected = Object.values(live).filter(Boolean).length;
  console.log(`✅ Live API: ${connected}/10 endpoints responding`);
  return live;
}

async function collectAllData() {
  const dataDir = path.join(__dirname, '..', 'data');

  const cryptoDB = await loadDB(path.join(dataDir, 'cce-production.db'));
  const rmeDB    = await loadDB(path.join(dataDir, 'rme-production.db'));
  const cmeDB    = await loadDB(path.join(dataDir, 'cme-production.db'));
  const comoDB   = await loadDB(path.join(dataDir, 'como-production.db'));
  const gridDB   = await loadDB(path.join(dataDir, 'grid-production.db'));
  const momDB    = await loadDB(path.join(dataDir, 'mom-production.db'));
  const brkDB    = await loadDB(path.join(dataDir, 'brk-production.db'));
  const egpDB    = await loadDB(path.join(dataDir, 'egp-production.db'));

  console.log('📊 Loading data from all engines...');

  const data = {
    generated: new Date().toISOString(),

    crypto: {
      cycles:      query(cryptoDB, 'SELECT * FROM cce_cycles ORDER BY timestamp ASC'),
      transitions: query(cryptoDB, 'SELECT * FROM state_history ORDER BY timestamp ASC'),
      trades:      query(cryptoDB, 'SELECT * FROM trades ORDER BY timestamp ASC'),
      reports:     query(cryptoDB, 'SELECT * FROM daily_reports ORDER BY timestamp ASC')
    },

    rme: {
      cycles: query(rmeDB, 'SELECT * FROM rme_cycles ORDER BY timestamp ASC'),
      trades: query(rmeDB, 'SELECT * FROM rme_trades ORDER BY timestamp ASC')
    },

    cme: {
      cycles: query(cmeDB, 'SELECT * FROM cme_cycles ORDER BY timestamp ASC'),
      trades: query(cmeDB, 'SELECT * FROM cme_trades ORDER BY timestamp ASC')
    },

    grid: {
      cycles:    query(gridDB, 'SELECT * FROM grid_cycles ORDER BY timestamp ASC'),
      completed: query(gridDB, 'SELECT * FROM grid_completed ORDER BY timestamp ASC'),
      events:    query(gridDB, 'SELECT * FROM grid_events ORDER BY timestamp ASC')
    },

    mom: {
      cycles: query(momDB, 'SELECT * FROM mom_cycles ORDER BY timestamp ASC'),
      trades: query(momDB, 'SELECT * FROM mom_trades ORDER BY timestamp ASC')
    },

    brk: {
      cycles:   query(brkDB, 'SELECT * FROM brk_cycles ORDER BY timestamp ASC'),
      trades:   query(brkDB, 'SELECT * FROM brk_trades ORDER BY timestamp ASC'),
      squeezes: query(brkDB, 'SELECT * FROM brk_squeezes ORDER BY timestamp ASC')
    },

    egp: {
      cycles:      query(egpDB, 'SELECT * FROM egp_cycles ORDER BY timestamp ASC'),
      transitions: query(egpDB, 'SELECT * FROM egp_transitions ORDER BY timestamp ASC')
    },

    como: {
      cycles: query(comoDB, 'SELECT * FROM como_cycles ORDER BY timestamp ASC'),
      trades: query(comoDB, 'SELECT * FROM como_trades ORDER BY timestamp ASC')
    }
  };

  console.log(`✅ Loaded:`);
  console.log(`   Crypto: ${data.crypto.cycles.length} cycles, ${data.crypto.transitions.length} transitions`);
  console.log(`   RME:    ${data.rme.cycles.length} cycles`);
  console.log(`   CME:    ${data.cme.cycles.length} cycles`);
  console.log(`   COMO:   ${data.como.cycles.length} cycles`);
  console.log(`   MOM:    ${data.mom.cycles.length} cycles, ${data.mom.trades.length} trades`);
  console.log(`   BRK:    ${data.brk.cycles.length} cycles, ${data.brk.trades.length} trades`);
  console.log(`   EGP:    ${data.egp.cycles.length} cycles`);

  return data;
}

// ============================================================================
// ANALYTICS
// ============================================================================

function analyseCrypto(cycles, transitions, trades, liveStatus) {
  if (!cycles.length) return null;

  const latest    = cycles[cycles.length - 1];
  const first     = cycles[0];
  const btcPrices = cycles.map(c => c.btc_price).filter(Boolean);
  const fgScores  = cycles.map(c => c.fear_greed).filter(Boolean);
  const portfolio = cycles.map(c => c.portfolio_value).filter(Boolean);

  const stateCounts = {};
  cycles.forEach(c => {
    stateCounts[c.current_state] = (stateCounts[c.current_state] || 0) + 1;
  });

  const btcChange = btcPrices.length > 1
    ? ((btcPrices[btcPrices.length-1] - btcPrices[0]) / btcPrices[0] * 100).toFixed(2)
    : 0;

  // Merge live status over DB snapshot if available
  const liveState    = latest.current_state; // state comes from DB only
  const liveBtc      = liveStatus?.btc_price        || btcPrices[btcPrices.length-1];
  const liveFg       = liveStatus?.fear_greed !== undefined ? liveStatus.fear_greed : latest.fear_greed;
  const liveDom      = latest.btc_dominance; // dominance from DB
  const livePort     = portfolio[portfolio.length-1]; // portfolio from DB
  const liveReturn   = latest.total_return; // return from DB
  const liveDays     = latest.days_in_state; // days from DB
  const liveRunNum   = cycles.length;
  const isLive       = !!liveStatus;

  // Recalculate BTC change using live price
  const liveBtcChange = btcPrices.length > 0
    ? ((liveBtc - btcPrices[0]) / btcPrices[0] * 100).toFixed(2)
    : btcChange;

  return {
    totalCycles:      liveRunNum,
    firstCycle:       first.timestamp,
    lastCycle:        isLive ? new Date().toISOString() : latest.timestamp,
    currentState:     liveState,
    daysInState:      (+liveDays || 0).toFixed(1),
    portfolioStart:   portfolio[0]?.toFixed(2),
    portfolioCurrent: (+livePort || 0).toFixed(2),
    portfolioReturn:  (+liveReturn || 0).toFixed(2),
    btcStart:         btcPrices[0]?.toFixed(2),
    btcCurrent:       (+liveBtc || 0).toFixed(2),
    btcChange:        liveBtcChange,
    btcHigh:          Math.max(...btcPrices, liveBtc || 0).toFixed(2),
    btcLow:           Math.min(...btcPrices, liveBtc || 999999).toFixed(2),
    avgFearGreed:     (fgScores.reduce((a,b) => a+b, 0) / fgScores.length).toFixed(1),
    currentFearGreed: liveFg,
    fgLabel:          liveStatus?.fg_label || '',
    btcChange24:      liveStatus?.btc_change24 || null,
    btcDominance:     (+liveDom || 0).toFixed(1),
    stateCounts,
    transitions:      transitions.length,
    trades:           trades.length,
    isLive
  };
}

function analyseRME(cycles) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];

  const states = {};
  cycles.forEach(c => { states[c.state] = (states[c.state] || 0) + 1; });

  const fedRates     = cycles.map(c => c.fed_rate).filter(Boolean);
  const treasuryYlds = cycles.map(c => c.treasury_yield).filter(Boolean);
  const spreads      = cycles.map(c => c.yield_spread).filter(Boolean);

  return {
    totalCycles:     cycles.length,
    firstCycle:      first.timestamp,
    lastCycle:       latest.timestamp,
    currentState:    latest.state,
    portfolioValue:  latest.portfolio_value?.toFixed(2),
    fedRateCurrent:  latest.fed_rate?.toFixed(2),
    fedRateStart:    fedRates[0]?.toFixed(2),
    treasuryCurrent: latest.treasury_yield?.toFixed(2),
    yieldSpread:     latest.yield_spread?.toFixed(3),
    avgSpread:       (spreads.reduce((a,b) => a+b, 0) / spreads.length).toFixed(3),
    fedCuttingPct:   (cycles.filter(c => c.fed_cutting).length / cycles.length * 100).toFixed(0),
    spreadFavPct:    (cycles.filter(c => c.spread_favourable).length / cycles.length * 100).toFixed(0),
    stateCounts:     states
  };
}

function analyseCME(cycles) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];

  const states   = {};
  cycles.forEach(c => { states[c.state] = (states[c.state] || 0) + 1; });

  const spyPrices = cycles.map(c => c.price).filter(Boolean);
  const vixScores = cycles.map(c => c.vix).filter(Boolean);
  const rsiScores = cycles.map(c => c.rsi).filter(Boolean);

  return {
    totalCycles:    cycles.length,
    firstCycle:     first.timestamp,
    lastCycle:      latest.timestamp,
    currentState:   latest.state,
    portfolioValue: latest.portfolio_value?.toFixed(2),
    spyCurrent:     latest.price?.toFixed(2),
    spyStart:       spyPrices[0]?.toFixed(2),
    spyChange:      spyPrices.length > 1
      ? ((spyPrices[spyPrices.length-1] - spyPrices[0]) / spyPrices[0] * 100).toFixed(2)
      : 0,
    sma50:          latest.sma50?.toFixed(2),
    sma200:         latest.sma200?.toFixed(2),
    vixCurrent:     latest.vix?.toFixed(2),
    vixAvg:         (vixScores.reduce((a,b) => a+b, 0) / vixScores.length).toFixed(2),
    vixHigh:        Math.max(...vixScores).toFixed(2),
    rsiCurrent:     latest.rsi?.toFixed(1),
    rsiAvg:         (rsiScores.reduce((a,b) => a+b, 0) / rsiScores.length).toFixed(1),
    goldenCrossPct: (cycles.filter(c => c.golden_cross).length / cycles.length * 100).toFixed(0),
    aboveSma200Pct: (cycles.filter(c => c.above_sma200).length / cycles.length * 100).toFixed(0),
    stateCounts:    states
  };
}

function analyseCOMO(cycles) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];

  const states    = {};
  cycles.forEach(c => { states[c.state] = (states[c.state] || 0) + 1; });

  const oilPrices = cycles.map(c => c.oil_price).filter(Boolean);
  const goldPrices = cycles.map(c => c.gold_price).filter(Boolean);
  const copPrices  = cycles.map(c => c.copper_price).filter(Boolean);
  const dxyPrices  = cycles.map(c => c.dxy_price).filter(Boolean);

  return {
    totalCycles:    cycles.length,
    firstCycle:     first.timestamp,
    lastCycle:      latest.timestamp,
    currentState:   latest.state,
    portfolioValue: latest.portfolio_value?.toFixed(2),
    oilCurrent:     latest.oil_price?.toFixed(2),
    oilStart:       oilPrices[0]?.toFixed(2),
    oilMom5d:       latest.oil_mom_5d?.toFixed(2),
    oilMom20d:      latest.oil_mom_20d?.toFixed(2),
    goldCurrent:    latest.gold_price?.toFixed(2),
    goldMom5d:      latest.gold_mom_5d?.toFixed(2),
    copperCurrent:  latest.copper_price?.toFixed(3),
    copMom5d:       latest.copper_mom_5d?.toFixed(2),
    dxyCurrent:     latest.dxy_price?.toFixed(2),
    dxyMom5d:       latest.dxy_mom_5d?.toFixed(2),
    oilBullishPct:  (cycles.filter(c => c.oil_bullish).length / cycles.length * 100).toFixed(0),
    dxyStrongPct:   (cycles.filter(c => c.dxy_strong).length / cycles.length * 100).toFixed(0),
    goldFollowPct:  (cycles.filter(c => c.gold_following).length / cycles.length * 100).toFixed(0),
    stateCounts:    states
  };
}

// ============================================================================
// TXT REPORT
// ============================================================================

function generateTXT(data, crypto, rme, cme, como, grid, mom, brk, egp, live) {
  const divider  = '='.repeat(70);
  const divider2 = '-'.repeat(70);
  const lines    = [];
  const ts       = d => d ? new Date(d).toLocaleString() : '--';
  const pct      = v => v !== undefined ? `${v >= 0 ? '+' : ''}${v}%` : '--';

  lines.push(divider);
  lines.push('CCE PLATFORM CORE — FULL ANALYTICS REPORT');
  lines.push(`Generated: ${new Date(data.generated).toLocaleString()}`);
  lines.push(divider);

  // ── CRYPTO ──


  lines.push('1. CCE CRYPTO — LIVE ENGINE');
  lines.push(divider2);
  if (crypto) {
    lines.push(`Period:          ${ts(crypto.firstCycle)} → ${ts(crypto.lastCycle)}`);
    lines.push(`Total cycles:    ${crypto.totalCycles}`);
    lines.push(`Current state:   ${crypto.currentState} (${crypto.daysInState} days)`);
    lines.push('');
    lines.push(`Portfolio start: $${crypto.portfolioStart}`);
    lines.push(`Portfolio now:   $${crypto.portfolioCurrent}`);
    lines.push(`Total return:    ${pct(crypto.portfolioReturn)}`);
    lines.push('');
    lines.push(`BTC at launch:   $${crypto.btcStart}`);
    lines.push(`BTC current:     $${crypto.btcCurrent}`);
    lines.push(`BTC change:      ${pct(crypto.btcChange)}`);
    lines.push(`BTC high/low:    $${crypto.btcHigh} / $${crypto.btcLow}`);
    lines.push('');
    lines.push(`Fear & Greed avg: ${crypto.avgFearGreed} | Current: ${crypto.currentFearGreed}`);
    lines.push(`BTC Dominance:   ${crypto.btcDominance}%`);
    lines.push('');
    lines.push('State distribution:');
    Object.entries(crypto.stateCounts).forEach(([s, n]) => {
      const pct = (n / crypto.totalCycles * 100).toFixed(1);
      lines.push(`  ${s.padEnd(16)} ${n} cycles (${pct}%)`);
    });
    lines.push(`State transitions: ${crypto.transitions}`);
    lines.push(`Trades executed:   ${crypto.trades}`);
  } else {
    lines.push('No data yet.');
  }

  // ── REIT ──
  lines.push('');
  lines.push('2. CCE REIT (RME) — DRY RUN');
  lines.push(divider2);
  if (rme) {
    lines.push(`Period:          ${ts(rme.firstCycle)} → ${ts(rme.lastCycle)}`);
    lines.push(`Total cycles:    ${rme.totalCycles}`);
    lines.push(`Current state:   ${rme.currentState}`);
    lines.push(`Portfolio value: £${rme.portfolioValue}`);
    lines.push('');
    lines.push(`Fed Funds Rate:  ${rme.fedRateCurrent}% (was ${rme.fedRateStart}% at launch)`);
    lines.push(`10Y Treasury:    ${rme.treasuryCurrent}%`);
    lines.push(`Yield Spread:    ${rme.yieldSpread}% (avg: ${rme.avgSpread}%)`);
    lines.push('');
    lines.push(`Fed cutting:     ${rme.fedCuttingPct}% of cycles`);
    lines.push(`Spread favourable: ${rme.spreadFavPct}% of cycles`);
    lines.push('');
    lines.push('State distribution:');
    Object.entries(rme.stateCounts).forEach(([s, n]) => {
      const pct = (n / rme.totalCycles * 100).toFixed(1);
      lines.push(`  ${s.padEnd(16)} ${n} cycles (${pct}%)`);
    });
  } else {
    lines.push('No data yet.');
  }

  // ── STOCKS ──
  lines.push('');
  lines.push('3. CCE STOCKS (CME) — DRY RUN');
  lines.push(divider2);
  if (cme) {
    lines.push(`Period:          ${ts(cme.firstCycle)} → ${ts(cme.lastCycle)}`);
    lines.push(`Total cycles:    ${cme.totalCycles}`);
    lines.push(`Current state:   ${cme.currentState}`);
    lines.push(`Portfolio value: £${cme.portfolioValue}`);
    lines.push('');
    lines.push(`SPY at launch:   $${cme.spyStart}`);
    lines.push(`SPY current:     $${cme.spyCurrent}`);
    lines.push(`SPY change:      ${pct(cme.spyChange)}`);
    lines.push(`SMA50 / SMA200:  $${cme.sma50} / $${cme.sma200}`);
    lines.push('');
    lines.push(`VIX current:     ${cme.vixCurrent}`);
    lines.push(`VIX average:     ${cme.vixAvg}`);
    lines.push(`VIX high:        ${cme.vixHigh}`);
    lines.push(`RSI current:     ${cme.rsiCurrent} (avg: ${cme.rsiAvg})`);
    lines.push('');
    lines.push(`Golden cross:    ${cme.goldenCrossPct}% of cycles`);
    lines.push(`Above SMA200:    ${cme.aboveSma200Pct}% of cycles`);
    lines.push('');
    lines.push('State distribution:');
    Object.entries(cme.stateCounts).forEach(([s, n]) => {
      const pct = (n / cme.totalCycles * 100).toFixed(1);
      lines.push(`  ${s.padEnd(16)} ${n} cycles (${pct}%)`);
    });
  } else {
    lines.push('No data yet.');
  }

  // ── COMMODITIES ──
  lines.push('');
  lines.push('4. CCE COMMODITIES (COMO) — DRY RUN');
  lines.push(divider2);
  if (como) {
    lines.push(`Period:          ${ts(como.firstCycle)} → ${ts(como.lastCycle)}`);
    lines.push(`Total cycles:    ${como.totalCycles}`);
    lines.push(`Current state:   ${como.currentState}`);
    lines.push(`Portfolio value: £${como.portfolioValue}`);
    lines.push('');
    lines.push(`WTI Crude:       $${como.oilCurrent} | Mom5d: ${pct(como.oilMom5d)} | Mom20d: ${pct(como.oilMom20d)}`);
    lines.push(`Gold:            $${como.goldCurrent} | Mom5d: ${pct(como.goldMom5d)}`);
    lines.push(`Copper:          $${como.copperCurrent} | Mom5d: ${pct(como.copMom5d)}`);
    lines.push(`DXY:             ${como.dxyCurrent} | Mom5d: ${pct(como.dxyMom5d)}`);
    lines.push('');
    lines.push(`Oil bullish:     ${como.oilBullishPct}% of cycles`);
    lines.push(`DXY strong:      ${como.dxyStrongPct}% of cycles (blocks entry)`);
    lines.push(`Gold following:  ${como.goldFollowPct}% of cycles`);
    lines.push('');
    lines.push('State distribution:');
    Object.entries(como.stateCounts).forEach(([s, n]) => {
      const pct = (n / como.totalCycles * 100).toFixed(1);
      lines.push(`  ${s.padEnd(16)} ${n} cycles (${pct}%)`);
    });
  } else {
    lines.push('No data yet.');
  }


  // ── GRID ──
  lines.push('');
  lines.push('5. T.E GRID — DRY RUN');
  lines.push(divider2);
  if (grid) {
    lines.push(`Period:          ${ts(grid.firstCycle)} → ${ts(grid.lastCycle)}`);
    lines.push(`Total cycles:    ${grid.totalCycles}`);
    lines.push(`Grid state:      ${grid.gridState}`);
    lines.push(`Centre price:    $${grid.centrePrice}`);
    lines.push(`BTC current:     $${grid.btcCurrent}`);
    lines.push(`Portfolio:       $${grid.portfolioValue}`);
    lines.push('');
    lines.push(`Completed cycles: ${grid.completedCycles}`);
    lines.push(`Total profit:    $${grid.totalProfit}`);
    lines.push(`Avg per cycle:   $${grid.avgProfit}`);
    lines.push(`Win rate:        ${grid.winRate}% (${grid.wins}W / ${grid.losses}L)`);
    lines.push('');
    lines.push(`Open buys:       ${grid.openBuys}`);
    lines.push(`Open sells:      ${grid.openSells}`);
    lines.push(`Recentres:       ${grid.recentres}`);
    lines.push(`Stop events:     ${grid.stopEvents}`);
    lines.push(`BTC range:       $${grid.btcLow} — $${grid.btcHigh}`);
  } else {
    lines.push('No data yet.');
  }

  // ── SUMMARY ──
  lines.push('');
  lines.push(divider);
  lines.push('');
  // MOM section
  lines.push('');
  lines.push('6. T.E MOMENTUM — DRY RUN');
  lines.push('-'.repeat(70));
  if (mom) {
    lines.push(`Period:          ${ts(mom.firstCycle)} → ${ts(mom.lastCycle)}`);
    lines.push(`Total cycles:    ${mom.totalCycles}`);
    lines.push(`Pairs:           ${mom.pairs}`);
    lines.push(`Portfolio:       $${mom.portfolioValue}`);
    lines.push('');
    lines.push(`Total trades:    ${mom.totalTrades}`);
    lines.push(`Win rate:        ${mom.winRate}% (${mom.wins}W / ${mom.losses}L)`);
    lines.push(`Total PnL:       ${mom.totalProfit >= 0 ? '+' : ''}$${mom.totalProfit}`);
    lines.push(`Avg per trade:   $${mom.avgProfit}`);
    lines.push(`Best trade:      +$${mom.bestTrade}`);
  } else {
    lines.push('No data yet');
  }

  // BRK section
  lines.push('');
  lines.push('7. T.E BREAKOUT — DRY RUN');
  lines.push('-'.repeat(70));
  if (brk) {
    lines.push(`Period:          ${ts(brk.firstCycle)} → ${ts(brk.lastCycle)}`);
    lines.push(`Total cycles:    ${brk.totalCycles}`);
    lines.push(`Portfolio:       $${brk.portfolioValue}`);
    lines.push(`Squeezes detected: ${brk.squeezeCount}`);
    lines.push('');
    lines.push(`Total trades:    ${brk.totalTrades}`);
    lines.push(`Win rate:        ${brk.winRate}% (${brk.wins}W / ${brk.losses}L)`);
    lines.push(`Total PnL:       ${brk.totalProfit >= 0 ? '+' : ''}$${brk.totalProfit}`);
    if (brk.exitReasons && Object.keys(brk.exitReasons).length) {
      lines.push('');
      lines.push('Exit reasons:');
      Object.entries(brk.exitReasons).forEach(([r, c]) => lines.push(`  ${r}: ${c}`));
    }
  } else {
    lines.push('No data yet');
  }

  lines.push('8. S.E EGP — DRY RUN');
  lines.push('-'.repeat(70));
  if (egp) {
    lines.push(`Period:          ${ts(egp.firstCycle)} → ${ts(egp.lastCycle)}`);
    lines.push(`Total cycles:    ${egp.totalCycles}`);
    lines.push(`Current state:   ${egp.currentState}`);
    lines.push(`Composite score: ${egp.compositeScore}`);
    lines.push(`Divergence flag: ${egp.divergenceFlag ? 'YES ⚠️' : 'no'}`);
    lines.push('');
    lines.push(`CBE Rate:        ${egp.cbeRate}% (delta: ${egp.cbeRateDelta > 0 ? '+' : ''}${egp.cbeRateDelta}%)`);
    lines.push(`Inflation:       ${egp.inflation}% (delta: ${egp.inflationDelta > 0 ? '+' : ''}${egp.inflationDelta}%)`);
    lines.push(`Reserves:        $${egp.reserves}bn`);
    lines.push(`Brent:           $${egp.brentLevel}`);
    lines.push(`USD/EGP:         ${egp.usdEgpRate || '--'}`);
    lines.push(`Next CBE mtg:    ${egp.nextCbeMeeting}`);
    lines.push('');
    lines.push('State distribution:');
    Object.entries(egp.stateCounts || {}).forEach(([s, c]) => {
      lines.push(`  ${s.padEnd(16)} ${c} cycles (${(c/egp.totalCycles*100).toFixed(1)}%)`);
    });
  } else {
    lines.push('No data yet');
  }

  lines.push('');

  lines.push('PLATFORM SUMMARY');
  lines.push(divider2);
  lines.push(`CCE Crypto:      LIVE    | State: ${crypto?.currentState || '--'} | Return: ${pct(crypto?.portfolioReturn)}`);
  lines.push(`CCE Forex:       DRY RUN | Monitoring EUR/USD`);
  lines.push(`CCE REIT:        DRY RUN | State: ${rme?.currentState || '--'}`);
  lines.push(`CCE Stocks:      DRY RUN | State: ${cme?.currentState || '--'}`);
  lines.push(`CCE Commodities: DRY RUN | State: ${como?.currentState || '--'}`);
  lines.push(`T.E Grid:        DRY RUN | State: ${grid?.gridState || '--'} | Profit: $${grid?.totalProfit || '0.000000'}`);
  lines.push(`T.E Momentum:    DRY RUN | Trades: ${mom?.totalTrades || 0} | PnL: +$${mom?.totalProfit || '0.0000'}`);
  lines.push(`T.E Breakout:    DRY RUN | Squeezes: ${brk?.squeezeCount || 0} | Trades: ${brk?.totalTrades || 0}`);
  lines.push(`S.E EGP:         DRY RUN | State: ${egp?.currentState || '--'} | Divergence: ${egp?.divergenceFlag ? 'YES' : 'no'}`);

  // Live Sentinel status
  if (live?.sentinel) {
    const s = live.sentinel;
    lines.push('');
    lines.push('SENTINEL STATUS');
    lines.push('-'.repeat(70));
    lines.push(`Active anomalies: ${s.active_anomalies} (${s.alert_count} ALERT · ${s.warn_count} WARN · ${s.info_count} INFO)`);
    lines.push(`Total detected:   ${s.total_anomalies} across ${s.total_cycles} cycles`);
    if (s.active && s.active.length) {
      lines.push('');
      lines.push('Active:');
      s.active.forEach(a => {
        lines.push(`  [${a.severity}] ${a.rule_id} — ${a.title}`);
        if (a.detail) lines.push(`           ${a.detail}`);
      });
    } else {
      lines.push('Active:          None — all clear');
    }
  }

  // Live Grid status
  if (live?.grid) {
    const g = live.grid;
    lines.push('');
    lines.push('GRID LIVE STATUS');
    lines.push('-'.repeat(70));
    lines.push(`BTC Price:       $${Math.round(g.btc_price || 0).toLocaleString()}`);
    lines.push(`Centre:          $${Math.round(g.centre_price || 0).toLocaleString()}`);
    lines.push(`Open buys:       ${g.open_buys || 0}  |  Open sells: ${g.open_sells || 0}`);
    lines.push(`Completed:       ${g.completed_cycles || 0} cycles  |  Profit: $${(g.total_profit || 0).toFixed(4)}`);
  }

  // Live ticker
  if (live?.crypto) {
    const t = live.crypto;
    lines.push('');
    lines.push('LIVE MARKET');
    lines.push('-'.repeat(70));
    lines.push(`BTC:             $${(t.btc_price || 0).toLocaleString()} (24h: ${t.btc_change24 >= 0 ? '+' : ''}${t.btc_change24 || 0}%)`);
    lines.push(`Fear & Greed:    ${t.fear_greed} — ${t.fg_label || ''}`);
    lines.push(`As of:           ${new Date(t.timestamp).toLocaleTimeString()}`);
  }

  lines.push('');
  lines.push('"I wanted it. So I forged it. Now forge yours."');
  lines.push('— Giblets Creations');
  lines.push(divider);

  return lines.join('\n');
}

// ============================================================================
// CSV EXPORT
// ============================================================================

function generateCSV(data) {
  const files = {};

  // Crypto cycles CSV
  if (data.crypto.cycles.length) {
    const keys = Object.keys(data.crypto.cycles[0]);
    files['crypto_cycles.csv'] = [
      keys.join(','),
      ...data.crypto.cycles.map(row =>
        keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
      )
    ].join('\n');
  }

  // RME cycles CSV
  if (data.rme.cycles.length) {
    const keys = Object.keys(data.rme.cycles[0]);
    files['rme_cycles.csv'] = [
      keys.join(','),
      ...data.rme.cycles.map(row =>
        keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
      )
    ].join('\n');
  }

  // CME cycles CSV
  if (data.cme.cycles.length) {
    const keys = Object.keys(data.cme.cycles[0]);
    files['cme_cycles.csv'] = [
      keys.join(','),
      ...data.cme.cycles.map(row =>
        keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
      )
    ].join('\n');
  }

  // COMO cycles CSV
  if (data.como.cycles.length) {
    const keys = Object.keys(data.como.cycles[0]);
    files['como_cycles.csv'] = [
      keys.join(','),
      ...data.como.cycles.map(row =>
        keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
      )
    ].join('\n');
  }

  // State transitions CSV
  if (data.crypto.transitions.length) {
    const keys = Object.keys(data.crypto.transitions[0]);
    files['crypto_transitions.csv'] = [
      keys.join(','),
      ...data.crypto.transitions.map(row =>
        keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
      )
    ].join('\n');
  }


  // Grid completed CSV
  if (data.grid?.completed?.length) {
    const keys = Object.keys(data.grid.completed[0]);
    files['grid_completed.csv'] = [
      keys.join(','),
      ...data.grid.completed.map(row =>
        keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
      )
    ].join('\n');
  }

  return files;
}

// ============================================================================
// HTML REPORT
// ============================================================================

function generateHTML(data, crypto, rme, cme, como, grid, mom, brk, egp, live) {
  const ts  = d => d ? new Date(d).toLocaleString() : '--';
  const pct = v => v !== undefined ? `<span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v}%</span>` : '--';

  const stateTable = (counts, total) => {
    if (!counts) return '<p>No data</p>';
    return `<table><tr><th>State</th><th>Cycles</th><th>%</th></tr>` +
      Object.entries(counts).map(([s, n]) =>
        `<tr><td><span class="state">${s}</span></td><td>${n}</td><td>${(n/total*100).toFixed(1)}%</td></tr>`
      ).join('') + '</table>';
  };

  // Build chart data
  const cryptoChartData = data.crypto.cycles.map(c => ({
    t: c.timestamp?.substring(0,10),
    v: c.portfolio_value,
    b: c.btc_price,
    f: c.fear_greed
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CCE Platform — Analytics Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  :root {
    --bg: #080c12; --bg2: #0d1420; --border: #1a2d45;
    --accent: #00d4ff; --green: #39ff14; --gold: #ffc300;
    --red: #ff2d55; --orange: #ff6b35; --text: #c8d8e8; --dim: #4a6080;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'Share Tech Mono',monospace; font-size:13px; padding:24px; }
  h1 { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:900; letter-spacing:4px; color:var(--orange); margin-bottom:4px; }
  h2 { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; letter-spacing:3px; color:var(--dim); text-transform:uppercase; margin:24px 0 12px; border-bottom:1px solid var(--border); padding-bottom:8px; }
  h3 { font-size:11px; letter-spacing:3px; color:var(--dim); text-transform:uppercase; margin:16px 0 8px; }
  .meta { color:var(--dim); font-size:11px; margin-bottom:24px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; margin-bottom:24px; }
  .card { background:var(--bg2); border:1px solid var(--border); padding:16px; }
  .card-title { font-size:10px; letter-spacing:3px; color:var(--dim); text-transform:uppercase; margin-bottom:12px; }
  .big { font-size:28px; font-weight:bold; color:var(--text); }
  .sub { font-size:11px; color:var(--dim); margin-top:4px; }
  .pos { color:var(--green); }
  .neg { color:var(--red); }
  .state { color:var(--accent); font-size:11px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th { text-align:left; font-size:10px; letter-spacing:2px; color:var(--dim); padding:6px 8px; border-bottom:1px solid var(--border); }
  td { padding:6px 8px; border-bottom:1px solid rgba(26,45,69,0.4); font-size:12px; }
  tr:last-child td { border-bottom:none; }
  .chart-wrap { position:relative; height:220px; margin-top:12px; }
  .section { background:var(--bg2); border:1px solid var(--border); padding:20px; margin-bottom:16px; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .stat-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(26,45,69,0.3); }
  .stat-row:last-child { border-bottom:none; }
  .stat-label { color:var(--dim); font-size:11px; }
  .stat-val { color:var(--text); font-size:12px; }
  .engine-badge { display:inline-block; padding:2px 8px; border:1px solid; font-size:10px; letter-spacing:1px; margin-left:8px; }
  .live-badge { color:var(--green); border-color:var(--green); }
  .dry-badge  { color:var(--dim);   border-color:var(--border); }
  @media (max-width:600px) { .two-col { grid-template-columns:1fr; } }
</style>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@700;900&display=swap" rel="stylesheet">
</head>
<body>

<h1>CCE PLATFORM CORE</h1>
<div class="meta">Full Analytics Report · Generated: ${ts(data.generated)}</div>

<!-- SUMMARY CARDS -->
<div class="grid">
  <div class="card">
    <div class="card-title">Crypto State <span class="engine-badge live-badge">LIVE</span></div>
    <div class="big">${crypto?.currentState || '--'}</div>
    <div class="sub">Return: ${crypto?.portfolioReturn !== undefined ? (crypto.portfolioReturn >= 0 ? '+' : '') + crypto.portfolioReturn + '%' : '--'}</div>
    <div class="sub">Portfolio: $${crypto?.portfolioCurrent || '--'}</div>
  </div>
  <div class="card">
    <div class="card-title">BTC Price</div>
    <div class="big">$${crypto?.btcCurrent || '--'}</div>
    <div class="sub">Since launch: ${crypto?.btcChange !== undefined ? (crypto.btcChange >= 0 ? '+' : '') + crypto.btcChange + '%' : '--'}</div>
    <div class="sub">High: $${crypto?.btcHigh || '--'} · Low: $${crypto?.btcLow || '--'}</div>
  </div>
  <div class="card">
    <div class="card-title">Fear & Greed</div>
    <div class="big">${crypto?.currentFearGreed || '--'}</div>
    <div class="sub">Average since launch: ${crypto?.avgFearGreed || '--'}</div>
    <div class="sub">BTC Dominance: ${crypto?.btcDominance || '--'}%</div>
  </div>
  <div class="card">
    <div class="card-title">REIT State <span class="engine-badge dry-badge">DRY</span></div>
    <div class="big">${rme?.currentState || '--'}</div>
    <div class="sub">Fed: ${rme?.fedRateCurrent || '--'}% · 10Y: ${rme?.treasuryCurrent || '--'}%</div>
    <div class="sub">Spread: ${rme?.yieldSpread || '--'}%</div>
  </div>
  <div class="card">
    <div class="card-title">Stocks State <span class="engine-badge dry-badge">DRY</span></div>
    <div class="big">${cme?.currentState || '--'}</div>
    <div class="sub">SPY: $${cme?.spyCurrent || '--'} · VIX: ${cme?.vixCurrent || '--'}</div>
    <div class="sub">RSI: ${cme?.rsiCurrent || '--'}</div>
  </div>
  <div class="card">
    <div class="card-title">Commodities State <span class="engine-badge dry-badge">DRY</span></div>
    <div class="big">${como?.currentState || '--'}</div>
    <div class="sub">WTI: $${como?.oilCurrent || '--'} · Gold: $${como?.goldCurrent || '--'}</div>
    <div class="sub">DXY: ${como?.dxyCurrent || '--'}</div>
  </div>
</div>

<!-- CRYPTO SECTION -->
<h2>1. CCE Crypto <span class="engine-badge live-badge">LIVE</span></h2>
<div class="section">
  <div class="two-col">
    <div>
      <h3>Performance</h3>
      <div class="stat-row"><span class="stat-label">Period</span><span class="stat-val">${ts(crypto?.firstCycle)} → ${ts(crypto?.lastCycle)}</span></div>
      <div class="stat-row"><span class="stat-label">Total cycles</span><span class="stat-val">${crypto?.totalCycles || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Portfolio start</span><span class="stat-val">$${crypto?.portfolioStart || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Portfolio now</span><span class="stat-val">$${crypto?.portfolioCurrent || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Total return</span><span class="stat-val">${crypto?.portfolioReturn !== undefined ? (crypto.portfolioReturn >= 0 ? '+' : '') + crypto.portfolioReturn + '%' : '--'}</span></div>
      <div class="stat-row"><span class="stat-label">State transitions</span><span class="stat-val">${crypto?.transitions || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Trades executed</span><span class="stat-val">${crypto?.trades || 0}</span></div>
    </div>
    <div>
      <h3>Market Data</h3>
      <div class="stat-row"><span class="stat-label">BTC at launch</span><span class="stat-val">$${crypto?.btcStart || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">BTC current</span><span class="stat-val">$${crypto?.btcCurrent || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">BTC change</span><span class="stat-val">${crypto?.btcChange !== undefined ? (crypto.btcChange >= 0 ? '+' : '') + crypto.btcChange + '%' : '--'}</span></div>
      <div class="stat-row"><span class="stat-label">BTC high</span><span class="stat-val">$${crypto?.btcHigh || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">BTC low</span><span class="stat-val">$${crypto?.btcLow || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Avg Fear & Greed</span><span class="stat-val">${crypto?.avgFearGreed || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">BTC Dominance</span><span class="stat-val">${crypto?.btcDominance || '--'}%</span></div>
    </div>
  </div>
  <h3>State Distribution</h3>
  ${stateTable(crypto?.stateCounts, crypto?.totalCycles || 1)}
  <h3>Portfolio History</h3>
  <div class="chart-wrap"><canvas id="cryptoChart"></canvas></div>
</div>

<!-- REIT SECTION -->
<h2>2. CCE REIT <span class="engine-badge dry-badge">DRY RUN</span></h2>
<div class="section">
  <div class="two-col">
    <div>
      <h3>Rate Environment</h3>
      <div class="stat-row"><span class="stat-label">Cycles</span><span class="stat-val">${rme?.totalCycles || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Current state</span><span class="stat-val">${rme?.currentState || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Fed rate</span><span class="stat-val">${rme?.fedRateCurrent || '--'}% (was ${rme?.fedRateStart || '--'}%)</span></div>
      <div class="stat-row"><span class="stat-label">10Y Treasury</span><span class="stat-val">${rme?.treasuryCurrent || '--'}%</span></div>
      <div class="stat-row"><span class="stat-label">Yield spread</span><span class="stat-val">${rme?.yieldSpread || '--'}% (avg: ${rme?.avgSpread || '--'}%)</span></div>
    </div>
    <div>
      <h3>Signal Stats</h3>
      <div class="stat-row"><span class="stat-label">Fed cutting</span><span class="stat-val">${rme?.fedCuttingPct || 0}% of cycles</span></div>
      <div class="stat-row"><span class="stat-label">Spread favourable</span><span class="stat-val">${rme?.spreadFavPct || 0}% of cycles</span></div>
      <div class="stat-row"><span class="stat-label">Portfolio value</span><span class="stat-val">£${rme?.portfolioValue || '300.00'}</span></div>
    </div>
  </div>
  <h3>State Distribution</h3>
  ${stateTable(rme?.stateCounts, rme?.totalCycles || 1)}
</div>

<!-- STOCKS SECTION -->
<h2>3. CCE Stocks <span class="engine-badge dry-badge">DRY RUN</span></h2>
<div class="section">
  <div class="two-col">
    <div>
      <h3>SPY Data</h3>
      <div class="stat-row"><span class="stat-label">Cycles</span><span class="stat-val">${cme?.totalCycles || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Current state</span><span class="stat-val">${cme?.currentState || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">SPY at launch</span><span class="stat-val">$${cme?.spyStart || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">SPY current</span><span class="stat-val">$${cme?.spyCurrent || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">SPY change</span><span class="stat-val">${cme?.spyChange !== undefined ? (cme.spyChange >= 0 ? '+' : '') + cme.spyChange + '%' : '--'}</span></div>
      <div class="stat-row"><span class="stat-label">SMA50 / SMA200</span><span class="stat-val">$${cme?.sma50 || '--'} / $${cme?.sma200 || '--'}</span></div>
    </div>
    <div>
      <h3>Volatility</h3>
      <div class="stat-row"><span class="stat-label">VIX current</span><span class="stat-val">${cme?.vixCurrent || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">VIX average</span><span class="stat-val">${cme?.vixAvg || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">VIX high</span><span class="stat-val">${cme?.vixHigh || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">RSI current</span><span class="stat-val">${cme?.rsiCurrent || '--'} (avg: ${cme?.rsiAvg || '--'})</span></div>
      <div class="stat-row"><span class="stat-label">Golden cross</span><span class="stat-val">${cme?.goldenCrossPct || 0}% of cycles</span></div>
      <div class="stat-row"><span class="stat-label">Above SMA200</span><span class="stat-val">${cme?.aboveSma200Pct || 0}% of cycles</span></div>
    </div>
  </div>
  <h3>State Distribution</h3>
  ${stateTable(cme?.stateCounts, cme?.totalCycles || 1)}
</div>

<!-- COMMODITIES SECTION -->
<h2>4. CCE Commodities <span class="engine-badge dry-badge">DRY RUN</span></h2>
<div class="section">
  <div class="two-col">
    <div>
      <h3>Commodity Prices</h3>
      <div class="stat-row"><span class="stat-label">Cycles</span><span class="stat-val">${como?.totalCycles || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Current state</span><span class="stat-val">${como?.currentState || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">WTI Crude</span><span class="stat-val">$${como?.oilCurrent || '--'} (5d: ${como?.oilMom5d !== undefined ? (como.oilMom5d >= 0 ? '+' : '') + como.oilMom5d + '%' : '--'})</span></div>
      <div class="stat-row"><span class="stat-label">Gold</span><span class="stat-val">$${como?.goldCurrent || '--'} (5d: ${como?.goldMom5d !== undefined ? (como.goldMom5d >= 0 ? '+' : '') + como.goldMom5d + '%' : '--'})</span></div>
      <div class="stat-row"><span class="stat-label">Copper</span><span class="stat-val">$${como?.copperCurrent || '--'} (5d: ${como?.copMom5d !== undefined ? (como.copMom5d >= 0 ? '+' : '') + como.copMom5d + '%' : '--'})</span></div>
      <div class="stat-row"><span class="stat-label">DXY</span><span class="stat-val">${como?.dxyCurrent || '--'} (5d: ${como?.dxyMom5d !== undefined ? (como.dxyMom5d >= 0 ? '+' : '') + como.dxyMom5d + '%' : '--'})</span></div>
    </div>
    <div>
      <h3>Signal Stats</h3>
      <div class="stat-row"><span class="stat-label">Oil bullish</span><span class="stat-val">${como?.oilBullishPct || 0}% of cycles</span></div>
      <div class="stat-row"><span class="stat-label">DXY blocking</span><span class="stat-val">${como?.dxyStrongPct || 0}% of cycles</span></div>
      <div class="stat-row"><span class="stat-label">Gold following</span><span class="stat-val">${como?.goldFollowPct || 0}% of cycles</span></div>
      <div class="stat-row"><span class="stat-label">Portfolio value</span><span class="stat-val">£${como?.portfolioValue || '300.00'}</span></div>
    </div>
  </div>
  <h3>State Distribution</h3>
  ${stateTable(como?.stateCounts, como?.totalCycles || 1)}
</div>


<!-- GRID SECTION -->
<h2>5. T.E Grid <span class="engine-badge dry-badge">DRY RUN</span></h2>
<div class="section">
  <div class="two-col">
    <div>
      <h3>Performance</h3>
      <div class="stat-row"><span class="stat-label">Period</span><span class="stat-val">${ts(grid?.firstCycle)} → ${ts(grid?.lastCycle)}</span></div>
      <div class="stat-row"><span class="stat-label">Grid state</span><span class="stat-val">${grid?.gridState || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Centre price</span><span class="stat-val">$${grid?.centrePrice || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">BTC current</span><span class="stat-val">$${grid?.btcCurrent || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Portfolio</span><span class="stat-val">$${grid?.portfolioValue || '--'}</span></div>
      <div class="stat-row"><span class="stat-label">Total cycles</span><span class="stat-val">${grid?.totalCycles || 0}</span></div>
    </div>
    <div>
      <h3>Grid Stats</h3>
      <div class="stat-row"><span class="stat-label">Completed cycles</span><span class="stat-val">${grid?.completedCycles || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Total profit</span><span class="stat-val ${(grid?.totalProfit || 0) >= 0 ? 'pos' : 'neg'}">${(grid?.totalProfit || 0) >= 0 ? '+' : ''}$${grid?.totalProfit || '0.000000'}</span></div>
      <div class="stat-row"><span class="stat-label">Avg per cycle</span><span class="stat-val">$${grid?.avgProfit || '0.000000'}</span></div>
      <div class="stat-row"><span class="stat-label">Win rate</span><span class="stat-val">${grid?.winRate || 0}% (${grid?.wins || 0}W / ${grid?.losses || 0}L)</span></div>
      <div class="stat-row"><span class="stat-label">Open buys / sells</span><span class="stat-val">${grid?.openBuys || 0} / ${grid?.openSells || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Recentres / Stops</span><span class="stat-val">${grid?.recentres || 0} / ${grid?.stopEvents || 0}</span></div>
    </div>
  </div>
</div>

<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:24px;color:var(--dim);font-size:11px;">
  <div>CCE Platform Core v2.1.0 · Giblets Creations · ${new Date().getFullYear()}</div>
  <div style="margin-top:4px;font-style:italic;">"I wanted it. So I forged it. Now forge yours."</div>
</div>

<script>
const chartData = ${JSON.stringify(cryptoChartData)};
if (chartData.length) {
  new Chart(document.getElementById('cryptoChart'), {
    type: 'line',
    data: {
      labels: chartData.map(d => d.t),
      datasets: [
        {
          label: 'Portfolio ($)',
          data: chartData.map(d => d.v),
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0,212,255,0.05)',
          borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'BTC Price ($)',
          data: chartData.map(d => d.b),
          borderColor: '#ffc300',
          borderWidth: 1.5, fill: false, tension: 0.4, pointRadius: 0,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#4a6080', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#4a6080', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: '#1a2d45' } },
        y:  { position: 'left',  ticks: { color: '#4a6080' }, grid: { color: '#1a2d45' } },
        y1: { position: 'right', ticks: { color: '#4a6080' }, grid: { display: false } }
      }
    }
  });
}
</script>
</body>
</html>`;
}

// ============================================================================
// MAIN
// ============================================================================


function analyseGrid(cycles, completed, events) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];

  const profits = completed.map(c => c.net_profit || 0);
  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const wins  = profits.filter(p => p > 0).length;
  const losses = profits.filter(p => p < 0).length;

  const btcPrices = cycles.map(c => c.btc_price).filter(Boolean);
  const recentres = events.filter(e => e.event_type === 'RECENTRE').length;
  const stopEvents = events.filter(e => e.event_type === 'STOP_LOSS').length;

  return {
    totalCycles:     cycles.length,
    firstCycle:      first.timestamp,
    lastCycle:       latest.timestamp,
    gridState:       latest.grid_state,
    centrePrice:     latest.centre_price?.toFixed(2),
    btcCurrent:      latest.btc_price?.toFixed(2),
    openBuys:        latest.open_buys,
    openSells:       latest.open_sells,
    completedCycles: latest.completed_cycles || completed.length,
    totalProfit:     +totalProfit.toFixed(6),
    avgProfit:       completed.length ? +(totalProfit / completed.length).toFixed(6) : 0,
    wins,
    losses,
    winRate:         completed.length ? +(wins / completed.length * 100).toFixed(1) : 0,
    portfolioValue:  latest.portfolio_value?.toFixed(2),
    recentres,
    stopEvents,
    btcHigh:         btcPrices.length ? Math.max(...btcPrices).toFixed(2) : 0,
    btcLow:          btcPrices.length ? Math.min(...btcPrices).toFixed(2) : 0
  };
}


function analyseMOM(cycles, trades) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];
  const profits = trades.map(t => t.pnl_usdc || 0);
  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const wins   = profits.filter(p => p > 0).length;
  const losses = profits.filter(p => p <= 0).length;
  const pairs  = [...new Set(trades.map(t => t.pair))];
  return {
    totalCycles:    cycles.length,
    firstCycle:     first.timestamp,
    lastCycle:      latest.timestamp,
    portfolioValue: latest.portfolio_value?.toFixed(2),
    openPositions:  latest.open_positions || 0,
    totalTrades:    trades.length,
    wins, losses,
    winRate:        trades.length ? +(wins / trades.length * 100).toFixed(1) : 0,
    totalProfit:    +totalProfit.toFixed(4),
    avgProfit:      trades.length ? +(totalProfit / trades.length).toFixed(4) : 0,
    bestTrade:      profits.length ? +Math.max(...profits).toFixed(4) : 0,
    worstTrade:     profits.length ? +Math.min(...profits).toFixed(4) : 0,
    pairs:          pairs.join(', ') || 'BTC/ETH/SOL'
  };
}

function analyseBRK(cycles, trades, squeezes) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];
  const profits = trades.map(t => t.pnl_usdc || 0);
  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const wins   = profits.filter(p => p > 0).length;
  const losses = profits.filter(p => p <= 0).length;
  const squeezeCount = squeezes.length;
  const exitReasons = {};
  trades.forEach(t => {
    exitReasons[t.exit_reason] = (exitReasons[t.exit_reason] || 0) + 1;
  });
  return {
    totalCycles:    cycles.length,
    firstCycle:     first.timestamp,
    lastCycle:      latest.timestamp,
    portfolioValue: latest.portfolio_value?.toFixed(2),
    openPositions:  latest.open_positions || 0,
    totalTrades:    trades.length,
    wins, losses,
    winRate:        trades.length ? +(wins / trades.length * 100).toFixed(1) : 0,
    totalProfit:    +totalProfit.toFixed(4),
    avgProfit:      trades.length ? +(totalProfit / trades.length).toFixed(4) : 0,
    bestTrade:      profits.length ? +Math.max(...profits).toFixed(4) : 0,
    squeezeCount,
    exitReasons
  };
}

function analyseEGP(cycles, transitions) {
  if (!cycles.length) return null;
  const latest = cycles[cycles.length - 1];
  const first  = cycles[0];
  const states = {};
  cycles.forEach(c => { states[c.state] = (states[c.state] || 0) + 1; });
  const divergenceCount = cycles.filter(c => c.divergence_flag).length;
  return {
    totalCycles:      cycles.length,
    firstCycle:       first.timestamp,
    lastCycle:        latest.timestamp,
    currentState:     latest.state,
    compositeScore:   latest.composite_score,
    divergenceFlag:   !!latest.divergence_flag,
    cbeRate:          latest.cbe_rate,
    cbeRateDelta:     latest.cbe_rate_delta,
    inflation:        latest.inflation,
    inflationDelta:   latest.inflation_delta,
    reserves:         latest.reserves,
    brentLevel:       latest.brent_level?.toFixed(2),
    usdEgpRate:       latest.usd_egp_rate?.toFixed(4),
    reason:           latest.reason,
    nextCbeMeeting:   latest.next_cbe_meeting,
    divergencePct:    +(divergenceCount / cycles.length * 100).toFixed(0),
    transitions:      transitions.length,
    stateCounts:      states
  };
}

async function main() {
  console.log('\n📊 CCE Platform Core — Analytics Report Generator');
  console.log('='.repeat(50));

  const data  = await collectAllData();
  const live  = await fetchAllLiveStatus();

  const crypto = analyseCrypto(data.crypto.cycles, data.crypto.transitions, data.crypto.trades, live.crypto);
  const rme    = analyseRME(data.rme.cycles);
  const cme    = analyseCME(data.cme.cycles);
  const como   = analyseCOMO(data.como.cycles);
  const grid   = analyseGrid(data.grid?.cycles || [], data.grid?.completed || [], data.grid?.events || []);
  const mom    = analyseMOM(data.mom?.cycles || [], data.mom?.trades || []);
  const brk    = analyseBRK(data.brk?.cycles || [], data.brk?.trades || [], data.brk?.squeezes || []);
  const egp    = analyseEGP(data.egp?.cycles || [], data.egp?.transitions || []);

  const outDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  // TXT
  const txt = generateTXT(data, crypto, rme, cme, como, grid, mom, brk, egp, live);
  fs.writeFileSync(path.join(outDir, `cce-report-${stamp}.txt`), txt);
  console.log(`\n✅ TXT report saved: reports/cce-report-${stamp}.txt`);

  // CSV
  const csvFiles = generateCSV(data);
  const csvDir   = path.join(outDir, `csv-${stamp}`);
  fs.mkdirSync(csvDir, { recursive: true });
  Object.entries(csvFiles).forEach(([name, content]) => {
    fs.writeFileSync(path.join(csvDir, name), content);
  });
  console.log(`✅ CSV files saved: reports/csv-${stamp}/ (${Object.keys(csvFiles).length} files)`);

  // HTML
  const html = generateHTML(data, crypto, rme, cme, como, grid, mom, brk, egp, live);
  fs.writeFileSync(path.join(outDir, `cce-report-${stamp}.html`), html);
  console.log(`✅ HTML report saved: reports/cce-report-${stamp}.html`);

  console.log('\n📁 All reports in: ~/cce-crypto/reports/');
  console.log('='.repeat(50));
}

main().catch(console.error);

