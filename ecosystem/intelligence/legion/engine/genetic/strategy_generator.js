const fs = require('fs');
const path = require('path');
const { getCandles } = require('../../shared/kraken_adapter');
const { sendMessage } = require('../../bus/router');

class StrategyGenerator {
  constructor() {
    this.populationSize = 20;
    this.mutationRate = 0.2;
    this.crossoverRate = 0.7;
    this.generations = 10;
  }

  generateRandomStrategy() {
    const indicators = ['rsi', 'ema', 'sma', 'volume'];
    const operators = ['<', '>'];
    const periods = [7, 14, 21];
    
    const indicator = indicators[Math.floor(Math.random() * indicators.length)];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let value;
    if (indicator === 'rsi') value = 20 + Math.random() * 60;
    else if (indicator === 'volume') value = 1 + Math.random() * 3;
    else value = 50000 + Math.random() * 30000;
    
    const period = periods[Math.floor(Math.random() * periods.length)];
    
    return {
      scp_id: `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: 'Auto Generated',
      object_class: 'Euclid',
      asset: 'BTC/USD',
      timeframe: '1h',
      active_regimes: ['any'],
      containment_procedures: {
        max_drawdown_pct: 10,
        daily_loss_limit_pct: 5,
        on_breach: 'move_to_contained'
      },
      conditions: {
        entry: {
          all: [{
            indicator: indicator,
            period: period,
            operator: operator,
            value: value
          }]
        },
        exit: {
          any: [
            { indicator: 'trailing_stop', percent: 2 + Math.random() * 3 },
            { indicator: 'time_in_trade', max_hours: 48 }
          ]
        }
      },
      risk: {
        position_size: '0.01',
        max_spread_percent: 0.1,
        leverage: 1
      },
      fitness: 0
    };
  }

  calculateFitness(strategy, candles) {
    let balance = 10000;
    let inTrade = false;
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    let maxDrawdown = 0;
    let peak = 10000;
    
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    for (let i = 50; i < candles.length - 1; i++) {
      const price = candles[i].close;
      const rsi = this.calculateRSI(closes.slice(0, i+1), 14);
      const sma20 = this.calculateSMA(closes.slice(0, i+1), 20);
      const ema12 = this.calculateEMA(closes.slice(0, i+1), 12);
      
      let shouldBuy = false;
      const cond = strategy.conditions.entry.all[0];
      if (cond.indicator === 'rsi') {
        if (cond.operator === '<') shouldBuy = rsi < cond.value;
        else shouldBuy = rsi > cond.value;
      } else if (cond.indicator === 'ema') {
        if (cond.operator === '<') shouldBuy = price < cond.value;
        else shouldBuy = price > cond.value;
      } else if (cond.indicator === 'sma') {
        if (cond.operator === '<') shouldBuy = price < sma20;
        else shouldBuy = price > sma20;
      } else if (cond.indicator === 'volume') {
        const avgVolume = this.calculateSMA(volumes.slice(0, i+1), 20);
        if (cond.operator === '<') shouldBuy = volumes[i] < avgVolume * cond.value;
        else shouldBuy = volumes[i] > avgVolume * cond.value;
      }
      
      if (!inTrade && shouldBuy) {
        inTrade = true;
        entryPrice = price;
      } else if (inTrade) {
        let shouldSell = false;
        for (const exitCond of strategy.conditions.exit.any) {
          if (exitCond.indicator === 'trailing_stop') {
            const pnl = (price - entryPrice) / entryPrice;
            if (pnl <= -exitCond.percent / 100) shouldSell = true;
          }
        }
        const pnl = (price - entryPrice) / entryPrice;
        if (pnl >= 0.05) shouldSell = true;
        
        if (shouldSell || i === candles.length - 2) {
          const tradePnl = (price - entryPrice) / entryPrice;
          balance *= (1 + tradePnl);
          trades++;
          if (tradePnl > 0) wins++;
          inTrade = false;
          
          if (balance > peak) peak = balance;
          const drawdown = (peak - balance) / peak;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
      }
    }
    
    const winRate = trades > 0 ? wins / trades : 0;
    const totalReturn = (balance - 10000) / 10000;
    let fitness = totalReturn * 0.5 + winRate * 0.3 - maxDrawdown * 0.2;
    if (totalReturn <= 0) fitness *= 0.5;
    strategy.fitness = Math.max(0, fitness);
    return strategy.fitness;
  }

  calculateRSI(prices, period) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      if (change >= 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateSMA(values, period) {
    if (values.length < period) return values[values.length-1];
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  calculateEMA(values, period) {
    if (values.length < period) return values[values.length-1];
    const k = 2 / (period + 1);
    let ema = this.calculateSMA(values.slice(0, period), period);
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  crossover(parent1, parent2) {
    const child = this.generateRandomStrategy();
    if (Math.random() < this.crossoverRate) {
      child.conditions.entry.all = parent1.conditions.entry.all;
      child.conditions.exit.any = parent2.conditions.exit.any;
    } else {
      child.conditions.entry.all = parent2.conditions.entry.all;
      child.conditions.exit.any = parent1.conditions.exit.any;
    }
    return child;
  }

  mutate(strategy) {
    if (Math.random() < this.mutationRate) {
      const cond = strategy.conditions.entry.all[0];
      if (Math.random() < 0.5) {
        cond.operator = cond.operator === '<' ? '>' : '<';
      } else {
        if (cond.indicator === 'rsi') {
          cond.value = Math.max(10, Math.min(90, cond.value + (Math.random() - 0.5) * 20));
        } else if (cond.indicator === 'volume') {
          cond.value = Math.max(1, cond.value + (Math.random() - 0.5) * 2);
        } else {
          cond.value = Math.max(30000, Math.min(120000, cond.value + (Math.random() - 0.5) * 10000));
        }
      }
    }
    return strategy;
  }

  async evolve() {
    console.log('[Genetic] Starting evolution...');
    const candles = getCandles('BTC/USD', 500);
    if (!candles || candles.length < 200) {
      console.log('[Genetic] Insufficient candle data');
      return null;
    }
    
    let population = [];
    for (let i = 0; i < this.populationSize; i++) {
      population.push(this.generateRandomStrategy());
    }
    
    let globalBest = null;
    let globalBestFitness = -1;
    
    for (let gen = 0; gen < this.generations; gen++) {
      // Evaluate fitness
      for (let i = 0; i < population.length; i++) {
        this.calculateFitness(population[i], candles);
        if (population[i].fitness > globalBestFitness) {
          globalBestFitness = population[i].fitness;
          globalBest = JSON.parse(JSON.stringify(population[i]));
        }
      }
      
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);
      
      // Keep top 20% as elite
      const eliteCount = Math.max(1, Math.floor(this.populationSize * 0.2));
      const elite = population.slice(0, eliteCount);
      
      // Generate new population
      const newPopulation = [...elite];
      while (newPopulation.length < this.populationSize) {
        const parent1 = elite[Math.floor(Math.random() * elite.length)];
        const parent2 = elite[Math.floor(Math.random() * elite.length)];
        let child = this.crossover(parent1, parent2);
        child = this.mutate(child);
        newPopulation.push(child);
      }
      
      population = newPopulation;
      const bestFitness = population[0].fitness;
      console.log(`[Genetic] Generation ${gen + 1}: Best fitness = ${bestFitness.toFixed(4)} (global best: ${globalBestFitness.toFixed(4)})`);
      if (bestFitness > 0) {
        console.log(`   Best: ${population[0].conditions.entry.all[0].indicator} ${population[0].conditions.entry.all[0].operator} ${population[0].conditions.entry.all[0].value.toFixed(2)}`);
      }
    }
    
    const best = globalBest || population[0];
    console.log(`[Genetic] Best strategy: ${best.conditions.entry.all[0].indicator} ${best.conditions.entry.all[0].operator} ${best.conditions.entry.all[0].value.toFixed(2)} with fitness ${best.fitness.toFixed(4)}`);
    return best;
  }

  async saveBestStrategy() {
    const best = await this.evolve();
    if (best && best.fitness > 0) {
      const filename = `AUTO_${Date.now()}.json`;
      const filepath = path.join(__dirname, '../../strategies/active', filename);
      fs.writeFileSync(filepath, JSON.stringify(best, null, 2));
      console.log(`[Genetic] Saved best strategy to ${filename}`);
      
      // Send message to Forge Lord to reload
      sendMessage('forge_lord', 'NEW_STRATEGY', {
        strategyPath: filepath,
        strategyId: best.scp_id
      });
      console.log(`[Genetic] Notified Forge Lord of new strategy: ${best.scp_id}`);
      return filename;
    } else {
      console.log('[Genetic] No profitable strategy found, not saving');
      return null;
    }
  }
}

module.exports = { StrategyGenerator };
