// src/engine-registry.js
// CCE Core Framework — Engine Registry
//
// Scans the /engines folder at boot time, validates manifests,
// instantiates engines, and registers them with the platform.
//
// ADDITIVE — existing hardcoded engines in index.js are unaffected.
// New engines dropped into /engines/ are auto-detected alongside them.
//
// Usage in index.js:
//
//   const EngineRegistry = require('./src/engine-registry');
//   const registry = new EngineRegistry(config, sharedNotifier, exchange);
//   await registry.scan();
//   const dynamicEngines = registry.startAll();
//   engines.push(...dynamicEngines);
//   const allEngines = registry.getAll(); // for O.E Observer

'use strict';

const fs   = require('fs');
const path = require('path');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const ENGINES_DIR    = path.join(process.cwd(), 'engines');
const VALID_TYPES    = ['STRATEGIC', 'TACTICAL', 'OBSERVER'];
const VALID_ECOSYSTEMS = ['S.E', 'T.E', 'O.E'];

// ── ENGINE REGISTRY ───────────────────────────────────────────────────────────

class EngineRegistry {

  constructor(config, notifier, exchangeConnector = null) {
    this.config   = config;
    this.notifier = notifier;
    this.exchange = exchangeConnector;

    this._engines   = new Map(); // id → { manifest, instance }
    this._errors    = [];        // engines that failed to load
    this._scanned   = false;
  }

  // ── SCAN ──────────────────────────────────────────────────────────────────
  // Scans the /engines directory and loads all valid engines.
  // Call once at boot before startAll().

  async scan() {
    if (!fs.existsSync(ENGINES_DIR)) {
      console.log('[REGISTRY] No /engines directory found — skipping scan');
      this._scanned = true;
      return;
    }

    const entries = fs.readdirSync(ENGINES_DIR, { withFileTypes: true });
    const folders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_')) // skip _template
      .map(e => e.name);

    if (folders.length === 0) {
      console.log('[REGISTRY] No engines found in /engines directory');
      this._scanned = true;
      return;
    }

    console.log(`\n[REGISTRY] Scanning /engines — found ${folders.length} candidate(s)`);

    for (const folder of folders) {
      await this._loadEngine(folder);
    }

    const loaded = this._engines.size;
    const failed = this._errors.length;
    console.log(`[REGISTRY] ✅ Loaded: ${loaded} | ❌ Failed: ${failed}\n`);

    if (this._errors.length > 0) {
      console.log('[REGISTRY] Failed engines:');
      this._errors.forEach(e => console.log(`  ❌ ${e.folder}: ${e.reason}`));
    }

    this._scanned = true;
  }

  // ── START ALL ─────────────────────────────────────────────────────────────
  // Starts all registered engines.
  // Returns array of start() Promises — push to your engines[] array.

  startAll() {
    if (!this._scanned) {
      throw new Error('[REGISTRY] Must call scan() before startAll()');
    }

    const promises = [];

    for (const [id, entry] of this._engines) {
      const { manifest, instance } = entry;

      if (!this._isEnabled(manifest)) {
        console.log(`[REGISTRY] ⏭️  ${manifest.name} — disabled in config`);
        continue;
      }

      const interval = this._getInterval(manifest);
      console.log(`[REGISTRY] 🚀 Starting ${manifest.name} — ${manifest.cycle} | ${this._getDryRunLabel(manifest)}`);

      promises.push(
        instance.start(interval).catch(err => {
          console.error(`[REGISTRY] ❌ ${manifest.name} crashed: ${err.message}`);
        })
      );
    }

    return promises;
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────
  // Returns all registered engine instances keyed by id.
  // Pass to O.E Observer for cross-engine snapshots.

  getAll() {
    const result = {};
    for (const [id, entry] of this._engines) {
      result[id] = entry.instance;
    }
    return result;
  }

  // ── GET ───────────────────────────────────────────────────────────────────
  // Returns a single engine instance by id.

  get(id) {
    return this._engines.get(id)?.instance || null;
  }

  // ── STOP ALL ──────────────────────────────────────────────────────────────
  // Graceful shutdown of all registered engines.

  stopAll() {
    for (const [id, entry] of this._engines) {
      try {
        entry.instance.stop();
      } catch (err) {
        console.error(`[REGISTRY] Error stopping ${id}: ${err.message}`);
      }
    }
  }

  // ── STATUS ────────────────────────────────────────────────────────────────
  // Returns status of all registered engines.

  getStatus() {
    const status = {};
    for (const [id, entry] of this._engines) {
      try {
        status[id] = entry.instance.getStatus();
      } catch (err) {
        status[id] = { error: err.message };
      }
    }
    return status;
  }

  // ── PRIVATE: LOAD ENGINE ─────────────────────────────────────────────────

  async _loadEngine(folder) {
    const engineDir      = path.join(ENGINES_DIR, folder);
    const manifestPath   = path.join(engineDir, 'manifest.json');
    const enginePath     = path.join(engineDir, 'engine.js');

    // 1. Manifest must exist
    if (!fs.existsSync(manifestPath)) {
      this._fail(folder, 'missing manifest.json');
      return;
    }

    // 2. Parse manifest
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      this._fail(folder, `invalid manifest.json: ${err.message}`);
      return;
    }

    // 3. Validate manifest
    const validationError = this._validateManifest(manifest, folder);
    if (validationError) {
      this._fail(folder, validationError);
      return;
    }

    // 4. engine.js must exist
    if (!fs.existsSync(enginePath)) {
      this._fail(folder, 'missing engine.js');
      return;
    }

    // 5. Load engine class
    let EngineClass;
    try {
      EngineClass = require(enginePath);
    } catch (err) {
      this._fail(folder, `failed to require engine.js: ${err.message}`);
      return;
    }

    // 6. Instantiate engine
    let instance;
    try {
      const needsExchange = manifest.requires?.exchange === true;
      instance = needsExchange
        ? new EngineClass(this.config, this.notifier, this.exchange)
        : new EngineClass(this.config, this.notifier);
    } catch (err) {
      this._fail(folder, `failed to instantiate: ${err.message}`);
      return;
    }

    // 7. Validate instance implements required interface
    const interfaceError = this._validateInterface(instance, manifest);
    if (interfaceError) {
      this._fail(folder, interfaceError);
      return;
    }

    // 8. Register
    this._engines.set(manifest.id, { manifest, instance });
    console.log(`[REGISTRY]   ✅ ${manifest.name} (${manifest.id}) — ${manifest.type} · ${manifest.ecosystem}`);
  }

