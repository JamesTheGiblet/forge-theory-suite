================================================================================
CCE HANDBOOK
Cascade Compounding Engine — The Philosophy & Architecture
================================================================================

Version: 2.0
Author: James Gilbert / Giblets Creations
Price: £49
Format: PDF + Markdown bundle
Status: Live — March 2026

================================================================================
TABLE OF CONTENTS
================================================================================

PART I — PHILOSOPHY
────────────────────────────────────────────────────────────────────────────────
1.   The Three Pillars
2.   The Cascade Principle
3.   Engine Typology
4.   The Intelligence Layer
5.   Local-First Sovereignty

PART II — STRATEGIC ECOSYSTEM (S.E)
────────────────────────────────────────────────────────────────────────────────
6.   S.E Crypto — Compounding State Engine
7.   S.E Fear Fade — Counter-Cyclical Sentiment Engine
8.   S.E GoldForge — Tether Gold Fear Engine
9.   S.E Alt Season — BTC Dominance Rotation Engine
10.  S.E Underdog — Quality Alt Basket Engine
11.  S.E Pulse — Mean Reversion Engine

PART III — TACTICAL ECOSYSTEM (T.E)
────────────────────────────────────────────────────────────────────────────────
12.  T.E Grid — Grid Tactical Engine
13.  T.E Momentum — EMA Momentum Engine
14.  T.E Breakout — Volatility Squeeze Breakout Engine
15.  T.E Scalp — High Frequency RSI Scalper

PART IV — OBSERVER ECOSYSTEM (O.E)
────────────────────────────────────────────────────────────────────────────────
16.  O.E Observer — Platform Watchdog
17.  O.E Sentinel — Cross-Engine Anomaly Detection
18.  O.E Strategist — Pattern Analysis & Recommendation Engine

PART V — INTELLIGENCE LAYER
────────────────────────────────────────────────────────────────────────────────
19.  G.O Grand Orchestrator
20.  Weather Engine

PART VI — ARCHITECTURE
────────────────────────────────────────────────────────────────────────────────
21.  Runtime & Process Management
22.  Engine Registry
23.  State Machine Design
24.  Data Storage
25.  Dashboard & Interfaces
26.  VPS & Client Deployment
27.  Safety Systems

PART VII — COMMERCIAL LAYER
────────────────────────────────────────────────────────────────────────────────
28.  Client Tiers
29.  CCE Control
30.  Service Agreement

PART VIII — APPENDICES
────────────────────────────────────────────────────────────────────────────────
A.   Glossary of States
B.   Signal Methodology Reference
C.   Configuration Guide
D.   Pre-Flight Test Suite
E.   Glossary of Terms

================================================================================
PART I — PHILOSOPHY
================================================================================

1. THE THREE PILLARS
────────────────────────────────────────────────────────────────────────────────

CCE is built on three foundational principles that govern every line of code,
every state transition, and every design decision.

PILLAR ONE: ENVIRONMENT FIRST, ACTION SECOND

Most trading systems ask: "Where is price going?" This is the wrong question.
Price prediction is a game with no winners over the long term.

CCE asks a different question: "What is the environment?" The environment —
volatility, sentiment, trend structure, macro conditions — determines whether
any action is appropriate. In a hostile environment, the correct action is
inaction. In a favourable environment, the correct action is deployment.

Every engine in CCE evaluates environment before action. No engine acts
simply because time has passed. No engine acts because price has moved.
Engines act when the environment reaches a state that historically precedes
the kind of move they are designed to capture.

This is the difference between reactivity and intentionality.

PILLAR TWO: NO PREDICTION. NO EMOTION. NO EXCEPTIONS.

CCE does not predict. It observes, filters, and responds. Prediction is
opinion. Opinion is emotion. Emotion loses money.

The system has no opinion on whether Bitcoin will go up or down. It has
conditions. When conditions are met, it acts. When conditions are not met,
it does not act. There is no grey area. There is no discretionary override.

This applies equally to the operator. CCE provides no override mechanism
for state decisions. If the engine wants to be in cash and the operator
believes a rally is coming, the operator must accept the engine's decision
or shut it down. There is no middle path.

