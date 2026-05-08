// domains/health-medicine/caffeine-forge/test.js
import CaffeineForge from './index.js';

/**
 * Test suite for CaffeineForge
 * Validates pharmacokinetic calculations and edge cases
 */
class CaffeineForgeTest {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  /**
   * Assert helper
   */
  assert(condition, message) {
    if (condition) {
      this.passed++;
      console.log(`✅ PASS: ${message}`);
      this.results.push({ status: 'PASS', message });
    } else {
      this.failed++;
      console.error(`❌ FAIL: ${message}`);
      this.results.push({ status: 'FAIL', message });
    }
  }
  
  /**
   * Assert approximate equality (for floating point)
   */
  assertApprox(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    this.assert(
      diff <= tolerance,
      `${message} (expected: ${expected}, got: ${actual}, diff: ${diff})`
    );
  }
  
  /**
   * Run all tests
   */
  runAll() {
    console.log('🧪 Starting CaffeineForge Test Suite\n');
    
    this.testBasicInstantiation();
    this.testRateConstantConversion();
    this.testSingleDoseDecay();
    this.testMultipleDoses();
    this.testTimeToSleep();
    this.testPhysiologicalStates();
    this.testMetabolismTypes();
    this.testSourceAddition();
    this.testDecayCurve();
    this.testDailyTotal();
    this.testDosingOptimization();
    this.testStateExportImport();
    this.testRecommendations();
    this.testEdgeCases();
    
    this.printSummary();
  }
  
  /**
   * Test 1: Basic instantiation
   */
  testBasicInstantiation() {
    console.log('\n📋 Test 1: Basic Instantiation');
    
    const forge = new CaffeineForge();
    
    this.assert(
      forge !== null,
      'CaffeineForge instance created'
    );
    
    this.assert(
      forge.state.bodyWeight === 70,
      'Default body weight is 70kg'
    );
    
    this.assert(
      forge.state.metabolismRate === 'typical',
      'Default metabolism is typical'
    );
    
    this.assertApprox(
      forge.state.rateConstant,
      0.1386,
      0.001,
      'Rate constant matches typical metabolism'
    );
  }
  
  /**
   * Test 2: Half-life to rate constant conversion
   */
  testRateConstantConversion() {
    console.log('\n📋 Test 2: Half-Life Conversions');
    
    const forge = new CaffeineForge({ metabolismRate: 'typical' });
    
    // Half-life = 5 hours should give k ≈ 0.1386
    this.assertApprox(
      forge.state.rateConstant,
      Math.LN2 / 5,
      0.0001,
      'Typical half-life converts correctly'
    );
    
    // Test fast metabolism
    forge.updateConfig({ metabolismRate: 'fast' });
    this.assertApprox(
      forge.state.rateConstant,
      Math.LN2 / 2,
      0.0001,
      'Fast metabolism rate constant'
    );
    
    // Test slow metabolism
    forge.updateConfig({ metabolismRate: 'slow' });
    this.assertApprox(
      forge.state.rateConstant,
      Math.LN2 / 10,
      0.0001,
      'Slow metabolism rate constant'
    );
  }
  
  /**
   * Test 3: Single dose decay
   */
  testSingleDoseDecay() {
    console.log('\n📋 Test 3: Single Dose Decay');
    
    const forge = new CaffeineForge({ 
      bodyWeight: 70,
      metabolismRate: 'typical'
    });
    
    // 100mg dose, Vd = 70kg × 0.6 = 42L
    // Initial concentration = 100/42 ≈ 2.38 mg
    const dose = 100;
    
    // At t=0, should equal initial concentration
    const level0 = forge.getBloodLevel(dose, 0);
    this.assertApprox(
      level0,
      dose / forge.volumeDistribution,
      0.01,
      'Initial blood level correct'
    );
    
    // At t=5 hours (1 half-life), should be 50% remaining
    const level5 = forge.getBloodLevel(dose, 5);
    this.assertApprox(
      level5,
      level0 * 0.5,
      0.01,
      'After 1 half-life, 50% remains'
    );
    
    // At t=10 hours (2 half-lives), should be 25% remaining
    const level10 = forge.getBloodLevel(dose, 10);
    this.assertApprox(
      level10,
      level0 * 0.25,
      0.01,
      'After 2 half-lives, 25% remains'
    );
  }
  
  /**
   * Test 4: Multiple doses accumulation
   */
  testMultipleDoses() {
    console.log('\n📋 Test 4: Multiple Dose Accumulation');
    
    const forge = new CaffeineForge();
    
    const now = new Date('2026-01-01T08:00:00');
    const later = new Date('2026-01-01T12:00:00');  // 4 hours later
    
    // First dose: 100mg at 8am
    forge.addDose(100, now, 'coffee');
    
    // Second dose: 100mg at 12pm (4 hours later)
    forge.addDose(100, later, 'coffee');
    
    // At 12pm, should have decayed first dose + new dose
    const levelAt12pm = forge.getCurrentLevel(later);
    
    // First dose after 4 hours
    const firstDoseRemaining = forge.getBloodLevel(100, 4);
    // Second dose just added
    const secondDoseLevel = forge.getBloodLevel(100, 0);
    
    const expectedTotal = firstDoseRemaining + secondDoseLevel;
    
    this.assertApprox(
      levelAt12pm,
      expectedTotal,
      0.1,
      'Multiple doses accumulate correctly'
    );
  }
  
