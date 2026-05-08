// Paper mode – runs LEGION alongside GOLEM without live capital
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PAPER_LOG = path.join(__dirname, 'data/paper_mode.log');
const START_TIME = Date.now();
const REQUIRED_HOURS = 48;
const REQUIRED_MS = REQUIRED_HOURS * 60 * 60 * 1000;

let containmentBreaches = 0;
let isRunning = true;

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}`;
  console.log(entry);
  fs.appendFileSync(PAPER_LOG, entry + '\n');
}

function checkContainmentBreach() {
  const containmentLog = path.join(__dirname, 'data/containment_log.json');
  if (fs.existsSync(containmentLog)) {
    const logData = JSON.parse(fs.readFileSync(containmentLog, 'utf8'));
    const recentBreaches = logData.filter(entry => 
      new Date(entry.timestamp) > new Date(START_TIME)
    );
    if (recentBreaches.length > containmentBreaches) {
      containmentBreaches = recentBreaches.length;
      log(`⚠️ CONTAINMENT BREACH #${containmentBreaches} – paper mode requirement: ZERO`);
    }
  }
}

function checkPaperModeStatus() {
  const elapsed = Date.now() - START_TIME;
  const hoursRemaining = Math.max(0, (REQUIRED_MS - elapsed) / (60 * 60 * 1000));
  
  if (elapsed >= REQUIRED_MS) {
    if (containmentBreaches === 0) {
      log(`✅ PAPER MODE PASSED – ${REQUIRED_HOURS} hours with ZERO containment breaches`);
      log(`🚀 Ready for live migration. Run: node live_migration.js`);
      process.exit(0);
    } else {
      log(`❌ PAPER MODE FAILED – ${containmentBreaches} breach(es) in ${REQUIRED_HOURS} hours`);
      log(`🔄 Restart paper mode after fixing containment issues`);
      process.exit(1);
    }
  } else {
    log(`📊 Paper mode: ${hoursRemaining.toFixed(1)} hours remaining | Breaches: ${containmentBreaches}`);
  }
}

// Monitor every minute
log(`📋 PAPER MODE STARTED – ${REQUIRED_HOURS} hours required, ZERO containment breaches`);
log(`🔄 LEGION running alongside GOLEM – no live capital`);

setInterval(() => {
  checkContainmentBreach();
  checkPaperModeStatus();
}, 60000);

// Keep alive
process.on('SIGINT', () => {
  log('🛑 Paper mode interrupted');
  process.exit(0);
});
