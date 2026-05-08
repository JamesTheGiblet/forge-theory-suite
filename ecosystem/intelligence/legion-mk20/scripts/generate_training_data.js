const fs = require('fs');
const path = require('path');

function generateHistoricalData(days = 180) {
  const data = [];
  let price = 50000;  // Start at $50k
  let trend = 0;
  
  for (let i = 0; i < days * 24; i++) {  // hourly data
    // Add realistic market movements (0.1% to 1% per hour)
    let change = (Math.random() - 0.5) * 0.01;
    
    // Add trend (slow drift)
    trend += (Math.random() - 0.5) * 0.0005;
    trend = Math.max(-0.005, Math.min(0.005, trend));
    
    // Add volatility spikes
    let volatility = 1;
    if (Math.random() < 0.05) {
      volatility = 3;  // volatility spike (3x normal)
    }
    
    // Final price change
    const priceChange = (trend + change * volatility) / 100;
    price = price * (1 + priceChange);
    
    // Keep price in realistic range
    price = Math.max(30000, Math.min(100000, price));
    
    // RSI simulation (30-70 range typical)
    const rsi = 50 + Math.sin(i / 168) * 25 + (Math.random() - 0.5) * 15;
    
    // Volume simulation
    const volume = 1000 + Math.random() * 2000 + Math.abs(priceChange) * 50000;
    
    // MACD signal
    const macd = Math.sin(i / 200) * 50 + (Math.random() - 0.5) * 20;
    
    // Volatility (annualized)
    const annualizedVol = Math.abs(priceChange) * Math.sqrt(365 * 24) * 100;
    
    // Sentiment (fear/greed)
    const sentiment = 50 + Math.sin(i / 300) * 30 + (Math.random() - 0.5) * 20;
    
    // Entropy (market chaos)
    const entropy = Math.abs(priceChange) * 10;
    
    // Fear & Greed Index
    const fearGreed = 30 + Math.sin(i / 400) * 40 + (Math.random() - 0.5) * 15;
    
    // BTC Dominance
    const btcDominance = 45 + Math.sin(i / 500) * 10 + (Math.random() - 0.5) * 5;
    
    // Open Interest
    const openInterest = 1000000 + Math.random() * 500000 + Math.abs(priceChange) * 2000000;
    
    data.push({
      timestamp: Date.now() - (days * 24 - i) * 3600000,
      price: price,
      volume: Math.max(100, Math.min(100000, volume)),
      rsi: Math.max(10, Math.min(90, rsi)),
      macd: Math.max(-100, Math.min(100, macd)),
      volatility: Math.min(200, annualizedVol),
      sentiment: Math.max(0, Math.min(100, sentiment)),
      entropy: Math.min(1, entropy),
      fearGreed: Math.max(0, Math.min(100, fearGreed)),
      btcDominance: Math.max(30, Math.min(70, btcDominance)),
      openInterest: Math.max(100000, Math.min(5000000, openInterest))
    });
  }
  
  return data;
}

// Generate training data
const trainingData = generateHistoricalData(180);  // 180 days of hourly data
const validationData = generateHistoricalData(30); // 30 days for validation

fs.writeFileSync('./data/dqn_training_data.json', JSON.stringify(trainingData, null, 2));
fs.writeFileSync('./data/dqn_validation_data.json', JSON.stringify(validationData, null, 2));

const prices = trainingData.map(d => d.price);
console.log(`✅ Generated training data: ${trainingData.length} hours (${(trainingData.length/24).toFixed(0)} days)`);
console.log(`✅ Generated validation data: ${validationData.length} hours (${(validationData.length/24).toFixed(0)} days)`);
console.log(`\nPrice range: $${Math.min(...prices).toFixed(0)} - $${Math.max(...prices).toFixed(0)}`);
console.log(`Volatility range: ${Math.min(...trainingData.map(d=>d.volatility)).toFixed(1)}% - ${Math.max(...trainingData.map(d=>d.volatility)).toFixed(1)}%`);