PILLAR THREE: TRANSPARENCY BY DEFAULT

A trading system you cannot understand is a system you cannot trust.

Every engine's logic is documented. Every state transition is logged.
Every market condition that influenced a decision is recorded. The
architecture is public. The philosophy is public. The strategy files
— the proprietary signal logic — are the only protected component.

This transparency serves two purposes. First, it forces discipline:
a system that is documented cannot hide sloppy thinking. Second, it
builds trust: operators understand what the system is doing and why,
which makes them less likely to intervene at the wrong moment.

2. THE CASCADE PRINCIPLE
────────────────────────────────────────────────────────────────────────────────

The name "Cascade Compounding Engine" encodes the system's core operational
principle: value flows through multiple stages, compounding at each step.

CASCADE AS STRUCTURE

A cascade is a sequence where each stage feeds into the next. In CCE:

- Individual engines generate signals and trades
- Observer records patterns across all engines
- Sentinel detects anomalies across the platform
- Strategist analyses patterns and generates recommendations
- G.O acts on recommendations — adjusting capital ceilings

No stage operates in isolation. Each stage depends on the data and
intelligence generated by the stages before it. This creates a system
where intelligence accumulates — the platform gets smarter over time.

CASCADE AS COMPOUNDING

S.E Crypto exemplifies the compounding principle. It moves through a
sequence of states, each representing a deeper level of market engagement.
Capital is not deployed all at once. It is deployed incrementally as
conditions improve. When conditions deteriorate, the sequence reverses
and capital is withdrawn incrementally.

This graduated approach reduces the impact of false signals. A single
erroneous signal cannot cause a full deployment. It can only advance
the engine one step — and if the signal proves false, the engine
retreats one step. The capital impact is limited.

The compounding effect comes from being positioned during the full
sequence of a market cycle. The engine captures value at each phase,
not just at the beginning or end. Over multiple cycles, the effect
compounds.

3. ENGINE TYPOLOGY
────────────────────────────────────────────────────────────────────────────────

CCE hosts three distinct types of trading engines plus an intelligence layer.

STRATEGIC ENGINES (S.E) — WEATHER VANES

Strategic engines are patient. They wait for macro conditions to align
before deploying capital. They do not care about 5-minute price moves.
They care about 4-hour, daily, and weekly structure.

- Timeframes: 4 hours to weekly
- Behaviour: Environment-first, multi-condition entry
- Capital: Patient, deployed incrementally
- Exchange: Kraken (active engines)

S.E engines are called "weather vanes" because they point in the direction
of the macro wind. They do not create their own momentum. They align with
the prevailing environment.

Active S.E engines on Kraken:
- S.E Crypto — BTC/USDC, full market cycle
- S.E Fear Fade — BTC/USDC, extreme fear entries
- S.E GoldForge — XAUT/USDT, gold during crypto fear
- S.E Alt Season — ETH/SOL, BTC dominance rotation
- S.E Underdog — ALGO/DOT/ATOM/VET basket
- S.E Pulse — BTC/USDC, mean reversion

TACTICAL ENGINES (T.E) — WATERWHEELS

Tactical engines are active. They harvest opportunity continuously,
regardless of macro environment. They operate on shorter timeframes and
rely on mechanical, repeatable patterns.

- Timeframes: 5 minutes to 2 hours
- Behaviour: Mechanical, pattern-based
- Capital: Dedicated allocations, separate from S.E
- Exchange: Kraken

Active T.E engines:
- T.E Grid — 5min BTC grid
- T.E Momentum — 2H EMA crossover
- T.E Breakout — 1H Bollinger squeeze
- T.E Scalp — 5min RSI + volume

T.E engines are called "waterwheels" because they extract energy from
market flow regardless of direction.

OBSERVER ENGINES (O.E) — MEMORY

Observer engines are passive. They do not trade. They watch, record,
and alert. They are the platform's intelligence layer.

- Timeframes: 15 minutes to 1 hour
- Behaviour: Passive, observational, analytical
- Capital: None — they never deploy capital

