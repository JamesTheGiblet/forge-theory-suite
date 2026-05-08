// ai-layers/_template/layer.js
// CCE Core Framework — AI Layer Template
//
// GOLDEN RULE: AI layers NEVER affect engine behaviour.
//   ✅ Read engine state via getState() and getStatus()
//   ✅ Write to your own storage
//   ✅ Send Telegram alerts via notifier
//   ✅ Write recommendations to the shared recommendations store
//   ❌ NEVER call engine methods that change state
//   ❌ NEVER write to engine databases
//   ❌ NEVER modify engine config at runtime
//
// THREE PATTERNS — choose one and delete the others:
//
//   OBSERVER  — snapshot and record (like O.E Observer)
//   ANALYST   — read accumulated data, generate recommendations (like O.E Strategist)
//   SENTINEL  — detect anomalies, fire alerts (like O.E Sentinel)
//
// HOOKS available:
//   post_cycle    — fires after every engine cycle
//   on_transition — fires on every state transition
//   on_signal     — fires when signals are evaluated
//   scheduled     — fires on its own interval regardless of engine cycles
//
// CHECKLIST:
//   [ ] Update manifest.json — id, name, pattern, hook, attaches_to
//   [ ] Update PREFIX constant
//   [ ] Choose your pattern (OBSERVER / ANALYST / SENTINEL) and implement it
//   [ ] Delete the patterns you don't need
//   [ ] Update storage.js schema for your data
//   [ ] Test with cce validate <id>

'use strict';

const LayerStorage = require('./storage');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const PREFIX  = 'LAYER'; // Telegram prefix — update to match your layer id
const VERSION = '1.0.0';

// ── AI LAYER ─────────────────────────────────────────────────────────────────

class TemplateLayer {

  // ── CONSTRUCTOR ─────────────────────────────────────────────────────────────
  // engines: read-only map of { engineId: engineInstance }
  // notifier: shared notification service
  // config: full platform config

  constructor(config, notifier, engines = {}) {
    this.config   = config;
    this.notifier = notifier;
    this.engines  = engines; // READ-ONLY — never call state-modifying methods

    this.storage    = new LayerStorage();
    this.isRunning  = false;
    this.cycleCount = 0;

    // Recommendations store — other layers and G.O can read these
    this.recommendations = [];
  }

  // ── START ────────────────────────────────────────────────────────────────────
  // For SCHEDULED pattern layers that run on their own interval.
  // OBSERVER and SENTINEL layers are typically driven by hooks, not start().

  async start(intervalMinutes = 15) {
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`\n[${PREFIX}] Starting ${VERSION}`);
    console.log(`[${PREFIX}] ⏱️  Interval: ${intervalMinutes}min`);
    console.log(`[${PREFIX}] 👁️  Watching: ${Object.keys(this.engines).length} engines\n`);

    await this.storage.init();

