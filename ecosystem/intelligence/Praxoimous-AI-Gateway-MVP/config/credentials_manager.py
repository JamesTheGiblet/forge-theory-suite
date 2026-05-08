# config/credentials_manager.py
import os
import yaml
from dotenv import set_key, find_dotenv
from core.logger import log

PROVIDERS_CONFIG_PATH = os.path.join('config', 'providers.yaml')
ENV_FILE_PATH = find_dotenv() # Finds the .env file in the project root

def get_required_credentials_from_config() -> dict:
    """
    Parses providers.yaml to find all required environment variables for API keys and URLs.
    """
    required_vars = {}
    if not os.path.exists(PROVIDERS_CONFIG_PATH):
        log.error(f"Provider configuration file not found at '{PROVIDERS_CONFIG_PATH}'. Cannot determine required credentials.")
        return required_vars

    try:
        with open(PROVIDERS_CONFIG_PATH, 'r') as f:
            config = yaml.safe_load(f)

        if not config or 'providers' not in config or not isinstance(config['providers'], list):
            log.warning("'providers' key is missing or not a list in providers.yaml.")
            return required_vars

        for provider_config in config['providers']:
            if not isinstance(provider_config, dict):
                continue

            # Check for API key environment variable
            api_key_env = provider_config.get("api_key_env")
            if api_key_env:
                required_vars[api_key_env] = "API Key"

            # Check for base URL environment variable
            base_url_env = provider_config.get("base_url_env")
            if base_url_env:
                required_vars[base_url_env] = "Base URL"

    except Exception as e:
        log.error(f"Error reading or parsing {PROVIDERS_CONFIG_PATH}: {e}", exc_info=True)

    return required_vars

def setup_api_credentials():
    """
    Interactively prompts the user to enter API keys and other credentials
    based on the providers defined in providers.yaml and saves them to the .env file.
    """
    log.info("Starting API credential setup...")
    required_vars = get_required_credentials_from_config()

    if not required_vars:
        log.info("No required credentials found in provider configuration. Skipping setup.")
        return

    log.info("Please enter the required credentials. Press Enter to skip a credential.")

    for var_name, var_type in required_vars.items():
        # Check if the variable is already set in the environment
        if os.getenv(var_name):
            log.info(f"Credential '{var_name}' is already set in the environment. Skipping prompt.")
            continue

        value = input(f"Enter value for {var_name} ({var_type}): ").strip()
        if value:
            set_key(ENV_FILE_PATH, var_name, value)
            log.info(f"Saved {var_name} to .env file.")
        else:
            log.warning(f"Skipped setting {var_name}.")

    log.info("API credential setup complete.")

def get_missing_provider_credentials() -> list:
    """Checks for and returns a list of missing required environment variables."""
    required_vars = get_required_credentials_from_config()
    return [var for var in required_vars if not os.getenv(var)]