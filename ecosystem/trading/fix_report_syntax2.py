with open('scripts/generate-report.js', 'rb') as f:
    c = f.read()

# Replace literal newline between join(' and ') with \n
c = c.replace(b"].join('\n')", b"].join('\\n')")
c = c.replace(b'].join("\n")', b'].join("\\n")')

with open('scripts/generate-report.js', 'wb') as f:
    f.write(c)
print('done')
