// core-engine/forge-calculator.js

/**
 * ForgeCalculator - Universal exponential decay engine
 * 
 * Core mathematical implementation of Forge Theory.
 * All domain-specific forges extend or use this base calculator.
 * 
 * Mathematical Foundation:
 *   N(t) = N₀ × e^(-kt)
 * 
 * Where:
 *   - N(t): Amount remaining at time t
 *   - N₀: Initial amount
 *   - k: Decay rate constant
 *   - t: Time elapsed
 * 
 * @class ForgeCalculator
 * @version 1.0.0
 */
class ForgeCalculator {
  /**
   * Universal exponential decay calculation
   * 
   * @param {number} initial - Initial quantity (N₀)
   * @param {number} rate - Decay rate constant (k)
   * @param {number} time - Time elapsed (t)
   * @returns {number} Remaining quantity N(t)
   * 
   * @example
   * ForgeCalculator.calculate(100, 0.1386, 5)
   * // Returns: ~50 (after 1 half-life)
   */
  static calculate(initial, rate, time) {
    if (initial < 0) {
      throw new Error('Initial value cannot be negative');
    }
    if (rate < 0) {
      throw new Error('Rate constant cannot be negative');
    }
    if (time < 0) {
      throw new Error('Time cannot be negative');
    }
    
    return initial * Math.exp(-rate * time);
  }

  /**
   * Calculate percentage remaining
   * 
   * @param {number} rate - Decay rate constant
   * @param {number} time - Time elapsed
   * @returns {number} Percentage remaining (0-100)
   * 
   * @example
   * ForgeCalculator.percentRemaining(0.1386, 5)
   * // Returns: ~50 (50% remaining after 1 half-life)
   */
  static percentRemaining(rate, time) {
    return 100 * Math.exp(-rate * time);
  }

  /**
   * Calculate amount remaining as percentage of initial
   * 
   * @param {number} initial - Initial amount
   * @param {number} current - Current amount
   * @returns {number} Percentage (0-100)
   */
  static percentOf(current, initial) {
    if (initial === 0) return 0;
    return (current / initial) * 100;
  }

  /**
   * Convert rate constant to half-life
   * 
   * Half-life is the time for quantity to reduce to exactly 50%
   * Formula: t₁/₂ = ln(2) / k
   * 
   * @param {number} rate - Decay rate constant (k)
   * @returns {number} Half-life in time units
   * 
   * @example
   * ForgeCalculator.rateToHalfLife(0.1386)
   * // Returns: ~5 (5 time units)
   */
  static rateToHalfLife(rate) {
    if (rate <= 0) {
      throw new Error('Rate constant must be positive');
    }
    return Math.LN2 / rate;  // ln(2) ≈ 0.693147
  }

  /**
   * Convert half-life to rate constant
   * 
   * Formula: k = ln(2) / t₁/₂
   * 
   * @param {number} halfLife - Half-life in time units
   * @returns {number} Decay rate constant (k)
   * 
   * @example
   * ForgeCalculator.halfLifeToRate(5)
   * // Returns: ~0.1386
   */
  static halfLifeToRate(halfLife) {
    if (halfLife <= 0) {
      throw new Error('Half-life must be positive');
    }
    return Math.LN2 / halfLife;
  }

  /**
   * Calculate time constant (τ)
   * 
   * Time constant is the time for quantity to decay to 1/e (~36.8%)
   * Formula: τ = 1 / k
   * 
   * @param {number} rate - Decay rate constant
   * @returns {number} Time constant
   */
  static timeConstant(rate) {
    if (rate <= 0) {
      throw new Error('Rate constant must be positive');
    }
    return 1 / rate;
  }

  /**
   * Calculate time to reach a target level
   * 
   * Solves for t in: target = initial × e^(-kt)
   * Formula: t = -ln(target/initial) / k = ln(initial/target) / k
   * 
   * @param {number} initial - Initial quantity
   * @param {number} target - Target quantity
   * @param {number} rate - Decay rate constant
   * @returns {number} Time to reach target
   * 
   * @example
   * ForgeCalculator.timeToReach(100, 50, 0.1386)
   * // Returns: ~5 (one half-life)
   */
  static timeToReach(initial, target, rate) {
    if (target >= initial) {
      return 0; // Already at or above target
    }
    if (target <= 0) {
      return Infinity; // Will never reach zero
    }
    if (rate <= 0) {
      throw new Error('Rate constant must be positive');
    }
    
    return Math.log(initial / target) / rate;
  }

  /**
   * Calculate remaining amount at specific percentage
   * 
   * @param {number} initial - Initial amount
   * @param {number} percent - Target percentage (0-100)
   * @returns {number} Amount at that percentage
   * 
   * @example
   * ForgeCalculator.amountAtPercent(100, 50)
   * // Returns: 50
   */
  static amountAtPercent(initial, percent) {
    return initial * (percent / 100);
  }

