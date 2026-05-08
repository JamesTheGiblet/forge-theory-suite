/**
 * Adaptive Intelligence Platform — Monitor
 * Part of the AIP suite
 * License: MIT
 */

#!/usr/bin/env node
'use strict';

const SmartBTCStrategy = require('./engine');

const engine = new SmartBTCStrategy({ status: 'dry_run', capital: 100 });

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  engine.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  engine.stop();
  process.exit(0);
});

engine.start().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
