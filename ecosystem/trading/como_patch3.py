f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "if (cmeEngine) cmeEngine.stop();",
  "if (cmeEngine) cmeEngine.stop();\n    if (comoEngine) comoEngine.stop();"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')
