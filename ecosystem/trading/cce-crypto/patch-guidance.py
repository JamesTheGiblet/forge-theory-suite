with open('/data/data/com.termux/files/home/cce-crypto/src/cce-engine.js', 'r') as f:
    src = f.read()

# 1. Add require at top
old_require = "const CCEOBSEngine        = require('./src/cce-obs-engine');"
if "guidance-layer" not in src:
    # Add require near top of cce-engine.js
    old_top = "'use strict';"
    new_top = "'use strict';\nconst { getGuidanceInfluence } = require('../guidance-layer');"
    if old_top in src:
        src = src.replace(old_top, new_top, 1)
        print('Added require')
    else:
        print('Could not find use strict')

# 2. Inject guidance at start of runCycle()
old_cycle = """  async runCycle() {
    try {
      this.runCount++;"""

new_cycle = """  async runCycle() {
    try {
      this.runCount++;
      // ── GUIDANCE LAYER ─────────────────────────────────────────────────────
      const guidance = await getGuidanceInfluence(3000);
      const { positionMultiplier, circuitBreakerAdjust, sentimentBias } = guidance.multipliers;"""

if old_cycle in src:
    src = src.replace(old_cycle, new_cycle, 1)
    print('Injected guidance into runCycle')
else:
    print('runCycle target NOT FOUND')

# 3. Apply circuit breaker adjustment
old_cb = "      const circuitBreakerThreshold = this.config.trading?.circuitBreakerPct || -20;"
new_cb = "      const circuitBreakerThreshold = (this.config.trading?.circuitBreakerPct || -20) + circuitBreakerAdjust;"
if old_cb in src:
    src = src.replace(old_cb, new_cb, 1)
    print('Applied circuit breaker adjustment')
else:
    print('Circuit breaker target NOT FOUND')

# 4. Apply sentiment bias
old_sent = "        fearGreedIndex:   sentimentScore,"
new_sent = "        fearGreedIndex:   Math.min(100, Math.max(0, sentimentScore + (sentimentBias * 100))),"
if old_sent in src:
    src = src.replace(old_sent, new_sent, 1)
    print('Applied sentiment bias')
else:
    print('Sentiment target NOT FOUND')

with open('/data/data/com.termux/files/home/cce-crypto/src/cce-engine.js', 'w') as f:
    f.write(src)

print('done')
