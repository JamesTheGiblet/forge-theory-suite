/**
 * UBVM Reference Implementation v1.0
 * Universal Behavioural Virtual Machine
 *
 * This is the canonical minimal reference implementation of the UBVM runtime
 * as specified in UBVM-SPEC-001. It is intentionally minimal and maximally
 * readable. Production deployments may extend but MUST NOT contradict this
 * implementation's validation behaviour.
 *
 * Author:  James [Surname] / Forge Theory Labs / Giblets Creations, England
 * Licence: Meaning Sovereignty Licence v1.0
 * Spec:    UBVM-SPEC-001 v1.0
 */

'use strict';

const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { EventEmitter } = require('events');

// ─────────────────────────────────────────────────────────────
// SECTION 1 — CONSTANTS & ENUMS
// ─────────────────────────────────────────────────────────────

const SCP_VERSION = '1.0';

const INTENT_CATEGORIES = new Set([
  'ANALYSIS', 'GENERATION', 'EXECUTION',
  'COMMUNICATION', 'MUTATION', 'CONTAINMENT'
]);

const SENSITIVITY_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const CONTAINMENT_CLASSES = { CC0: 0, CC1: 1, CC2: 2, CC3: 3, CC4: 4, CC5: 5 };

const ERROR_CODES = {
  SCHEMA_MISSING_FIELD:       'SCHEMA_MISSING_FIELD',
  SCHEMA_TYPE_ERROR:          'SCHEMA_TYPE_ERROR',
  SCHEMA_INVALID_ENUM:        'SCHEMA_INVALID_ENUM',
  PROVENANCE_INVALID:         'PROVENANCE_INVALID',
  CHAIN_INVALID:              'CHAIN_INVALID',
  SCOPE_MISMATCH:             'SCOPE_MISMATCH',
  CROSS_NODE_AUTH_INVALID:    'CROSS_NODE_AUTH_INVALID',
  CROSS_NODE_AUTH_EXPIRED:    'CROSS_NODE_AUTH_EXPIRED',
  CONTAINMENT_VIOLATION:      'CONTAINMENT_VIOLATION',
  NODE_CLASS_EXCEEDED:        'NODE_CLASS_EXCEEDED',
  PRIMITIVE_NOT_REGISTERED:   'PRIMITIVE_NOT_REGISTERED',
  CAPSULE_EXPIRED:            'CAPSULE_EXPIRED',
  DUPLICATE_CAPSULE_ID:       'DUPLICATE_CAPSULE_ID',
  EXECUTION_ERROR:            'EXECUTION_ERROR',
};

// ─────────────────────────────────────────────────────────────
// SECTION 2 — PROVENANCE HASH (Spec §9.1)
// ─────────────────────────────────────────────────────────────

/**
 * Recursively sort object keys lexicographically.
 * Arrays are left in order; objects have their keys sorted.
 */
function sortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => {
      acc[k] = sortKeys(obj[k]);
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Compute the canonical SHA-256 hash of a capsule.
 * Excludes provenance.sha256 and metadata as per spec §9.1.
 *
 * @param {object} capsule - The capsule object (will not be mutated)
 * @returns {string} Lowercase hex SHA-256 digest
 */
function canonicalHash(capsule) {
  const c = JSON.parse(JSON.stringify(capsule)); // deep clone
  delete c.provenance.sha256;
  if (c.metadata !== undefined) delete c.metadata;
  const sorted   = sortKeys(c);
  const canonical = JSON.stringify(sorted);       // compact, no whitespace
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────────────────────
// SECTION 3 — VALIDATION PIPELINE (Spec §8.1)
// ─────────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(code, detail, stage) {
    super(`[Stage ${stage}] ${code}: ${detail}`);
    this.code   = code;
    this.detail = detail;
    this.stage  = stage;
  }
}

/**
 * Stage 1 — Schema Validation
 * Verify required fields, types, and enum values.
 */
