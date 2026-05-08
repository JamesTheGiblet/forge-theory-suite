#!/usr/bin/env python3
"""
UBVM Extension: datacube/primitives.py
Knowledge extraction and spatial mapping for the Data Cube.
"""

import os
import json
import hashlib
import glob

def primitive_map_to_cube(params: dict, context: dict) -> dict:
    """
    Maps an event or memory into the spatial Data Cube.
    """
    import os
    import json as _json
    import uuid
    import datetime

    ubvm_home = context["ubvm_home"]
    cube_dir = os.path.join(ubvm_home, "data", "incybe", "cube", "nodes")
    os.makedirs(cube_dir, exist_ok=True)

    # Generate a short unique ID for the node
    node_id = str(uuid.uuid4())[:8]
    
    # Extract semantic dimensions (tags) from the event name if present
    dimensions = params.get("dimensions", [])
    if not dimensions and "event" in context:
        event_name = context["event"].get("name", "unknown")
        dimensions = event_name.split(".")
        
    node_data = {
        "node_id": node_id,
        "dimensions": dimensions,
        "content": params.get("core_memory_path", "Event Node"),
        "mapped_at": context["timestamp"],
        "source_scp": context["scp_id"]
    }

    node_path = os.path.join(cube_dir, f"node_{node_id}.json")
    with open(node_path, "w") as f:
        _json.dump(node_data, f, indent=2)

    return {
        "status": "ok",
        "dimensions": dimensions
    }

def primitive_query_cube(params: dict, context: dict) -> dict:
    """
    Query the Data Cube for nodes matching specific semantic dimensions.
    """
    import os
    import glob
    import json as _json

    ubvm_home = context["ubvm_home"]
    cube_dir = os.path.join(ubvm_home, "data", "incybe", "cube", "nodes")

    query_tags = set(params.get("tags", []))
    limit = int(params.get("limit", 10))

    results = []
    if os.path.exists(cube_dir):
        for filepath in glob.glob(os.path.join(cube_dir, "*.json")):
            try:
                with open(filepath, "r") as f:
                    node = _json.load(f)
                    node_dims = set(node.get("dimensions", []))
                    # Check if there is an intersection of tags, or return all if no tags specified
                    if not query_tags or query_tags.intersection(node_dims):
                        results.append(node)
            except Exception:
                continue

    # Sort by mapped_at descending (newest first)
    results.sort(key=lambda x: x.get("mapped_at", ""), reverse=True)

    return {
        "status": "ok",
        "nodes": results[:limit],
        "count": len(results[:limit])
    }

def primitive_archive_cube(params: dict, context: dict) -> dict:
    """
    Archives older nodes to save space, keeping only the most recent ones.
    """
    import os
    import glob
    import json as _json
    import shutil

    ubvm_home = context["ubvm_home"]
    cube_dir = os.path.join(ubvm_home, "data", "incybe", "cube", "nodes")
    archive_dir = os.path.join(ubvm_home, "data", "incybe", "cube", "archive")
    os.makedirs(archive_dir, exist_ok=True)

    content_match = params.get("content_match", "Event Node")
    keep_recent = int(params.get("keep_recent", 50))
    
    nodes_list = []
    if os.path.exists(cube_dir):
        for filepath in glob.glob(os.path.join(cube_dir, "*.json")):
            try:
                with open(filepath, "r") as f:
                    node = _json.load(f)
                if not content_match or node.get("content") == content_match:
                    nodes_list.append((filepath, node.get("mapped_at", "")))
            except Exception:
                continue

    nodes_list.sort(key=lambda x: x[1], reverse=True)
    
    archived_count = 0
    for filepath, _ in nodes_list[keep_recent:]:
        try:
            shutil.move(filepath, os.path.join(archive_dir, os.path.basename(filepath)))
            archived_count += 1
        except Exception:
            pass

    return {
        "status": "ok",
        "archived_count": archived_count,
        "archive_dir": archive_dir
    }

def register() -> dict:
    return {
        "map_to_cube": primitive_map_to_cube,
        "query_cube": primitive_query_cube,
        "archive_cube": primitive_archive_cube
    }