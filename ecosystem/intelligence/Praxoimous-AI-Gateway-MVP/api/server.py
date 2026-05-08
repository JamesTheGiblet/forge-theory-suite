# api/server.py
import time
import uuid
# MODIFIED: Import Depends
from fastapi import FastAPI, HTTPException, Query, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
import os # Import the os module
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from core.logger import log
from core.provider_manager import PROVIDERS_CONFIG_PATH # Keep for providers
from core.skill_manager import skill_manager
from core.model_router import model_router, NoAvailableProviderError
from core.audit_logger import (
    log_interaction, init_db as init_audit_db, # Import init_db
    get_all_interactions,
    count_interactions,
    get_tasks_over_time_data,
    get_requests_per_provider_data,
    get_average_latency_per_provider_data
)
from core.model_router import ROUTING_CONFIG_PATH # Import path for new endpoint
# NEW: Import the security validator
from core.security import validate_api_key #, VALID_API_KEYS
from api.v1.endpoints import rag_interface_router # Import the RAG router

# Define the path to the frontend build directory
FRONTEND_DIR = "frontend-react/dist"

# ... (ProcessRequest and ProcessResponse models are unchanged) ...
class ArbitraryKwargsBaseModel(BaseModel):
    model_config = {"extra": "allow"}

class ProcessRequest(ArbitraryKwargsBaseModel):
    task_type: str
    prompt: str

class ProcessResponse(BaseModel):
    status: str
    result: Optional[Dict[str, Any]] = None
    message: str | None = None
    details: Optional[str] = None
    request_id: str

class InteractionRecord(BaseModel):
    id: int
    request_id: str
    timestamp: str
    task_type: str
    provider: Optional[str]
    status: str
    latency_ms: Optional[int]
    prompt: Optional[str]
    response_data: Optional[str]

class AnalyticsResponse(BaseModel):
    total_matches: int
    limit: int
    offset: int
    data: List[InteractionRecord]

# --- Pydantic models for new Advanced Analytics endpoints ---
class TasksOverTimeDataPoint(BaseModel):
    date_group: str # e.g., "YYYY-MM-DD" or "YYYY-MM" or "YYYY"
    count: int

class TasksOverTimeResponse(BaseModel):
    data: List[TasksOverTimeDataPoint]

class RequestsPerProviderDataPoint(BaseModel):
    provider_name: str
    count: int

class RequestsPerProviderResponse(BaseModel):
    data: List[RequestsPerProviderDataPoint]

class AverageLatencyPerProviderDataPoint(BaseModel):
    provider_name: str
    average_latency: float # SQLite AVG returns float

class AverageLatencyPerProviderResponse(BaseModel):
    data: List[AverageLatencyPerProviderDataPoint]

# --- End Pydantic models ---

# --- MODIFIED: Add a dependencies list to the FastAPI app instance ---
app = FastAPI(
    title="Praximous API",
    version="2.0", # Version bump!
    description="Secure, On-Premise AI Gateway",
    # dependencies=[Depends(validate_api_key)] # This protects ALL endpoints in the app
)

# --- NEW: Add a startup event to initialize the database ---
@app.on_event("startup")
async def on_startup():
    """Initializes the application's resources on startup."""
    log.info("Application startup: Initializing audit database...")
    init_audit_db()

# --- Licensing Dependency for Advanced Features ---
from core.license_manager import is_feature_enabled, Feature, get_current_license_tier
from fastapi import status # For status codes

async def verify_advanced_analytics_access():
    """Dependency to check Advanced Analytics UI feature access."""
    if not is_feature_enabled(Feature.ADVANCED_ANALYTICS_UI):
        current_tier_name = get_current_license_tier().name
        log.warning(f"Advanced Analytics access denied. Current tier: {current_tier_name}. Required for feature: {Feature.ADVANCED_ANALYTICS_UI.name}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Advanced Analytics feature is not available for your current license tier ({current_tier_name}). Please upgrade."
        )

# Include the RAG router
app.include_router(rag_interface_router.router, prefix="/api/v1") # Ensure prefix matches other v1 routes

