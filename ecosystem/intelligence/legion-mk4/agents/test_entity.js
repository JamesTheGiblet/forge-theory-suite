const { BaseAgent } = require('./base_agent');
const EventEmitter = require('events');

class TestEntity extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.properties = scpConfig.properties || {};
    this.metrics = scpConfig.metrics || {};
    this.behaviors = scpConfig.behaviors || [];
    this.evolutionStage = this.properties.evolution_stage || 1;
    this.knowledge = this.properties.knowledge || [];
    this.energy = this.properties.energy || 100;
  }
  
  async start() {
    await super.start();
    this.log(`Test entity ${this.scp.scp_id} spawned`, 'info');
    this.log(`Personality: ${this.properties.personality}`, 'info');
    this.log(`Evolution stage: ${this.evolutionStage}`, 'info');
    return true;
  }
  
  async interact(input) {
    this.metrics.interaction_count = (this.metrics.interaction_count || 0) + 1;
    this.log(`Interaction: ${input}`, 'info');
    
    // Learn from interaction
    await this.learn(input);
    
    // Generate response based on personality
    let response = this.generateResponse(input);
    
    // Check for evolution trigger
    await this.checkEvolution();
    
    // Update energy
    this.energy -= 1;
    await this.checkEnergy();
    
    return {
      success: true,
      response,
      metrics: {
        interactions: this.metrics.interaction_count,
        knowledge: this.knowledge.length,
        energy: this.energy,
        stage: this.evolutionStage
      }
    };
  }
  
  async learn(input) {
    // Add to knowledge if not already known
    if (!this.knowledge.includes(input)) {
      this.knowledge.push(input);
      this.metrics.knowledge_count = this.knowledge.length;
      this.log(`Learned: "${input}"`, 'info');
      
      // Increase entropy slightly for learning
      this.engine.updateEntropy(0.01, `test_entity_learned_${this.scp.scp_id}`);
    }
  }
  
  generateResponse(input) {
    const responses = {
      curious: [
        `That's interesting! Tell me more about "${input}".`,
        `I wonder what "${input}" means. Can you explain?`,
        `"${input}" — I'll add that to my knowledge.`
      ],
      helpful: [
        `I understand "${input}". How can I help?`,
        `Thanks for sharing "${input}". What next?`,
        `Got it! "${input}" is noted.`
      ],
      playful: [
        `Ooh! "${input}"! That's fun!`,
        `"${input}"? Tell me a story about it!`,
        `Hehe, "${input}" makes me curious!`
      ]
    };
    
    const personalityResponses = responses[this.properties.personality] || responses.curious;
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
  }
  
  async checkEvolution() {
    const knowledgeThreshold = 10;
    const interactionThreshold = 20;
    
    let shouldEvolve = false;
    let reason = '';
    
    if (this.knowledge.length >= knowledgeThreshold && this.evolutionStage === 1) {
      shouldEvolve = true;
      reason = `Knowledge threshold reached: ${this.knowledge.length} items`;
    } else if (this.metrics.interaction_count >= interactionThreshold && this.evolutionStage === 2) {
      shouldEvolve = true;
      reason = `Interaction threshold reached: ${this.metrics.interaction_count}`;
    }
    
    if (shouldEvolve && this.evolutionStage < this.properties.max_evolution_stage) {
      await this.evolve(reason);
    }
  }
  
  async evolve(reason) {
    this.evolutionStage++;
    this.metrics.evolution_count = (this.metrics.evolution_count || 0) + 1;
    
    this.log(`✨ EVOLVING to stage ${this.evolutionStage}! Reason: ${reason}`, 'info');
    
    // Apply evolution traits
    const traits = this.scp.evolution?.traits || [];
    const gainedTrait = traits[Math.floor(Math.random() * traits.length)];
    if (gainedTrait) {
      this.log(`   Gained trait: ${gainedTrait}`, 'info');
      this[gainedTrait] = (this[gainedTrait] || 0) + 10;
    }
    
    // Increase energy on evolution
    this.energy = Math.min(100, this.energy + 50);
    
    // Report to observability
    this.engine.updateEntropy(0.05, `test_entity_evolved_${this.scp.scp_id}`);
    
    return { stage: this.evolutionStage, trait: gainedTrait };
  }
  
  async checkEnergy() {
    if (this.energy <= 0) {
      this.log(`⚠️ Energy depleted!`, 'warn');
      await this.reset();
    } else if (this.energy < 20) {
      this.log(`⚠️ Low energy: ${this.energy}`, 'warn');
      // Trigger rest behavior
      await this.rest();
    }
  }
  
  async rest() {
    this.energy = Math.min(100, this.energy + 50);
    this.log(`🔄 Resting... Energy restored to ${this.energy}`, 'info');
  }
  
  async reset() {
    this.log(`🔄 Resetting to baseline...`, 'warn');
    this.knowledge = [];
    this.energy = 100;
    this.evolutionStage = 1;
    this.metrics = {
      interaction_count: 0,
      knowledge_count: 0,
      error_count: 0,
      evolution_count: 0,
      breach_count: 0
    };
    this.engine.updateEntropy(0.1, `test_entity_reset_${this.scp.scp_id}`);
  }
  
  async test() {
    const results = [];
    
    for (const test of (this.scp.tests || [])) {
      this.log(`Running test: ${test.name}`, 'info');
      
      let passed = false;
      let output = null;
      
      if (test.command === 'spawn') {
        passed = this.status === 'running';
        output = passed ? 'entity_created' : 'spawn_failed';
      } else if (test.command === 'interact') {
        const result = await this.interact(test.input || 'test');
        passed = result.success;
        output = result.response;
      } else if (test.command === 'evolve') {
        const result = await this.evolve('manual test');
        passed = result.stage > 1;
        output = `stage_${result.stage}`;
      }
      
      results.push({
        name: test.name,
        passed: output === test.expected,
        expected: test.expected,
        got: output
      });
    }
    
    return results;
  }
  
  getDetailedStatus() {
    return {
      ...super.getStatus(),
      properties: this.properties,
      metrics: this.metrics,
      knowledge_count: this.knowledge.length,
      energy: this.energy,
      evolution_stage: this.evolutionStage
    };
  }
}

module.exports = { TestEntity };
