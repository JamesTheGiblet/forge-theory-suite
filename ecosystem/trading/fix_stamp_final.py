f = open('dashboard-server.js', 'r')
c = f.read()
f.close()

c = c.replace(
    "res.setHeader('Content-Disposition', 'attachment; filename=cce-report- + stamp + .txt');",
    "res.setHeader('Content-Disposition', `attachment; filename=\"cce-report-${stamp}.txt\"`);"
)
c = c.replace(
    "res.setHeader('Content-Disposition', 'attachment; filename=cce-report- + stamp + .html');",
    "res.setHeader('Content-Disposition', `attachment; filename=\"cce-report-${stamp}.html\"`);"
)

f = open('dashboard-server.js', 'w')
f.write(c)
f.close()
print('done')