O.E engines are called "memory" because they accumulate the dataset
that powers all higher-level intelligence.

4. THE INTELLIGENCE LAYER
────────────────────────────────────────────────────────────────────────────────

CCE's intelligence layer is a four-stage pipeline that transforms raw
observations into capital allocation decisions.

STAGE ONE: O.E OBSERVER — MEMORY

The Observer runs every 15 minutes and takes a complete snapshot of every
engine state and every market condition. It builds the dataset. It never
interferes with anything. It only watches and records.

STAGE TWO: O.E SENTINEL — ANOMALY DETECTION

The Sentinel runs 17 detection rules across all active engines every 15
minutes. It looks for regime divergences, correlation breakdowns, and
unusual engine behaviour. When it finds something, it alerts via Telegram.

STAGE THREE: O.E STRATEGIST — PATTERN ANALYSIS

The Strategist analyses the Observer's accumulated dataset and generates
recommendations — which engines are performing well, which conditions
produce the best results, which states to favour. Available via Telegram
commands: /briefing, /predict, /patterns, /regime.

STAGE FOUR: G.O — GRAND ORCHESTRATOR

G.O reads all engine scores and adjusts capital ceilings across the
platform every hour. It does not place orders. It does not pause engines.
In advisory mode it recommends. In autonomous mode (operator opt-in)
it acts.

G.O scores each engine 0-1 based on:
- Momentum (is it active and profitable?)
- Regime (does current market suit this engine?)
- Drawdown (how close to circuit breaker?)

5. LOCAL-FIRST SOVEREIGNTY
────────────────────────────────────────────────────────────────────────────────

CCE was designed to run without cloud dependency. All computation, all
storage, all intelligence runs locally — on the device.

ORIGINAL DEPLOYMENT: Samsung S24 Ultra via Termux.
- Node.js v22 on Android
- sql.js for SQLite (no native binaries)
- PM2 for process management
- No cloud, no subscription, no third party

VPS DEPLOYMENT: Hetzner Cloud, Helsinki.
- Client instances run on the VPS
- Each client gets their own isolated CCE process
- Operator manages via SSH from S24
- Dashboard accessible from any phone, anywhere

The architecture is the same in both environments. The difference is
who owns the device. Your money stays in your exchange account. The
platform runs wherever you put it.

================================================================================
PART II — STRATEGIC ECOSYSTEM (S.E)
================================================================================

6. S.E CRYPTO — COMPOUNDING STATE ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: BTC/USDC | Exchange: Kraken | Cycle: 4H | Mode: LIVE

The flagship engine. Manages BTC exposure through the full market cycle
using a five-state machine driven by Fear & Greed, BTC dominance, SMA
structure, and ETF flows.

States: DORMANT → WATCHING → ACCUMULATING → IGNITION → CASCADE → EXTRACTION

Entry conditions (all must be met):
- Fear & Greed Index > 40
- BTC above 20-day SMA
- 20-day SMA above 50-day SMA
- BTC dominance in acceptable range
- ETF flows positive

Currently DORMANT at F&G 11 — correctly waiting for conditions.

7. S.E FEAR FADE — COUNTER-CYCLICAL SENTIMENT ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: BTC/USDC | Exchange: Kraken | Cycle: 4H | Mode: DRY RUN

Buys BTC during Extreme Fear (F&G ≤ 20) and holds until Greed returns
(F&G ≥ 60). Counter-cyclical to S.E Crypto — active when Crypto is most
cautious. No position size limit per entry — full capital deployment on
confirmed Extreme Fear signal.

States: DORMANT → WATCHING → ACTIVE → HOLDING → EXITING

Currently WATCHING at F&G 11 — building toward entry threshold.

8. S.E GOLDFORGE — TETHER GOLD FEAR ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: XAUT/USDT | Exchange: Kraken | Cycle: 4H | Mode: DRY RUN

Trades Tether Gold (XAUT) — a gold-backed token on Kraken. Gold
historically rises when crypto fear spikes. Enters when F&G ≤ 25 and
gold momentum is positive. Exits when crypto sentiment recovers (F&G ≥ 55).

