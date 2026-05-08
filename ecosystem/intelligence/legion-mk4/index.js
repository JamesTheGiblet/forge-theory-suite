#!/usr/bin/env node

const path = require('path');
const { SCPEngine } = require('./core/scp_engine');
const { SCPSpawner } = require('./core/scp_spawner');
const { APISCP } = require('./api/api_server');

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    LEGION MK4 — SCP Native                      ║');
  console.log('║              Fully driven by SCP Registry JSON                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const registryPath = path.join(__dirname, 'scp', 'scp_registry.json');
  
  // Initialize SCP Engine
  const engine = new SCPEngine(registryPath);
  
  if (!engine.load()) {
    console.error('Failed to load SCP registry');
    process.exit(1);
  }
  
  if (!engine.validate()) {
    console.error('SCP registry validation failed');
    process.exit(1);
  }
  
  console.log(`📋 SCP Registry: ${engine.registry.scp_id} v${engine.registry.version}`);
  console.log(`   Agents: ${engine.registry.agents.length}`);
  console.log(`   Behaviors: ${engine.registry.behaviors.length}`);
  console.log(`   Rules: ${engine.registry.rules.length}`);
  
  // Start API SCP first
  const api = new APISCP(engine, registryPath);
  api.start();
  
  // Spawn all agents
  const spawner = new SCPSpawner(engine);
  await spawner.spawnAll();
  
  engine.running = true;
  
  // Listen for Apollyon events
  engine.on('apollyon', (event) => {
    console.log(`[APOLLYON] ${event.reason}`);
    if (event.entropy > 0.85) {
      api.activateReadonlyMode();
    }
  });
  
  // Start heartbeat monitor
  const heartbeatInterval = setInterval(() => {
    for (const [scpId, agent] of spawner.spawnedAgents) {
      if (!agent.heartbeat()) {
        console.log(`[HEARTBEAT] Agent ${scpId} is not responding`);
        engine.updateEntropy(0.1, `heartbeat_failure_${scpId}`);
      }
    }
  }, 30000);
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down LEGION MK4...');
    clearInterval(heartbeatInterval);
    api.stop();
    await spawner.stopAll();
    engine.save();
    console.log('✅ Shutdown complete\n');
    process.exit(0);
  });
  
  console.log('\n✨ LEGION MK4 is running.');
  console.log(`📡 API: http://localhost:3011/api`);
  console.log('Press Ctrl+C to stop.\n');
}

main().catch(console.error);
