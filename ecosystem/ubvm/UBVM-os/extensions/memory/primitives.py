#!/usr/bin/env python3
"""
UBVM Extension: memory/primitives.py
BuddAI cognitive memory system.

Short term memory — weighted, decays via Forge Theory exponential decay.
Long term memory  — promoted from short term, permanent, cold-archivable.

Decay formula: weight(t) = initial_weight * e^(-k * days_since_last_access)
Decay constant k: 0.1 (default) — memory halves in ~7 days without access.

Memory lifecycle:
    form_memory        → writes to short term
    access_memory      → retrieves + updates last_accessed + boosts weight
    promote_memory     → moves short term → long term
    decay_memories     → runs decay on all short term, archives below threshold
    retrieve_memory    → pulls from both stores, tagged with tier
    consolidate_memory → nightly learning loop: cluster, distil, promote/expire
"""

import os
import json
import math
import glob
import datetime
import hashlib


# ─────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────

DECAY_K             = 0.1    # decay constant — memory halves in ~7 days
PROMOTE_THRESHOLD   = 0.8    # weight above which short term → long term
EXPIRE_THRESHOLD    = 0.05   # weight below which short term → cold archive
INITIAL_WEIGHT      = 1.0    # starting weight for new memories
ACCESS_BOOST        = 0.2    # weight boost on access
MAX_SHORT_TERM      = 50     # max short term memories before forced consolidation


# ─────────────────────────────────────────────────────────────
# DIRECTORY HELPERS
# ─────────────────────────────────────────────────────────────

def _memory_dirs(ubvm_home: str) -> tuple:
    base     = os.path.join(ubvm_home, "data", "buddai")
    short    = os.path.join(base, "memory", "short_term")
    long_    = os.path.join(base, "memory", "long_term")
    archive  = os.path.join(base, "memory", "archive")
    os.makedirs(short,   exist_ok=True)
    os.makedirs(long_,   exist_ok=True)
    os.makedirs(archive, exist_ok=True)
    return short, long_, archive


def _memory_id(thought: str, ts: str) -> str:
    return hashlib.sha256(f"{ts}:{thought[:80]}".encode()).hexdigest()[:16]


def _days_since(ts_str: str) -> float:
    try:
        then = datetime.datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%SZ")
        now  = datetime.datetime.utcnow()
        return (now - then).total_seconds() / 86400.0
    except Exception:
        return 0.0


def _compute_weight(memory: dict) -> float:
    """
    Recompute current weight using Forge Theory exponential decay.
    weight(t) = initial_weight * e^(-k * days_since_last_access)
    """
    initial      = memory.get("initial_weight", INITIAL_WEIGHT)
    last_access  = memory.get("last_accessed", memory.get("ts", ""))
    days         = _days_since(last_access)
    k            = memory.get("decay_k", DECAY_K)
    return round(initial * math.exp(-k * days), 6)


def _load_memories(directory: str) -> list:
    memories = []
    for fpath in glob.glob(os.path.join(directory, "*.json")):
        try:
            with open(fpath) as f:
                memories.append(json.load(f))
        except Exception:
            continue
    return sorted(memories, key=lambda m: m.get("ts", ""), reverse=True)


def _save_memory(directory: str, memory: dict):
    path = os.path.join(directory, f"{memory['id']}.json")
    with open(path, "w") as f:
        json.dump(memory, f, indent=2)


def _delete_memory(directory: str, memory_id: str):
    path = os.path.join(directory, f"{memory_id}.json")
    if os.path.exists(path):
        os.remove(path)


# ─────────────────────────────────────────────────────────────
# form_memory — write to short term
# ─────────────────────────────────────────────────────────────

def primitive_form_memory(params: dict, context: dict) -> dict:
    """
    Store a new thought in short term memory with initial weight.

    Params:
        thought        (str)   — the thought to store
        tags           (list)  — optional tags
        initial_weight (float) — starting weight. Default: 1.0
        decay_k        (float) — decay constant. Default: 0.1

    Returns:
        status, memory_id, tier, weight
    """
    ubvm_home           = context["ubvm_home"]
    short_dir, _, _     = _memory_dirs(ubvm_home)

    thought        = params.get("thought", "")
    tags           = params.get("tags", [])
    initial_weight = float(params.get("initial_weight", INITIAL_WEIGHT))
    decay_k        = float(params.get("decay_k", DECAY_K))
    ts             = context["timestamp"]

    if not thought:
        return {"status": "error", "error": "No thought provided"}

    mem_id = _memory_id(thought, ts)
    memory = {
        "id":             mem_id,
        "thought":        thought,
        "tags":           tags,
        "ts":             ts,
        "last_accessed":  ts,
        "access_count":   0,
        "initial_weight": initial_weight,
        "decay_k":        decay_k,
        "weight":         initial_weight,
        "tier":           "short_term",
        "source":         context.get("scp_id", "unknown"),
    }
    _save_memory(short_dir, memory)

    return {
        "status":    "ok",
        "memory_id": mem_id,
        "tier":      "short_term",
        "weight":    initial_weight,
    }


