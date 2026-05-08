const fs = require('fs');
const path = './public/forge/replay.html';

let html = fs.readFileSync(path, 'utf8');

const oldCss = `.main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 280px;
  grid-template-rows: 1fr auto;
  overflow: hidden;
  gap: 0;
}`;

const newCss = `.main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 280px;
  grid-template-rows: 1fr auto;
  overflow: hidden;
  gap: 0;
}
@media (max-width: 640px) {
  body, html { overflow-y: auto !important; height: auto !important; }
  .main { display: block !important; overflow: visible !important; }
  .chart-area { height: 260px !important; border-right: none !important; }
  .right-panel { height: auto !important; border-left: none !important; }
  .panel-section.grows { max-height: 150px !important; }
  .controls { flex-wrap: wrap !important; height: auto !important; }
  .timeline { width: 100% !important; order: 10 !important; }
}`;

if (html.includes(oldCss)) {
  html = html.replace(oldCss, newCss);
  fs.writeFileSync(path, html);
  console.log('✅ Replay mobile layout fixed');
} else {
  console.log('⚠️ CSS pattern not found, checking file...');
}
