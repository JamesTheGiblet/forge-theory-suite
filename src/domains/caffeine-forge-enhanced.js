// domains/health-medicine/caffeine-forge/index.js
import ForgeCalculator from '../core/ForgeCalculator.js';
import Registry from '../core/domain-registry.json';

/**
 * CaffeineForge - Pharmacokinetic caffeine metabolism modeling
 * 
 * Models caffeine elimination using one-compartment pharmacokinetics.
 * Based on first-order kinetics with typical half-life of 5 hours.
 * 
 * Mathematical Model:
 *   C(t) = (Dose / Vd) × e^(-k×t)
 * 
 * Where:
 *   - C(t): Blood concentration at time t (mg/L)
 *   - Dose: Caffeine consumed (mg)
 *   - Vd: Volume of distribution (≈0.6 L/kg body weight)
 *   - k: Elimination rate constant (≈0.139 h⁻¹)
 *   - t: Time elapsed (hours)
 * 
 * @class CaffeineForge
 * @extends ForgeCalculator
 */
export class CaffeineForge {
  constructor(userConfig = {}) {
    // Load default configuration from registry
    this.config = Registry.domains['caffeine-forge'];
    
    // Pharmacokinetic constants
    this.CONSTANTS = {
      // Standard caffeine elimination half-life (hours)
      HALF_LIFE_TYPICAL: 5.0,          // Average adult
      HALF_LIFE_MIN: 2.0,              // Fast metabolizers
      HALF_LIFE_MAX: 10.0,             // Slow metabolizers
      
      // Elimination rate constants (hour⁻¹)
      RATE_TYPICAL: 0.1386,            // ln(2) / 5 hours
      RATE_FAST: 0.3466,               // ln(2) / 2 hours
      RATE_SLOW: 0.0693,               // ln(2) / 10 hours
      
      // Volume of distribution (L/kg)
      VD_PER_KG: 0.6,                  // Distributes throughout body water
      
      // Sensitivity thresholds (mg blood concentration)
      THRESHOLD_ALERT: 50,             // Noticeable effects begin
      THRESHOLD_JITTERY: 150,          // Anxiety/jitters common
      THRESHOLD_SLEEP: 10,             // Can fall asleep below this
      THRESHOLD_BASELINE: 1,           // Effectively zero
      
      // Common caffeine sources (mg per serving)
      SOURCES: {
        espresso: 64,                  // Single shot (30ml)
        coffee: 95,                    // 8oz cup
        tea_black: 47,                 // 8oz cup
        tea_green: 28,                 // 8oz cup
        energy_drink: 80,              // 8oz can
        cola: 34,                      // 12oz can
        dark_chocolate: 12,            // 1oz (28g)
      }
    };
    
    // Initialize state with defaults
    this.state = {
      ...this.config.defaults,
      bodyWeight: 70,                  // kg (default)
      metabolismRate: 'typical',       // 'fast', 'typical', 'slow'
      caffeineHistory: [],             // Array of dose events
      currentLevel: 0,                 // Current blood level (mg)
      ...userConfig
    };
    
    // Calculate rate constant based on metabolism type
    this.updateRateConstant();
    
    // Calculate volume of distribution
    this.volumeDistribution = this.state.bodyWeight * this.CONSTANTS.VD_PER_KG;
  }
  
  /**
   * Update rate constant based on user's metabolism type
   * @private
   */
  updateRateConstant() {
    switch (this.state.metabolismRate) {
      case 'fast':
        this.state.rateConstant = this.CONSTANTS.RATE_FAST;
        this.state.halfLife = this.CONSTANTS.HALF_LIFE_MIN;
        break;
      case 'slow':
        this.state.rateConstant = this.CONSTANTS.RATE_SLOW;
        this.state.halfLife = this.CONSTANTS.HALF_LIFE_MAX;
        break;
      case 'typical':
      default:
        this.state.rateConstant = this.CONSTANTS.RATE_TYPICAL;
        this.state.halfLife = this.CONSTANTS.HALF_LIFE_TYPICAL;
    }
  }
  
