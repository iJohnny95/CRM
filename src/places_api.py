"""
Google Places API client for the Lead Generator.
Handles API requests for nearby search, text search, and place details.
"""

import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import requests

from .config import get_config


class PlacesAPIError(Exception):
    """Exception raised for Places API errors."""
    pass


class PlacesAPIClient:
    """Client for Google Places API (New) v1."""
    
    BASE_URL = "https://places.googleapis.com"
    GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    
    # Rate limiting settings
    REQUESTS_PER_SECOND = 10
    REQUEST_DELAY = 1.0 / REQUESTS_PER_SECOND
    
    # Default Field Mask for Places
    DEFAULT_FIELD_MASK = (
        "places.id,places.displayName,places.formattedAddress,"
        "places.nationalPhoneNumber,places.websiteUri,places.rating,"
        "places.userRatingCount,places.location,places.types,"
        "places.businessStatus,places.googleMapsUri"
    )
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Places API client.
        
        Args:
            api_key: Google Places API key. If not provided, loads from config.
        """
        self.api_key = api_key or get_config().api_key
        self._last_request_time = 0.0
    
    def _rate_limit(self):
        """Apply rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.REQUEST_DELAY:
            time.sleep(self.REQUEST_DELAY - elapsed)
        self._last_request_time = time.time()
    
    def _make_v1_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        field_mask: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make a request to the Places API v1.
        """
        self._rate_limit()
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
        }
        
        if field_mask:
            headers["X-Goog-FieldMask"] = field_mask
        
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            if method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            else:
                response = requests.get(url, headers=headers, timeout=30)
            
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            # Try to get more error details from response
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get("error", {}).get("message", str(e))
                    
                    if "blocked" in error_msg.lower():
                        error_msg += (
                            "\n\nTIP: This usually means 'Places API (New)' is not enabled "
                            "or your API Key is restricted. Please enable 'Places API (New)' "
                            "in the Google Cloud Console and ensure your API Key includes it."
                        )
                except Exception:
                    error_msg = str(e)
            else:
                error_msg = str(e)
            raise PlacesAPIError(f"V1 Request failed: {error_msg}")

    def geocode_location(self, location: str) -> Tuple[float, float]:
        """
        Convert a location string to coordinates using Legacy Geocoding API.
        """
        self._rate_limit()
        
        params = {
            "address": location,
            "key": self.api_key
        }
        url = f"{self.GEOCODE_URL}?{urlencode(params)}"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            status = data.get("status")
            if status != "OK":
                error_msg = data.get("error_message", "No error message provided")
                raise PlacesAPIError(
                    f"Geocoding failed for '{location}'. Status: {status}"
                )
            
            location_data = data["results"][0]["geometry"]["location"]
            return location_data["lat"], location_data["lng"]
            
        except (requests.RequestException, KeyError, IndexError) as e:
            raise PlacesAPIError(f"Geocoding failed: {e}")
    
    def nearby_search(
        self,
        latitude: float,
        longitude: float,
        radius: int,
        place_type: str,
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for places near a location using Places API (New) v1.
        """
        data = {
            "includedTypes": [place_type],
            "maxResultCount": min(max_results, 20), # V1 Nearby Search limit is 20 per request
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": float(radius)
                }
            }
        }
        
        response = self._make_v1_request(
            "POST", 
            "v1/places:searchNearby", 
            data=data, 
            field_mask=self.DEFAULT_FIELD_MASK
        )
        
        return response.get("places", [])
    
    def text_search(
        self,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius: Optional[int] = None,
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for places using text query using Places API (New) v1.
        """
        data = {
            "textQuery": query,
            "maxResultCount": min(max_results, 20)
        }
        
        if latitude is not None and longitude is not None:
            data["locationBias"] = {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": float(radius or 5000)
                }
            }
        
        response = self._make_v1_request(
            "POST", 
            "v1/places:searchText", 
            data=data, 
            field_mask=self.DEFAULT_FIELD_MASK
        )
        
        return response.get("places", [])
    
    def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a place using Places API (New) v1.
        """
        # For details in V1, many fields are already in search results if mask is correctly set.
        # But we still provide this for specific ID lookups.
        
        # Mapping old field names to new mask paths if needed, 
        # but here we just use the default full mask.
        response = self._make_v1_request(
            "GET", 
            f"v1/places/{place_id}", 
            field_mask=self.DEFAULT_FIELD_MASK.replace("places.", "") # Detail fields don't have 'places.' prefix
        )
        
        return response
    
    def search_all_pages(
        self,
        latitude: float,
        longitude: float,
        radius: int,
        place_type: str,
        max_results: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Search for places and simulate pagination for V1 (V1 uses pageToken).
        """
        # Note: V1 SearchNearby doesn't support pageToken yet in the same way as legacy.
        # SearchText does. For Nearby, we try to get as many as possible.
        # However, for now, we'll implement a simple one-shot or limited pagination if supported.
        # Actually, searchNearby V1 does NOT support pageToken. 
        # searchText V1 DOES support pageToken.
        
        # For nearby, we'll just get the initial 20 for now as per V1 limits.
        return self.nearby_search(latitude, longitude, radius, place_type, max_results)

    def search_all_pages_text(
        self,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius: Optional[int] = None,
        max_results: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Search for places via query with pagination using Places API (New) v1.
        """
        all_places = []
        next_token = None
        
        while len(all_places) < max_results:
            data = {
                "textQuery": query,
                "maxResultCount": min(max_results - len(all_places), 20)
            }
            
            if next_token:
                data["pageToken"] = next_token
                
            if latitude is not None and longitude is not None:
                data["locationBias"] = {
                    "circle": {
                        "center": {"latitude": latitude, "longitude": longitude},
                        "radius": float(radius or 5000)
                    }
                }
            
            try:
                # Need to add nextPageToken to field mask for text search pagination
                mask = self.DEFAULT_FIELD_MASK + ",nextPageToken"
                response = self._make_v1_request("POST", "v1/places:searchText", data=data, field_mask=mask)
                
                places = response.get("places", [])
                all_places.extend(places)
                
                next_token = response.get("nextPageToken")
                if not next_token or not places:
                    break
                    
                time.sleep(1) # Graceful delay
                
            except Exception as e:
                print(f"Pagination error: {e}")
                break
                
        return all_places[:max_results]
