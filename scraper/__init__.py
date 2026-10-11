"""
NMIS data sync module.

Keeps nmis_prices.db up to date with nmis.et. Runs as its own service:

    uvicorn scraper.api:app --port 8002

See docs/06_data_sync.md.
"""
