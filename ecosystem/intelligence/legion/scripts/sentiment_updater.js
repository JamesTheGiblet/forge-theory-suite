const { refreshSentiment, getSentiment } = require('../shared/sentiment');
const { exec } = require('child_process');
const path = require('path');

const SCP_PATH = path.join(__dirname, '../SCP.json');

async function updateSentiment() {
  await refreshSentiment();
  const s = getSentiment();
  if (s && s.value) {
    console.log(`[SENTIMENT] Updating SCP.json with value: ${s.value}`);
    exec(`cd ~/legion && jq --argjson sentiment ${s.value} '.current_state.sentiment = $sentiment' SCP.json > SCP.json.tmp && mv SCP.json.tmp SCP.json`);
  }
}

// Update now
updateSentiment();

// Update every hour
setInterval(updateSentiment, 60 * 60 * 1000);
