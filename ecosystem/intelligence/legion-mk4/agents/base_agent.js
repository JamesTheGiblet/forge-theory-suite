const EventEmitter = require('events');

class BaseAgent extends EventEmitter {
  constructor(scpConfig, engine) {
    super();
    this.scp = scpConfig;
    this.engine = engine;
    this.status = 'initializing';
    this.metrics = {
      starts: 0,
      errors: 0,
      lastHeartbeat: null
    };
  }
  
  async start() {
    this.status = 'starting';
    this.metrics.starts++;
    this.metrics.lastHeartbeat = Date.now();
    
    console.log(`[${this.scp.name}] Starting (${this.scp.object_class})`);
    
    // Apply containment procedures
    if (this.scp.containment_procedures) {
      this.applyContainment(this.scp.containment_procedures);
    }
    
    this.status = 'running';
    this.emit('started', { agent: this.scp.name, timestamp: Date.now() });
    
    return true;
  }
  
  async stop() {
    this.status = 'stopping';
    console.log(`[${this.scp.name}] Stopping`);
    this.status = 'stopped';
    this.emit('stopped', { agent: this.scp.name, timestamp: Date.now() });
    return true;
  }
  
  applyContainment(procedures) {
    // Apply each containment rule
    for (const [key, value] of Object.entries(procedures)) {
      console.log(`[${this.scp.name}] Containment: ${key}=${JSON.stringify(value)}`);
      this[key] = value;
    }
  }
  
  heartbeat() {
    this.metrics.lastHeartbeat = Date.now();
    this.emit('heartbeat', { agent: this.scp.name, status: this.status });
    return this.status === 'running';
  }
  
  getStatus() {
    return {
      scp_id: this.scp.scp_id,
      name: this.scp.name,
      class: this.scp.object_class,
      status: this.status,
      metrics: this.metrics
    };
  }
  
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: this.scp.name,
      level,
      message
    };
    this.emit('log', logEntry);
    console.log(`[${this.scp.name}] ${message}`);
  }
}

module.exports = { BaseAgent };
