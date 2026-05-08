const { BaseAgent } = require('./base_agent');

class Diplomat extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Diplomat agent active`);
    return true;
  }
}

module.exports = { Diplomat };
