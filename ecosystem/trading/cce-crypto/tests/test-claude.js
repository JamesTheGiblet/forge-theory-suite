const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const Anthropic = require('@anthropic-ai/sdk');

async function run() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('❌ Error: ANTHROPIC_API_KEY is missing in .env');
    console.log('   Get one here: https://console.anthropic.com/');
    return;
  }

  console.log(`🔑 Key found: ${key.slice(0, 7)}...${key.slice(-4)}`);
  console.log('📡 Connecting to Claude...');

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Reply with 'Connection Successful'" }]
    });
    console.log(`✅ Response: ${message.content[0].text.trim()}`);
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
  }
}

run();