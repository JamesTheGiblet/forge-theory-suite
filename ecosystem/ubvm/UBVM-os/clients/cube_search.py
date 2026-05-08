#!/usr/bin/env python3
import sys, os
import argparse
import json

ubvm_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ubvm_root)
os.environ['UBVM_HOME'] = ubvm_root
import interpreter

def main():
    parser = argparse.ArgumentParser(description="Search the UBVM Data Cube")
    parser.add_argument("tags", nargs="*", help="Tags to search for in dimensions")
    parser.add_argument("--limit", type=int, default=10, help="Max results to return")
    args = parser.parse_args()

    UBVM_HOME = os.environ['UBVM_HOME']
    d = interpreter.build_dispatch(ubvm_home=UBVM_HOME, verbose=False)
    ctx = interpreter.build_context({'scp_id': 'clients/cube_search'})

    if 'query_cube' not in d:
        print("Error: query_cube primitive not found in UBVM dispatch.")
        sys.exit(1)

    print(f"Searching Data Cube for tags: {args.tags if args.tags else '[all]'} (limit: {args.limit})")
    
    result = d['query_cube']({
        'tags': args.tags,
        'limit': args.limit
    }, ctx)

    nodes = result.get('nodes', [])
    print(f"\nFound {len(nodes)} nodes:\n" + "-"*60)
    for node in nodes:
        print(f"ID:      {node.get('node_id', 'unknown')} | Mapped: {node.get('mapped_at', '')}")
        print(f"Tags:    [{', '.join(node.get('dimensions', []))}]")
        
        content_val = node.get('content', '')
        
        # Attempt to read the content if it's a file path
        if content_val and isinstance(content_val, str):
            file_path = os.path.join(UBVM_HOME, content_val) if not os.path.isabs(content_val) else content_val
            if os.path.isfile(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_data = json.load(f)
                        content_val = f"[File: {content_val}]\n" + json.dumps(file_data, indent=2)
                except Exception:
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content_val = f"[File: {content_val}]\n" + f.read().strip()
                    except Exception as e:
                        content_val = f"{content_val} (Error reading file: {e})"
                        
        print(f"Content: {content_val}\n" + "-" * 60)

if __name__ == '__main__':
    main()