const { BaseAgent } = require('../agents/base_agent');
const { SCPEngine } = require('./scp_engine');

class SCPSpawner {
  constructor(engine) {
    this.engine = engine;
    this.spawnedAgents = new Map();
  }
  
  async spawnAll() {
    console.log('\n🔮 Spawning agents from SCP registry...\n');
    
    const agents = this.engine.getEnabledAgents();
    
    for (const agentConfig of agents) {
      await this.spawnAgent(agentConfig);
    }
    
    console.log(`\n✅ Spawned ${this.spawnedAgents.size} agents\n`);
    return this.spawnedAgents;
  }
  
  async spawnAgent(agentConfig) {
    // Skip core controller (handled separately)
    if (agentConfig.scp_id === 'AGENT-CORE-000') return;
    
    const agent = new BaseAgent(agentConfig, this.engine);
    
    // Set up event forwarding
    agent.on('started', (data) => {
      this.engine.emit('agent_started', data);
    });
    
    agent.on('stopped', (data) => {
      this.engine.emit('agent_stopped', data);
    });
    
    agent.on('log', (logEntry) => {
      this.engine.emit('agent_log', logEntry);
    });
    
    agent.on('heartbeat', (data) => {
      this.engine.emit('agent_heartbeat', data);
    });
    
    await agent.start();
    
    this.spawnedAgents.set(agentConfig.scp_id, agent);
    this.engine.agents.set(agentConfig.scp_id, agent);
    
    return agent;
  }
  
  getAgent(scpId) {
    return this.spawnedAgents.get(scpId);
  }
  
  async stopAll() {
    console.log('\n🛑 Stopping all agents...\n');
    
    for (const [scpId, agent] of this.spawnedAgents) {
      await agent.stop();
    }
    
    this.spawnedAgents.clear();
    console.log('\n✅ All agents stopped\n');
  }
}

module.exports = { SCPSpawner };