# ─────────────────────────────────────────────────────────────
# retrieve_memory — pull from both tiers
# ─────────────────────────────────────────────────────────────

def primitive_retrieve_memory(params: dict, context: dict) -> dict:
    """
    Retrieve memories from both short term and long term stores.
    Updates weight on access (access boost applied).
    Tags each memory with its tier so BuddAI knows provenance.

    Params:
        max_memories   (int)   — total memories to return. Default: 10
        min_weight     (float) — minimum weight to include. Default: 0.0
        tags           (list)  — filter by tags (optional)
        tier           (str)   — 'short_term', 'long_term', or 'all'. Default: 'all'
        update_access  (bool)  — boost weight on retrieval. Default: True

    Returns:
        status, memories, short_term_count, long_term_count, memory_count
    """
    ubvm_home              = context["ubvm_home"]
    short_dir, long_dir, _ = _memory_dirs(ubvm_home)

    max_memories  = int(params.get("max_memories", 10))
    min_weight    = float(params.get("min_weight", 0.0))
    tag_filter    = params.get("tags", [])
    tier_filter   = params.get("tier", "all")
    update_access = params.get("update_access", True)
    ts            = context["timestamp"]

    all_memories = []

    if tier_filter in ("short_term", "all"):
        for m in _load_memories(short_dir):
            m["weight"] = _compute_weight(m)
            m["tier"]   = "short_term"
            all_memories.append(m)

    if tier_filter in ("long_term", "all"):
        for m in _load_memories(long_dir):
            m["weight"] = _compute_weight(m)
            m["tier"]   = "long_term"
            all_memories.append(m)

    # Filter by tag
    if tag_filter:
        all_memories = [m for m in all_memories
                        if any(t in m.get("tags", []) for t in tag_filter)]

    # Filter by weight
    all_memories = [m for m in all_memories if m["weight"] >= min_weight]

    # Sort — long term first (stable knowledge), then short term by weight
    long_term  = sorted([m for m in all_memories if m["tier"] == "long_term"],
                        key=lambda m: m["weight"], reverse=True)
    short_term = sorted([m for m in all_memories if m["tier"] == "short_term"],
                        key=lambda m: m["weight"], reverse=True)

    selected = (long_term + short_term)[:max_memories]

    # Update access on selected memories
    if update_access:
        for m in selected:
            m["last_accessed"] = ts
            m["access_count"]  = m.get("access_count", 0) + 1
            # Boost weight on access — but cap at initial_weight
            boosted = min(m["weight"] + ACCESS_BOOST, m.get("initial_weight", INITIAL_WEIGHT))
            m["weight"]        = round(boosted, 6)
            # Save back to correct tier
            save_dir = long_dir if m["tier"] == "long_term" else short_dir
            _save_memory(save_dir, m)

    # Add human-readable age label
    for m in selected:
        days = _days_since(m.get("ts", ""))
        if days < 1:
            m["age"] = "today"
        elif days < 7:
            m["age"] = f"{int(days)} days ago"
        elif days < 30:
            m["age"] = f"{int(days/7)} weeks ago"
        else:
            m["age"] = f"{int(days/30)} months ago"

    return {
        "status":           "ok",
        "memories":         selected,
        "memory_count":     len(selected),
        "short_term_count": len([m for m in selected if m["tier"] == "short_term"]),
        "long_term_count":  len([m for m in selected if m["tier"] == "long_term"]),
    }


# ─────────────────────────────────────────────────────────────
# promote_memory — short term → long term
# ─────────────────────────────────────────────────────────────

