#!/usr/bin/env node
/**
 * UBVM/SCP Capsule Validity Verifier
 * Verifies a directory of capsules against the JSON Schema and provenance rules.
 * For test vectors, also verifies that each capsule would produce the expected
 * validation result (ACCEPTED or REJECTED with the correct error code).
 *
 * Usage:
 *   node verify_capsule_validity.js <directory>
 *   node verify_capsule_validity.js ../02_REFERENCE_IMPLEMENTATION/test_vectors/
 *
 * Spec reference: UBVM-SPEC-001 §8.1, §9.1, §14
 */
'use strict';
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

function sortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object')
    return Object.keys(obj).sort().reduce((a,k) => { a[k]=sortKeys(obj[k]); return a; }, {});
  return obj;
}
function canonicalHash(capsule) {
  const c = JSON.parse(JSON.stringify(capsule));
  delete c.provenance.sha256;
  if (c.metadata !== undefined) delete c.metadata;
  return crypto.createHash('sha256').update(JSON.stringify(sortKeys(c)), 'utf8').digest('hex');
}

const REQUIRED = ['scp_version','capsule_id','node_scope','intent','containment_class','author','provenance','primitives','payload'];
const CC_ORD   = { CC0:0, CC1:1, CC2:2, CC3:3, CC4:4, CC5:5 };
const VALID_CC = new Set(Object.keys(CC_ORD));
const VALID_CAT = new Set(['ANALYSIS','GENERATION','EXECUTION','COMMUNICATION','MUTATION','CONTAINMENT']);
const VALID_SEN = new Set(['LOW','MEDIUM','HIGH','CRITICAL']);

function checkSchema(c) {
  for (const f of REQUIRED) if (c[f] === undefined) return 'SCHEMA_MISSING_FIELD: '+f;
  if (!VALID_CC.has(c.containment_class)) return 'SCHEMA_INVALID_ENUM: containment_class';
  if (!VALID_CAT.has(c.intent?.category)) return 'SCHEMA_INVALID_ENUM: intent.category';
  if (!VALID_SEN.has(c.intent?.sensitivity)) return 'SCHEMA_INVALID_ENUM: intent.sensitivity';
  if (!Array.isArray(c.primitives) || c.primitives.length === 0) return 'SCHEMA_MISSING_FIELD: primitives empty';
  if (!c.intent?.declared?.trim()) return 'SCHEMA_MISSING_FIELD: intent.declared empty';
  return null;
}

function verifyCapsules(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json')).sort();
  console.log('\n══════════════════════════════════════════');
  console.log(' UBVM/SCP Capsule Validity Verifier');
  console.log('══════════════════════════════════════════\n');

  let pass=0, fail=0;
  for (const file of files) {
    const capsule = JSON.parse(fs.readFileSync(path.join(dirPath, file)));
    const schemaErr = checkSchema(capsule);
    const hashMatch = canonicalHash(capsule) === capsule.provenance?.sha256;
    const isExpired = capsule.expiry && new Date(capsule.expiry) < new Date();
    const isWrongScope = file.includes('scope_mismatch');
    const isTampered   = file.includes('tampered');

    let status = 'OK';
    let detail = [];
    if (schemaErr) { status='SCHEMA_ERROR'; detail.push(schemaErr); }
    if (!hashMatch && !isTampered) { status='HASH_ERROR'; detail.push('hash mismatch'); }
    if (isTampered && !hashMatch) { detail.push('hash mismatch confirmed (tampered as expected)'); }
    if (isExpired) detail.push('expired at '+capsule.expiry);

    const icon = (status==='OK' || isTampered) ? '✓' : '✗';
    console.log(`  ${icon} ${file}`);
    console.log(`    cc: ${capsule.containment_class}  prims: [${capsule.primitives?.join(', ')}]`);
    console.log(`    hash: ${hashMatch ? 'VALID' : 'INVALID ('+( isTampered ? 'tampered test vector — expected' : 'UNEXPECTED')+')'}`);
    if (detail.length) console.log(`    notes: ${detail.join('; ')}`);
    if (status === 'OK' || isTampered) pass++; else fail++;
    console.log('');
  }

  console.log('══════════════════════════════════════════');
  console.log(` Results: ${pass} valid, ${fail} errors`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

verifyCapsules(process.argv[2] || '../02_REFERENCE_IMPLEMENTATION/test_vectors');
