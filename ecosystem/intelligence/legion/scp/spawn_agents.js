const { SCPLoader } = require('./scp_loader');
const { spawn } = require('child_process');
const path = require('path');

class SCPSpawner {
  constructor() {
    this.loader = new SCPLoader();
    this.registry = this.loader.loadRegistry();
    this.spawnedAgents = [];
  }
  
  async spawnAll() {
    console.log('\n🔮 SCP-DRIVEN LEGION BOOT\n');
    
    for (const agent of this.registry.agents) {
      await this.spawnAgent(agent);
    }
    
    console.log(`\n✅ Spawned ${this.spawnedAgents.length} agents from SCP registry`);
    return this.spawnedAgents;
  }
  
  async spawnAgent(agentConfig) {
    const agentPath = path.join(__dirname, '../agents', this.getAgentFile(agentConfig.name));
    
    console.log(`[SPAWN] ${agentConfig.name} (${agentConfig.object_class})`);
    console.log(`   └─ Containment: ${JSON.stringify(agentConfig.containment_procedures).substring(0, 100)}...`);
    
    // In a real implementation, this would spawn or configure the agent
    this.spawnedAgents.push({
      scp_id: agentConfig.scp_id,
      name: agentConfig.name,
      class: agentConfig.object_class,
      status: 'spawned',
      procedures: agentConfig.containment_procedures
    });
  }
  
  getAgentFile(name) {
    const mapping = {
      'Forge Lord': 'forge_lord.js',
      'Reaper': 'reaper.js',
      'Librarian': 'librarian.js',
      'Chameleon LM': 'chameleon_lm.js',
      'Auditor': 'auditor.js',
      'Diplomat': 'diplomat.js'
    };
    return mapping[name] || `${name.toLowerCase().replace(/ /g, '_')}.js`;
  }
  
  getStatus() {
    return {
      registry_version: this.registry.version,
      agents: this.spawnedAgents.map(a => ({
        name: a.name,
        class: a.class,
        status: a.status
      })),
      entropy: this.loader.entropy,
      apollyon_count: this.loader.apollyonEvents.length
    };
  }
}

module.exports = { SCPSpawner };