function validateSchema(capsule) {
  const require = (field, val, type) => {
    if (val === undefined || val === null)
      throw new ValidationError(ERROR_CODES.SCHEMA_MISSING_FIELD, `Missing: ${field}`, 1);
    if (type && typeof val !== type)
      throw new ValidationError(ERROR_CODES.SCHEMA_TYPE_ERROR, `${field} must be ${type}`, 1);
  };

  require('scp_version',              capsule.scp_version,              'string');
  require('capsule_id',               capsule.capsule_id,               'string');
  require('node_scope',               capsule.node_scope,               'string');
  require('intent',                   capsule.intent,                   'object');
  require('intent.declared',          capsule.intent?.declared,         'string');
  require('intent.category',          capsule.intent?.category,         'string');
  require('intent.sensitivity',       capsule.intent?.sensitivity,      'string');
  require('containment_class',        capsule.containment_class,        'string');
  require('author',                   capsule.author,                   'object');
  require('author.id',                capsule.author?.id,               'string');
  require('author.name',              capsule.author?.name,             'string');
  require('provenance',               capsule.provenance,               'object');
  require('provenance.created_at',    capsule.provenance?.created_at,   'string');
  require('provenance.sha256',        capsule.provenance?.sha256,       'string');
  require('primitives',               capsule.primitives);
  require('payload',                  capsule.payload,                  'object');

  if (!Array.isArray(capsule.primitives) || capsule.primitives.length === 0)
    throw new ValidationError(ERROR_CODES.SCHEMA_MISSING_FIELD, 'primitives must be non-empty array', 1);

  if (!INTENT_CATEGORIES.has(capsule.intent.category))
    throw new ValidationError(ERROR_CODES.SCHEMA_INVALID_ENUM, `Unknown category: ${capsule.intent.category}`, 1);

  if (!SENSITIVITY_LEVELS.has(capsule.intent.sensitivity))
    throw new ValidationError(ERROR_CODES.SCHEMA_INVALID_ENUM, `Unknown sensitivity: ${capsule.intent.sensitivity}`, 1);

  if (!(capsule.containment_class in CONTAINMENT_CLASSES))
    throw new ValidationError(ERROR_CODES.SCHEMA_INVALID_ENUM, `Unknown containment_class: ${capsule.containment_class}`, 1);

  if (capsule.intent.declared.trim() === '')
    throw new ValidationError(ERROR_CODES.SCHEMA_MISSING_FIELD, 'intent.declared must not be empty', 1);
}

/**
 * Stage 2 — Provenance Hash Verification
 */
function validateProvenance(capsule) {
  const expected = canonicalHash(capsule);
  if (expected !== capsule.provenance.sha256)
    throw new ValidationError(ERROR_CODES.PROVENANCE_INVALID,
      `Expected ${expected}, got ${capsule.provenance.sha256}`, 2);
}

/**
 * Stage 3 — Node Scope Check
 */
function validateScope(capsule, nodeScope) {
  if (capsule.node_scope !== nodeScope) {
    if (!capsule.cross_node_auth)
      throw new ValidationError(ERROR_CODES.SCOPE_MISMATCH,
        `Capsule scoped to ${capsule.node_scope}, node is ${nodeScope}`, 3);
    // cross_node_auth validation: check target and expiry
    const auth = capsule.cross_node_auth;
    if (auth.target_node_scope !== nodeScope)
      throw new ValidationError(ERROR_CODES.CROSS_NODE_AUTH_INVALID,
        `cross_node_auth targets ${auth.target_node_scope}, not ${nodeScope}`, 3);
    if (auth.expires_at && new Date(auth.expires_at) < new Date())
      throw new ValidationError(ERROR_CODES.CROSS_NODE_AUTH_EXPIRED,
        `cross_node_auth expired at ${auth.expires_at}`, 3);
    // auth_token verification is implementation-defined — emit warning if absent
    if (!auth.auth_token)
      throw new ValidationError(ERROR_CODES.CROSS_NODE_AUTH_INVALID, 'auth_token missing', 3);
  }
}

/**
 * Stage 4 — Containment Class Check
 */
