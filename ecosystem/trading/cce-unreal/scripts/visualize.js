// scripts/visualize.js
// Generates an HTML chart from backtest results

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// CLI / PATHS
// ============================================================================

const args = process.argv.slice(2);

const csvPath = args[0]
  ? path.resolve(args[0])
  : path.resolve(__dirname, '..', 'backtest-results', 'daily_snapshots.csv');

const htmlPath = args[1]
  ? path.resolve(args[1])
  : path.resolve(__dirname, '..', 'backtest-results', 'chart.html');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Snapshot CSV not found: ${csvPath}`);
  console.error('   Run backtest first, or pass a custom path:');
  console.error('   node scripts/visualize.js [csv_path] [output_html_path]');
  process.exit(1);
}

// ============================================================================
// PARSE CSV
// ============================================================================

const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.trim().split('\n');

if (lines.length < 2) {
  console.error('❌ CSV has no data rows. Run backtest first.');
  process.exit(1);
}

// Parse headers to find column indices — resilient to column order changes
const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
const dateIdx  = headers.indexOf('date');
const valueIdx = headers.findIndex(h => h.includes('value') || h.includes('portfolio'));
const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('btc'));
const stateIdx = headers.indexOf('state');

if (dateIdx === -1 || valueIdx === -1 || priceIdx === -1) {
  console.error('❌ CSV is missing required columns (date, value/portfolio, price/btc).');
  console.error(`   Found columns: ${headers.join(', ')}`);
  process.exit(1);
}

const data = lines.slice(1).map(line => {
  const cols = line.split(',');
  return {
    date:  cols[dateIdx]?.trim()  || '',
    value: parseFloat(cols[valueIdx]) || 0,
    price: parseFloat(cols[priceIdx]) || 0,
    state: stateIdx !== -1 ? (cols[stateIdx]?.trim() || 'UNKNOWN') : 'UNKNOWN'
  };
}).filter(d => d.date && !isNaN(d.value) && !isNaN(d.price));

if (data.length === 0) {
  console.error('❌ No valid data rows found after parsing.');
  process.exit(1);
}

// ============================================================================
// PREPARE CHART DATA
// ============================================================================

const startVal   = data[0].value;
const startPrice = data[0].price;

if (startPrice === 0) {
  console.error('❌ First row BTC price is 0 — cannot normalise buy & hold comparison.');
  process.exit(1);
}

const dates     = JSON.stringify(data.map(d => d.date));
const portfolio = JSON.stringify(data.map(d => d.value));
const normPrice = JSON.stringify(data.map(d => (d.price / startPrice) * startVal));
const states    = JSON.stringify(data.map(d => d.state));

const finalValue   = data[data.length - 1].value;
const finalBH      = (data[data.length - 1].price / startPrice) * startVal;
const cceReturn    = (((finalValue / startVal) - 1) * 100).toFixed(1);
const bhReturn     = (((finalBH   / startVal) - 1) * 100).toFixed(1);
const startDate    = data[0].date;
const endDate      = data[data.length - 1].date;

// ============================================================================
// GENERATE HTML
// ============================================================================

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCE Backtest Equity Curve</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f0f2f5; margin: 0; }
    .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
    h2 { margin-top: 0; color: #333; }
    .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat { background: white; padding: 16px 24px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .stat-label { font-size: 0.8rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; }
    .stat-value { font-size: 1.6rem; font-weight: 700; color: #2c3e50; margin-top: 4px; }
    .stat-value.positive { color: #27ae60; }
    .stat-value.negative { color: #e74c3c; }
    canvas { width: 100% !important; }
  </style>
</head>
<body>
  <div class="summary">
    <div class="stat">
      <div class="stat-label">Period</div>
      <div class="stat-value" style="font-size:1rem;">${startDate} → ${endDate}</div>
    </div>
    <div class="stat">
      <div class="stat-label">CCE Return</div>
      <div class="stat-value ${parseFloat(cceReturn) >= 0 ? 'positive' : 'negative'}">${cceReturn}%</div>
    </div>
    <div class="stat">
      <div class="stat-label">Buy & Hold Return</div>
      <div class="stat-value ${parseFloat(bhReturn) >= 0 ? 'positive' : 'negative'}">${bhReturn}%</div>
    </div>
    <div class="stat">
      <div class="stat-label">Data Points</div>
      <div class="stat-value">${data.length}</div>
    </div>
  </div>

  <div class="card">
    <h2>📈 Equity Curve vs Buy &amp; Hold</h2>
    <canvas id="equityChart" height="120"></canvas>
  </div>

  <script>
    (function () {
      const ctx = document.getElementById('equityChart').getContext('2d');
      const states = ${states};

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ${dates},
          datasets: [
            {
              label: 'CCE Portfolio ($)',
              data: ${portfolio},
              borderColor: '#2c3e50',
              backgroundColor: 'rgba(44, 62, 80, 0.05)',
              borderWidth: 2,
              pointRadius: 0,
              fill: true,
              yAxisID: 'y',
              tension: 0.1
            },
            {
              label: 'Buy & Hold ($)',
              data: ${normPrice},
              borderColor: '#adb5bd',
              borderWidth: 2,
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
              yAxisID: 'y',
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              ticks: { maxTicksLimit: 12, color: '#94a3b8' },
              grid: { display: false }
            },
            y: {
              type: 'logarithmic',
              display: true,
              position: 'left',
              title: { display: true, text: 'Value — Log Scale ($)' },
              ticks: { color: '#94a3b8' }
            }
          },
          plugins: {
            legend: {
              display: true,
              labels: { color: '#333' }
            },
            tooltip: {
              callbacks: {
                afterLabel: function(context) {
                  if (context.datasetIndex === 0) {
                    return 'State: ' + states[context.dataIndex];
                  }
                }
              }
            }
          }
        }
      });
    })();
  <\/script>
</body>
</html>`;

// ============================================================================
// WRITE
// ============================================================================

const outDir = path.dirname(htmlPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(htmlPath, html, 'utf8');

console.log(`✅ Chart generated: ${htmlPath}`);
console.log(`   Period : ${startDate} → ${endDate}`);
console.log(`   CCE    : ${cceReturn}%`);
console.log(`   B&H    : ${bhReturn}%`);
console.log(`   Rows   : ${data.length}`);
console.log('\n   Open this file in your browser to view the equity curve.');