States: DORMANT → WATCHING → ACTIVE → HOLDING → EXITING

Currently WATCHING at F&G 11 and gold at $4,560.

9. S.E ALT SEASON — BTC DOMINANCE ROTATION ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: ETH/USDC, SOL/USDC | Exchange: Kraken | Cycle: 4H | Mode: DRY RUN

Monitors BTC dominance. When dominance falls below 50% it signals capital
rotating from BTC into altcoins. Enters ETH first (most liquid), SOL as
fallback. Exits when dominance recovers above 55%.

States: DORMANT → WATCHING → ROTATING → HOLDING → EXITING

Currently DORMANT — BTC dominance at 56%, above entry threshold.

10. S.E UNDERDOG — QUALITY ALT BASKET ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: ALGO/DOT/ATOM/VET | Exchange: Kraken | Cycle: 4H | Mode: DRY RUN

Buys a basket of four fundamentally sound projects at historic lows during
Extreme Fear. $50 per asset — equal weight. Holds for alt season rotation
when capital floods back into quality mid-caps.

The basket:
- ALGO — Algorand: fast L1, carbon neutral
- DOT — Polkadot: parachain ecosystem
- ATOM — Cosmos: IBC network
- VET — VeChain: enterprise supply chain

States: DORMANT → WATCHING → LOADING → HOLDING → EXITING

Currently DORMANT — waiting for F&G ≤ 20 + BTC dom < 54%.

11. S.E PULSE — MEAN REVERSION ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: BTC/USDC | Exchange: Kraken | Cycle: 4H | Mode: DRY RUN

Short-term BTC mean reversion. Buys intraday dips of 2.5%+ from recent
highs with volume confirmation. Exits on +1.5% recovery, -4% stop loss,
or 24H timeout. No sentiment filter — trades in any market condition.

States: SCANNING → LOADING → HOLDING → EXITING

Currently SCANNING — BTC dip at -2.44%, approaching entry threshold.

================================================================================
PART III — TACTICAL ECOSYSTEM (T.E)
================================================================================

12. T.E GRID — GRID TACTICAL ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: BTC/USDC | Exchange: Kraken | Cycle: 5min | Mode: DRY RUN

Places 10 buy and sell orders at fixed 1% intervals above and below a
centre price. Profits from BTC oscillating within the grid. Recentres
automatically when BTC moves 5% beyond the grid boundary. Stop loss at
15% below centre.

States: INITIALISING → ACTIVE → RECENTRING → STOPPED

Currently ACTIVE — 10 orders placed around $67,426 centre.

13. T.E MOMENTUM — EMA MOMENTUM ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: BTC/ETH/SOL | Exchange: Kraken | Cycle: 2H | Mode: DRY RUN

EMA crossover momentum engine. Enters when fast EMA (9) crosses above slow
EMA (21) with trend EMA (50) confirming direction. RSI and volume filters
reduce false entries. ATR-based stops and targets.

States: STANDBY → SCANNING → TRIGGERED → RIDING → EXITING

14. T.E BREAKOUT — VOLATILITY SQUEEZE BREAKOUT ENGINE
────────────────────────────────────────────────────────────────────────────────

Market: BTC/ETH/SOL | Exchange: Kraken | Cycle: 1H | Mode: DRY RUN

Detects Bollinger Band squeezes — periods of extreme low volatility that
precede explosive moves. Enters when bands expand after a squeeze with
volume confirmation. ATR-based stops and targets.

States: SCANNING → STALKING → TRIGGERED → RIDING → EXITING

Currently SCANNING — Bollinger squeeze detected.

15. T.E SCALP — HIGH FREQUENCY RSI SCALPER
────────────────────────────────────────────────────────────────────────────────

Market: BTC/USDC | Exchange: Kraken | Cycle: 5min | Mode: DRY RUN

RSI oversold + volume spike scalper. Enters when RSI ≤ 32 with 1.5x
average volume confirmation or bullish divergence. Exits at +0.8% target,
-0.5% stop, RSI overbought (68+), or 30 minute timeout. 15 minute cooldown
between trades. Expected 10-20 trades per week.

