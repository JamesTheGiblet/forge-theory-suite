const express = require('express');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3020;

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIG = {
  JAMES_PASSWORD: process.env.JAMES_PASSWORD || 'change-me-james',
  ABE_PASSWORD:   process.env.ABE_PASSWORD   || 'change-me-abe',
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-me-secret',
  NODES_DIR:      process.env.NODES_DIR      || path.join(__dirname, '../nodes'),
  QUEUE_DIR:      process.env.QUEUE_DIR      || path.join(__dirname, 'queue'),
  INCYBE_DIR:     process.env.INCYBE_DIR     || path.join(__dirname, '../nodes/incybe'),
};

// Ensure directories exist
[CONFIG.QUEUE_DIR, CONFIG.INCYBE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: CONFIG.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 } // 8h
}));

// Multer — memory storage for validation before writing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 }, // 500KB max per file
  fileFilter: (req, file, cb) => {
    const allowed = ['.json', '.js', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error(`File type ${ext} not allowed`));
  }
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/login');
};

const requireJames = (req, res, next) => {
  if (req.session.user?.role === 'james') return next();
  res.status(403).json({ error: 'Insufficient permissions' });
};

// ── Queue helpers ─────────────────────────────────────────────────────────────
const loadQueue = () => {
  const queueFile = path.join(CONFIG.QUEUE_DIR, 'queue.json');
  if (!fs.existsSync(queueFile)) return [];
  try { return JSON.parse(fs.readFileSync(queueFile, 'utf8')); }
  catch { return []; }
};

const saveQueue = (queue) => {
  fs.writeFileSync(
    path.join(CONFIG.QUEUE_DIR, 'queue.json'),
    JSON.stringify(queue, null, 2)
  );
};

const validateSCP = (scpJson) => {
  const required = ['scp_version', 'capsule_id', 'module_name', 'port', 'access_rights'];
  const missing = required.filter(f => !scpJson[f]);
  if (missing.length) return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };

  const ar = scpJson.access_rights;
  if (!ar.node_class) return { valid: false, error: 'access_rights.node_class is required' };
  if (!ar.permitted_primitives?.length) return { valid: false, error: 'access_rights.permitted_primitives must not be empty' };

  // Block dangerous primitives for non-THAUMIEL submissions
  const dangerous = ['EXEC_SHELL', 'WRITE_CORE', 'ACCESS_KEYS', 'READ_THAUMIEL'];
  const attempted = (ar.permitted_primitives || []).filter(p => dangerous.includes(p));
  if (attempted.length) return { valid: false, error: `Forbidden primitives requested: ${attempted.join(', ')}` };

  // Block THAUMIEL class submissions
  if (ar.node_class === 'THAUMIEL') return { valid: false, error: 'Cannot submit THAUMIEL class modules via portal' };

  return { valid: true };
};

// ── Routes ────────────────────────────────────────────────────────────────────

// Login page
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'james' && password === CONFIG.JAMES_PASSWORD) {
    req.session.user = { username: 'james', role: 'james' };
    return res.redirect('/');
  }
  if (username === 'abe' && password === CONFIG.ABE_PASSWORD) {
    req.session.user = { username: 'abe', role: 'collaborator' };
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Main dashboard
app.get('/', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// API: current user info
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.session.user.username, role: req.session.user.role });
});

