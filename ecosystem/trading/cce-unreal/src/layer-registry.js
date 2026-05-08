// src/layer-registry.js
// CCE Core Framework — Layer Registry
//
// Scans the /ai-layers folder at boot time, validates manifests,
// instantiates layers, and wires them to their declared hooks.
//
// ADDITIVE — existing O.E engines in index.js are unaffected.
// New layers dropped into /ai-layers/ are auto-detected alongside them.
//
// Usage in index.js:
//
//   const LayerRegistry = require('./src/layer-registry');
//
//   // After all engines are instantiated:
//   const allEngines = {
//     crypto: cryptoEngine,
//     forex:  forexEngine,
//     ...registry.getAll()  // include dynamic engines
//   };
//
//   const layerRegistry = new LayerRegistry(config, sharedNotifier, allEngines);
//   await layerRegistry.scan();
//   const layerPromises = layerRegistry.startAll();
//   engines.push(...layerPromises);
//
//   // To fire hooks from an engine cycle:
//   await layerRegistry.fireHook('post_cycle', 'crypto', status, cycleData);

'use strict';

const fs   = require('fs');
const path = require('path');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const LAYERS_DIR      = path.join(process.cwd(), 'ai-layers');
const VALID_PATTERNS  = ['OBSERVER', 'ANALYST', 'SENTINEL'];
const VALID_HOOKS     = ['post_cycle', 'on_transition', 'on_signal', 'scheduled'];
const VALID_ECOSYSTEMS = ['S.E', 'T.E', 'O.E'];

// ── LAYER REGISTRY ────────────────────────────────────────────────────────────

class LayerRegistry {

  constructor(config, notifier, engines = {}) {
    this.config   = config;
    this.notifier = notifier;
    this.engines  = engines; // read-only engine map

    this._layers  = new Map(); // id → { manifest, instance }
    this._hooks   = {          // hook → [layerIds]
      post_cycle:    [],
      on_transition: [],
      on_signal:     [],
      scheduled:     []
    };
    this._errors  = [];
    this._scanned = false;
  }

  // ── SCAN ──────────────────────────────────────────────────────────────────
  // Scans /ai-layers, validates manifests, instantiates layers.
  // Call once at boot before startAll().

  async scan() {
    if (!fs.existsSync(LAYERS_DIR)) {
      console.log('[LAYERS] No /ai-layers directory found — skipping scan');
      this._scanned = true;
      return;
    }

    const entries = fs.readdirSync(LAYERS_DIR, { withFileTypes: true });
    const folders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => e.name);

    if (folders.length === 0) {
      console.log('[LAYERS] No layers found in /ai-layers directory');
      this._scanned = true;
      return;
    }

    console.log(`\n[LAYERS] Scanning /ai-layers — found ${folders.length} candidate(s)`);

    for (const folder of folders) {
      await this._loadLayer(folder);
    }

    const loaded = this._layers.size;
    const failed = this._errors.length;
    console.log(`[LAYERS] ✅ Loaded: ${loaded} | ❌ Failed: ${failed}`);

    // Report hook registrations
    for (const [hook, ids] of Object.entries(this._hooks)) {
      if (ids.length > 0) {
        console.log(`[LAYERS]   ${hook}: ${ids.join(', ')}`);
      }
    }
    console.log('');

    if (this._errors.length > 0) {
      console.log('[LAYERS] Failed layers:');
      this._errors.forEach(e => console.log(`  ❌ ${e.folder}: ${e.reason}`));
    }

