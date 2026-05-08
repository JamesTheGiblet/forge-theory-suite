def primitive_llm_reason(params: dict, context: dict) -> dict:
    """
    Allows the agent to reason about a prompt using a local Ollama instance.
    """
    import urllib.request
    import urllib.error
    import json as _json
    import os

    model = params.get("model", os.environ.get("OLLAMA_MODEL", "gemma2:2b"))
    
    # Try localhost first, then fallback to VPS
    primary_host = params.get("ollama_host", os.environ.get("OLLAMA_HOST", "http://localhost:11434"))
    fallback_host = "http://178.105.96.89:11434"
    
    hosts_to_try = [primary_host]
    if primary_host != fallback_host:
        hosts_to_try.append(fallback_host)
    
    # Load system instruction (can be raw text or the James identity JSON)
    system_instruction_raw = params.get("system_instruction", "")
    try:
        identity_capsule = _json.loads(system_instruction_raw)
        james_data = identity_capsule.get("james", {})
        system_instruction = f"You are BuddAI. Your creator is James. Here is your core context about him:\n{_json.dumps(james_data, indent=2)}\n"
        system_instruction += identity_capsule.get("interpretation", {}).get("semantic_contract", "")
    except Exception:
        system_instruction = system_instruction_raw if system_instruction_raw else "You are BuddAI, a sovereign agent."

    memories       = params.get("memories", [])
    repo_summaries = params.get("repo_summaries", [])
    core_knowledge = params.get("core_knowledge", [])

    memory_text = ""
    if memories:
        memory_text = "\n\nRECENT MEMORIES:\n" + "\n".join(
            f"- [{m.get('ts','')}] {m.get('thought','')}" for m in memories[-5:]
        )

    repo_text = ""
    if repo_summaries:
        repo_text = "\n\nREPOS I KNOW ABOUT:\n" + "\n".join(
            f"- {r.get('name','')} ({r.get('language','')}): {r.get('description','')}" for r in repo_summaries[:5]
        )

    core_text = ""
    if core_knowledge:
        core_text = "\n\nCORE LONG-TERM KNOWLEDGE:\n" + "\n".join(
            f"- [Tags: {', '.join(n.get('dimensions', []))}] {n.get('content', '')}" for n in core_knowledge
        )

    prompt = params.get("prompt", "Analyze the current state.")
    user_message = prompt + memory_text + repo_text + core_text
    
    full_prompt = f"System: {system_instruction}\n\nTask: {user_message}"
    
    payload = {
        "model": model,
        "prompt": full_prompt,
        "stream": False
    }
    body = _json.dumps(payload).encode('utf-8')

    last_error = ""
    for host in hosts_to_try:
        url = f"{host}/api/generate"
        print(f"[{context['timestamp']}] [INFO] [{context['scp_id']}] Attempting to contact LLM at {host}...")
        try:
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            # Reduce timeout to 60 seconds for a more responsive system
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read().decode('utf-8')
                data = _json.loads(raw)
                response_text = data.get("response", "").strip()
                
                print(f"[{context['timestamp']}] [INFO] [{context['scp_id']}] LLM at {host} responded successfully.")
                return {
                    "status": "ok",
                    "thought": response_text,
                    "host_used": host
                }
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            last_error = f"HTTP {e.code}: {err_msg}"
            print(f"[{context['timestamp']}] [WARNING] [{context['scp_id']}] LLM at {host} failed with HTTP error: {last_error}")
        except Exception as e:
            last_error = str(e)
            print(f"[{context['timestamp']}] [ERROR] [{context['scp_id']}] LLM at {host} failed with connection error: {last_error}")
            
    final_error_msg = f"Ollama cognition failure on all hosts. Last error: {last_error}"
    print(f"[{context['timestamp']}] [ERROR] [{context['scp_id']}] {final_error_msg}")
    return {"status": "error", "error": final_error_msg}

