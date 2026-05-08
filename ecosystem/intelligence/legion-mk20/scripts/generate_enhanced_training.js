const fs = require('fs');

console.log('\n📊 Generating ENHANCED training data (5x more volume)...\n');

// Generate 5x more training data (900 days instead of 180)
function generateHistoricalData(days = 900) {
  const data = [];
  let price = 50000;
  let trend = 0;
  
  for (let i = 0; i < days * 24; i++) {
    let change = (Math.random() - 0.5) * 0.015;
    trend += (Math.random() - 0.5) * 0.0003;
    trend = Math.max(-0.008, Math.min(0.008, trend));
    
    let volatility = 1;
    if (Math.random() < 0.08) volatility = 4;
    
    const priceChange = (trend + change * volatility) / 100;
    price = price * (1 + priceChange);
    price = Math.max(30000, Math.min(150000, price));
    
    const rsi = 50 + Math.sin(i / 120) * 30 + (Math.random() - 0.5) * 15;
    const volume = 1000 + Math.random() * 3000 + Math.abs(priceChange) * 80000;
    const macd = Math.sin(i / 150) * 60 + (Math.random() - 0.5) * 25;
    const annualizedVol = Math.abs(priceChange) * Math.sqrt(365 * 24) * 100;
    const sentiment = 50 + Math.sin(i / 200) * 35 + (Math.random() - 0.5) * 25;
    const entropy = Math.abs(priceChange) * 12;
    const fearGreed = 30 + Math.sin(i / 300) * 45 + (Math.random() - 0.5) * 18;
    const btcDominance = 45 + Math.sin(i / 400) * 12 + (Math.random() - 0.5) * 6;
    const openInterest = 1000000 + Math.random() * 800000 + Math.abs(priceChange) * 3000000;
    
    data.push({
      timestamp: Date.now() - (days * 24 - i) * 3600000,
      price: price,
      volume: Math.max(100, Math.min(200000, volume)),
      rsi: Math.max(10, Math.min(90, rsi)),
      macd: Math.max(-120, Math.min(120, macd)),
      volatility: Math.min(250, annualizedVol),
      sentiment: Math.max(0, Math.min(100, sentiment)),
      entropy: Math.min(1.5, entropy),
      fearGreed: Math.max(0, Math.min(100, fearGreed)),
      btcDominance: Math.max(30, Math.min(70, btcDominance)),
      openInterest: Math.max(100000, Math.min(8000000, openInterest))
    });
  }
  return data;
}

const trainingData = generateHistoricalData(900);
const validationData = generateHistoricalData(90);

fs.writeFileSync('./data/dqn_training_data.json', JSON.stringify(trainingData, null, 2));
fs.writeFileSync('./data/dqn_validation_data.json', JSON.stringify(validationData, null, 2));

console.log(`✅ Training data: ${trainingData.length} hours (${(trainingData.length/24).toFixed(0)} days)`);
console.log(`✅ Validation data: ${validationData.length} hours (${(validationData.length/24).toFixed(0)} days)`);

const prices = trainingData.map(d => d.price);
console.log(`\n📈 Price range: $${Math.min(...prices).toFixed(0)} - $${Math.max(...prices).toFixed(0)}`);
console.log(`📊 Volatility range: ${Math.min(...trainingData.map(d=>d.volatility)).toFixed(1)}% - ${Math.max(...trainingData.map(d=>d.volatility)).toFixed(1)}%`);
console.log(`🎯 Samples: ${trainingData.length}\n`);
