#!/usr/bin/env python3
import sys, os, json
import argparse

# Add UBVM root to path
ubvm_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ubvm_root)
os.environ['UBVM_HOME'] = ubvm_root
import interpreter

def main():
    parser = argparse.ArgumentParser(description="Test a UBVM Forge capsule directly.")
    parser.add_argument("type", choices=['scp', 'python'], help="The type of artifact to forge.")
    parser.add_argument("prompt", type=str, help="The detailed request for what to build.")
    args = parser.parse_args()

    capsule_path = os.path.join(ubvm_root, 'capsules', 'buddai', f'buddai.forge-{args.type}.scp.json')
    event_name = f'buddai.request.build_{args.type}'
    
    print(f"--- Testing Forge: {args.type} ---")
    print(f"Capsule: {capsule_path}")
    print(f"Event: {event_name}")
    print(f"Request: {args.prompt}\n")

    try:
        capsule = interpreter.load_capsule(capsule_path)
    except Exception as e:
        print(f"Error loading capsule: {e}")
        sys.exit(1)

    # Build the full dispatch table including extensions
    dispatch = interpreter.build_dispatch(ubvm_home=ubvm_root, verbose=True)

    # Run the capsule
    result = interpreter.run_capsule(
        capsule,
        trigger_type="on_event",
        event_name=event_name,
        event_payload={"request": args.prompt},
        dispatch=dispatch
    )

    print("--- Interpreter Result ---")
    print(json.dumps(result, indent=2))
    
    if result.get('status') == 'ok':
        print("\n--- Forge Test Succeeded ---")
    else:
        print("\n--- Forge Test Failed ---")
        print("Review the errors in the interpreter result above.")

if __name__ == '__main__':
    main()