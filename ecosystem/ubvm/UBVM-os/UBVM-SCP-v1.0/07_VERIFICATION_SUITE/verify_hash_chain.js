#!/usr/bin/env node
/**
 * UBVM/SCP Hash Chain Verifier
 * Verifies that a set of capsules form a valid, tamper-evident hash chain.
 *
 * Usage:
 *   node verify_hash_chain.js <directory-of-capsules>
 *   node verify_hash_chain.js ../06_ARTIFACTS/hash_chains/
 *
 * Spec reference: UBVM-SPEC-001 §9.3
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

function verifyChainDir(dirPath) {
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ file: f, capsule: JSON.parse(fs.readFileSync(path.join(dirPath, f))) }));

  if (files.length === 0) { console.log('No capsule files found.'); return; }

  // Build ID index
  const byId = {};
  for (const { capsule } of files) byId[capsule.capsule_id] = capsule;

  let pass = 0, fail = 0;
  console.log('\n══════════════════════════════════════════');
  console.log(' UBVM/SCP Hash Chain Verification');
  console.log('══════════════════════════════════════════\n');

  for (const { file, capsule } of files) {
    const computed = canonicalHash(capsule);
    const declared = capsule.provenance?.sha256;
    const hashOk   = computed === declared;

    if (hashOk) {
      console.log(`  ✓ ${file}`);
      console.log(`    capsule_id: ${capsule.capsule_id}`);
      console.log(`    hash:       ${declared.slice(0,32)}...`);
    } else {
      console.log(`  ✗ ${file} — HASH MISMATCH`);
      console.log(`    expected: ${computed}`);
      console.log(`    declared: ${declared}`);
      fail++;
      continue;
    }

    const parentId = capsule.provenance?.parent_capsule_id;
    if (parentId) {
      const parent = byId[parentId];
      if (!parent) {
        console.log(`    ⚠ parent ${parentId.slice(0,8)}... not found in directory (may be in another file)`);
      } else {
        const parentHash = canonicalHash(parent);
        const parentOk   = parentHash === parent.provenance?.sha256;
        if (parentOk) {
          console.log(`    ↳ parent ${parentId.slice(0,8)}... hash verified ✓`);
        } else {
          console.log(`    ↳ parent ${parentId.slice(0,8)}... hash INVALID ✗`);
          fail++;
        }
      }
    } else {
      console.log(`    ↳ root capsule (no parent)`);
    }
    pass++;
    console.log('');
  }

  console.log('══════════════════════════════════════════');
  console.log(` Results: ${pass} passed, ${fail} failed`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

const dir = process.argv[2] || '../06_ARTIFACTS/hash_chains';
verifyChainDir(dir);
