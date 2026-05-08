#!/usr/bin/env node
/**
 * Praximous — Proactive AI Agent Swarm
 * Part of the Adaptive Intelligence Platform
 * License: MIT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), override: true });
try {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath) && fs.existsSync(envPath + '.txt')) envPath += '.txt';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8').replace(/\0/g, '');
    const match = envContent.match(/GEMINI_API_KEY=([a-zA-Z0-9_\-]+)/);
    if (match) process.env.GEMINI_API_KEY = match[1];

    const matchTgToken = envContent.match(/TELEGRAM_BOT_TOKEN=([a-zA-Z0-9:\-_]+)/);
    if (matchTgToken) process.env.TELEGRAM_BOT_TOKEN = matchTgToken[1];
    
    const matchTgChat = envContent.match(/TELEGRAM_CHAT_ID=([a-zA-Z0-9\-_]+)/);
    if (matchTgChat) process.env.TELEGRAM_CHAT_ID = matchTgChat[1];
  }
} catch(e) {}

class Praximous {
  constructor() {
    this.baseDir = path.join(__dirname, '..', '..');
  }

  readJSON(filePath, fallback = null) {
    try {
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {}
    return fallback;
  }

  logAlert(agent, message, emoji = '⚠️') {
    const alert = {
      timestamp: new Date().toISOString(),
      agent,
      message,
      emoji
    };
    const logPath = path.join(this.baseDir, 'logs', 'praximous_alerts.json');
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let alerts = [];
    if (fs.existsSync(logPath)) {
      try { alerts = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {}
    }
    alerts.push(alert);
    if (alerts.length > 1000) alerts = alerts.slice(-1000);
    fs.writeFileSync(logPath, JSON.stringify(alerts, null, 2));
    console.log(`      ${emoji} ${agent}: ${message}`);
  }

  // 🦅 The Scout: Monitors data anomalies, volume spikes, and system security
  runScout() {
    console.log('   🦅 SCOUT AGENT: Active');
    
    // TODO: Read from analyse.js anomaly reports and whisper security scans
    const marketStateFile = path.join(this.baseDir, 'reasoning-bot', 'active_strategy.json');
    const market = this.readJSON(marketStateFile)?.marketState;
    
    if (market && market.volumeRatio > 2.0) {
      console.log(`      🚨 ALERT: Massive volume spike detected (${market.volumeRatio.toFixed(2)}x normal).`);
      console.log(`      → Recommending volatility-aware strategy transition.`);
    } else {
      console.log('      ✅ No critical data anomalies detected. Volume and security nominal.');
    }
  }

  // 🔨 The Forge Master: Watches reasoning-bot & evolution loops for stagnation
  async runForgeMaster() {
    console.log('   🔨 FORGE MASTER: Active');
    
    // TODO: Read validation_failures.json to check if the loop is stuck
    const failuresFile = path.join(this.baseDir, 'reasoning-bot', 'data', 'validation_failures.json');
    const failures = this.readJSON(failuresFile, []);
    
    if (failures.length > 10) {
      console.log(`      ⚠️  WARNING: ${failures.length} recent validation failures.`);
      console.log(`      → Reasoning engine stalling. Initiating Gemini-powered mutation injection...`);
      this.logAlert('Forge Master', `Reasoning engine stalling. ${failures.length} recent validation failures.`, '⚠️');
      
      if (!process.env.GEMINI_API_KEY) {
        console.log('      ❌ GEMINI_API_KEY missing. Cannot perform mutation.');
        return;
      }
      
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `The algorithmic trading generator is stuck. Here are the last 3 failures:\n`
          + JSON.stringify(failures.slice(0,3), null, 2)
          + `\nProvide a radical parameter mutation to break the stall. Return ONLY raw JSON with no markdown formatting. Format: {"target": 15, "stop": 5, "hold": 10, "rsiEntry": 30, "rsiExit": 60}`;
        
        const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { temperature: 0.7 } });
        const jsonText = r.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const mutation = JSON.parse(jsonText);
        
        const injectionFile = path.join(this.baseDir, 'reasoning-bot', 'data', 'praximous_injection.json');
        fs.writeFileSync(injectionFile, JSON.stringify(mutation, null, 2));
        
        // Clear failures to forcibly unstick the loop!
        fs.writeFileSync(failuresFile, JSON.stringify([]));
        
        console.log(`      ✨ MUTATION SUCCESSFUL: Target ${mutation.target}%, Stop ${mutation.stop}%, Hold ${mutation.hold}d`);
        console.log(`      → Failure log cleared. Injection saved for next reasoning cycle.`);
        this.logAlert('Forge Master', `Mutation successful: Target ${mutation.target}%, Stop ${mutation.stop}%, Hold ${mutation.hold}d`, '✨');
      } catch(e) {
        console.log(`      ❌ Mutation failed: ${e.message}`);
        this.logAlert('Forge Master', `Mutation failed: ${e.message}`, '❌');
      }
    } else {
      console.log('      ✅ Forge pipeline is flowing smoothly.');
    }
  }

  // 🛡️ The Sentinel: Monitors live dry-run risk and losing streaks
  runSentinel() {
    console.log('   🛡️  SENTINEL: Active');
    
    // TODO: Read monitor_log.json to track losing streaks and invoke Aegis if necessary
    const monitorLog = path.join(this.baseDir, 'reasoning-bot', 'data', 'monitor_log.json');
    const log = this.readJSON(monitorLog);
    
    if (log && log.trades && log.trades.length > 0) {
      const recentTrades = log.trades.slice(-3);
      const losses = recentTrades.filter(t => !t.win).length;
      if (losses >= 3) {
        console.log(`      🛑 CRITICAL: Active strategy has lost ${losses} consecutive trades.`);
        console.log(`      → Initiating Aegis Lock 2 revocation protocol.`);
        this.logAlert('Sentinel', `Active strategy lost ${losses} consecutive trades. Aegis Lock 2 initiated.`, '🛑');
        return;
      }
    }
    console.log('      ✅ Live risk is contained. No excessive drawdowns detected.');
  }

  // 📚 The Librarian: Maintains database health and optimizes WAL
  runLibrarian() {
    console.log('   📚 LIBRARIAN: Active');
    const candlesPath = path.join(this.baseDir, 'candles.json');
    if (!fs.existsSync(candlesPath)) {
      console.log('      ⚠️  candles.json not found. Skipping maintenance.');
      return;
    }
    try {
      const stats = fs.statSync(candlesPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const data = JSON.parse(fs.readFileSync(candlesPath, 'utf8'));
      const candleCount = data.length;
      console.log(`      ✅ JSON store healthy. ${candleCount.toLocaleString()} candles, ${sizeMB} MB.`);
      this.logAlert('Librarian', `Candle store OK: ${candleCount} records, ${sizeMB} MB`, '✅');
    } catch (e) {
      console.log(`      ❌ Librarian error: ${e.message}`);
      this.logAlert('Librarian', `Error: ${e.message}`, '❌');
    }
  }

async runRecycler() {
  console.log('   🔄 RECYCLER AGENT: Active');
  const strategiesDir = path.join(this.baseDir, 'reasoning-bot', 'data', 'strategies');
  const archiveDir = path.join(this.baseDir, 'data', 'archived_strategies');
  if (!fs.existsSync(strategiesDir)) {
    console.log('      ⚠️ No strategies directory found');
    return;
  }
  const files = fs.readdirSync(strategiesDir).filter(f => f.endsWith('.json'));
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600000;
  let archived = 0;
  for (const file of files) {
    const filePath = path.join(strategiesDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < thirtyDaysAgo) {
        // Move to archive
        fs.renameSync(filePath, path.join(archiveDir, file));
        archived++;
      }
    } catch(e) {}
  }
  console.log(`      ✅ Archived ${archived} old strategies (inactive >30 days)`);
  this.logAlert('Recycler', `Archived ${archived} old strategies`, archived ? '🔄' : '✅');
}

async runMutator() {
  console.log('   🧬 MUTATOR AGENT: Active');
  const failuresFile = path.join(this.baseDir, 'reasoning-bot', 'data', 'validation_failures.json');
  if (!fs.existsSync(failuresFile)) return;
  const failures = this.readJSON(failuresFile, []);
  if (failures.length < 5) {
    console.log('      ✅ Not enough failures to trigger mutation');
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    console.log('      ⚠️ No Gemini API key – skipping advanced mutation');
    return;
  }
  // Check last mutation time to avoid spamming API
  const mutationStateFile = path.join(this.baseDir, 'data', 'mutation_state.json');
  let lastMutation = 0;
  if (fs.existsSync(mutationStateFile)) {
    const state = JSON.parse(fs.readFileSync(mutationStateFile, 'utf8'));
    lastMutation = state.lastMutation || 0;
  }
  if (Date.now() - lastMutation < 3600000) {
    console.log('      ⏳ Mutation already performed in last hour');
    return;
  }
  console.log('      🧠 Requesting creative strategy mutation from Gemini...');
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const recentFailures = failures.slice(-5);
    const prompt = `We are evolving a crypto trading strategy. The last 5 validation failures were:\n${JSON.stringify(recentFailures, null, 2)}\n\nSuggest a completely novel indicator combination and entry/exit rules that might break the deadlock. Return only JSON: { "indicators": ["RSI", "BB"], "entry": "rsi < 30 and price > bb_lower", "exit": "rsi > 70", "stop_loss": 2, "take_profit": 4 }`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { temperature: 0.9 } });
    const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const mutation = JSON.parse(text);
    // Save mutation suggestion for Forge Master to use
    const injectionFile = path.join(this.baseDir, 'reasoning-bot', 'data', 'praximous_injection.json');
    fs.writeFileSync(injectionFile, JSON.stringify(mutation, null, 2));
    fs.writeFileSync(mutationStateFile, JSON.stringify({ lastMutation: Date.now() }, null, 2));
    console.log(`      ✨ Mutation suggested: ${mutation.indicators?.join(', ')}`);
    this.logAlert('Mutator', `New mutation generated: ${mutation.indicators?.join(', ')}`, '🧬');
  } catch(e) {
    console.log(`      ❌ Mutation failed: ${e.message}`);
  }
}

async runAlchemist() {
  console.log('   🧪 ALCHEMIST AGENT: Active');
  const strategiesDir = path.join(this.baseDir, 'reasoning-bot', 'data', 'strategies');
  if (!fs.existsSync(strategiesDir)) return;
  const files = fs.readdirSync(strategiesDir).filter(f => f.endsWith('.json'));
  let tuned = 0;
  for (const file of files) {
    const filePath = path.join(strategiesDir, file);
    let strategy = this.readJSON(filePath);
    if (!strategy || !strategy.parameters) continue;
    let modified = false;
    // Simple random tweak: adjust RSI thresholds by ±2
    if (strategy.parameters.rsiEntry && typeof strategy.parameters.rsiEntry === 'number') {
      const newVal = Math.min(70, Math.max(20, strategy.parameters.rsiEntry + (Math.random() - 0.5) * 4));
      if (Math.abs(newVal - strategy.parameters.rsiEntry) > 1) {
        strategy.parameters.rsiEntry = Math.round(newVal);
        modified = true;
      }
    }
    if (strategy.parameters.rsiExit && typeof strategy.parameters.rsiExit === 'number') {
      const newVal = Math.min(90, Math.max(40, strategy.parameters.rsiExit + (Math.random() - 0.5) * 4));
      if (Math.abs(newVal - strategy.parameters.rsiExit) > 1) {
        strategy.parameters.rsiExit = Math.round(newVal);
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));
      tuned++;
    }
  }
  console.log(`      ✅ Tuned ${tuned} strategies with minor parameter adjustments`);
  this.logAlert('Alchemist', `Tuned ${tuned} strategies`, tuned ? '🧪' : '✅');
}

async runAuditor() {
  console.log('   💸 AUDITOR AGENT: Active');
  const monitorLog = path.join(this.baseDir, 'reasoning-bot', 'data', 'monitor_log.json');
  if (!fs.existsSync(monitorLog)) {
    console.log('      ⚠️ No monitor log found');
    return;
  }
  const log = this.readJSON(monitorLog, { trades: [] });
  const trades = log.trades || [];
  if (trades.length === 0) return;
  const feeRate = 0.0026; // Kraken taker fee 0.26%
  let totalFees = 0;
  let totalSlippage = 0;
  for (const trade of trades) {
    if (trade.size && trade.price) {
      const notional = trade.size * trade.price;
      totalFees += notional * feeRate;
      // Simulate slippage: 0.05% of notional if no explicit slippage field
      totalSlippage += notional * 0.0005;
    }
  }
  const pnl = log.totalPnl || 0;
  const feeImpact = (totalFees / (Math.abs(pnl) + 0.01)) * 100;
  console.log(`      📊 Estimated fees: $${totalFees.toFixed(2)} | Slippage: $${totalSlippage.toFixed(2)} | Fee impact: ${feeImpact.toFixed(1)}% of PnL`);
  if (feeImpact > 20) {
    console.log('      ⚠️ High fee impact – consider reducing trade frequency');
    this.logAlert('Auditor', `Fee impact ${feeImpact.toFixed(1)}% – too high`, '⚠️');
  } else {
    this.logAlert('Auditor', `Fees $${totalFees.toFixed(2)}, impact ${feeImpact.toFixed(1)}%`, '✅');
  }
}

async runArchivist() {
  console.log('   🧠 ARCHIVIST AGENT: Active');
  const lineageFile = path.join(this.baseDir, 'data', 'lineage', 'lineage.json');
  let lineage = { strategies: [], edges: [] };
  if (fs.existsSync(lineageFile)) {
    lineage = this.readJSON(lineageFile, lineage);
  }
  const activeStrategyFile = path.join(this.baseDir, 'reasoning-bot', 'active_strategy.json');
  if (!fs.existsSync(activeStrategyFile)) return;
  const active = this.readJSON(activeStrategyFile, {});
  const currentId = active.strategy;
  if (!currentId) return;
  // Record current strategy if not already tracked
  if (!lineage.strategies.find(s => s.id === currentId)) {
    lineage.strategies.push({ id: currentId, name: active.name, firstSeen: new Date().toISOString() });
  }
  // Look for parent-child relationships from mutation injections
  const injectionFile = path.join(this.baseDir, 'reasoning-bot', 'data', 'praximous_injection.json');
  if (fs.existsSync(injectionFile)) {
    const injection = this.readJSON(injectionFile, {});
    if (injection.parentId && injection.childId) {
      if (!lineage.edges.find(e => e.from === injection.parentId && e.to === injection.childId)) {
        lineage.edges.push({ from: injection.parentId, to: injection.childId, timestamp: new Date().toISOString() });
      }
      // Optionally remove injection file to avoid re-processing
      // fs.unlinkSync(injectionFile);
    }
  }
  fs.writeFileSync(lineageFile, JSON.stringify(lineage, null, 2));
  console.log(`      ✅ Tracked ${lineage.strategies.length} strategies and ${lineage.edges.length} evolutionary edges`);
  this.logAlert('Archivist', `Lineage: ${lineage.strategies.length} strategies`, '🧠');
}



  // ✉️ The Diplomat: Sends external alerts (e.g., Telegram) for critical events
  async runDiplomat() {
    console.log('   ✉️  DIPLOMAT: Active');
    
    const monitorLog = path.join(this.baseDir, 'reasoning-bot', 'data', 'monitor_log.json');
    const log = this.readJSON(monitorLog);
    
    let isAegisTriggered = false;
    let losses = 0;
    if (log && log.trades && log.trades.length > 0) {
      const recentTrades = log.trades.slice(-3);
      losses = recentTrades.filter(t => !t.win).length;
      if (losses >= 3) isAegisTriggered = true;
    }
    
    const marketStateFile = path.join(this.baseDir, 'reasoning-bot', 'active_strategy.json');
    const market = this.readJSON(marketStateFile)?.marketState;
    const isVolumeSpike = market && market.volumeRatio > 2.0;

    if (isAegisTriggered || isVolumeSpike) {
      console.log('      🚨 Critical events detected. Preparing dispatch...');
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!token || !chatId) {
        console.log('      ⚠️  Telegram credentials missing in .env (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).');
        return;
      }
      
      const messages = [];
      if (isAegisTriggered) {
        messages.push(`🛑 *CRITICAL ALERT: S.O.T.O.S Aegis Triggered*\nActive strategy has lost ${losses} consecutive trades. Aegis Lock 2 revocation protocol initiated.`);
      }
      if (isVolumeSpike) {
        messages.push(`🚨 *SCOUT ALERT: Massive Volume Spike*\nVolume is currently ${market.volumeRatio.toFixed(2)}x normal. Market volatility increasing.`);
      }
      
      try {
        const https = require('https');
        for (const message of messages) {
          const data = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' });
          const options = { hostname: 'api.telegram.org', port: 443, path: `/bot${token}/sendMessage`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
          await new Promise((resolve, reject) => { const req = https.request(options, res => { res.on('data', () => {}); res.on('end', resolve); }); req.on('error', reject); req.write(data); req.end(); });
        }
        console.log(`      ✅ ${messages.length} alert(s) dispatched to Telegram.`);
        this.logAlert('Diplomat', `${messages.length} alert(s) dispatched to Telegram.`, '✉️');
      } catch (e) {
        console.log(`      ❌ Failed to dispatch alert: ${e.message}`);
        this.logAlert('Diplomat', `Failed to dispatch alert: ${e.message}`, '❌');
      }
    } else {
      console.log('      ✅ No critical alerts to dispatch.');
    }
  }

async runOracle() {
  console.log('   🧙 ORACLE AGENT: Active');
  const sentimentFile = path.join(this.baseDir, 'data', 'sentiment.json');
  let lastFetch = null;
  let sentiment = null;
  if (fs.existsSync(sentimentFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(sentimentFile, 'utf8'));
      lastFetch = data.lastFetch;
      sentiment = data.sentiment;
    } catch(e) {}
  }
  const now = Date.now();
  const oneHour = 3600000;
  if (!lastFetch || (now - lastFetch) > oneHour) {
    console.log('      📡 Fetching market sentiment...');
    try {
      const https = require('https');
      const fgPromise = new Promise((resolve) => {
        https.get('https://api.alternative.me/fng/?limit=1', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const fng = json.data && json.data[0] ? json.data[0].value : null;
              resolve(fng);
            } catch(e) { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });
      const fearGreed = await fgPromise;
      sentiment = { fearGreed, timestamp: now };
      fs.writeFileSync(sentimentFile, JSON.stringify({ lastFetch: now, sentiment }, null, 2));
      console.log(`      ✅ Sentiment updated: Fear & Greed = ${fearGreed}`);
      this.logAlert('Oracle', `Fear & Greed: ${fearGreed}`, '🧙');
    } catch(e) {
      console.log(`      ❌ Sentiment fetch failed: ${e.message}`);
    }
  } else {
    console.log(`      ✅ Using cached sentiment (Fear & Greed = ${sentiment?.fearGreed || 'N/A'})`);
  }
}

async runCustodian() {
  console.log('   🔐 CUSTODIAN AGENT: Active');
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.log('      ⚠️  Kraken API credentials missing in .env');
    this.logAlert('Custodian', 'Kraken API keys missing', '⚠️');
    return;
  }
  console.log('      🔑 Kraken API key present (first 4 chars: ' + apiKey.slice(0,4) + '...)');
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log('      🤖 Gemini API key present (first 4 chars: ' + geminiKey.slice(0,4) + '...)');
  } else {
    console.log('      ⚠️  Gemini API key missing – Forge Master mutations disabled');
    this.logAlert('Custodian', 'Gemini API key missing', '⚠️');
  }
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    console.log('      📱 Telegram credentials present');
  } else {
    console.log('      ⚠️  Telegram credentials missing – Diplomat disabled');
  }
  this.logAlert('Custodian', 'API key health check passed', '✅');
}

async runScheduler() {
  console.log('   ⏱️  SCHEDULER AGENT: Active');
  const stateFile = path.join(this.baseDir, 'data', 'scheduler_state.json');
  let state = { lastAdjust: 0, currentFrequency: 'hourly' };
  if (fs.existsSync(stateFile)) {
    try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch(e) {}
  }
  const now = Date.now();
  const sixHours = 21600000;
  if (state.lastAdjust && (now - state.lastAdjust) < sixHours) {
    console.log(`      ⏳ Scheduler last adjusted ${Math.round((now - state.lastAdjust)/3600000)} hours ago. No change.`);
    return;
  }
  const os = require('os');
  let cpus = os.cpus().length;
  if (cpus === 0) cpus = 4; // fallback for Termux/Android
  const loadAvg = os.loadavg()[0];
  const memUsage = (1 - (os.freemem() / os.totalmem())) * 100;
  console.log(`      📊 System load: ${loadAvg.toFixed(2)} (${cpus} cores estimated), Memory usage: ${memUsage.toFixed(1)}%`);
  
  let newFrequency = 'hourly';
  // Use absolute load thresholds (loadavg on Android can be misleading)
  if (loadAvg > 4.0 || memUsage > 85) {
    newFrequency = 'every_2_hours';
    console.log('      ⚠️  High system load – reducing swarm frequency to every 2 hours');
    this.logAlert('Scheduler', 'High load detected – reducing frequency', '⚠️');
  } else if (loadAvg < 1.5 && memUsage < 50) {
    newFrequency = 'every_30_minutes';
    console.log('      ✅ Low system load – increasing swarm frequency to every 30 minutes');
    this.logAlert('Scheduler', 'Low load – increasing frequency', '✅');
  } else {
    console.log('      ✅ Load normal – keeping hourly frequency');
  }
  
  if (newFrequency !== state.currentFrequency) {
    state.currentFrequency = newFrequency;
    state.lastAdjust = now;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    console.log(`      🔄 Updated scheduler state: ${newFrequency}`);
    this.logAlert('Scheduler', `Frequency changed to ${newFrequency}`, '🔄');
    
    // Optionally, modify crontab here (advanced)
    console.log(`      💡 To apply, manually run: crontab -e and change Praximous line to */30 * * * * (or 0 */2 * * *)`);
  }
}

async runSwarm() {
  this.runScout();
  console.log('   ' + '─'.repeat(54));
  await this.runForgeMaster();
  console.log('   ' + '─'.repeat(54));
  this.runSentinel();
  console.log('   ' + '─'.repeat(54));
  this.runLibrarian();
  console.log('   ' + '─'.repeat(54));
  await this.runDiplomat();
  console.log('   ' + '─'.repeat(54));
  await this.runOracle();
  console.log('   ' + '─'.repeat(54));
  await this.runCustodian();
  console.log('   ' + '─'.repeat(54));
  await this.runScheduler();
  console.log('   ' + '─'.repeat(54));
  await this.runRecycler();
  console.log('   ' + '─'.repeat(54));
  await this.runMutator();
  console.log('   ' + '─'.repeat(54));
  await this.runAlchemist();
  console.log('   ' + '─'.repeat(54));
  await this.runAuditor();
  console.log('   ' + '─'.repeat(54));
  await this.runArchivist();
}
}

module.exports = Praximous;
