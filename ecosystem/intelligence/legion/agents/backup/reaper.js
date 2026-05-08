const { exec } = require('child_process');
const { logBreach } = require('../shared/observability_client');

class Reaper {
  constructor() {
    this.zombiesKilled = 0;
    this.interval = null;
  }

  getProcesses() {
    return new Promise((resolve) => {
      // Match ANY node process (not just legion)
      exec('ps aux | grep "node" | grep -v grep | grep -v pm2 | grep -v reaper', 
        (error, stdout) => {
          const processes = [];
          if (!stdout) {
            resolve(processes);
            return;
          }
          
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.trim().split(/\s+/);
            if (parts.length < 11) continue;
            
            const pid = parseInt(parts[1]);
            const cpu = parseFloat(parts[2]);
            const mem = parseFloat(parts[3]);
            
            // Kill any process with CPU > 70% or memory > 500MB
            if (cpu > 70 || mem > 500) {
              processes.push({
                pid,
                cpu,
                mem,
                cmd: parts.slice(10).join(' ')
              });
            }
          }
          resolve(processes);
        });
    });
  }

  killProcess(pid) {
    return new Promise((resolve) => {
      exec(`kill -9 ${pid} 2>/dev/null`, (error) => {
        if (!error) {
          this.zombiesKilled++;
          // console.log(`[REAPER] 💀 Killed PID ${pid}`);
          logBreach('ZOMBIE_KILLED', `PID ${pid} killed (high CPU/memory)`, 'reaper');
        }
        resolve(!error);
      });
    });
  }

  async reap() {
    try {
      const processes = await this.getProcesses();
      
      for (const proc of processes) {
        // console.log(`[REAPER] Found rogue process: PID ${proc.pid} CPU:${proc.cpu}% MEM:${proc.mem}MB`);
        await this.killProcess(proc.pid);
      }
    } catch (err) {
      console.error('[REAPER] Error:', err.message);
    }
  }

  start(intervalMs = 15000) {
    // console.log(`[REAPER] Started (interval: ${intervalMs}ms)`);
    this.interval = setInterval(() => this.reap(), intervalMs);
    setTimeout(() => this.reap(), 3000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getStats() {
    return { zombies_killed: this.zombiesKilled };
  }
}

module.exports = { Reaper };
