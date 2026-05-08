const { registerHandler } = require('../bus/router');
const { queueMessage } = require('../shared/telegram');

function startDiplomat() {
  
  // KETER AUTHORISED
  registerHandler('KETER_AUTHORISED', (msg) => {
    const { strategyId, strategy, votes } = msg.payload;
    const text = `✅ *KETER STRATEGY AUTHORISED*\n\n*ID:* ${strategyId}\n*Name:* ${strategy?.name || strategyId}\n*Votes:* ${votes?.join(' + ') || 'Auditor + ForgeLord + Librarian'}\n\n_Strategy has passed 3-agent consensus._`;
    queueMessage(text);
  });
  
  // CONTAINMENT BREACH
  registerHandler('CONTAINMENT_BREACH', (msg) => {
    const { strategy, breachReason } = msg.payload;
    const text = `⚠️ *CONTAINMENT BREACH*\n\n*ID:* ${strategy.scp_id}\n*Name:* ${strategy.name}\n*Reason:* ${breachReason}\n\n_Strategy moved to containment._`;
    queueMessage(text);
  });
  
  // APOLLYON TRIGGER
  registerHandler('APOLLYON_BREACH', (msg) => {
    const { strategy, breachReason } = msg.payload;
    const text = `🔥 *APOLLYON TRIGGERED*\n\n*ID:* ${strategy.scp_id}\n*Name:* ${strategy.name}\n*Reason:* ${breachReason}\n\n_Strategy DELETED and blacklisted._`;
    queueMessage(text);
  });
  
  // LINEAGE THRASHING
  registerHandler('LINEAGE_THRASHING', (msg) => {
    const { parentId, reason, confidence } = msg.payload;
    const text = `📉 *LINEAGE THRASHING*\n\n*Parent:* ${parentId}\n*Reason:* ${reason}\n*Confidence:* ${(confidence * 100).toFixed(0)}%\n\n_Halting mutations._`;
    queueMessage(text);
  });
  
  // LINEAGE EVOLVING
  registerHandler('LINEAGE_EVOLVING', (msg) => {
    const { parentId, reason, confidence } = msg.payload;
    const text = `📈 *LINEAGE EVOLVING*\n\n*Parent:* ${parentId}\n*Reason:* ${reason}\n*Confidence:* ${(confidence * 100).toFixed(0)}%\n\n_Continuing mutations._`;
    queueMessage(text);
  });
  
  // REGIME SHIFT
  registerHandler('REGIME_CHANGE', (msg) => {
    const { old: oldRegime, new: newRegime } = msg.payload;
    const text = `🔄 *REGIME SHIFT*\n\n*Old:* ${oldRegime}\n*New:* ${newRegime}\n\n_Strategies re-evaluated._`;
    queueMessage(text);
  });
  
  // TOURNAMENT LEADERBOARD
  registerHandler('TOURNAMENT_LEADERBOARD', (msg) => {
    const { leaderboard } = msg.payload;
    if (!leaderboard || leaderboard.length === 0) {
      return;
    }
    
    let text = `🏆 *TOURNAMENT LEADERBOARD*\n\n`;
    for (let i = 0; i < Math.min(5, leaderboard.length); i++) {
      const s = leaderboard[i];
      const pnlEmoji = s.realPnl >= 0.05 ? '🚀' : (s.realPnl <= -0.03 ? '⚠️' : '📊');
      const pnlSign = s.realPnl >= 0 ? '+' : '';
      text += `${i+1}. *${s.strategyId}* (${s.class})\n`;
      text += `   ${pnlEmoji} Real: ${pnlSign}${(s.realPnl*100).toFixed(1)}% | WR: ${(s.winRate*100).toFixed(0)}%\n`;
    }
    queueMessage(text);
  });
}

module.exports = { startDiplomat };

