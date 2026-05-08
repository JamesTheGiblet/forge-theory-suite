const { BaseAgent } = require('./base_agent');

class Predictor extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Predictor agent active`);
    return true;
  }
}

module.exports = { Predictor };
