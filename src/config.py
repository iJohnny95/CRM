"""
Configuration management for the Lead Generator.
Loads environment variables and YAML configuration.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv


class Config:
    """Configuration manager for the Lead Generator."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize configuration.
        
        Args:
            config_path: Path to config.yaml file. Defaults to project root.
        """
        # Load environment variables
        load_dotenv()
        
        # Determine config file path
        if config_path is None:
            config_path = Path(__file__).parent.parent / "config.yaml"
        else:
            config_path = Path(config_path)
        
        # Load YAML configuration
        self._yaml_config: Dict[str, Any] = {}
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                self._yaml_config = yaml.safe_load(f) or {}
    
    @property
    def api_key(self) -> str:
        """Get Google Places API key."""
        key = os.getenv("GOOGLE_PLACES_API_KEY", "")
        if not key or key == "your_api_key_here":
            raise ValueError(
                "Google Places API key not configured. "
                "Please set GOOGLE_PLACES_API_KEY in your .env file."
            )
        return key
    
    @property
    def default_location(self) -> str:
        """Get default search location."""
        return os.getenv("DEFAULT_LOCATION", "Lisbon, Portugal")
    
    @property
    def default_radius(self) -> int:
        """Get default search radius in meters."""
        return int(os.getenv("DEFAULT_RADIUS", "10000"))
    
    @property
    def business_types(self) -> List[str]:
        """Get list of business types to search for."""
        return self._yaml_config.get("business_types", [])
    
    @property
    def presets(self) -> Dict[str, Dict[str, Any]]:
        """Get search presets."""
        return self._yaml_config.get("presets", {})
    
    @property
    def filters(self) -> Dict[str, Any]:
        """Get filter settings."""
        return self._yaml_config.get("filters", {
            "min_rating": 0,
            "without_website_only": False,
            "min_reviews": 0
        })
    
    @property
    def export_settings(self) -> Dict[str, Any]:
        """Get export settings."""
        return self._yaml_config.get("export", {
            "default_format": "csv",
            "columns": ["business_name", "address", "phone", "website", "google_maps_url", "rating", "review_count", "business_type", "place_id", "types"]
        })
    
    def get_preset(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific search preset by name.
        
        Args:
            name: Name of the preset
            
        Returns:
            Preset configuration or None if not found
        """
        return self.presets.get(name)
    
    def list_presets(self) -> List[str]:
        """Get list of available preset names."""
        return list(self.presets.keys())


# Global config instance
_config: Optional[Config] = None


def get_config(config_path: Optional[str] = None) -> Config:
    """
    Get the global configuration instance.
    
    Args:
        config_path: Optional path to config file (only used on first call)
        
    Returns:
        Config instance
    """
    global _config
    if _config is None:
        _config = Config(config_path)
    return _config