  /**
   * Calculate number of half-lives elapsed
   * 
   * @param {number} time - Time elapsed
   * @param {number} halfLife - Half-life duration
   * @returns {number} Number of half-lives
   * 
   * @example
   * ForgeCalculator.halfLivesElapsed(10, 5)
   * // Returns: 2 (two half-lives)
   */
  static halfLivesElapsed(time, halfLife) {
    if (halfLife <= 0) {
      throw new Error('Half-life must be positive');
    }
    return time / halfLife;
  }

  /**
   * Generate decay curve data points
   * 
   * Creates array of {time, value, percent} objects for visualization
   * 
   * @param {number} initial - Initial quantity
   * @param {number} rate - Decay rate constant
   * @param {number} duration - Total time span
   * @param {number} steps - Number of data points (default: 100)
   * @returns {Array} Array of data points
   * 
   * @example
   * ForgeCalculator.generateCurve(100, 0.1386, 24, 100)
   * // Returns: [{time: 0, value: 100, percent: 100}, ...]
   */
  static generateCurve(initial, rate, duration, steps = 100) {
    const data = [];
    const dt = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const time = i * dt;
      const value = this.calculate(initial, rate, time);
      const percent = (value / initial) * 100;
      
      data.push({
        time,
        value,
        percent,
        halfLives: time / this.rateToHalfLife(rate)
      });
    }
    
