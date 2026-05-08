def primitive_web_search(params: dict, context: dict) -> dict:
    """Returns a dictionary with 'status' key."""
    try:
        from googlesearch import search
        results = list(search(params.get("query", ""), num=3, stop=3))
        return {"status": "ok", "results": results}
    except ImportError:
        return {"status": "error", "error": "Please run: pip install googlesearch-python"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def register() -> dict:
    return {
        "web_search": primitive_web_search
    }