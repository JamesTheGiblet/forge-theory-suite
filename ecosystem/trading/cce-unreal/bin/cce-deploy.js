#!/usr/bin/env node
// bin/cce-deploy.js
// CCE Core Framework — Cloud Deploy CLI
// Layer 4 of the CCE Platform
//
// Usage:
//   cce-deploy setup                           — configure VPS connection
//   cce-deploy list                            — list engines on remote VPS
//   cce-deploy push <engine-id>                — deploy engine to VPS
//   cce-deploy logs <engine-id>                — tail remote PM2 logs
//   cce-deploy stop <engine-id>                — stop remote engine
//   cce-deploy rollback <engine-id>            — restore previous version
//   cce-deploy status                          — full remote platform status
//
// Requires: ssh, rsync (available on Termux via pkg install openssh rsync)
// Config:   ~/.cce-remote.json

'use strict';

const fs      = require('fs');
const path    = require('path');
const { execSync, spawn } = require('child_process');

// ── PATHS ─────────────────────────────────────────────────────────────────────

const PROJECT_ROOT  = process.cwd();
const ENGINES_DIR   = path.join(PROJECT_ROOT, 'engines');
const CONFIG_FILE   = path.join(process.env.HOME || '~', '.cce-remote.json');

// ── COLOURS ───────────────────────────────────────────────────────────────────

const C = {
  gold:  s => `\x1b[33m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  red:   s => `\x1b[31m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
  bold:  s => `\x1b[1m${s}\x1b[0m`,
};

// ── BANNER ────────────────────────────────────────────────────────────────────

function banner() {
  console.log(C.gold(`
  ╔══════════════════════════════════════╗
  ║   ⚡ CCE Cloud Deploy — CLI          ║
  ║   Giblets Creations · v1.0.0         ║
  ╚══════════════════════════════════════╝
`));
}

// ── LOAD / SAVE CONFIG ────────────────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch (e) { return null; }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  fs.chmodSync(CONFIG_FILE, 0o600);
}

function requireConfig() {
  const cfg = loadConfig();
  if (!cfg) {
    console.error(C.red('  ❌ No remote configured. Run: cce-deploy setup'));
    process.exit(1);
  }
  return cfg;
}

// ── SETUP ─────────────────────────────────────────────────────────────────────

function setup() {
  banner();
  console.log(C.gold('  Configuring VPS connection...\n'));

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = q => new Promise(resolve => rl.question(C.cyan(`  ${q}: `), resolve));

  (async () => {
    const host = await ask('VPS hostname or IP (e.g. forge.gibletscreations.com)');
    const user = await ask('SSH username (e.g. forge)');
    const key  = await ask('SSH key path (e.g. ~/.ssh/forge_rsa)');
    const rpath = await ask('Remote CCE path (e.g. /opt/cce-crypto)');
    const pm2  = await ask('PM2 process name (e.g. cce-bot)');
    rl.close();

    const cfg = {
      vps: { host, user, key: key.replace('~', process.env.HOME), path: rpath, pm2Process: pm2 }
    };
    saveConfig(cfg);

    console.log(`\n  ${C.green('✅')} Config saved to ${CONFIG_FILE}`);
    console.log(`  ${C.dim('Testing connection...')}`);

    try {
      const out = ssh(cfg, 'echo CCE_REMOTE_OK', true);
      if (out.includes('CCE_REMOTE_OK')) {
        console.log(`  ${C.green('✅')} Connection successful`);
      }
    } catch (err) {
      console.log(`  ${C.red('⚠️  Connection test failed:')} ${err.message}`);
      console.log(`  ${C.dim('Check your SSH key and hostname')}`);
    }
  })();
}

// ── PUSH (DEPLOY) ─────────────────────────────────────────────────────────────

