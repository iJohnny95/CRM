#!/usr/bin/env python3
"""
Portugal Lead Generator - CLI Entry Point

A tool for extracting local business leads from Portugal using Google Places API.
"""

import sys
from pathlib import Path

import click

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from src.config import get_config
from src.places_api import PlacesAPIClient, PlacesAPIError
from src.lead_extractor import LeadExtractor
from src.exporter import LeadExporter


@click.group()
@click.version_option(version="1.0.0", prog_name="Lead Generator")
def cli():
    """Portugal Lead Generator - Extract local business leads for outreach."""
    pass


@cli.command()
@click.option("--location", "-l", default=None, help="Location to search (e.g., 'Lisbon, Portugal')")
@click.option("--radius", "-r", default=None, type=int, help="Search radius in meters (default: 10000)")
@click.option("--types", "-t", default=None, help="Comma-separated business types (e.g., 'restaurant,cafe')")
@click.option("--preset", "-p", default=None, help="Use a preset from config.yaml")
@click.option("--format", "-f", default=None, type=click.Choice(["csv", "xlsx"]), help="Output format")
@click.option("--output", "-o", default=None, help="Output filename")
@click.option("--no-details", is_flag=True, help="Skip fetching detailed info (faster but less data)")
@click.option("--min-rating", default=None, type=float, help="Minimum Google rating (1-5)")
@click.option("--min-reviews", default=None, type=int, help="Minimum number of reviews")
@click.option("--max-reviews", default=None, type=int, help="Maximum number of reviews")
@click.option("--no-website", is_flag=True, help="Only show businesses without websites")
@click.option("--has-phone", is_flag=True, help="Only show businesses with phone numbers")
def search(location, radius, types, preset, format, output, no_details, min_rating, min_reviews, max_reviews, no_website, has_phone):
    """Search for business leads and export to file."""
    try:
        config = get_config()
    except Exception as e:
        click.echo(click.style(f"Configuration error: {e}", fg="red"))
        click.echo("\nMake sure you have:")
        click.echo("  1. Copied .env.example to .env")
        click.echo("  2. Added your Google Places API key to .env")
        sys.exit(1)
    
    # Validate options
    if preset and (location or types):
        click.echo(click.style("Cannot use --preset with --location or --types", fg="yellow"))
        sys.exit(1)
    
    if not preset and not location:
        location = config.default_location
        click.echo(f"Using default location: {location}")
    
    # Initialize components
    try:
        extractor = LeadExtractor()
        exporter = LeadExporter()
    except ValueError as e:
        click.echo(click.style(f"Error: {e}", fg="red"))
        sys.exit(1)
    
    # Parse business types
    business_types = None
    if types:
        business_types = [t.strip() for t in types.split(",")]
    
    # Progress callback
    def show_progress(message):
        click.echo(f"  {message}")
    
    click.echo()
    click.echo(click.style("🔍 Portugal Lead Generator", fg="cyan", bold=True))
    click.echo("=" * 40)
    
    try:
        # Perform search
        print("[PHASE: SEARCHING]")
        if preset:
            click.echo(f"📍 Using preset: {preset}")
            leads = extractor.search_with_preset(
                preset,
                get_details=not no_details,
                progress_callback=show_progress
            )
        else:
            click.echo(f"📍 Location: {location}")
            click.echo(f"📏 Radius: {radius or config.default_radius}m")
            if business_types:
                click.echo(f"🏢 Types: {', '.join(business_types)}")
            else:
                click.echo(f"🏢 Types: All configured ({len(config.business_types)} types)")
            
            click.echo()
            leads = extractor.search_location(
                location=location,
                business_types=business_types,
                radius=radius,
                get_details=not no_details,
                progress_callback=show_progress
            )
        
        click.echo()
        click.echo(f"✅ Found {len(leads)} businesses")
        
        # Apply filters
        if min_rating or min_reviews or max_reviews or no_website or has_phone:
            print("[PHASE: FILTERING]")
            initial_count = len(leads)
            
            # Count specifically for feedback
            had_website = sum(1 for l in leads if l.has_website)
            no_phone = sum(1 for l in leads if not l.phone)
            
            leads = extractor.filter_leads(
                leads,
                min_rating=min_rating,
                min_reviews=min_reviews,
                max_reviews=max_reviews,
                without_website_only=no_website,
                has_phone_only=has_phone
            )
            click.echo(f"🔧 After filtering: {len(leads)} leads")
            
            if not leads and initial_count > 0:
                click.echo(click.style("\n💡 Tip: All results were filtered out.", fg="cyan", bold=True))
                if no_website and had_website == initial_count:
                    click.echo("   All businesses found have websites. Try unchecking 'Only without website'.")
                elif has_phone_only and no_phone == initial_count:
                    click.echo("   None of the found businesses have phone numbers listed.")
                else:
                    click.echo("   Try broadening your filters (rating, reviews, or website).")
        
        if not leads:
            click.echo(click.style("\n⚠️  No leads found matching your criteria.", fg="yellow"))
            sys.exit(0)
        
        # Show statistics
        print("[PHASE: STATS]")
        stats = extractor.get_statistics(leads)
        click.echo()
        click.echo(click.style("📊 Statistics:", fg="green"))
        click.echo(f"   Total leads: {stats['total']}")
        click.echo(f"   With website: {stats['with_website']}")
        click.echo(f"   Without website: {stats['without_website']} ← potential clients!")
        click.echo(f"   With phone: {stats['with_phone']}")
        click.echo(f"   Average rating: {stats['average_rating']}")
        
        # Export
        print("[PHASE: EXPORTING]")
        click.echo()
        output_path = exporter.export(leads, format=format, filename=output)
        click.echo(click.style(f"💾 Exported to: {output_path}", fg="green", bold=True))
        
    except PlacesAPIError as e:
        click.echo(click.style(f"\n❌ API Error: {e}", fg="red"))
        sys.exit(1)
    except Exception as e:
        click.echo(click.style(f"\n❌ Error: {e}", fg="red"))
        sys.exit(1)