  // ── PRIVATE: VALIDATE MANIFEST ───────────────────────────────────────────

  _validateManifest(manifest, folder) {
    const required = ['id', 'name', 'version', 'type', 'ecosystem', 'cycle', 'capitalKey', 'author', 'description'];

    for (const field of required) {
      if (!manifest[field]) {
        return `manifest.json missing required field: ${field}`;
      }
    }

    if (!VALID_TYPES.includes(manifest.type)) {
      return `invalid type: ${manifest.type}. Must be one of: ${VALID_TYPES.join(', ')}`;
    }

    if (!VALID_ECOSYSTEMS.includes(manifest.ecosystem)) {
      return `invalid ecosystem: ${manifest.ecosystem}. Must be one of: ${VALID_ECOSYSTEMS.join(', ')}`;
    }

    // id must be kebab-case, no spaces
    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      return `invalid id: "${manifest.id}" — must be kebab-case (lowercase, hyphens only)`;
    }

    // Check for duplicate id
    if (this._engines.has(manifest.id)) {
      return `duplicate engine id: ${manifest.id}`;
    }

    return null; // valid
  }

  // ── PRIVATE: VALIDATE INTERFACE ──────────────────────────────────────────

  _validateInterface(instance, manifest) {
    const required = ['start', 'stop', 'runCycle', 'getStatus', 'getState'];

    for (const method of required) {
      if (typeof instance[method] !== 'function') {
        return `engine.js missing required method: ${method}()`;
      }
    }

    // Verify required properties exist
    const requiredProps = ['isRunning', 'cycleCount', 'dryRun'];
    for (const prop of requiredProps) {
      if (instance[prop] === undefined) {
        return `engine.js missing required property: ${prop}`;
      }
    }

    // Verify dry run is true by default — non-negotiable
    if (instance.dryRun !== true) {
      return `engine must default to dryRun: true — live trading default is not permitted`;
    }

    return null; // valid
  }

  // ── PRIVATE: HELPERS ─────────────────────────────────────────────────────

  _isEnabled(manifest) {
    const engineConfig = this.config[manifest.capitalKey];
    return engineConfig?.enabled !== false;
  }

  _getInterval(manifest) {
    const engineConfig = this.config[manifest.capitalKey] || {};
    // Try intervalMinutes first, then intervalHours
    if (engineConfig.intervalMinutes) return engineConfig.intervalMinutes;
    if (engineConfig.intervalHours)   return engineConfig.intervalHours * 60;
    // Parse from manifest cycle string as fallback
    return this._parseCycle(manifest.cycle);
  }

  _parseCycle(cycle) {
    // Parse cycle strings like "5min", "1H", "24H", "Weekly"
    if (!cycle) return 60;
    const lower = cycle.toLowerCase();
    if (lower.includes('min')) return parseInt(lower) || 5;
    if (lower.includes('h'))   return (parseInt(lower) || 1) * 60;
    if (lower.includes('week')) return 10080;
    return 60; // default 1 hour
  }

  _getDryRunLabel(manifest) {
    const engineConfig = this.config[manifest.capitalKey] || {};
    return engineConfig.dryRun !== false ? 'DRY RUN' : '⚠️  LIVE';
  }

  _fail(folder, reason) {
    console.warn(`[REGISTRY]   ❌ ${folder}: ${reason}`);
    this._errors.push({ folder, reason });
  }

}

module.exports = EngineRegistry;