// Add price alert handler
registerHandler('PRICE_ALERT', async (msg) => {
  const { asset, price, change } = msg.payload;
  const emoji = change > 0 ? '📈' : (change < 0 ? '📉' : '➡️');
  const text = `${emoji} *PRICE ALERT*\\n\\n*${asset}*: $${price}\\n*24h Change*: ${change > 0 ? '+' : ''}${change}%`;
  queueMessage(text);
});

// Portfolio update alert
registerHandler('PORTFOLIO_UPDATE', (msg) => {
  const { topStrategy, topAllocation, totalStrategies, totalCapital } = msg.payload;
  const text = `💰 *PORTFOLIO ALLOCATION*\n\n` +
    `*Top Strategy:* ${topStrategy}\n` +
    `*Allocation:* $${topAllocation}\n` +
    `*Total Strategies:* ${totalStrategies}\n` +
    `*Total Capital:* $${totalCapital}\n\n` +
    `_Capital rebalanced based on tournament performance._`;
  queueMessage(text);
});

// Sentiment alert handler
registerHandler('SENTIMENT_ALERT', (msg) => {
  const { value, classification, action, emoji } = msg.payload;
  const text = `${emoji} *SENTIMENT ALERT*\\n\\n` +
    `*Fear & Greed:* ${value}/100\\n` +
    `*Classification:* ${classification}\\n` +
    `*Market Action:* ${action.toUpperCase()}\\n\\n` +
    `_Regime adjusted based on market sentiment._`;
  queueMessage(text);
});

// Arbitrage opportunity alert
registerHandler('ARBITRAGE_OPPORTUNITY', (msg) => {
  const opp = msg.payload;
  const emoji = opp.deviation > 0 ? '📈' : '📉';
  const text = `${emoji} *ARBITRAGE OPPORTUNITY*\n\n` +
    `*Pair:* ${opp.name}\n` +
    `*${opp.asset1}:* $${opp.price1}\n` +
    `*${opp.asset2}:* $${opp.price2}\n` +
    `*Deviation:* ${opp.deviation}% ${opp.direction}\n` +
    `*Signal:* ${opp.signal}\n` +
    `*Confidence:* ${opp.confidence}%\n\n` +
    `_Consider ${opp.signal.toLowerCase()} when deviation normalizes._`;
  queueMessage(text);
});

// Whale transaction alert
registerHandler('WHALE_TRANSACTION', (msg) => {
  const tx = msg.payload;
  const text = `${tx.emoji} *WHALE TRANSACTION DETECTED*\n\n` +
    `*Asset:* ${tx.symbol}\n` +
    `*Amount:* ${tx.amount.toLocaleString()} ${tx.symbol} ($${(tx.value / 1000000).toFixed(1)}M)\n` +
    `*Direction:* ${tx.direction}\n` +
    `*From:* ${tx.from}\n` +
    `*To:* ${tx.to}\n\n` +
    `_Large whale movement detected. Monitor price action._`;
  queueMessage(text);
});

// Exchange flow alert
registerHandler('EXCHANGE_FLOW', (msg) => {
  const flow = msg.payload;
  const text = `${flow.emoji} *EXCHANGE FLOW ALERT*\n\n` +
    `*Exchange:* ${flow.exchange}\n` +
    `*Net Flow:* $${(flow.netFlow / 1000000).toFixed(1)}M ${flow.direction}\n` +
    `*Inflow:* $${(flow.inflow / 1000000).toFixed(1)}M\n` +
    `*Outflow:* $${(flow.outflow / 1000000).toFixed(1)}M\n\n` +
    `_Significant exchange movement detected._`;
  queueMessage(text);
});

