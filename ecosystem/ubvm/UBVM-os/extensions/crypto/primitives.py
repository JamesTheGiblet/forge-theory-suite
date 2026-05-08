#!/usr/bin/env python3
"""
UBVM Extension: crypto/primitives.py
SCP 0.2 Cryptographic Integrity and Trust Scoring.
"""

import os
import json
import hmac
import hashlib

def _get_canonical_bytes(capsule: dict) -> bytes:
    """Extracts immutable fields to generate a canonical byte string for signing."""
    immutable_data = {
        "scp_id": capsule.get("scp_id"),
        "scp_version": capsule.get("scp_version"),
        "object_class": capsule.get("object_class"),
        "intent": capsule.get("intent"),
        "containment": capsule.get("containment", {}),
        "provenance": capsule.get("provenance", {})
    }
    # Dump with sorted keys for deterministic output
    return json.dumps(immutable_data, sort_keys=True, separators=(',', ':')).encode('utf-8')

def primitive_sign_capsule(params: dict, context: dict) -> dict:
    """
    Cryptographically signs a capsule's immutable fields.
    """
    secret_key = params.get("secret_key") or os.environ.get("UBVM_PRIVATE_KEY")
    if not secret_key:
        return {"status": "error", "error": "secret_key parameter or UBVM_PRIVATE_KEY env var required"}
        
    capsule_path = params.get("capsule_path")
    if not capsule_path:
        return {"status": "error", "error": "capsule_path is required"}
        
    if not os.path.isabs(capsule_path):
        capsule_path = os.path.join(context["ubvm_home"], capsule_path)
        
    try:
        with open(capsule_path, "r") as f:
            capsule = json.load(f)
            
        canonical_bytes = _get_canonical_bytes(capsule)
        signature = hmac.new(secret_key.encode('utf-8'), canonical_bytes, hashlib.sha256).hexdigest()
        
        capsule["signature"] = signature
        
        with open(capsule_path, "w") as f:
            json.dump(capsule, f, indent=2)
            
        return {"status": "ok", "signature": signature, "capsule_path": capsule_path}
    except Exception as e:
        return {"status": "error", "error": f"Failed to sign capsule: {str(e)}"}

def primitive_verify_signature(params: dict, context: dict) -> dict:
    """
    Verifies the cryptographic integrity of a capsule.
    """
    public_key = params.get("public_key") or os.environ.get("UBVM_PUBLIC_KEY")
    if not public_key:
        return {"status": "error", "error": "public_key parameter or UBVM_PUBLIC_KEY env var required"}
        
    capsule = params.get("capsule") or context.get("capsule")
    if not capsule:
        return {"status": "error", "error": "capsule object is required"}
        
    provided_signature = capsule.get("signature")
    if not provided_signature:
        return {"status": "error", "error": "Capsule is not signed"}
        
    canonical_bytes = _get_canonical_bytes(capsule)
    expected_signature = hmac.new(public_key.encode('utf-8'), canonical_bytes, hashlib.sha256).hexdigest()
    
    is_valid = hmac.compare_digest(expected_signature, provided_signature)
    return {"status": "ok", "is_valid": is_valid}

def primitive_compute_trust_score(params: dict, context: dict) -> dict:
    """
    Computes a formal trust score (0.0 to 1.0) for a capsule based on provenance and integrity.
    """
    capsule = params.get("capsule") or context.get("capsule", {})
    score = 0.0
    
    if capsule.get("signature"):
        score += 0.5  # Base trust for having a signature
    
    provenance = capsule.get("provenance", {})
    if provenance.get("author") and provenance.get("author") != "unknown":
        score += 0.3
    if provenance.get("lineage"):
        score += 0.2  # Traceable lineage adds trust
        
    return {"status": "ok", "trust_score": round(score, 2), "scp_id": capsule.get("scp_id")}

def register() -> dict:
    return {
        "sign_capsule": primitive_sign_capsule,
        "verify_signature": primitive_verify_signature,
        "compute_trust_score": primitive_compute_trust_score
    }