const crypto = require('crypto');

class Mutator {
  constructor() {
    this.id = `Mutator_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  mutate(parentStrategy = null) {
    let strategy;
    if (parentStrategy) {
      strategy = JSON.parse(JSON.stringify(parentStrategy));
    } else {
      strategy = this.createBaseStrategy();
    }
    
    // Generate new ID
    const newId = `AUTO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    strategy.scp_id = newId;
    strategy.name = `AutoGen_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
    strategy.lineage = strategy.lineage || {};
    strategy.lineage.parent = parentStrategy?.scp_id || null;
    strategy.lineage.generation = (parentStrategy?.lineage?.generation || 0) + 1;
    strategy.lineage.mutated_by = this.id;
    strategy.created_at = new Date().toISOString();
    
    // Apply a random mutation
    this.applyMutation(strategy);
    
    return strategy;
  }
  
  createBaseStrategy() {
    return {
      scp_id: "BASE",
      name: "Base Strategy",
      object_class: "Safe",
      asset: "BTC/USD",
      timeframe: "1h",
      active_regimes: ["any"],
      containment_procedures: {
        max_drawdown_pct: 5,
        daily_loss_limit_pct: 1,
        active_hours_utc: [],
        on_breach: "move_to_contained",
        human_review_required: false,
        keter_votes_required: 0
      },
      conditions: {
        entry: {
          all: [
            { indicator: "rsi", period: 14, operator: "<", value: 30 }
          ],
          any: []
        },
        exit: {
          any: [
            { indicator: "rsi", operator: ">", value: 65 },
            { indicator: "trailing_stop", percent: 1.5 }
          ]
        }
      },
      risk: {
        position_size: "0.01",
        max_spread_percent: 0.1,
        leverage: 1
      },
      lineage: {
        parent: null,
        generation: 0,
        mutations: []
      }
    };
  }
  
  applyMutation(strategy) {
    const mutationTypes = [
      this.mutateRSIThreshold,
      this.mutateDrawdown,
      this.mutatePositionSize,
      this.mutateExitRSI,
      this.mutateTimeframe,
      this.mutateAsset
    ];
    const mutation = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
    const oldValue = mutation.call(this, strategy);
    const newValue = this.getCurrentValue(strategy, mutation.name);
    
    strategy.lineage.mutations.push({
      timestamp: new Date().toISOString(),
      type: mutation.name,
      oldValue: oldValue,
      newValue: newValue
    });
    
    // Update object class based on risk
    this.updateObjectClass(strategy);
  }
  
  mutateRSIThreshold(strategy) {
    const old = strategy.conditions.entry.all[0].value;
    strategy.conditions.entry.all[0].value = Math.min(70, Math.max(20, old + (Math.random() - 0.5) * 10));
    return old;
  }
  
  mutateDrawdown(strategy) {
    const old = strategy.containment_procedures.max_drawdown_pct;
    strategy.containment_procedures.max_drawdown_pct = Math.min(20, Math.max(2, old + (Math.random() - 0.5) * 3));
    return old;
  }
  
  mutatePositionSize(strategy) {
    const sizes = ["0.005", "0.01", "0.015", "0.02", "0.025", "0.03"];
    const old = strategy.risk.position_size;
    let newSize = sizes[Math.floor(Math.random() * sizes.length)];
    while (newSize === old) newSize = sizes[Math.floor(Math.random() * sizes.length)];
    strategy.risk.position_size = newSize;
    return old;
  }
  
  mutateExitRSI(strategy) {
    const old = strategy.conditions.exit.any[0].value;
    strategy.conditions.exit.any[0].value = Math.min(85, Math.max(50, old + (Math.random() - 0.5) * 10));
    return old;
  }
  
  mutateTimeframe(strategy) {
    const timeframes = ["15m", "1h", "4h", "1d"];
    const old = strategy.timeframe;
    let newTf = timeframes[Math.floor(Math.random() * timeframes.length)];
    while (newTf === old) newTf = timeframes[Math.floor(Math.random() * timeframes.length)];
    strategy.timeframe = newTf;
    return old;
  }
  
  mutateAsset(strategy) {
    const assets = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "LINK/USD"];
    const old = strategy.asset;
    let newAsset = assets[Math.floor(Math.random() * assets.length)];
    while (newAsset === old) newAsset = assets[Math.floor(Math.random() * assets.length)];
    strategy.asset = newAsset;
    return old;
  }
  
  getCurrentValue(strategy, mutationName) {
    switch(mutationName) {
      case 'mutateRSIThreshold': return strategy.conditions.entry.all[0].value;
      case 'mutateDrawdown': return strategy.containment_procedures.max_drawdown_pct;
      case 'mutatePositionSize': return strategy.risk.position_size;
      case 'mutateExitRSI': return strategy.conditions.exit.any[0].value;
      case 'mutateTimeframe': return strategy.timeframe;
      case 'mutateAsset': return strategy.asset;
      default: return 'unknown';
    }
  }
  
  updateObjectClass(strategy) {
    const risk = parseFloat(strategy.risk.position_size);
    const drawdown = strategy.containment_procedures.max_drawdown_pct;
    
    if (risk > 0.02 || drawdown > 10) {
      strategy.object_class = "Keter";
    } else if (risk > 0.015 || drawdown > 7) {
      strategy.object_class = "Euclid";
    } else {
      strategy.object_class = "Safe";
    }
  }
}

module.exports = { Mutator };
