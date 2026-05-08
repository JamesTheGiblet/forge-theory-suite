# Engine Registry
### Auto-loader for Dynamic CCE Engines

**Status:** 🟢 Active
**Source:** `src/engine-registry.js`
**Engines directory:** `engines/`

---

## Overview

The Engine Registry automatically discovers, loads, validates and starts any engine placed in the `/engines/` directory. No manual wiring required — drop a folder in, restart the bot, it runs.

---

## How It Works
/engines/
se-fear-fade/
manifest.json   ← Registry reads this first
engine.js       ← Must export a class
strategy.js
storage.js
On startup:
1. Registry scans `/engines/` for subfolders
2. Reads `manifest.json` from each
3. Validates manifest has all required fields
4. Requires `engine.js` and instantiates the class
5. Validates instance has required methods
6. Starts the engine at its configured interval

---

## manifest.json — Required Fields

```json
{
  "id":          "se-fear-fade",
  "name":        "S.E Fear Fade",
  "version":     "1.0.0",
  "type":        "STRATEGIC",
  "ecosystem":   "S.E",
  "cycle":       "4H",
  "capitalKey":  "fearFade",
  "author":      "James Gilbert — Giblets Creations",
  "description": "One line description",
  "requires": {
    "exchange": false,
    "notifier": true,
    "config":   true
  }
}
Field
Options
Notes
type
STRATEGIC, TACTICAL, OBSERVER
Engine classification
ecosystem
S.E, T.E, O.E
Which layer
cycle
1H, 4H, 24H, 5min
Display only
capitalKey
config.js key
Links to capital config
requires.exchange
true/false
If true, gets Kraken connector
engine.js — Required Interface
Every engine must implement:
class MyEngine {
  constructor(config, notifier)        // or (config, notifier, exchange)
  async start(intervalMinutes)         // main loop
  stop()                               // clean shutdown
  async runCycle()                     // one cycle of logic
  getStatus()                          // returns status object
  getState()                           // returns current state string
}
module.exports = MyEngine;
Registry API
const registry = new EngineRegistry(config, notifier, exchange);
await registry.scan();          // discover and load engines
registry.startAll();            // returns array of start() promises
registry.get('se-fear-fade');   // get engine instance by id
registry.getAll();              // get all instances as object
registry.getStatus();           // get status of all engines
registry.stopAll();             // stop all engines
Adding a New Engine
Create folder: engines/my-engine/
Add manifest.json with required fields
Add engine.js exporting the class
Add strategy.js and storage.js
Add config block to config.js
Restart cce-bot — engine auto-loads
No changes to index.js required.
Current Registry Engines (March 2026)
ID
Name
Type
Cycle
se-fear-fade
S.E Fear Fade
STRATEGIC
4H
se-alt-season
S.E Alt Season
STRATEGIC
4H
se-goldforge
S.E GoldForge
STRATEGIC
4H
se-underdog
S.E Underdog
STRATEGIC
4H
Prefixed Engines (not in registry)
These are hardcoded in index.js — older engines before the registry existed:
S.E Crypto, S.E Forex, S.E REIT, S.E Stocks, S.E Commodities, S.E EGP,
T.E Grid, T.E Momentum, T.E Breakout, T.E LCE,
O.E Observer, O.E Sentinel, O.E Strategist, G.O
Giblets Creations · v1.0 · March 2026
