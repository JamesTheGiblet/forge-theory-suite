const fs = require('fs');
const path = './public/index.html';

let html = fs.readFileSync(path, 'utf8');

// Replace the updatePrice function with a version that properly updates the chart
const newUpdateFunction = `
async function updatePrice() {
  const newPrice = await fetchRealPrice();
  if (newPrice && typeof newPrice === 'number') {
    // Add new price to chart data
    chartData.push(newPrice);
    if (chartData.length > 50) chartData.shift();
    
    // Update chart with new data
    if (chart) {
      chart.data.datasets[0].data = [...chartData];
      chart.update('none');
    }
    
    // Calculate and display change
    const lastPrice = chartData.length > 1 ? chartData[chartData.length-2] : newPrice;
    const change = ((newPrice - lastPrice) / lastPrice * 100);
    document.getElementById('btcPrice').textContent = '$' + newPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
    const changeEl = document.getElementById('btcChange');
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = 'chart-change ' + (change >= 0 ? 'up' : 'down');
    
    // Also update market state based on engine states (done in loadEngineData)
  }
}`;

// Find the existing updatePrice function and replace it
const startMarker = 'async function updatePrice()';
const startIdx = html.indexOf(startMarker);
if (startIdx > -1) {
  // Find the end of the function
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
  html = html.slice(0, startIdx) + newUpdateFunction + html.slice(endIdx);
  
  // Also ensure the initChart function sets up chartData properly
  // Make sure the chart is redrawn after initial data load
  html = html.replace(
    'chart.data.datasets[0].data = chartData;',
    'chart.data.datasets[0].data = [...chartData]; chart.update();'
  );
  
  fs.writeFileSync(path, html);
  console.log('✅ Chart update function fixed');
} else {
  console.log('⚠️ Could not find updatePrice function');
}
