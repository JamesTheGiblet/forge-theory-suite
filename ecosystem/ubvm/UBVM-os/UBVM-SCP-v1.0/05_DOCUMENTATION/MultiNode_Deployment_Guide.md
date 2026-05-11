# Multi-Node Deployment Guide
## Running UBVM in a Multi-Node Topology

**Spec reference:** UBVM-SPEC-001 v1.0 §11
**Document ref:** UBVM-DOC-MND-001

---

## Topology Model

Each node has a unique NSI. Nodes communicate via the shared event bus. Cross-node capsule execution requires explicit authorisation.

```
Node A (analysis)  ←──event bus──→  Node B (storage)
     │                                    │
     └── cross_node_auth ────────────────▶│
         (CC1 capsule, signed token)
```

---

## Setting Up Two Nodes

```javascript
// Node A — analysis
const nodeA = new UBVMNode({ nodeScope: 'forge-analysis-01', containmentCap: 'CC2' });

// Node B — storage (higher privilege — can write files)
const nodeB = new UBVMNode({
  nodeScope: 'forge-storage-01',
  containmentCap: 'CC1',
  customPrimitives: {
    WRITE_FILE: {
      min_class: 'CC1',
      description: 'Write to output path',
      handler: async (capsule) => { /* ... */ }
    }
  }
});
```

---

## Cross-Node Capsule Execution

To execute a capsule on Node B from Node A:

```javascript
// 1. Build the capsule scoped to Node B
const crossNodeCapsule = buildCapsule({
  node_scope: 'forge-storage-01',  // scoped to B
  intent: { declared: 'Write analysis results to storage', category: 'EXECUTION', sensitivity: 'MEDIUM' },
  containment_class: 'CC1',
  author: { id: 'op-001', name: 'Forge Theory Labs' },
  primitives: ['WRITE_FILE'],
  payload: { content: 'results...' }
});

// 2. Add cross_node_auth (post-hash — metadata is excluded from hash)
crossNodeCapsule.cross_node_auth = {
  target_node_scope: 'forge-storage-01',
  authorised_by:     'forge-analysis-01',
  auth_token:        '<signed JWT or token>',
  expires_at:        new Date(Date.now() + 3600000).toISOString()
};

// 3. Submit directly to Node B
const result = await nodeB.execute(crossNodeCapsule);
```

**Important:** `cross_node_auth` is added after hash computation because it is metadata (excluded from the hash per spec §9.1). The capsule content and intent are still cryptographically bound.

---

## Scope Isolation Guarantee

Node A will reject any capsule scoped to `forge-storage-01` unless it carries a valid `cross_node_auth` targeting Node A. This is enforced at Stage 3 of the validation pipeline — it cannot be bypassed.

---

*UBVM-DOC-MND-001 · v1.0 · May 2025*
