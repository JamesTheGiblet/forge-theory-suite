const { Reaper } = require('./agents/reaper');
const reaper = new Reaper();

console.log('[REAPER_STANDALONE] Starting...');
reaper.start(10000); // Check every 10 seconds

// Keep alive
process.on('SIGINT', () => {
  console.log('[REAPER_STANDALONE] Shutting down');
  reaper.stop();
  process.exit(0);
});
