f = open('src/cce-obs-engine.js', 'r')
c = f.read()
f.close()

# After logging the 96th observation pattern analysis, auto-enable the Strategist
old = """      // Run pattern analysis every N observations
      if (this.obsCount % this.patternInterval === 0) {
        await this._analysePatterns();
      }"""

new = """      // Run pattern analysis every N observations
      if (this.obsCount % this.patternInterval === 0) {
        await this._analysePatterns();
        // Auto-enable Strategist after first pattern analysis
        if (this.obsCount === this.patternInterval) {
          await this._enableStrategist();
        }
      }"""

c = c.replace(old, new)

# Add the _enableStrategist method before _sleep
old = """  _sleep(ms) {"""

new = """  async _enableStrategist() {
    try {
      const fs     = require('fs');
      const path   = require('path');
      const cfgPath = path.join(__dirname, '..', 'config.js');
      let cfg = fs.readFileSync(cfgPath, 'utf8');

      if (cfg.includes('enabled:         false,  // Enable after Observer')) {
        cfg = cfg.replace(
          'enabled:         false,  // Enable after Observer has 96+ observations (~24h)',
          'enabled:         true,   // Auto-enabled by Observer after 96 observations'
        );
        fs.writeFileSync(cfgPath, cfg);
        console.log('[OBS] ✅ Strategist auto-enabled in config.js');

        await this.notifier.send([
          '<b>[OBS] 🧠 Strategist Auto-Enabled</b>',
          '',
          'Observer has reached 96 observations.',
          'O.E Strategist is now enabled in config.',
          '',
          'Restart cce-bot to activate the Strategist:',
          '<code>pm2 restart cce-bot</code>',
          '',
          'Then use /help in Telegram to see available commands.'
        ].join('\\n'), 'info');
      }
    } catch (err) {
      console.error('[OBS] ❌ Auto-enable Strategist failed:', err.message);
    }
  }

  _sleep(ms) {"""

c = c.replace(old, new)

f = open('src/cce-obs-engine.js', 'w')
f.write(c)
f.close()
print('done')
