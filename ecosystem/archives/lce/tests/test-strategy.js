// tests/test-strategy.js — LCE Strategy Tests

const { Strategy, STATES } = require('../src/strategy');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

// ── Mock data helpers ────────────────────────────────────────────────────────

function makeSnapshot(symbol, liq5mUsd = 0, liq15mUsd = 0, oiDrop = 0, rsi = 50, momentum = 0) {
  return {
    symbol,
    liq5m: { totalLiqUsd: liq5mUsd, longLiqUsd: liq5mUsd * 0.7, shortLiqUsd: liq5mUsd * 0.3, dominantSide: 'LONG' },
    liq15m: { totalLiqUsd: liq15mUsd, dominantSide: 'LONG' },
    oi: { dropPct: oiDrop },
    price: { rsi, momentumPct: momentum, price: 50000 },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n[LCE] Running strategy tests...\n');

// Test 1: Starts in DORMANT
{
  const s = new Strategy();
  assert(s.state === STATES.DORMANT, 'Initialises in DORMANT state');
}

// Test 2: Stays DORMANT with no liquidation signal
{
  const s = new Strategy();
  const snaps = [makeSnapshot('BTC/USDT', 100_000)]; // Only $100k — below threshold
  const d = s.evaluate(snaps);
  assert(d.state === STATES.DORMANT, 'Stays DORMANT below liquidation threshold');
  assert(d.action === 'DORMANT', 'Action is DORMANT with no signal');
}

// Test 3: Moves to STALKING when large liquidation spike detected
{
  const s = new Strategy();
  const snaps = [makeSnapshot('BTC/USDT', 10_000_000)]; // $10M > $5M threshold
  const d = s.evaluate(snaps);
  assert(d.state === STATES.STALKING, 'Transitions to STALKING on liquidation spike');
  assert(d.action === 'STALKING', 'Action is STALKING');
}

// Test 4: Confirms cascade with all signals met
{
  const s = new Strategy();
  // First cycle: spike detected → STALKING
  s.evaluate([makeSnapshot('BTC/USDT', 10_000_000)]);
  // Second cycle: cascade confirmed
  const confirmSnap = makeSnapshot('BTC/USDT', 10_000_000, 25_000_000, 2.0, 55, 0.5);
  const d = s.evaluate([confirmSnap]);
  assert(d.state === STATES.TRIGGERED, 'Transitions to TRIGGERED on confirmed cascade');
  assert(d.action === 'ENTER', 'Action is ENTER on confirmation');
}

// Test 5: Trade side logic — LONG liq cascade → SELL trade (ride the drop)
{
  const s = new Strategy();
  const snap = makeSnapshot('BTC/USDT', 10_000_000, 25_000_000, 2.0, 55, 0.5);
  snap.liq5m.dominantSide = 'LONG'; // Longs being liquidated
  s.evaluate([snap]);
  assert(s.stalkedSide === 'SELL', 'Long liquidation cascade → SELL side trade');
}

// Test 6: RSI filter blocks entry on extreme RSI
{
  const s = new Strategy();
  s.evaluate([makeSnapshot('BTC/USDT', 10_000_000)]); // Enter stalking
  // Try to confirm with RSI too high
  const highRsiSnap = makeSnapshot('BTC/USDT', 10_000_000, 25_000_000, 2.0, 85, 0.5); // RSI 85 > max 75
  const d = s.evaluate([highRsiSnap]);
  assert(d.action !== 'ENTER', 'RSI filter blocks entry when RSI > max');
}

// Test 7: Circuit breaker halts engine
{
  const s = new Strategy();
  s.dailyPnlPct = -3.5; // Below -3% threshold
  const d = s.evaluate([makeSnapshot('BTC/USDT', 10_000_000)]);
  assert(d.action === 'CIRCUIT_BREAKER', 'Circuit breaker activates on -3%+ daily loss');
}

// Test 8: Position management
{
  const s = new Strategy();
  const pos = { symbol: 'BTC/USDT', side: 'SELL', entryPrice: 50000, qty: 0.01, sizeUsd: 500, stopLoss: 50400, takeProfit: 49200, openedAt: Date.now() };
  s.setPosition(pos);
  assert(s.activePosition !== null, 'setPosition stores position');
  s.clearPosition();
  assert(s.activePosition === null, 'clearPosition clears position');
}

// Test 9: Take profit exit
{
  const s = new Strategy();
  s._transition(STATES.RIDING);
  s.activePosition = {
    symbol: 'BTC/USDT', side: 'BUY', entryPrice: 50000, qty: 0.01,
    sizeUsd: 500, stopLoss: 49600, takeProfit: 50800, openedAt: Date.now(),
  };
  const snaps = [makeSnapshot('BTC/USDT', 0, 0, 0, 50, 0)];
  snaps[0].price.price = 50900; // Above TP of 50800
  const d = s.evaluate(snaps);
  assert(d.action === 'EXIT', 'Exits position on take profit hit');
  assert(d.reason === 'TAKE_PROFIT', 'Exit reason is TAKE_PROFIT');
}

// Test 10: Stop loss exit
{
  const s = new Strategy();
  s._transition(STATES.RIDING);
  s.activePosition = {
    symbol: 'BTC/USDT', side: 'BUY', entryPrice: 50000, qty: 0.01,
    sizeUsd: 500, stopLoss: 49600, takeProfit: 50800, openedAt: Date.now(),
  };
  const snaps = [makeSnapshot('BTC/USDT', 0, 0, 0, 50, 0)];
  snaps[0].price.price = 49500; // Below SL of 49600
  const d = s.evaluate(snaps);
  assert(d.action === 'EXIT', 'Exits position on stop loss hit');
  assert(d.reason === 'STOP_LOSS', 'Exit reason is STOP_LOSS');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('');
console.log(`[LCE] Tests complete: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('[LCE] ✅ All tests passed — engine ready for dry run');
} else {
  console.log('[LCE] ❌ Fix failures before deploying');
  process.exit(1);
}
