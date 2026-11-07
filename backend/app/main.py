"""FastAPI routes. Contract: ARCHITECTURE.md §5. Every route declares response_model."""

import logging
import os
from contextlib import asynccontextmanager
from typing import Literal

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from . import adapters, hashtags, orchestrator, posting_time, posting_times, store, trends
from .llm import usage
from .models import (
    ApplyRequest,
    Comment,
    CommentCreate,
    CreateRunRequest,
    DemoModeRequest,
    DemoModeResponse,
    HashtagsRequest,
    LiveTrends,
    Persona,
    PersonaReaction,
    Platform,
    PostingSource,
    PostingTime,
    PostingWindow,
    PostingWindows,
    RefereeResult,
    RegenerateRequest,
    Run,
    Trend,
    TrendScore,
    TrendScoreRequest,
    UsageSummary,
)

load_dotenv(store.ROOT / ".env")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.load_snapshot()
    orchestrator.ensure_personas()  # call #3, cached; falls back to canned personas
    for run_id in orchestrator.recover_runs():
        orchestrator.process_run(run_id)
    yield


app = FastAPI(title="Moment", lifespan=lifespan)


@app.exception_handler(orchestrator.NotFoundError)
async def _not_found(_: Request, exc: orchestrator.NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(orchestrator.InvalidTransitionError)
async def _conflict(_: Request, exc: orchestrator.InvalidTransitionError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.get("/trend", response_model=Trend)
def get_trend(which: Literal["default", "rejected"] = "default") -> Trend:
    if which == "rejected":
        return adapters.rejected_trend()
    live = os.environ.get("LIVE_TRENDS", "").strip().lower() in {"1", "true", "yes", "on"}
    return adapters.current_trend(live=live)


@app.get("/personas", response_model=list[Persona])
def get_personas() -> list[Persona]:
    return orchestrator.ensure_personas()


@app.post("/runs", response_model=Run)
def create_run(body: CreateRunRequest, background: BackgroundTasks) -> Run:
    run = orchestrator.create_run(body.trend_id)
    background.add_task(orchestrator.process_run, run.id)
    return run


@app.get("/runs/{run_id}", response_model=Run)
def get_run(run_id: str) -> Run:
    return orchestrator.get_run(run_id)


@app.post("/runs/{run_id}/reactions", response_model=list[PersonaReaction])
def post_reactions(run_id: str) -> list[PersonaReaction]:
    return orchestrator.run_reactions(run_id)


@app.post("/runs/{run_id}/comments", response_model=Comment)
def post_comment(run_id: str, body: CommentCreate) -> Comment:
    return orchestrator.add_comment(run_id, body)


@app.post("/runs/{run_id}/referee", response_model=RefereeResult)
def post_referee(run_id: str) -> RefereeResult:
    return orchestrator.run_referee(run_id)


@app.post("/runs/{run_id}/apply", response_model=Run)
def post_apply(run_id: str, body: ApplyRequest) -> Run:
    return orchestrator.apply(run_id, body)


@app.post("/runs/{run_id}/regenerate", response_model=Run)
def post_regenerate(run_id: str, body: RegenerateRequest) -> Run:
    return orchestrator.regenerate(run_id, body)


@app.post("/runs/{run_id}/hashtags", response_model=Run)
def post_hashtags(run_id: str, body: HashtagsRequest) -> Run:
    return orchestrator.set_hashtags(run_id, body)


@app.post("/trend-score", response_model=TrendScore)
def post_trend_score(body: TrendScoreRequest) -> TrendScore:
    return orchestrator.trend_score(body)


@app.get("/posting-time", response_model=PostingTime)
def get_posting_time(platform: Platform) -> PostingTime:
    return posting_time.recommend(platform)


# The data file has one entry per app; Reels and feed share it (as in posting_time.py).
_WINDOWS_KEY = {
    "instagram_reels": "instagram",
    "instagram_feed": "instagram",
    "facebook_reels": "facebook",
    "facebook_feed": "facebook",
}


@app.get("/posting-windows", response_model=PostingWindows)
def get_posting_windows(platform: str) -> PostingWindows:
    """Week x hour windows from data/posting_windows.json for the heatmap. 404 if no data."""
    wanted = platform.strip().lower()
    data = posting_times.recommend(_WINDOWS_KEY.get(wanted, wanted))
    if data is None:
        raise HTTPException(status_code=404, detail=f"No posting windows for {platform!r}")
    return PostingWindows(
        platform=data.platform,
        best_days=list(data.best_days),
        windows=[PostingWindow(days=list(w.days), start=w.start, end=w.end) for w in data.windows],
        reason=data.reason,
        confidence=data.confidence,
        sources=[PostingSource(name=s.name, url=s.url) for s in data.sources],
    )


@app.get("/hashtags", response_model=hashtags.HashtagSuggestions)
def get_hashtags(
    keywords: str, platform: str = "instagram", limit: int | None = None
) -> hashtags.HashtagSuggestions:
    """Hashtags from the saved, sourced cache (data/hashtags.json). keywords: comma-separated."""
    words = [word.strip() for word in keywords.split(",") if word.strip()]
    return hashtags.suggest(words, platform, limit)


@app.get("/trends/live", response_model=LiveTrends)
def get_live_trends() -> LiveTrends:
    """Current trends collected from the web (data/live_trends.json): saved, not fetched live."""
    collected_at, items = trends.live_trends_feed()
    return LiveTrends(source="saved", collected_at=collected_at, trends=items)


@app.get("/usage", response_model=UsageSummary)
def get_usage(run_id: str | None = None) -> UsageSummary:
    if run_id is not None:
        orchestrator.get_run(run_id)  # 404 for an unknown run
    return usage.summary(run_id)


@app.post("/admin/demo-mode", response_model=DemoModeResponse)
def set_demo_mode(body: DemoModeRequest) -> DemoModeResponse:
    store.set_demo_mode(body.on)
    return DemoModeResponse(on=store.demo_mode())


@app.get("/admin/demo-mode", response_model=DemoModeResponse)
def get_demo_mode() -> DemoModeResponse:
    """Lets the UI show whether demo mode is on (the demo script needs it on all the time)."""
    return DemoModeResponse(on=store.demo_mode())