  /**
   * Add a caffeine dose event
   * @param {number} dose - Amount of caffeine in mg
   * @param {Date|number} time - Time of consumption (Date object or timestamp)
   * @param {string} source - Source description (e.g., "coffee", "espresso")
   */
  addDose(dose, time = new Date(), source = 'unknown') {
    const event = {
      dose,
      time: time instanceof Date ? time : new Date(time),
      source,
      timestamp: Date.now()
    };
    
    this.state.caffeineHistory.push(event);
    return event;
  }
  
  /**
   * Add dose by source name (e.g., "coffee", "espresso")
   * @param {string} source - Source name from CONSTANTS.SOURCES
   * @param {number} servings - Number of servings (default: 1)
   * @param {Date} time - Time of consumption
   */
  addBySource(source, servings = 1, time = new Date()) {
    const dosePerServing = this.CONSTANTS.SOURCES[source];
    if (!dosePerServing) {
      throw new Error(`Unknown caffeine source: ${source}`);
    }
    
    const totalDose = dosePerServing * servings;
    return this.addDose(totalDose, time, source);
  }
  
  /**
   * Calculate current blood concentration from all doses in history
   * @param {Date|number} currentTime - Current time (default: now)
   * @returns {number} Blood concentration in mg
   */
  getCurrentLevel(currentTime = new Date()) {
    const now = currentTime instanceof Date ? currentTime : new Date(currentTime);
    let totalLevel = 0;
    
    for (const event of this.state.caffeineHistory) {
      const hoursElapsed = (now - event.time) / (1000 * 60 * 60);
      
      // Only count doses from the past (not future)
      if (hoursElapsed >= 0) {
        // Calculate initial blood concentration for this dose
        const initialConcentration = event.dose / this.volumeDistribution;
        
        // Calculate remaining concentration after time elapsed
        const remaining = ForgeCalculator.calculate(
          initialConcentration,
          this.state.rateConstant,
          hoursElapsed
        );
        
        totalLevel += remaining;
      }
    }
    
    this.state.currentLevel = totalLevel;
    return totalLevel;
  }
  
  /**
   * Simulate blood level after a single dose
   * @param {number} dose - Caffeine amount (mg)
   * @param {number} hoursElapsed - Time since consumption
   * @returns {number} Blood concentration (mg)
   */
  getBloodLevel(dose, hoursElapsed) {
    const initialConcentration = dose / this.volumeDistribution;
    return ForgeCalculator.calculate(
      initialConcentration,
      this.state.rateConstant,
      hoursElapsed
    );
  }
  
  /**
   * Calculate when caffeine will drop below sleep threshold
   * @param {number} sleepThreshold - Threshold in mg (default: 10mg)
   * @param {Date} fromTime - Starting time (default: now)
   * @returns {Object} { hours, sleepTime, canSleepNow }
   */
  getTimeUntilSleep(sleepThreshold = null, fromTime = new Date()) {
    const threshold = sleepThreshold || this.CONSTANTS.THRESHOLD_SLEEP;
    const currentLevel = this.getCurrentLevel(fromTime);
    
    // Already below threshold
    if (currentLevel <= threshold) {
      return {
        hours: 0,
        sleepTime: fromTime,
        canSleepNow: true,
        currentLevel
      };
    }
    
    // Calculate time to reach threshold
    const hours = ForgeCalculator.timeToReach(
      currentLevel,
      threshold,
      this.state.rateConstant
    );
    
    const sleepTime = new Date(fromTime.getTime() + hours * 60 * 60 * 1000);
    
    return {
      hours,
      sleepTime,
      canSleepNow: false,
      currentLevel
    };
  }
  