    while (this.isRunning) {
      await this._run();
      if (!this.isRunning) break;
      await this._sleep(intervalMs);
    }
  }

  // ── STOP ─────────────────────────────────────────────────────────────────────

  stop() {
    console.log(`[${PREFIX}] 🛑 Stopping...`);
    this.isRunning = false;
    this.storage.close();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PATTERN A — OBSERVER
  // Snapshot all engine states and market conditions every cycle.
  // Builds the dataset. Never interferes.
  // ══════════════════════════════════════════════════════════════════════════════

  async _run_observer() {
    this.cycleCount++;

    try {
      // 1. Snapshot all engine states — READ ONLY
      const snapshot = this._snapshotEngines();

      // 2. Detect state transitions since last cycle
      const transitions = this._detectTransitions(snapshot);

      // 3. Store observation
      await this.storage.logObservation({
        timestamp:   new Date().toISOString(),
        cycle:       this.cycleCount,
        snapshot:    JSON.stringify(snapshot),
        transitions: JSON.stringify(transitions)
      });

      console.log(`[${PREFIX}] 📊 Observation #${this.cycleCount} — ${Object.keys(snapshot).length} engines`);

      if (transitions.length > 0) {
        console.log(`[${PREFIX}] 🔄 Transitions detected: ${transitions.map(t => `${t.engine}: ${t.from}→${t.to}`).join(', ')}`);
      }

    } catch (err) {
      console.error(`[${PREFIX}] ❌ Observation error: ${err.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PATTERN B — ANALYST
  // Read accumulated data. Identify patterns. Generate recommendations.
  // Never acts on recommendations — produces intelligence only.
  // ══════════════════════════════════════════════════════════════════════════════

  async _run_analyst() {
    this.cycleCount++;

    try {
      // 1. Load accumulated observation data
      const history = await this.storage.getHistory(200);
      if (history.length < 10) {
        console.log(`[${PREFIX}] ⏳ Insufficient data — need 10+ observations (have ${history.length})`);
        return;
      }

      // 2. Analyse patterns — implement your analysis here
      const patterns = await this._analysePatterns(history);

      // 3. Generate recommendations
      const recommendations = this._generateRecommendations(patterns);

      // 4. Store recommendations
      this.recommendations = recommendations;
      await this.storage.logRecommendations({
        timestamp:       new Date().toISOString(),
        cycle:           this.cycleCount,
        patterns:        JSON.stringify(patterns),
        recommendations: JSON.stringify(recommendations)
      });

      // 5. Send summary via Telegram if significant
      if (recommendations.length > 0) {
        const summary = recommendations
          .map(r => `• ${r.type}: ${r.message}`)
          .join('\n');
        await this.notifier.send(`[${PREFIX}] 🧠 Analysis #${this.cycleCount}\n\n${summary}`, 'info');
      }

      console.log(`[${PREFIX}] 🧠 Analysis complete — ${recommendations.length} recommendations`);

    } catch (err) {
      console.error(`[${PREFIX}] ❌ Analysis error: ${err.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PATTERN C — SENTINEL
  // Monitor for anomalies. Fire alerts. Never trades, never interferes.
  // ══════════════════════════════════════════════════════════════════════════════

  async _run_sentinel() {
    this.cycleCount++;

    try {
      // 1. Snapshot current state — READ ONLY
      const snapshot = this._snapshotEngines();

      // 2. Run anomaly checks — implement your rules here
      const anomalies = this._detectAnomalies(snapshot);

      // 3. Log and alert on findings
      for (const anomaly of anomalies) {
        await this.storage.logAnomaly({
          timestamp: new Date().toISOString(),
          rule_id:   anomaly.ruleId,
          severity:  anomaly.severity, // INFO | WARN | ALERT
          title:     anomaly.title,
          detail:    anomaly.detail
        });

        if (anomaly.severity === 'WARN' || anomaly.severity === 'ALERT') {
          const icon = anomaly.severity === 'ALERT' ? '🔴' : '🟡';
          await this.notifier.send(
            `[${PREFIX}] ${icon} ${anomaly.severity}: ${anomaly.title}\n${anomaly.detail}`,
            'warn'
          );
          console.log(`[${PREFIX}] ${icon} ${anomaly.severity}: ${anomaly.title}`);
        }
      }

      if (anomalies.length === 0) {
        console.log(`[${PREFIX}] ✅ Cycle #${this.cycleCount} — no anomalies`);
      }

    } catch (err) {
      console.error(`[${PREFIX}] ❌ Sentinel error: ${err.message}`);
    }
  }

  // ── MAIN RUN — point this to your chosen pattern ──────────────────────────────

  async _run() {
    // Uncomment the pattern you're implementing:
    // await this._run_observer();
    // await this._run_analyst();
    // await this._run_sentinel();
    throw new Error('_run() not implemented — choose a pattern and uncomment it');
  }

  // ── HOOKS — called by the engine registry on engine events ───────────────────

  // Called after every engine cycle
  // engineId: string, status: getStatus() output, cycleData: raw cycle data
  async onPostCycle(engineId, status, cycleData) {
    // Optional — implement if your layer reacts to individual engine cycles
    // Example use: record every cycle from engines you're monitoring
  }

  // Called on every state transition
  // engineId: string, from: string, to: string, signals: object
  async onTransition(engineId, from, to, signals) {
    // Optional — implement if your layer reacts to state transitions
    // Example use: alert when a specific engine reaches a specific state
  }

  // Called when signals are evaluated
  // engineId: string, signals: object
  async onSignal(engineId, signals) {
    // Optional — implement if your layer reacts to signal evaluation
    // Example use: cross-engine signal correlation analysis
  }

  // ── IMPLEMENT THESE ──────────────────────────────────────────────────────────

  async _analysePatterns(history) {
    // ANALYST pattern only.
    // Read history, identify recurring patterns.
    // Return array of pattern objects.
    throw new Error('_analysePatterns() not implemented');
  }

  _generateRecommendations(patterns) {
    // ANALYST pattern only.
    // Turn patterns into actionable recommendations.
    // Return array of { type, message, confidence, engine? }
    throw new Error('_generateRecommendations() not implemented');
  }

  _detectAnomalies(snapshot) {
    // SENTINEL pattern only.
    // Check snapshot against your anomaly rules.
    // Return array of { ruleId, severity, title, detail }
    throw new Error('_detectAnomalies() not implemented');
  }

  // ── SHARED UTILITIES ─────────────────────────────────────────────────────────

  // Snapshot all engine states — READ ONLY
  _snapshotEngines() {
    const snapshot = {};
    for (const [id, engine] of Object.entries(this.engines)) {
      try {
        snapshot[id] = {
          state:  engine.getState(),
          status: engine.getStatus()
        };
      } catch (err) {
        snapshot[id] = { error: err.message };
      }
    }
    return snapshot;
  }

  // Detect state transitions since last observation
  _detectTransitions(snapshot) {
    if (!this._prevSnapshot) {
      this._prevSnapshot = snapshot;
      return [];
    }

    const transitions = [];
    for (const [id, current] of Object.entries(snapshot)) {
      const prev = this._prevSnapshot[id];
      if (prev && prev.state && current.state && prev.state !== current.state) {
        transitions.push({ engine: id, from: prev.state, to: current.state });
      }
    }

    this._prevSnapshot = snapshot;
    return transitions;
  }

  // Get recommendations for G.O or other consumers
  getRecommendations() {
    return this.recommendations;
  }

  // Get layer status for dashboard
  getStatus() {
    return {
      id:          PREFIX,
      version:     VERSION,
      cycle:       this.cycleCount,
      isRunning:   this.isRunning,
      enginesWatched: Object.keys(this.engines).length,
      recommendations: this.recommendations.length
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

module.exports = TemplateLayer;
