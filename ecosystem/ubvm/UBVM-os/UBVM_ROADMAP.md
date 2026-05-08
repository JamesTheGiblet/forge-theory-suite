# UBVM Roadmap

**Version:** 1.0  
**Author:** James / Giblets Creations  
**Last Updated:** May 2026

---

## Governing Principle

> Build depth before breadth. Each phase must be stable before the next begins.  
> A phase is complete when its gap table is empty and its tests pass — not when its code exists.

---

## Current State (v1.0)

UBVM 1.0 is fully complete. The core interpreter, event bus, trading strategy loops, evolution mechanics, orchestration, and compliance test suite are 100% operational. The gap table has been closed.

---

## Phase 0 — Foundation

**Target:** UBVM Core is reliable and chainable  
**Version gate:** `0.3`

| Task | Deliverable | Status |
|------|-------------|--------|

| Wire event bus | `emit_event` appends to `queue.jsonl`; daemon reads and triggers matching capsules | ✅ Done |
| Generic cron scanner | `scheduler_daemon.py` scans all capsules for `trigger: cron`, not just `sentinel_one` | ✅ Done |
| Inject `context` object | Interpreter passes `scp_id`, `ubvm_home`, `timestamp`, `env` to every primitive | ✅ Done |
| Event cursor | Daemon writes/reads `.cursor` to survive restarts | ✅ Done |
| `split_data` primitive | Reads CSV, splits 80/20 into `train.csv` and `test.csv` | ✅ Done |
| `backtest` primitive | Runs SMA crossover strategy on a CSV, returns `profit_factor`, `sharpe_ratio`, `max_drawdown` | ✅ Done |
| `ubvm test` stub | CLI command exists, runs at least one fixture capsule, reports pass/fail | ✅ Done |

**Phase 0 is complete when:** two capsules chain via an event — Capsule A emits, Capsule B fires automatically.

---

## Phase 1 — Strategy Loop

**Target:** A full generate → backtest → validate → select cycle runs unattended  
**Version gate:** `0.4`

| Task | Deliverable | Status |
|------|-------------|--------|

| `fetch_ohlcv` primitive | Calls Binance public endpoint, stores OHLCV CSV in `data/` | ✅ Done |
| `strategy_generate` primitive | Calls Gemini API (or fallback random params) to produce a strategy JSON | ✅ Done |
| `forward_validate` primitive | Runs backtest logic on `test.csv`, returns validation metrics and confidence score | ✅ Done |
| `StrategySelector` capsule | Reads all `validation_*.json`, picks highest fitness, writes `selected/current_best.json` | ✅ Done |
| `MarketWatcher` capsule | Cron every 5 min, calls `fetch_ohlcv`, emits `market.data.updated` | ✅ Done |
| `StrategyGenerator` capsule | Cron daily, calls `strategy_generate`, saves to `strategies/raw/` | ✅ Done |
| `Backtester` capsule | `on_event: strategy.generated`, runs `split_data` then `backtest` | ✅ Done |
| `ForwardValidator` capsule | `on_event: backtest.complete`, runs `forward_validate`, computes fitness score | ✅ Done |

**Phase 1 is complete when:** a strategy is generated, backtested, validated, and selected without manual intervention.

---

## Phase 2 — Evolution & Dry Run

**Target:** The system improves itself and logs live paper-trade signals  
**Version gate:** `0.5`

| Task | Deliverable | Status |
|------|-------------|--------|

| `mutate_strategy` primitive | Takes strategy JSON, randomly alters one parameter (±10%) or calls LLM for guided mutation | ✅ Done |
| `dry_run` primitive | Fetches latest live candles, runs selected strategy, logs buy/sell signals to `logs/dry_run_signals.csv` | ✅ Done |
| `audit_event` primitive | Appends structured log entry to `logs/audit.csv` | ✅ Done |
| `anchor_strategy` primitive | Copies current best to `anchors/` with timestamp and performance snapshot | ✅ Done |
| `Mutator` capsule | Cron weekly, generates 3 mutated offspring from current best, emits `strategy.mutated` | ✅ Done |
| `DryRunner` capsule | Cron every 5 min + `on_event: strategy.selected`, calls `dry_run` | ✅ Done |
| `AuditorAndAnchor` capsule | `on_event: strategy.selected` + cron daily, calls `audit_event` and `anchor_strategy` | ✅ Done |

**Phase 2 is complete when:** the system evolves a strategy and logs paper-trade signals continuously without manual input.

---

## Phase 3 — Orchestration

**Target:** A single Orchestrator capsule drives the entire pipeline  
**Version gate:** `0.6`

| Task | Deliverable | Status |
|------|-------------|--------|

| `Orchestrator` capsule | Cron hourly, emits events to trigger each stage in sequence | ✅ Done |
| `StopTrading` capsule | Listens for `system.error` or `trading.stop`, disables `DryRunner`, sets kill switch | ✅ Done |
| Full compliance test suite | `ubvm test` passes all 15.1–15.5 categories against fixture capsules | ✅ Done |

**Phase 3 is complete when:** `ubvm schedule` starts once and the entire pipeline runs, evolves, and recovers from errors without human intervention.

---

## UBVM 1.0

**Gate:** All Phase 0–3 tasks complete. `ubvm test` passes in full. Gap table in spec §9 is empty.

At 1.0, UBVM is:

- A reliable, chainable runtime
- A self-improving strategy loop
- A fully auditable system
- Compliant with its own specification

---

## Phase 4 — Live Trading

**Target:** Real capital deployment with full safety controls  
**Version gate:** `1.1`

| Task | Deliverable |
|------|-------------|

| `place_order` primitive | Calls broker API (Binance or other), places real orders |
| `LiveRunner` capsule | Replaces `DryRunner` after explicit human activation |
| Position sizing primitive | Calculates order size based on risk parameters |
| Risk governor capsule | Enforces max drawdown, daily loss limits, position caps |
| Emergency kill switch | One command halts all live activity immediately |

> **Note:** Phase 4 requires explicit human activation. No capsule may call `place_order` without `kill_switch: false` and a manual enable flag set in environment. This is a hard constraint, not a convention.

---

## UBVM 2.0 — Distributed Nodes

**Target:** Multiple UBVM instances collaborate as a cluster

- Inter-node event bus (HTTP or message queue)
- Node discovery and health monitoring
- Distributed strategy evaluation across nodes
- Consensus primitives for multi-node decisions
- LEGION running as a distributed UBVM organism

---

## UBVM 3.0 — Sovereign Behavioural OS

**Target:** UBVM as a personal operating system for autonomous agents

- BuddAI running as a UBVM organism
- Data Cube knowledge engine as a Thaumiel capsule cluster
- Data Cube as a UBVM-native spatial knowledge graph
- SCP as the universal artefact format across all systems
- Forge Theory fully expressed as a running system

---

## Documentation Milestones

| Document | Target Phase |
|----------|--------------|

| UBVM Spec v0.2 ✅ | Done |
| UBVM Glossary v1.0 ✅ | Done |
| UBVM Roadmap v1.0 ✅ | Done |
| SCP Specification v0.1 ✅ | Done |
| Capsule suite (ubvm/core-identity, ubvm/spec, ubvm/glossary, ubvm/roadmap, scp/spec) ✅ | Done |
| Reference Implementation Docs | ✅ Done |
| Capsule Authoring Guide | ✅ Done |
| Primitive Developer Guide | ✅ Done |
| Compliance Suite Documentation | ✅ Done |
| Runtime Architecture Document | ✅ Done |
| Whitepaper | ✅ Done |

---

## Quote

"I wanted it. So I forged it. Now forge yours."