def primitive_promote_memory(params: dict, context: dict) -> dict:
    """
    Manually promote a memory from short term to long term.

    Params:
        memory_id (str) — ID of memory to promote
        note      (str) — reason for promotion

    Returns:
        status, memory_id, thought
    """
    ubvm_home              = context["ubvm_home"]
    short_dir, long_dir, _ = _memory_dirs(ubvm_home)

    memory_id = params.get("memory_id", "")
    note      = params.get("note", "manually promoted")

    path = os.path.join(short_dir, f"{memory_id}.json")
    if not os.path.exists(path):
        return {"status": "error", "error": f"Memory {memory_id} not found in short term"}

    with open(path) as f:
        memory = json.load(f)

    memory["tier"]           = "long_term"
    memory["promoted_at"]    = context["timestamp"]
    memory["promotion_note"] = note
    memory["initial_weight"] = max(memory.get("weight", INITIAL_WEIGHT), INITIAL_WEIGHT)
    memory["decay_k"]        = DECAY_K * 0.5  # long term decays slower

    _save_memory(long_dir, memory)
    _delete_memory(short_dir, memory_id)

    return {
        "status":    "ok",
        "memory_id": memory_id,
        "thought":   memory.get("thought", "")[:200],
        "promoted":  True,
    }


# ─────────────────────────────────────────────────────────────
# decay_memories — run decay cycle, expire or archive weak memories
# ─────────────────────────────────────────────────────────────

def primitive_decay_memories(params: dict, context: dict) -> dict:
    """
    Run the decay cycle on short term memories.
    - Recompute weights via Forge Theory decay
    - Promote memories above PROMOTE_THRESHOLD to long term
    - Archive memories below EXPIRE_THRESHOLD
    - Log summary

    Params:
        promote_threshold (float) — Default: 0.8
        expire_threshold  (float) — Default: 0.05
        dry_run           (bool)  — if True, report only, don't move files

    Returns:
        status, promoted, archived, remaining, summary
    """
    ubvm_home                    = context["ubvm_home"]
    short_dir, long_dir, archive = _memory_dirs(ubvm_home)

    promote_threshold = float(params.get("promote_threshold", PROMOTE_THRESHOLD))
    expire_threshold  = float(params.get("expire_threshold",  EXPIRE_THRESHOLD))
    dry_run           = params.get("dry_run", False)
    ts                = context["timestamp"]

    memories  = _load_memories(short_dir)
    promoted  = []
    archived  = []
    remaining = []

    for m in memories:
        weight = _compute_weight(m)
        m["weight"] = weight

        if weight >= promote_threshold:
            if not dry_run:
                m["tier"]           = "long_term"
                m["promoted_at"]    = ts
                m["promotion_note"] = "auto-promoted by decay cycle"
                m["decay_k"]        = m.get("decay_k", DECAY_K) * 0.5
                _save_memory(long_dir, m)
                _delete_memory(short_dir, m["id"])
            promoted.append({"id": m["id"], "weight": weight,
                              "thought": m.get("thought","")[:100]})

        elif weight <= expire_threshold:
            if not dry_run:
                m["archived_at"] = ts
                m["tier"]        = "archive"
                _save_memory(archive, m)
                _delete_memory(short_dir, m["id"])
            archived.append({"id": m["id"], "weight": weight,
                             "thought": m.get("thought","")[:100]})

        else:
            if not dry_run:
                m["weight"] = weight
                _save_memory(short_dir, m)
            remaining.append({"id": m["id"], "weight": round(weight, 4)})

    return {
        "status":    "ok",
        "promoted":  len(promoted),
        "archived":  len(archived),
        "remaining": len(remaining),
        "dry_run":   dry_run,
        "summary":   {
            "promoted_memories":  promoted,
            "archived_memories":  archived,
        }
    }


# ─────────────────────────────────────────────────────────────
# consolidate_memory — nightly learning loop
# ─────────────────────────────────────────────────────────────

