#!/usr/bin/env node

const path = require('path');
const { IntelligenceIntegration } = require('./core/intelligence_integration');

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                LEGION MK2 — SCP Native                          ║');
  console.log('║           🧠 With Integrated Intelligence Models                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Initialize Intelligence Integration
  const intelligence = new IntelligenceIntegration();
  console.log('\n🧠 Intelligence Integration Active:\n');
  const status = intelligence.getStatus();
  console.log(`   🦎 Chameleon LM: ${status.chameleon.accuracy}% accuracy (${status.chameleon.interactions} memories)`);
  console.log(`   🧠 DQN Trader: ${status.dqn.validation_roi || 0}% validation ROI`);
  console.log(`   📈 LSTM Predictor: ${status.lstm.accuracy_1h}% 1h accuracy`);
  console.log(`   🎯 Fringe trained: ${status.chameleon.fringe_trained && status.dqn.fringe_trained && status.lstm.fringe_trained ? '✅ YES' : '⚠️ PARTIAL'}\n`);

  // Make intelligence available globally for API
  global.intelligence = intelligence;

  console.log('✨ LEGION MK2 Intelligence Layer is running.');
  console.log('   API available at: http://localhost:3011');
  console.log('   Intelligence endpoints:');
  console.log('     GET  /api/intelligence/status');
  console.log('     POST /api/intelligence/chat');
  console.log('     POST /api/intelligence/trade');
  console.log('     POST /api/intelligence/predict');
  console.log('\nPress Ctrl+C to stop.\n');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down LEGION MK2 Intelligence...');
    process.exit(0);
  });
}

main().catch(console.error);
// Strategy Generator will be initialized