  /**
   * Get current physiological state based on caffeine level
   * @param {Date} time - Time to check (default: now)
   * @returns {Object} State information
   */
  getPhysiologicalState(time = new Date()) {
    const level = this.getCurrentLevel(time);
    
    let state = 'baseline';
    let description = 'No significant caffeine effects';
    
    if (level >= this.CONSTANTS.THRESHOLD_JITTERY) {
      state = 'jittery';
      description = 'High caffeine - anxiety, jitters, rapid heartbeat likely';
    } else if (level >= this.CONSTANTS.THRESHOLD_ALERT) {
      state = 'alert';
      description = 'Moderate caffeine - increased alertness and focus';
    } else if (level >= this.CONSTANTS.THRESHOLD_SLEEP) {
      state = 'mild';
      description = 'Low caffeine - mild stimulation, may affect sleep';
    } else if (level >= this.CONSTANTS.THRESHOLD_BASELINE) {
      state = 'minimal';
      description = 'Trace caffeine - negligible effects';
    }
    
    return {
      level,
      state,
      description,
      percentOfPeak: this.getPercentOfPeak(level)
    };
  }
  
  /**
   * Calculate percentage of user's typical peak level
   * @private
   * @param {number} currentLevel - Current blood level
   * @returns {number} Percentage (0-100)
   */
  getPercentOfPeak(currentLevel) {
    // Typical peak from 2 cups of coffee (~200mg)
    const typicalPeak = 200 / this.volumeDistribution;
    return Math.min(100, (currentLevel / typicalPeak) * 100);
  }
  
  /**
   * Generate decay curve data for visualization
   * @param {number} dose - Initial dose (mg)
   * @param {number} duration - Duration in hours (default: 24)
   * @param {number} steps - Number of data points (default: 100)
   * @returns {Array} Array of {time, level, percent} objects
   */
  generateDecayCurve(dose = null, duration = 24, steps = 100) {
    const initialDose = dose || this.state.initialValue || 100;
    const initialLevel = initialDose / this.volumeDistribution;
    
    const curve = [];
    const dt = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const time = i * dt;
      const level = ForgeCalculator.calculate(
        initialLevel,
        this.state.rateConstant,
        time
      );
      const percent = (level / initialLevel) * 100;
      
      curve.push({
        time,
        level,
        percent,
        state: this.getStateFromLevel(level * this.volumeDistribution)
      });
    }
    
