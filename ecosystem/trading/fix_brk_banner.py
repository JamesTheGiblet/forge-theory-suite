f = open('index.js', 'r')
c = f.read()
f.close()

c = c.replace(
    "  const brkEnabled = config.brk?.enabled === true;\n  const brkEngine",
    "  const brkEnabled = config.brk?.enabled === true;\n  console.log(`   💥 T.E Breakout  — ${brkEnabled ? '60min interval | '+(config.brk?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);\n  const brkEngine"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
