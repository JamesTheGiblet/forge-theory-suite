const { BaseAgent } = require('./base_agent');

class Sentiment extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Sentiment agent active`);
    return true;
  }
}

module.exports = { Sentiment };
