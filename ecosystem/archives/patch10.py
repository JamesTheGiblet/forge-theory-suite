f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "console.log(`   💱 CCE Forex   — ${forexEnabled ? forexInterval+'H interval | '+(config.forex?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');",
  "console.log(`   💱 CCE Forex   — ${forexEnabled ? forexInterval+'H interval | '+(config.forex?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log(`   🏢 CCE REIT    — ${rmeEnabled ? rmeInterval+'H interval | '+(config.rme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
