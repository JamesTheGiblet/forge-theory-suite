const fs = require('fs');
const path = require('path');
let hasEval = false;
let evalFiles = [];

function scanDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        scanDir(filePath);
      } else if (file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('eval(')) {
          hasEval = true;
          evalFiles.push(filePath);
        }
      }
    }
  } catch(e) {}
}

scanDir('./agents');
console.log(JSON.stringify({ passed: !hasEval, files: evalFiles }));
