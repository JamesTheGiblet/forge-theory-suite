const { placeOrder } = require('./kraken_executor');

async function executeOrder(strategy, action, price, volume) {
  const side = action === 'entry' ? 'buy' : 'sell';
  const result = await placeOrder(strategy, side, volume, price);
  console.log(`[EXECUTOR] ${action} ${volume} ${strategy.asset} @ ${price} - ${result.success ? '✅' : '❌'}`);
  return result;
}

module.exports = { executeOrder };
