const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../bus/router');

const TEMPLATE_DIR = path.join(__dirname, '../strategies/templates');

if (!fs.existsSync(TEMPLATE_DIR)) fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

const templates = [
  {
    name: 'RSI_MEAN_REVERSION',
    conditions: {
      entry: { all: [{ indicator: 'rsi', period: 14, operator: '<', value: 30 }], any: [] },
      exit: { any: [{ indicator: 'rsi', operator: '>', value: 70 }] }
    }
  },
  {
    name: 'BOLLINGER_BREAKOUT',
    conditions: {
      entry: { all: [{ indicator: 'bollinger', operator: 'above_upper' }], any: [] },
      exit: { any: [{ indicator: 'bollinger', operator: 'below_middle' }] }
    }
  }
];

function discoverTemplates() {
  
  for (const template of templates) {
    const templatePath = path.join(TEMPLATE_DIR, `${template.name}.template.json`);
    if (!fs.existsSync(templatePath)) {
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
      sendMessage('forge_lord', 'NEW_TEMPLATE', { template: template.name, path: templatePath });
    }
  }
  
  process.exit(0);
}

discoverTemplates();