@cli.command()
def presets():
    """List available search presets."""
    try:
        config = get_config()
    except Exception as e:
        click.echo(click.style(f"Error loading config: {e}", fg="red"))
        sys.exit(1)
    
    click.echo(click.style("\n📋 Available Presets:", fg="cyan", bold=True))
    click.echo("=" * 40)
    
    for name in config.list_presets():
        preset = config.get_preset(name)
        click.echo(f"\n  {click.style(name, bold=True)}")
        click.echo(f"    Location: {preset.get('location', 'N/A')}")
        click.echo(f"    Radius: {preset.get('radius', 'default')}m")
        types = preset.get('types', [])
        click.echo(f"    Types: {', '.join(types[:3])}{'...' if len(types) > 3 else ''}")
    
    click.echo()


@cli.command()
def types():
    """List all configured business types."""
    try:
        config = get_config()
    except Exception as e:
        click.echo(click.style(f"Error loading config: {e}", fg="red"))
        sys.exit(1)
    
    click.echo(click.style("\n🏢 Configured Business Types:", fg="cyan", bold=True))
    click.echo("=" * 40)
    
    for btype in config.business_types:
        click.echo(f"  • {btype}")
    
    click.echo(f"\nTotal: {len(config.business_types)} types")
    click.echo()


@cli.command()
def test():
    """Test API connection and configuration."""
    click.echo(click.style("\n🔧 Testing Configuration...", fg="cyan", bold=True))
    click.echo("=" * 40)
    
    # Test config loading
    try:
        config = get_config()
        click.echo(click.style("✅ Configuration loaded", fg="green"))
        click.echo(f"   Default location: {config.default_location}")
        click.echo(f"   Default radius: {config.default_radius}m")
        click.echo(f"   Business types: {len(config.business_types)}")
        click.echo(f"   Presets: {len(config.list_presets())}")
    except Exception as e:
        click.echo(click.style(f"❌ Config error: {e}", fg="red"))
        sys.exit(1)
    
    # Test API key
    try:
        api_key = config.api_key
        click.echo(click.style("✅ API key configured", fg="green"))
        click.echo(f"   Key: {api_key[:8]}...{api_key[-4:]}")
    except ValueError as e:
        click.echo(click.style(f"❌ API key error: {e}", fg="red"))
        click.echo("\n   To fix:")
        click.echo("   1. Copy .env.example to .env")
        click.echo("   2. Add your Google Places API key")
        sys.exit(1)
    
    # Test API connection
    click.echo("\n🌐 Testing API connection...")
    try:
        client = PlacesAPIClient()
        lat, lng = client.geocode_location("Lisbon, Portugal")
        click.echo(click.style("✅ API connection successful", fg="green"))
        click.echo(f"   Geocoded 'Lisbon, Portugal' to: {lat:.4f}, {lng:.4f}")
    except PlacesAPIError as e:
        click.echo(click.style(f"❌ API error: {e}", fg="red"))
        sys.exit(1)
    
    click.echo(click.style("\n🎉 All tests passed! Ready to generate leads.", fg="green", bold=True))
    click.echo()


if __name__ == "__main__":
    cli()
