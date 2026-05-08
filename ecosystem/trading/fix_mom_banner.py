f = open('index.js', 'r')
c = f.read()
f.close()

c = c.replace(
    "  const momEnabled = config.mom?.enabled === true;\n  const momEngine",
    "  const momEnabled = config.mom?.enabled === true;\n  console.log(`   🚀 T.E Momentum — ${momEnabled ? '120min interval | '+(config.mom?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);\n  const momEngine"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
