#!/data/data/com.termux/files/usr/bin/bash
# CCE Framework — index.js wiring
# Run from: ~/cce-crypto
# Usage: bash ~/wire-index.sh

set -e
INDEX="$HOME/cce-crypto/index.js"

echo ""
echo "⚡ Wiring CCE Framework into index.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup first
cp $INDEX $INDEX.bak
echo "   ✅ Backup saved → index.js.bak"

# ── PATCH 1: Add requires at top ─────────────────────────────────────────────
# After: const CCELCEEngine = require('./src/cce-lce-engine');

node -e "
const fs  = require('fs');
let src   = fs.readFileSync('$INDEX', 'utf8');
const tag = \`const CCELCEEngine   = require('./src/cce-lce-engine');\`;
const add = \`const CCELCEEngine   = require('./src/cce-lce-engine');
const EngineRegistry = require('./src/engine-registry');
const LayerRegistry  = require('./src/layer-registry');
const { CCEGOEngine } = require('./src/cce-go-engine');\`;
if (src.includes('EngineRegistry')) { console.log('   ⏭️  Requires already patched'); process.exit(0); }
src = src.replace(tag, add);
fs.writeFileSync('$INDEX', src);
console.log('   ✅ PATCH 1: requires added');
"

# ── PATCH 2: Scan registries after sharedNotifier is created ─────────────────
# After: const sharedNotifier = new NotificationService(config);

node -e "
const fs  = require('fs');
let src   = fs.readFileSync('$INDEX', 'utf8');
const tag = \`const sharedNotifier = new NotificationService(config);\`;
const add = \`const sharedNotifier = new NotificationService(config);

  // CCE Core Framework — Engine Registry (auto-detects engines/ folder)
  const engineRegistry = new EngineRegistry(config, sharedNotifier, null); // exchange wired below
  await engineRegistry.scan();\`;
if (src.includes('engineRegistry')) { console.log('   ⏭️  Registry scan already patched'); process.exit(0); }
src = src.replace(tag, add);
fs.writeFileSync('$INDEX', src);
console.log('   ✅ PATCH 2: engine registry scan added');
"

# ── PATCH 3: Build allEngines map + layer registry + G.O after all engines ───
# After: if (lceEngine) engines.push(lceEngine.start(...));

node -e "
const fs  = require('fs');
let src   = fs.readFileSync('$INDEX', 'utf8');
const tag = \`  if (lceEngine) engines.push(lceEngine.start(config.lce?.intervalMinutes || 5));\`;
const add = \`  if (lceEngine) engines.push(lceEngine.start(config.lce?.intervalMinutes || 5));

  // CCE Core Framework — build full engine map for registry consumers
  const allEngines = {
    crypto:   cryptoEngine,
    forex:    forexEngine,
    rme:      rmeEngine,
    cme:      cmeEngine,
    como:     comoEngine,
    grid:     gridEngine,
    mom:      momEngine,
    brk:      brkEngine,
    egp:      egpEngine,
    lce:      lceEngine,
    obs:      obsEngine,
    str:      strEngine,
    sentinel: sentinelEngine,
    ...engineRegistry.getAll()
  };

  // Layer Registry — auto-detects ai-layers/ folder
  const layerRegistry = new LayerRegistry(config, sharedNotifier, allEngines);
  await layerRegistry.scan();
  const layerPromises = layerRegistry.startAll();
  engines.push(...layerPromises);

  // Dynamic engines from engine registry
  const dynamicEngines = engineRegistry.startAll();
  engines.push(...dynamicEngines);

  // G.O Orchestrator — ADVISORY mode, dry run
  const goEnabled = config.go?.enabled === true;
  const goEngine  = goEnabled
    ? new CCEGOEngine(config, sharedNotifier, allEngines, layerRegistry)
    : null;
  if (goEnabled) {
    console.log(\\\`   🧠 G.O Orchestrator — \\\${config.go?.dryRun !== false ? 'ADVISORY | DRY RUN' : '⚠️  LIVE'}\\\`);
    engines.push(goEngine.start());
  }\`;
if (src.includes('allEngines')) { console.log('   ⏭️  Engine map already patched'); process.exit(0); }
src = src.replace(tag, add);
fs.writeFileSync('$INDEX', src);
console.log('   ✅ PATCH 3: allEngines + layerRegistry + G.O added');
"

# ── PATCH 4: Add to shutdown handler ─────────────────────────────────────────
# After: if (forexEngine) forexEngine.stop();

node -e "
const fs  = require('fs');
let src   = fs.readFileSync('$INDEX', 'utf8');
const tag = \`    if (forexEngine) forexEngine.stop();\`;
const add = \`    if (forexEngine) forexEngine.stop();
    if (goEngine) goEngine.stop();
    layerRegistry?.stopAll();
    engineRegistry?.stopAll();\`;
if (src.includes('layerRegistry?.stopAll')) { console.log('   ⏭️  Shutdown already patched'); process.exit(0); }
src = src.replace(tag, add);
fs.writeFileSync('$INDEX', src);
console.log('   ✅ PATCH 4: shutdown handlers added');
"

# ── PATCH 5: Pass exchange to engine registry after cryptoEngine is created ──

node -e "
const fs  = require('fs');
let src   = fs.readFileSync('$INDEX', 'utf8');
const tag = \`  const gridEngine     = gridEnabled ? new CCEGridEngine(config, sharedNotifier, cryptoEngine.exchange) : null;\`;
const add = \`  const gridEngine     = gridEnabled ? new CCEGridEngine(config, sharedNotifier, cryptoEngine.exchange) : null;
  engineRegistry.exchange = cryptoEngine.exchange; // wire exchange after crypto engine init\`;
if (src.includes('engineRegistry.exchange')) { console.log('   ⏭️  Exchange wire already patched'); process.exit(0); }
src = src.replace(tag, add);
fs.writeFileSync('$INDEX', src);
console.log('   ✅ PATCH 5: exchange wired to engine registry');
"

# ── VERIFY ────────────────────────────────────────────────────────────────────

echo ""
echo "🔍 Verifying patches..."
ERRORS=0

grep -q "EngineRegistry"           $INDEX && echo "   ✅ EngineRegistry require"    || { echo "   ❌ EngineRegistry require missing";    ERRORS=$((ERRORS+1)); }
grep -q "LayerRegistry"            $INDEX && echo "   ✅ LayerRegistry require"     || { echo "   ❌ LayerRegistry require missing";     ERRORS=$((ERRORS+1)); }
grep -q "CCEGOEngine"              $INDEX && echo "   ✅ CCEGOEngine require"       || { echo "   ❌ CCEGOEngine require missing";       ERRORS=$((ERRORS+1)); }
grep -q "engineRegistry.scan"      $INDEX && echo "   ✅ engineRegistry.scan()"    || { echo "   ❌ engineRegistry.scan() missing";    ERRORS=$((ERRORS+1)); }
grep -q "layerRegistry"            $INDEX && echo "   ✅ layerRegistry"            || { echo "   ❌ layerRegistry missing";            ERRORS=$((ERRORS+1)); }
grep -q "allEngines"               $INDEX && echo "   ✅ allEngines map"           || { echo "   ❌ allEngines map missing";           ERRORS=$((ERRORS+1)); }
grep -q "goEngine"                 $INDEX && echo "   ✅ G.O engine"              || { echo "   ❌ G.O engine missing";              ERRORS=$((ERRORS+1)); }
grep -q "layerRegistry?.stopAll"   $INDEX && echo "   ✅ shutdown handlers"       || { echo "   ❌ shutdown handlers missing";       ERRORS=$((ERRORS+1)); }

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ index.js fully wired"
  echo ""
  echo "  Smoke test:"
  echo "  node -e \"require('./index.js')\" 2>&1 | head -5"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  $ERRORS patch(es) failed — index.js.bak is your restore point"
  echo "  To restore: cp $INDEX.bak $INDEX"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
