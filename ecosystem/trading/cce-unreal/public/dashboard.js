// public/dashboard.js
// Client-side JavaScript for CCE Dashboard

// ============================================================================
// STATE
// ============================================================================

let portfolioChart = null;
let btcFearChart = null;
let currentData = {};
let eventSource = null;
let eventSourceRetryTimeout = null;

// ============================================================================
// INIT
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 CCE Dashboard initializing...');

  loadStatus();
  loadHistory();
  loadTransitions();
  loadTrades();
  loadObserver();

  // Polling fallback (SSE is primary for status)
  setInterval(loadStatus, 30000);
  setInterval(loadHistory, 60000);
  setInterval(loadObserver, 60000);

  setupEventStream();
});

// ============================================================================
// API CALLS
// ============================================================================

async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    currentData = data;
    updateStatusCards(data);
    updateTimestamp();
    clearError('status');
  } catch (error) {
    console.error('Error loading status:', error);
    showError('status', 'Status unavailable');
  }
}

async function loadHistory() {
  try {
    const response = await fetch('/api/history?limit=100');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateCharts(data);
    clearError('charts');
  } catch (error) {
    console.error('Error loading history:', error);
    showError('charts', 'Chart data unavailable');
  }
}

async function loadTransitions() {
  try {
    const response = await fetch('/api/transitions?limit=10');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateTransitionsTable(data);
  } catch (error) {
    console.error('Error loading transitions:', error);
  }
}


async function loadObserver() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    const count = data.obs_count || 0;
    const patterns = data.obs_patterns_count || 0;
    const latest = data.obs_latest;
    const transitions = latest ? (latest.obs_number - 1) : 0;
    const until = Math.max(0, 96 - (count % 96));
    const progress = Math.min(100, ((count % 96) / 96) * 100);

    const el = (id) => document.getElementById(id);
    if (el('obsCount'))         el('obsCount').textContent = count;
    if (el('obsCountLarge'))    el('obsCountLarge').textContent = count;
    if (el('obsUntilAnalysis')) el('obsUntilAnalysis').textContent = until;
    if (el('obsTransitions'))   el('obsTransitions').textContent = data.transitions?.length || 0;
    if (el('obsPatterns'))      el('obsPatterns').textContent = patterns;
    if (el('obsPatternsLarge')) el('obsPatternsLarge').textContent = patterns;
    if (el('obsProgressBar'))   el('obsProgressBar').style.width = progress + '%';
    if (el('obsLastTime') && latest?.timestamp) {
      el('obsLastTime').textContent = new Date(latest.timestamp).toLocaleTimeString();
    }
  } catch(e) {
    console.error('Observer load error:', e);
  }
}
async function loadTrades() {
  try {
    const response = await fetch('/api/trades?limit=10');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateTradesTable(data);
  } catch (error) {
    console.error('Error loading trades:', error);
  }
}

// ============================================================================
// REAL-TIME UPDATES
// ============================================================================

function setupEventStream() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/api/stream');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      currentData = data;
      updateStatusCards(data);
      updateTimestamp();
      clearError('status');
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  };

  eventSource.onerror = () => {
    console.warn('SSE connection lost. Reconnecting in 10s...');
    eventSource.close();
    eventSource = null;
    clearTimeout(eventSourceRetryTimeout);
    eventSourceRetryTimeout = setTimeout(setupEventStream, 10000);
  };
}

// ============================================================================
// ERROR DISPLAY
// ============================================================================

function showError(zone, message) {
  const el = document.getElementById(`error-${zone}`);
  if (el) {
    el.textContent = `⚠️ ${message}`;
    el.style.display = 'block';
  }
}

function clearError(zone) {
  const el = document.getElementById(`error-${zone}`);
  if (el) el.style.display = 'none';
}

// ============================================================================
// STATUS CARDS
// ============================================================================

function updateStatusCards(data) {
  setText('currentState', data.current_state || 'UNKNOWN');
  setClass('currentState', `state-badge state-${data.current_state || 'UNKNOWN'}`);

  setText('daysInState', `${(data.days_in_state || 0).toFixed(1)} days`);
  setText('portfolioValue', `$${(data.portfolio_value || 0).toFixed(2)}`);
  setText('btcPrice', `$${(data.btc_price || 0).toFixed(2)}`);
  setText('btcHoldings', `${(data.btc_holdings || 0).toFixed(6)} BTC`);
  setText('fearGreed', data.fear_greed || '--');

  const returnPct = data.total_return || 0;
  const changeEl = document.getElementById('portfolioChange');
  if (changeEl) {
    changeEl.textContent = `${returnPct >= 0 ? '↑' : '↓'} ${Math.abs(returnPct).toFixed(2)}%`;
    changeEl.className = `card-change ${returnPct >= 0 ? 'positive' : 'negative'}`;
  }

  const fearLabelEl = document.getElementById('fearGreedLabel');
  if (fearLabelEl) {
    fearLabelEl.textContent = getFearGreedLevel(data.fear_greed);
    fearLabelEl.className = `card-change ${getFearGreedColor(data.fear_greed)}`;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setClass(id, className) {
  const el = document.getElementById(id);
  if (el) el.className = className;
}

// ============================================================================
// CHARTS
// ============================================================================

function updateCharts(historyData) {
  if (!historyData || historyData.length === 0) return;

  const timestamps = historyData.map(d => new Date(d.timestamp).toLocaleDateString());
  const portfolioValues = historyData.map(d => d.portfolio_value);
  const btcPrices = historyData.map(d => d.btc_price);
  const fearGreed = historyData.map(d => d.fear_greed);

  // Update in place if chart exists, otherwise create
  if (portfolioChart) {
    portfolioChart.data.labels = timestamps;
    portfolioChart.data.datasets[0].data = portfolioValues;
    portfolioChart.update();
  } else {
    const ctx = document.getElementById('portfolioChart');
    if (ctx) {
      portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timestamps,
          datasets: [{
            label: 'Portfolio Value ($)',
            data: portfolioValues,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }]
        },
        options: chartOptions('Portfolio Performance (30 Days)')
      });
    }
  }

  if (btcFearChart) {
    btcFearChart.data.labels = timestamps;
    btcFearChart.data.datasets[0].data = btcPrices;
    btcFearChart.data.datasets[1].data = fearGreed;
    btcFearChart.update();
  } else {
    const ctx = document.getElementById('btcFearChart');
    if (ctx) {
      btcFearChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timestamps,
          datasets: [
            {
              label: 'BTC Price ($)',
              data: btcPrices,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2,
              yAxisID: 'y',
              tension: 0.4
            },
            {
              label: 'Fear & Greed Index',
              data: fearGreed,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              yAxisID: 'y1',
              tension: 0.4
            }
          ]
        },
        options: dualAxisChartOptions('BTC Price vs Fear & Greed (30 Days)')
      });
    }
  }
}

function chartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#e4e4e7' } },
      title: { display: true, text: title, color: '#e4e4e7', font: { size: 16 } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
    }
  };
}

function dualAxisChartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#e4e4e7' } },
      title: { display: true, text: title, color: '#e4e4e7', font: { size: 16 } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: {
        type: 'linear', position: 'left',
        ticks: { color: '#94a3b8' }, grid: { color: '#334155' },
        title: { display: true, text: 'BTC Price ($)', color: '#f59e0b' }
      },
      y1: {
        type: 'linear', position: 'right',
        min: 0, max: 100,
        ticks: { color: '#94a3b8' }, grid: { display: false },
        title: { display: true, text: 'Fear & Greed Index', color: '#10b981' }
      }
    }
  };
}

// ============================================================================
// TABLES
// ============================================================================

function updateTransitionsTable(transitions) {
  const container = document.getElementById('transitionsTable');
  if (!container) return;

  if (!transitions || transitions.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #64748b;">No transitions yet</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr><th>Date/Time</th><th>From</th><th>To</th><th>Reason</th></tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');

  transitions.forEach(t => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = new Date(t.timestamp).toLocaleString();

    const tdFrom = document.createElement('td');
    const fromBadge = document.createElement('span');
    fromBadge.className = `state-badge state-${t.from_state}`;
    fromBadge.style.cssText = 'font-size: 0.75rem; padding: 4px 8px;';
    fromBadge.textContent = t.from_state;
    tdFrom.appendChild(fromBadge);

    const tdTo = document.createElement('td');
    const toBadge = document.createElement('span');
    toBadge.className = `state-badge state-${t.to_state}`;
    toBadge.style.cssText = 'font-size: 0.75rem; padding: 4px 8px;';
    toBadge.textContent = t.to_state;
    tdTo.appendChild(toBadge);

    const tdReason = document.createElement('td');
    tdReason.textContent = t.reason || 'N/A';

    tr.append(tdDate, tdFrom, tdTo, tdReason);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);
}

function updateTradesTable(trades) {
  const container = document.getElementById('tradesTable');
  if (!container) return;

  if (!trades || trades.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #64748b;">No trades executed yet (Dry run mode?)</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr><th>Date/Time</th><th>Symbol</th><th>Side</th><th>Amount</th><th>Price</th><th>Value</th></tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');

  trades.forEach(t => {
    const tr = document.createElement('tr');
    const sideClass = t.side === 'buy' ? 'positive' : 'negative';

    const cells = [
      new Date(t.timestamp).toLocaleString(),
      t.symbol,
      null, // side handled separately
      parseFloat(t.amount).toFixed(6),
      `$${parseFloat(t.price).toFixed(2)}`,
      `$${parseFloat(t.value).toFixed(2)}`
    ];

    cells.forEach((text, i) => {
      const td = document.createElement('td');
      if (i === 2) {
        const span = document.createElement('span');
        span.className = sideClass;
        span.textContent = t.side.toUpperCase();
        td.appendChild(span);
      } else {
        td.textContent = text;
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);
}

// ============================================================================
// TIMESTAMP
// ============================================================================

function updateTimestamp() {
  setText('lastUpdate', new Date().toLocaleString());
}

// ============================================================================
// HELPERS
// ============================================================================

function getFearGreedLevel(value) {
  if (!value) return 'Unknown';
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
}

function getFearGreedColor(value) {
  if (!value) return 'neutral';
  if (value <= 40) return 'negative';
  if (value <= 60) return 'neutral';
  return 'positive';
}

// ============================================================================
// EXPORT
// ============================================================================

async function fetchExportData() {
  const response = await fetch('/api/export');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function downloadJSON() {
  try {
    const data = await fetchExportData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    triggerDownload(dataStr, `cce_export_${today()}.json`);
  } catch (e) {
    console.error('Export failed:', e);
    alert('Failed to export data');
  }
}

async function downloadCSV() {
  try {
    const data = await fetchExportData();
    if (!data.history || data.history.length === 0) return alert('No data to export');

    const items = data.history;
    const header = Object.keys(items[0]);
    const csv = [
      header.join(','),
      ...items.map(row => header.map(f => JSON.stringify(row[f] ?? '')).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(window.URL.createObjectURL(blob), `cce_history_${today()}.csv`);
  } catch (e) {
    console.error('Export failed:', e);
    alert('Export failed');
  }
}

function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
}

function today() {
  return new Date().toISOString().split('T')[0];
}