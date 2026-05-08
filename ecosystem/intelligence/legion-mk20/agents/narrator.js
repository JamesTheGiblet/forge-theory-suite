const { BaseAgent } = require('./base_agent');

class Narrator extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Narrator agent active`);
    return true;
  }
}

module.exports = { Narrator };
