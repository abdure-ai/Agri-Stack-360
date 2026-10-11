"""
retrain.py — Retrain the price forecast models after a sync.

Runs models/retrain.py in a separate Python process: the ML libraries stay out
of this service, a training crash cannot take the service down, and Stop can
end training cleanly. Model files are swapped in atomically by retrain.py and
the prediction API (serving/) reloads them on its next request.
"""

import json
import logging
import os
import subprocess
import sys
import threading
import time
from typing import Callable, Optional

from scraper import config

log = logging.getLogger(__name__)


def model_info() -> Optional[dict]:
    """Contents of models/model_registry.json, or None if never trained."""
    try:
        with open(config.MODEL_REGISTRY, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def needs_retrain(rows_added: int, latest_price_date: Optional[str]) -> Optional[str]:
    """Return a reason to skip retraining, or None if it should run."""
    info = model_info()
    if info is None:
        return None
    trained_through = info.get("latest_data_date")
    if rows_added == 0 and trained_through and latest_price_date and trained_through >= latest_price_date:
        return f"No new prices — forecasts already use data up to {trained_through}"
    return None


def run_retrain(should_stop: Callable[[], bool]) -> tuple[str, str]:
    """
    Run models/retrain.py and stream its output into the sync log.
    Returns (status, message) with status one of success | failed | cancelled.
    """
    env = {
        **os.environ,
        "NMIS_PRICES_DB": str(config.PRICES_DB),
        "NMIS_MODEL_DIR": str(config.MODEL_DIR),
        "NMIS_MODEL_REGISTRY": str(config.MODEL_REGISTRY),
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1",
    }
    log.info("Retraining forecast models (%s)", config.RETRAIN_SCRIPT.relative_to(config.ROOT_DIR))
    started = time.monotonic()
    proc = subprocess.Popen(
        [sys.executable, str(config.RETRAIN_SCRIPT)],
        cwd=config.ROOT_DIR,             # training code writes paths relative to the project root
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    tail: list[str] = []

    def pump():
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                tail.append(line)
                del tail[:-20]
                log.info("  [retrain] %s", line)

    reader = threading.Thread(target=pump, name="retrain-output", daemon=True)
    reader.start()

    status, message = None, None
    while proc.poll() is None:
        if should_stop():
            status, message = "cancelled", "Stopped before training finished — previous forecasts kept"
            break
        if time.monotonic() - started > config.RETRAIN_TIMEOUT_SECONDS:
            status, message = "failed", f"Timed out after {config.RETRAIN_TIMEOUT_SECONDS // 60} min — previous forecasts kept"
            break
        time.sleep(1)

    if status:  # stopped or timed out: end the process
        proc.terminate()
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
    reader.join(5)
    _remove_partial_files()

    elapsed = time.monotonic() - started
    if status is None:
        if proc.returncode == 0:
            info = model_info() or {}
            status = "success"
            message = (f"Forecasts retrained on data up to {info.get('latest_data_date', '?')} "
                       f"({info.get('total_observations', '?')} observations) in {elapsed:.0f}s")
        else:
            last = next((l for l in reversed(tail) if l.strip()), "no output")
            status = "failed"
            message = f"Training exited with code {proc.returncode}: {last} — previous forecasts kept"

    log_fn = log.info if status == "success" else log.warning
    log_fn("Retrain %s: %s", status, message)
    return status, message


def _remove_partial_files():
    for tmp in list(config.MODEL_DIR.glob("*.tmp")) + [config.MODEL_REGISTRY.with_name(config.MODEL_REGISTRY.name + ".tmp")]:
        try:
            tmp.unlink()
        except FileNotFoundError:
            pass
