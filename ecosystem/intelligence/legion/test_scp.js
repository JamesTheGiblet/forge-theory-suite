const { SCPLoader } = require('./scp/scp_loader');
const { SCPSpawner } = require('./scp/spawn_agents');

async function test() {
  console.log('=== SCP-Driven LEGION Test ===\n');

  const loader = new SCPLoader();
  const registry = loader.loadRegistry();

  console.log('📋 SCP Registry Loaded:');
  console.log(`   Version: ${registry.version}`);
  console.log(`   Agents: ${registry.agents.length}`);
  console.log(`   Behaviors: ${registry.behaviors.length}`);
  console.log(`   Rules: ${registry.rules.length}`);

  console.log('\n🤖 Agents Defined:');
  registry.agents.forEach(a => {
    console.log(`   ${a.scp_id} — ${a.name} (${a.object_class})`);
  });

  console.log('\n📊 Entropy Test:');
  loader.updateEntropy(0.2);
  console.log(`   Entropy: ${loader.entropy}`);
  loader.updateEntropy(0.6);
  console.log(`   Entropy: ${loader.entropy}`);

  console.log('\n🎮 Spawning Agents:');
  const spawner = new SCPSpawner();
  await spawner.spawnAll();

  console.log('\n✅ SCP-Driven LEGION ready');
}

test();
