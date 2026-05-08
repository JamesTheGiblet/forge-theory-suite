#!/usr/bin/env python3
"""
UBVM buddai/ear script
Listens for CLI input and emits 'buddai.message.received' to the event bus.
"""
import sys, os
ubvm_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ubvm_root)
os.environ['UBVM_HOME'] = ubvm_root
import interpreter

def main():
    UBVM_HOME = os.environ['UBVM_HOME']
    d = interpreter.build_dispatch(ubvm_home=UBVM_HOME, verbose=False)
    ctx = interpreter.build_context({'scp_id': 'buddai/ear'})

    print("==========================================")
    print(" BuddAI Ear — Organism Input Layer")
    print("==========================================")
    print("Type your message to send it to the Event Bus.")
    print("The BuddAI brain capsule will pick it up automatically.\n")

    while True:
        try:
            msg = input("James: ").strip()
            if not msg:
                continue

            result = d['emit_event']({
                'event': 'buddai.message.received',
                'payload': {'message': msg}
            }, ctx)
            
            if result.get("status") == "ok":
                print(f"  [>] Event queued. (ts: {result['queued']['ts']})")
            else:
                print(f"  [!] Failed to emit event: {result}")

        except KeyboardInterrupt:
            print("\nBuddAI Ear offline.")
            break

if __name__ == '__main__':
    main()