const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class SCPEngine extends EventEmitter {
  constructor(registryPath) {
    super();
    this.registryPath = registryPath;
    this.registry = null;
    this.agents = new Map();
    this.entropy = 0;
    this.apollyonEvents = [];
    this.running = false;
  }
  
  load() {
    try {
      this.registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      this.entropy = this.registry.containment.global_entropy;
      console.log(`[SCP_ENGINE] Loaded ${this.registry.agents.length} agents`);
      return true;
    } catch (err) {
      console.error(`[SCP_ENGINE] Failed to load: ${err.message}`);
      return false;
    }
  }
  
  validate() {
    if (!this.registry) return false;
    
    // Check required fields
    const required = ['scp_id', 'object_class', 'agents', 'containment'];
    for (const req of required) {
      if (!this.registry[req]) {
        console.error(`[SCP_ENGINE] Missing required field: ${req}`);
        return false;
      }
    }
    
    console.log('[SCP_ENGINE] Registry validation passed');
    return true;
  }
  
  getAgent(scpId) {
    return this.registry.agents.find(a => a.scp_id === scpId);
  }
  
  getEnabledAgents() {
    return this.registry.agents.filter(a => a.enabled !== false);
  }
  
  updateEntropy(delta, source) {
    const oldEntropy = this.entropy;
    this.entropy = Math.min(1, Math.max(0, this.entropy + delta));
    
    console.log(`[SCP_ENGINE] Entropy: ${oldEntropy.toFixed(2)} → ${this.entropy.toFixed(2)} (${delta > 0 ? '+' : ''}${delta})`);
    
    if (this.entropy > this.registry.containment.threshold) {
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
    console.log(`[SCP_ENGINE] ⚠️ APOLLYON: ${reason}`);
    this.emit('apollyon', event);
    
    return event;
  }
  
  getStatus() {
    return {
      scp_id: this.registry?.scp_id,
      version: this.registry?.version,
      entropy: this.entropy,
      threshold: this.registry?.containment.threshold,
      agents: this.agents.size,
      apollyon_count: this.apollyonEvents.length,
      running: this.running
    };
  }
  
  save() {
    if (!this.registry) return;
    
    this.registry.containment.global_entropy = this.entropy;
    this.registry.containment.apollyon_events = this.apollyonEvents;
    
    fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
    console.log('[SCP_ENGINE] Registry saved');
  }
}

module.exports = { SCPEngine };
