const { BaseAgent } = require('./base_agent');
const { exec } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');

class EmergencyKillSwitch extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.app = null;
    this.server = null;
    this.port = this.port || 3003;
    this.state = { kill_switch_activated: false, emergency_close_triggered: false, history: [] };
  }
  
  async start() {
    await super.start();
    this.loadState();
    this.startServer();
    this.log(`Emergency Kill Switch active on port ${this.port}`);
    return true;
  }
  
  loadState() {
    const stateFile = path.join(__dirname, '../data/emergency_state.json');
    try {
      if (fs.existsSync(stateFile)) {
        this.state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      }
    } catch(e) {}
  }
  
  saveState() {
    const stateFile = path.join(__dirname, '../data/emergency_state.json');
    fs.writeFileSync(stateFile, JSON.stringify(this.state, null, 2));
  }
  
  startServer() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(require('cors')());
    
    // Kill switch endpoint
    this.app.post('/api/kill_switch', (req, res) => {
      this.state.kill_switch_activated = true;
      this.state.history.push({ timestamp: new Date().toISOString(), action: 'KILL_SWITCH', reason: req.body.reason });
      this.saveState();
      exec('pm2 stop all', () => {});
      this.log('🚨 KILL SWITCH ACTIVATED', 'warn');
      this.engine.updateEntropy(0.3, 'kill_switch');
      res.json({ status: 'killed', timestamp: new Date().toISOString() });
    });
    
    // Emergency close endpoint
    this.app.post('/api/emergency/close_all', (req, res) => {
      this.state.emergency_close_triggered = true;
      this.state.history.push({ timestamp: new Date().toISOString(), action: 'EMERGENCY_CLOSE', reason: req.body.reason });
      this.saveState();
      this.log('💰 EMERGENCY CLOSE ALL POSITIONS', 'warn');
      res.json({ status: 'closed', paper_mode: true, timestamp: new Date().toISOString() });
    });
    
    // Status endpoint
    this.app.get('/api/emergency/status', (req, res) => {
      res.json({
        kill_switch_activated: this.state.kill_switch_activated,
        emergency_close_triggered: this.state.emergency_close_triggered,
        history: this.state.history.slice(-10)
      });
    });
    
    this.server = this.app.listen(this.port, () => {
      this.log(`🚨 Emergency API listening on port ${this.port}`);
    });
  }
  
  async stop() {
    if (this.server) this.server.close();
    await super.stop();
  }
}

module.exports = { EmergencyKillSwitch };