States: IDLE → STALKING → ENTRY → RIDING → EXIT

Break-even win rate: 38%. Target win rate: 55%+.

================================================================================
PART IV — OBSERVER ECOSYSTEM (O.E)
================================================================================

16. O.E OBSERVER — PLATFORM WATCHDOG
────────────────────────────────────────────────────────────────────────────────

Cycle: 15min | State: ACTIVE — 400+ cycles

Runs every 15 minutes and takes a complete snapshot of all 21 engine
states, market conditions, and cross-engine correlations. Never interferes.
Never trades. Only watches and records.

After 30 days: ~2,880 snapshots, complete state history, market regime
distribution, engine co-activity matrix.

17. O.E SENTINEL — CROSS-ENGINE ANOMALY DETECTION
────────────────────────────────────────────────────────────────────────────────

Cycle: 15min | Engines watched: 17 | State: ACTIVE

Runs 17 detection rules across all engines every 15 minutes. Detects:
- Regime divergences (BTC moving against macro)
- Correlation breakdowns (Oil/Gold divergence)
- Engine behaviour anomalies (zombie detection)
- Policy divergences (EGP rate vs inflation)

Alerts via Telegram when anomalies are detected.

18. O.E STRATEGIST — PATTERN ANALYSIS ENGINE
────────────────────────────────────────────────────────────────────────────────

Cycle: 1H | Requires: 96+ Observer cycles | State: ACTIVE

Analyses the Observer's accumulated dataset and provides intelligence
on demand via Telegram commands:

/briefing  — Full platform intelligence briefing
/predict   — State transition predictions for all engines
/patterns  — Latest pattern insights
/regime    — Current market regime analysis

================================================================================
PART V — INTELLIGENCE LAYER
================================================================================

19. G.O — GRAND ORCHESTRATOR
────────────────────────────────────────────────────────────────────────────────

Cycle: 1H | State: ADVISORY — baseline 1/24 | Mode: DRY RUN

The Grand Orchestrator reads all engine scores every hour and computes
optimal capital ceiling adjustments. It operates in three tiers:

ADVISORY (current): Recommends adjustments, logs what it would do.
TIER 2 (opt-in): Adjusts capital ceilings within configured limits.
TIER 3 (explicit only): Can pause/resume engines based on performance.

G.O scores each engine 0-1:
- Momentum score (0.4 weight): Is it active and profitable?
- Regime score (0.4 weight): Does current market suit this engine?
- Drawdown score (0.2 weight): How close to circuit breaker?

G.O GOLDEN RULES (enforced in code):
- Never places orders
- Never modifies exchange state
- Never acts without operator opt-in
- Never exceeds configured ceiling limits
- Never reduces platform capital below 60% floor

Current scores (31 March 2026):
- S.E Pulse: 0.80 (highest)
- T.E Breakout: 0.72
- T.E Grid: 0.60
- T.E Scalp: 0.60

20. WEATHER ENGINE
────────────────────────────────────────────────────────────────────────────────

Cycle: 6H | State: ACTIVE — 6 signals

Monitors agricultural weather conditions across 6 commodities:
Corn, Soybeans, Wheat, Oranges, Rice. Provides directional bias
for commodity trading engines. Currently informational only.

================================================================================
PART VI — ARCHITECTURE
================================================================================

21. RUNTIME & PROCESS MANAGEMENT
────────────────────────────────────────────────────────────────────────────────

PRIMARY: Samsung S24 Ultra via Termux (Android)
- Node.js v22.22.2
- PM2 v6.0.14 process manager
- sql.js (pure JS SQLite — no native binaries required)
- No cloud dependency — runs entirely on device

VPS: Hetzner CX22, Helsinki, Finland
- Ubuntu 24.04 LTS
- Same Node.js + PM2 stack
- nginx reverse proxy
- Client instances isolated per directory

