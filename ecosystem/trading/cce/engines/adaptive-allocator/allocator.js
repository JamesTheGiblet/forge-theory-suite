const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AdaptiveAllocator {
  constructor() {
    this.reasoningOutput = path.join(process.env.HOME, 'kraken-intelligence', 'reasoning-bot', 'active_strategy.json');
    this.enginesDir = path.join(process.env.HOME, 'cce', 'engines');
    this.stateFile = path.join(__dirname, 'allocator_state.json');
    this.dryRunDir = path.join(this.enginesDir, 'dry-run');
    this.resultsDir = path.join(__dirname, 'results');
    this.requiredDryRunDays = 30;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dryRunDir)) fs.mkdirSync(this.dryRunDir, { recursive: true });
    if (!fs.existsSync(this.resultsDir)) fs.mkdirSync(this.resultsDir, { recursive: true });
    if (!fs.existsSync(this.stateFile)) {
      fs.writeFileSync(this.stateFile, JSON.stringify({
        currentEngine: null,
        engineHistory: [],
        dryRunStartDate: null,
        dryRunDays: 0,
        status: 'idle'
      }, null, 2));
    }
  }

  loadState() {
    return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
  }

  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  getCurrentMarketState() {
    if (!fs.existsSync(this.reasoningOutput)) {
      console.log('Waiting for Reasoning Bot output...');
      return null;
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.reasoningOutput, 'utf8'));
      return data.marketState;
    } catch (err) {
      console.error('Error reading market state:', err.message);
      return null;
    }
  }

  getStrategyForMarket(marketState) {
    const strategyMap = {
      'RANGING': { engine: 'grid-trading', target: 0.5, stop: 0.3, hold: 3, capital: 500 },
      'TRENDING_UP': { engine: 'momentum', target: 1.5, stop: 1, hold: 1, capital: 1000 },
      'TRENDING_DOWN': { engine: 'smart-btc', target: 5, stop: 2, hold: 10, capital: 800 },
      'VOLATILE': { engine: 'breakout', target: 2, stop: 1.5, hold: 0.5, capital: 600 },
      'QUIET': { engine: 'mean-reversion', target: 4, stop: 2.5, hold: 7, capital: 400 }
    };
    return strategyMap[marketState.regime] || strategyMap['RANGING'];
  }

  createEngineConfig(engineName, strategy, marketState) {
    return {
      id: engineName,
      name: strategy.engine.toUpperCase() + ' - ' + marketState.regime + ' Regime',
      version: '1.0.0',
      type: 'adaptive',
      timeframe: '1D',
      symbol: 'BTC/USD',
      exchange: 'kraken',
      capital: strategy.capital,
      status: 'dry_run',
      entry: this.getEntryDescription(strategy.engine),
      exit: '+' + strategy.target + '% target / -' + strategy.stop + '% stop / ' + strategy.hold + ' day timeout',
      marketCondition: {
        regime: marketState.regime,
        phase: marketState.phase,
        sentiment: marketState.sentiment,
        volatility: marketState.volatility
      },
      params: {
        targetPct: strategy.target,
        stopPct: strategy.stop,
        maxHoldDays: strategy.hold
      }
    };
  }

  getEntryDescription(engineType) {
    const descriptions = {
      'grid-trading': 'Price within range, place limit orders at 0.5% intervals',
      'momentum': 'EMA(12) cross above EMA(26) AND price > EMA(50)',
      'smart-btc': '4 consecutive red days OR RSI(30) < 30',
      'breakout': 'Bollinger squeeze (<2%) + volume spike (>1.5x)',
      'mean-reversion': '3 consecutive red days AND RSI(14) < 35'
    };
    return descriptions[engineType] || 'Adaptive entry based on market conditions';
  }

  writeEngineFiles(enginePath, config) {
    if (!fs.existsSync(enginePath)) fs.mkdirSync(enginePath, { recursive: true });
    
    fs.writeFileSync(path.join(enginePath, 'manifest.json'), JSON.stringify(config, null, 2));
    
    const strategyJs = 'module.exports = { name: "' + config.name + '", version: "1.0.0", validate: () => true, entryRules: { type: "adaptive" }, exitRules: { targetPct: ' + config.params.targetPct + ', stopPct: ' + config.params.stopPct + ', maxHoldDays: ' + config.params.maxHoldDays + ' }, entryTiming: "next_open", params: { targetPct: ' + config.params.targetPct + ', stopPct: ' + config.params.stopPct + ', maxHoldDays: ' + config.params.maxHoldDays + ' } };';
    fs.writeFileSync(path.join(enginePath, 'strategy.js'), strategyJs);
    
    const monitorJs = 'const Engine = require("./engine"); const engine = new Engine(); engine.start({ id: "' + config.id + '", mode: "dry_run", capital: ' + config.capital + ' }).catch(console.error); process.on("SIGINT", () => engine.stop()); process.on("SIGTERM", () => engine.stop());';
    fs.writeFileSync(path.join(enginePath, 'monitor.js'), monitorJs);
    
    const engineJs = 'const initSqlJs = require("sql.js"); const fs = require("fs"); const path = require("path"); const DB_PATH = path.join(process.env.HOME, "kraken-intelligence/data/intelligence.db"); class Engine { constructor() { this.id = null; this.mode = null; this.capital = 0; this.position = null; this.params = { targetPct: ' + config.params.targetPct + ', stopPct: ' + config.params.stopPct + ', maxHoldDays: ' + config.params.maxHoldDays + ' }; } async start(config) { this.id = config.id; this.mode = config.mode; this.capital = config.capital; console.log("Started " + this.id + " in " + this.mode + " mode with $" + this.capital); this.monitor(); } async monitor() { setInterval(() => {}, 60000); } stop() { console.log("Stopped " + this.id); } } module.exports = Engine;';
    fs.writeFileSync(path.join(enginePath, 'engine.js'), engineJs);
    
    console.log('Engine created: ' + enginePath);
  }

  async assignEngine() {
    const marketState = this.getCurrentMarketState();
    if (!marketState) return;

    const strategy = this.getStrategyForMarket(marketState);
    const engineName = strategy.engine + '-' + new Date().toISOString().slice(0, 10);
    const enginePath = path.join(this.dryRunDir, engineName);
    
    const state = this.loadState();
    
    const currentRegime = state.currentEngine ? state.currentEngine.regime : null;
    if (currentRegime !== marketState.regime) {
      console.log('\nMarket regime changed: ' + currentRegime + ' -> ' + marketState.regime);
      console.log('Assigning new engine: ' + strategy.engine);
      
      if (state.currentEngine && state.currentEngine.pm2Name) {
        try {
          execSync('pm2 stop ' + state.currentEngine.pm2Name + ' 2>/dev/null', { stdio: 'pipe' });
          console.log('Stopped previous engine: ' + state.currentEngine.name);
        } catch (err) {}
      }
      
      const engineConfig = this.createEngineConfig(engineName, strategy, marketState);
      this.writeEngineFiles(enginePath, engineConfig);
      
      try {
        execSync('cd ' + enginePath + ' && npm init -y > /dev/null 2>&1 && npm install sql.js > /dev/null 2>&1', { stdio: 'pipe' });
        execSync('pm2 start ' + enginePath + '/monitor.js --name ' + engineName + '-dry', { stdio: 'pipe' });
        console.log('Started dry run: ' + engineName + '-dry');
      } catch (err) {
        console.error('Failed to start engine:', err.message);
      }
      
      state.currentEngine = {
        name: engineName,
        pm2Name: engineName + '-dry',
        type: strategy.engine,
        regime: marketState.regime,
        phase: marketState.phase,
        sentiment: marketState.sentiment,
        target: strategy.target,
        stop: strategy.stop,
        hold: strategy.hold,
        capital: strategy.capital,
        startDate: new Date().toISOString(),
        dryRunDays: 0,
        status: 'dry_run'
      };
      
      state.engineHistory.push({ ...state.currentEngine, endDate: null });
      state.dryRunStartDate = new Date().toISOString();
      state.dryRunDays = 0;
      state.status = 'dry_run';
      
      this.saveState(state);
    }
  }

  updateDryRunDays() {
    const state = this.loadState();
    if (!state.currentEngine || state.status !== 'dry_run') return;
    
    const startDate = new Date(state.dryRunStartDate);
    const now = new Date();
    const days = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    
    if (days !== state.dryRunDays) {
      state.dryRunDays = days;
      this.saveState(state);
      console.log('Dry run day ' + days + '/' + this.requiredDryRunDays + ' for ' + state.currentEngine.name);
      
      if (days >= this.requiredDryRunDays && state.status === 'dry_run') {
        state.status = 'ready_for_live';
        this.saveState(state);
        console.log('\n DRY RUN COMPLETED for ' + state.currentEngine.name);
        console.log(' Engine ready for live deployment');
      }
    }
  }

  printStatus() {
    const state = this.loadState();
    console.log('\n' + '='.repeat(70));
    console.log('ADAPTIVE ALLOCATOR STATUS');
    console.log('='.repeat(70));
    
    if (state.currentEngine) {
      const progress = Math.floor((state.dryRunDays / this.requiredDryRunDays) * 100);
      console.log('\n  Current Engine: ' + state.currentEngine.name);
      console.log('  Type: ' + state.currentEngine.type);
      console.log('  Market Regime: ' + state.currentEngine.regime);
      console.log('  Dry Run Progress: ' + progress + '% (' + state.dryRunDays + '/' + this.requiredDryRunDays + ' days)');
      console.log('  Status: ' + state.status.toUpperCase());
      console.log('  Parameters: Target ' + state.currentEngine.target + '% | Stop ' + state.currentEngine.stop + '% | Hold ' + state.currentEngine.hold + 'd');
    } else {
      console.log('\n  No engine currently assigned');
    }
    
    console.log('\n  Engine History: ' + state.engineHistory.length + ' engines');
    console.log('='.repeat(70));
  }

  async run() {
    console.log('\nADAPTIVE ENGINE ALLOCATOR');
    console.log('-'.repeat(50));
    await this.assignEngine();
    this.updateDryRunDays();
    this.printStatus();
  }
}

module.exports = AdaptiveAllocator;
