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
      lastHeartbeat: null,
      actions: 0
    };
  }
  
  async start() {
    this.status = 'starting';
    this.metrics.starts++;
    this.metrics.lastHeartbeat = Date.now();
    
    console.log(`[${this.scp.name}] Starting (${this.scp.object_class})`);
    
    // Apply containment procedures
    if (this.scp.containment_procedures) {
      for (const [key, value] of Object.entries(this.scp.containment_procedures)) {
        this[key] = value;
        console.log(`[${this.scp.name}] Containment: ${key}=${JSON.stringify(value)}`);
      }
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
  
  async heartbeat() {
    this.metrics.lastHeartbeat = Date.now();
    this.emit('heartbeat', { agent: this.scp.name, status: this.status });
    return this.status === 'running';
  }
  
  getStatus() {
    return {
      scp_id: this.scp.scp_id,
      name: this.scp.name,
      class: this.scp.object_class,
      type: this.scp.type,
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
  
  async handleAction(action, params) {
    this.metrics.actions++;
    this.log(`Action: ${action}`, 'debug');
    
    // Override in child classes
    return { success: true, action, params };
  }
}

module.exports = { BaseAgent };