// Whale detection alert (custom)
registerHandler('WHALE_DETECTION', (msg) => {
  const d = msg.payload;
  let emoji, title, message;
  
  if (d.type === 'volume_spike') {
    emoji = '🐋';
    title = 'WHALE VOLUME SPIKE';
    message = `Massive volume spike detected in ${d.asset}\nVolume: ${d.volumeSpike}x normal\nSeverity: ${d.severity.toUpperCase()}`;
  } else if (d.type === 'accumulation') {
    emoji = '🟢';
    title = 'WHALE ACCUMULATION';
    message = `Whales accumulating ${d.asset}\nVolume increase: ${d.volumeIncrease}x\nGreen candles: ${d.greenRatio}%`;
  } else if (d.type === 'distribution') {
    emoji = '🔴';
    title = 'WHALE DISTRIBUTION';
    message = `Whales distributing ${d.asset}\nVolume increase: ${d.volumeIncrease}x\nRed candles: ${d.redRatio}%`;
  } else {
    return;
  }
  
  const text = `${emoji} *${title}*\n\n${message}\n\n_Consider adjusting positions._`;
  queueMessage(text);
});

// VIX Summary alert
registerHandler('VIX_SUMMARY', (msg) => {
  const vix = msg.payload;
  const emoji = vix.avgVix < 20 ? '🟢' : (vix.avgVix < 40 ? '🟡' : (vix.avgVix < 60 ? '🟠' : '🔴'));
  
  let text = `${emoji} *CRYPTO VIX SUMMARY*\n\n`;
  text += `*Average VIX:* ${vix.avgVix}\n`;
  text += `*Market Condition:* ${vix.avgVix < 20 ? 'Low volatility, trending' : (vix.avgVix < 40 ? 'Normal volatility' : (vix.avgVix < 60 ? 'High volatility, caution' : 'Extreme volatility, high risk'))}\n\n`;
  text += `*Per Asset:*\n`;
  
  for (const r of vix.readings.slice(0, 5)) {
    text += `  ${r.level.emoji} ${r.asset}: ${r.vix}\n`;
  }
  
  text += `\n_Volatility index based on 20-period price returns._`;
  queueMessage(text);
});

// Narrative broadcast (from narrator)
registerHandler('NARRATIVE', (msg) => {
  const { text } = msg.payload;
  queueMessage(text, 'Markdown');
});

// Voice command transcript
registerHandler('VOICE_COMMAND', (msg) => {
  const { command, response } = msg.payload;
  const text = `🎙️ *Voice Command*\n\nYou said: "${command}"\n\nLEGION replied: "${response}"`;
  queueMessage(text, 'Markdown');
});

// Self-improvement analysis
registerHandler('SELF_IMPROVEMENT', (msg) => {
  const { message } = msg.payload;
  queueMessage(message, 'Markdown');
});

// Improvement applied alert
registerHandler('IMPROVEMENT_APPLIED', (msg) => {
  const record = msg.payload;
  const text = `🔧 *AUTONOMOUS IMPROVEMENT APPLIED*\n\n` +
    `*Action:* ${record.suggestion.action}\n` +
    `*Description:* ${record.suggestion.description}\n` +
    `*Result:* ${record.result}\n` +
    `*Status:* ${record.success ? '✅ Success' : '❌ Failed'}\n\n` +
    `_LEGION improved itself without asking._`;
  queueMessage(text, 'Markdown');
});

// Cross-exchange arbitrage alert
registerHandler('CROSS_ARBITRAGE', (msg) => {
  const opp = msg.payload;
  const emoji = parseFloat(opp.difference) > 0 ? '📈' : '📉';
  const text = `${emoji} *CROSS-EXCHANGE ARBITRAGE*\n\n` +
    `*Asset:* ${opp.asset}\n` +
    `*Kraken:* $${opp.krakenPrice}\n` +
    `*Coinbase:* $${opp.coinbasePrice}\n` +
    `*Difference:* ${opp.difference}%\n` +
    `*Action:* ${opp.direction}\n` +
    `*Potential Profit:* ${opp.profit}%\n\n` +
    `_Execute quickly before price converges._`;
  queueMessage(text, 'Markdown');
});

