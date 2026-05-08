const { exec } = require('child_process');
const { logBreach } = require('../shared/observability_client');

class Reaper {
  constructor() {
    this.zombiesKilled = 0;
    this.interval = null;
  }

  getProcesses() {
    return new Promise((resolve) => {
      // Use ps with standard format that works on Termux
      exec('ps -eo pid,%cpu,rss,comm 2>/dev/null', (error, stdout) => {
        const processes = [];
        if (!stdout) {
          resolve(processes);
          return;
        }
        
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.trim().split(/\s+/);
          if (parts.length < 4) continue;
          
          const pid = parseInt(parts[0]);
          const cpu = parseFloat(parts[1]);
          const rss = parseInt(parts[2]); // RSS in KB
          const comm = parts[3];
          
          // Only watch node processes
          if (comm === 'node' || comm === 'nodejs') {
            processes.push({
              pid,
              cpu,
              mem_mb: rss / 1024,
              command: comm
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
          console.log(`[REAPER] 💀 Killed PID ${pid}`);
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
        let shouldKill = false;
        let reason = '';
        
        // Lower threshold for testing: kill if CPU > 50% or memory > 200MB
        if (proc.cpu > 50) {
          shouldKill = true;
          reason = `CPU ${proc.cpu}%`;
          console.log(`[REAPER] Found high CPU: PID ${proc.pid} at ${proc.cpu}%`);
        } else if (proc.mem_mb > 200) {
          shouldKill = true;
          reason = `MEM ${proc.mem_mb.toFixed(0)}MB`;
          console.log(`[REAPER] Found high memory: PID ${proc.pid} at ${proc.mem_mb.toFixed(0)}MB`);
        }
        
        if (shouldKill) {
          await this.killProcess(proc.pid);
        }
      }
    } catch (err) {
      console.error('[REAPER] Error:', err.message);
    }
  }

  start(intervalMs = 15000) {
    console.log(`[REAPER] Started (interval: ${intervalMs}ms)`);
    this.interval = setInterval(() => this.reap(), intervalMs);
    setTimeout(() => this.reap(), 2000);
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