  /**
   * Test 5: Time until sleep calculation
   */
  testTimeToSleep() {
    console.log('\n📋 Test 5: Time Until Sleep');
    
    const forge = new CaffeineForge();
    const now = new Date();
    
    // Add 200mg dose
    forge.addDose(200, now, 'coffee');
    
    const sleepInfo = forge.getTimeUntilSleep(10);
    
    this.assert(
      sleepInfo.hours > 0,
      'Time until sleep is positive'
    );
    
    this.assert(
      !sleepInfo.canSleepNow,
      'Cannot sleep immediately after 200mg'
    );
    
    this.assert(
      sleepInfo.sleepTime instanceof Date,
      'Sleep time returned as Date object'
    );
    
    // Test when already below threshold
    const lowForge = new CaffeineForge();
    lowForge.addDose(5, now, 'test');
    
    const lowSleepInfo = lowForge.getTimeUntilSleep(10);
    
    this.assert(
      lowSleepInfo.canSleepNow,
      'Can sleep when below threshold'
    );
    
    this.assert(
      lowSleepInfo.hours === 0,
      'Zero hours when already below threshold'
    );
  }
  
  /**
   * Test 6: Physiological state detection
   */
  testPhysiologicalStates() {
    console.log('\n📋 Test 6: Physiological States');
    
    const forge = new CaffeineForge({ bodyWeight: 70 });
    const now = new Date();
    
    // Test jittery state (high dose)
    forge.clearHistory();
    forge.addDose(400, now);
    let state = forge.getPhysiologicalState(now);
    this.assert(
      state.state === 'jittery',
      'High dose triggers jittery state'
    );
    
    // Test alert state (moderate dose)
    forge.clearHistory();
    forge.addDose(150, now);
    state = forge.getPhysiologicalState(now);
    this.assert(
      state.state === 'alert',
      'Moderate dose triggers alert state'
    );
    
    // Test mild state (low dose)
    forge.clearHistory();
    forge.addDose(30, now);
    state = forge.getPhysiologicalState(now);
    this.assert(
      state.state === 'mild',
      'Low dose triggers mild state'
    );
    
    // Test baseline state (no dose)
    forge.clearHistory();
    state = forge.getPhysiologicalState(now);
    this.assert(
      state.state === 'baseline',
      'No caffeine triggers baseline state'
    );
  }
  
  /**
   * Test 7: Different metabolism types
   */
  testMetabolismTypes() {
    console.log('\n📋 Test 7: Metabolism Type Variations');
    
    const fastForge = new CaffeineForge({ metabolismRate: 'fast' });
    const typicalForge = new CaffeineForge({ metabolismRate: 'typical' });
    const slowForge = new CaffeineForge({ metabolismRate: 'slow' });
    
    const dose = 100;
    const time = 5;  // hours
    
    const fastLevel = fastForge.getBloodLevel(dose, time);
    const typicalLevel = typicalForge.getBloodLevel(dose, time);
    const slowLevel = slowForge.getBloodLevel(dose, time);
    
    this.assert(
      fastLevel < typicalLevel,
      'Fast metabolism clears caffeine faster'
    );
    
    this.assert(
      typicalLevel < slowLevel,
      'Typical metabolism clears faster than slow'
    );
    
    this.assert(
      slowLevel > fastLevel,
      'Slow metabolism retains most caffeine'
    );
  }
  
  /**
   * Test 8: Adding doses by source
   */
  testSourceAddition() {
    console.log('\n📋 Test 8: Adding by Source');
    
    const forge = new CaffeineForge();
    const now = new Date();
    
    // Add espresso
    const espresso = forge.addBySource('espresso', 2, now);
    this.assert(
      espresso.dose === 128,  // 64mg × 2
      'Espresso dose calculated correctly'
    );
    
    // Add coffee
    forge.addBySource('coffee', 1, now);
    const total = forge.getTodayTotal();
    
    this.assert(
      total.total === 223,  // 128 + 95
      'Total from multiple sources correct'
    );
    
    // Test invalid source
    let errorCaught = false;
    try {
      forge.addBySource('invalid_source');
    } catch (e) {
      errorCaught = true;
    }
    
    this.assert(
      errorCaught,
      'Invalid source throws error'
    );
  }
  
