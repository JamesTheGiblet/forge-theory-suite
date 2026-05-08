#!/usr/bin/env python3
"""
UBVM buddai/mouth script
Tails the event bus and prints any 'buddai.thought.generated' events.
"""
import sys, os, json, time
ubvm_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ubvm_root)
os.environ['UBVM_HOME'] = ubvm_root

def tail_events(queue_path):
    """Generator that yields new lines from a file."""
    try:
        with open(queue_path, 'r') as f:
            # Go to the end of the file
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line:
                    time.sleep(0.5) # Wait for new lines
                    continue
                yield line
    except FileNotFoundError:
        print(f"\n[!] Event queue file not found at {queue_path}. Exiting.")
        return

def main():
    UBVM_HOME = os.environ['UBVM_HOME']
    queue_path = os.path.join(UBVM_HOME, "logs", "events", "queue.jsonl")

    print("==========================================")
    print(" BuddAI Mouth — Organism Output Layer")
    print("==========================================")
    print("Listening for thoughts on the Event Bus...\n")

    try:
        for line in tail_events(queue_path):
            try:
                event = json.loads(line)
                if event.get("event") == "buddai.thought.generated":
                    thought = event.get("payload", {}).get("thought", "")
                    print(f"BuddAI: {thought}\n")
            except json.JSONDecodeError:
                continue # Ignore malformed lines
    except KeyboardInterrupt:
        print("\nBuddAI Mouth offline.")

if __name__ == '__main__':
    main()