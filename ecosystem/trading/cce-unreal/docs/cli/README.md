# CLI Reference

Two CLI tools ship with the CCE Unreal Platform:
- `cce` — engine management (local)
- `cce-deploy` — cloud deployment (remote)

---

## `cce` — Engine Management

### Installation

```bash
cd ~/cce-crypto
npm link
# cce is now available globally
```

---

### `cce new-engine <id>`

Scaffolds a new engine from the template.

```bash
cce new-engine se-bonds --type strategic --cycle 24H
cce new-engine te-scalper --type tactical --cycle 5min
cce new-engine oe-logger --type observer --cycle 15min
```

**Options:**

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--type` | `strategic` `tactical` `observer` | `tactical` | Engine type |
| `--cycle` | `5min` `15min` `1H` `4H` `24H` `Weekly` | `5min` | Cycle interval |
| `--capital` | any number | `100` | Starting capital in USDC |

**What it creates:**

```
engines/<id>/
  engine.js       — lifecycle, circuit breaker, three method stubs
  strategy.js     — FSM with four method stubs
  storage.js      — sql.js schema, all CRUD methods
  manifest.json   — filled with your id, name, type, ecosystem
  README.md       — documentation stub
```

**Also prints the config block** to paste into `config.js`:

```
seForex: {
  enabled:         true,
  dryRun:          true,
  capitalUSDC:     100,
  intervalMinutes: 240,
  maxDailyLoss:    0.03,
},
```

---

### `cce validate <id>`

Validates an engine against the interface contract.

```bash
cce validate se-forex
cce validate te-scalper
cce validate          # validates ALL engines in engines/
```

**Checks performed:**

```
manifest.json exists
manifest.json is valid JSON
id, name, version, type, ecosystem, cycle, capitalKey, author, description present
type is STRATEGIC, TACTICAL, or OBSERVER
ecosystem is S.E, T.E, or O.E
id is valid kebab-case
engine.js exists
engine.js has: start(), stop(), runCycle(), getStatus(), getState(), _sleep()
engine.js has dryRun property
strategy.js exists
storage.js exists
README.md exists (warning only)
```

**Exit codes:** `0` = all passed, `1` = one or more failed.

---

### `cce list`

Lists all registered engines and AI layers.

```bash
cce list
```

**Output:**

```
╔══════════════════════════════════════╗
║   ⚡ CCE Core Framework — CLI        ║
╚══════════════════════════════════════╝

  ENGINES (/home/user/cce-crypto/engines)

  ⚡ Se Forex (se-forex) — STRATEGIC · 4H
  ⚡ Te Scalper (te-scalper) — TACTICAL · 5min

  AI LAYERS (/home/user/cce-crypto/ai-layers)

  No layers found
```

---

### `cce new-layer <id>`

Scaffolds a new AI layer from the template.

```bash
cce new-layer pattern-detector
cce new-layer volatility-sentinel
```

**Creates:**

```
ai-layers/<id>/
  layer.js        — onPostCycle() and onTransition() stubs
  manifest.json   — pattern, hook, attaches_to fields
```

---

## `cce-deploy` — Cloud Deployment

### Installation

```bash
# Already in bin/ — should be available after npm link
cce-deploy help
```

If not found:
```bash
node ~/cce-crypto/bin/cce-deploy.js help
```

---

### `cce-deploy setup`

Interactive first-time configuration. Saves to `~/.cce-remote.json`.

```bash
cce-deploy setup
```

**Prompts:**

```
VPS hostname or IP: forge.gibletscreations.com
SSH username:       ubuntu
SSH key path:       ~/.ssh/forge_rsa
Remote CCE path:    /opt/cce-crypto
PM2 process name:   cce-bot
```

Config is saved to `~/.cce-remote.json` with permissions `600`.

---

### `cce-deploy push <id>`

Deploys an engine to the remote VPS.

```bash
cce-deploy push se-forex
cce-deploy push te-scalper
```

**Steps executed:**

```
1. Validate engine locally (cce validate)
2. Create timestamped backup on remote: engines/se-forex.backup.20260325-214500
3. rsync engine files to remote engines/ folder
4. pm2 restart <pm2-process> on remote
5. Verify manifest.json exists on remote after restart
```

The engine is in DRY RUN by default. Change `dryRun` in the remote `config.js` only after validating operation.

---

### `cce-deploy list`

Lists all dynamic engines on the remote VPS.

```bash
cce-deploy list
```

---

### `cce-deploy logs <id>`

Streams PM2 logs from the remote server filtered to a specific engine.

```bash
cce-deploy logs se-forex
```

Press `Ctrl+C` to stop.

---

### `cce-deploy stop <id>`

Disables an engine on the remote VPS without deleting it.

```bash
cce-deploy stop se-forex
```

Moves `engines/se-forex` to `engines/_disabled_se-forex`. Restarts PM2. The engine no longer loads. Reverse by moving the folder back.

---

### `cce-deploy rollback <id>`

Restores the most recent backup of an engine.

```bash
cce-deploy rollback se-forex
```

Finds the most recent `engines/se-forex.backup.*` folder on the remote, replaces current with backup, restarts PM2.

---

### `cce-deploy status`

Shows full remote platform status.

```bash
cce-deploy status
```

**Output:**

```
CCE Bot  ● ONLINE
CPU: 2%  MEM: 197MB  Restarts: 28

DYNAMIC ENGINES (1)

⚡ Se Forex (se-forex) — STRATEGIC · 4H
```

---

## Remote Configuration File

`~/.cce-remote.json` stores your VPS connection details:

```json
{
  "vps": {
    "host":       "forge.gibletscreations.com",
    "user":       "ubuntu",
    "key":        "/home/user/.ssh/forge_rsa",
    "path":       "/opt/cce-crypto",
    "pm2Process": "cce-bot"
  }
}
```

File permissions are automatically set to `600` (owner read/write only).

---

## Termux-Specific Notes

Termux blocks `/tmp` — all temporary files must go to `~/`:

```bash
# WRONG — will fail silently
printf '...' | cat - file.js > /tmp/output.js

# RIGHT
printf '...' | cat - file.js > ~/output.js && mv ~/output.js file.js
```

Heredoc strings with backticks inside single-quote EOF blocks can fail when pasted as multi-line commands. Write to a file with `cat >` first, then `bash` the file.

SSH and rsync must be installed:

```bash
pkg install openssh
# rsync is included with openssh on Termux
```
