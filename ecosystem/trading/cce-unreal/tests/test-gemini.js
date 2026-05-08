const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('❌ Error: GEMINI_API_KEY is missing in .env');
    console.log('   Get one here: https://aistudio.google.com/');
    return;
  }

  console.log(`🔑 Key found: ${key.slice(0, 4)}...${key.slice(-4)}`);
  console.log('📡 Connecting to Gemini...');

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Reply with 'Connection Successful'");
    const response = await result.response;
    console.log(`✅ Response: ${response.text().trim()}`);
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
  }
}

run();