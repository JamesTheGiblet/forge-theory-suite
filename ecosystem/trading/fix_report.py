f = open('scripts/generate-report.js', 'r')
c = f.read()
f.close()

# Fix the broken join - the newline inside the string literal
c = c.replace("].join('\n')", "].join('\\n')")

f = open('scripts/generate-report.js', 'w')
f.write(c)
f.close()
print('done')
