#!/usr/bin/env node
// bin/cce.js
// CCE Core Framework — CLI Tool
//
// Usage:
//   cce new-engine <name> [--type strategic|tactical|observer] [--cycle 5min]
//   cce new-layer <name>
//   cce list
//   cce validate [engine-id]
//   cce status
//
// Install globally:
//   npm install -g .
//   cce new-engine te-myscalper --type tactical --cycle 5min
//
// Or run directly:
//   node bin/cce.js new-engine te-myscalper

'use strict';

const fs   = require('fs');
const path = require('path');

// ── PATHS ─────────────────────────────────────────────────────────────────────

const PROJECT_ROOT  = process.cwd();
const ENGINES_DIR   = path.join(PROJECT_ROOT, 'engines');
const LAYERS_DIR    = path.join(PROJECT_ROOT, 'ai-layers');
const TEMPLATE_DIR  = path.join(ENGINES_DIR, '_template');
const LAYER_TMPL    = path.join(LAYERS_DIR,  '_template');

// ── COLOURS ───────────────────────────────────────────────────────────────────

const C = {
  gold:   (s) => `\x1b[33m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  white:  (s) => `\x1b[97m${s}\x1b[0m`,
};

// ── BANNER ────────────────────────────────────────────────────────────────────

function banner() {
  console.log(C.gold(`
  ╔══════════════════════════════════════╗
  ║   ⚡ CCE Core Framework — CLI        ║
  ║   Giblets Creations · v1.0.0         ║
  ╚══════════════════════════════════════╝
`));
}

// ── HELP ──────────────────────────────────────────────────────────────────────

function help() {
  banner();
  console.log(`  ${C.bold('COMMANDS')}\n`);
  console.log(`  ${C.gold('cce new-engine')} ${C.cyan('<id>')} ${C.dim('[options]')}`);
  console.log(`    Scaffold a new engine from the template\n`);
  console.log(`  ${C.gold('cce new-layer')} ${C.cyan('<id>')}`);
  console.log(`    Scaffold a new AI layer from the template\n`);
  console.log(`  ${C.gold('cce list')}`);
  console.log(`    List all registered engines and layers\n`);
  console.log(`  ${C.gold('cce validate')} ${C.dim('[engine-id]')}`);
  console.log(`    Validate engine(s) against the interface contract\n`);
  console.log(`  ${C.bold('OPTIONS')}\n`);
  console.log(`  ${C.cyan('--type')}   ${C.dim('strategic | tactical | observer')}  ${C.dim('(default: tactical)')}`);
  console.log(`  ${C.cyan('--cycle')}  ${C.dim('5min | 1H | 4H | 24H | Weekly')}   ${C.dim('(default: 5min)')}`);
  console.log(`  ${C.cyan('--capital')} ${C.dim('100')}                              ${C.dim('(default: 100)')}\n`);
  console.log(`  ${C.bold('EXAMPLES')}\n`);
  console.log(`  ${C.dim('cce new-engine te-scalper --type tactical --cycle 5min')}`);
  console.log(`  ${C.dim('cce new-engine se-bonds --type strategic --cycle 24H')}`);
  console.log(`  ${C.dim('cce new-layer pattern-detector')}`);
  console.log(`  ${C.dim('cce validate te-scalper')}`);
  console.log(`  ${C.dim('cce list')}\n`);
}

// ── NEW ENGINE ────────────────────────────────────────────────────────────────

function newEngine(args) {
  const id = args[0];

  if (!id) {
    console.error(C.red('  ❌ Error: engine id required'));
    console.log(`  ${C.dim('Usage: cce new-engine <id> [--type tactical] [--cycle 5min]')}`);
    process.exit(1);
  }

  // Validate id format
  if (!/^[a-z0-9-]+$/.test(id)) {
    console.error(C.red(`  ❌ Invalid id: "${id}" — must be kebab-case (lowercase, hyphens only)`));
    console.log(`  ${C.dim('Examples: te-scalper, se-bonds, oe-logger')}`);
    process.exit(1);
  }

  // Parse options
  const type    = getArg(args, '--type',    'TACTICAL').toUpperCase();
  const cycle   = getArg(args, '--cycle',   '5min');
  const capital = getArg(args, '--capital', '100');

  const validTypes = ['STRATEGIC', 'TACTICAL', 'OBSERVER'];
  if (!validTypes.includes(type)) {
    console.error(C.red(`  ❌ Invalid type: ${type}. Must be: ${validTypes.join(', ')}`));
    process.exit(1);
  }

  // Derive ecosystem from type
  const ecosystem = type === 'STRATEGIC' ? 'S.E'
    : type === 'TACTICAL'  ? 'T.E'
    : 'O.E';

  // Derive display name
  const name = id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const targetDir = path.join(ENGINES_DIR, id);

  // Check template exists
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(C.red(`  ❌ Template not found at: ${TEMPLATE_DIR}`));
    console.log(`  ${C.dim('Make sure engines/_template/ exists in your project')}`);
    process.exit(1);
  }

  // Check target doesn't already exist
  if (fs.existsSync(targetDir)) {
    console.error(C.red(`  ❌ Engine already exists: ${targetDir}`));
    process.exit(1);
  }

  console.log(C.gold(`\n  ⚡ Creating engine: ${id}\n`));

  // Copy template
  copyDir(TEMPLATE_DIR, targetDir);

  // Update manifest.json
  const manifestPath = path.join(targetDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.id          = id;
  manifest.name        = name;
  manifest.type        = type;
  manifest.ecosystem   = ecosystem;
  manifest.cycle       = cycle;
  manifest.capitalKey  = toCamelCase(id);
  manifest.author      = '';
  manifest.description = `${name} engine — describe what this engine does.`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  ${C.green('✅')} manifest.json`);

  // Update engine.js — replace PREFIX and class name
  const enginePath = path.join(targetDir, 'engine.js');
  let engineSrc = fs.readFileSync(enginePath, 'utf8');
  const prefix = id.replace(/-/g, '-').toUpperCase().slice(0, 6);
  engineSrc = engineSrc
    .replace(/const PREFIX = 'TMPL'/g, `const PREFIX = '${prefix}'`)
    .replace(/class TemplateEngine/g, `class ${toPascalCase(id)}Engine`)
    .replace(/TemplateStrategy/g, `${toPascalCase(id)}Strategy`)
    .replace(/TemplateStorage/g,  `${toPascalCase(id)}Storage`)
    .replace(/config\.template/g, `config.${toCamelCase(id)}`)
    .replace(/require\('\.\/strategy'\)/g, `require('./strategy')`)
    .replace(/require\('\.\/storage'\)/g,  `require('./storage')`);
  fs.writeFileSync(enginePath, engineSrc);
  console.log(`  ${C.green('✅')} engine.js`);

  // Update strategy.js — replace class name
  const stratPath = path.join(targetDir, 'strategy.js');
  let stratSrc = fs.readFileSync(stratPath, 'utf8');
  stratSrc = stratSrc.replace(/class TemplateStrategy/g, `class ${toPascalCase(id)}Strategy`);
  fs.writeFileSync(stratPath, stratSrc);
  console.log(`  ${C.green('✅')} strategy.js`);

  // Update storage.js — replace class name
  const storagePath = path.join(targetDir, 'storage.js');
  let storageSrc = fs.readFileSync(storagePath, 'utf8');
  storageSrc = storageSrc
    .replace(/class TemplateStorage/g, `class ${toPascalCase(id)}Storage`)
    .replace(/template\.db/g, `${id}.db`);
  fs.writeFileSync(storagePath, storageSrc);
  console.log(`  ${C.green('✅')} storage.js`);

  // Update README.md
  const readmePath = path.join(targetDir, 'README.md');
  let readmeSrc = fs.readFileSync(readmePath, 'utf8');
  readmeSrc = readmeSrc.replace(/Engine Template/g, `${name}`);
  fs.writeFileSync(readmePath, readmeSrc);
  console.log(`  ${C.green('✅')} README.md`);

  // Print config block to add
  const camel = toCamelCase(id);
  console.log(`
  ${C.gold('✅ Engine created:')} ${targetDir}

  ${C.bold('Next steps:')}

  ${C.cyan('1.')} Add this block to ${C.dim('config.js')}:

     ${C.dim(`${camel}: {`)}
     ${C.dim(`  enabled:         true,`)}
     ${C.dim(`  dryRun:          true,`)}
     ${C.dim(`  capitalUSDC:     ${capital},`)}
     ${C.dim(`  intervalMinutes: ${cycleToMinutes(cycle)},`)}
     ${C.dim(`  maxDailyLoss:    0.03,`)}
     ${C.dim(`},`)}

  ${C.cyan('2.')} Implement ${C.dim('_fetchData()')} in ${C.dim(`engines/${id}/engine.js`)}
  ${C.cyan('3.')} Implement ${C.dim('_evaluateSignals()')} in ${C.dim(`engines/${id}/engine.js`)}
  ${C.cyan('4.')} Implement ${C.dim('_executeDecision()')} in ${C.dim(`engines/${id}/engine.js`)}
  ${C.cyan('5.')} Implement FSM methods in ${C.dim(`engines/${id}/strategy.js`)}
  ${C.cyan('6.')} Run ${C.gold('cce validate ' + id)} to check the contract
  ${C.cyan('7.')} Run in dry run for 7+ cycles before going live

  ${C.dim('"I wanted it. So I forged it. Now forge yours."')}
`);
}

// ── NEW LAYER ─────────────────────────────────────────────────────────────────

function newLayer(args) {
  const id = args[0];

  if (!id) {
    console.error(C.red('  ❌ Error: layer id required'));
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    console.error(C.red(`  ❌ Invalid id: "${id}" — must be kebab-case`));
    process.exit(1);
  }

  const targetDir = path.join(LAYERS_DIR, id);

  if (!fs.existsSync(LAYERS_DIR)) {
    fs.mkdirSync(LAYERS_DIR, { recursive: true });
  }

  if (fs.existsSync(targetDir)) {
    console.error(C.red(`  ❌ Layer already exists: ${targetDir}`));
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  // Create manifest
  const manifest = {
    id,
    name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    version: '1.0.0',
    attaches_to: ['S.E', 'T.E'],
    hook: 'post_cycle',
    author: '',
    description: `${id} AI layer — describe what this layer does.`
  };
  fs.writeFileSync(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create layer.js stub
  const layerSrc = `// ai-layers/${id}/layer.js
// CCE Core Framework — AI Layer
// Hook: ${manifest.hook}
// Attaches to: ${manifest.attaches_to.join(', ')}

'use strict';

class ${toPascalCase(id)}Layer {

  constructor(config, notifier) {
    this.config   = config;
    this.notifier = notifier;
  }

  // Called after each engine cycle with the cycle output
  async onPostCycle(engineId, status, cycleData) {
    // Read engine data — never modify engine state directly
    // Write recommendations to shared store if needed
    throw new Error('onPostCycle() not implemented');
  }

  // Called on every state transition
  async onTransition(engineId, from, to, signals) {
    throw new Error('onTransition() not implemented');
  }

}

module.exports = ${toPascalCase(id)}Layer;
`;
  fs.writeFileSync(path.join(targetDir, 'layer.js'), layerSrc);

  console.log(`\n  ${C.green('✅')} AI layer created: ${targetDir}`);
  console.log(`  ${C.dim('Implement onPostCycle() and onTransition() in layer.js\n')}`);
}

// ── LIST ──────────────────────────────────────────────────────────────────────

function list() {
  banner();

  // Engines
  console.log(`  ${C.bold('ENGINES')} ${C.dim('(' + ENGINES_DIR + ')')}\n`);

  if (!fs.existsSync(ENGINES_DIR)) {
    console.log(`  ${C.dim('No engines directory found')}\n`);
  } else {
    const folders = fs.readdirSync(ENGINES_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => e.name);

    if (folders.length === 0) {
      console.log(`  ${C.dim('No engines found')}\n`);
    } else {
      for (const folder of folders) {
        const manifestPath = path.join(ENGINES_DIR, folder, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`  ${C.gold('⚡')} ${C.white(m.name)} ${C.dim(`(${m.id})`)} — ${C.cyan(m.type)} · ${m.cycle}`);
        } else {
          console.log(`  ${C.red('❌')} ${folder} ${C.dim('(no manifest.json)')}`);
        }
      }
      console.log('');
    }
  }

  // AI Layers
  console.log(`  ${C.bold('AI LAYERS')} ${C.dim('(' + LAYERS_DIR + ')')}\n`);

  if (!fs.existsSync(LAYERS_DIR)) {
    console.log(`  ${C.dim('No ai-layers directory found')}\n`);
  } else {
    const layers = fs.readdirSync(LAYERS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => e.name);

    if (layers.length === 0) {
      console.log(`  ${C.dim('No layers found')}\n`);
    } else {
      for (const folder of layers) {
        const manifestPath = path.join(LAYERS_DIR, folder, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`  ${C.cyan('🧠')} ${C.white(m.name)} ${C.dim(`(${m.id})`)} — hook: ${m.hook}`);
        } else {
          console.log(`  ${C.red('❌')} ${folder} ${C.dim('(no manifest.json)')}`);
        }
      }
      console.log('');
    }
  }
}

// ── VALIDATE ──────────────────────────────────────────────────────────────────

function validate(args) {
  const targetId = args[0]; // optional — validate all if not specified

  if (!fs.existsSync(ENGINES_DIR)) {
    console.error(C.red('  ❌ No engines directory found'));
    process.exit(1);
  }

  const folders = fs.readdirSync(ENGINES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name)
    .filter(f => !targetId || f === targetId);

  if (folders.length === 0) {
    console.log(targetId
      ? C.red(`  ❌ Engine not found: ${targetId}`)
      : C.dim('  No engines to validate'));
    return;
  }

  console.log(C.gold(`\n  ⚡ Validating ${folders.length} engine(s)\n`));

  let passed = 0;
  let failed = 0;

  for (const folder of folders) {
    const errors = validateEngine(folder);
    if (errors.length === 0) {
      console.log(`  ${C.green('✅')} ${folder} — all checks passed`);
      passed++;
    } else {
      console.log(`  ${C.red('❌')} ${folder}:`);
      errors.forEach(e => console.log(`     ${C.red('·')} ${e}`));
      failed++;
    }
  }

  console.log(`\n  ${C.bold('Result:')} ${C.green(passed + ' passed')} · ${failed > 0 ? C.red(failed + ' failed') : C.dim(failed + ' failed')}\n`);

  if (failed > 0) process.exit(1);
}

function validateEngine(folder) {
  const errors = [];
  const engineDir = path.join(ENGINES_DIR, folder);

  // manifest.json
  const manifestPath = path.join(engineDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push('missing manifest.json');
    return errors;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push(`invalid manifest.json: ${e.message}`);
    return errors;
  }

  const required = ['id', 'name', 'version', 'type', 'ecosystem', 'cycle', 'capitalKey', 'author', 'description'];
  required.forEach(f => { if (!manifest[f]) errors.push(`manifest missing: ${f}`); });

  if (!['STRATEGIC', 'TACTICAL', 'OBSERVER'].includes(manifest.type))
    errors.push(`invalid type: ${manifest.type}`);

  if (!['S.E', 'T.E', 'O.E'].includes(manifest.ecosystem))
    errors.push(`invalid ecosystem: ${manifest.ecosystem}`);

  if (!/^[a-z0-9-]+$/.test(manifest.id))
    errors.push(`invalid id format: ${manifest.id}`);

  // engine.js
  const enginePath = path.join(engineDir, 'engine.js');
  if (!fs.existsSync(enginePath)) {
    errors.push('missing engine.js');
    return errors;
  }

  const engineSrc = fs.readFileSync(enginePath, 'utf8');
  const requiredMethods = ['start(', 'stop(', 'runCycle(', 'getStatus(', 'getState(', '_sleep('];
  requiredMethods.forEach(m => {
    if (!engineSrc.includes(m)) errors.push(`engine.js missing method: ${m})`);
  });

  if (!engineSrc.includes('dryRun'))
    errors.push('engine.js missing dryRun property');

  if (engineSrc.includes("dryRun = false") && !engineSrc.includes("!== false"))
    errors.push('engine.js defaults to live trading — must default to dryRun: true');

  // strategy.js
  if (!fs.existsSync(path.join(engineDir, 'strategy.js')))
    errors.push('missing strategy.js');

  // storage.js
  if (!fs.existsSync(path.join(engineDir, 'storage.js')))
    errors.push('missing storage.js');

  // README.md
  if (!fs.existsSync(path.join(engineDir, 'README.md')))
    errors.push('missing README.md (recommended)');

  return errors;
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getArg(args, flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

function toCamelCase(id) {
  return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toPascalCase(id) {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function cycleToMinutes(cycle) {
  const lower = cycle.toLowerCase();
  if (lower.includes('min')) return parseInt(lower) || 5;
  if (lower.includes('h'))   return (parseInt(lower) || 1) * 60;
  if (lower.includes('week')) return 10080;
  return 60;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

const [,, command, ...args] = process.argv;

switch (command) {
  case 'new-engine': newEngine(args); break;
  case 'new-layer':  newLayer(args);  break;
  case 'list':       list();          break;
  case 'validate':   validate(args);  break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:    help();          break;
  default:
    console.error(C.red(`  ❌ Unknown command: ${command}`));
    console.log(`  Run ${C.gold('cce help')} for usage`);
    process.exit(1);
}
