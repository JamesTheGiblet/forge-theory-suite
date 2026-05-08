const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class SCPEngine extends EventEmitter {
  constructor(scpPath) {
    super();
    this.scpPath = scpPath;
    this.scp = null;
    this.agents = new Map();
    this.entropy = 0;
    this.apollyonEvents = [];
    this.running = false;
  }
  
  load() {
    try {
      this.scp = JSON.parse(fs.readFileSync(this.scpPath, 'utf8'));
      this.entropy = this.scp.containment.global_entropy;
      console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
      console.log(`║  ${this.scp.title}`);
      console.log(`║  ${this.scp.subtitle}`);
      console.log(`╚════════════════════════════════════════════════════════════════╝`);
      console.log(`\n[SCP_ENGINE] Loaded ${this.scp.scp_id} v${this.scp.version}`);
      console.log(`[SCP_ENGINE] Object Class: ${this.scp.object_class}`);
      console.log(`[SCP_ENGINE] Agents: ${this.scp.agents.length}`);
      console.log(`[SCP_ENGINE] Behaviors: ${this.scp.behaviors.length}`);
      console.log(`[SCP_ENGINE] Rules: ${this.scp.rules.length}`);
      return true;
    } catch (err) {
      console.error(`[SCP_ENGINE] Failed to load: ${err.message}`);
      return false;
    }
  }
  
  validate() {
    if (!this.scp) return false;
    
    const required = ['scp_id', 'object_class', 'agents', 'containment'];
    for (const req of required) {
      if (!this.scp[req]) {
        console.error(`[SCP_ENGINE] Missing required field: ${req}`);
        return false;
      }
    }
    
    console.log('[SCP_ENGINE] Validation passed');
    return true;
  }
  
  getAgent(scpId) {
    return this.scp.agents.find(a => a.scp_id === scpId);
  }
  
  getEnabledAgents() {
    return this.scp.agents.filter(a => a.enabled !== false);
  }
  
  updateEntropy(delta, source) {
    const oldEntropy = this.entropy;
    this.entropy = Math.min(1, Math.max(0, this.entropy + delta));
    
    console.log(`[SCP_ENGINE] Entropy: ${oldEntropy.toFixed(2)} → ${this.entropy.toFixed(2)} (${delta > 0 ? '+' : ''}${delta}) from ${source}`);
    
    // Update SCP.json
    this.scp.containment.global_entropy = this.entropy;
    fs.writeFileSync(this.scpPath, JSON.stringify(this.scp, null, 2));
    
    if (this.entropy > this.scp.containment.threshold) {
      this.triggerApollyon(`Entropy exceeded threshold: ${this.entropy}`, source);
    }
    
    this.emit('entropy_change', { old: oldEntropy, new: this.entropy, source });
    return this.entropy;
  }
  
  triggerApollyon(reason, source) {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'APOLLYON',
      reason,
      source,
      entropy: this.entropy
    };
    
    this.apollyonEvents.push(event);
    this.scp.containment.apollyon_events.push(event);
    fs.writeFileSync(this.scpPath, JSON.stringify(this.scp, null, 2));
    
    console.log(`[SCP_ENGINE] ⚠️ APOLLYON: ${reason}`);
    this.emit('apollyon', event);
    
    return event;
  }
  
  getStatus() {
    return {
      scp_id: this.scp?.scp_id,
      version: this.scp?.version,
      object_class: this.scp?.object_class,
      entropy: this.entropy,
      threshold: this.scp?.containment.threshold,
      agents: this.agents.size,
      apollyon_count: this.apollyonEvents.length,
      running: this.running,
      paper_mode: this.scp?.paper_mode
    };
  }
  
  save() {
    this.scp.containment.global_entropy = this.entropy;
    fs.writeFileSync(this.scpPath, JSON.stringify(this.scp, null, 2));
    console.log('[SCP_ENGINE] State saved');
  }
}

module.exports = { SCPEngine };
