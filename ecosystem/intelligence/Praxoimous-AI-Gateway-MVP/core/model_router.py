# core/model_router.py
import asyncio
import os
import yaml
from datetime import datetime, timezone
from typing import Dict, Any, List

from core.logger import log
from core.provider_manager import provider_manager
from core.system_context import get_system_context

ROUTING_CONFIG_PATH = os.path.join('config', 'routing.yaml')

class NoAvailableProviderError(Exception):
    """Custom exception for when no providers are available or all have failed."""
    pass

class ModelRouter:
    def __init__(self):
        # --- NEW: Rules-based routing engine ---
        self.routing_rules: Dict[str, List[str]] = {}
        self._load_routing_rules()

        # For checking if a task is routable at all.
        self.routable_tasks = set(self.routing_rules.keys())
        self.routable_tasks.discard("__default__")

        log.info("ModelRouter initialized.")

    def _load_routing_rules(self):
        """Loads routing rules from routing.yaml, with a safe default."""
        try:
            with open(ROUTING_CONFIG_PATH, 'r') as f:
                config = yaml.safe_load(f)
                if config and 'routing_rules' in config:
                    self.routing_rules = config['routing_rules']
                    log.info(f"Successfully loaded routing rules from '{ROUTING_CONFIG_PATH}'.")
                    return
        except FileNotFoundError:
            log.warning(f"Routing configuration file not found at '{ROUTING_CONFIG_PATH}'. Using default rules.")
        except Exception as e:
            log.error(f"Error loading routing configuration from '{ROUTING_CONFIG_PATH}': {e}. Using default rules.", exc_info=True)

        # Fallback to default rules if file is missing, empty, or malformed
        self.routing_rules = {
            "__default__": ["gemini-primary", "ollama-failover"]
        }

    async def route_request(self, prompt: str, task_type: str) -> Dict[str, Any]:
        """
        Routes a request to the best available provider based on priority and availability.
        Implements failover logic.
        """
        # Get the ordered list of provider names for this task from our rules engine.
        # Fall back to the '__default__' rule if the task_type is not explicitly defined.
        provider_sequence = self.routing_rules.get(task_type, self.routing_rules.get("__default__"))

        if not provider_sequence:
            raise ValueError(f"Task type '{task_type}' is not a routable LLM task.")

        # Get provider instances based on the sequence defined in the rules.
        providers_to_try = [provider_manager.get_provider(name) for name in provider_sequence if provider_manager.get_provider(name) and provider_manager.get_provider(name).enabled]

        if not providers_to_try:
            raise NoAvailableProviderError("No enabled LLM providers found in configuration for the requested task.")

        errors = []
        for provider in providers_to_try:
            try:
                log.info(f"Routing to provider: {provider.name} (Priority: {provider.config.get('priority')})")
                # Inject the system context into the prompt
                full_prompt = get_system_context().get_system_prompt(prompt)
                response = await provider.generate_async(prompt=full_prompt)
                
                # Add provider info to the response for auditing
                response['provider'] = provider.name
                return response

            except Exception as e:
                log.error(f"Provider '{provider.name}' failed: {e}", exc_info=True)
                errors.append(f"{provider.name}: {e}")
                continue # Try the next provider

        # If all providers failed
        raise NoAvailableProviderError(f"All providers failed. Errors: {'; '.join(errors)}")

    from typing import AsyncGenerator

    async def route_request_stream(self, prompt: str, task_type: str) -> AsyncGenerator[dict, None]:
        """
        Routes a request to the best available provider and streams the response.
        Implements failover logic for streaming providers.
        Yields chunks of the response.
        """
        # Get the ordered list of provider names for this task from our rules engine.
        provider_sequence = self.routing_rules.get(task_type, self.routing_rules.get("__default__"))

        if not provider_sequence:
            raise ValueError(f"Task type '{task_type}' is not a routable LLM task.")

        # Get streaming-capable provider instances based on the sequence defined in the rules.
        providers_to_try = [p for p in (provider_manager.get_provider(name) for name in provider_sequence) if p and p.enabled and p.supports_streaming]

        if not providers_to_try:
            raise NoAvailableProviderError("No enabled, streaming-capable LLM providers found.")

        errors = []
        for provider in providers_to_try:
            try:
                log.info(f"Streaming via provider: {provider.name} (Priority: {provider.config.get('priority')})")
                full_prompt = get_system_context().get_system_prompt(prompt)
                
                # Yield from the provider's streaming generator
                async for chunk in provider.generate_stream_async(prompt=full_prompt):
                    # Add provider info to each chunk for auditing/UI purposes
                    chunk_with_provider = chunk.copy()
                    chunk_with_provider['provider'] = provider.name
                    yield chunk_with_provider
                
                # If we successfully finish the loop, it means this provider worked.
                return # Exit the generator

            except Exception as e:
                log.error(f"Streaming provider '{provider.name}' failed: {e}", exc_info=True)
                errors.append(f"{provider.name}: {e}")
                continue # Try the next provider

        raise NoAvailableProviderError(f"All streaming providers failed. Errors: {'; '.join(errors)}")

    async def get_provider_statuses(self) -> Dict[str, Any]:
        """
        Checks the health of each configured LLM provider.
        """
        provider_statuses = []
        enabled_providers = [p for p in provider_manager.providers.values() if p.enabled]
        disabled_providers = [p for p in provider_manager.providers.values() if not p.enabled]
    
        async def safe_check(provider):
            """Wrapper to safely call check_health and catch any synchronous errors."""
            try:
                return await provider.check_health()
            except Exception as e:
                log.warning(f"Health check for provider '{provider.name}' raised an exception: {e}")
                return e
    
        # Only run health checks for enabled providers
        if enabled_providers:
            health_check_tasks = [safe_check(p) for p in enabled_providers]
            results = await asyncio.gather(*health_check_tasks, return_exceptions=True)
    
            # Process the results for enabled providers
            for i, provider in enumerate(enabled_providers):
                result = results[i]
                status_record = {
                    "name": provider.name,
                    "status": "Unknown",
                    "details": "Health check did not return a valid status.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "metadata": provider.metadata
                }
                
                if isinstance(result, Exception):
                    status_record["status"] = "Error"
                    status_record["details"] = f"Health check failed: {str(result)}"
                elif isinstance(result, dict):
                    status_record["status"] = result.get("status", "Unknown")
                    status_record["details"] = result.get("details", "")
                
                provider_statuses.append(status_record)
    
        # Add disabled providers to the list
        for provider in disabled_providers:
            provider_statuses.append({
                "name": provider.name,
                "status": "Disabled",
                "details": "Provider is disabled in configuration.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metadata": provider.metadata
            })
    
        # Create a summary object
        summary = {
            "total_providers": len(provider_manager.providers),
            "enabled": len(enabled_providers),
            "disabled": len(disabled_providers),
            "errors": sum(1 for s in provider_statuses if s["status"] == "Error")
        }

        return {"summary": summary, "providers": provider_statuses}

# Singleton instance of the ModelRouter
model_router = ModelRouter()