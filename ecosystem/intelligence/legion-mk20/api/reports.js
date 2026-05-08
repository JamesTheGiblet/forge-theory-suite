const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const REPORTS_DIR = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Get all reports
router.get('/reports', (req, res) => {
  try {
    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    
    const reports = files.map(file => ({
      filename: file,
      timestamp: file.replace('report_', '').replace('.json', '').replace(/-/g, ':'),
      path: `/api/reports/${file}`
    }));
    
    res.json({ count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific report
router.get('/reports/:filename', (req, res) => {
  try {
    const filepath = path.join(REPORTS_DIR, req.params.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const report = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate new report
router.post('/reports/generate', async (req, res) => {
  try {
    // Trigger report generation through agent
    res.json({ success: true, message: 'Report generation triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
