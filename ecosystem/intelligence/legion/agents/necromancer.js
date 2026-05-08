const fs = require('fs');
const path = require('path');
const { registerHandler } = require('../bus/router');

const ACTIVE_DIR = path.join(__dirname, '../strategies/active');
const GRAVEYARD_DIR = path.join(__dirname, '../strategies/graveyard');

if (!fs.existsSync(GRAVEYARD_DIR)) fs.mkdirSync(GRAVEYARD_DIR, { recursive: true });

function reviveStrategy(strategyPath, reason) {
  try {
    const filename = path.basename(strategyPath);
    const newPath = path.join(ACTIVE_DIR, filename.replace('__breached_', '__revived_'));
    
    const strategy = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));
    strategy.addendum_log = strategy.addendum_log || [];
    strategy.addendum_log.push({
      date: new Date().toISOString(),
      type: 'REVIVAL',
      result: `Revived: ${reason}`
    });
    
    fs.writeFileSync(newPath, JSON.stringify(strategy, null, 2));
    fs.unlinkSync(strategyPath);
  } catch (err) {
    console.error(`[NECROMANCER] Failed to revive ${strategyPath}:`, err.message);
  }
}

function scanGraveyard() {
  if (!fs.existsSync(GRAVEYARD_DIR)) return;
  
  const files = fs.readdirSync(GRAVEYARD_DIR).filter(f => f.endsWith('.json'));
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  for (const file of files) {
    const filePath = path.join(GRAVEYARD_DIR, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    
    if (age > sevenDays) {
      reviveStrategy(filePath, '7-day quarantine complete');
    }
  }
}

function startNecromancer() {
  
  setInterval(() => {
    scanGraveyard();
  }, 6 * 60 * 60 * 1000);
  
  registerHandler('REGIME_CHANGE', (msg) => {
    scanGraveyard();
  });
}

if (require.main === module) {
  startNecromancer();
}

module.exports = { startNecromancer, reviveStrategy };
