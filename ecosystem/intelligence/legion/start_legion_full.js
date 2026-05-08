require('dotenv').config();

console.log('\n⚡ LEGION MK20 – Full Stack\n');

// All agents
const { startRouter } = require('./bus/router');
const { startForgeLord } = require('./agents/forge_lord');
const { startAuditor } = require('./agents/auditor');
const { startLibrarian } = require('./agents/librarian');
const { startNecromancer } = require('./agents/necromancer');
const { startVoteManager } = require('./agents/vote_manager');
const { startDiplomat } = require('./agents/diplomat');
const { startRegimeWatcher } = require('./shared/regime_adapter');
const { startTreasurer } = require('./agents/treasurer');
const { startTournament } = require('./agents/tournament');
const { startPaperTrader } = require('./agents/paper_trader');
const { startChameleon } = require('./agents/chameleon_lm');
const { startPortfolioAllocator } = require('./agents/portfolio_allocator');
const { startMarketIntel } = require('./agents/market_intelligence');
const { startOnChainIntel } = require('./shared/onchain_intel');
const { Narrator } = require('./agents/narrator');
const { VoiceCommander } = require('./agents/voice_commander');
const { ImplementationEngine } = require('./agents/implementation_engine');

console.log('[BOOT] Starting agents...');

// Start core agents
try { startAuditor(); } catch(e) { console.error('Auditor:', e.message); }
try { startLibrarian(); } catch(e) { console.error('Librarian:', e.message); }
try { startNecromancer(); } catch(e) { console.error('Necromancer:', e.message); }
try { startVoteManager(); } catch(e) { console.error('VoteManager:', e.message); }
try { startDiplomat(); } catch(e) { console.error('Diplomat:', e.message); }
try { startRegimeWatcher(); } catch(e) { console.error('RegimeWatcher:', e.message); }
try { startTreasurer(); } catch(e) { console.error('Treasurer:', e.message); }
try { startTournament(); } catch(e) { console.error('Tournament:', e.message); }
try { startPaperTrader(); } catch(e) { console.error('PaperTrader:', e.message); }
try { startChameleon(); } catch(e) { console.error('Chameleon:', e.message); }
try { startPortfolioAllocator(); } catch(e) { console.error('PortfolioAllocator:', e.message); }
try { startMarketIntel(); } catch(e) { console.error('MarketIntel:', e.message); }
try { startOnChainIntel(); } catch(e) { console.error('OnChainIntel:', e.message); }

// Special agents
try {
  const narrator = new Narrator();
  narrator.start(60);
} catch(e) { console.error('Narrator:', e.message); }

try {
  const voiceCommander = new VoiceCommander();
  voiceCommander.start();
} catch(e) { console.error('VoiceCommander:', e.message); }

try {
  const implEngine = new ImplementationEngine();
  implEngine.start();
} catch(e) { console.error('ImplEngine:', e.message); }

try {
  console.log('[REAPER] Started');

// Start router and forge lord
setTimeout(() => {
  try {
    startRouter();
    startForgeLord();
    console.log('\n✅ LEGION ready – Full stack\n');
  } catch(e) { console.error('Startup:', e.message); }
}, 2000);
