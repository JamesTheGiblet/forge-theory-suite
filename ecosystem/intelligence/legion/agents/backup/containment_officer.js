// ~/legion/agents/containment_officer.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendMessage } = require('../bus/router');

const ACTIVE_DIR = path.join(__dirname, '../strategies/active');
const CONTAINED_DIR = path.join(__dirname, '../strategies/contained');
const BLACKLIST_PATH = path.join(__dirname, '../data/blacklist.json');
const CONTAINMENT_LOG = path.join(__dirname, '../data/containment_log.json');

// Ensure directories
[CONTAINED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Load blacklist (Amendment 2)
function loadBlacklist() {
  if (!fs.existsSync(BLACKLIST_PATH)) return [];
  return JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
}

function saveBlacklist(blacklist) {
  fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(blacklist, null, 2));
}

function addToBlacklist(strategy, reason) {
  const blacklist = loadBlacklist();
  // Generate fingerprint using TreeCraft (simplified – hash of conditions)
  const fingerprint = crypto.createHash('sha256')
    .update(JSON.stringify(strategy.conditions))
    .digest('hex');
  
  blacklist.push({
    fingerprint,
    former_id: strategy.scp_id,
    former_name: strategy.name,
    breach_1: strategy.addendum_log?.find(e => e.type === 'BREACH')?.date || 'unknown',
    breach_2: new Date().toISOString(),
    deletion_reason: reason,
    final_state_snapshot: strategy
  });
  saveBlacklist(blacklist);
  // console.log(`[OFFICER] Apollyon ${strategy.scp_id} added to blacklist`);
}

function logContainment(strategy, reason, isApollyon = false) {
  let log = [];
  if (fs.existsSync(CONTAINMENT_LOG)) {
    log = JSON.parse(fs.readFileSync(CONTAINMENT_LOG, 'utf8'));
  }
  log.push({
    timestamp: new Date().toISOString(),
    strategy_id: strategy.scp_id,
    reason,
    isApollyon,
    action: isApollyon ? 'DELETED + BLACKLISTED' : 'MOVED_TO_CONTAINED'
  });
  fs.writeFileSync(CONTAINMENT_LOG, JSON.stringify(log, null, 2));
}

function enforceContainment(strategy, currentPnL, dailyLoss) {
  const procedures = strategy.containment_procedures;
  let breachReason = null;
  
  // Check drawdown
  if (Math.abs(currentPnL) > procedures.max_drawdown_pct) {
    breachReason = `Max drawdown exceeded: ${currentPnL}% > ${procedures.max_drawdown_pct}%`;
  }
  // Check daily loss
  if (Math.abs(dailyLoss) > procedures.daily_loss_limit_pct) {
    breachReason = `Daily loss limit exceeded: ${dailyLoss}% > ${procedures.daily_loss_limit_pct}%`;
  }
  
  if (!breachReason) return false;
  
  // Check if this is second breach in 24h → Apollyon
  const recentBreaches = (strategy.addendum_log || [])
    .filter(e => e.type === 'BREACH' && new Date(e.date) > new Date(Date.now() - 24*60*60*1000));
  
  const isApollyon = recentBreaches.length >= 1; // this + previous = 2 breaches
  
  if (isApollyon || procedures.on_breach === 'apollyon') {
    // Apollyon: delete JSON, blacklist, log tombstone (Amendment 2)
    const activePath = path.join(ACTIVE_DIR, `${strategy.scp_id}_${strategy.name}.json`);
    if (fs.existsSync(activePath)) fs.unlinkSync(activePath);
    addToBlacklist(strategy, breachReason);
    logContainment(strategy, breachReason, true);
    
    // Send alert via Diplomat
    sendMessage('diplomat', 'APOLLYON_BREACH', { strategy, breachReason });
    // console.log(`[OFFICER] APOLLYON: ${strategy.scp_id} deleted and blacklisted`);
  } else {
    // Move to contained
    const activePath = path.join(ACTIVE_DIR, `${strategy.scp_id}_${strategy.name}.json`);
    const containedPath = path.join(CONTAINED_DIR, `${strategy.scp_id}_${strategy.name}__breached_${Date.now()}.json`);
    if (fs.existsSync(activePath)) {
      fs.renameSync(activePath, containedPath);
    }
    logContainment(strategy, breachReason, false);
    sendMessage('diplomat', 'CONTAINMENT_BREACH', { strategy, breachReason });
    // console.log(`[OFFICER] Contained ${strategy.scp_id}: ${breachReason}`);
  }
  
  return true;
}

// Stub – will read from executor in Phase 6
function getCurrentPnL(strategy) {
  // Placeholder: replace with real PnL from trade ledger
  return 0; // %
}

function startOfficer() {
  // console.log('[OFFICER] Watching for containment breaches (60s tick)');
  setInterval(() => {
    if (!fs.existsSync(ACTIVE_DIR)) return;
    const files = fs.readdirSync(ACTIVE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(ACTIVE_DIR, file), 'utf8');
        const strategy = JSON.parse(content);
        const pnl = getCurrentPnL(strategy);
        const dailyLoss = 0; // Placeholder
        enforceContainment(strategy, pnl, dailyLoss);
      } catch (err) {
        console.error(`[OFFICER] Error checking ${file}:`, err.message);
      }
    }
  }, 60000); // 60s tick (30s for Keter – can override later)
}

if (require.main === module) {
  startOfficer();
}

module.exports = { startOfficer, enforceContainment };