    this._scanned = true;
  }

  // ── START ALL ─────────────────────────────────────────────────────────────
  // Starts all scheduled layers.
  // Returns array of start() Promises — push to your engines[] array.
  // Hook-driven layers don't need start() — they're fired via fireHook().

  startAll() {
    if (!this._scanned) {
      throw new Error('[LAYERS] Must call scan() before startAll()');
    }

    const promises = [];

    for (const [id, entry] of this._layers) {
      const { manifest, instance } = entry;

      if (manifest.hook !== 'scheduled') continue;
      if (!this._isEnabled(manifest)) {
        console.log(`[LAYERS] ⏭️  ${manifest.name} — disabled in config`);
        continue;
      }

      const interval = manifest.interval_minutes || 15;
      console.log(`[LAYERS] 🚀 Starting ${manifest.name} — ${interval}min scheduled`);

      promises.push(
        instance.start(interval).catch(err => {
          console.error(`[LAYERS] ❌ ${manifest.name} crashed: ${err.message}`);
        })
      );
    }

    return promises;
  }

  // ── FIRE HOOK ─────────────────────────────────────────────────────────────
  // Called by engines to trigger hook-based layers.
  // Engines call this — the registry dispatches to all registered layers.
  //
  // Examples:
  //   await layerRegistry.fireHook('post_cycle', 'crypto', status, cycleData);
  //   await layerRegistry.fireHook('on_transition', 'grid', 'ACTIVE', 'STOPPED', signals);
  //   await layerRegistry.fireHook('on_signal', 'lce', signals);

  async fireHook(hook, engineId, ...args) {
    const layerIds = this._hooks[hook] || [];
    if (layerIds.length === 0) return;

    const methodMap = {
      post_cycle:    'onPostCycle',
      on_transition: 'onTransition',
      on_signal:     'onSignal'
    };

    const method = methodMap[hook];
    if (!method) return;

    for (const layerId of layerIds) {
      const entry = this._layers.get(layerId);
      if (!entry) continue;

      // Only fire if engine's ecosystem matches layer's attaches_to
      if (!this._engineMatchesLayer(engineId, entry.manifest)) continue;

      try {
        await entry.instance[method](engineId, ...args);
      } catch (err) {
        console.error(`[LAYERS] ❌ Hook error in ${layerId}.${method}: ${err.message}`);
      }
    }
  }

  // ── STOP ALL ──────────────────────────────────────────────────────────────

  stopAll() {
    for (const [id, entry] of this._layers) {
      try {
        if (typeof entry.instance.stop === 'function') {
          entry.instance.stop();
        }
      } catch (err) {
        console.error(`[LAYERS] Error stopping ${id}: ${err.message}`);
      }
    }
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────

  getAll() {
    const result = {};
    for (const [id, entry] of this._layers) {
      result[id] = entry.instance;
    }
    return result;
  }

  get(id) {
    return this._layers.get(id)?.instance || null;
  }

  // ── GET RECOMMENDATIONS ───────────────────────────────────────────────────
  // Aggregates recommendations from all ANALYST layers.
  // Used by G.O Orchestrator.

  getRecommendations() {
    const all = [];
    for (const [id, entry] of this._layers) {
      if (entry.manifest.pattern !== 'ANALYST') continue;
      try {
        const recs = entry.instance.getRecommendations?.() || [];
        recs.forEach(r => all.push({ ...r, source: id }));
      } catch (err) {
        // silent
      }
    }
    return all;
  }

  // ── GET STATUS ────────────────────────────────────────────────────────────

  getStatus() {
    const status = {};
    for (const [id, entry] of this._layers) {
      try {
        status[id] = entry.instance.getStatus?.() || { id };
      } catch (err) {
        status[id] = { error: err.message };
      }
    }
    return status;
  }

  // ── PRIVATE: LOAD LAYER ───────────────────────────────────────────────────

  async _loadLayer(folder) {
    const layerDir    = path.join(LAYERS_DIR, folder);
    const manifestPath = path.join(layerDir, 'manifest.json');
    const layerPath    = path.join(layerDir, 'layer.js');

    // manifest.json must exist
    if (!fs.existsSync(manifestPath)) {
      this._fail(folder, 'missing manifest.json');
      return;
    }

    // Parse manifest
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      this._fail(folder, `invalid manifest.json: ${err.message}`);
      return;
    }

    // Validate manifest
    const validationError = this._validateManifest(manifest, folder);
    if (validationError) {
      this._fail(folder, validationError);
      return;
    }

    // layer.js must exist
    if (!fs.existsSync(layerPath)) {
      this._fail(folder, 'missing layer.js');
      return;
    }

    // Load layer class
    let LayerClass;
    try {
      LayerClass = require(layerPath);
    } catch (err) {
      this._fail(folder, `failed to require layer.js: ${err.message}`);
      return;
    }

    // Instantiate
    let instance;
    try {
      instance = new LayerClass(this.config, this.notifier, this.engines);
    } catch (err) {
      this._fail(folder, `failed to instantiate: ${err.message}`);
      return;
    }

    // Validate interface
    const interfaceError = this._validateInterface(instance, manifest);
    if (interfaceError) {
      this._fail(folder, interfaceError);
      return;
    }

    // Register
    this._layers.set(manifest.id, { manifest, instance });

    // Register hooks
    if (manifest.hook && manifest.hook !== 'scheduled') {
      if (this._hooks[manifest.hook]) {
        this._hooks[manifest.hook].push(manifest.id);
      }
    }

    console.log(`[LAYERS]   ✅ ${manifest.name} (${manifest.id}) — ${manifest.pattern} · hook: ${manifest.hook}`);
  }

  // ── PRIVATE: VALIDATE MANIFEST ───────────────────────────────────────────

  _validateManifest(manifest, folder) {
    const required = ['id', 'name', 'version', 'pattern', 'hook', 'attaches_to', 'author', 'description'];

    for (const field of required) {
      if (!manifest[field]) return `manifest.json missing required field: ${field}`;
    }

    if (!VALID_PATTERNS.includes(manifest.pattern))
      return `invalid pattern: ${manifest.pattern}. Must be: ${VALID_PATTERNS.join(', ')}`;

    if (!VALID_HOOKS.includes(manifest.hook))
      return `invalid hook: ${manifest.hook}. Must be: ${VALID_HOOKS.join(', ')}`;

    if (!Array.isArray(manifest.attaches_to) || manifest.attaches_to.length === 0)
      return 'attaches_to must be a non-empty array';

    if (!/^[a-z0-9-]+$/.test(manifest.id))
      return `invalid id: "${manifest.id}" — must be kebab-case`;

    if (this._layers.has(manifest.id))
      return `duplicate layer id: ${manifest.id}`;

    return null;
  }

  // ── PRIVATE: VALIDATE INTERFACE ──────────────────────────────────────────

  _validateInterface(instance, manifest) {
    // All layers must have getStatus
    if (typeof instance.getStatus !== 'function')
      return 'layer.js missing required method: getStatus()';

    // Hook-based layers must implement the hook method
    const hookMethods = {
      post_cycle:    'onPostCycle',
      on_transition: 'onTransition',
      on_signal:     'onSignal'
    };

    const requiredMethod = hookMethods[manifest.hook];
    if (requiredMethod && typeof instance[requiredMethod] !== 'function')
      return `layer.js missing hook method: ${requiredMethod}()`;

    // Scheduled layers must have start()
    if (manifest.hook === 'scheduled' && typeof instance.start !== 'function')
      return 'scheduled layer missing required method: start()';

    return null;
  }

  // ── PRIVATE: HELPERS ─────────────────────────────────────────────────────

  _isEnabled(manifest) {
    const layerConfig = this.config[manifest.id.replace(/-/g, '_')];
    return layerConfig?.enabled !== false;
  }

  _engineMatchesLayer(engineId, manifest) {
    if (!manifest.attaches_to || manifest.attaches_to.length === 0) return true;

    // Map engine ids to ecosystems
    const ecosystemMap = {
      crypto: 'S.E', forex: 'S.E', rme: 'S.E',
      cme: 'S.E', como: 'S.E', egp: 'S.E',
      grid: 'T.E', mom: 'T.E', brk: 'T.E', lce: 'T.E',
      obs: 'O.E', str: 'O.E', sentinel: 'O.E'
    };

    const ecosystem = ecosystemMap[engineId] || 'S.E';
    return manifest.attaches_to.includes(ecosystem) ||
           manifest.attaches_to.includes('ALL');
  }

  _fail(folder, reason) {
    console.warn(`[LAYERS]   ❌ ${folder}: ${reason}`);
    this._errors.push({ folder, reason });
  }

}

module.exports = LayerRegistry;
