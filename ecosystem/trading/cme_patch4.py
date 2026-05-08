f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const rmeInterval    = config.rme?.intervalHours || 24;",
  "const rmeInterval    = config.rme?.intervalHours || 24;\n  const cmeInterval    = config.cme?.intervalHours || 24;"
)
c = c.replace(
  "console.log(`   🏢 CCE REIT    — ${rmeEnabled ? rmeInterval+'H interval | '+(config.rme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');",
  "console.log(`   🏢 CCE REIT    — ${rmeEnabled ? rmeInterval+'H interval | '+(config.rme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log(`   📊 CCE Stocks  — ${cmeEnabled ? cmeInterval+'H interval | '+(config.cme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');"
)
c = c.replace(
  "if (rmeEngine) engines.push(rmeEngine.start(rmeInterval));",
  "if (rmeEngine) engines.push(rmeEngine.start(rmeInterval));\n  if (cmeEngine) engines.push(cmeEngine.start(cmeInterval));"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
