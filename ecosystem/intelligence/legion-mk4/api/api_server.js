const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

class APISCP {
  constructor(engine, registryPath) {
    this.engine = engine;
    this.registryPath = registryPath;
    this.app = express();
    this.server = null;
    this.requestCount = 0;
    this.throttleUntil = 0;
    this.readonlyMode = false;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    
    // Rate limiting middleware
    this.app.use((req, res, next) => {
      this.requestCount++;
      
      if (Date.now() < this.throttleUntil) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          retry_after: Math.ceil((this.throttleUntil - Date.now()) / 1000) 
        });
      }
      
      // Reset counter every minute
      setTimeout(() => {
        this.requestCount = 0;
      }, 60000);
      
      next();
    });
    
    // Readonly mode check
    this.app.use((req, res, next) => {
      if (this.readonlyMode && req.method !== 'GET') {
        return res.status(503).json({ error: 'Readonly mode active due to entropy spike' });
      }
      next();
    });
    
    // Logging
    this.app.use((req, res, next) => {
      console.log(`[API] ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Get full registry
    this.app.get('/api/scp/registry', (req, res) => {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      res.json(registry);
    });
    
    // List all agents
    this.app.get('/api/scp/agents', (req, res) => {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      const agents = registry.agents.map(a => ({
        scp_id: a.scp_id,
        name: a.name,
        object_class: a.object_class,
        enabled: a.enabled !== false
      }));
      res.json({ count: agents.length, agents });
    });
    
    // Get specific agent
    this.app.get('/api/scp/agents/:scpId', (req, res) => {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      const agent = registry.agents.find(a => a.scp_id === req.params.scpId);
      
      if (!agent) {
        return res.status(404).json({ error: `Agent ${req.params.scpId} not found` });
      }
      
      res.json(agent);
    });
    
    // Get entropy
    this.app.get('/api/scp/entropy', (req, res) => {
      const status = this.engine.getStatus();
      res.json({
        entropy: status.entropy,
        threshold: status.threshold,
        status: status.entropy > 0.7 ? 'CRITICAL' : status.entropy > 0.3 ? 'ELEVATED' : 'NORMAL',
        last_updated: new Date().toISOString()
      });
    });
    
    // Update entropy
    this.app.post('/api/scp/entropy', (req, res) => {
      const { delta, source } = req.body;
      
      if (typeof delta !== 'number') {
        return res.status(400).json({ error: 'delta must be a number' });
      }
      
      if (Math.abs(delta) > 0.5) {
        return res.status(400).json({ error: 'delta cannot exceed 0.5' });
      }
      
      const newEntropy = this.engine.updateEntropy(delta, source || 'api');
      
      res.json({
        previous_entropy: newEntropy - delta,
        new_entropy: newEntropy,
        threshold: this.engine.registry.containment.threshold,
        status: newEntropy > 0.7 ? 'APOLLYON_TRIGGERED' : 'NORMAL'
      });
    });
    
    // Get Apollyon events
    this.app.get('/api/scp/apollyon', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const events = this.engine.apollyonEvents.slice(-limit);
      res.json({ count: events.length, events });
    });
    
    // Get system status
    this.app.get('/api/scp/status', (req, res) => {
      const status = this.engine.getStatus();
      res.json(status);
    });
    
    // List behaviors
    this.app.get('/api/scp/behaviors', (req, res) => {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      res.json({ count: registry.behaviors.length, behaviors: registry.behaviors });
    });
    
    // List rules
    this.app.get('/api/scp/rules', (req, res) => {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      res.json({ count: registry.rules.length, rules: registry.rules });
    });
    
    // Health check
    this.app.get('/api/scp/health', (req, res) => {
      res.json({
        status: 'online',
        scp_id: 'API-LEGION-001',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        readonly_mode: this.readonlyMode
      });
    });
    
    // Root info
    this.app.get('/api', (req, res) => {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      const apiSCP = registry.agents.find(a => a.scp_id === 'API-LEGION-001');
      
      res.json({
        name: 'LEGION MK4 API',
        version: apiSCP?.version || '1.0.0',
        endpoints: [
          'GET  /api/scp/registry',
          'GET  /api/scp/agents',
          'GET  /api/scp/agents/:scpId',
          'GET  /api/scp/entropy',
          'POST /api/scp/entropy',
          'GET  /api/scp/apollyon',
          'GET  /api/scp/status',
          'GET  /api/scp/behaviors',
          'GET  /api/scp/rules',
          'GET  /api/scp/health'
        ]
      });
    });
  }
  
  start() {
    const port = 3011;
    this.server = this.app.listen(port, () => {
      console.log(`[API_SCP] API-LEGION-001 listening on port ${port}`);
      console.log(`[API_SCP] Endpoints available at http://localhost:${port}/api`);
    });
    return this.server;
  }
  
  stop() {
    if (this.server) {
      this.server.close();
      console.log('[API_SCP] API stopped');
    }
  }
  
  activateThrottle(durationMs = 300000) {
    this.throttleUntil = Date.now() + durationMs;
    console.log(`[API_SCP] Throttle activated until ${new Date(this.throttleUntil).toISOString()}`);
  }
  
  activateReadonlyMode() {
    this.readonlyMode = true;
    console.log('[API_SCP] Readonly mode activated');
  }
}

module.exports = { APISCP };
