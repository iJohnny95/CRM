import sys
import os
import json

# Add current directory to path to import src
sys.path.append(os.getcwd())

from src.places_api import PlacesAPIClient
from src.lead_extractor import LeadExtractor

def test_v1_migration():
    print("--- Testing Places API v1 Migration ---")
    
    client = PlacesAPIClient()
    extractor = LeadExtractor(client)
    
    location = "Lisbon, Portugal"
    
    print(f"\n1. Testing Nearby Search (v1) for 'restaurant' near {location}...")
    try:
        lat, lng = client.geocode_location(location)
        places = client.nearby_search(lat, lng, 1000, "restaurant", max_results=5)
        print(f"   Successfully found {len(places)} places.")
        if places:
            first = places[0]
            print(f"   First place ID: {first.get('id')}")
            print(f"   First place Display Name: {first.get('displayName', {}).get('text')}")
    except Exception as e:
        print(f"   Nearby Search FAILED: {e}")

    print(f"\n2. Testing Text Search (v1) for 'Barber' near {location}...")
    try:
        leads = extractor.search_location(location, business_types=["Barber"], radius=2000, get_details=True)
        print(f"   Successfully extracted {len(leads)} leads using Text Search v1.")
        if leads:
            first = leads[0]
            print(f"   First Lead Name: {first.business_name}")
            print(f"   First Lead Phone: {first.phone}")
            print(f"   First Lead Website: {first.website}")
            print(f"   First Lead Maps URL: {first.google_maps_url}")
    except Exception as e:
        print(f"   Text Search FAILED: {e}")

    print("\n3. Testing Detail field mapping...")
    if leads:
        lead = leads[0]
        data = lead.to_dict()
        print(f"   Lead to_dict sample: {json.dumps(data, indent=2)}")
        
        # Verify specific v1 fields are present
        if not data.get('business_name'):
             print("   WARNING: business_name is empty!")
        if not data.get('place_id'):
             print("   WARNING: place_id is empty!")

if __name__ == "__main__":
    test_v1_migration()
