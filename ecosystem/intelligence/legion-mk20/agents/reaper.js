const { BaseAgent } = require('./base_agent');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

class Reaper extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.killed = 0;
    this.interval = null;
  }
  
  async start() {
    await super.start();
    this.log(`Reaper active. CPU threshold: ${this.cpu_threshold}%`);
    this.startReaping();
    return true;
  }
  
  startReaping() {
    this.interval = setInterval(() => this.reap(), this.check_interval);
    setTimeout(() => this.reap(), 5000);
  }
  
  async reap() {
    try {
      const { stdout } = await execPromise('ps aux | grep node | grep -v grep | grep -v reaper');
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) continue;
        
        const pid = parseInt(parts[1]);
        const cpu = parseFloat(parts[2]);
        const mem = parseFloat(parts[3]);
        
        if (cpu > this.cpu_threshold || mem > this.memory_threshold_mb) {
          this.log(`Killing rogue PID ${pid} (CPU:${cpu}% MEM:${mem}MB)`, 'warn');
          await execPromise(`kill -9 ${pid}`);
          this.killed++;
          this.engine.updateEntropy(0.05, `reaper_killed_${pid}`);
        }
      }
    } catch (err) {}
  }
}

module.exports = { Reaper };
