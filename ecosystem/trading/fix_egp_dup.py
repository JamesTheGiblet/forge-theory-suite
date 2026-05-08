f = open('index.js', 'r')
c = f.read()
f.close()

# Remove the duplicate const declaration in the engine instantiation block
c = c.replace(
    "  // S.E EGP — USD/EGP regime classification engine\n  const egpEnabled = config.egp?.enabled === true;\n  const egpEngine",
    "  // S.E EGP — USD/EGP regime classification engine\n  const egpEngine"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
