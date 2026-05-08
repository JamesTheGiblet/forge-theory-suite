#!/bin/bash
cd ~/legion
node -e "
const { StrategyGenerator } = require('./engine/genetic/strategy_generator');
const gen = new StrategyGenerator();
gen.saveBestStrategy().then(filename => {
  if (filename) console.log('✅ Generated and saved:', filename);
  else console.log('⚠️ No profitable strategy found');
  process.exit(0);
});
"
