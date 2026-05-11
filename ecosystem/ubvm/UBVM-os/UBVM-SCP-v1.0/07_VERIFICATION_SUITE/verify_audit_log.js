#!/usr/bin/env node
/**
 * UBVM/SCP Audit Log Verifier
 * Verifies structural integrity of a public_audit_log.json export.
 * Checks: required fields, UUID format, ISO 8601 timestamps, expected record types.
 *
 * Usage:
 *   node verify_audit_log.js <path-to-audit-log.json>
 *   node verify_audit_log.js ../03_PUBLIC_AUDIT_LOG/public_audit_log.json
 *
 * Spec reference: UBVM-SPEC-001 §12
 */
'use strict';
const fs = require('fs');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE  = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const VALID_TYPES = new Set(['NODE_START','NODE_STOP','CAPSULE_RECEIVED','CAPSULE_ACCEPTED',
  'CAPSULE_EXECUTED','CAPSULE_FAILED','CAPSULE_REJECTED','CROSS_NODE_OUTBOUND',
  'CROSS_NODE_INBOUND','OPERATOR_LOG']);

function verifyLog(logPath) {
  const raw = JSON.parse(fs.readFileSync(logPath));
  console.log('\n══════════════════════════════════════════');
  console.log(' UBVM/SCP Audit Log Verifier');
  console.log('══════════════════════════════════════════\n');
  console.log(`  File: ${logPath}`);
  console.log(`  Exported at: ${raw.export_info?.exported_at || 'unknown'}`);
  console.log(`  Spec: ${raw.export_info?.spec_version || 'unknown'}\n`);

  let totalRecords=0, pass=0, fail=0;
  const typeSeen = {};

  for (const [nodeId, nodeData] of Object.entries(raw.nodes || {})) {
    console.log(`  ── Node: ${nodeId} (cap: ${nodeData.containment_cap}) ──`);
    const records = nodeData.records || [];
    for (const rec of records) {
      totalRecords++;
      const errs = [];
      if (!rec.record_id || !UUID_RE.test(rec.record_id))    errs.push('record_id not UUID');
      if (!rec.timestamp || !ISO_RE.test(rec.timestamp))      errs.push('timestamp not ISO 8601');
      if (!rec.node_scope)                                     errs.push('missing node_scope');
      if (!VALID_TYPES.has(rec.record_type))                   errs.push('unknown record_type: '+rec.record_type);
      typeSeen[rec.record_type] = (typeSeen[rec.record_type]||0)+1;
      if (errs.length) {
        console.log(`    ✗ ${rec.record_type} — ${errs.join('; ')}`);
        fail++;
      } else {
        pass++;
      }
    }
    console.log(`    ${records.length} records: ${records.map(r=>r.record_type).join(', ')}`);
    console.log('');
  }

  console.log('  Record type summary:');
  for (const [t,n] of Object.entries(typeSeen)) console.log(`    ${t}: ${n}`);

  console.log('\n══════════════════════════════════════════');
  console.log(` Total: ${totalRecords} records. ${pass} valid, ${fail} errors.`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

verifyLog(process.argv[2] || '../03_PUBLIC_AUDIT_LOG/public_audit_log.json');
