# Engine Template
### CCE Core Framework · Build Guide

---

## Quick Start

1. Copy this folder: `cp -r engines/_template engines/te-myengine`
2. Update `manifest.json` — set id, name, type, ecosystem, cycle
3. Update the `PREFIX` constant in `engine.js`
4. Update the `STATE` enum with your states
5. Implement the three required methods in `engine.js`
6. Implement the four FSM methods in `strategy.js`
7. Add your config block to `config.js`
8. Run in dry run for minimum 7 cycles
9. Check against the contract checklist in `CCE_ENGINE_CONTRACT.md`

---

## What to Implement

### engine.js — Three methods

**`_fetchData()`**
Fetch market data. Return a plain object or null on failure.
```javascript
async _fetchData() {
  const ticker = await this.exchange.fetchTicker('BTC/USDC');
  return { price: ticker.last, volume: ticker.baseVolume };
}
```

**`_evaluateSignals(data)`**
Compute signals from data. Return a plain object.
```javascript
_evaluateSignals(data) {
  return {
    priceAboveSma: data.price > data.sma20,
    volumeSpike:   data.volume > data.avgVolume * 1.5
  };
}
```

**`_executeDecision(signals, data)`**
Act on the current state. Always check `this.dryRun` first.
```javascript
async _executeDecision(signals, data) {
  if (this.currentState !== STATE.ACTIVE) return;
  if (this.dryRun) {
    console.log('[PREFIX] DRY RUN — would buy here');
    return;
  }
  await this.exchange.createOrder('BTC/USDC', 'market', 'buy', qty);
}
```

### strategy.js — Four methods

- `_entryConditionBuilding(signals)` — conditions starting to form
- `_entryConditionMet(signals)` — all conditions aligned, deploy capital
- `_conditionsDeteriorated(signals)` — retreat to DORMANT
- `_exitConditionMet(signals, data)` — close position

---

## Config Block

Add this to `config.js`:

```javascript
myEngine: {
  enabled:         true,
  dryRun:          true,      // ALWAYS default to true
  capitalUSDC:     100,
  intervalMinutes: 5,
  maxDailyLoss:    0.03,
  // your engine-specific params here
}
```

---

## States

Rename the STATE enum to match your engine's behaviour.
Minimum required:

- One resting state (equivalent to DORMANT)
- At least two active states
- One emergency exit state

---

## Rules

- Default to `dryRun: true` — always
- All config values from `config` object — never hardcoded
- All state transitions logged to storage
- All transitions sent via notifier with `[PREFIX]` prefix
- `getStatus()` returns a plain object — no circular references
- `getState()` returns current state string

---

*CCE Core Framework · Giblets Creations*
*"I wanted it. So I forged it. Now forge yours."*
