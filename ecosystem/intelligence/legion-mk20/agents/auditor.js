const { BaseAgent } = require('./base_agent');
const { Backtester } = require('./backtester');
const fs = require('fs');
const path = require('path');

class Auditor extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.validationDir = this.test_dir || "./data/tests";
    this.autoCorrect = this.auto_correct !== false;
    this.minPassScore = this.min_pass_score || 70;
    this.validationQueue = [];
    this.interval = null;
    this.strategyDir = "./data/strategies";
    this.backtester = null;
  }
  
  async start() {
    await super.start();
    console.log('[Auditor] Starting validation system with 80/20 weighting...');
    this.backtester = new Backtester({}, this.engine);
    await this.backtester.start();
    this.ensureTestDir();
    this.startValidationCycle();
    console.log('[Auditor] Active. 80% backtest / 20% validation weighting');
    return true;
  }
  
  ensureTestDir() {
    if (!fs.existsSync(this.validationDir)) {
      fs.mkdirSync(this.validationDir, { recursive: true });
    }
  }
  
  startValidationCycle() {
    this.interval = setInterval(() => this.validateNewStrategies(), 30000);
    setTimeout(() => this.validateNewStrategies(), 5000);
  }
  
  async validateNewStrategies() {
    const strategies = this.loadUnvalidatedStrategies();
    if (strategies.length === 0) return;
    
    console.log(`[Auditor] Validating ${strategies.length} new strategies...`);
    
    for (const strategy of strategies) {
      const result = await this.validateStrategy(strategy);
      this.recordValidation(strategy, result);
      
      if (result.passed) {
        console.log(`[Auditor] ✅ Strategy ${strategy.scp_id} PASSED (Score: ${result.score})`);
        this.notifyTournament(strategy, result);
      } else {
        console.log(`[Auditor] ❌ Strategy ${strategy.scp_id} FAILED: ${result.reason}`);
        if (this.autoCorrect) {
          this.attemptAutoCorrect(strategy, result);
        }
      }
    }
  }
  
  loadUnvalidatedStrategies() {
    if (!fs.existsSync(this.strategyDir)) return [];
    
    const validationLog = this.loadValidationLog();
    const files = fs.readdirSync(this.strategyDir).filter(f => f.endsWith('.json'));
    
    return files.map(file => {
      try {
        const strategy = JSON.parse(fs.readFileSync(path.join(this.strategyDir, file), 'utf8'));
        const alreadyValidated = validationLog.some(log => log.scp_id === strategy.scp_id);
        if (!alreadyValidated && !strategy.scp_id.startsWith('BASE')) {
          return strategy;
        }
        return null;
      } catch(e) { return null; }
    }).filter(s => s);
  }
  
  loadValidationLog() {
    const logFile = path.join(this.validationDir, 'validation_log.json');
    try {
      if (fs.existsSync(logFile)) {
        return JSON.parse(fs.readFileSync(logFile, 'utf8'));
      }
    } catch(e) {}
    return [];
  }
  
  async validateStrategy(strategy) {
    // PART 1: BACKTEST (80% of score)
    console.log(`[Auditor] Running backtest for ${strategy.scp_id}...`);
    const backtestMetrics = await this.backtester.backtestStrategy(strategy);
    const backtestScore = backtestMetrics.backtest_score;
    
    // PART 2: STATIC VALIDATION (20% of score)
    let validationScore = 0;
    const issues = [];
    
    // Check conditions structure
    if (strategy.conditions && strategy.conditions.entry) validationScore += 4;
    else issues.push('Missing conditions');
    
    // Check containment procedures
    if (strategy.containment_procedures?.max_drawdown_pct) {
      const drawdown = strategy.containment_procedures.max_drawdown_pct;
      if (drawdown <= 5) validationScore += 4;
      else if (drawdown <= 10) validationScore += 2;
      else issues.push(`High drawdown: ${drawdown}%`);
    } else issues.push('Missing containment');
    
    // Check risk parameters
    if (strategy.risk?.position_size) {
      const posSize = parseFloat(strategy.risk.position_size);
      if (posSize <= 0.01) validationScore += 4;
      else if (posSize <= 0.02) validationScore += 2;
      else issues.push(`Large position: ${posSize}`);
    } else issues.push('Missing risk');
    
    // Check object class match
    const calculatedClass = this.calculateObjectClass(strategy);
    if (calculatedClass === strategy.object_class) validationScore += 4;
    else issues.push(`Class mismatch: expected ${calculatedClass}`);
    
    // Check lineage and metadata
    if (strategy.lineage) validationScore += 4;
    else issues.push('Missing lineage');
    
    // COMBINED SCORE: 80% backtest + 20% validation
    const finalScore = (backtestScore * 0.8) + (validationScore * 0.2);
    const passed = finalScore >= this.minPassScore;
    
    return {
      passed,
      score: finalScore,
      backtest_score: backtestScore,
      validation_score: validationScore,
      backtest_metrics: backtestMetrics,
      issues,
      reason: issues.join('; ') || (passed ? `Passed: ${finalScore.toFixed(1)}% (BT:${backtestScore.toFixed(1)}% + VAL:${validationScore}%)` : 'Failed')
    };
  }
  
  calculateObjectClass(strategy) {
    const risk = parseFloat(strategy.risk?.position_size || 0.01);
    const drawdown = strategy.containment_procedures?.max_drawdown_pct || 10;
    
    if (risk > 0.02 || drawdown > 10) return 'Keter';
    if (risk > 0.015 || drawdown > 7) return 'Euclid';
    return 'Safe';
  }
  
  recordValidation(strategy, result) {
    const logFile = path.join(this.validationDir, 'validation_log.json');
    const log = this.loadValidationLog();
    
    log.push({
      scp_id: strategy.scp_id,
      timestamp: new Date().toISOString(),
      passed: result.passed,
      score: result.score,
      backtest_score: result.backtest_score,
      validation_score: result.validation_score,
      backtest_metrics: result.backtest_metrics,
      issues: result.issues,
      class_assigned: strategy.object_class
    });
    
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  }
  
  attemptAutoCorrect(strategy, result) {
    console.log(`[Auditor] Attempting auto-correction for ${strategy.scp_id}...`);
    
    if (result.issues.some(i => i.includes('drawdown'))) {
      strategy.containment_procedures.max_drawdown_pct = 5;
    }
    if (result.issues.some(i => i.includes('position'))) {
      strategy.risk.position_size = "0.01";
    }
    
    const correctClass = this.calculateObjectClass(strategy);
    if (correctClass !== strategy.object_class) {
      strategy.object_class = correctClass;
    }
    
    const filepath = path.join(this.strategyDir, `${strategy.scp_id}_${strategy.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    fs.writeFileSync(filepath, JSON.stringify(strategy, null, 2));
    console.log(`[Auditor] Auto-corrected and saved ${strategy.scp_id}`);
  }
  
  notifyTournament(strategy, result) {
    console.log(`[Auditor] Notifying Tournament: ${strategy.scp_id} (Score: ${result.score.toFixed(1)}%)`);
  }
  
  stop() {
    if (this.interval) clearInterval(this.interval);
    super.stop();
  }
}

module.exports = { Auditor };
