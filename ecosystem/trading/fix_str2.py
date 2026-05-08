f = open('index.js', 'r')
c = f.read()
f.close()

# Move strEnabled declaration before the banner line
c = c.replace(
    "  console.log(`   🧠 O.E Strategist — ${strEnabled ?",
    "  const strEnabled = config.str?.enabled === true;\n  console.log(`   🧠 O.E Strategist — ${strEnabled ?"
)

# Remove the duplicate declaration further down
c = c.replace(
    "  const strEnabled = config.str?.enabled === true;\n  const strEngine",
    "  const strEngine"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