def primitive_fetch_repos(params: dict, context: dict) -> dict:
    """
    Fetch README files and repo metadata from a GitHub user's public repos.
    Saves to data/buddai/repos/ for BuddAI to ingest as memory.
    """
    import urllib.request
    import json as _json
    import os

    ubvm_home  = context["ubvm_home"]
    username   = params.get("username", "JamesTheGiblet")
    max_repos  = int(params.get("max_repos", 10))
    output_dir = params.get("output_dir")
    if not output_dir:
        output_dir = os.path.join(ubvm_home, "data", "buddai", "repos")
    elif not os.path.isabs(output_dir):
        output_dir = os.path.join(ubvm_home, output_dir)
    os.makedirs(output_dir, exist_ok=True)

    # Fetch repo list
    api_url = f"https://api.github.com/users/{username}/repos?per_page={max_repos}&sort=updated"
    try:
        req = urllib.request.Request(api_url, headers={"User-Agent": "UBVM-BuddAI/0.2"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            repos = _json.loads(resp.read().decode())
    except Exception as e:
        return {"status": "error", "error": f"Failed to fetch repo list: {e}"}

    fetched = []
    for repo in repos[:max_repos]:
        name        = repo.get("name", "unknown")
        description = repo.get("description", "")
        language    = repo.get("language", "")
        stars       = repo.get("stargazers_count", 0)
        updated     = repo.get("updated_at", "")

        # Try to fetch README
        readme_text = ""
        for branch in ["main", "master"]:
            readme_url = f"https://raw.githubusercontent.com/{username}/{name}/{branch}/README.md"
            try:
                req = urllib.request.Request(readme_url, headers={"User-Agent": "UBVM-BuddAI/0.2"})
                with urllib.request.urlopen(req, timeout=5) as r:
                    readme_text = r.read().decode("utf-8", errors="replace")[:3000]
                break
            except Exception:
                continue

        repo_doc = {
            "name":        name,
            "description": description,
            "language":    language,
            "stars":       stars,
            "updated_at":  updated,
            "readme":      readme_text,
            "fetched_at":  context["timestamp"],
        }

        out_path = os.path.join(output_dir, f"{name}.json")
        try:
            with open(out_path, "w") as f:
                _json.dump(repo_doc, f, indent=2)
            fetched.append(name)
        except Exception as e:
            continue

    return {
        "status":       "ok",
        "repos_fetched": len(fetched),
        "repos":        fetched,
        "output_dir":   output_dir,
    }

def primitive_retrieve_memory(params: dict, context: dict) -> dict:
    """
    Retrieve BuddAI's stored memories and repo knowledge.
    """
    import os
    import json as _json
    import glob
    
    ubvm_home = context["ubvm_home"]
    memory_dir = params.get("memory_dir")
    if not memory_dir:
        memory_dir = os.path.join(ubvm_home, "data", "buddai", "memory")
    elif not os.path.isabs(memory_dir):
        memory_dir = os.path.join(ubvm_home, memory_dir)

    repos_dir    = os.path.join(ubvm_home, "data", "buddai", "repos")
    max_memories = int(params.get("max_memories", 10))
    
    # Load recent memories
    memories = []
    if os.path.isdir(memory_dir):
        files = sorted(glob.glob(os.path.join(memory_dir, "*.json")), reverse=True)
        for fpath in files[:max_memories]:
            try:
                with open(fpath) as f:
                    memories.append(_json.load(f))
            except Exception:
                continue
        # Reverse so older memories come first in the prompt
        memories = memories[::-1]

    # Load repo summaries
    repo_summaries = []
    if os.path.isdir(repos_dir):
        for fpath in glob.glob(os.path.join(repos_dir, "*.json")):
            try:
                with open(fpath) as f:
                    repo = _json.load(f)
                repo_summaries.append({
                    "name":        repo.get("name"),
                    "description": repo.get("description"),
                    "language":    repo.get("language"),
                    "readme_excerpt": repo.get("readme", "")[:500],
                })
            except Exception:
                continue

    return {
        "status":        "ok",
        "memories":      memories,
        "memory_count":  len(memories),
        "repo_summaries": repo_summaries,
        "repos_known":   len(repo_summaries),
    }

def primitive_agent_status(params: dict, context: dict) -> dict:
    """
    Computes BuddAI's current Age (cycles) and Intellect (level) based on memory formation.
    """
    import os
    ubvm_home = context["ubvm_home"]
    memory_dir = os.path.join(ubvm_home, "data", "buddai", "memory")
    
    total_memories = 0
    
    if os.path.exists(memory_dir):
        for f in os.listdir(memory_dir):
            if f.endswith(".json"):
                total_memories += 1
            
    intellect_level = 1 + (total_memories // 5)  # Level up every 5 memories
    
    return {
        "status": "ok",
        "age_cycles": total_memories,
        "intellect_level": intellect_level,
        "total_memories": total_memories
    }

def primitive_enforce_clearance(params: dict, context: dict) -> dict:
    """
    Halts capsule execution if BuddAI has not reached the required Age or Intellect.
    """
    status_res = primitive_agent_status({}, context)
    
    min_intellect = params.get("min_intellect", 1)
    min_age = params.get("min_age_cycles", 0)
    
    curr_intellect = status_res["intellect_level"]
    curr_age = status_res["age_cycles"]
    
    if curr_intellect < min_intellect or curr_age < min_age:
        return {
            "status": "error", 
            "error": f"Clearance denied: Requires Intellect {min_intellect} (has {curr_intellect}), Age {min_age} (has {curr_age})."
        }
        
    return {"status": "ok", "cleared": True, "message": "Clearance granted."}

def primitive_form_memory(params: dict, context: dict) -> dict:
    """
    Anchors a thought permanently into the agent's memory bank on disk.
    """
    import os
    import json as _json
    
    ubvm_home = context["ubvm_home"]
    memory_dir = params.get("memory_dir")
    if not memory_dir:
        memory_dir = os.path.join(ubvm_home, "data", "buddai", "memory")
    elif not os.path.isabs(memory_dir):
        memory_dir = os.path.join(ubvm_home, memory_dir)
    os.makedirs(memory_dir, exist_ok=True)
    
    thought = params.get("thought", "")
    tags    = params.get("tags", [])
    
    if not thought:
        return {"status": "error", "error": "No thought provided to store"}
        
    ts_safe = context["timestamp"].replace(":", "-").replace("Z", "")
    memory_path = os.path.join(memory_dir, f"thought_{ts_safe}.json")
    
    memory_doc = {
        "ts":      context["timestamp"],
        "thought": thought,
        "tags":    tags,
        "scp_id":  context["scp_id"],
    }
    
    try:
        with open(memory_path, "w") as f:
            _json.dump(memory_doc, f, indent=2)
    except Exception as e:
        return {"status": "error", "error": f"Failed to form memory: {str(e)}"}

    return {
        "status":      "ok",
        "memory_path": memory_path,
        "thought":     thought,
    }

def primitive_scan_capsules(params: dict, context: dict) -> dict:
    """
    Scan the capsules directory and return a summary of all active capsules.
    Allows BuddAI to perceive the size and structure of the UBVM organism.
    """
    import os
    import json as _json
    
    ubvm_home = context["ubvm_home"]
    capsules_dir = os.path.join(ubvm_home, "capsules")
    
    capsules_list = []
    
    if os.path.exists(capsules_dir):
        for root, _, files in os.walk(capsules_dir):
            for f in files:
                if f.endswith(".scp.json"):
                    path = os.path.join(root, f)
                    try:
                        with open(path, "r") as file_obj:
                            data = _json.load(file_obj)
                            capsules_list.append({
                                "scp_id": data.get("scp_id", f),
                                "class": data.get("object_class", "unknown"),
                                "intent": data.get("intent", "")
                            })
                    except Exception:
                        pass
                        
    return {
        "status": "ok", 
        "count": len(capsules_list), 
        "capsules": capsules_list
    }

def register() -> dict:
    return {
        "llm_reason": primitive_llm_reason,
        "fetch_repos": primitive_fetch_repos,
        "form_memory": primitive_form_memory,
        "retrieve_memory": primitive_retrieve_memory,
        "agent_status": primitive_agent_status,
        "enforce_clearance": primitive_enforce_clearance,
        "scan_capsules": primitive_scan_capsules
    }
