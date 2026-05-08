const { BaseAgent } = require('./base_agent');

class Treasurer extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Treasurer agent active`);
    return true;
  }
}

module.exports = { Treasurer };
