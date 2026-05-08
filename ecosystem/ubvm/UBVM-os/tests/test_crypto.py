#!/usr/bin/env python3
"""
UBVM test_crypto.py
Validates the SCP 0.2 cryptographic integrity and trust scoring primitives.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from interpreter import build_dispatch, load_capsule

def run_crypto_test():
    # 1. Setup a symmetric key for HMAC signing
    os.environ["UBVM_PRIVATE_KEY"] = "super_secret_forge_key"
    os.environ["UBVM_PUBLIC_KEY"] = "super_secret_forge_key"

    dispatch = build_dispatch(verbose=True)
    ctx = {"ubvm_home": os.getcwd(), "timestamp": "2026-05-05T12:00:00Z", "scp_id": "crypto-test"}
    capsule_path = "capsules/fixtures/ubvm.chain-test-a.scp.json"

    print("--- 1. Signing Capsule ---")
    res_sign = dispatch["sign_capsule"]({"capsule_path": capsule_path}, ctx)
    print(json.dumps(res_sign, indent=2))

    print("\n--- 2. Verifying Signature & Computing Trust ---")
    capsule = load_capsule(capsule_path)
    res_verify = dispatch["verify_signature"]({"capsule": capsule}, ctx)
    res_trust = dispatch["compute_trust_score"]({"capsule": capsule}, ctx)
    print(json.dumps({**res_verify, **res_trust}, indent=2))

if __name__ == "__main__":
    run_crypto_test()