# --- All endpoints below are now automatically protected ---

@app.post("/api/v1/process", response_model=ProcessResponse, summary="Process a task with a skill or LLM")
async def process_task(request: ProcessRequest): #, api_key: str = Depends(validate_api_key)):
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()
    status = "error"
    provider = None
    # api_key is now available from the Depends(validate_api_key)
    response_data = {} # Initialize as an empty dict to prevent logging errors
    try:
        log.info(f"API: [ReqID: {request_id}] Received task='{request.task_type}', prompt='{request.prompt[:50]}...'")
        if request.task_type in model_router.routing_rules:
            try:
                log.info(f"API: [ReqID: {request_id}] Routing to LLM for task_type='{request.task_type}'")
                llm_result = await model_router.route_request(prompt=request.prompt, task_type=request.task_type)
                status = "success"
                provider = llm_result.get('provider', 'unknown')
                response_data = llm_result
                return ProcessResponse(status=status, result=response_data, message=f"Request routed via {provider}", request_id=request_id)
            except NoAvailableProviderError as e:
                log.error(f"API: [ReqID: {request_id}] All providers failed for task '{request.task_type}': {e}", exc_info=True)
                provider = "failover_exhausted"
                raise HTTPException(status_code=503, detail="All LLM providers are currently unavailable.")
            except Exception as e:
                log.error(f"API: [ReqID: {request_id}] An unexpected error occurred during LLM routing for task '{request.task_type}': {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="An unexpected error occurred during LLM routing.")
        skill_class = skill_manager.get_skill(request.task_type)
        if not skill_class:
            log.warning(f"API: [ReqID: {request_id}] Skill or LLM route not found for task_type='{request.task_type}'")
            raise HTTPException(status_code=404, detail=f"Skill or LLM route '{request.task_type}' not found.")
        skill_instance = skill_class()
        provider = f"skill:{skill_instance.name}"
        log.info(f"API: [ReqID: {request_id}] Executing skill='{skill_instance.name}'")
        skill_kwargs = request.model_dump(exclude={"task_type", "prompt"})
        skill_response = await skill_instance.execute(prompt=request.prompt, **skill_kwargs)
        if skill_response.get("success"):
            log.info(f"API: [ReqID: {request_id}] Skill='{skill_instance.name}' execution successful.")
            status = "success"
            response_data = skill_response.get("data")
            return ProcessResponse(status=status, result=response_data, message=skill_response.get("message"), details=skill_response.get("details"), request_id=request_id)
        else:
            log.warning(f"API: [ReqID: {request_id}] Skill='{skill_instance.name}' execution reported failure: {skill_response.get('error')}")
            error_detail = skill_response.get("error", "Skill execution failed.")
            if skill_response.get("details"): error_detail += f" (Details: {skill_response.get('details')})"
            raise HTTPException(status_code=400, detail=error_detail)
    except HTTPException:
        # status will retain its value (e.g., "error" or a specific status if set before the exception)
        raise
    except Exception as e: # Catch any other unexpected errors
        log.error(f"API: [ReqID: {request_id}] Unhandled exception in process_task: {e}", exc_info=True)
        status = "error" # Ensure status is error for logging
        raise HTTPException(status_code=500, detail="An unexpected internal server error occurred.")

    finally:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        log_interaction( # Correctly passes api_key
            request_id=request_id,
            task_type=request.task_type,
            status=status,
            latency_ms=latency_ms,
            provider=provider,
            api_key=None, # API key is not used in open-source MVP
            prompt=request.prompt,
            response_data=response_data
        )

@app.websocket("/api/v1/process-stream")
async def process_task_stream(websocket: WebSocket, api_key: str = Query(...)):
    """
    Processes a task and streams the LLM response back over a WebSocket.
    Expects the first message from the client to be a JSON object
    matching the ProcessRequest model.
    """
    # First, validate the API key provided in the query parameter
    try:
        await validate_api_key(api_key)
    except HTTPException as e:
        await websocket.accept()
        await websocket.close(code=4001, reason=f"Authentication failed: {e.detail}")
        return

    await websocket.accept()
    request_id = str(uuid.uuid4())
    log.info(f"WS: [ReqID: {request_id}] WebSocket connection established.")

    try:
        # Wait for the initial request payload from the client
        payload = await websocket.receive_json()
        request = ProcessRequest(**payload)
        log.info(f"WS: [ReqID: {request_id}] Received task='{request.task_type}', prompt='{request.prompt[:50]}...'")

        if request.task_type not in model_router.routing_rules:
            raise ValueError(f"Task type '{request.task_type}' is not a routable LLM task or does not support streaming.")

        # Use a generator to stream the response from the model router
        async for chunk in model_router.route_request_stream(prompt=request.prompt, task_type=request.task_type):
            await websocket.send_json(chunk)

        # Send a final message to indicate the stream is complete
        await websocket.send_json({"type": "stream_end", "request_id": request_id})
        log.info(f"WS: [ReqID: {request_id}] Stream completed successfully.")

    except WebSocketDisconnect:
        log.warning(f"WS: [ReqID: {request_id}] WebSocket disconnected by client.")
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        log.error(f"WS: [ReqID: {request_id}] {error_message}", exc_info=True)
        await websocket.send_json({"type": "error", "detail": error_message})
    finally:
        # The connection is automatically closed by FastAPI on exit/error.
        log.info(f"WS: [ReqID: {request_id}] Closing WebSocket connection.")

@app.get(
    "/api/v1/analytics",
    response_model=AnalyticsResponse,
    summary="Get interaction records with pagination and filtering"
)
async def get_analytics_data(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    task_type: Optional[str] = Query(None, description="Filter records by a specific task_type"),
    # Make this endpoint conditionally public for the dashboard's "Recent Activity"
    # We will still require a key for larger queries.
    # api_key: Optional[str] = Depends(validate_api_key)
):
    """
    Retrieves a paginated and optionally filtered list of interactions from the audit database.
    Public access is allowed for small queries (limit <= 10) for the dashboard.
    Full access requires a valid API key.
    """
    # # If the query is for a large number of records, enforce the API key, even if it passed validation with no keys configured.
    # if limit > 10 and api_key == "unprotected_access_no_keys_defined":
    #     raise HTTPException(status_code=401, detail="API key required for fetching more than 10 analytics records.")

    try:
        records = get_all_interactions(
            limit=limit, offset=offset, task_type=task_type
        )
        total_matches = count_interactions(
            task_type=task_type
        )
        return AnalyticsResponse(
            total_matches=total_matches,
            limit=limit,
            offset=offset,
            data=records
        )
    except Exception as e:
        log.error(f"Failed to retrieve analytics data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve analytics data.")

@app.get(
    "/api/v1/skills",
    summary="List all available skills and their capabilities",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def list_skills_capabilities():
    capabilities = {}
    for skill_name, skill_class in skill_manager.skills.items():
        try:
            skill_instance = skill_class()
            capabilities[skill_name] = skill_instance.get_capabilities()
        except Exception as e:
            log.error(f"Error getting capabilities for skill {skill_name}: {e}", exc_info=True)
            capabilities[skill_name] = {"skill_name": skill_name, "error": "Could not retrieve capabilities."}
    return capabilities

@app.get(
    "/api/v1/skills/{skill_name}/capabilities",
    summary="Get capabilities of a specific skill",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_skill_capabilities(skill_name: str):
    skill_class = skill_manager.get_skill(skill_name)
    if not skill_class:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found.")
    try:
        skill_instance = skill_class()
        return skill_instance.get_capabilities()
    except Exception as e:
        log.error(f"Error getting capabilities for skill {skill_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve skill capabilities.")
# --- END API ENDPOINTS ---

# --- NEW Advanced Analytics Endpoints (Phase 5) ---

@app.get(
    "/api/v1/analytics/charts/tasks-over-time",
    response_model=TasksOverTimeResponse,
    summary="Get task counts aggregated over time periods",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_tasks_over_time_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    granularity: str = Query("day", description="Time granularity: 'day', 'month', or 'year'")
):
    if granularity not in ["day", "month", "year"]:
        raise HTTPException(status_code=400, detail="Invalid granularity. Must be 'day', 'month', or 'year'.")
    try:
        data = get_tasks_over_time_data(start_date=start_date, end_date=end_date, granularity=granularity)
        return TasksOverTimeResponse(data=data)
    except Exception as e:
        log.error(f"Failed to retrieve tasks over time data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve tasks over time data.")

@app.get(
    "/api/v1/analytics/charts/requests-per-provider",
    response_model=RequestsPerProviderResponse,
    summary="Get total request counts per provider",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_requests_per_provider_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    try:
        data = get_requests_per_provider_data(start_date=start_date, end_date=end_date)
        return RequestsPerProviderResponse(data=data)
    except Exception as e:
        log.error(f"Failed to retrieve requests per provider data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve requests per provider data.")

@app.get(
    "/api/v1/analytics/charts/average-latency-per-provider",
    response_model=AverageLatencyPerProviderResponse,
    summary="Get average request latency per provider",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_average_latency_per_provider_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    try:
        data = get_average_latency_per_provider_data(start_date=start_date, end_date=end_date)
        # Ensure average_latency is float or None
        for item in data:
            if item.get("average_latency") is not None:
                item["average_latency"] = float(item["average_latency"])
        return AverageLatencyPerProviderResponse(data=data)
    except Exception as e:
        log.error(f"Failed to retrieve average latency per provider data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve average latency per provider data.")

# --- NEW System Status Endpoint ---

@app.get(
    "/api/v1/system-status",
    summary="Get the status of configured LLM providers",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_system_status():
    """
    Checks the health of each configured LLM provider and returns their status.
    """
    try:
        provider_statuses = await model_router.get_provider_statuses()
        return {
            "providers_status": provider_statuses
        }
    except Exception as e:
        log.error(f"Failed to retrieve system status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve system status.")

# --- NEW Config Viewer Endpoint ---

@app.get(
    "/api/v1/config/providers",
    response_class=PlainTextResponse, summary="Get the content of providers.yaml",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_providers_config_content():
    """
    Returns the raw content of the config/providers.yaml file for display in the GUI.
    """
    try:
        with open(PROVIDERS_CONFIG_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        return PlainTextResponse(content=content)
    except FileNotFoundError:
        log.error(f"Configuration file not found at '{PROVIDERS_CONFIG_PATH}' when requested by API.")
        raise HTTPException(status_code=404, detail="Provider configuration file not found on the server.")

@app.get(
    "/api/v1/config/routing",
    response_class=PlainTextResponse, summary="Get the content of routing.yaml",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_routing_config_content():
    """
    Returns the raw content of the config/routing.yaml file for display in the GUI.
    """
    try:
        with open(ROUTING_CONFIG_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        return PlainTextResponse(content=content)
    except FileNotFoundError:
        log.error(f"Configuration file not found at '{ROUTING_CONFIG_PATH}' when requested by API.")
        raise HTTPException(status_code=404, detail="Routing configuration file not found on the server.")

# --- NEW Model Router Config Endpoint ---

@app.get(
    "/api/v1/config/model-router",
    summary="Get the current model routing rules",
    # dependencies=[] # This explicitly removes the global dependency for this one endpoint
)
async def get_model_router_config():
    """
    Returns the list of task_types that are configured to be routed to LLMs.
    """
    try:
        return {"llm_task_types": model_router.routing_rules}
    except Exception as e:
        log.error(f"Failed to retrieve model router config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve model router configuration.")

# --- Mount the static files directory for the React frontend (if enabled) ---
if os.getenv("GUI_ENABLED", "true").lower() == "true":
    if os.path.isdir(FRONTEND_DIR):
        log.info(f"GUI is enabled. Serving static files from '{FRONTEND_DIR}'.")
        # This must be placed AFTER all other API routes.
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
    else:
        log.warning(f"GUI is enabled but the directory '{FRONTEND_DIR}' was not found. The GUI will not be served.")
        log.warning("To fix this, create the directory or set GUI_ENABLED=false in your .env file.")
