"""In-memory store + JSON snapshot. The only module allowed to hold global state."""

import json
import logging
import os
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from .models import Persona, Run, Trend

log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]

_lock = threading.RLock()
_runs: dict[str, Run] = {}
_trends: dict[str, Trend] = {}
_personas: list[Persona] = []
_demo_mode: bool | None = None  # None = read DEMO_MODE env on first use
_snapshot_path: Path = ROOT / "data" / "runs.json"


def configure(snapshot_path: Path) -> None:
    """Point the snapshot somewhere else (tests)."""
    global _snapshot_path
    _snapshot_path = snapshot_path


def reset() -> None:
    global _demo_mode
    with _lock:
        _runs.clear()
        _trends.clear()
        _personas.clear()
        _demo_mode = None


# --- demo mode --------------------------------------------------------------


def demo_mode() -> bool:
    global _demo_mode
    if _demo_mode is None:
        _demo_mode = os.environ.get("DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}
    return _demo_mode


def set_demo_mode(on: bool) -> None:
    global _demo_mode
    _demo_mode = on


# --- trends / personas ------------------------------------------------------


def remember_trend(trend: Trend) -> None:
    with _lock:
        _trends[trend.id] = trend


def find_trend(trend_id: str) -> Trend | None:
    with _lock:
        return _trends.get(trend_id)


def get_personas() -> list[Persona]:
    with _lock:
        return [p.model_copy(deep=True) for p in _personas]


def set_personas(personas: list[Persona]) -> None:
    with _lock:
        _personas[:] = personas


# --- runs -------------------------------------------------------------------


def get_run(run_id: str) -> Run | None:
    with _lock:
        run = _runs.get(run_id)
        return run.model_copy(deep=True) if run else None


def list_run_ids() -> list[str]:
    with _lock:
        return list(_runs)


def save_run(run: Run) -> None:
    with _lock:
        _runs[run.id] = run.model_copy(deep=True)
        _snapshot()


@contextmanager
def mutate(run_id: str) -> Iterator[Run | None]:
    """Hold the lock, yield a copy of the run, save it on exit. Keep the body short (no I/O)."""
    with _lock:
        run = get_run(run_id)
        yield run
        if run is not None:
            save_run(run)


def _snapshot() -> None:
    try:
        _snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {rid: r.model_dump(mode="json") for rid, r in _runs.items()}
        tmp = _snapshot_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2))
        tmp.replace(_snapshot_path)
    except OSError:
        log.exception("could not write runs snapshot")  # must never break the flow


def load_snapshot() -> None:
    """Restore runs after a restart. Runs caught mid-job are finished by the caller."""
    try:
        data = json.loads(_snapshot_path.read_text())
        runs = {rid: Run.model_validate(r) for rid, r in data.items()}
    except (OSError, ValueError):
        return
    with _lock:
        _runs.update(runs)
        for run in runs.values():
            _trends[run.trend.id] = run.trend
