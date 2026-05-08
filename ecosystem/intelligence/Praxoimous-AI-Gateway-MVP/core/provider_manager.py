# core/provider_manager.py
import abc
import asyncio
import json
import os
from urllib.parse import urlparse, urlunparse
import yaml
from typing import Dict, Any, Type, Optional

import google.generativeai as genai
import httpx # For OllamaProvider
from core.logger import log

PROVIDERS_CONFIG_PATH = os.path.join('config', 'providers.yaml')

class BaseLLMProvider(abc.ABC):
    """Abstract base class for all LLM providers."""
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        log.info(f"Initialized LLM Provider: {self.name}")

    @property
    def enabled(self) -> bool:
        """Returns whether the provider is enabled in the configuration."""
        # Defaults to True if the 'enabled' key is missing.
        return self.config.get("enabled", True)

    @property
    def metadata(self) -> Dict[str, Any]:
        """Returns common metadata about the provider."""
        return {
            "name": self.name,
            "type": self.config.get("type"),
            "priority": self.config.get("priority"),
            "enabled": self.config.get("enabled", True)
        }

    @property
    def supports_streaming(self) -> bool:
        """Returns whether the provider supports streaming responses."""
        return False

    @abc.abstractmethod
    async def generate_async(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generates a response from the LLM asynchronously."""
        pass

    @abc.abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Checks the health of the provider."""
        pass

    @abc.abstractmethod
    async def generate_stream_async(self, prompt: str, **kwargs):
        """Generates a response from the LLM and yields chunks as a stream."""
        # This is an async generator, so it should yield results.
        # The 'yield' statement here is a placeholder for the type hint.
        if False:
            yield

class GeminiProvider(BaseLLMProvider):
    """Provider for Google Gemini models."""
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.api_key_env_var = self.config.get("api_key_env", "GEMINI_API_KEY") # Get from config, default to GEMINI_API_KEY
        self.api_key = os.getenv(self.api_key_env_var)
        if not self.api_key:
            log.error(f"{self.api_key_env_var} not found in environment variables for provider {self.name}.")
            raise ValueError(f"Missing {self.api_key_env_var} for {self.name}")
        
        genai.configure(api_key=self.api_key)
        self.model_name = self.config.get("model", "gemini-1.5-flash-latest") # Get model from config
        try:
            self.client = genai.GenerativeModel(self.model_name)
            log.info(f"GeminiProvider ({self.name}) initialized with model: {self.model_name}")
        except Exception as e:
            log.error(f"Failed to initialize Gemini GenerativeModel for {self.name} with model {self.model_name}: {e}")
            raise ValueError(f"Failed to initialize Gemini client for {self.name}: {e}")

    @property
    def metadata(self) -> Dict[str, Any]:
        """Returns Gemini-specific metadata."""
        meta = super().metadata
        meta.update({
            "model": self.model_name,
            "api_key_env_var": self.api_key_env_var
        })
        return meta

    @property
    def supports_streaming(self) -> bool:
        """Gemini provider supports streaming."""
        return True

    async def generate_async(self, prompt: str, **kwargs) -> Dict[str, Any]:
        log.info(f"GeminiProvider ({self.name}) generating response for model {self.model_name}...")
        try:
            # For simplicity, directly using generate_content_async.
            # You might want to handle different types of content, safety settings, etc.
            response = await self.client.generate_content_async(prompt)
            return {"provider": self.name, "text": response.text}
        except Exception as e:
            log.error(f"Error during Gemini API call for provider {self.name}: {e}", exc_info=True)
            # Re-raise or return a structured error
            raise # Or return {"provider": self.name, "error": str(e)}

    async def generate_stream_async(self, prompt: str, **kwargs):
        log.info(f"GeminiProvider ({self.name}) streaming response for model {self.model_name}...")
        try:
            stream = await self.client.generate_content_async(prompt, stream=True)
            async for chunk in stream:
                # Yield each token as it arrives in a structured format
                yield {"type": "stream_chunk", "token": chunk.text}
        except Exception as e:
            log.error(f"Error during Gemini API stream for provider {self.name}: {e}", exc_info=True)
            # Yield a structured error message to the client
            yield {"type": "error", "detail": f"Error from {self.name}: {str(e)}"}
            # We don't re-raise here because the WebSocket connection should handle the error message
            # and we want to allow the ModelRouter to potentially failover.

    async def check_health(self) -> Dict[str, Any]:
        log.info(f"Checking health for Gemini provider: {self.name}")
        if not self.api_key:
            return {"status": "Error", "details": "API key is not configured."}
        try:
            # A lightweight way to check connectivity and auth is to list models.
            # This is less expensive than a full generation request.
            # genai.list_models() is synchronous, so we run it in a separate thread
            # to avoid blocking the async event loop. We must pass the API key
            # to ensure it's configured in the new thread's context.
            def _blocking_list_models(api_key: str):
                genai.configure(api_key=api_key)
                return genai.list_models()

            models = await asyncio.to_thread(_blocking_list_models, self.api_key)

            # Check if the configured model is in the list of available models
            if any(m.name.endswith(self.model_name) for m in models):
                return {"status": "Active", "details": f"Connected to Gemini. Model '{self.model_name}' is available."}
            return {"status": "Error", "details": f"Connected to Gemini, but model '{self.model_name}' not found."}
        except Exception as e:
            log.error(f"Gemini health check for '{self.name}' failed: {e}", exc_info=True)
            return {"status": "Error", "details": "Failed to connect to Gemini API. Check API key and network."}

class OllamaProvider(BaseLLMProvider):
    """Provider for local Ollama models."""
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.base_url_env_var = self.config.get("base_url_env", "OLLAMA_API_URL")
        self.base_url = os.getenv(self.base_url_env_var)
        if not self.base_url:
            log.error(f"{self.base_url_env_var} not found in environment variables for provider {self.name}.")
            raise ValueError(f"Missing {self.base_url_env_var} for {self.name}")
        self.model_name = self.config.get("model", "llama3") # Get model from config
        self.ollama_api_endpoint = f"{self.base_url.rstrip('/')}/api/generate"
        log.info(f"OllamaProvider ({self.name}) initialized with model: {self.model_name}, endpoint: {self.ollama_api_endpoint}")

    @property
    def metadata(self) -> Dict[str, Any]:
        """Returns Ollama-specific metadata."""
        meta = super().metadata
        meta.update({
            "model": self.model_name,
            "base_url_env_var": self.base_url_env_var,
            "base_url": self.base_url
        })
        return meta

    @property
    def supports_streaming(self) -> bool:
        """Ollama provider supports streaming."""
        return True

    async def generate_async(self, prompt: str, **kwargs) -> Dict[str, Any]:
        log.info(f"OllamaProvider ({self.name}) generating response for model {self.model_name}...")
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False  # For simplicity, not handling streaming responses here
        }
        # Add any additional kwargs to the payload if they are relevant for Ollama
        # For example, options like "temperature", "top_p", etc.
        # payload.update({k: v for k, v in kwargs.items() if k in RELEVANT_OLLAMA_OPTIONS})

        try:
            async with httpx.AsyncClient(timeout=60.0) as client: # Increased timeout for potentially slower local models
                response = await client.post(self.ollama_api_endpoint, json=payload)
                response.raise_for_status()  # Raise an exception for HTTP 4xx/5xx errors
                
                response_data = response.json()
                # Ollama's non-streaming response typically has the full text in 'response'
                generated_text = response_data.get("response", "")
                return {"provider": self.name, "text": generated_text.strip()}
        except httpx.HTTPStatusError as e:
            log.error(f"HTTP error during Ollama API call for provider {self.name}: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise # Or return {"provider": self.name, "error": f"HTTP error: {e.response.status_code}"}
        except Exception as e:
            log.error(f"Error during Ollama API call for provider {self.name}: {e}", exc_info=True)
            raise # Or return {"provider": self.name, "error": str(e)}

    async def generate_stream_async(self, prompt: str, **kwargs):
        log.info(f"OllamaProvider ({self.name}) streaming response for model {self.model_name}...")
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": True # Enable streaming
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", self.ollama_api_endpoint, json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk_data = json.loads(line)
                                token = chunk_data.get("response", "")
                                if token:
                                    yield {"type": "stream_chunk", "token": token}
                            except json.JSONDecodeError:
                                log.warning(f"Ollama stream: Could not decode JSON from line: {line}")
                                continue
        except Exception as e:
            log.error(f"Error during Ollama API stream for provider {self.name}: {e}", exc_info=True)
            yield {"type": "error", "detail": f"Error from {self.name}: {str(e)}"}


    async def check_health(self) -> Dict[str, Any]:
        log.info(f"Checking health for Ollama provider: {self.name}")
        if not self.base_url:
            return {"status": "Error", "details": "Ollama API URL is not configured."}
        try:
            # A more reliable health check is to query a known API endpoint, like /api/tags.
            # The root of the Ollama server does not always return a consistent or successful response.
            health_check_url = f"{self.base_url.rstrip('/')}/api/tags"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(health_check_url)
                response.raise_for_status()
                # If the request succeeds, we know the service is running.
                return {"status": "Active", "details": f"Connected to Ollama at {self.base_url}."}
        except httpx.RequestError as e: # Catch a broader range of httpx errors
            # This includes ConnectError, HTTPStatusError, TimeoutException, etc.
            log.warning(f"Ollama health check for '{self.name}' failed: Could not connect to {self.base_url}. Error: {e}")
            return {"status": "Offline", "details": f"Could not connect to Ollama at {self.base_url}. The service appears to be offline."}
        except Exception as e:
            log.error(f"Ollama health check for '{self.name}' failed: {e}", exc_info=True)
            return {"status": "Error", "details": f"Failed to connect to Ollama at {self.base_url}. Is it running?"}

class ProviderManager:
    """Loads and manages all configured LLM providers."""
    PROVIDER_CLASSES: Dict[str, Type[BaseLLMProvider]] = {
        "gemini": GeminiProvider,
        "ollama": OllamaProvider,
    }

    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {}
        self._load_providers()

    def _load_providers(self):
        log.info("Loading LLM providers from 'config/providers.yaml'...")
        try:
            with open(PROVIDERS_CONFIG_PATH, 'r') as f:
                config = yaml.safe_load(f)

            if not config or 'providers' not in config:
                log.warning("Provider config is empty or missing 'providers' key.")
                return

            if not isinstance(config['providers'], list):
                log.error("'providers' key in config/providers.yaml is not a list.")
                return

            for provider_config_entry in config['providers']: # Iterate over the list of provider configurations
                if not isinstance(provider_config_entry, dict):
                    log.warning(f"Skipping invalid provider entry (not a dictionary): {provider_config_entry}")
                    continue

                provider_instance_name = provider_config_entry.get('name')
                provider_type = provider_config_entry.get('type')

                if not provider_instance_name or not provider_type:
                    log.warning(f"Skipping provider entry due to missing 'name' or 'type': {provider_config_entry}")
                    continue

                # Providers are enabled by default unless 'enabled: false' is explicitly set
                if provider_config_entry.get("enabled", True):
                    provider_class = self.PROVIDER_CLASSES.get(provider_type)
                    if provider_class:
                        try:
                            # Pass the instance name and the full config dict for that provider
                            self.providers[provider_instance_name] = provider_class(name=provider_instance_name, config=provider_config_entry)
                        except ValueError as ve:
                            # ValueErrors from provider __init__ are often due to missing env vars/config.
                            log.error(f"Failed to initialize provider '{provider_instance_name}' (type: {provider_type}) due to a configuration issue: {ve}")
                        except Exception as e: # For other unexpected errors during initialization
                            log.error(f"An unexpected error occurred while initializing provider '{provider_instance_name}' (type: {provider_type}): {e}", exc_info=True)
                    else:
                        log.warning(f"No provider class found for type '{provider_type}' (name: '{provider_instance_name}').")
                else:
                    log.info(f"Provider '{provider_instance_name}' (type: {provider_type}) is disabled in config.")
        except FileNotFoundError:
            log.error(f"Provider configuration file not found at '{PROVIDERS_CONFIG_PATH}'.")
        except Exception as e:
            log.error(f"Error loading provider configuration: {e}", exc_info=True)

    def get_provider(self, name: str) -> Optional[BaseLLMProvider]:
        return self.providers.get(name)

# Global instance for easy access
provider_manager = ProviderManager()