function validateContainment(capsule, nodeClassCap, dispatchTable) {
  const capsuleOrdinal = CONTAINMENT_CLASSES[capsule.containment_class];
  const capOrdinal     = CONTAINMENT_CLASSES[nodeClassCap];

  if (capsuleOrdinal < capOrdinal)
    throw new ValidationError(ERROR_CODES.NODE_CLASS_EXCEEDED,
      `Capsule ${capsule.containment_class} exceeds node cap ${nodeClassCap}`, 4);

  for (const prim of capsule.primitives) {
    const entry = dispatchTable[prim];
    if (!entry) continue; // caught at stage 5
    const primOrdinal = CONTAINMENT_CLASSES[entry.min_class];
    if (primOrdinal < capsuleOrdinal)
      throw new ValidationError(ERROR_CODES.CONTAINMENT_VIOLATION,
        `Primitive ${prim} requires ${entry.min_class}, capsule is ${capsule.containment_class}`, 4);
  }
}

/**
 * Stage 5 — Primitive Registration Check
 */
function validatePrimitives(capsule, dispatchTable) {
  for (const prim of capsule.primitives) {
    if (!dispatchTable[prim])
      throw new ValidationError(ERROR_CODES.PRIMITIVE_NOT_REGISTERED,
        `Primitive not registered: ${prim}`, 5);
  }
}

/**
 * Stage 6 — Expiry Check
 */
function validateExpiry(capsule) {
  if (capsule.expiry && new Date(capsule.expiry) < new Date())
    throw new ValidationError(ERROR_CODES.CAPSULE_EXPIRED,
      `Capsule expired at ${capsule.expiry}`, 6);
}

/**
 * Stage 7 — Duplicate Check
 */
function validateDuplicate(capsule, executedSet) {
  if (executedSet.has(capsule.capsule_id))
    throw new ValidationError(ERROR_CODES.DUPLICATE_CAPSULE_ID,
      `Already executed: ${capsule.capsule_id}`, 7);
}

// ─────────────────────────────────────────────────────────────
// SECTION 4 — AUDIT LOG (Spec §12)
// ─────────────────────────────────────────────────────────────

class AuditLog {
  constructor(logPath) {
    this.logPath = logPath;
    this.stream  = logPath
      ? fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' })
      : null;
    this.records = []; // in-memory for testing / public audit export
  }

  write(type, fields = {}) {
    const record = {
      record_id:   crypto.randomUUID(),
      record_type: type,
      timestamp:   new Date().toISOString(),
      ...fields
    };
    this.records.push(record);
    const line = JSON.stringify(record) + '\n';
    if (this.stream) this.stream.write(line);
    return record;
  }

  close() {
    if (this.stream) this.stream.end();
  }

