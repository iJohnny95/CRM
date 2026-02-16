"""
Lead extraction logic for the Lead Generator.
Orchestrates searches, filtering, and data enrichment.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from .config import get_config
from .places_api import PlacesAPIClient


class Lead:
    """Represents a business lead."""
    
    # Official Google Places Types (Table 1 and 2 from documentation)
    OFFICIAL_TYPES = {
        "accounting", "airport", "amusement_park", "aquarium", "art_gallery", "atm", "bakery", "bank", "bar",
        "beauty_salon", "bicycle_store", "book_store", "bowling_alley", "bus_station", "cafe", "campground",
        "car_dealer", "car_rental", "car_repair", "car_wash", "casino", "cemetery", "church", "city_hall",
        "clothing_store", "convenience_store", "courthouse", "dentist", "department_store", "doctor",
        "drugstore", "electrician", "electronics_store", "embassy", "fire_station", "florist", "funeral_home",
        "furniture_store", "gas_station", "gym", "hair_care", "hardware_store", "hindu_temple", "home_goods_store",
        "hospital", "insurance_agency", "jewelry_store", "laundry", "lawyer", "library", "light_rail_station",
        "liquor_store", "local_government_office", "locksmith", "lodging", "meal_delivery", "meal_takeaway",
        "mosque", "movie_rental", "movie_theater", "moving_company", "museum", "night_club", "painter", "park",
        "parking", "pet_store", "pharmacy", "physiotherapist", "plumber", "police", "post_office", "primary_school",
        "real_estate_agency", "restaurant", "roofing_contractor", "rv_park", "school", "secondary_school",
        "shoe_store", "shopping_mall", "spa", "stadium", "storage", "store", "subway_station", "supermarket",
        "synagogue", "taxi_stand", "tourist_attraction", "train_station", "transit_station", "travel_agency",
        "university", "veterinary_care", "zoo",
        # New types
        "barber_shop", "beauty_salon", "hair_salon", "nails_salon", "wellness_center"
    }

    @staticmethod
    def _clean_phone(phone: str) -> str:
        """Remove spaces, dashes, and other formatting from phone numbers."""
        if not phone:
            return ""
        # Keep only digits and the + sign for international format
        return ''.join(c for c in phone if c.isdigit() or c == '+')
    
    def __init__(self, data: Dict[str, Any], business_type: str):
        """
        Initialize a lead from Places API data (v1).
        
        Args:
            data: Raw place data from v1 API
            business_type: The category this lead was found under
        """
        self.place_id = data.get("id", "")
        
        # V1 uses displayName object
        display_name = data.get("displayName", {})
        self.business_name = display_name.get("text", "") if isinstance(display_name, dict) else ""
        
        self.address = data.get("formattedAddress", "")
        self.phone = self._clean_phone(data.get("nationalPhoneNumber", ""))
        self.international_phone = self._clean_phone(data.get("internationalPhoneNumber", ""))
        self.website = data.get("websiteUri", "")
        self.google_maps_url = data.get("googleMapsUri", "")
        self.rating = data.get("rating", 0)
        self.review_count = data.get("userRatingCount", 0)
        self.types = data.get("types", [])
        
        # Detect the most specific business type from Google's types list
        self.business_type = self._detect_best_type(self.types, business_type)
        
        self.business_status = data.get("businessStatus", "UNKNOWN")
        self.extracted_date = datetime.now().isoformat()
        
        # Derived fields
        self.has_website = bool(self.website)

    def _detect_best_type(self, types: List[str], fallback: str) -> str:
        """
        Detect the best business type from the raw Google types.
        Aggressively sanitizes inputs to remove brackets/quotes from legacy data.
        """
        # Aggressive sanitization of inputs
        def sanitize(s: str) -> str:
            if not isinstance(s, str): return str(s)
            # Remove brackets, quotes, and common stringified list artifacts
            for char in "[]'\"":
                s = s.replace(char, "")
            return s.strip()

        sanitized_types = [sanitize(t) for t in types if sanitize(t)]
        clean_fallback = sanitize(fallback)

        if not sanitized_types:
            return clean_fallback.capitalize()

        # Uselessly generic types to avoid
        generic_types = {
            "establishment", "point_of_interest", "food", "store", 
            "place_of_worship", "natural_feature", "political"
        }
        
        # 1. Look for official technical matches
        matches = [t for t in sanitized_types if t.lower() in [ot.lower() for ot in self.OFFICIAL_TYPES]]
        
        # 2. If no official matches, look for anything non-generic
        if not matches:
            matches = [t for t in sanitized_types if t.lower() not in generic_types]
        
        # 3. If still no matches (only generic types exist), use clean fallback
        if not matches:
            # If fallback is also just generic, try to find the longest type (often more descriptive)
            if clean_fallback.lower() in generic_types and sanitized_types:
                best_match = max(sanitized_types, key=len)
                return best_match.replace('_', ' ').capitalize()
            return clean_fallback.capitalize()
            
        # Get the first match
        best_type = matches[0]
        return best_type.replace('_', ' ').capitalize()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert lead to dictionary for export."""
        return {
            "business_name": self.business_name,
            "address": self.address,
            "phone": self.phone or self.international_phone,
            "website": self.website,
            "google_maps_url": self.google_maps_url,
            "rating": self.rating,
            "review_count": self.review_count,
            "business_type": self.business_type,
            "has_website": self.has_website,
            "place_id": self.place_id,
            "extracted_date": self.extracted_date,
            "business_status": self.business_status,
            "types": self.types
        }
    
    def __hash__(self):
        return hash(self.place_id)
    
    def __eq__(self, other):
        if isinstance(other, Lead):
            return self.place_id == other.place_id
        return False


