const readline = require('readline');
const { Mutator } = require('../agents/mutator');
const { Auditor } = require('../agents/auditor');
const { Tournament } = require('../agents/tournament');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simplified agents for the game
class GameMutator {
  mutate(template, instructions) {
    // AI helps create something based on player instructions
    const created = JSON.parse(JSON.stringify(template));
    
    // Apply player's instructions
    if (instructions.includes('faster')) {
      created.speed = (created.speed || 10) * 1.5;
    }
    if (instructions.includes('stronger')) {
      created.strength = (created.strength || 10) * 1.5;
    }
    if (instructions.includes('smarter')) {
      created.intelligence = (created.intelligence || 10) * 1.5;
    }
    if (instructions.includes('stealth')) {
      created.stealth = true;
    }
    if (instructions.includes('healing')) {
      created.healing = true;
    }
    
    // Add AI-generated improvement
    const improvements = ['efficiency', 'durability', 'range', 'accuracy', 'reload'];
    created.ai_improvement = improvements[Math.floor(Math.random() * improvements.length)];
    created.ai_boost = Math.floor(Math.random() * 50) + 50;
    
    return created;
  }
}

class GameAuditor {
  audit(creation, requirements) {
    let passed = true;
    let feedback = [];
    
    // Check each requirement
    for (const [key, value] of Object.entries(requirements)) {
      if (creation[key] < value) {
        passed = false;
        feedback.push(`${key}: ${creation[key]} < required ${value}`);
      }
    }
    
    // Check for AI improvement
    if (creation.ai_improvement && creation.ai_boost > 70) {
      feedback.push(`✨ AI improvement: ${creation.ai_improvement} +${creation.ai_boost}`);
    }
    
    return { passed, feedback, score: passed ? Math.floor(Math.random() * 50) + 50 : 0 };
  }
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function play() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      FORGE Protocol                           ║');
  console.log('║         You must CREATE to progress. AI is your forge.        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const mutator = new GameMutator();
  const auditor = new GameAuditor();
  
  let level = 1;
  let score = 0;
  let creations = [];
  
  const levels = [
    {
      name: "Basic Drone",
      template: { speed: 10, strength: 5, intelligence: 3, durability: 8 },
      requirements: { speed: 15, strength: 8, durability: 10 },
      hint: "Make it FASTER and STRONGER"
    },
    {
      name: "Combat Unit",
      template: { speed: 12, strength: 10, intelligence: 5, durability: 12, range: 5 },
      requirements: { strength: 15, durability: 15, range: 10 },
      hint: "Focus on STRENGTH, DURABILITY, and RANGE"
    },
    {
      name: "Stealth Recon",
      template: { speed: 15, strength: 5, intelligence: 8, stealth: false, range: 8 },
      requirements: { speed: 20, intelligence: 12, stealth: true, range: 12 },
      hint: "Make it FASTER, SMARTER, STEALTH, and better RANGE"
    },
    {
      name: "Healer Support",
      template: { speed: 8, strength: 3, intelligence: 10, healing: false, range: 15 },
      requirements: { intelligence: 15, healing: true, range: 20 },
      hint: "Make it SMARTER, add HEALING, extend RANGE"
    },
    {
      name: "Boss Killer",
      template: { speed: 20, strength: 20, intelligence: 10, durability: 15, range: 10, special: false },
      requirements: { strength: 30, durability: 25, intelligence: 15, special: true },
      hint: "Make it STRONGER, TOUGHER, SMARTER, and add a SPECIAL ability"
    }
  ];
  
  while (level <= levels.length) {
    const currentLevel = levels[level - 1];
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`LEVEL ${level}: ${currentLevel.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    console.log(`📋 BASE TEMPLATE:`);
    console.log(JSON.stringify(currentLevel.template, null, 2));
    
    console.log(`\n🎯 REQUIREMENTS TO PASS:`);
    console.log(JSON.stringify(currentLevel.requirements, null, 2));
    
    console.log(`\n💡 AI HINT: ${currentLevel.hint}`);
    
    let attempt = 1;
    let levelComplete = false;
    
    while (!levelComplete && attempt <= 5) {
      console.log(`\n─────────────────────────────────────────────────────────────`);
      console.log(`ATTEMPT ${attempt}/5`);
      console.log(`─────────────────────────────────────────────────────────────\n`);
      
      console.log(`🔨 Describe what you want to CREATE (use words like: faster, stronger, smarter, stealth, healing, range, special):`);
      const instructions = await askQuestion(`\n> `);
      
      console.log(`\n🤖 AI FORGE: Creating based on "${instructions}"...`);
      
      // AI creates the unit
      const creation = mutator.mutate(currentLevel.template, instructions.toLowerCase());
      
      console.log(`\n✨ CREATION RESULT:`);
      console.log(JSON.stringify(creation, null, 2));
      
      // Validate against requirements
      const result = auditor.audit(creation, currentLevel.requirements);
      
      console.log(`\n🔍 VALIDATION RESULTS:`);
      for (const fb of result.feedback) {
        console.log(`   ${fb}`);
      }
      
      if (result.passed) {
        console.log(`\n✅ VALIDATION PASSED! Score: ${result.score}`);
        score += result.score;
        creations.push({ level: currentLevel.name, creation, score: result.score });
        console.log(`\n🎉 LEVEL COMPLETE! You may advance.`);
        levelComplete = true;
      } else {
        console.log(`\n❌ VALIDATION FAILED. Requirements not met.`);
        if (attempt < 5) {
          console.log(`\n🤖 AI ADVICE: Try focusing on the missing requirements.`);
          console.log(`   Missing: ${result.feedback.join(', ')}`);
        }
        attempt++;
      }
    }
    
    if (!levelComplete) {
      console.log(`\n💀 FAILED after 5 attempts. Game Over.`);
      console.log(`Final Score: ${score}`);
      rl.close();
      return;
    }
    
    level++;
  }
  
  // Game complete
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                    GAME COMPLETE!                              ║`);
  console.log(`║         You mastered the AI Forge and passed all levels       ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  FINAL SCORE: ${score}                                          ║`);
  console.log(`║  Creations: ${creations.length}                                 ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  
  console.log(`\n🏆 You are a Master Forger!`);
  
  rl.close();
}

play();
