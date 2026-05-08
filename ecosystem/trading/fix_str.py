f = open('index.js', 'r')
c = f.read()
f.close()

# Remove the duplicate strEnabled declaration in the banner section
c = c.replace(
    "  const strEnabled = config.str?.enabled === true;\n  console.log(`   🧠 O.E Strategist",
    "  console.log(`   🧠 O.E Strategist"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
