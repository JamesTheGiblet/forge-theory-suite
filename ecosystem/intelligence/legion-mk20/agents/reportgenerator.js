const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class ReportGenerator extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.reports = [];
    this.reportDir = this.output_dir || './reports';
    this.reportTypes = this.report_types || ['status', 'entropy', 'agents'];
  }
  
  async start() {
    await super.start();
    
    // Create reports directory
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    
    this.log(`Report Generator active. Types: ${this.reportTypes.join(', ')}`);
    
    // Generate initial report
    await this.generateFullReport();
    
    // Auto-generate on interval
    if (this.auto_generate_interval) {
      setInterval(() => this.generateFullReport(), this.auto_generate_interval);
    }
    
    return true;
  }
  
  async generateFullReport() {
    const timestamp = new Date().toISOString();
    const report = {
      report_id: `RPT_${Date.now()}`,
      timestamp,
      scp_id: this.engine.scp.scp_id,
      version: this.engine.scp.version,
      entropy: this.engine.entropy,
      threshold: this.engine.scp.containment.threshold,
      agents: this.getAgentReport(),
      system: this.getSystemReport(),
      paper_mode: this.engine.scp.paper_mode,
      apollyon_events: this.engine.apollyonEvents.slice(-10)
    };
    
    // Save report
    const filename = `report_${timestamp.replace(/:/g, '-')}.json`;
    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    this.reports.push({ filename, timestamp });
    
    // Keep only max_reports
    while (this.reports.length > (this.max_reports || 100)) {
      const oldest = this.reports.shift();
      try {
        fs.unlinkSync(path.join(this.reportDir, oldest.filename));
      } catch(e) {}
    }
    
    this.log(`Generated report: ${filename}`);
    return report;
  }
  
  getAgentReport() {
    const agents = [];
    for (const [scpId, agent] of this.engine.agents) {
      agents.push({
        scp_id: scpId,
        name: agent.scp.name,
        class: agent.scp.object_class,
        status: agent.status,
        type: agent.scp.type,
        uptime: agent.metrics.starts > 0 ? Date.now() - (agent.metrics.lastHeartbeat || Date.now()) : 0
      });
    }
    return agents;
  }
  
  getSystemReport() {
    return {
      total_agents: this.engine.agents.size,
      running_agents: Array.from(this.engine.agents.values()).filter(a => a.status === 'running').length,
      apollyon_count: this.engine.apollyonEvents.length,
      uptime: Date.now() - (global.processStartTime || Date.now()),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    };
  }
  
  async generateStatusReport() {
    const report = {
      type: 'status',
      timestamp: new Date().toISOString(),
      status: this.engine.getStatus(),
      agents: this.getAgentReport()
    };
    
    const filepath = path.join(this.reportDir, `status_${Date.now()}.json`);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    this.log(`Generated status report`);
    return report;
  }
  
  async generateEntropyReport() {
    const report = {
      type: 'entropy',
      timestamp: new Date().toISOString(),
      entropy: this.engine.entropy,
      threshold: this.engine.scp.containment.threshold,
      status: this.engine.entropy > 0.7 ? 'CRITICAL' : 
              this.engine.entropy > 0.3 ? 'ELEVATED' : 'NORMAL',
      history: this.engine.apollyonEvents.slice(-20).map(e => ({
        timestamp: e.timestamp,
        reason: e.reason,
        entropy: e.entropy
      }))
    };
    
    const filepath = path.join(this.reportDir, `entropy_${Date.now()}.json`);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    this.log(`Generated entropy report`);
    return report;
  }
  
  async generatePerformanceReport() {
    const report = {
      type: 'performance',
      timestamp: new Date().toISOString(),
      agents: this.getAgentReport(),
      paper_mode: this.engine.scp.paper_mode,
      active_strategies: this.engine.scp.current_state?.active_strategies || 0,
      recommendations: this.generateRecommendations()
    };
    
    const filepath = path.join(this.reportDir, `performance_${Date.now()}.json`);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    this.log(`Generated performance report`);
    return report;
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    if (this.engine.entropy > 0.5) {
      recommendations.push('Entropy elevated. Consider resetting or investigating breaches.');
    }
    
    const downAgents = Array.from(this.engine.agents.values()).filter(a => a.status !== 'running');
    if (downAgents.length > 0) {
      recommendations.push(`${downAgents.length} agent(s) not running. Check logs.`);
    }
    
    if (this.engine.scp.paper_mode.remaining_hours < 12) {
      recommendations.push('Paper mode ending soon. Prepare for live trading or extend.');
    }
    
    return recommendations;
  }
  
  async getLatestReport() {
    if (this.reports.length === 0) return null;
    const latest = this.reports[this.reports.length - 1];
    const filepath = path.join(this.reportDir, latest.filename);
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  
  async handleAction(action, params) {
    await super.handleAction(action, params);
    
    switch(action) {
      case 'status_report':
        return await this.generateStatusReport();
      case 'entropy_report':
        return await this.generateEntropyReport();
      case 'performance_report':
        return await this.generatePerformanceReport();
      case 'full_report':
        return await this.generateFullReport();
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

module.exports = { ReportGenerator };