// Whale activity alert
registerHandler('WHALE_ACTIVITY', (msg) => {
  const w = msg.payload;
  const text = `🐋 *WHALE ACTIVITY DETECTED*\n\n` +
    `*Chain:* ${w.chain}\n` +
    `*Label:* ${w.label}\n` +
    `*Address:* ${w.address.substring(0, 16)}...\n` +
    `*Amount:* ${w.amount.toFixed(2)} ${w.chain}\n` +
    `*Txid:* ${w.txid.substring(0, 32)}...\n\n` +
    `_Large transaction detected from known whale address._`;
  queueMessage(text, 'Markdown');
});

// Whale activity alert
registerHandler('WHALE_ACTIVITY', (msg) => {
  const w = msg.payload;
  const text = `🐋 *WHALE ACTIVITY DETECTED*\n\n` +
    `*Chain:* ${w.chain}\n` +
    `*Label:* ${w.label}\n` +
    `*Address:* ${w.address.substring(0, 16)}...\n` +
    `*Amount:* ${w.amount.toFixed(2)} ${w.chain}\n` +
    `*Txid:* ${w.txid.substring(0, 32)}...\n\n` +
    `_Large transaction detected from known whale address._`;
  queueMessage(text, 'Markdown');
});

// Social sentiment alert
registerHandler('SOCIAL_SENTIMENT', (msg) => {
  const s = msg.payload;
  const emoji = s.sentiment === 'bullish' ? '🐂📰' : (s.sentiment === 'bearish' ? '🐻📰' : '📰');
  const text = `${emoji} *SOCIAL SENTIMENT*\n\n` +
    `*Overall:* ${s.overall}/100 (${s.sentiment.toUpperCase()})\n` +
    `*Twitter:* ${s.twitter}/100\n` +
    `*News:* ${s.news}/100\n` +
    `*Trending:* ${s.trends?.join(', ') || 'None'}\n\n` +
    `_Based on crypto news and social trends._`;
  queueMessage(text, 'Markdown');
});

// DEX execution alert
registerHandler('DEX_EXECUTION', (msg) => {
  const ex = msg.payload;
  const text = `🔄 *DEX EXECUTION*\n\n` +
    `*Action:* ${ex.action}\n` +
    `*Token In:* ${ex.tokenIn}\n` +
    `*Token Out:* ${ex.tokenOut}\n` +
    `*Amount:* ${ex.amount}\n` +
    `*Tx Hash:* ${ex.txHash.substring(0, 32)}...\n` +
    `*Status:* ${ex.success ? '✅ Success' : '❌ Failed'}`;
  queueMessage(text, 'Markdown');
});

// MEV alert
registerHandler('MEV_ALERT', (msg) => {
  const m = msg.payload;
  const text = `⚠️ *MEV ALERT*\n\n` +
    `*Type:* ${m.type}\n` +
    `*Transaction:* ${m.txHash.substring(0, 32)}...\n` +
    `*Risk:* ${m.risk}\n\n` +
    `_Potential front-running detected._`;
  queueMessage(text, 'Markdown');
});

// Kill switch alert
registerHandler('KILL_SWITCH', (msg) => {
  queueMessage(`🔴 *KILL SWITCH ENGAGED*\n\nAll trading stopped. Positions flattened.\n_LEGION is now inactive._`);
});

// Emergency close alert
registerHandler('EMERGENCY_CLOSE', (msg) => {
  queueMessage(`⚠️ *EMERGENCY CLOSE*\n\nAll positions closed at ${new Date(msg.payload.timestamp).toLocaleString()}`);
});

// Daily sovereignty report
registerHandler('SOVEREIGNTY_REPORT', (msg) => {
  const r = msg.payload;
  const text = `👑 *SOVEREIGNTY REPORT*\n\n` +
    `*Active Strategies:* ${r.activeStrategies}\n` +
    `*Kill Switch:* ${r.killSwitch ? 'ENGAGED' : 'READY'}\n` +
    `*Uptime:* ${(r.uptime / 3600).toFixed(1)} hours\n\n` +
    `_You are in control. One command stops everything._`;
  queueMessage(text);
});