    return curve;
  }
  
  /**
   * Get state label from blood level
   * @private
   */
  getStateFromLevel(totalLevel) {
    if (totalLevel >= this.CONSTANTS.THRESHOLD_JITTERY) return 'jittery';
    if (totalLevel >= this.CONSTANTS.THRESHOLD_ALERT) return 'alert';
    if (totalLevel >= this.CONSTANTS.THRESHOLD_SLEEP) return 'mild';
    if (totalLevel >= this.CONSTANTS.THRESHOLD_BASELINE) return 'minimal';
    return 'baseline';
  }
  
  /**
   * Generate full day timeline with current caffeine history
   * @param {Date} startTime - Start of timeline (default: midnight today)
   * @param {number} hours - Hours to simulate (default: 24)
   * @param {number} resolution - Minutes between points (default: 15)
   * @returns {Array} Timeline data
   */
  generateTimeline(startTime = null, hours = 24, resolution = 15) {
    const start = startTime || new Date().setHours(0, 0, 0, 0);
    const timeline = [];
    const steps = (hours * 60) / resolution;
    
    for (let i = 0; i <= steps; i++) {
      const time = new Date(start.getTime() + i * resolution * 60 * 1000);
      const level = this.getCurrentLevel(time);
      const state = this.getPhysiologicalState(time);
      
      timeline.push({
        time,
        level,
        ...state
      });
    }
    
    return timeline;
  }
  
  /**
   * Optimize dosing schedule for desired effect duration
   * @param {number} targetLevel - Desired blood level (mg)
   * @param {number} duration - Hours to maintain level
   * @param {number} maxDose - Maximum single dose (mg)
   * @returns {Array} Recommended dosing schedule
   */
  optimizeDosing(targetLevel, duration, maxDose = 200) {
    const schedule = [];
    const targetConcentration = targetLevel;
    
    // Initial dose to reach target
    const initialDose = Math.min(
      targetConcentration * this.volumeDistribution,
      maxDose
    );
    
    schedule.push({
      time: 0,
      dose: initialDose,
      reason: 'Initial dose to reach target'
    });
    
    // Calculate redosing interval (when level drops to 70% of target)
    const redoseThreshold = targetConcentration * 0.7;
    const initialConc = initialDose / this.volumeDistribution;
    const redoseInterval = ForgeCalculator.timeToReach(
      initialConc,
      redoseThreshold,
      this.state.rateConstant
    );
    
    // Add maintenance doses
    let currentTime = redoseInterval;
    while (currentTime < duration) {
      const boostDose = Math.min(
        (targetConcentration - redoseThreshold) * this.volumeDistribution,
        maxDose
      );
      
      schedule.push({
        time: currentTime,
        dose: boostDose,
        reason: 'Maintenance dose'
      });
      
      currentTime += redoseInterval;
    }
    
    return schedule;
  }
  
  /**
   * Calculate total caffeine consumed today
   * @returns {Object} Total dose and source breakdown
   */
  getTodayTotal() {
    const today = new Date().setHours(0, 0, 0, 0);
    let total = 0;
    const breakdown = {};
    
    for (const event of this.state.caffeineHistory) {
      if (event.time >= today) {
        total += event.dose;
        breakdown[event.source] = (breakdown[event.source] || 0) + event.dose;
      }
    }
    
    return {
      total,
      breakdown,
      safe: total < 400,  // FDA recommendation: <400mg/day
      excessive: total > 600  // Above this is concerning
    };
  }
  
  /**
   * Clear caffeine history
   */
  clearHistory() {
    this.state.caffeineHistory = [];
    this.state.currentLevel = 0;
  }
  
  /**
   * Update user configuration
   * @param {Object} config - Configuration updates
   */
  updateConfig(config) {
    Object.assign(this.state, config);
    
    if (config.bodyWeight) {
      this.volumeDistribution = config.bodyWeight * this.CONSTANTS.VD_PER_KG;
    }
    
    if (config.metabolismRate) {
      this.updateRateConstant();
    }
  }
  
  /**
   * Export state for persistence
   * @returns {Object} Serializable state
   */
  exportState() {
    return {
      version: '1.0',
      state: this.state,
      timestamp: Date.now()
    };
  }
  
  /**
   * Import state from previous session
   * @param {Object} savedState - Previously exported state
   */
  importState(savedState) {
    if (savedState.version === '1.0') {
      this.state = { ...this.state, ...savedState.state };
      this.updateRateConstant();
      this.volumeDistribution = this.state.bodyWeight * this.CONSTANTS.VD_PER_KG;
    }
  }
  
  /**
   * Get recommendations based on current state
   * @returns {Array} Array of recommendation strings
   */
  getRecommendations() {
    const recommendations = [];
    const state = this.getPhysiologicalState();
    const todayTotal = this.getTodayTotal();
    const sleepInfo = this.getTimeUntilSleep();
    
    if (state.state === 'jittery') {
      recommendations.push('⚠️ High caffeine level - consider waiting before next dose');
      recommendations.push('💧 Drink water to help with metabolism');
    }
    
    if (todayTotal.total > 400) {
      recommendations.push('⚠️ You\'ve exceeded the recommended daily limit (400mg)');
    }
    
    if (!sleepInfo.canSleepNow) {
      const hours = Math.round(sleepInfo.hours * 10) / 10;
      recommendations.push(`😴 Wait ${hours} hours before sleep for best rest`);
    }
    
    if (state.state === 'baseline' || state.state === 'minimal') {
      recommendations.push('✅ Good time for caffeine if needed');
    }
    
    return recommendations;
  }
}

export default CaffeineForge;
