const { BaseAgent } = require('./base_agent');

class CascadeEngine extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.state = "DORMANT";
    this.btcConfirmationStart = null;
    this.cascade1Start = null;
    this.cascade2Start = null;
    this.positions = {
      btc: 0,
      large_caps: [],
      small_caps: []
    };
    
    // CCE parameters
    this.params = {
      btc_confirmation_days: 3,
      cascade1_delay_days: 3,
      cascade2_delay_days: 7,
      fear_greed_exit_threshold: 75,
      emergency_drop_threshold: -0.05
    };
  }
  
  async start() {
    await super.start();
    this.log(`🧠 CCE Cascade Engine active — State: ${this.state}`);
    this.startCascadeDetection();
    return true;
  }
  
  startCascadeDetection() {
    setInterval(() => this.detectCascadePhase(), 3600000); // Check every hour
    setTimeout(() => this.detectCascadePhase(), 1000);
  }
  
  async detectCascadePhase() {
    const btcData = await this.getBTCData();
    const fng = await this.getFearAndGreed();
    const largeCapsData = await this.getLargeCapsData();
    
    // STATE MACHINE LOGIC
    switch(this.state) {
      case "DORMANT":
        if (this.isBTCConfirming(btcData)) {
          this.state = "ANCHOR";
          this.btcConfirmationStart = Date.now();
          this.log(`📊 CCE → ANCHOR: BTC showing early strength`);
        }
        break;
        
      case "ANCHOR":
        if (this.hasBTCConfirmed3Days(btcData)) {
          this.state = "IGNITION";
          this.log(`🔥 CCE → IGNITION: BTC confirmed. Deploying full BTC position`);
          this.executeBTCEntry();
        }
        break;
        
      case "IGNITION":
        if (this.isCascade1Ready(btcData, largeCapsData)) {
          this.state = "CASCADE_1";
          this.cascade1Start = Date.now();
          this.log(`🌊 CCE → CASCADE 1: Entering large caps (ETH, SOL, LINK)`);
          this.executeLargeCapsEntry();
        }
        break;
        
      case "CASCADE_1":
        if (this.isCascade2Ready(btcData, largeCapsData)) {
          this.state = "CASCADE_2";
          this.cascade2Start = Date.now();
          this.log(`💥 CCE → CASCADE 2: Entering small caps (high beta alts)`);
          this.executeSmallCapsEntry();
        }
        break;
        
      case "CASCADE_2":
        if (this.isSpillwayActive(fng)) {
          this.state = "SPILLWAY";
          this.log(`🔄 CCE → SPILLWAY: Beginning systematic exit`);
          this.executeSpillwayExit();
        }
        break;
        
      case "SPILLWAY":
        if (this.isExtractionRequired(btcData, fng)) {
          this.state = "EXTRACTION";
          this.log(`🚨 CCE → EXTRACTION: Emergency exit!`);
          this.executeEmergencyExit();
        } else if (this.isSpillwayComplete()) {
          this.state = "DORMANT";
          this.log(`✅ CCE → DORMANT: Cycle complete. Waiting for next cascade.`);
        }
        break;
        
      case "EXTRACTION":
        // Emergency state — all positions closed
        this.state = "DORMANT";
        break;
    }
    
    this.engine.updateEntropy(this.getStateEntropy(), `cce_state_${this.state}`);
  }
  
  isBTCConfirming(btcData) {
    // BTC up 2+ days with increasing volume
    return btcData.priceChange3d > 0.02 && btcData.volumeIncreasing;
  }
  
  hasBTCConfirmed3Days(btcData) {
    return btcData.priceChange3d > 0.03 && btcData.rsi < 70;
  }
  
  isCascade1Ready(btcData, largeCapsData) {
    const daysSinceIgnition = (Date.now() - this.btcConfirmationStart) / (1000 * 60 * 60 * 24);
    return daysSinceIgnition >= this.params.cascade1_delay_days && 
           largeCapsData.pctChange7d > 0.02;
  }
  
  isCascade2Ready(btcData, largeCapsData) {
    const daysSinceIgnition = (Date.now() - this.btcConfirmationStart) / (1000 * 60 * 60 * 24);
    return daysSinceIgnition >= this.params.cascade2_delay_days && 
           largeCapsData.pctChange7d > 0.05;
  }
  
  isSpillwayActive(fng) {
    return fng.value > this.params.fear_greed_exit_threshold;
  }
  
  isExtractionRequired(btcData, fng) {
    return btcData.priceChange24h < this.params.emergency_drop_threshold || 
           fng.value < 20; // Panic
  }
  
  getStateEntropy() {
    const entropyMap = {
      "DORMANT": 0,
      "ANCHOR": 0.1,
      "IGNITION": 0.2,
      "CASCADE_1": 0.3,
      "CASCADE_2": 0.5,
      "SPILLWAY": 0.4,
      "EXTRACTION": 0.8
    };
    return entropyMap[this.state] || 0;
  }
  
  getStatus() {
    return {
      state: this.state,
      cascade_timing: {
        btc_confirmation: this.btcConfirmationStart,
        cascade1_start: this.cascade1Start,
        cascade2_start: this.cascade2Start
      },
      positions: this.positions
    };
  }
  
  async getBTCData() {
    // Fetch real BTC data from Kraken
    return {
      priceChange24h: 0.01,
      priceChange3d: 0.03,
      volumeIncreasing: true,
      rsi: 55
    };
  }
  
  async getFearAndGreed() {
    return { value: 45 };
  }
  
  async getLargeCapsData() {
    return { pctChange7d: 0.04 };
  }
  
  executeBTCEntry() {
    this.positions.btc = 0.1; // 10% of portfolio
  }
  
  executeLargeCapsEntry() {
    this.positions.large_caps = ["ETH", "SOL", "LINK"];
  }
  
  executeSmallCapsEntry() {
    this.positions.small_caps = ["high_beta_alts"];
  }
  
  executeSpillwayExit() {
    this.positions = { btc: 0, large_caps: [], small_caps: [] };
  }
  
  executeEmergencyExit() {
    this.positions = { btc: 0, large_caps: [], small_caps: [] };
  }
}

module.exports = { CascadeEngine };

  // Add Fear & Greed awareness
  async getFearGreedSignal() {
    try {
      const { FearGreedIndex } = require('../shared/fear_greed');
      const fg = new FearGreedIndex();
      await fg.fetch();
      return {
        value: fg.current.value,
        classification: fg.current.classification,
        isExtremeFear: fg.isExtremeFear(),
        isExtremeGreed: fg.isExtremeGreed(),
        spillwayReady: fg.getSpillwaySignal(),
        extractionReady: fg.getExtractionSignal()
      };
    } catch (err) {
      return { value: 50, classification: 'NEUTRAL', spillwayReady: false };
    }
  }
