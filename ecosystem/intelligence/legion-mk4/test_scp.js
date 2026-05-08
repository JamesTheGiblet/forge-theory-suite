const path = require('path');
const fs = require('fs');

class SimpleTestEngine {
  constructor(registryPath) {
    this.registryPath = registryPath;
    this.registry = null;
    this.entropy = 0;
    this.apollyonEvents = [];
  }
  
  load() {
    this.registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
    console.log(`[TEST_ENGINE] Loaded ${this.registry.scp_id}`);
    return true;
  }
  
  updateEntropy(delta, source) {
    const oldEntropy = this.entropy;
    this.entropy = Math.min(1, Math.max(0, this.entropy + delta));
    console.log(`[TEST_ENGINE] Entropy: ${oldEntropy.toFixed(2)} → ${this.entropy.toFixed(2)} (${delta > 0 ? '+' : ''}${delta}) from ${source}`);
    
    if (this.entropy > 0.7) {
      this.triggerApollyon(`Entropy exceeded threshold: ${this.entropy}`, source);
    }
    
    return this.entropy;
  }
  
  triggerApollyon(reason, source) {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'APOLLYON',
      reason,
      source,
      entropy: this.entropy
    };
    this.apollyonEvents.push(event);
    console.log(`[TEST_ENGINE] ⚠️ APOLLYON: ${reason}`);
    return event;
  }
  
  getStatus() {
    return {
      entropy: this.entropy,
      threshold: 0.7,
      apollyon_count: this.apollyonEvents.length
    };
  }
}

// Test Entity Class
class TestEntity {
  constructor(scpConfig, engine) {
    this.scp = scpConfig;
    this.engine = engine;
    this.status = 'initializing';
    this.properties = scpConfig.properties || {};
    this.metrics = scpConfig.metrics || {};
    this.behaviors = scpConfig.behaviors || [];
    this.evolutionStage = this.properties.evolution_stage || 1;
    this.knowledge = this.properties.knowledge || [];
    this.energy = this.properties.energy || 100;
  }
  
  async start() {
    this.status = 'running';
    console.log(`[${this.scp.scp_id}] Spawned`);
    console.log(`   Personality: ${this.properties.personality}`);
    console.log(`   Evolution stage: ${this.evolutionStage}`);
    return true;
  }
  
  async interact(input) {
    this.metrics.interaction_count = (this.metrics.interaction_count || 0) + 1;
    
    // Learn from interaction
    await this.learn(input);
    
    // Generate response
    let response = this.generateResponse(input);
    
    // Check for evolution
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
    if (!this.knowledge.includes(input)) {
      this.knowledge.push(input);
      this.metrics.knowledge_count = this.knowledge.length;
      console.log(`[${this.scp.scp_id}] Learned: "${input.substring(0, 50)}..."`);
      this.engine.updateEntropy(0.01, `learn_${this.scp.scp_id}`);
    }
  }
  
  generateResponse(input) {
    const responses = {
      curious: [
        `That's interesting! Tell me more about "${input.substring(0, 30)}".`,
        `I wonder what that means. Can you explain?`,
        `"${input.substring(0, 30)}" — I'll add that to my knowledge.`
      ],
      helpful: [
        `I understand. How can I help with "${input.substring(0, 30)}"?`,
        `Thanks for sharing. What next?`,
        `Got it! Noted.`
      ],
      playful: [
        `Ooh! "${input.substring(0, 30)}"! That's fun!`,
        `Tell me a story about it!`,
        `Hehe, that makes me curious!`
      ]
    };
    
    const personalityResponses = responses[this.properties.personality] || responses.curious;
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
  }
  
  async checkEvolution() {
    const knowledgeThreshold = 5;
    const interactionThreshold = 10;
    
    let shouldEvolve = false;
    let reason = '';
    
    if (this.knowledge.length >= knowledgeThreshold && this.evolutionStage === 1) {
      shouldEvolve = true;
      reason = `Knowledge threshold: ${this.knowledge.length} items`;
    } else if (this.metrics.interaction_count >= interactionThreshold && this.evolutionStage === 2) {
      shouldEvolve = true;
      reason = `Interaction threshold: ${this.metrics.interaction_count}`;
    }
    
    if (shouldEvolve && this.evolutionStage < (this.properties.max_evolution_stage || 5)) {
      await this.evolve(reason);
    }
  }
  
