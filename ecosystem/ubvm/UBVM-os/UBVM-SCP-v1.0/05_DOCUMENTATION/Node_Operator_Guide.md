# Node Operator Guide
## Running a UBVM Node

**Spec reference:** UBVM-SPEC-001 v1.0 §4, §6, §7, §12
**Document ref:** UBVM-DOC-NOG-001
**Full operator package:** See 04_LICENSING/Operator_Obligations.md and the standalone Node_Operator_Package

---

## Starting a Node

```javascript
const { UBVMNode } = require('./ubvm.js');

const node = new UBVMNode({
  nodeScope:      'my-production-node',   // unique identifier for this node
  containmentCap: 'CC2',                  // max class this node will accept
  auditLogPath:   '/var/log/ubvm/audit.log' // append-only log path
});
```

Or via CLI:
```bash
node ubvm.js exec my-capsule.scp.json --scope my-production-node --cap CC2 --log /var/log/ubvm/audit.log
```

With PM2:
```bash
pm2 start ubvm.js --name ubvm-node -- exec capsule-dir/ --scope my-node --cap CC2 --log audit.log
pm2 save
pm2 startup
```

---

## Configuring the Containment Cap

The `containmentCap` sets the ceiling for what your node will accept. Setting it to `CC2` means your node will reject any capsule declaring `CC0` or `CC1`, regardless of content.

Recommended caps by deployment context:

| Context | Recommended Cap |
|---------|----------------|
| Public-facing or untrusted capsule intake | CC3 |
| Internal production node | CC2 |
| Privileged internal node (can write files, network) | CC1 |
| Sovereign administrative node | CC0 |

---

## Registering Custom Primitives

```javascript
const node = new UBVMNode({
  nodeScope: 'my-node',
  containmentCap: 'CC2',
  customPrimitives: {
    MY_ANALYSIS_PRIMITIVE: {
      min_class: 'CC3',
      description: 'Run the internal document analysis pipeline',
      handler: async (capsule, context) => {
        // your implementation
        return { result: 'analysis output' };
      }
    }
  }
});
```

Custom primitive names must be uppercase with underscores. They must not start with `UBVM_` (reserved).

---

## Monitoring Via the Event Bus

```javascript
node.on('capsule.accepted', ({ capsule_id, containment_class }) => {
  console.log(`Accepted: ${capsule_id} [${containment_class}]`);
});

node.on('capsule.rejected', ({ capsule_id, error_code, stage }) => {
  console.warn(`Rejected: ${capsule_id} — ${error_code} at stage ${stage}`);
});

node.on('capsule.executed', ({ capsule_id, duration_ms }) => {
  console.log(`Executed: ${capsule_id} in ${duration_ms}ms`);
});
```

---

## Exporting the Audit Log

```javascript
const log = node.exportAuditLog();
// Returns an array of audit records
// Write to file, database, or SIEM of your choice
```

---

## Operator Obligations

By operating a UBVM node under the Meaning Sovereignty Licence v1.0:

1. Do not modify capsule `intent.declared` fields without reauthoring
2. Do not configure your node to bypass containment class enforcement
3. Retain audit logs for a minimum of 90 days
4. Report containment violation attempts to the capsule author if contact is known

---

*UBVM-DOC-NOG-001 · v1.0 · May 2025*
