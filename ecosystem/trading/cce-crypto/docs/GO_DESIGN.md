# G.O — Grand Orchestrator
### CCE Core Framework · v1.0 · Giblets Creations · March 2026
**Status: 🟢 LIVE — ADVISORY mode, DRY RUN, baseline cycle 1/24**

---

> *"The S.E Ecosystem trades. The T.E Ecosystem harvests. The O.E Ecosystem remembers.  
> G.O decides."*

---

## 1. What Is G.O?

G.O is the fourth and final layer of the CCE intelligence stack. It sits above all three ecosystems — Strategic, Tactical, and Observer — reading the accumulated intelligence produced by the O.E layer and acting on it autonomously.

Where the O.E Strategist **recommends**, G.O **acts**.

G.O does not trade. It does not place orders. It does not override engine logic. It manages **capital allocation** across the platform — deciding how much capital each engine is permitted to deploy, when to scale up a performing engine, and when to constrain an underperforming one.

The engines remain sovereign in their own domain. G.O only controls the ceiling.

---

## 2. Position in the Intelligence Stack

```
LAYER 4   G.O Orchestrator      Acts on recommendations. Sets capital ceilings.
             ↑ reads
LAYER 3   O.E Strategist        Analyses patterns. Generates recommendations.
             ↑ reads
LAYER 2   O.E Sentinel          Detects anomalies. Fires alerts.
             ↑ reads
LAYER 1   O.E Observer          Watches everything. Records everything.
             ↑ reads (read-only)
          S.E · T.E Engines     Trade. Harvest. Operate independently.
```

G.O is the only layer that **writes back** to the platform. Every other O.E layer is read-only. G.O's writes are limited to capital ceiling adjustments — it never touches engine state, engine config, or engine databases.

---

## 3. The Three Autonomy Levels

G.O implements a tiered autonomy model. Each tier has defined permissions and constraints.

### Tier 1 — ADVISORY (current implementation)
G.O computes optimal capital allocations and logs them as recommendations.
No automatic action. Operator reviews and applies manually.

```
Permissions: read all engine status, write to recommendations store
Constraints: zero platform changes without human approval
Activation:  96+ Observer cycles (same as Strategist)
```

### Tier 2 — SOFT INFLUENCE
G.O adjusts capital ceilings per engine — the maximum capital an engine is permitted to deploy. Engines remain in their current state; only their deployment ceiling changes.

```
Permissions: set capital ceilings per engine (±20% max single adjustment)
Constraints: cannot reduce any engine below 20% of its configured capital
             cannot increase any engine above 200% of its configured capital
             maximum one ceiling adjustment per engine per 24 hours
             all adjustments logged and reversible
Activation:  200+ Observer cycles AND Strategist enabled AND operator opt-in
```

### Tier 3 — HARD CONTROL
G.O can pause and resume engines based on platform-wide conditions. This is reserved for emergency scenarios — multiple engines simultaneously in high-risk states, extreme market anomalies, or Sentinel ALERT conditions.

```
Permissions: pause/resume individual engines
             force engines to DORMANT state in emergency
Constraints: cannot pause S.E Crypto (live engine) without operator confirmation
             cannot pause more than 50% of engines simultaneously
             pause duration maximum 24 hours (auto-resume)
             all pause events trigger immediate Telegram notification
Activation:  operator explicit enable only — off by default
```

**Current implementation: Tier 1 only (ADVISORY)**
Tiers 2 and 3 are scaffolded but locked behind explicit configuration flags.

---

## 4. The Capital Ceiling Model

Capital ceilings are the primary mechanism by which G.O influences the platform.

Each engine has:
- `configured_capital` — the capital set in config.js (e.g. $291.70 for S.E Crypto)
- `ceiling_pct` — G.O's ceiling as a percentage of configured capital (default 100%)
- `effective_capital` — configured_capital × ceiling_pct

When G.O adjusts a ceiling, the engine's next rebalance cycle respects the new effective capital. The engine does not know the ceiling was adjusted — it simply sees a different capital figure.

```javascript
// Engine reads this on each cycle:
const effectiveCapital = config.trading.startingCapital * goCeiling.pct;

// G.O writes this to the shared ceiling store:
goCeilings = {
  'crypto':   { pct: 1.20, reason: 'Strong momentum pattern', adjusted_at: '...' },
  'grid':     { pct: 0.80, reason: 'Grid efficiency declining', adjusted_at: '...' },
  'momentum': { pct: 1.00, reason: 'No adjustment needed', adjusted_at: '...' }
}
```

---

## 5. Decision Logic

G.O runs on a 1-hour cycle (same as Strategist). On each cycle:

