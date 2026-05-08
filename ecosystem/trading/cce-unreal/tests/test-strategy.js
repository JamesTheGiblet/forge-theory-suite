// tests/test-strategy.js
// Unit tests for CCE strategy components
// Run: node tests/test-strategy.js

'use strict';

const assert = require('assert');
const {
  TechnicalSignals,
  SentimentSignals,
  ZombieScanner,
  CCERebalancer,
  CCEStateMachine
} = require('../src/strategy');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`   ✅ ${description}`);
    passed++;
  } catch (err) {
    console.error(`   ❌ ${description}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

function assertClose(actual, expected, tolerance = 0.0001, message = '') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new assert.AssertionError({
      message: message || `Expected ${actual} to be within ${tolerance} of ${expected} (diff: ${diff})`,
      actual,
      expected,
      operator: 'assertClose'
    });
  }
}

// ============================================================================
// 1. TechnicalSignals
// ============================================================================
console.log('\n1️⃣  TechnicalSignals');

const techSignals = new TechnicalSignals();
const flatPrices    = Array(100).fill(50000);
const risingPrices  = Array(100).fill(0).map((_, i) => 1000 + i * 10); // 1000→1990

test('SMA of flat data returns correct value', () => {
  assert.strictEqual(techSignals.calculateSMA(flatPrices, 10), 50000);
});

test('SMA returns 0 for insufficient data', () => {
  assert.strictEqual(techSignals.calculateSMA([1, 2, 3], 10), 0);
});

test('SMA returns 0 for empty array', () => {
  assert.strictEqual(techSignals.calculateSMA([], 10), 0);
});

test('btc_above_20_sma is true when price exceeds SMA20', () => {
  // risingPrices last = 1990, SMA20 ≈ 1895 — price 2000 > SMA20
  const result = techSignals.getAllSignals(2000, 55, risingPrices);
  assert.strictEqual(result.btc_above_20_sma, true);
});

test('btc_above_20_sma is false when price is below SMA20', () => {
  // Price well below the rising series average
  const result = techSignals.getAllSignals(500, 55, risingPrices);
  assert.strictEqual(result.btc_above_20_sma, false);
});

test('btc_consolidating defaults to false (wide bands) on insufficient data', () => {
  // With no data, bbWidth defaults to 1 (wide), so consolidating should be false
  const result = techSignals.getAllSignals(50000, 55, []);
  assert.strictEqual(result.btc_consolidating, false);
});

test('sma_20_above_50 is true on rising price series', () => {
  const result = techSignals.getAllSignals(2000, 55, risingPrices);
  assert.strictEqual(result.sma_20_above_50, true);
});

test('getAllSignals handles missing price gracefully', () => {
  const result = techSignals.getAllSignals(0, 55, flatPrices);
  assert.strictEqual(typeof result.btc_above_20_sma, 'boolean');
});

// ============================================================================
// 2. SentimentSignals
// ============================================================================
console.log('\n2️⃣  SentimentSignals');

const sentiment = new SentimentSignals();

test('Default score is 50 when no data', () => {
  assert.strictEqual(sentiment.getSentimentScore({}), 50);
});

test('Uses Fear & Greed directly when no LunarCrush', () => {
  assert.strictEqual(
    sentiment.getSentimentScore({ fear_greed_index: { value: 80 } }),
    80
  );
});

test('Weighted blend: 70% F&G + 30% Galaxy Score', () => {
  // F&G: 80, Galaxy: 40 → (80 × 0.7) + (40 × 0.3) = 56 + 12 = 68
  const score = sentiment.getSentimentScore({
    fear_greed_index: { value: 80 },
    lunarcrush:       { galaxy_score: 40 }
  });
  assertClose(score, 68, 0.01, `Expected 68, got ${score}`);
});

test('Handles null/missing lunarcrush gracefully', () => {
  const score = sentiment.getSentimentScore({
    fear_greed_index: { value: 60 },
    lunarcrush:       null
  });
  assert.strictEqual(score, 60);
});

// ============================================================================
// 3. ZombieScanner
// ============================================================================
console.log('\n3️⃣  ZombieScanner');

const scanner = new ZombieScanner({});

test('Detects asset with price 0 as zombie', () => {
  const zombies = scanner.scan({ eth_price: 3000, sol_price: 100, rndr_price: 0, fet_price: 2 });
  assert.ok(zombies.includes('RNDR'), 'RNDR (price 0) should be zombie');
});

test('Does not flag assets with valid prices', () => {
  const zombies = scanner.scan({ eth_price: 3000, sol_price: 100, rndr_price: 0, fet_price: 2 });
  assert.ok(!zombies.includes('ETH'));
  assert.ok(!zombies.includes('SOL'));
  assert.ok(!zombies.includes('FET'));
});

test('Flags all assets as zombies when all prices are 0', () => {
  const zombies = scanner.scan({ eth_price: 0, sol_price: 0, rndr_price: 0, fet_price: 0 });
  assert.strictEqual(zombies.length, 4);
});

test('Flags asset with NaN price as zombie', () => {
  const zombies = scanner.scan({ eth_price: NaN, sol_price: 100, rndr_price: 5, fet_price: 2 });
  assert.ok(zombies.includes('ETH'));
});

test('Returns empty array when all prices are valid', () => {
  const zombies = scanner.scan({ eth_price: 3000, sol_price: 100, rndr_price: 5, fet_price: 2 });
  assert.strictEqual(zombies.length, 0);
});

// ============================================================================
// 4. CCERebalancer
// ============================================================================
console.log('\n4️⃣  CCERebalancer');

const rebalancer = new CCERebalancer();
const prices100k = { BTC: 100000, ETH: 3000, SOL: 100, RNDR: 5, FET: 2, USD: 1 };

test('IGNITION generates BTC buy action from all-cash portfolio', () => {
  const { actions } = rebalancer.rebalanceForState(
    { USD: 1000, BTC: 0 },
    'IGNITION',
    { BTC: 50000, USD: 1 },
    []
  );
  const buy = actions.find(a => a.symbol === 'BTC' && a.action === 'buy');
  assert.ok(buy, 'Should generate BTC buy action');
  assertClose(buy.amount, 0.02, 0.0001, `Expected 0.02 BTC, got ${buy.amount}`);
});

test('DORMANT generates no trade actions (target is cash)', () => {
  const { actions } = rebalancer.rebalanceForState(
    { USD: 1000, BTC: 0 },
    'DORMANT',
    { BTC: 50000, USD: 1 },
    []
  );
  assert.strictEqual(actions.length, 0, 'DORMANT should require no trades when already in cash');
});

test('Zombie asset is skipped for BUY in CASCADE_2', () => {
  const { actions } = rebalancer.rebalanceForState(
    { USD: 1000, BTC: 0 },
    'CASCADE_2',
    prices100k,
    ['RNDR']
  );
  const rndrAction = actions.find(a => a.symbol === 'RNDR');
  assert.strictEqual(rndrAction, undefined, 'Should not trade RNDR if flagged as zombie');
});

test('minTradeValue prevents dust trades', () => {
  // Portfolio value $1010 — difference to target is tiny, below default $10 minimum
  const smallRebalancer = new CCERebalancer({ trading: { minTradeValue: 100 } });
  const { actions } = smallRebalancer.rebalanceForState(
    { USD: 505, BTC: 0.000001 }, // BTC value ≈ $0.05 — diff is trivially small
    'ACCUMULATION',
    { BTC: 50000, USD: 1 },
    []
  );
  // BTC target 25% of ~$505 = ~$126. Current ~$0.05. Diff ~$125.95 — above $100 threshold.
  // USD target 75% = ~$379. Current ~$505. Diff ~$125 — but cash is skipped in rebalancer.
  // So BTC buy should still fire. Test confirms threshold is respected, not that no trades happen.
  actions.forEach(a => {
    assert.ok(a.value >= 100, `Trade value $${a.value.toFixed(2)} is below minTradeValue $100`);
  });
});

test('EXTRACTION generates sell actions from BTC-heavy portfolio', () => {
  const { actions } = rebalancer.rebalanceForState(
    { USD: 0, BTC: 0.02 },
    'EXTRACTION',
    { BTC: 50000, USD: 1 },
    []
  );
  const sell = actions.find(a => a.symbol === 'BTC' && a.action === 'sell');
  assert.ok(sell, 'Should generate BTC sell action for EXTRACTION (target: 100% cash)');
});

// ============================================================================
// 5. CCEStateMachine
// ============================================================================
console.log('\n5️⃣  CCEStateMachine');

// Each state machine test gets a fresh instance to prevent shared state corruption
function makeSM(config = {}) {
  return new CCEStateMachine({ minDormantDays: 14, ...config });
}

function makeContext(overrides = {}) {
  return {
    currentTimestamp: new Date(),
    btcPrice:         50000,
    btcDominance:     55,
    fearGreedIndex:   65,
    etfFlows7d:       1000000,
    portfolioValue:   1000,
    signals: {
      btc_below_key_support:    false,
      btc_above_20_sma:         true,
      sma_20_above_50:          true,
      sma_10_above_20:          true,
      btc_consolidating:        true,
      btc_d_topping:            true,
      btc_d_rsi_below_70:       true,
      btc_below_10_sma:         false,
      btc_5_percent_drop:       false,
      btc_was_strong_3d_ago:    false,
      btc_was_strong_7d_ago:    false,
      velocity_underperforming_btc_72h: false,
      velocity_reversal:              false,
      velocity_asset_breaking_out:    false,
      multiplier_underperforming_48h: false,
      multiplier_rsi_above_85:        false,
      btc_d_rising_sharply:           false,
      alt_season_index_above_75:      false
    },
    ...overrides
  };
}

test('DORMANT → ACCUMULATION via F&G sentiment override (F&G ≥ 60 bypasses day count)', () => {
  const sm  = makeSM();
  const ctx = makeContext({ fearGreedIndex: 65 });
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, true);
  assert.strictEqual(t.to, 'ACCUMULATION');
});

test('DORMANT stays DORMANT when day count not met and F&G < 60', () => {
  const sm  = makeSM({ minDormantDays: 30 });
  const ctx = makeContext({ fearGreedIndex: 50 });
  // stateEnteredAt defaults to now — 0 days elapsed, well below 30
  const t = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, false);
  assert.strictEqual(sm.currentState, 'DORMANT');
});

test('DORMANT → ACCUMULATION via day count path (F&G between 41-59)', () => {
  const sm = makeSM({ minDormantDays: 14 });
  // Backdate stateEnteredAt to simulate 15 days elapsed
  sm.stateEnteredAt = new Date(Date.now() - 15 * 86400000);
  const ctx = makeContext({ fearGreedIndex: 50 });
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, true);
  assert.strictEqual(t.to, 'ACCUMULATION');
});

test('ACCUMULATION → IGNITION when all conditions met', () => {
  const sm  = makeSM();
  sm.currentState   = 'ACCUMULATION';
  sm.stateEnteredAt = new Date(Date.now() - 86400000);
  const ctx = makeContext({ fearGreedIndex: 65, etfFlows7d: 1000000 });
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, true);
  assert.strictEqual(t.to, 'IGNITION');
});

test('ACCUMULATION → DORMANT when BTC loses 20 SMA (failure)', () => {
  const sm  = makeSM();
  sm.currentState   = 'ACCUMULATION';
  sm.stateEnteredAt = new Date(Date.now() - 86400000);
  const ctx = makeContext({
    signals: { ...makeContext().signals, btc_above_20_sma: false }
  });
  const t = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, true);
  assert.strictEqual(t.to, 'DORMANT');
});

test('IGNITION trailing stop fires → ANCHOR', () => {
  const sm  = makeSM();
  sm.currentState         = 'IGNITION';
  sm.stateEnteredAt       = new Date(Date.now() - 5 * 86400000);
  sm.ignitionHighWaterMark = 60000;
  // Drop > 2.1% from 60k HWM (threshold: 0.021) — 53000 is ~11.7% drop
  const ctx = makeContext({ btcPrice: 53000, fearGreedIndex: 65 });
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, true);
  assert.strictEqual(t.to, 'ANCHOR');
});

test('IGNITION take profit fires at extreme greed (F&G > 90) → ANCHOR', () => {
  const sm  = makeSM();
  sm.currentState   = 'IGNITION';
  sm.stateEnteredAt = new Date(Date.now() - 5 * 86400000);
  const ctx = makeContext({ fearGreedIndex: 95, btcPrice: 65000 });
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, true);
  assert.strictEqual(t.to, 'ANCHOR');
});

test('IGNITION stays in grace period — no exit within minHoldDays for non-catastrophic signal', () => {
  const sm  = makeSM();
  sm.currentState   = 'IGNITION';
  sm.stateEnteredAt = new Date(); // Just entered — 0 days elapsed
  // Non-catastrophic (F&G = 25, not < 20) — should not exit during grace period
  const ctx = makeContext({ fearGreedIndex: 25, btcPrice: 50000 });
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, false);
});

test('State machine reports no transition when conditions not met', () => {
  const sm  = makeSM({ minDormantDays: 30 });
  const ctx = makeContext({ fearGreedIndex: 30 }); // F&G too low, day count not met
  const t   = sm.evaluateTransition(ctx);
  assert.strictEqual(t.transitioned, false);
});

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(50));
if (failed === 0) {
  console.log(`🎉 ALL ${passed} TESTS PASSED`);
} else {
  console.log(`⚠️  ${passed} passed, ${failed} FAILED`);
  process.exit(1);
}