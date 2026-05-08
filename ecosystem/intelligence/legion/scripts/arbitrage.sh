#!/bin/bash
cd ~/legion
node -e "
const { scanArbitrage, printArbitrageStatus } = require('./agents/arbitrage_detector');
printArbitrageStatus();
"
