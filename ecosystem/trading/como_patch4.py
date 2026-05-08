f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const cmeInterval    = config.cme?.intervalHours || 24;",
  "const cmeInterval    = config.cme?.intervalHours || 24;\n  const comoInterval   = config.como?.intervalHours || 24;"
)
c = c.replace(
  "console.log(`   📊 CCE Stocks  — ${cmeEnabled ? cmeInterval+'H interval | '+(config.cme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');",
  "console.log(`   📊 CCE Stocks  — ${cmeEnabled ? cmeInterval+'H interval | '+(config.cme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log(`   🛢️  CCE Commod  — ${comoEnabled ? comoInterval+'H interval | '+(config.como?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');"
)
c = c.replace(
  "if (cmeEngine) engines.push(cmeEngine.start(cmeInterval));",
  "if (cmeEngine) engines.push(cmeEngine.start(cmeInterval));\n  if (comoEngine) engines.push(comoEngine.start(comoInterval));"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
