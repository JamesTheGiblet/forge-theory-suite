const yahooFinance = require('yahoo-finance2').default;

async function test() {
  try {
    const quote = await yahooFinance.quote('BTC-USD');
    console.log('Success! BTC price:', quote.regularMarketPrice);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