PM2 PROCESSES (S24):
- cce-bot (fork) — all engines
- dashboard (fork) — port 3000
- cce-control (fork) — port 3002
- cce-audit (cron) — daily 8am
- cce-css (cron) — daily midnight
- cce-fl (cron) — Monday 9am
- cce-optimizer (cron) — Monday 9am

22. ENGINE REGISTRY
────────────────────────────────────────────────────────────────────────────────

New engines are auto-loaded from the /engines/ directory. No changes to
index.js required. Each engine folder contains:

- manifest.json — metadata and requirements
- engine.js — main class (exports the class directly)
- strategy.js — FSM logic
- storage.js — sql.js database wrapper

Registry validates:
- All manifest fields present
- engine.js exports a valid class
- Required methods: start, stop, runCycle, getStatus, getState
- Required properties: isRunning, cycleCount, dryRun

Current registry engines (9):
se-fear-fade, se-goldforge, se-alt-season, se-underdog, se-pulse,
te-grid, te-momentum, te-breakout, te-scalp

23. STATE MACHINE DESIGN
────────────────────────────────────────────────────────────────────────────────

Every engine is a Finite State Machine (FSM). The engine is always in
exactly one defined state. Transitions between states are deterministic —
the same inputs always produce the same transition.

This design eliminates ambiguity. An engine cannot be "sort of watching"
or "thinking about entering". It is either WATCHING or it is not.

State transitions are:
- Logged to the engine's database with full signal context
- Sent to Telegram as a notification
- Visible on the dashboard in real time
- Recorded by the Observer for pattern analysis

24. DATA STORAGE
────────────────────────────────────────────────────────────────────────────────

Each engine has its own sql.js database file in /data/:

- cce-production.db — S.E Crypto
- se-fear-fade.db — S.E Fear Fade
- se-goldforge.db — S.E GoldForge
- se-alt-season.db — S.E Alt Season
- se-underdog.db — S.E Underdog
- se-pulse.db — S.E Pulse
- grid-production.db — T.E Grid
- mom-production.db — T.E Momentum
- brk-production.db — T.E Breakout
- te-scalp.db — T.E Scalp
- obs-production.db — O.E Observer
- fl-production.db — F.L Forensic
- css-production.db — CSS Siphon

All databases are written synchronously after every cycle. No data is lost
if the process crashes.

25. DASHBOARD & INTERFACES
────────────────────────────────────────────────────────────────────────────────

MAIN DASHBOARD (port 3000)
- Live BTC price, Fear & Greed, BTC dominance
- Real Kraken portfolio balance
- Market regime + stability bar
- Agricultural weather signals
- Engine status tabs (S.E / T.E / O.E)
- Platform tier filter (Starter / Advanced / Full)
- System health monitor
- Guidance layer slider
- Capital siphon events
- Portfolio history chart

CCE CONTROL (port 3002)
- All client accounts with live balances
- Revenue strip: AUM, Setup Fees, Siphon Earned, Total Earned
- Add/remove clients
- Per-client Kraken balance via read-only API

26. VPS & CLIENT DEPLOYMENT
────────────────────────────────────────────────────────────────────────────────

Each client gets an isolated CCE instance on the VPS:

DEPLOYMENT:
  bash bin/cce-deploy-vps.sh <client-name>
  ssh cce-vps nano /home/cce/clients/<name>/.env
  ssh cce-vps pm2 start index.js --name <name>-cce

CLIENT ACCESS:
  http://65.21.244.131:<port>  — their dashboard
  Telegram notifications        — trade alerts

TIER CONTROL:
  CCE_CLIENT_TIER=starter in .env locks dashboard and engines to
  their purchased tier. Cannot be changed by client.

27. SAFETY SYSTEMS
────────────────────────────────────────────────────────────────────────────────

DRY RUN DEFAULT
All engines default to dryRun: true. No real trades without explicit
config change. S.E Crypto is the only live engine currently.

CIRCUIT BREAKERS
All engines halt if daily loss exceeds configured threshold (typically 3%).
No new entries until next day. Existing positions managed to exit.

G.O GOLDEN RULES
G.O never places orders, never modifies exchange state, and never acts
beyond its configured authority level.

