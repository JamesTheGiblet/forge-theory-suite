/**
 * CCE Unreal Platform Configuration
 * Separate from trading config to avoid conflicts
 */

module.exports = {
  // Platform settings
  platform: {
    name: 'CCE Unreal',
    version: '1.0.0',
    description: 'The Unreal Engine of Trading',
    port: 3001
  },
  
  // G.O Orchestrator (Grand Orchestrator)
  go: {
    enabled: false,           // Start disabled until we have observation cycles
    dryRun: true,            // Always start in dry run mode
    tier2Enabled: false,     // Auto-adjust capital ceilings
    minObsCycles: 96,        // Require 96 observation cycles before tier 2
    capitalCeiling: 10000,   // Max total capital across all engines
    defaultAllocation: 100    // Default allocation per new engine
  },
  
  // Engine defaults
  engines: {
    defaultDryRun: true,     // All new engines start in dry run
    autoStart: true,         // Auto-start engines on load
    circuitBreakerPct: -20   // Default circuit breaker at -20%
  },
  
  // Data feeds
  dataFeeds: {
    kraken: { enabled: false },      // Disabled by default in platform mode
    yahooFinance: { enabled: true },
    alternativeMe: { enabled: true }
  },
  
  // Registry settings
  registry: {
    scanInterval: 60000,     // Scan for new engines every minute
    autoReload: true         // Auto-reload when new engines detected
  }
};
