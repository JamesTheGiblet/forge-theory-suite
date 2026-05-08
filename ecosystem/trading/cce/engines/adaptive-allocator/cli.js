const AdaptiveAllocator = require('./allocator');
const allocator = new AdaptiveAllocator();

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === 'run') {
    await allocator.run();
  } else if (command === 'status') {
    allocator.printStatus();
  } else if (command === 'promote') {
    const state = allocator.loadState();
    if (state.status === 'ready_for_live') {
      console.log('\nPromoting engine to LIVE...');
      console.log('   Add API key to .env and restart PM2');
    } else {
      console.log('\nEngine not ready. Current status: ' + state.status);
      console.log('   Dry run days: ' + state.dryRunDays + '/30 required');
    }
  } else {
    console.log('\nAdaptive Allocator - Commands:');
    console.log('  node cli.js run       - Check market and assign/update engine');
    console.log('  node cli.js status    - Show current status');
    console.log('  node cli.js promote   - Promote to live (after 30 days)');
  }
}

main().catch(console.error);