  /**
   * Test 9: Decay curve generation
   */
  testDecayCurve() {
    console.log('\n📋 Test 9: Decay Curve Generation');
    
    const forge = new CaffeineForge();
    const curve = forge.generateDecayCurve(100, 24, 100);
    
    this.assert(
      curve.length === 101,  // 0 to 100 inclusive
      'Correct number of curve points'
    );
    
    this.assert(
      curve[0].percent === 100,
      'Curve starts at 100%'
    );
    
    this.assert(
      curve[curve.length - 1].percent < 5,
      'Curve decays to near zero after 24 hours'
    );
    
    this.assert(
      curve[0].level > curve[curve.length - 1].level,
      'Level decreases over time'
    );
  }
  
  /**
   * Test 10: Daily total calculation
   */
  testDailyTotal() {
    console.log('\n📋 Test 10: Daily Total Tracking');
    
    const forge = new CaffeineForge();
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // Add yesterday's dose (should not count)
    forge.addDose(100, yesterday, 'coffee');
    
    // Add today's doses
    forge.addDose(95, today, 'coffee');
    forge.addDose(64, today, 'espresso');
    
    const total = forge.getTodayTotal();
    
    this.assert(
      total.total === 159,  // Only today's doses
      'Daily total excludes previous days'
    );
    
    this.assert(
      total.safe === true,
      'Below 400mg marked as safe'
    );
    
    this.assert(
      total.excessive === false,
      'Below 600mg not marked excessive'
    );
  }
  
  /**
   * Test 11: Dosing optimization
   */
  testDosingOptimization() {
    console.log('\n📋 Test 11: Dosing Optimization');
    
    const forge = new CaffeineForge();
    
    // Maintain 100mg blood level for 8 hours
    const schedule = forge.optimizeDosing(100, 8, 200);
    
    this.assert(
      schedule.length > 1,
      'Schedule includes multiple doses'
    );
    
    this.assert(
      schedule[0].time === 0,
      'First dose at time zero'
    );
    
    this.assert(
      schedule[0].dose <= 200,
      'Doses respect maximum limit'
    );
    
    this.assert(
      schedule.every(d => d.dose > 0),
      'All doses are positive'
    );
  }
  
  /**
   * Test 12: State export/import
   */
  testStateExportImport() {
    console.log('\n📋 Test 12: State Persistence');
    
    const forge1 = new CaffeineForge({ bodyWeight: 80 });
    forge1.addDose(100, new Date(), 'coffee');
    
    const exported = forge1.exportState();
    
    this.assert(
      exported.version === '1.0',
      'Export includes version'
    );
    
    this.assert(
      exported.state !== undefined,
      'Export includes state'
    );
    
    // Import into new instance
    const forge2 = new CaffeineForge();
    forge2.importState(exported);
    
    this.assert(
      forge2.state.bodyWeight === 80,
      'Body weight imported correctly'
    );
    
    this.assert(
      forge2.state.caffeineHistory.length === 1,
      'Caffeine history imported'
    );
  }
  
  /**
   * Test 13: Recommendations
   */
  testRecommendations() {
    console.log('\n📋 Test 13: Recommendations Engine');
    
    const forge = new CaffeineForge();
    const now = new Date();
    
    // High dose should trigger warnings
    forge.addDose(400, now);
    let recs = forge.getRecommendations();
    
    this.assert(
      recs.length > 0,
      'Recommendations generated for high dose'
    );
    
    this.assert(
      recs.some(r => r.includes('High caffeine')),
      'High dose warning included'
    );
    
    // Excessive daily total should trigger warning
    forge.addDose(200, now);
    recs = forge.getRecommendations();
    
    this.assert(
      recs.some(r => r.includes('exceeded')),
      'Daily limit warning included'
    );
  }
  
  /**
   * Test 14: Edge cases
   */
  testEdgeCases() {
    console.log('\n📋 Test 14: Edge Cases');
    
    const forge = new CaffeineForge();
    
    // Zero dose
    const zeroLevel = forge.getBloodLevel(0, 5);
    this.assert(
      zeroLevel === 0,
      'Zero dose gives zero blood level'
    );
    
    // Very large dose
    const hugeDose = forge.getBloodLevel(10000, 0);
    this.assert(
      hugeDose > 0 && hugeDose < Infinity,
      'Very large dose handled correctly'
    );
    
    // Negative time (should be ignored in getCurrentLevel)
    forge.clearHistory();
    const futureTime = new Date(Date.now() + 1000 * 60 * 60);  // 1 hour future
    forge.addDose(100, futureTime);
    const currentLevel = forge.getCurrentLevel();
    
    this.assert(
      currentLevel === 0,
      'Future doses ignored in current level'
    );
    
    // Empty history
    forge.clearHistory();
    const emptyLevel = forge.getCurrentLevel();
    this.assert(
      emptyLevel === 0,
      'Empty history gives zero level'
    );
  }
  
  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Review output above.');
    }
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CaffeineForgeTest();
  tester.runAll();
}

export default CaffeineForgeTest;
