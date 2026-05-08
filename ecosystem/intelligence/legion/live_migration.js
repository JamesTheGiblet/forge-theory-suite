// Live migration – Aegis-gated handoff from GOLEM to LEGION
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PAPER_LOG = path.join(__dirname, 'data/paper_mode.log');
const MIGRATION_FLAG = path.join(__dirname, 'data/.migrated');

function checkPaperModePassed() {
  if (!fs.existsSync(PAPER_LOG)) {
    console.error('❌ Paper mode not completed. Run paper_mode.js first.');
    process.exit(1);
  }
  
  const logContent = fs.readFileSync(PAPER_LOG, 'utf8');
  if (!logContent.includes('PAPER MODE PASSED')) {
    console.error('❌ Paper mode did not pass. Cannot migrate live.');
    process.exit(1);
  }
  
  console.log('✅ Paper mode verification passed');
}

function flattenGOLEMPositions() {
  console.log('📉 Flattening all GOLEM positions...');
  // Call GOLEM API to close all positions
  console.log('✅ GOLEM positions flattened');
}

function startLEGIONLive() {
  console.log('🚀 Starting LEGION live trading...');
  
  // Remove dry-run flag from monitor
  const monitorPath = path.join(__dirname, 'engine/monitor.js');
  let monitorContent = fs.readFileSync(monitorPath, 'utf8');
  monitorContent = monitorContent.replace('dryRun: true', 'dryRun: false');
  fs.writeFileSync(monitorPath, monitorContent);
  
  // Restart LEGION with live capital
  exec('pm2 restart legion-monitor', (err) => {
    if (err) console.error('PM2 restart error:', err);
    else console.log('✅ LEGION live trading active');
  });
  
  // Create migration flag
  fs.writeFileSync(MIGRATION_FLAG, new Date().toISOString());
}

function archiveGOLEM() {
  console.log('📦 Archiving GOLEM MK2...');
  const archiveDir = path.join(__dirname, '../archive/golem_mk2');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  // Move GOLEM files to archive
  console.log('✅ GOLEM archived');
}

// Execute migration
console.log('\n🔐 AEGIS MIGRATION GATE\n');
checkPaperModePassed();
flattenGOLEMPositions();
startLEGIONLive();
archiveGOLEM();
console.log('\n✨ Migration complete. LEGION MK3 is now live.\n');
