const { BaseAgent } = require('./base_agent');

class Librarian extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
  }
  
  async start() {
    await super.start();
    this.log(`Librarian agent active`);
    return true;
  }
}

module.exports = { Librarian };