class LeadExtractor:
    """Extracts and processes business leads from Google Places API."""
    
    def __init__(self, api_client: Optional[PlacesAPIClient] = None):
        """
        Initialize the lead extractor.
        
        Args:
            api_client: Places API client. Creates one if not provided.
        """
        self.client = api_client or PlacesAPIClient()
        self.config = get_config()
    
    def search_location(
        self,
        location: str,
        business_types: Optional[List[str]] = None,
        radius: Optional[int] = None,
        get_details: bool = True,
        progress_callback: Optional[callable] = None
    ) -> List[Lead]:
        """
        Search for businesses at a location.
        
        Args:
            location: Location string (e.g., "Lisbon, Portugal")
            business_types: List of business types to search. Uses config if None.
            radius: Search radius in meters. Uses config if None.
            get_details: Whether to fetch full details for each place
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of Lead objects (deduplicated)
        """
        # Get coordinates
        lat, lng = self.client.geocode_location(location)
        
        # Use defaults from config if not specified
        if business_types is None:
            business_types = self.config.business_types
        if radius is None:
            radius = self.config.default_radius
        
        # Track unique places by place_id
        seen_places: Set[str] = set()
        leads: List[Lead] = []
        
        total_types = len(business_types)
        
        for idx, btype in enumerate(business_types):
            is_official = btype.lower() in Lead.OFFICIAL_TYPES
            search_method = "Nearby Search" if is_official else "Text Search"
            
            if progress_callback:
                progress_callback(f"Searching for {btype} using {search_method}... ({idx + 1}/{total_types})")
            
            # Fetch places based on type classification
            if is_official:
                places = self.client.search_all_pages(lat, lng, radius, btype.lower())
            else:
                # For non-official types, use text search with location bias
                # We combine the type name with the location name for better relevance
                query = f"{btype}"
                places = self.client.search_all_pages_text(query, lat, lng, radius)
            
            for place in places:
                place_id = place.get("id")
                if place_id and place_id not in seen_places:
                    seen_places.add(place_id)
                    
                    # Get detailed information if requested
                    if get_details:
                        try:
                            details = self.client.get_place_details(place_id)
                            place.update(details)
                        except Exception:
                            pass  # Use basic info if details fail
                    
                    lead = Lead(place, btype)
                    
                    # Only include open/operational businesses
                    if lead.business_status == "OPERATIONAL":
                        leads.append(lead)
        
        return leads
    
    def search_with_preset(
        self,
        preset_name: str,
        get_details: bool = True,
        progress_callback: Optional[callable] = None
    ) -> List[Lead]:
        """
        Search using a predefined preset from config.
        
        Args:
            preset_name: Name of the preset in config.yaml
            get_details: Whether to fetch full details
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of Lead objects
        """
        preset = self.config.get_preset(preset_name)
        if preset is None:
            raise ValueError(f"Preset '{preset_name}' not found. Available: {self.config.list_presets()}")
        
        return self.search_location(
            location=preset["location"],
            business_types=preset.get("types"),
            radius=preset.get("radius"),
            get_details=get_details,
            progress_callback=progress_callback
        )
    
    def filter_leads(
        self,
        leads: List[Lead],
        min_rating: Optional[float] = None,
        min_reviews: Optional[int] = None,
        max_reviews: Optional[int] = None,
        without_website_only: Optional[bool] = None,
        has_phone_only: Optional[bool] = None
    ) -> List[Lead]:
        """
        Filter leads based on criteria.
        
        Args:
            leads: List of leads to filter
            min_rating: Minimum Google rating (1-5)
            min_reviews: Minimum number of reviews
            max_reviews: Maximum number of reviews
            without_website_only: Only include businesses without websites
            has_phone_only: Only include businesses with phone numbers
            
        Returns:
            Filtered list of leads
        """
        # Get defaults from config if not specified
        filters = self.config.filters
        if min_rating is None:
            min_rating = filters.get("min_rating", 0)
        if min_reviews is None:
            min_reviews = filters.get("min_reviews", 0)
        if without_website_only is None:
            without_website_only = filters.get("without_website_only", False)
        if has_phone_only is None:
            has_phone_only = filters.get("has_phone_only", False)
        
        filtered = []
        for lead in leads:
            # Apply filters
            if lead.rating < min_rating:
                continue
            if lead.review_count < min_reviews:
                continue
            if max_reviews is not None and lead.review_count > max_reviews:
                continue
            if without_website_only and lead.has_website:
                continue
            if has_phone_only and not (lead.phone or lead.international_phone):
                continue
            
            filtered.append(lead)
        
        return filtered
    
    def get_statistics(self, leads: List[Lead]) -> Dict[str, Any]:
        """
        Get statistics about the leads.
        
        Args:
            leads: List of leads
            
        Returns:
            Dictionary with statistics
        """
        if not leads:
            return {
                "total": 0,
                "with_website": 0,
                "without_website": 0,
                "with_phone": 0,
                "average_rating": 0,
                "by_type": {}
            }
        
        with_website = sum(1 for l in leads if l.has_website)
        with_phone = sum(1 for l in leads if l.phone or l.international_phone)
        
        ratings = [l.rating for l in leads if l.rating > 0]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Count by business type
        by_type: Dict[str, int] = {}
        for lead in leads:
            by_type[lead.business_type] = by_type.get(lead.business_type, 0) + 1
        
        return {
            "total": len(leads),
            "with_website": with_website,
            "without_website": len(leads) - with_website,
            "with_phone": with_phone,
            "average_rating": round(avg_rating, 2),
            "by_type": by_type
        }
