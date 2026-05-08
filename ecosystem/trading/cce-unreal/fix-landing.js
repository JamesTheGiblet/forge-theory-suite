const fs = require('fs');
const path = './public/index.html';

let html = fs.readFileSync(path, 'utf8');

// Update API URLs from localhost:3000 to relative paths (use same origin)
// Change http://localhost:3000/api/* to /api/* (relative to Unreal platform)
html = html.replace(/http:\/\/localhost:3000\/api\//g, '/api/');
html = html.replace(/http:\/\/localhost:3000\/api\/status/g, '/api/registry/overview');
html = html.replace(/http:\/\/localhost:3000\/api\/forex\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/rme\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/cme\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/como\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/egp\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/grid\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/mom\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/brk\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/lce\/status/g, '/api/registry/engines');
html = html.replace(/http:\/\/localhost:3000\/api\/obs\/status/g, '/api/registry/engines');

// Update the fetch logic to handle the new API structure
// Replace the entire fetchStatus function with one that uses the registry
const newFetchFunction = `
async function fetchStatus() {
  try {
    // Get all engines from registry
    const r = await fetch('/api/registry/overview');
    if (r.ok) {
      const data = await r.json();
      const engineCount = data.engineCount || engines.length;
      document.getElementById('stat-engines').textContent = engineCount;
      
      // Update individual engine states if we have data
      if (data.engines && data.engines.length) {
        data.engines.forEach(engine => {
          const el = document.getElementById('state-' + engine.id.toLowerCase().replace(/\\./g, '-'));
          if (el) {
            el.textContent = engine.state || 'DORMANT';
            el.className = 'engine-state state-' + (engine.state || 'DORMANT');
          }
        });
      }
    }
  } catch(e) { console.warn('Registry fetch failed', e); }
  
  // Try to get BTC price from health endpoint or fallback
  try {
    const health = await fetch('/api/health');
    if (health.ok) {
      const data = await health.json();
      // If we have BTC data, update
      if (data.btc_price) {
        updateBTC(data.btc_price, 'DORMANT');
      }
    }
  } catch(e) {}
}`;

// Replace the fetchStatus function
const oldFetchStart = html.indexOf('async function fetchStatus()');
if (oldFetchStart > -1) {
  const oldFetchEnd = html.indexOf('}', oldFetchStart);
  const oldFetchLength = html.indexOf('}', oldFetchEnd + 1) - oldFetchStart + 1;
  html = html.slice(0, oldFetchStart) + newFetchFunction + html.slice(oldFetchStart + oldFetchLength);
}

// Write back
fs.writeFileSync(path, html);
console.log('✅ Landing page updated to use Unreal API endpoints');