  /** Export records as a public audit JSON array */
  export() {
    return JSON.parse(JSON.stringify(this.records));
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 5 — CORE PRIMITIVES (Spec §7.2)
// ─────────────────────────────────────────────────────────────

const CORE_PRIMITIVES = {
  READ_TEXT: {
    min_class: 'CC5',
    description: 'Read a UTF-8 text string from payload.text',
    handler: async (capsule) => {
      if (typeof capsule.payload.text !== 'string')
        throw new Error('payload.text must be a string');
      return { text: capsule.payload.text };
    }
  },
  READ_DOCUMENT: {
    min_class: 'CC4',
    description: 'Parse a structured document from payload.document',
    handler: async (capsule) => {
      const doc = capsule.payload.document;
      if (!doc) throw new Error('payload.document is required');
      return { document: doc, length: typeof doc === 'string' ? doc.length : JSON.stringify(doc).length };
    }
  },
  STRUCTURE_OUTPUT: {
    min_class: 'CC5',
    description: 'Format output according to payload.output_schema',
    handler: async (capsule, context) => {
      return {
        output:    context.output || {},
        schema:    capsule.payload.output_schema || null,
        formatted: true
      };
    }
  },
  EMIT_EVENT: {
    min_class: 'CC4',
    description: 'Publish an event to the node event bus',
    handler: async (capsule, context) => {
      const event = capsule.payload.event_name || 'capsule.custom';
      context.bus?.emit(event, { capsule_id: capsule.capsule_id, data: capsule.payload.event_data });
      return { emitted: event };
    }
  },
  VALIDATE_CAPSULE: {
    min_class: 'CC3',
    description: 'Validate a child capsule provenance hash',
    handler: async (capsule) => {
      const child = capsule.payload.child_capsule;
      if (!child) throw new Error('payload.child_capsule required');
      const expected = canonicalHash(child);
      const valid    = expected === child.provenance?.sha256;
      return { valid, expected, received: child.provenance?.sha256 };
    }
  },
  LOG_AUDIT: {
    min_class: 'CC3',
    description: 'Write an operator-defined record to the audit log',
    handler: async (capsule, context) => {
      const entry = context.auditLog.write('OPERATOR_LOG', {
        node_scope: context.nodeScope,
        capsule_id: capsule.capsule_id,
        message:    capsule.payload.log_message || '(no message)'
      });
      return { record_id: entry.record_id };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION 6 — UBVM NODE (Spec §4)
// ─────────────────────────────────────────────────────────────

class UBVMNode extends EventEmitter {
  /**
   * @param {object} config
   * @param {string} config.nodeScope       - This node's NSI
   * @param {string} [config.containmentCap='CC2'] - Max CC this node accepts
   * @param {string} [config.auditLogPath]  - Path to append-only audit log file
   * @param {object} [config.customPrimitives] - Additional primitive registrations
   */
  constructor(config = {}) {
    super();
    this.nodeScope      = config.nodeScope;
    this.containmentCap = config.containmentCap || 'CC2';
    this.auditLog       = new AuditLog(config.auditLogPath || null);
    this.executed       = new Set();   // session duplicate-check store
    this.stats          = { executed: 0, rejected: 0 };

    if (!this.nodeScope)
      throw new Error('UBVMNode requires a nodeScope');
    if (!(this.containmentCap in CONTAINMENT_CLASSES))
      throw new Error(`Invalid containmentCap: ${this.containmentCap}`);

    // Build dispatch table: core + custom
    this.dispatchTable = { ...CORE_PRIMITIVES, ...(config.customPrimitives || {}) };

    this.auditLog.write('NODE_START', {
      node_scope:       this.nodeScope,
      containment_cap:  this.containmentCap,
      primitive_count:  Object.keys(this.dispatchTable).length,
    });
  }

  /**
   * Execute a capsule through the full validation pipeline and primitive dispatch.
   *
   * @param {object|string} capsuleOrJson - Capsule object or JSON string
   * @returns {object} { accepted: bool, result?, rejection? }
   */
  async execute(capsuleOrJson) {
    let capsule;
    try {
      capsule = typeof capsuleOrJson === 'string'
        ? JSON.parse(capsuleOrJson)
        : capsuleOrJson;
    } catch (e) {
      return this._reject(null, 'SCHEMA_TYPE_ERROR', 'Invalid JSON', 1);
    }

    this.auditLog.write('CAPSULE_RECEIVED', {
      node_scope:      this.nodeScope,
      capsule_id:      capsule.capsule_id || null,
      declared_intent: capsule.intent?.declared || null,
      author_id:       capsule.author?.id || null,
    });

    this.emit('capsule.received', { capsule_id: capsule.capsule_id });

    // ── Validation Pipeline ──
    try {
      validateSchema(capsule);                                          // Stage 1
      validateProvenance(capsule);                                      // Stage 2
      validateScope(capsule, this.nodeScope);                           // Stage 3
      validateContainment(capsule, this.containmentCap, this.dispatchTable); // Stage 4
      validatePrimitives(capsule, this.dispatchTable);                  // Stage 5
      validateExpiry(capsule);                                          // Stage 6
      validateDuplicate(capsule, this.executed);                        // Stage 7
    } catch (err) {
      return this._reject(capsule.capsule_id, err.code, err.detail, err.stage);
    }

    this.auditLog.write('CAPSULE_ACCEPTED', {
      node_scope:        this.nodeScope,
      capsule_id:        capsule.capsule_id,
      containment_class: capsule.containment_class,
      primitives:        capsule.primitives,
      author_id:         capsule.author.id,
    });

    this.emit('capsule.accepted', {
      capsule_id:        capsule.capsule_id,
      containment_class: capsule.containment_class,
    });

    // ── Primitive Dispatch ──
    const context = { nodeScope: this.nodeScope, bus: this, auditLog: this.auditLog, output: {} };
    const t0      = Date.now();

    try {
      for (const primName of capsule.primitives) {
        const prim   = this.dispatchTable[primName];
        const result = await prim.handler(capsule, context);
        context.output[primName] = result;
      }
    } catch (err) {
      this.stats.rejected++;
      const rec = this.auditLog.write('CAPSULE_FAILED', {
        node_scope:   this.nodeScope,
        capsule_id:   capsule.capsule_id,
        error_code:   ERROR_CODES.EXECUTION_ERROR,
        error_detail: err.message,
        stage:        'execution',
      });
      this.emit('capsule.failed', { capsule_id: capsule.capsule_id, error: err.message });
      return { accepted: false, rejection: rec };
    }

    this.executed.add(capsule.capsule_id);
    this.stats.executed++;
    const duration_ms = Date.now() - t0;

    const execRec = this.auditLog.write('CAPSULE_EXECUTED', {
      node_scope:      this.nodeScope,
      capsule_id:      capsule.capsule_id,
      primitives:      capsule.primitives,
      duration_ms,
      result_summary:  Object.keys(context.output).join(', '),
    });

    this.emit('capsule.executed', { capsule_id: capsule.capsule_id, duration_ms });

    return { accepted: true, result: context.output, audit: execRec };
  }

  _reject(capsuleId, errorCode, detail, stage) {
    this.stats.rejected++;
    const rec = this.auditLog.write('CAPSULE_REJECTED', {
      node_scope: this.nodeScope,
      capsule_id: capsuleId,
      error_code: errorCode,
      stage,
      detail,
    });
    this.emit('capsule.rejected', { capsule_id: capsuleId, error_code: errorCode, stage });
    return { accepted: false, rejection: rec };
  }

  shutdown() {
    this.auditLog.write('NODE_STOP', {
      node_scope:        this.nodeScope,
      capsules_executed: this.stats.executed,
      capsules_rejected: this.stats.rejected,
    });
    this.auditLog.close();
  }

  /** Export audit log for public publishing */
  exportAuditLog() {
    return this.auditLog.export();
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 7 — CAPSULE BUILDER UTILITY
// ─────────────────────────────────────────────────────────────

/**
 * Build a valid, hashed capsule. The sha256 field is computed automatically.
 *
 * @param {object} fields - All required capsule fields except provenance.sha256
 * @returns {object} Complete capsule with computed hash
 */
function buildCapsule(fields) {
  const capsule = {
    scp_version:      SCP_VERSION,
    capsule_id:       crypto.randomUUID(),
    created_at:       new Date().toISOString(),
    ...fields,
    provenance: {
      created_at:        new Date().toISOString(),
      sha256:            'PENDING',
      parent_capsule_id: fields.parent_capsule_id || null,
      ...(fields.provenance || {}),
    }
  };
  // Remove helper field if accidentally set
  delete capsule.parent_capsule_id;
  // Compute and insert hash
  capsule.provenance.sha256 = canonicalHash(capsule);
  return capsule;
}

// ─────────────────────────────────────────────────────────────
// SECTION 8 — TEST VECTORS (Spec §14)
// ─────────────────────────────────────────────────────────────

async function runTestVectors() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' UBVM/SCP Test Vector Suite — Spec §14');
  console.log('═══════════════════════════════════════════\n');

  const node = new UBVMNode({ nodeScope: 'test-node', containmentCap: 'CC2' });
  let pass = 0, fail = 0;

  const assert = (label, condition, detail = '') => {
    if (condition) {
      console.log(`  ✓ ${label}`);
      pass++;
    } else {
      console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
      fail++;
    }
  };

  // ── Hash Computation ──
  console.log('── Hash Computation ─────────────────────');
  const cap1 = buildCapsule({
    capsule_id: '00000000-0000-4000-8000-000000000001',
    node_scope:  'test-node',
    intent: { declared: 'Test capsule', category: 'ANALYSIS', sensitivity: 'LOW' },
    containment_class: 'CC3',
    author: { id: 'test-operator', name: 'Test' },
    provenance: { created_at: '2025-01-01T00:00:00Z', parent_capsule_id: null },
    primitives: ['READ_TEXT'],
    payload: {}
  });

  const recomputedHash = canonicalHash(cap1);
  assert('Hash is deterministic', recomputedHash === cap1.provenance.sha256);
  assert('Hash is 64 hex chars', /^[0-9a-f]{64}$/.test(cap1.provenance.sha256));
  console.log(`  ℹ Hash vector 1: ${cap1.provenance.sha256}\n`);

  // ── V-01: Valid CC3 capsule ──
  console.log('── Validation Vectors ───────────────────');
  const node3 = new UBVMNode({ nodeScope: 'test-node', containmentCap: 'CC3' });

  const v01 = buildCapsule({
    node_scope: 'test-node',
    intent: { declared: 'Read and structure document', category: 'ANALYSIS', sensitivity: 'LOW' },
    containment_class: 'CC3',
    author: { id: 'op-1', name: 'Test Op' },
    primitives: ['READ_TEXT'],
    payload: { text: 'hello world' }
  });
  const r01 = await node3.execute(v01);
  assert('V-01 Valid CC3 capsule → ACCEPTED', r01.accepted);

  // ── V-02: Tampered intent ──
  const v02 = { ...v01, capsule_id: crypto.randomUUID() };
  v02.intent = { ...v02.intent, declared: 'TAMPERED INTENT — not what was signed' };
  // do NOT recompute hash — simulate tampering
  const r02 = await node3.execute(v02);
  assert('V-02 Tampered intent → REJECTED', !r02.accepted);
  assert('V-02 Error code PROVENANCE_INVALID', r02.rejection?.error_code === 'CAPSULE_REJECTED' ||
    node3.auditLog.records.find(r => r.capsule_id === v02.capsule_id && r.error_code === ERROR_CODES.PROVENANCE_INVALID));

  // ── V-03: Wrong node scope ──
  const v03 = buildCapsule({
    node_scope: 'WRONG-NODE',
    intent: { declared: 'Should not execute here', category: 'ANALYSIS', sensitivity: 'LOW' },
    containment_class: 'CC3',
    author: { id: 'op-1', name: 'Test Op' },
    primitives: ['READ_TEXT'],
    payload: { text: 'test' }
  });
  const r03 = await node3.execute(v03);
  assert('V-03 Wrong scope → REJECTED', !r03.accepted);
  assert('V-03 Error SCOPE_MISMATCH',
    node3.auditLog.records.find(r => r.capsule_id === v03.capsule_id &&
      r.error_code === ERROR_CODES.SCOPE_MISMATCH));

  // ── V-04: CC3 capsule requesting CC1 primitive (WRITE_FILE not registered, test with custom) ──
  const nodeWithWrite = new UBVMNode({
    nodeScope: 'test-node',
    containmentCap: 'CC1',
    customPrimitives: {
      WRITE_FILE: {
        min_class: 'CC1',
        description: 'Test write primitive',
        handler: async () => ({ written: true })
      }
    }
  });
  const v04 = buildCapsule({
    node_scope: 'test-node',
    intent: { declared: 'Attempt privilege escalation', category: 'EXECUTION', sensitivity: 'HIGH' },
    containment_class: 'CC3',       // CC3 capsule...
    author: { id: 'op-1', name: 'Test' },
    primitives: ['WRITE_FILE'],     // ...requesting CC1 primitive
    payload: {}
  });
  const r04 = await nodeWithWrite.execute(v04);
  assert('V-04 CC3 capsule + CC1 primitive → REJECTED', !r04.accepted);
  assert('V-04 Error CONTAINMENT_VIOLATION',
    nodeWithWrite.auditLog.records.find(r => r.capsule_id === v04.capsule_id &&
      r.error_code === ERROR_CODES.CONTAINMENT_VIOLATION));

  // ── V-05: Unregistered primitive ──
  const v05 = buildCapsule({
    node_scope: 'test-node',
    intent: { declared: 'Call unregistered primitive', category: 'EXECUTION', sensitivity: 'LOW' },
    containment_class: 'CC2',
    author: { id: 'op-1', name: 'Test' },
    primitives: ['UNREGISTERED_FOO'],
    payload: {}
  });
  const r05 = await node3.execute(v05);
  assert('V-05 Unregistered primitive → REJECTED', !r05.accepted);

  // ── V-06: Expired capsule ──
  const v06 = buildCapsule({
    node_scope: 'test-node',
    intent: { declared: 'Expired capsule test', category: 'ANALYSIS', sensitivity: 'LOW' },
    containment_class: 'CC3',
    author: { id: 'op-1', name: 'Test' },
    primitives: ['READ_TEXT'],
    payload: { text: 'test' },
    expiry: '2020-01-01T00:00:00Z'  // past date
  });
  const r06 = await node3.execute(v06);
  assert('V-06 Expired capsule → REJECTED', !r06.accepted);

  // ── V-07: Duplicate capsule ID ──
  const v07 = buildCapsule({
    node_scope: 'test-node',
    intent: { declared: 'First execution', category: 'ANALYSIS', sensitivity: 'LOW' },
    containment_class: 'CC3',
    author: { id: 'op-1', name: 'Test' },
    primitives: ['READ_TEXT'],
    payload: { text: 'first' }
  });
  await node3.execute(v07); // first execution: should succeed
  const r07b = await node3.execute(v07); // second: should be rejected
  assert('V-07 Duplicate capsule_id → REJECTED on second', !r07b.accepted);

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════');
  console.log(` Results: ${pass} passed, ${fail} failed`);
  console.log('═══════════════════════════════════════════\n');

  node.shutdown();
  node3.shutdown();
  nodeWithWrite.shutdown();

  return { pass, fail };
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  UBVMNode,
  buildCapsule,
  canonicalHash,
  CONTAINMENT_CLASSES,
  ERROR_CODES,
  CORE_PRIMITIVES,
};

// ─────────────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'test') {
    runTestVectors()
      .then(({ fail }) => process.exit(fail > 0 ? 1 : 0))
      .catch(err => { console.error(err); process.exit(1); });

  } else if (cmd === 'hash') {
    // ubvm.js hash <capsule.scp.json>
    const file    = process.argv[3];
    const capsule = JSON.parse(fs.readFileSync(file, 'utf8'));
    const hash    = canonicalHash(capsule);
    console.log(hash);

  } else if (cmd === 'build') {
    // ubvm.js build <template.json>  — outputs a valid capsule with computed hash
    const file   = process.argv[3];
    const tmpl   = JSON.parse(fs.readFileSync(file, 'utf8'));
    const capsule = buildCapsule(tmpl);
    console.log(JSON.stringify(capsule, null, 2));

  } else if (cmd === 'exec') {
    // ubvm.js exec <capsule.scp.json> --scope <nsi> [--cap CC2] [--log audit.log]
    const args  = process.argv.slice(3);
    const file  = args[0];
    const scope = args[args.indexOf('--scope') + 1] || 'default';
    const cap   = args[args.indexOf('--cap') !== -1 ? args.indexOf('--cap') + 1 : -1] || 'CC2';
    const log   = args[args.indexOf('--log') !== -1 ? args.indexOf('--log') + 1 : -1] || null;

    const node    = new UBVMNode({ nodeScope: scope, containmentCap: cap, auditLogPath: log });
    const capsule = JSON.parse(fs.readFileSync(file, 'utf8'));

    node.execute(capsule).then(result => {
      console.log(JSON.stringify(result, null, 2));
      node.shutdown();
    });

  } else {
    console.log(`
UBVM Reference Implementation v1.0
Spec: UBVM-SPEC-001 | Forge Theory Labs

Usage:
  node ubvm.js test                      Run all test vectors
  node ubvm.js hash <capsule.scp.json>   Compute canonical hash
  node ubvm.js build <template.json>     Build capsule with computed hash
  node ubvm.js exec <capsule.scp.json>   Execute capsule
    --scope <nsi>                        Node scope identifier
    --cap <CC0-CC5>                      Containment cap (default CC2)
    --log <path>                         Append-only audit log path
`);
  }
}
