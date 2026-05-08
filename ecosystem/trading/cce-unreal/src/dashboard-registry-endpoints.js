// ── CCE CORE FRAMEWORK — DYNAMIC ENDPOINTS ───────────────────────────────────
// Append this block to the bottom of dashboard-server.js
// (before the app.listen() call)
//
// Exposes engine registry and layer registry data via REST API.
// Forge HQ and the Command Dashboard can poll these for dynamic engines/layers.
//
// SETUP: Pass registries into the dashboard server.
// In dashboard-server.js, export a setup function:
//
//   module.exports = { app, setupRegistries };
//
// Then in index.js after registries are built:
//
//   const { setupRegistries } = require('./dashboard-server');
//   setupRegistries(registry, layerRegistry);
//
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// Registry references — set via setupRegistries()
let _engineRegistry = null;
let _layerRegistry  = null;

function setupRegistries(engineRegistry, layerRegistry) {
  _engineRegistry = engineRegistry;
  _layerRegistry  = layerRegistry;
  console.log('📊 Dashboard: dynamic registry endpoints active');
}

// ── ENGINE REGISTRY ENDPOINTS ─────────────────────────────────────────────────

// GET /api/registry/engines
// Returns status of all dynamically registered engines
app.get('/api/registry/engines', (req, res) => {
  try {
    if (!_engineRegistry) {
      return res.json({ engines: {}, count: 0, note: 'Engine registry not initialised' });
    }
    const status = _engineRegistry.getStatus();
    res.json({
      engines: status,
      count:   Object.keys(status).length,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/engines/:id
// Returns status of a single dynamic engine by id
app.get('/api/registry/engines/:id', (req, res) => {
  try {
    if (!_engineRegistry) {
      return res.status(503).json({ error: 'Engine registry not initialised' });
    }
    const engine = _engineRegistry.get(req.params.id);
    if (!engine) {
      return res.status(404).json({ error: `Engine not found: ${req.params.id}` });
    }
    res.json(engine.getStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/engines/:id/state
// Returns just the current state string for a dynamic engine
app.get('/api/registry/engines/:id/state', (req, res) => {
  try {
    if (!_engineRegistry) {
      return res.status(503).json({ error: 'Engine registry not initialised' });
    }
    const engine = _engineRegistry.get(req.params.id);
    if (!engine) {
      return res.status(404).json({ error: `Engine not found: ${req.params.id}` });
    }
    res.json({ id: req.params.id, state: engine.getState() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LAYER REGISTRY ENDPOINTS ──────────────────────────────────────────────────

// GET /api/registry/layers
// Returns status of all dynamically registered AI layers
app.get('/api/registry/layers', (req, res) => {
  try {
    if (!_layerRegistry) {
      return res.json({ layers: {}, count: 0, note: 'Layer registry not initialised' });
    }
    const status = _layerRegistry.getStatus();
    res.json({
      layers:    status,
      count:     Object.keys(status).length,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/layers/:id
// Returns status of a single AI layer by id
app.get('/api/registry/layers/:id', (req, res) => {
  try {
    if (!_layerRegistry) {
      return res.status(503).json({ error: 'Layer registry not initialised' });
    }
    const layer = _layerRegistry.get(req.params.id);
    if (!layer) {
      return res.status(404).json({ error: `Layer not found: ${req.params.id}` });
    }
    res.json(layer.getStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/recommendations
// Returns aggregated recommendations from all ANALYST layers
// This is the G.O's input feed
app.get('/api/registry/recommendations', (req, res) => {
  try {
    if (!_layerRegistry) {
      return res.json({ recommendations: [], count: 0 });
    }
    const recs = _layerRegistry.getRecommendations();
    res.json({
      recommendations: recs,
      count:           recs.length,
      timestamp:       new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PLATFORM OVERVIEW ENDPOINT ────────────────────────────────────────────────

// GET /api/registry/overview
// Single endpoint returning everything — for Forge HQ dashboard refresh
app.get('/api/registry/overview', (req, res) => {
  try {
    const overview = {
      timestamp: new Date().toISOString(),
      engines:   {},
      layers:    {},
      recommendations: []
    };

    if (_engineRegistry) {
      overview.engines = _engineRegistry.getStatus();
      overview.engineCount = Object.keys(overview.engines).length;
    }

    if (_layerRegistry) {
      overview.layers = _layerRegistry.getStatus();
      overview.layerCount = Object.keys(overview.layers).length;
      overview.recommendations = _layerRegistry.getRecommendations();
    }

    res.json(overview);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── EXPORT ────────────────────────────────────────────────────────────────────

module.exports = { setupRegistries };

// ─────────────────────────────────────────────────────────────────────────────
// FORGE HQ INTEGRATION
//
// Add this to forge-hq.html to display dynamic engines:
//
// async function loadDynamicEngines() {
//   const res = await fetch('/api/registry/overview');
//   const data = await res.json();
//
//   // Dynamic engines
//   for (const [id, status] of Object.entries(data.engines)) {
//     renderEngineCard(id, status);
//   }
//
//   // AI layer recommendations
//   for (const rec of data.recommendations) {
//     renderRecommendation(rec);
//   }
// }
//
// Call loadDynamicEngines() in your dashboard refresh interval.
// ─────────────────────────────────────────────────────────────────────────────
