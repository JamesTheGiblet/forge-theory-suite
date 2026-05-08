#!/usr/bin/env node
'use strict';

const MultiAssetMeta = require('./engine');
const path = require('path');

const DB_PATH = path.join(process.env.HOME, 'kraken-intelligence/data/intelligence.db');

async function backtest() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Multi-Asset Meta Strategy — Backtest');
  console.log('═'.repeat(60));
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60) + '\n');

  const engine = new MultiAssetMeta({ status: 'dry_run', capital: 250 });
  await engine.runBacktest(DB_PATH);
}

backtest().catch(console.error);
