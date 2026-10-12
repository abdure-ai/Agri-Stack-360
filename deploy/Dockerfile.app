# Platform API, forecast API, data sync, Telegram bot (one image, different commands).
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY serving/ serving/
COPY scraper/ scraper/
COPY models/ models/
COPY scripts/ scripts/
COPY data/ data/
COPY nmis_prices.db ./nmis_prices.db.seed
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONUNBUFFERED=1 STATE_DIR=/state
ENTRYPOINT ["/entrypoint.sh"]
