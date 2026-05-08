require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('Token exists:', !!token);
console.log('Chat ID exists:', !!chatId);
console.log('Token preview:', token ? token.substring(0, 15) + '...' : 'none');
console.log('Chat ID:', chatId);

if (token && chatId) {
  const https = require('https');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const postData = JSON.stringify({
    chat_id: chatId,
    text: '✅ Test from CCE Node.js script'
  });
  
  const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response:', data);
      try {
        const json = JSON.parse(data);
        if (json.ok) {
          console.log('✅ SUCCESS! Message sent to Telegram');
        } else {
          console.log('❌ Failed:', json.description);
        }
      } catch(e) {
        console.log('❌ Invalid response');
      }
    });
  });
  req.on('error', (e) => console.log('❌ Request error:', e.message));
  req.write(postData);
  req.end();
} else {
  console.log('❌ Missing token or chat ID in .env');
}
