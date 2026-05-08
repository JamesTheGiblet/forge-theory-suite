const fs = require('fs');
const path = require('path');

class HotReload {
  constructor(engine, spawner) {
    this.engine = engine;
    this.spawner = spawner;
    this.scpPath = path.join(__dirname, '../scp/SCP.json');
    this.lastModified = null;
    this.watcher = null;
  }
  
  start() {
    console.log('[HOT_RELOAD] Watching SCP.json for changes...');
    
    this.watcher = fs.watch(this.scpPath, (eventType) => {
      if (eventType === 'change') {
        this.handleChange();
      }
    });
  }
  
  async handleChange() {
    const stats = fs.statSync(this.scpPath);
    if (this.lastModified === stats.mtimeMs) return;
    this.lastModified = stats.mtimeMs;
    
    console.log('[HOT_RELOAD] 🔄 SCP.json changed, reloading...');
    
    try {
      const newSCP = JSON.parse(fs.readFileSync(this.scpPath, 'utf8'));
      
      // Compare agents
      const oldAgents = this.engine.scp.agents;
      const newAgents = newSCP.agents;
      
      // Find added agents
      const added = newAgents.filter(a => !oldAgents.find(o => o.scp_id === a.scp_id));
      
      // Find removed agents
      const removed = oldAgents.filter(o => !newAgents.find(a => a.scp_id === o.scp_id));
      
      // Find modified agents
      const modified = newAgents.filter(a => {
        const old = oldAgents.find(o => o.scp_id === a.scp_id);
        if (!old) return false;
        return JSON.stringify(old.containment_procedures) !== JSON.stringify(a.containment_procedures);
      });
      
      // Apply changes
      for (const agent of removed) {
        const instance = this.spawner.getAgent(agent.scp_id);
        if (instance) {
          await instance.stop();
          this.engine.agents.delete(agent.scp_id);
          this.spawner.spawnedAgents.delete(agent.scp_id);
          console.log(`[HOT_RELOAD] 🗑️  Removed agent: ${agent.name}`);
        }
      }
      
      for (const agent of added) {
        await this.spawner.spawnAgent(agent);
        console.log(`[HOT_RELOAD] ✨ Added agent: ${agent.name}`);
      }
      
      for (const agent of modified) {
        const instance = this.spawner.getAgent(agent.scp_id);
        if (instance) {
          // Update containment procedures without full restart
          Object.assign(instance, agent.containment_procedures);
          console.log(`[HOT_RELOAD] 🔄 Updated agent: ${agent.name}`);
        }
      }
      
      // Update engine with new SCP
      this.engine.scp = newSCP;
      
      console.log(`[HOT_RELOAD] ✅ Reload complete. Agents: ${this.spawner.spawnedAgents.size}`);
      
    } catch (err) {
      console.error('[HOT_RELOAD] ❌ Failed to reload:', err.message);
    }
  }
  
  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

module.exports = { HotReload };
