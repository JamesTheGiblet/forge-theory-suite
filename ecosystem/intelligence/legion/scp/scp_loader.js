const fs = require('fs');
const path = require('path');

class SCPLoader {
  constructor() {
    this.registry = null;
    this.entropy = 0;
    this.apollyonEvents = [];
  }
  
  loadRegistry() {
    const registryPath = path.join(__dirname, 'scp_registry.json');
    this.registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    console.log(`[SCP] Loaded ${this.registry.agents.length} agents`);
    console.log(`[SCP] Loaded ${this.registry.behaviors.length} behaviors`);
    console.log(`[SCP] Loaded ${this.registry.rules.length} rules`);
    return this.registry;
  }
  
  getAgent(scpId) {
    return this.registry.agents.find(a => a.scp_id === scpId);
  }
  
  getAllAgents() {
    return this.registry.agents;
  }
  
  getBehaviors() {
    return this.registry.behaviors;
  }
  
  getRules() {
    return this.registry.rules;
  }
  
  updateEntropy(delta) {
    this.entropy = Math.min(1, Math.max(0, this.entropy + delta));
    
    if (this.entropy > this.registry.containment.threshold) {
      this.triggerApollyon(`Entropy exceeded threshold: ${this.entropy}`);
    }
    
    return this.entropy;
  }
  
  triggerApollyon(reason) {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'APOLLYON',
      reason: reason,
      entropy: this.entropy
    };
    
    this.apollyonEvents.push(event);
    console.log(`[SCP] ⚠️ APOLLYON EVENT: ${reason}`);
    
    // Log to observability
    const { logBreach } = require('../shared/observability_client');
    logBreach('APOLLYON', reason, 'scp_loader');
    
    return event;
  }
  
  getAgentConfig(agentName) {
    const agent = this.registry.agents.find(a => a.name === agentName);
    if (!agent) return null;
    
    return {
      ...agent.containment_procedures,
      evolution: agent.evolution,
      class: agent.object_class
    };
  }
  
  saveEvolution() {
    const evolutionPath = path.join(__dirname, 'evolution_history.json');
    const history = {
      timestamp: new Date().toISOString(),
      entropy: this.entropy,
      agent_count: this.registry.agents.length,
      apollyon_count: this.apollyonEvents.length
    };
    
    let existing = [];
    if (fs.existsSync(evolutionPath)) {
      existing = JSON.parse(fs.readFileSync(evolutionPath, 'utf8'));
    }
    
    existing.push(history);
    fs.writeFileSync(evolutionPath, JSON.stringify(existing, null, 2));
  }
}

module.exports = { SCPLoader };
