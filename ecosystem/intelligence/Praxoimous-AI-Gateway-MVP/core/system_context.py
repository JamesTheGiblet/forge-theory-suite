# core/system_context.py
import os
import re
import yaml
import logging # Import the standard logging library
from typing import Optional, Dict, Any, TYPE_CHECKING

CONFIG_DIR = 'config'
CONFIG_PATH = os.path.join(CONFIG_DIR, 'identity.yaml')

class SystemContext:
    """
    Loads and provides access to the system's identity configuration
    from identity.yaml.
    """
    # Use TYPE_CHECKING to import for type hints without causing a circular import at runtime
    if TYPE_CHECKING:
        from core.logger import log

    def __init__(self):
        # Use a local, temporary logger for initialization to avoid circular imports.
        self._init_logger = logging.getLogger(__name__)
        self._identity_data: Dict[str, Any] = {}
        self._load_context()

    def _load_context(self):
        if not os.path.exists(CONFIG_PATH):
            # No logging needed here; main.py handles the user-facing error.
            return

        try:
            with open(CONFIG_PATH, 'r') as f:
                self._identity_data = yaml.safe_load(f) or {}
            self._init_logger.info(f"System context loaded successfully from '{CONFIG_PATH}'. Display Name: {self.display_name}")
        except Exception as e:
            self._init_logger.error(f"Failed to load or parse identity configuration from '{CONFIG_PATH}': {e}", exc_info=True)
            self._identity_data = {} # Ensure it's an empty dict on error

    @property
    def system_name(self) -> Optional[str]:
        return self._identity_data.get('system_name', 'Praximous-Unconfigured')

    @property
    def business_name(self) -> Optional[str]:
        return self._identity_data.get('business_name')

    @property
    def industry(self) -> Optional[str]:
        return self._identity_data.get('industry')

    @property
    def persona_style(self) -> Optional[str]:
        return self._identity_data.get('persona_style')

    @property
    def sensitivity_level(self) -> Optional[str]:
        return self._identity_data.get('sensitivity_level')

    @property
    def location(self) -> Optional[str]:
        return self._identity_data.get('location')

    def _slugify_business_name(self, name: Optional[str]) -> Optional[str]:
        if not name:
            return None
        # Remove common suffixes like Inc, Ltd, Corp, LLC
        name_no_suffix = re.sub(r'(?i)\s+(Inc\.?|Ltd\.?|Corp\.?|LLC\.?)$', '', name.strip())
        # Keep only alphanumeric characters
        slug = re.sub(r'[^a-zA-Z0-9]', '', name_no_suffix)
        return slug if slug else None

    @property
    def display_name(self) -> str:
        s_name = self._identity_data.get('system_name', 'Praximous-Unconfigured')
        b_name_orig = self._identity_data.get('business_name')

        # If system_name already contains a hyphen (e.g., "Praximous-Acme")
        # or if business_name is not provided, use system_name as is.
        if '-' in s_name or not b_name_orig:
            return s_name

        b_name_slug = self._slugify_business_name(b_name_orig)
        if b_name_slug:
            return f"{s_name}-{b_name_slug}"
        return s_name # Fallback to system_name if slug is empty or business_name was empty

    def get_all_context(self) -> Dict[str, Any]:
        return self._identity_data.copy()

    def get_system_prompt(self, user_prompt: str) -> str:
        """
        Constructs a full prompt by prepending the system context/persona
        to the user's prompt.
        """
        # This is a simple implementation. A more advanced version could use a template.
        if self.system_name and self.business_name and self.industry:
            persona = self.persona_style or "a helpful AI assistant"
            context = (
                f"You are {self.system_name}, a specialized AI for {self.business_name}, "
                f"which operates in the {self.industry} industry. "
                f"Your persona should be: {persona}. "
                f"Given the user's request, provide a response.\n\n---\n\nUser Request: {user_prompt}"
            )
        else:
            # Fallback for when context is not fully available (e.g., during init)
            context = user_prompt
        return context

# --- Singleton Pattern for SystemContext ---
# This prevents circular import issues by delaying the instantiation of SystemContext
# until it's actually needed, ensuring other modules like the logger are loaded first.

_cached_system_context: Optional[SystemContext] = None

def get_system_context() -> SystemContext:
    """Returns a cached, singleton instance of the SystemContext."""
    global _cached_system_context
    if _cached_system_context is None:
        _cached_system_context = SystemContext()
    return _cached_system_context

# This global instance is what causes the circular import.
# Modules should call get_system_context() to get the singleton instance instead.
# system_context = get_system_context()