# AI Layer Template
### CCE Core Framework · Build Guide

---

## The Golden Rule

**AI layers NEVER affect engine behaviour.**

- ✅ Read engine state via `getState()` and `getStatus()`
- ✅ Write to your own storage
- ✅ Send Telegram alerts via notifier
- ✅ Write recommendations to the shared store
- ❌ NEVER call engine methods that change state
- ❌ NEVER write to engine databases
- ❌ NEVER modify engine config at runtime

This is enforced architecturally. Layers hold read-only references to engines.

---

## Quick Start

```bash
cce new-layer my-layer-name
```

Or manually:
```bash
cp -r ai-layers/_template ai-layers/my-layer-name
```

Then:
1. Update `manifest.json`
2. Update `PREFIX` in `layer.js`
3. Choose your pattern and implement it
4. Update storage schema if needed

---

## Three Patterns

### OBSERVER — Snapshot and record
Use when: you want to build a dataset over time.
Implement: nothing extra — `_snapshotEngines()` is ready to use.
Example: log all engine states every 15 minutes with market context.

```javascript
async _run() {
  await this._run_observer();
}
```

### ANALYST — Read, pattern-match, recommend
Use when: you have accumulated data and want to generate intelligence.
Implement: `_analysePatterns(history)` and `_generateRecommendations(patterns)`.
Example: identify which market conditions precede state transitions.

```javascript
async _run() {
  await this._run_analyst();
}
```

### SENTINEL — Detect anomalies, fire alerts
Use when: you want to monitor for specific dangerous or unusual conditions.
Implement: `_detectAnomalies(snapshot)`.
Example: alert when multiple engines are in high-risk states simultaneously.

```javascript
async _run() {
  await this._run_sentinel();
}

_detectAnomalies(snapshot) {
  const anomalies = [];

  // Example rule: multiple engines in risky states
  const riskyStates = ['CAUTION', 'ALERT', 'EXTRACTION'];
  const riskyEngines = Object.entries(snapshot)
    .filter(([, s]) => riskyStates.includes(s.state))
    .map(([id]) => id);

  if (riskyEngines.length >= 3) {
    anomalies.push({
      ruleId:   'multi-engine-risk',
      severity: 'ALERT',
      title:    'Multiple engines in risky states',
      detail:   `Engines at risk: ${riskyEngines.join(', ')}`
    });
  }

  return anomalies;
}
```

---

## Hooks

Hooks fire automatically when engine events occur.
They're called by the Layer Registry — you don't need to poll.

```javascript
// After every engine cycle
async onPostCycle(engineId, status, cycleData) { }

// On every state transition
async onTransition(engineId, from, to, signals) { }

// When signals are evaluated
async onSignal(engineId, signals) { }
```

---

## manifest.json Fields

| Field | Options | Description |
|-------|---------|-------------|
| `pattern` | `OBSERVER` `ANALYST` `SENTINEL` | Which pattern |
| `hook` | `post_cycle` `on_transition` `on_signal` `scheduled` | When to fire |
| `attaches_to` | `["S.E", "T.E", "O.E"]` | Which ecosystems |
| `interval_minutes` | integer | For scheduled layers |

---

## Rules

- Read-only access to engines — always
- Never write to engine databases
- Prefix all Telegram messages with `[YOUR-ID]`
- Handle errors gracefully — one bad cycle must not crash the layer
- `getStatus()` must return a plain object

---

*CCE Core Framework · Giblets Creations*
*"I wanted it. So I forged it. Now forge yours."*
