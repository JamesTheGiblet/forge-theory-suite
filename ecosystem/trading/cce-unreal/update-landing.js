const fs = require('fs');
const path = './public/index.html';

let html = fs.readFileSync(path, 'utf8');

// Replace the fetchStatus function with one that works with our API
const newFetchFunction = `
async function fetchStatus() {
  try {
    // Get registry overview
    const r = await fetch('/api/registry/overview');
    if (r.ok) {
      const data = await r.json();
      document.getElementById('stat-engines').textContent = data.engineCount || 0;
      
      // If we have detailed engine data
      if (data.engines && data.engines.length) {
        const grid = document.getElementById('engineGrid');
        if (grid) {
          grid.innerHTML = data.engines.map(e => \`
            <div class="engine-cell">
              <div class="engine-id">\${e.id.toUpperCase()}</div>
              <div class="engine-state state-\${e.state || 'DORMANT'}">\${e.state || 'DORMANT'}</div>
              <div class="engine-meta">\${e.type || 'STRATEGIC'} · \${e.dryRun ? 'DRY' : 'LIVE'}</div>
            </div>
          \`).join('');
        }
      }
    }
  } catch(e) {
    console.warn('Registry fetch failed', e);
  }
  
  // Get BTC price from original CCE if available (optional)
  try {
    const btc = await fetch('http://localhost:3000/api/status', { signal: AbortSignal.timeout(2000) });
    if (btc.ok) {
      const data = await btc.json();
      if (data.btc_price) {
        updateBTC(data.btc_price, data.state);
      }
    }
  } catch(e) {
    // Silent fail - BTC price is optional
  }
}`;

// Find and replace the fetchStatus function
const startMarker = 'async function fetchStatus()';
const startIdx = html.indexOf(startMarker);
if (startIdx > -1) {
  // Find the end of the function (next '}' at same indent level)
  let braceCount = 0;
  let endIdx = startIdx;
  let foundStart = false;
  
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === '{') {
      braceCount++;
      foundStart = true;
    } else if (html[i] === '}') {
      braceCount--;
      if (foundStart && braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  
  // Replace the function
  html = html.slice(0, startIdx) + newFetchFunction + html.slice(endIdx);
  
  fs.writeFileSync(path, html);
  console.log('✅ fetchStatus function updated');
} else {
  console.log('⚠️ fetchStatus function not found');
}
