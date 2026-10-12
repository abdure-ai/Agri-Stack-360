#!/bin/sh
# Keeps all mutable data on the /state volume by linking the paths the code expects into it.
set -e
cd /app
S="${STATE_DIR:-/state}"

mkdir -p "$S/uploads" "$S/training" "$S/cache" "$S/logs" "$S/exports" "$S/models"

# Price DB: seed from the image on first start only.
[ -f "$S/nmis_prices.db" ] || cp nmis_prices.db.seed "$S/nmis_prices.db"
# Retrained models and registry live on the volume; seed from the image on first start.
[ -d "$S/models/lgbm" ] || cp -r models/lgbm "$S/models/lgbm"
[ -f "$S/models/model_registry.json" ] || cp models/model_registry.json "$S/models/model_registry.json"

ln -sfn "$S/nmis_prices.db"   /app/nmis_prices.db
ln -sfn "$S/agri_platform.db" /app/agri_platform.db
for d in uploads training; do rm -rf "/app/data/$d"; ln -sfn "$S/$d" "/app/data/$d"; done
rm -rf /app/data/cache /app/data/exports /app/logs
ln -sfn "$S/cache"   /app/data/cache
ln -sfn "$S/exports" /app/data/exports
ln -sfn "$S/logs"    /app/logs

exec "$@"