  async evolve(reason) {
    this.evolutionStage++;
    this.metrics.evolution_count = (this.metrics.evolution_count || 0) + 1;
    
    console.log(`\n✨ [${this.scp.scp_id}] EVOLVING to stage ${this.evolutionStage}!`);
    console.log(`   Reason: ${reason}`);
    
    // Apply evolution traits
    const traits = this.scp.evolution?.traits || ['intelligence', 'speed', 'awareness'];
    const gainedTrait = traits[Math.floor(Math.random() * traits.length)];
    console.log(`   Gained trait: ${gainedTrait}`);
    
    // Increase energy on evolution
    this.energy = Math.min(100, this.energy + 50);
    
    this.engine.updateEntropy(0.05, `evolve_${this.scp.scp_id}`);
    
    return { stage: this.evolutionStage, trait: gainedTrait };
  }
  
  async checkEnergy() {
    if (this.energy <= 0) {
      console.log(`[${this.scp.scp_id}] ⚠️ Energy depleted! Resetting...`);
      await this.reset();
    } else if (this.energy < 20) {
      console.log(`[${this.scp.scp_id}] ⚠️ Low energy: ${this.energy}`);
      await this.rest();
    }
  }
  
  async rest() {
    this.energy = Math.min(100, this.energy + 50);
    console.log(`[${this.scp.scp_id}] Resting... Energy: ${this.energy}`);
  }
  
  async reset() {
    console.log(`[${this.scp.scp_id}] Resetting to baseline...`);
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
    this.engine.updateEntropy(0.1, `reset_${this.scp.scp_id}`);
  }
  
  async test() {
    const results = [];
    
    // Test 1: Spawn
    console.log(`\n📋 Running test: spawn_test`);
    results.push({
      name: 'spawn_test',
      passed: this.status === 'running',
      expected: 'entity_created',
      got: this.status === 'running' ? 'entity_created' : 'spawn_failed'
    });
    
    // Test 2: Interaction
    console.log(`📋 Running test: interaction_test`);
    const interactResult = await this.interact('test_message');
    results.push({
      name: 'interaction_test',
      passed: interactResult.success,
      expected: 'response_received',
      got: interactResult.response ? 'response_received' : 'no_response'
    });
    
    // Test 3: Evolution (force it)
    console.log(`📋 Running test: evolution_test`);
    for (let i = 0; i < 6; i++) {
      await this.learn(`knowledge_item_${i}`);
    }
    const evolved = this.evolutionStage > 1;
    results.push({
      name: 'evolution_test',
      passed: evolved,
      expected: 'stage_increased',
      got: evolved ? `stage_${this.evolutionStage}` : 'no_evolution'
    });
    
    return results;
  }
  
  getDetailedStatus() {
    return {
      scp_id: this.scp.scp_id,
      class: this.scp.object_class,
      status: this.status,
      properties: this.properties,
      metrics: this.metrics,
      knowledge_count: this.knowledge.length,
      energy: this.energy,
      evolution_stage: this.evolutionStage
    };
  }
}

async function testSCP() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SCP — Alpha Entity                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const registryPath = path.join(__dirname, 'scp', 'test.scp');
  const engine = new SimpleTestEngine(registryPath);
  
  engine.load();
  
  console.log(`📋 Testing SCP: ${engine.registry.scp_id}`);
  console.log(`   Class: ${engine.registry.object_class}`);
  console.log(`   Personality: ${engine.registry.properties.personality}`);
  console.log(`   Evolution Stage: ${engine.registry.properties.evolution_stage}\n`);
  
  // Create the test entity
  const testEntity = new TestEntity(engine.registry, engine);
  await testEntity.start();
  
  console.log('\n🔬 Running tests...\n');
  const testResults = await testEntity.test();
  
  let allPassed = true;
  for (const result of testResults) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (!result.passed) {
      allPassed = false;
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Got: ${result.got}`);
    }
  }
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
  
  console.log('\n💬 Simulating interactions...\n');
  
  const interactions = [
    "Hello, who are you?",
    "What can you do?",
    "Tell me something interesting",
    "What is your purpose?",
    "Can you learn new things?",
    "How do you evolve?"
  ];
  
  for (const msg of interactions) {
    const result = await testEntity.interact(msg);
    console.log(`👤 > ${msg}`);
    console.log(`🤖 < ${result.response}`);
    console.log(`   Knowledge: ${result.metrics.knowledge}, Energy: ${result.metrics.energy}, Stage: ${result.metrics.stage}\n`);
  }
  
  console.log('📊 Final Status:');
  console.log(JSON.stringify(testEntity.getDetailedStatus(), null, 2));
  
  console.log('\n✅ Test complete. Entity evolved through interaction.\n');
  
  process.exit(0);
}

testSCP().catch(console.error);
