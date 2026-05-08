f = open('index.js', 'r')
c = f.read()
f.close()

# Move the obs banner line to after obsEnabled is declared
c = c.replace(
    "  console.log(`   👁️  O.E Observer — ${obsEnabled ? (config.obs?.intervalMinutes || 15)+'min interval | ACTIVE' : 'DISABLED'}`);\n  console.log('');",
    "  console.log('');"
)

# Add it after obsEnabled is declared
c = c.replace(
    "  const obsEnabled = config.obs?.enabled !== false;",
    "  const obsEnabled = config.obs?.enabled !== false;\n  console.log(`   👁️  O.E Observer — ${obsEnabled ? (config.obs?.intervalMinutes || 15)+'min interval | ACTIVE' : 'DISABLED'}`);"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