    return data;
  }

  /**
   * Logistic growth model (for emergence domains)
   * 
   * Models growth with carrying capacity constraint
   * Formula: P(t) = K / (1 + ((K-P₀)/P₀) × e^(-rt))
   * 
   * @param {number} initial - Initial population (P₀)
   * @param {number} capacity - Carrying capacity (K)
   * @param {number} rate - Growth rate (r)
   * @param {number} time - Time elapsed
   * @returns {number} Population at time t
   * 
   * @example
   * ForgeCalculator.logisticGrowth(10, 1000, 0.5, 5)
   * // Returns: population after constrained growth
   */
  static logisticGrowth(initial, capacity, rate, time) {
    if (capacity <= 0) {
      throw new Error('Carrying capacity must be positive');
    }
    if (initial <= 0) {
      throw new Error('Initial population must be positive');
    }
    
    const ratio = (capacity - initial) / initial;
    return capacity / (1 + ratio * Math.exp(-rate * time));
  }

  /**
   * Multi-compartment model (bi-exponential decay)
   * 
   * Models systems with fast and slow elimination pathways
   * Formula: C(t) = A × e^(-αt) + B × e^(-βt)
   * 
   * @param {number} A - Fast compartment coefficient
   * @param {number} alpha - Fast elimination rate
   * @param {number} B - Slow compartment coefficient
   * @param {number} beta - Slow elimination rate
   * @param {number} time - Time elapsed
   * @returns {number} Concentration at time t
   * 
   * @example
   * // Drug with fast tissue distribution, slow elimination
   * ForgeCalculator.biExponential(80, 0.5, 20, 0.05, 5)
   */
  static biExponential(A, alpha, B, beta, time) {
    return A * Math.exp(-alpha * time) + B * Math.exp(-beta * time);
  }

  /**
   * Poisson probability for discrete events
   * 
   * Calculates probability of exactly n events in time t
   * Formula: P(n,t) = ((λt)^n × e^(-λt)) / n!
   * 
   * @param {number} lambda - Event rate (λ)
   * @param {number} time - Time window
   * @param {number} n - Number of events
   * @returns {number} Probability (0-1)
   * 
   * @example
   * // Probability of exactly 2 breaches in 1 year
   * ForgeCalculator.poissonProbability(1.5, 1, 2)
   */
  static poissonProbability(lambda, time, n) {
    const lt = lambda * time;
    return (Math.pow(lt, n) * Math.exp(-lt)) / this.factorial(n);
  }

  /**
   * Mean time to first event (Poisson process)
   * 
   * @param {number} lambda - Event rate
   * @returns {number} Mean time to first event
   */
  static meanTimeToEvent(lambda) {
    if (lambda <= 0) {
      throw new Error('Event rate must be positive');
    }
    return 1 / lambda;
  }

  /**
   * Calculate factorial (helper for Poisson)
   * 
   * @param {number} n - Number
   * @returns {number} n!
   */
  static factorial(n) {
    if (n < 0) {
      throw new Error('Factorial undefined for negative numbers');
    }
    if (n === 0 || n === 1) return 1;
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Composite decay (multiple simultaneous mechanisms)
   * 
   * When multiple decay processes occur together
   * Formula: N(t) = N₀ × e^(-(k₁ + k₂ + k₃)t)
   * 
   * @param {number} initial - Initial amount
   * @param {Array<number>} rates - Array of rate constants
   * @param {number} time - Time elapsed
   * @returns {number} Remaining amount
   * 
   * @example
   * // Tooth decay from acid, wear, and erosion
   * ForgeCalculator.compositeDecay(100, [0.001, 0.002, 0.0005], 365)
   */
  static compositeDecay(initial, rates, time) {
    const totalRate = rates.reduce((sum, rate) => sum + rate, 0);
    return this.calculate(initial, totalRate, time);
  }

  /**
   * Calculate R² (coefficient of determination)
   * 
   * Measures goodness of fit for exponential decay model
   * 
   * @param {Array<{x: number, y: number}>} observed - Observed data points
   * @param {Array<{x: number, y: number}>} predicted - Predicted data points
   * @returns {number} R² value (0-1, higher is better fit)
   */
  static calculateRSquared(observed, predicted) {
    if (observed.length !== predicted.length) {
      throw new Error('Observed and predicted arrays must have same length');
    }
    
    // Calculate mean of observed values
    const mean = observed.reduce((sum, point) => sum + point.y, 0) / observed.length;
    
    // Calculate sum of squares
    let ssTotal = 0;
    let ssResidual = 0;
    
    for (let i = 0; i < observed.length; i++) {
      const obs = observed[i].y;
      const pred = predicted[i].y;
      
      ssTotal += Math.pow(obs - mean, 2);
      ssResidual += Math.pow(obs - pred, 2);
    }
    
    return 1 - (ssResidual / ssTotal);
  }

  /**
   * Linearization test for exponential decay
   * 
   * Transform data to test if exponential decay is appropriate
   * If ln(N) vs t is linear, exponential decay is valid
   * 
   * @param {Array<{time: number, value: number}>} data - Data points
   * @returns {Object} {slope: k, intercept: ln(N₀), r2}
   */
  static linearizationTest(data) {
    // Transform: ln(N) vs t should be linear with slope -k
    const transformed = data.map(point => ({
      x: point.time,
      y: Math.log(point.value)
    }));
    
    // Linear regression
    const n = transformed.length;
    const sumX = transformed.reduce((sum, p) => sum + p.x, 0);
    const sumY = transformed.reduce((sum, p) => sum + p.y, 0);
    const sumXY = transformed.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = transformed.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R² for linear fit
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;
    
    transformed.forEach(point => {
      const predicted = slope * point.x + intercept;
      ssTotal += Math.pow(point.y - meanY, 2);
      ssResidual += Math.pow(point.y - predicted, 2);
    });
    
    const r2 = 1 - (ssResidual / ssTotal);
    
    return {
      rateConstant: -slope,  // k = -slope
      initialValue: Math.exp(intercept),  // N₀ = e^intercept
      r2,
      isExponential: r2 > 0.85  // Good fit if R² > 0.85
    };
  }

  /**
   * Batch calculation for multiple time points
   * 
   * @param {number} initial - Initial amount
   * @param {number} rate - Decay rate constant
   * @param {Array<number>} times - Array of time points
   * @returns {Array<{time: number, value: number}>} Results
   */
  static batchCalculate(initial, rate, times) {
    return times.map(time => ({
      time,
      value: this.calculate(initial, rate, time),
      percent: this.percentRemaining(rate, time)
    }));
  }

  /**
   * Find rate constant from two data points
   * 
   * Given two (time, value) pairs, calculate k
   * 
   * @param {Object} point1 - {time, value}
   * @param {Object} point2 - {time, value}
   * @returns {number} Rate constant k
   */
  static findRateFromPoints(point1, point2) {
    const dt = point2.time - point1.time;
    if (dt <= 0) {
      throw new Error('Times must be different and point2 must be after point1');
    }
    
    return Math.log(point1.value / point2.value) / dt;
  }

  /**
   * Confidence interval for rate constant
   * 
   * @param {number} rate - Estimated rate constant
   * @param {number} standardError - Standard error of estimate
   * @param {number} confidence - Confidence level (default: 0.95)
   * @returns {Object} {lower, upper}
   */
  static rateConfidenceInterval(rate, standardError, confidence = 0.95) {
    // For 95% confidence, use t ≈ 1.96 (assuming large sample)
    const t = confidence === 0.95 ? 1.96 : 2.576; // 99% = 2.576
    
    return {
      lower: rate - t * standardError,
      upper: rate + t * standardError,
      confidence
    };
  }
}

// Make it work in both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ForgeCalculator;
} else if (typeof window !== 'undefined') {
  window.ForgeCalculator = ForgeCalculator;
}

export default ForgeCalculator;
