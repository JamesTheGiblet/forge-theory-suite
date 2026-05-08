const { BaseAgent } = require('./base_agent');

class OnchainIntel extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Onchain Intel active. Chains: ${this.chains?.join(', ')}`);
    return true;
  }
}

module.exports = { OnchainIntel };
