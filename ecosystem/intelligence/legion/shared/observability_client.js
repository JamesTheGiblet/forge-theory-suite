const http = require('http');

function logBreach(type, message, source) {
  const data = JSON.stringify({ type, message, source });
  
  const options = {
    hostname: 'localhost',
    port: 3010,
    path: '/api/apollyon/breach',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    },
    timeout: 2000
  };
  
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[OBSERVABILITY] Breach logged: ${type}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error(`[OBSERVABILITY] Error: ${err.message}`);
  });
  
  req.write(data);
  req.end();
}

module.exports = { logBreach };