// API: submit a new module
app.post('/api/submit', requireAuth, upload.fields([
  { name: 'scp', maxCount: 1 },
  { name: 'primitive', maxCount: 1 },
  { name: 'readme', maxCount: 1 }
]), (req, res) => {
  try {
    if (!req.files?.scp) return res.status(400).json({ error: 'scp.json is required' });

    // Parse and validate scp.json
    let scpJson;
    try {
      scpJson = JSON.parse(req.files.scp[0].buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'scp.json is not valid JSON' });
    }

    const validation = validateSCP(scpJson);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    // Check module name doesn't already exist in queue or live
    const moduleName = scpJson.module_name.replace(/[^a-z0-9\-_]/gi, '');
    const livePath = path.join(CONFIG.INCYBE_DIR, moduleName);
    const queue = loadQueue();
    const alreadyQueued = queue.some(m => m.moduleName === moduleName && m.status === 'pending');

    if (alreadyQueued) return res.status(400).json({ error: 'A module with this name is already pending review' });

    // Save files to queue staging area
    const submissionId = crypto.randomBytes(8).toString('hex');
    const stagingDir = path.join(CONFIG.QUEUE_DIR, submissionId);
    fs.mkdirSync(stagingDir);

    fs.writeFileSync(path.join(stagingDir, 'scp.json'), req.files.scp[0].buffer);
    if (req.files.primitive) fs.writeFileSync(path.join(stagingDir, 'primitive.js'), req.files.primitive[0].buffer);
    if (req.files.readme) fs.writeFileSync(path.join(stagingDir, 'README.md'), req.files.readme[0].buffer);

    // Add to queue
    queue.push({
      id: submissionId,
      moduleName,
      capsuleId: scpJson.capsule_id,
      description: scpJson.description || '',
      port: scpJson.port,
      nodeClass: scpJson.access_rights.node_class,
      submittedBy: req.session.user.username,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      stagingDir
    });
    saveQueue(queue);

    res.json({ success: true, submissionId, moduleName });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: get queue (james sees all, abe sees own)
app.get('/api/queue', requireAuth, (req, res) => {
  const queue = loadQueue();
  const visible = req.session.user.role === 'james'
    ? queue
    : queue.filter(m => m.submittedBy === req.session.user.username);
  res.json(visible);
});

// API: approve a submission (james only)
app.post('/api/approve/:id', requireAuth, requireJames, (req, res) => {
  const queue = loadQueue();
  const idx = queue.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Submission not found' });
  if (queue[idx].status !== 'pending') return res.status(400).json({ error: 'Submission is not pending' });

  const submission = queue[idx];

  try {
    // Read scp.json, inject granted_by
    const scpPath = path.join(submission.stagingDir, 'scp.json');
    const scpJson = JSON.parse(fs.readFileSync(scpPath, 'utf8'));
    scpJson.access_rights.granted_by = 'james';
    scpJson.access_rights.granted_at = new Date().toISOString();

    // Write module to live node directory
    const moduleDir = path.join(CONFIG.INCYBE_DIR, submission.moduleName);
    if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });

    fs.writeFileSync(path.join(moduleDir, 'scp.json'), JSON.stringify(scpJson, null, 2));

    const primitiveStaging = path.join(submission.stagingDir, 'primitive.js');
    if (fs.existsSync(primitiveStaging)) {
      fs.copyFileSync(primitiveStaging, path.join(moduleDir, 'primitive.js'));
    }

    const readmeStaging = path.join(submission.stagingDir, 'README.md');
    if (fs.existsSync(readmeStaging)) {
      fs.copyFileSync(readmeStaging, path.join(moduleDir, 'README.md'));
    }

    // Update queue
    queue[idx].status = 'approved';
    queue[idx].approvedAt = new Date().toISOString();
    queue[idx].approvedBy = 'james';
    saveQueue(queue);

    res.json({ success: true, moduleDir });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to deploy module' });
  }
});

// API: reject a submission (james only)
app.post('/api/reject/:id', requireAuth, requireJames, (req, res) => {
  const queue = loadQueue();
  const idx = queue.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Submission not found' });

  queue[idx].status = 'rejected';
  queue[idx].rejectedAt = new Date().toISOString();
  queue[idx].rejectionReason = req.body.reason || 'No reason given';
  saveQueue(queue);

  res.json({ success: true });
});

// API: get live modules
app.get('/api/modules', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(CONFIG.INCYBE_DIR)) return res.json([]);
    const dirs = fs.readdirSync(CONFIG.INCYBE_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const scpPath = path.join(CONFIG.INCYBE_DIR, d.name, 'scp.json');
        if (!fs.existsSync(scpPath)) return null;
        try {
          const scp = JSON.parse(fs.readFileSync(scpPath, 'utf8'));
          return {
            name: d.name,
            capsuleId: scp.capsule_id,
            description: scp.description || '',
            port: scp.port,
            nodeClass: scp.access_rights?.node_class,
            grantedBy: scp.access_rights?.granted_by,
            grantedAt: scp.access_rights?.granted_at,
          };
        } catch { return null; }
      })
      .filter(Boolean);
    res.json(dirs);
  } catch (err) {
    res.status(500).json({ error: 'Could not read modules directory' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[UBVM Portal] Running on port ${PORT}`);
});
