const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const wwwPath = path.join(__dirname, 'www');

const server = http.createServer((req, res) => {
  let filePath = path.join(wwwPath, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(wwwPath, 'index.html'), (err, content) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
    } else {
      const ext = path.extname(filePath);
      const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
});
