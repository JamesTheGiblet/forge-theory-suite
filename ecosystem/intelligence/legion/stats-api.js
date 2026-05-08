const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/stats', (req, res) => {
  try {
    const strategies = fs.readdirSync('./strategies/active').filter(f => f.endsWith('.json')).length;
    const tournament = JSON.parse(fs.readFileSync('./data/tournament.json', 'utf8'));
    const breaches = JSON.parse(fs.readFileSync('./data/containment_log.json', 'utf8'));
    const paperLog = fs.readFileSync('./data/paper_mode.log', 'utf8');
    const lastLine = paperLog.split('\n').filter(l => l.includes('hours remaining')).pop();
    const hoursMatch = lastLine?.match(/(\d+\.?\d*) hours/);
    const paperHours = hoursMatch ? parseFloat(hoursMatch[1]) : 48;
    
    res.json({
      strategies,
      tournament: tournament.active.length,
      breaches: breaches.length,
      sentiment: 32,
      vix: 30.1,
      paperHours
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📊 Stats API running on port ${PORT}`);
});