def primitive_consolidate_memory(params: dict, context: dict) -> dict:
    """
    Nightly consolidation cycle:
    1. Run decay on all short term memories
    2. Find clusters by shared tags
    3. Identify patterns — concepts that appear in 3+ memories
    4. Form a consolidation insight
    5. Store insight as long term memory

    Params:
        min_cluster_size (int) — min memories to form a cluster. Default: 3

    Returns:
        status, clusters_found, patterns, insight_stored, decay_result
    """
    ubvm_home              = context["ubvm_home"]
    short_dir, long_dir, _ = _memory_dirs(ubvm_home)

    min_cluster = int(params.get("min_cluster_size", 3))
    ts          = context["timestamp"]

    # Step 1 — decay
    decay_result = primitive_decay_memories({}, context)

    # Step 2 — load remaining short term + all long term
    short_memories = _load_memories(short_dir)
    long_memories  = _load_memories(long_dir)
    all_memories   = short_memories + long_memories

    if not all_memories:
        return {"status": "ok", "message": "No memories to consolidate",
                "clusters_found": 0, "patterns": []}

    # Step 3 — cluster by tags
    tag_clusters = {}
    for m in all_memories:
        for tag in m.get("tags", []):
            if tag not in tag_clusters:
                tag_clusters[tag] = []
            tag_clusters[tag].append(m)

    clusters_found = {k: v for k, v in tag_clusters.items()
                      if len(v) >= min_cluster}

    # Step 4 — find recurring concepts across memories
    concept_counts = {}
    for m in all_memories:
        thought = m.get("thought", "")
        for word in ["UBVM", "LEGION", "BuddAI", "Data Cube", "James",
                     "memory", "learning", "building", "system", "trading"]:
            if word.lower() in thought.lower():
                concept_counts[word] = concept_counts.get(word, 0) + 1

    patterns = [{"concept": k, "frequency": v}
                for k, v in sorted(concept_counts.items(),
                                   key=lambda x: x[1], reverse=True)
                if v >= 2][:5]

    # Step 5 — store consolidation insight as long term memory
    if patterns:
        top_concepts = ", ".join([p["concept"] for p in patterns[:3]])
        insight = (f"Consolidation cycle {ts[:10]}: "
                   f"Core recurring concepts are {top_concepts}. "
                   f"Found {len(clusters_found)} memory clusters. "
                   f"{decay_result.get('promoted',0)} memories promoted to long term, "
                   f"{decay_result.get('archived',0)} archived.")

        insight_id = _memory_id(insight, ts)
        insight_mem = {
            "id":             insight_id,
            "thought":        insight,
            "tags":           ["consolidation", "nightly", "insight"],
            "ts":             ts,
            "last_accessed":  ts,
            "access_count":   0,
            "initial_weight": INITIAL_WEIGHT * 1.5,  # insights start stronger
            "decay_k":        DECAY_K * 0.3,           # insights decay slower
            "weight":         INITIAL_WEIGHT * 1.5,
            "tier":           "long_term",
            "source":         "buddai/consolidation",
        }
        _save_memory(long_dir, insight_mem)

    return {
        "status":         "ok",
        "clusters_found": len(clusters_found),
        "patterns":       patterns,
        "insight_stored": bool(patterns),
        "decay_result":   decay_result,
    }


# ─────────────────────────────────────────────────────────────
# memory_status — overview of current memory state
# ─────────────────────────────────────────────────────────────

def primitive_memory_status(params: dict, context: dict) -> dict:
    """
    Return a summary of BuddAI's current memory state.
    Useful for BuddAI to understand itself.

    Returns:
        status, short_term_count, long_term_count, archive_count,
        heaviest_memories, oldest_long_term
    """
    ubvm_home                    = context["ubvm_home"]
    short_dir, long_dir, archive = _memory_dirs(ubvm_home)

    short    = _load_memories(short_dir)
    long_    = _load_memories(long_dir)
    archived = _load_memories(archive)

    # Recompute weights
    for m in short:
        m["weight"] = _compute_weight(m)
    for m in long_:
        m["weight"] = _compute_weight(m)

    heaviest = sorted(short + long_, key=lambda m: m["weight"], reverse=True)[:3]

    return {
        "status":           "ok",
        "short_term_count": len(short),
        "long_term_count":  len(long_),
        "archive_count":    len(archived),
        "total_memories":   len(short) + len(long_),
        "heaviest_memories": [
            {"thought": m.get("thought","")[:100],
             "weight":  round(m["weight"], 4),
             "tier":    m.get("tier","?")}
            for m in heaviest
        ],
        "oldest_long_term": long_[-1].get("ts","none") if long_ else "none",
    }


# ─────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────

def register() -> dict:
    return {
        "form_memory":         primitive_form_memory,
        "retrieve_memory":     primitive_retrieve_memory,
        "promote_memory":      primitive_promote_memory,
        "decay_memories":      primitive_decay_memories,
        "consolidate_memory":  primitive_consolidate_memory,
        "memory_status":       primitive_memory_status,
    }