```
1. READ Strategist recommendations (from obs-production.db)
2. READ all engine status via getStatus()
3. READ Sentinel anomalies
4. EVALUATE current capital efficiency per engine
5. COMPUTE optimal allocation across engines
6. APPLY adjustments (Tier 1: log only | Tier 2: set ceilings | Tier 3: pause/resume)
7. LOG all decisions with full reasoning
8. NOTIFY via Telegram if any adjustment made
```

### Capital Efficiency Score

G.O scores each engine on three dimensions:

```
SCORE = (0.4 × momentum_score) + (0.4 × regime_score) + (0.2 × drawdown_score)

momentum_score:  Is the engine in an active/profitable state? (0–1)
regime_score:    Does the current market regime suit this engine? (0–1)
drawdown_score:  How close is the engine to its circuit breaker? (0–1)
```

Engines with score > 0.7 → eligible for ceiling increase
Engines with score < 0.3 → eligible for ceiling reduction
Engines with Sentinel ALERT → ceiling freeze until resolved

### Allocation Algorithm

```
total_platform_capital = sum(all engine configured_capital)
target_allocations = {}

for each engine:
  base_weight = engine.configured_capital / total_platform_capital
  efficiency  = capitalEfficiencyScore(engine)
  adjusted_weight = base_weight × (0.5 + efficiency)

// Normalise to sum = 1.0
// Convert to ceiling percentages
// Apply constraints (min 20%, max 200%)
```

---

## 6. The Golden Rules

These constraints are enforced in code and cannot be overridden:

1. **G.O never places orders.** It has no exchange connector.
2. **G.O never modifies engine state.** It calls no engine FSM methods.
3. **G.O never writes to engine databases.** It has its own database only.
4. **G.O never acts on fewer than 96 observations.** The dataset must be sufficient.
5. **G.O never adjusts S.E Crypto in live mode without operator confirmation.** Real money.
6. **G.O never reduces total platform capital below 60% of configured.** Capital preservation.
7. **Every G.O action is logged with full reasoning.** No silent changes.
8. **G.O can always be disabled.** One config flag. Instant effect.

---

## 7. Interface with Existing Engines

G.O reads from engines via their existing `getStatus()` and `getState()` methods.
G.O writes ceilings via a shared `go-ceilings.json` file read by each engine on cycle start.

```javascript
// Engine reads ceiling at start of each cycle:
const goCeiling = GOCeilingReader.getCeiling(engineId);
const effectiveCapital = this.capital * (goCeiling?.pct || 1.0);

// G.O writes ceiling adjustments:
GOCeilingWriter.setCeiling(engineId, { pct: 1.2, reason: '...', adjusted_at: '...' });
```

This file-based interface means:
- Engines don't need to know G.O exists
- G.O can be added without modifying any existing engine
- The ceiling file can be manually edited as an emergency override

---

## 8. Activation Requirements

G.O will not start until all of the following are true:

| Requirement | Check |
|-------------|-------|
| O.E Observer active | `obs.isRunning === true` |
| Observer cycles ≥ 96 | `obsCount >= 96` |
| O.E Strategist active | `str.isRunning === true` |
| Strategist has recommendations | `recommendations.length > 0` |
| No active Sentinel ALERT | `sentinel.alerts.length === 0` |
| Dry run flag set | `config.go.dryRun !== false` |

If any check fails, G.O enters WAITING state and retries on next cycle.

---

## 9. States

```
WAITING      — activation requirements not met, monitoring
OBSERVING    — requirements met, accumulating baseline (first 24 cycles)
ADVISORY     — Tier 1: computing and logging recommendations only
INFLUENCING  — Tier 2: actively adjusting capital ceilings (opt-in)
CONTROLLING  — Tier 3: pause/resume authority active (explicit enable only)
SUSPENDED    — manually disabled or emergency stop triggered
```

Default startup state: WAITING
Default operating state: ADVISORY (after activation)

---

## 10. Relationship to CCE Core Framework

G.O is the first consumer of the Layer Registry's `getRecommendations()` endpoint.

```
Layer Registry → getRecommendations() → G.O → capital ceiling adjustments
```

G.O is also the first engine to require cross-ecosystem awareness — it must see all 11 engines simultaneously to make platform-wide allocation decisions. This is why the Engine Registry's `getAll()` method exists.

```
Engine Registry → getAll() → G.O → efficiency scoring → allocation
```

---

## 11. Roadmap

| Phase | Description | Trigger |
|-------|-------------|---------|
| Now ✅ | ADVISORY mode — ACTIVE, baseline 1/24 cycles | Strategist enabled, 403+ obs |
| v2.4  | SOFT INFLUENCE — capital ceiling adjustments | 200+ obs + opt-in |
| v2.5  | HARD CONTROL — pause/resume authority | Explicit enable only |
| v3.0  | CCE Cloud integration — multi-user G.O | Cloud product launch |

---

*CCE Core Framework · Giblets Creations · March 2026*
*"I wanted it. So I forged it. Now forge yours."*
