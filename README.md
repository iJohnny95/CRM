# Portugal Lead Generator 🇵🇹

A command-line tool to extract local business leads from Portugal using Google Places API. Find potential clients for your web development, AI, automation, and data services.

## Features

- 🔍 Search businesses by location and type
- 📊 Filter by rating, reviews, and website presence
- 💾 Export to CSV or Excel with statistics
- ⚡ Pre-configured business categories and search presets
- 🎯 Focus on businesses that need your services

## Quick Start

### 1. Install Dependencies

```bash
cd LeadGenerator
pip install -r requirements.txt
```

### 2. Configure API Key

1. Get a Google Places API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable the "Places API" and "Geocoding API"
3. Copy the example environment file and add your key:

```bash
copy .env.example .env
# Edit .env and add your API key
```

### 3. Test Configuration

```bash
python main.py test
```

### 4. Start Generating Leads

```bash
# Search with default settings (Lisbon, all business types)
python main.py search

# Search a specific location
python main.py search --location "Porto, Portugal" --radius 5000

# Search specific business types
python main.py search --location "Faro, Portugal" --types restaurant,cafe,bar

# Use a preset
python main.py search --preset lisbon_restaurants

# Export to Excel with statistics
python main.py search --location "Lisbon" --format xlsx

# Find businesses WITHOUT websites (higher need for your services!)
python main.py search --location "Braga" --no-website
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search for business leads and export |
| `presets` | List available search presets |
| `types` | List all configured business types |
| `test` | Test API connection and configuration |

## Search Options

| Option | Description |
|--------|-------------|
| `-l, --location` | Location to search (e.g., "Lisbon, Portugal") |
| `-r, --radius` | Search radius in meters (default: 10000) |
| `-t, --types` | Comma-separated business types |
| `-p, --preset` | Use a preset from config.yaml |
| `-f, --format` | Output format: csv or xlsx |
| `-o, --output` | Custom output filename |
| `--min-rating` | Minimum Google rating (1-5) |
| `--no-website` | Only businesses without websites |
| `--no-details` | Skip fetching detailed info (faster) |

## Configuration

Edit `config.yaml` to customize:

- **Business types**: Add/remove types to search
- **Presets**: Create saved search configurations
- **Filters**: Set default filtering options
- **Export**: Configure output columns and format

## Output

Leads are exported to the `data/` folder with:

- Business name, address, phone, website
- Google Maps URL for easy research
- Rating and review count
- Whether they have a website (opportunity indicator!)
- Extraction timestamp

## Example Workflow

1. **Morning prospecting**:
   ```bash
   python main.py search --preset lisbon_wellness --no-website --format xlsx
   ```

2. **Review leads** in Excel - focus on businesses without websites

3. **Research each lead** using the Google Maps URL

4. **Contact** with personalized outreach about your services

## API Costs

Google Places API offers **$200/month free credit**. Typical usage:
- Nearby Search: ~$0.032 per request
- Place Details: ~$0.017 per request

A search for 10 business types returning 500 leads costs approximately **$10-15**.

## License

MIT License - Use freely for your lead generation needs.