async function push(engineId) {
  if (!engineId) {
    console.error(C.red('  ❌ Engine ID required: cce-deploy push <engine-id>'));
    process.exit(1);
  }

  const cfg = requireConfig();
  const engineDir = path.join(ENGINES_DIR, engineId);

  if (!fs.existsSync(engineDir)) {
    console.error(C.red(`  ❌ Engine not found: ${engineDir}`));
    console.log(`  ${C.dim('Run: cce new-engine ' + engineId)}`);
    process.exit(1);
  }

  // Read manifest
  const manifestPath = path.join(engineDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(C.red(`  ❌ No manifest.json in ${engineDir}`));
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  banner();
  console.log(C.gold(`  Deploying ${manifest.name} → ${cfg.vps.host}\n`));

  // Step 1: Validate locally
  process.stdout.write(`  ${C.cyan('1.')} Validating engine...`);
  const errors = validateEngine(engineDir);
  if (errors.length > 0) {
    console.log(C.red(' FAILED'));
    errors.forEach(e => console.log(`     ${C.red('·')} ${e}`));
    process.exit(1);
  }
  console.log(C.green(' ✅'));

  // Step 2: Create remote backup
  process.stdout.write(`  ${C.cyan('2.')} Creating remote backup...`);
  try {
    ssh(cfg, `
      REMOTE="${cfg.vps.path}/engines/${engineId}"
      BACKUP="${cfg.vps.path}/engines/${engineId}.backup.$(date +%Y%m%d-%H%M%S)"
      if [ -d "$REMOTE" ]; then cp -r "$REMOTE" "$BACKUP"; fi
    `, true);
    console.log(C.green(' ✅'));
  } catch (e) {
    console.log(C.dim(` (skipped — ${e.message})`));
  }

  // Step 3: rsync engine files to VPS
  process.stdout.write(`  ${C.cyan('3.')} Uploading engine files...`);
  try {
    const remote = `${cfg.vps.user}@${cfg.vps.host}:${cfg.vps.path}/engines/`;
    rsync(cfg, engineDir + '/', remote + engineId + '/', [
      '--exclude=*.db',
      '--exclude=*.log',
      '--exclude=node_modules'
    ]);
    console.log(C.green(' ✅'));
  } catch (e) {
    console.log(C.red(' FAILED: ' + e.message));
    process.exit(1);
  }

  // Step 4: Restart PM2 on remote
  process.stdout.write(`  ${C.cyan('4.')} Restarting CCE on VPS...`);
  try {
    ssh(cfg, `pm2 restart ${cfg.vps.pm2Process} --update-env`, true);
    console.log(C.green(' ✅'));
  } catch (e) {
    console.log(C.red(' FAILED: ' + e.message));
  }

  // Step 5: Verify engine appears in remote registry
  process.stdout.write(`  ${C.cyan('5.')} Verifying deployment...`);
  await sleep(3000); // wait for restart
  try {
    const out = ssh(cfg, `ls ${cfg.vps.path}/engines/${engineId}/manifest.json`, true);
    if (out.includes('manifest.json')) {
      console.log(C.green(' ✅'));
    } else {
      console.log(C.red(' ❌'));
    }
  } catch (e) {
    console.log(C.dim(' (cannot verify)'));
  }

  // Done
  console.log(`
  ${C.gold('✅ Deployed successfully')}

  ${C.bold(manifest.name)} is now running on ${C.cyan(cfg.vps.host)}
  ${C.dim('Mode: DRY RUN (change config.js on VPS to go live)')}

  ${C.dim('Monitor:')}  cce-deploy logs ${engineId}
  ${C.dim('Status:')}   cce-deploy status
  ${C.dim('Rollback:')} cce-deploy rollback ${engineId}
`);
}

// ── LOGS ─────────────────────────────────────────────────────────────────────

function logs(engineId) {
  if (!engineId) { console.error(C.red('  ❌ Engine ID required')); process.exit(1); }
  const cfg = requireConfig();
  console.log(C.gold(`  Tailing logs for ${engineId} on ${cfg.vps.host}...\n`));
  console.log(C.dim('  (Press Ctrl+C to stop)\n'));
  // Stream PM2 logs filtered by engine prefix
  const proc = sshStream(cfg, `pm2 logs ${cfg.vps.pm2Process} --lines 50 --nocolor 2>&1 | grep -i "${engineId}\\|\\[${engineId.split('-').pop().toUpperCase()}\\]"`);
  proc.stdout.on('data', d => process.stdout.write(d));
  proc.stderr.on('data', d => process.stderr.write(d));
}

// ── STOP ─────────────────────────────────────────────────────────────────────

function stop(engineId) {
  if (!engineId) { console.error(C.red('  ❌ Engine ID required')); process.exit(1); }
  const cfg = requireConfig();
  console.log(C.gold(`  Stopping ${engineId} on ${cfg.vps.host}...`));
  // Disable in remote config
  try {
    ssh(cfg, `
      cd ${cfg.vps.path}
      node -e "
        const fs = require('fs');
        const c = JSON.parse(fs.readFileSync('config.js'.replace('module.exports=','').trim()));
      " 2>/dev/null || echo "manual config edit required"
    `, true);
    // Move engine out of engines/ so registry won't pick it up on next restart
    ssh(cfg, `mv ${cfg.vps.path}/engines/${engineId} ${cfg.vps.path}/engines/_disabled_${engineId} && pm2 restart ${cfg.vps.pm2Process}`, true);
    console.log(C.green(`  ✅ ${engineId} disabled. Restart to re-enable.`));
  } catch (e) {
    console.error(C.red(`  ❌ ${e.message}`));
  }
}

// ── ROLLBACK ─────────────────────────────────────────────────────────────────

function rollback(engineId) {
  if (!engineId) { console.error(C.red('  ❌ Engine ID required')); process.exit(1); }
  const cfg = requireConfig();
  console.log(C.gold(`  Rolling back ${engineId} on ${cfg.vps.host}...`));
  try {
    const out = ssh(cfg, `ls -t ${cfg.vps.path}/engines/${engineId}.backup.* 2>/dev/null | head -1`, true);
    const backup = out.trim();
    if (!backup) {
      console.log(C.red('  ❌ No backup found'));
      process.exit(1);
    }
    ssh(cfg, `
      rm -rf ${cfg.vps.path}/engines/${engineId}
      cp -r ${backup} ${cfg.vps.path}/engines/${engineId}
      pm2 restart ${cfg.vps.pm2Process}
    `, true);
    console.log(C.green(`  ✅ Rolled back to ${path.basename(backup)}`));
  } catch (e) {
    console.error(C.red(`  ❌ ${e.message}`));
  }
}

// ── STATUS ────────────────────────────────────────────────────────────────────

function status() {
  const cfg = requireConfig();
  banner();
  console.log(C.gold(`  Remote Status — ${cfg.vps.host}\n`));

  try {
    // PM2 status
    const pm2out = ssh(cfg, `pm2 jlist 2>/dev/null`, true);
    const procs  = JSON.parse(pm2out);
    const cceProc = procs.find(p => p.name === cfg.vps.pm2Process);
    if (cceProc) {
      const mem  = Math.round(cceProc.monit?.memory / 1024 / 1024);
      const cpu  = cceProc.monit?.cpu || 0;
      const stat = cceProc.pm2_env?.status || 'unknown';
      const restarts = cceProc.pm2_env?.restart_time || 0;
      console.log(`  ${C.bold('CCE Bot')}  ${stat === 'online' ? C.green('● ONLINE') : C.red('● OFFLINE')}`);
      console.log(`  ${C.dim('CPU:')} ${cpu}%  ${C.dim('MEM:')} ${mem}MB  ${C.dim('Restarts:')} ${restarts}\n`);
    }

    // List engines
    const engines = ssh(cfg, `ls ${cfg.vps.path}/engines/ 2>/dev/null | grep -v _template | grep -v _disabled`, true);
    const engineList = engines.trim().split('\n').filter(Boolean);

    if (engineList.length > 0) {
      console.log(`  ${C.bold('DYNAMIC ENGINES')} (${engineList.length})\n`);
      engineList.forEach(id => {
        const mPath = `${cfg.vps.path}/engines/${id}/manifest.json`;
        try {
          const m = JSON.parse(ssh(cfg, `cat ${mPath}`, true));
          console.log(`  ${C.gold('⚡')} ${m.name} ${C.dim(`(${m.id})`)} — ${m.type} · ${m.cycle}`);
        } catch (e) {
          console.log(`  ${C.dim('·')} ${id}`);
        }
      });
    } else {
      console.log(`  ${C.dim('No dynamic engines deployed')}`);
    }
    console.log('');

  } catch (e) {
    console.error(C.red(`  ❌ Could not connect: ${e.message}`));
  }
}

// ── LIST ─────────────────────────────────────────────────────────────────────

function list() {
  const cfg = requireConfig();
  try {
    const engines = ssh(cfg, `ls ${cfg.vps.path}/engines/ 2>/dev/null | grep -v _template`, true);
    const engineList = engines.trim().split('\n').filter(Boolean);
    banner();
    console.log(C.gold(`  Remote Engines — ${cfg.vps.host}\n`));
    if (engineList.length === 0) {
      console.log(C.dim('  No dynamic engines deployed\n'));
    } else {
      engineList.forEach(id => {
        const disabled = id.startsWith('_disabled_');
        const label = disabled ? C.dim(`  ○ ${id.replace('_disabled_', '')} (disabled)`) : `  ${C.gold('⚡')} ${id}`;
        console.log(label);
      });
    }
    console.log('');
  } catch (e) {
    console.error(C.red(`  ❌ ${e.message}`));
  }
}

// ── SSH / RSYNC HELPERS ───────────────────────────────────────────────────────

function ssh(cfg, cmd, capture = false) {
  const { host, user, key } = cfg.vps;
  const keyArg = key ? `-i ${key}` : '';
  const sshCmd = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${keyArg} ${user}@${host} "${cmd.replace(/"/g, '\\"')}"`;
  if (capture) {
    return execSync(sshCmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
  }
  execSync(sshCmd, { stdio: 'inherit' });
}

