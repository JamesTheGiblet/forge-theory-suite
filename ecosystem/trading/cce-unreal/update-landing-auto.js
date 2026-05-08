const fs = require('fs');
const path = './public/index.html';

let html = fs.readFileSync(path, 'utf8');

// Add auto-refresh interval to fetch engine states
const refreshScript = `
  // Auto-refresh engine states every 5 seconds
  setInterval(loadEnginesFromRegistry, 5000);
`;

// Insert after loadEnginesFromRegistry is defined
html = html.replace('loadEnginesFromRegistry();', 'loadEnginesFromRegistry();' + refreshScript);

fs.writeFileSync(path, html);
console.log('✅ Added auto-refresh to landing page');
