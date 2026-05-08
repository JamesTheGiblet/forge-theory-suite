with open('/data/data/com.termux/files/home/cce-crypto/src/strategy.js', 'r') as f:
    src = f.read()

# The strategy rebalance function takes context — we need to pass positionMultiplier
# Inject it into the rebalance call by modifying targetVal calculation

old_target = "      const targetVal     = totalValueUSD * targetPct;"
new_target = "      const targetVal     = totalValueUSD * targetPct * (this.positionMultiplier || 1.0);"

if old_target in src:
    src = src.replace(old_target, new_target, 1)
    print('Position multiplier applied to targetVal')
else:
    print('targetVal NOT FOUND')

with open('/data/data/com.termux/files/home/cce-crypto/src/strategy.js', 'w') as f:
    f.write(src)

print('done')
