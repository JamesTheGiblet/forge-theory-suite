const fs = require('fs');
const agentPath = './agents/arbitragehunter.js';
let content = fs.readFileSync(agentPath, 'utf8');

// Add function to report opportunities to API
const reportFunction = `
  async reportOpportunity(opportunity) {
    try {
      const http = require('http');
      const data = JSON.stringify(opportunity);
      const options = {
        hostname: 'localhost',
        port: 3011,
        path: '/api/arbitrage/opportunity',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
      };
      const req = http.request(options, (res) => { res.resume(); });
      req.on('error', () => {});
      req.write(data);
      req.end();
    } catch(e) {}
  }
`;

// Insert the method
if (!content.includes('reportOpportunity')) {
  // Find a good insertion point (before the last })
  const lastBrace = content.lastIndexOf('}');
  content = content.slice(0, lastBrace) + reportFunction + content.slice(lastBrace);
  fs.writeFileSync(agentPath, content);
  console.log('✅ Added opportunity reporting to arbitrage agent');
}
