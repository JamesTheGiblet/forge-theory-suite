const readline = require('readline');
const { AIGameMaster } = require('./ai_game_master');
const { AIAssistant } = require('./ai_assistant');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const enemyAI = new AIGameMaster();
const allyAI = new AIAssistant();

let playerScore = 0;
let round = 1;

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function play() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    OMEGA Protocol                              ║');
  console.log('║              AI vs AI — You Are the Decider                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('🤖 ALLY AI: I will help you analyze threats and suggest tactics');
  console.log('👾 ENEMY AI: I will generate adaptive SCPs to challenge you');
  console.log('👤 YOU: Make the final containment decision\n');
  
  await askQuestion('Press Enter to begin...');
  
  while (round <= 7) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`ROUND ${round} — New Anomaly Detected`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    const scp = await enemyAI.generateAdaptiveSCP();
    
    console.log(`📋 SCP ID: ${scp.scp_id}`);
    console.log(`⚠️  Class: ${scp.object_class}`);
    console.log(`🧠 AI-Adapted: ${scp.ai_adapted ? 'YES' : 'NO'}`);
    
    const analysis = await allyAI.analyzeSCP(scp);
    const risk = await allyAI.predictBreachRisk(scp);
    
    console.log(`\n🤖 ALLY AI ANALYSIS:`);
    for (const rec of analysis.recommendations) {
      console.log(`   • ${rec}`);
    }
    console.log(`\n📊 BREACH RISK: ${risk.risk_level} (${risk.risk_percentage}%)`);
    console.log(`🎯 SUGGESTED TACTIC: ${analysis.suggestedTactic.toUpperCase()}`);
    
    if (enemyAI.metaEntropy > 0.5) {
      console.log(`\n👾 ENEMY AI: "I've learned your patterns..."`);
    }
    
    console.log(`\n🔬 YOUR CONTAINMENT DECISION:`);
    console.log(`   [1] Standard Protocol`);
    console.log(`   [2] Military Force`);
    console.log(`   [3] Research Approach`);
    console.log(`   [4] Evacuation`);
    console.log(`   [5] Ask Ally AI for more detail`);
    
    let choice = await askQuestion('\nChoice: ');
    
    if (choice === '5') {
      console.log(`\n🤖 ALLY AI: "I recommend ${analysis.suggestedTactic} protocol.`);
      console.log(`   Success rate: ${(allyAI.predictionAccuracy * 100).toFixed(0)}% based on ${allyAI.knowledgeBase.length} past cases."`);
      choice = await askQuestion('\nYour final choice: ');
    }
    
    let tactic;
    switch(choice.trim()) {
      case '1': tactic = 'standard'; break;
      case '2': tactic = 'aggressive'; break;
      case '3': tactic = 'research'; break;
      case '4': tactic = 'evacuate'; break;
      default: tactic = 'standard';
    }
    
    console.log(`\n[CONTAINMENT] Deploying ${tactic} protocol...`);
    
    const result = await enemyAI.validateContainment(scp, { tactic });
    
    if (result.passed) {
      console.log(`\n✅ CONTAINMENT SUCCESS! +10 points`);
      playerScore += 10;
      
      if (tactic === analysis.suggestedTactic) {
        console.log(`🎯 BONUS! Followed Ally AI! +5 points`);
        playerScore += 5;
      }
    } else {
      console.log(`\n💀 CONTAINMENT BREACH! -5 points`);
      playerScore = Math.max(0, playerScore - 5);
    }
    
    await allyAI.learnFromOutcome(scp, tactic, result);
    await enemyAI.learnFromPlayer({ tactic }, result);
    
    const state = enemyAI.getGameState();
    console.log(`\n📊 SITE STATUS:`);
    console.log(`   Score: ${playerScore}`);
    console.log(`   Meta-Entropy: ${(state.metaEntropy * 100).toFixed(0)}%`);
    console.log(`   Ally Accuracy: ${(allyAI.predictionAccuracy * 100).toFixed(0)}%`);
    console.log(`   Threat Level: ${state.threatLevel}`);
    
    round++;
  }
  
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                    GAME COMPLETE                              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  FINAL SCORE: ${playerScore}                                    ║`);
  console.log(`║  Ally AI Accuracy: ${(allyAI.predictionAccuracy * 100).toFixed(0)}%                              ║`);
  console.log(`║  Enemy Meta-Entropy: ${(enemyAI.metaEntropy * 100).toFixed(0)}%                           ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  
  if (playerScore >= 50) {
    console.log(`\n🏆 VICTORY! You and Ally AI defeated the Enemy AI!`);
  } else if (playerScore >= 30) {
    console.log(`\n📈 STALEMATE. Both AIs learned from each other.`);
  } else {
    console.log(`\n💀 DEFEAT. The Enemy AI evolved faster.`);
  }
  
  rl.close();
}

play();
