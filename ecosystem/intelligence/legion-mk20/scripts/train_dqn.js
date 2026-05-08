const { DQNTrader } = require('../agents/dqn_trader');
const fs = require('fs');
const path = require('path');

async function trainDQN() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           🧠 DQN TRADER — DEEP Q-NETWORK TRAINING              ║');
  console.log('║     Neural network learns to trade on historical data!         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Load training data
  const trainingData = JSON.parse(fs.readFileSync('./data/dqn_training_data.json', 'utf8'));
  const validationData = JSON.parse(fs.readFileSync('./data/dqn_validation_data.json', 'utf8'));
  
  console.log(`📊 Training data: ${trainingData.length} hourly bars`);
  console.log(`📊 Validation data: ${validationData.length} hourly bars\n`);
  
  const trader = new DQNTrader({}, null);
  
  console.log('🎯 Training Configuration:');
  console.log(`   • Neural Network: ${trader.architecture.input}→${trader.architecture.hidden1}→${trader.architecture.hidden2}→${trader.architecture.output}`);
  console.log(`   • Gamma (discount): ${trader.gamma}`);
  console.log(`   • Epsilon (exploration): ${trader.epsilon} → ${trader.epsilonMin}`);
  console.log(`   • Learning Rate: ${trader.learningRate}`);
  console.log(`   • Batch Size: ${trader.batchSize}\n`);
  
  console.log('🚀 Starting training episodes...\n');
  
  const episodes = 50;
  const results = [];
  
  for (let episode = 1; episode <= episodes; episode++) {
    // Shuffle training data for each episode
    const shuffled = [...trainingData];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const result = await trader.trainEpisode(shuffled, 10000);
    results.push(result);
    
    // Progress indicator
    const barLength = 30;
    const filled = Math.floor(episode / episodes * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    process.stdout.write(`\rEpisode ${episode}/${episodes} [${bar}] ROI: ${result.roi}% | Trades: ${result.trades} | ε: ${result.epsilon}`);
    
    // Every 10 episodes, run validation
    if (episode % 10 === 0) {
      const valResult = await trader.trainEpisode(validationData, 10000);
      console.log(`\n   📊 Validation ROI: ${valResult.roi}%`);
    }
  }
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 TRAINING COMPLETE!');
  console.log('═'.repeat(60));
  
  // Calculate average performance
  const avgROI = results.reduce((sum, r) => sum + parseFloat(r.roi), 0) / results.length;
  const bestROI = Math.max(...results.map(r => parseFloat(r.roi)));
  const worstROI = Math.min(...results.map(r => parseFloat(r.roi)));
  
  console.log(`\n📈 Performance Summary:`);
  console.log(`   • Average ROI: ${avgROI.toFixed(2)}%`);
  console.log(`   • Best ROI: ${bestROI.toFixed(2)}%`);
  console.log(`   • Worst ROI: ${worstROI.toFixed(2)}%`);
  console.log(`   • Final Epsilon: ${trader.epsilon.toFixed(4)}`);
  console.log(`   • Memory Size: ${trader.memory.length}`);
  console.log(`   • Training Steps: ${trader.trainStep}`);
  
  // Save final model
  trader.saveModel();
  console.log(`\n💾 Model saved to: data/dqn_model.json`);
  
  // Show final Q-network state
  console.log(`\n🧠 Neural Network State:`);
  console.log(`   • Layer 1 weights: ${trader.model.w1.length}`);
  console.log(`   • Layer 2 weights: ${trader.model.w2.length}`);
  console.log(`   • Layer 3 weights: ${trader.model.w3.length}`);
  
  console.log('\n✅ DQN Trader is now trained and ready for live trading!\n');
}

trainDQN().catch(console.error);
