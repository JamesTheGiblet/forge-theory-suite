const fs = require('fs');
const path = require('path');

const modules = [
  'necromancer',
  'vote_manager', 
  'treasurer',
  'paper_trader',
  'chameleon_lm',
  'portfolio_allocator',
  'market_intelligence',
  'onchain_intel',
  'narrator',
  'voice_commander',
  'implementation_engine'
];

console.log('=== Testing Module Syntax ===\n');

for (const mod of modules) {
  const filePath = path.join(__dirname, 'agents', `${mod}.js`);
  if (fs.existsSync(filePath)) {
    try {
      require(filePath);
      console.log(`✅ ${mod} - OK`);
    } catch (err) {
      console.log(`❌ ${mod} - ${err.message.split('\n')[0]}`);
    }
  } else {
    console.log(`⚠️  ${mod} - not found`);
  }
}
