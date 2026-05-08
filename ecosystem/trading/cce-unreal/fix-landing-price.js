const fs = require('fs');
const path = './public/index.html';

let html = fs.readFileSync(path, 'utf8');

// Find and replace the price update function to use real API data
const newUpdateFunction = `
async function updatePriceFromAPI() {
  try {
    const res = await fetch('/api/btc-price');
    if (res.ok) {
      const data = await res.json();
      const newPrice = data.price;
      if (newPrice && typeof newPrice === 'number') {
        // Update chart data
        chartData.push(newPrice);
        if (chartData.length > 50) chartData.shift();
        
        if (chart) {
          chart.data.datasets[0].data = chartData;
          chart.update('none');
        }
        
        // Update price display and change
        const lastPrice = chartData.length > 1 ? chartData[chartData.length-2] : newPrice;
        const change = ((newPrice - lastPrice) / lastPrice * 100);
        document.getElementById('btcPrice').textContent = '$' + newPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
        
        const changeEl = document.getElementById('btcChange');
        changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        changeEl.className = 'chart-change ' + (change >= 0 ? 'up' : 'down');
        
        console.log('Price updated:', newPrice);
      }
    } else {
      console.warn('API returned error, using fallback');
      simulatePriceUpdate();
    }
  } catch(e) {
    console.warn('Price fetch failed, using simulation', e);
    simulatePriceUpdate();
  }
}`;

// Find the existing updatePriceFromAPI function and replace it
const startMarker = 'async function updatePriceFromAPI()';
const startIdx = html.indexOf(startMarker);
if (startIdx > -1) {
  // Find the end of the function (next '}' at the same indentation level)
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
  
  // Also ensure init function calls the real API
  html = html.replace('simulatePriceUpdate();', 'updatePriceFromAPI();');
  
  fs.writeFileSync(path, html);
  console.log('✅ Landing page updated to use real BTC price from API');
} else {
  console.log('⚠️ Could not find updatePriceFromAPI function');
}
