const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { registerHandler, sendMessage } = require('../bus/router');

const VOTE_LEDGER_PATH = path.join(__dirname, '../data/vote_ledger.json');
const KETER_VOTES_REQUIRED = 3;

let pendingVotes = new Map();

function loadLedger() {
  if (!fs.existsSync(VOTE_LEDGER_PATH)) {
    return { chain: [], last_hash: "0000000000000000000000000000000000000000000000000000000000000000" };
  }
  try {
    return JSON.parse(fs.readFileSync(VOTE_LEDGER_PATH, 'utf8'));
  } catch (err) {
    console.error('[VOTE] Failed to parse ledger, resetting:', err.message);
    return { chain: [], last_hash: "0000000000000000000000000000000000000000000000000000000000000000" };
  }
}

function saveLedger(ledger) {
  fs.writeFileSync(VOTE_LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

function computeHash(entry, prevHash) {
  const data = JSON.stringify(entry) + prevHash;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function addVoteToLedger(strategyId, votes, result) {
  const ledger = loadLedger();
  const newEntry = {
    entry_id: `vote_${Date.now()}`,
    strategy_id: strategyId,
    agents: Array.from(votes),
    result,
    timestamp: new Date().toISOString(),
    prev_hash: ledger.last_hash
  };
  newEntry.entry_hash = computeHash(newEntry, ledger.last_hash);
  
  ledger.chain.push(newEntry);
  ledger.last_hash = newEntry.entry_hash;
  saveLedger(ledger);
  
  return newEntry;
}

function requestKeterVote(strategyId, strategy, requester) {
  if (pendingVotes.has(strategyId)) {
    pendingVotes.get(strategyId).votes.add(requester);
  } else {
    pendingVotes.set(strategyId, { votes: new Set([requester]), strategy });
  }
  
  const voteSet = pendingVotes.get(strategyId).votes;
  
  if (voteSet.size >= KETER_VOTES_REQUIRED) {
    addVoteToLedger(strategyId, voteSet, 'AUTHORISED');
    sendMessage('forge_lord', 'KETER_AUTHORISED', { strategyId, strategy });
    sendMessage('diplomat', 'KETER_AUTHORISED', { strategyId, votes: Array.from(voteSet) });
    pendingVotes.delete(strategyId);
  }
}

function startVoteManager() {
  // Validate chain with error recovery
  const ledger = loadLedger();
  let isValid = true;
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  
  for (const entry of ledger.chain) {
    const expectedHash = computeHash(entry, prevHash);
    if (expectedHash !== entry.entry_hash) {
      console.error(`[VOTE] CHAIN CORRUPTED at ${entry.entry_id} – resetting ledger`);
      // Reset corrupted ledger instead of crashing
      saveLedger({ chain: [], last_hash: "0000000000000000000000000000000000000000000000000000000000000000" });
      isValid = false;
      break;
    }
    prevHash = entry.entry_hash;
  }
  
  if (isValid) {
  } else {
  }
  
  registerHandler('KETER_VOTE_REQUEST', (msg) => {
    const { strategyId, strategy, voter } = msg.payload;
    requestKeterVote(strategyId, strategy, voter);
  });
  
}

if (require.main === module) {
  startVoteManager();
}

module.exports = { startVoteManager, requestKeterVote };