PRE-FLIGHT TESTS
Strategy tests run on every boot. Engine refuses to start if tests fail.

EMERGENCY STOP
POST /api/emergency-stop cancels all orders, exits all positions,
prevents any new entries.

LICENCE VALIDATION
Startup validation prevents unlicensed operation.

================================================================================
PART VII — COMMERCIAL LAYER
================================================================================

28. CLIENT TIERS
────────────────────────────────────────────────────────────────────────────────

CCE is available to clients at three tiers:

STARTER — £200 setup fee
- Exchange: Kraken only
- Engines: 11 (S.E Crypto + 5 S.E + 3 T.E + O.E layer)
- Dashboard locked to Kraken engines
- Recommended starting capital: £500+

ADVANCED — £300 setup fee
- Exchange: Kraken + Binance Futures
- Engines: 12 (adds T.E LCE)
- Requires Binance account with futures enabled
- Recommended starting capital: £1,000+

FULL PLATFORM — £500 setup fee
- Exchange: All (Kraken + Binance + broker)
- Engines: 17 (adds Forex, REIT, Stocks, Commodities, EGP)
- Requires IG, Trading212, or IBKR account
- Recommended starting capital: £2,000+

SIPHON (all tiers):
- 0-50% total return: 10% of profits
- 50-100% total return: 12% of profits
- 100%+ total return: 15% of profits

No siphon on losing trades. No siphon during DORMANT periods.
Client funds remain in their own exchange account at all times.

29. CCE CONTROL
────────────────────────────────────────────────────────────────────────────────

CCE Control (port 3002) is the operator's master client dashboard.

Features:
- All client accounts with live balances (via Kraken read API)
- Total AUM across all clients
- Setup fees collected
- Siphon earned to date
- Per-client engine state
- Add/remove clients
- Auto-seeds operator account from environment variables

30. SERVICE AGREEMENT
────────────────────────────────────────────────────────────────────────────────

Key terms:
- Client retains full custody of funds in their own exchange account
- Operator has trade-only API access — no withdrawal possible
- Client may withdraw at any time by revoking API access
- Either party may terminate with 7 days written notice
- This is a private technology service, not FCA regulated
- Client is responsible for their own tax obligations

Full agreement: docs/SERVICE_AGREEMENT.md

================================================================================
PART VIII — APPENDICES
================================================================================

A. GLOSSARY OF STATES
────────────────────────────────────────────────────────────────────────────────

STRATEGIC ENGINE STATES

DORMANT    — Capital in cash. No position. Waiting for environment.
WATCHING   — Environment improving but not yet sufficient for entry.
LOADING    — Building position incrementally.
ACTIVE     — Position open, conditions confirmed.
HOLDING    — Full deployment. Monitoring for exit.
EXITING    — Conditions deteriorating, withdrawing capital.
SCANNING   — Pulse only. Always active, hunting setups.
STOPPED    — Circuit breaker triggered. Halted until next day.

TACTICAL ENGINE STATES

IDLE       — No signal. Scanning passively.
STALKING   — Potential setup detected. Monitoring for confirmation.
ENTRY      — Signal confirmed. Opening position.
RIDING     — Position open. Stop and target active.
EXIT       — Closing position. Cooldown starting.
ACTIVE     — Grid only. Orders placed, harvesting movement.
INITIALISING — Grid only. Setting up initial order book.

OBSERVER ENGINE STATES

ACTIVE     — Running on schedule. Recording observations.
WAITING    — Strategist only. Accumulating required observations.
OBSERVING  — G.O only. Building baseline dataset (24 cycles).
ADVISORY   — G.O only. Baseline complete. Scoring and recommending.

B. SIGNAL METHODOLOGY REFERENCE
────────────────────────────────────────────────────────────────────────────────

TECHNICAL SIGNALS

EMA Crossover      — Fast EMA crossing above/below slow EMA.
RSI                — Relative Strength Index (14 period default).
Bollinger Bands    — Volatility envelope for squeeze detection.
ATR                — Average True Range for stop/target placement.
Volume ratio       — Current volume vs rolling average.
Dip detection      — % drop from recent N-candle high.
Bullish divergence — Price lower low + RSI higher low.

