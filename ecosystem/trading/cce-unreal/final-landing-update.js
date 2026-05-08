const fs = require('fs');
const path = './public/index.html';

let html = fs.readFileSync(path, 'utf8');

// Replace the hardcoded engines array with dynamic loading
const newEnginesList = `
// Engines will be loaded from registry
let engines = [];

async function loadEnginesFromRegistry() {
  try {
    const r = await fetch('/api/registry/engines');
    if (r.ok) {
      const data = await r.json();
      // Convert registry data to engine array format
      engines = Object.keys(data).map(id => ({
        id: data[id].name || id.toUpperCase(),
        key: id,
        state: data[id].state || 'DORMANT',
        meta: \`\${data[id].type || 'STRATEGIC'} · \${data[id].dryRun ? 'DRY' : 'LIVE'}\`
      }));
      renderEngines();
      document.getElementById('stat-engines').textContent = engines.length;
    }
  } catch(e) {
    console.warn('Failed to load engines from registry', e);
  }
}

// Replace the renderEngines function
function renderEngines() {
  const grid = document.getElementById('engineGrid');
  if (!grid) return;
  grid.innerHTML = engines.map(e => \`
    <div class="engine-cell">
      <div class="engine-id">\${e.id}</div>
      <div class="engine-state state-\${e.state}">\${e.state}</div>
      <div class="engine-meta">\${e.meta}</div>
    </div>
  \`).join('');
}`;

// Find the engines array and replace with dynamic loading
const enginesArrayStart = html.indexOf('const engines = [');
if (enginesArrayStart > -1) {
  // Find the end of the engines array
  let bracketCount = 0;
  let endIdx = enginesArrayStart;
  for (let i = enginesArrayStart; i < html.length; i++) {
    if (html[i] === '[') bracketCount++;
    if (html[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  
  // Replace with new code
  const beforeCode = html.substring(0, enginesArrayStart);
  const afterCode = html.substring(endIdx);
  html = beforeCode + newEnginesList + afterCode;
  
  // Also update the init calls
  html = html.replace('renderEngines();', 'loadEnginesFromRegistry();');
  html = html.replace('fetchStatus();', '');
  
  fs.writeFileSync(path, html);
  console.log('✅ Landing page updated to use dynamic registry data');
} else {
  console.log('⚠️ Could not find engines array');
}
