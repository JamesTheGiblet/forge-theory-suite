const { DQNTrader } = require('./engine/dqn_trader_light');
const { RedditSentiment } = require('./shared/reddit_sentiment');
const { ArbitrageEngine } = require('./engine/arbitrage_engine');
const { getCandles } = require('./shared/kraken_adapter');

async function main() {
  console.log('\n⚡ MK10 Intelligence – DQN + Reddit + Arbitrage\n');
  
  const dqn = new DQNTrader();
  const reddit = new RedditSentiment();
  const arbitrage = new ArbitrageEngine();
  
  reddit.start(30);
  arbitrage.start(15);
  
  let tradeCount = 0;
  
  setInterval(async () => {
    const candles = getCandles('BTC/USD', 100);
    if (candles && candles.length > 50) {
      const result = await dqn.trade(candles);
      tradeCount++;
      if (result) {
        console.log(`[DQN] ${result.action} | PnL: ${(result.pnl*100).toFixed(2)}% | Balance: $${result.balance.toFixed(2)} | ε: ${result.epsilon}`);
      }
    }
  }, 60 * 60 * 1000);
  
  console.log('✅ DQN Trader: Active');
  console.log('✅ Reddit Sentiment: Active (30 min)');
  console.log('✅ Cross-Asset Arbitrage: Active (15 min)\n');
}

main().catch(console.error);