function sshStream(cfg, cmd) {
  const { host, user, key } = cfg.vps;
  const keyArg = key ? ['-i', key] : [];
  return spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ConnectTimeout=10',
    ...keyArg,
    `${user}@${host}`,
    cmd
  ], { stdio: ['pipe','pipe','pipe'] });
}

function rsync(cfg, src, dest, exclude = []) {
  const { key } = cfg.vps;
  const keyArg  = key ? `-e "ssh -i ${key} -o StrictHostKeyChecking=no"` : '';
  const excludes = exclude.map(e => `--exclude="${e}"`).join(' ');
  execSync(`rsync -avz --delete ${keyArg} ${excludes} "${src}" "${dest}"`,
    { stdio: ['pipe','pipe','pipe'], encoding: 'utf8' });
}

// ── VALIDATION ────────────────────────────────────────────────────────────────

function validateEngine(engineDir) {
  const errors = [];
  const manifestPath = path.join(engineDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) { errors.push('missing manifest.json'); return errors; }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (e) { errors.push('invalid manifest.json'); return errors; }
  ['id','name','version','type','ecosystem','cycle','capitalKey','author','description']
    .forEach(f => { if (!manifest[f]) errors.push(`manifest missing: ${f}`); });
  if (!fs.existsSync(path.join(engineDir, 'engine.js')))   errors.push('missing engine.js');
  if (!fs.existsSync(path.join(engineDir, 'strategy.js'))) errors.push('missing strategy.js');
  if (!fs.existsSync(path.join(engineDir, 'storage.js')))  errors.push('missing storage.js');
  return errors;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── MAIN ─────────────────────────────────────────────────────────────────────

const [,, command, ...args] = process.argv;

switch (command) {
  case 'setup':    setup();           break;
  case 'push':     push(args[0]);     break;
  case 'list':     list();            break;
  case 'logs':     logs(args[0]);     break;
  case 'stop':     stop(args[0]);     break;
  case 'rollback': rollback(args[0]); break;
  case 'status':   status();          break;
  case 'help':
  case '--help':
  case undefined:
    banner();
    console.log(`  ${C.bold('COMMANDS')}\n`);
    console.log(`  ${C.gold('cce-deploy setup')}              — configure VPS connection`);
    console.log(`  ${C.gold('cce-deploy push')} ${C.cyan('<engine-id>')} — deploy engine to VPS`);
    console.log(`  ${C.gold('cce-deploy list')}               — list remote engines`);
    console.log(`  ${C.gold('cce-deploy logs')} ${C.cyan('<engine-id>')} — tail remote logs`);
    console.log(`  ${C.gold('cce-deploy stop')} ${C.cyan('<engine-id>')} — disable remote engine`);
    console.log(`  ${C.gold('cce-deploy rollback')} ${C.cyan('<id>')}   — restore previous version`);
    console.log(`  ${C.gold('cce-deploy status')}             — full remote platform status`);
    console.log(`\n  ${C.dim('Install: npm install -g . && cce-deploy setup\n')}`);
    break;
  default:
    console.error(C.red(`  ❌ Unknown command: ${command}`));
    process.exit(1);
}
