"""Per-call usage log (logs/usage.jsonl) and the /usage aggregation. Feeds the cost slide."""

import json
import os
import threading
from pathlib import Path

from ..models import CallUsage, UsageSummary
from ..store import ROOT

_lock = threading.Lock()
_log_path: Path = ROOT / "logs" / "usage.jsonl"

# USD per million tokens. PLACEHOLDER defaults: set the real prices for LLM_MODEL in .env
# (LLM_PRICE_IN_PER_MTOK / LLM_PRICE_OUT_PER_MTOK) before quoting numbers on the cost slide.
DEFAULT_PRICE_IN = 3.0
DEFAULT_PRICE_OUT = 15.0


def configure(path: Path) -> None:
    global _log_path
    _log_path = path


def _price(var: str, default: float) -> float:
    try:
        return float(os.environ.get(var, "") or default)
    except ValueError:
        return default


def cost_usd(input_tokens: int, output_tokens: int) -> float:
    price_in = _price("LLM_PRICE_IN_PER_MTOK", DEFAULT_PRICE_IN)
    price_out = _price("LLM_PRICE_OUT_PER_MTOK", DEFAULT_PRICE_OUT)
    return (input_tokens * price_in + output_tokens * price_out) / 1_000_000


def log_call(
    *,
    run_id: str | None,
    call: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
) -> None:
    line = {
        "run_id": run_id,
        "call": call,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "latency_ms": latency_ms,
    }
    try:
        with _lock:
            _log_path.parent.mkdir(parents=True, exist_ok=True)
            with _log_path.open("a") as f:
                f.write(json.dumps(line) + "\n")
    except OSError:
        pass  # logging must never break a call


def summary(run_id: str | None) -> UsageSummary:
    calls: list[CallUsage] = []
    try:
        lines = _log_path.read_text().splitlines()
    except OSError:
        lines = []
    for raw in lines:
        try:
            d = json.loads(raw)
            if run_id is not None and d.get("run_id") != run_id:
                continue
            i, o = int(d["input_tokens"]), int(d["output_tokens"])
            calls.append(
                CallUsage(
                    call=d["call"],
                    model=d["model"],
                    input_tokens=i,
                    output_tokens=o,
                    latency_ms=int(d["latency_ms"]),
                    cost_usd=0.0 if d["model"] == "demo-cache" else cost_usd(i, o),
                )
            )
        except (ValueError, KeyError, TypeError):
            continue  # skip a corrupt line
    return UsageSummary(
        run_id=run_id,
        calls=calls,
        total_input_tokens=sum(c.input_tokens for c in calls),
        total_output_tokens=sum(c.output_tokens for c in calls),
        total_cost_usd=sum(c.cost_usd for c in calls),
    )
