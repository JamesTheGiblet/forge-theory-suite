const os = require('os');
const { sendMessage } = require('../bus/router');

class SwarmCoordinator {
  constructor() {
    this.instances = new Map();
    this.isLeader = false;
    this.instanceId = `${os.hostname()}-${process.pid}`;
    this.heartbeatInterval = null;
  }

  start() {
    // console.log(`[SWARM] Instance ${this.instanceId} starting`);
    
    // Try to become leader (simplified: first instance wins)
    this.electLeader();
    
    // Heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);
  }

  electLeader() {
    // In production, use a distributed lock (Redis, etc.)
    // For now, assume first instance is leader
    this.isLeader = true;
    // console.log('[SWARM] This instance is the LEADER');
    sendMessage('diplomat', 'SWARM_LEADER_ELECTED', { instanceId: this.instanceId });
  }

  sendHeartbeat() {
    const heartbeat = {
      instanceId: this.instanceId,
      timestamp: Date.now(),
      isLeader: this.isLeader,
      load: os.loadavg()[0],
      memory: process.memoryUsage().rss / 1024 / 1024
    };
    // Broadcast to other instances (would use messaging bus)
    // console.log(`[SWARM] Heartbeat sent (leader: ${this.isLeader})`);
  }

  getStatus() {
    return {
      instanceId: this.instanceId,
      isLeader: this.isLeader,
      instances: Array.from(this.instances.keys())
    };
  }
}

module.exports = { SwarmCoordinator };
