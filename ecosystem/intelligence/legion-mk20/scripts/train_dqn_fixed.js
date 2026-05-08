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
  
  const episodes = 30;
  const results = [];
  
  for (let episode = 1; episode <= episodes; episode++) {
    // Use data sequentially instead of shuffling for consistency
    const result = await trader.trainEpisode(trainingData, 10000);
    
    // Store results
    const roi = parseFloat(result.roi);
    if (!isNaN(roi)) {
      results.push(roi);
    }
    
    // Progress indicator
    const barLength = 30;
    const filled = Math.floor(episode / episodes * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    const validRoi = isNaN(roi) ? '0.00' : roi.toFixed(2);
    process.stdout.write(`\rEpisode ${episode}/${episodes} [${bar}] ROI: ${validRoi}% | Trades: ${result.trades} | ε: ${result.epsilon}`);
    
    // Every 5 episodes, run validation
    if (episode % 5 === 0) {
      const valResult = await trader.trainEpisode(validationData, 10000);
      const valRoi = isNaN(parseFloat(valResult.roi)) ? '0.00' : parseFloat(valResult.roi).toFixed(2);
      console.log(`\n   📊 Validation ROI: ${valRoi}%`);
    }
  }
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 TRAINING COMPLETE!');
  console.log('═'.repeat(60));
  
  // Calculate average performance
  const validResults = results.filter(r => !isNaN(r) && isFinite(r));
  const avgROI = validResults.length > 0 ? validResults.reduce((sum, r) => sum + r, 0) / validResults.length : 0;
  const bestROI = validResults.length > 0 ? Math.max(...validResults) : 0;
  const worstROI = validResults.length > 0 ? Math.min(...validResults) : 0;
  
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
  
  console.log('\n✅ DQN Trader is now trained!\n');
}

trainDQN().catch(console.error);