MACRO SIGNALS

Fear & Greed Index — Market sentiment (0=Extreme Fear, 100=Extreme Greed).
BTC Dominance      — Capital rotation between BTC and altcoins.
VIX                — CBOE Volatility Index.
DXY                — US Dollar Index.
ETF Flows          — Bitcoin ETF net flows (7-day).
SMA Structure      — 20-day and 50-day SMA alignment.

ALTERNATIVE DATA

Agricultural Weather — Temperature and rainfall for 6 crops.
Gold Momentum        — XAUT price trend over rolling window.
Liquidation Volume   — Futures liquidation cascades (Binance).

C. CONFIGURATION GUIDE
────────────────────────────────────────────────────────────────────────────────

ENVIRONMENT VARIABLES (.env)

# Exchange
KRAKEN_API_KEY=your_api_key
KRAKEN_API_SECRET=your_api_secret

# Notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Platform
CCE_DRY_RUN=false
STARTING_CAPITAL=521.83
CCE_CLIENT_TIER=starter

# Data feeds
WEATHER_API_KEY=your_key
FRED_API_KEY=your_key

KEY CONFIG.JS PARAMETERS

S.E Crypto:
  dryRun: false        — Live trading
  startingCapital: 521.83

S.E Fear Fade:
  entryFearGreed: 20   — Buy when F&G ≤ 20
  exitFearGreed: 60    — Sell when F&G ≥ 60

T.E Scalp:
  rsiOversold: 32      — Entry threshold
  targetPct: 0.8       — Take profit
  stopPct: -0.5        — Stop loss

G.O:
  tier2Enabled: false  — Keep false until confident
  allowLiveAdjust: false

D. PRE-FLIGHT TEST SUITE
────────────────────────────────────────────────────────────────────────────────

Tests run on every boot:

EXCHANGE CONNECTIVITY
· Kraken REST API reachable
· API key permissions valid
· Account balance readable

ENGINE INTEGRITY
· All engine state machines initialise
· All engine configs validate
· Registry engines load successfully

RISK MANAGEMENT
· Circuit breaker thresholds defined
· Daily loss limits defined
· Stop loss parameters defined

DATABASE
· All databases accessible
· Write permissions verified

INTELLIGENCE LAYER
· Observer initialises
· Sentinel initialises
· G.O baseline check

E. GLOSSARY OF TERMS
────────────────────────────────────────────────────────────────────────────────

CCE — Cascade Compounding Engine. The platform.

Cascade — A sequence where each stage feeds into the next.

S.E — Strategic Engine. Patient, macro-driven. Weather vane.

T.E — Tactical Engine. Active, mechanical. Waterwheel.

O.E — Observer Engine. Passive, analytical. Memory.

G.O — Grand Orchestrator. Capital allocation intelligence layer.

Engine Registry — Auto-loader that discovers engines from /engines/.

State Machine — Deterministic model with defined states and transitions.

Dry Run — Simulation mode. No real trades executed.

Circuit Breaker — Halts engine after defined daily loss threshold.

Siphon — CSS system that skims a percentage of profits to reserves.

VPS — Virtual Private Server. Hetzner CX22 in Helsinki.

CCE Control — Master client management dashboard on port 3002.

Tier — Client access level (Starter/Advanced/Full) controlling which
       engines start and which are visible on dashboard.

PM2 — Process manager keeping CCE running continuously.

Termux — Android terminal emulator providing Unix-like environment.

sql.js — Pure JavaScript SQLite. Works on Android without native binaries.

XAUT — Tether Gold. ERC-20 token backed 1:1 by physical gold.

BTC Dominance — Bitcoin's share of total crypto market cap.

Fear & Greed — Alternative.me index measuring market sentiment 0-100.

FCA — Financial Conduct Authority. CCE sits outside regulated activity.

================================================================================
END OF HANDBOOK
================================================================================

Giblets Creations  |  James Gilbert  |  March 2026
"I wanted it. So I forged it. Now forge yours."

================================================================================
