# Changelog

## v1.0 — May 2025 — First Published Release

### Added
- UBVM-SPEC-001 v1.0: Complete normative specification (17 sections, ~790 lines)
- Reference implementation `ubvm.js` (~742 lines, zero external dependencies)
- Test vector suite: 12 vectors, 12 passing
- Hash vector 1 canonical value: `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff`
- JSON Schema for capsule format validation (schema/scp_capsule_schema_v1.0.json)
- Seven-stage validation pipeline with deterministic rejection semantics
- Containment classes CC0–CC5 with runtime enforcement
- Six core primitives: READ_TEXT, READ_DOCUMENT, STRUCTURE_OUTPUT, EMIT_EVENT, VALIDATE_CAPSULE, LOG_AUDIT
- Audit log format: 9 record types, append-only, JSON-per-line
- Event bus: 7 standard events
- Multi-node scoped execution with cross-node authorisation
- 13 error codes with stage attribution
- Public audit log from live two-node deployment (forge-analysis-01, forge-storage-01)
- Complete documentation suite: architecture, capsule authoring, node operation, multi-node, security
- Verification suite: hash chain verifier, capsule validity verifier, audit log verifier
- Public verification challenge
- Known-good results: expected hashes, validation results, audit log structure
- Meaning Sovereignty Licence v1.0
- IP clinic prior art dossier
- Six containment class example capsules (CC0–CC5)
- Three hash chain artefacts (root, intermediate, leaf)
- Provenance canonical JSON and SHA-256 computation examples

### Prior versions
None. This is the first published release of UBVM/SCP.

---

*UBVM-CHANGELOG-001 · v1.0 · May 2025*
