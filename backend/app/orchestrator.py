"""Run state machine. Endpoints call these functions; this module owns every transition.

SPOTTED -> REJECTED | DRAFTED -> IN_REVIEW -> REFEREED -> (IN_REVIEW again) | SHIPPED
"""

import logging
import uuid
from datetime import UTC, datetime

from . import adapters, demo_cache, store, weighting
from .llm import calls
from .models import (
    ApplyRequest,
    Comment,
    CommentCreate,
    Draft,
    Persona,
    PersonaReaction,
    RefereeResult,
    Run,
)

log = logging.getLogger(__name__)


class NotFoundError(Exception):
    """Unknown run / trend / conflict -> HTTP 404."""


class InvalidTransitionError(Exception):
    """Action not allowed in the run's current state -> HTTP 409."""


def _now() -> datetime:
    return datetime.now(UTC)


def _claim(run_id: str, allowed: set[str], step: str) -> Run:
    """Atomically check state and mark the run busy, so a double click can't run a step twice."""
    with store.mutate(run_id) as run:
        if run is None:
            raise NotFoundError(f"run {run_id} not found")
        if run.status not in allowed:
            raise InvalidTransitionError(f"cannot do this while status is {run.status}")
        if run.step is not None:
            raise InvalidTransitionError(f"run is busy: {run.step}")
        run.step = step
        return run.model_copy(deep=True)


def _release(run_id: str) -> None:
    with store.mutate(run_id) as run:
        if run is not None:
            run.step = None


def get_run(run_id: str) -> Run:
    run = store.get_run(run_id)
    if run is None:
        raise NotFoundError(f"run {run_id} not found")
    # Comment weights decay with time, so they are computed at read time.
    return run.model_copy(update={"comments": weighting.weigh_comments(run.comments, _now())})


# --- personas (call #3, once) -------------------------------------------------


def ensure_personas() -> list[Persona]:
    personas = store.get_personas()
    if personas:
        return personas
    reviews = None if store.demo_mode() else adapters.reviews_text()
    if reviews is None:
        personas = demo_cache.personas()
    else:
        personas = calls.build_personas(reviews, adapters.brand_guidelines())
    store.set_personas(personas)
    return personas


# --- create + background fit/draft -------------------------------------------


def create_run(trend_id: str) -> Run:
    trend = store.find_trend(trend_id)
    if trend is None:
        raise NotFoundError(f"trend {trend_id} not found")
    run = Run(
        id=f"run_{uuid.uuid4().hex[:8]}",
        trend=trend,
        status="SPOTTED",
        step="Queued…",
        started_at=_now(),
    )
    store.save_run(run)
    return run


def _set_step(run_id: str, step: str) -> None:
    with store.mutate(run_id) as run:
        if run is not None:
            run.step = step


def process_run(run_id: str) -> None:
    """Background task: fit check, draft, visual. Never leaves the run stuck in SPOTTED."""
    try:
        _fit_and_draft(run_id)
    except Exception:  # noqa: BLE001 - last resort, the demo must keep moving
        log.exception("fit/draft failed for %s; using cached draft", run_id)
        _finish_with_cached_draft(run_id)


def _fit_and_draft(run_id: str) -> None:
    run = get_run(run_id)
    brand = adapters.brand_guidelines()

    _set_step(run_id, "Checking brand fit…")
    fit = calls.check_fit(run.trend, brand, run_id)
    with store.mutate(run_id) as r:
        if r is not None:
            r.fit = fit
            if not fit.fits:
                r.status, r.step = "REJECTED", None
    if not fit.fits:
        return

    _set_step(run_id, "Writing the draft…")
    content = calls.write_draft(run.trend, brand, run_id)
    draft = Draft(**content.model_dump())

    _set_step(run_id, "Generating visual…")
    draft = adapters.create_visual_and_post(draft)
    with store.mutate(run_id) as r:
        if r is not None:
            r.draft, r.status, r.step = draft, "DRAFTED", None


def _finish_with_cached_draft(run_id: str) -> None:
    with store.mutate(run_id) as r:
        if r is not None and r.status == "SPOTTED":
            r.fit = r.fit or demo_cache.fit()
            r.draft = Draft(**demo_cache.draft().model_dump())
            r.status, r.step = "DRAFTED", None


def recover_runs() -> list[str]:
    """After a restart: clear stale 'busy' markers; return ids of SPOTTED runs to re-process."""
    pending = []
    for run_id in store.list_run_ids():
        with store.mutate(run_id) as run:
            if run is None:
                continue
            if run.status == "SPOTTED":
                pending.append(run_id)
            else:
                run.step = None
    return pending


# --- review -------------------------------------------------------------------

REVIEWABLE = {"DRAFTED", "IN_REVIEW"}


def run_reactions(run_id: str) -> list[PersonaReaction]:
    run = _claim(run_id, REVIEWABLE, "Customer personas are reacting…")
    try:
        assert run.draft is not None
        reactions = calls.react(run.draft, ensure_personas(), run_id)
        with store.mutate(run_id) as r:
            if r is not None:
                r.reactions, r.status = reactions, "IN_REVIEW"
        return reactions
    finally:
        _release(run_id)


def add_comment(run_id: str, body: CommentCreate) -> Comment:
    now = _now()
    comment = Comment(
        id=f"c_{uuid.uuid4().hex[:8]}",
        role=body.role,
        text=body.text,
        created_at=now,
        **weighting.author_fields(body.author),  # type: ignore[arg-type]
    )
    comment = weighting.weigh_comments([comment], now)[0]
    with store.mutate(run_id) as run:
        if run is None:
            raise NotFoundError(f"run {run_id} not found")
        if run.status not in REVIEWABLE | {"REFEREED"}:
            raise InvalidTransitionError(f"cannot comment while status is {run.status}")
        run.comments.append(comment)
        run.status = "IN_REVIEW"  # a new comment after REFEREED means: referee again
    return comment


def run_referee(run_id: str) -> RefereeResult:
    run = _claim(run_id, {"IN_REVIEW"}, "Referee is resolving the feedback…")
    try:
        assert run.draft is not None
        result = calls.referee(
            run.draft,
            weighting.weigh_comments(run.comments, _now()),
            run.reactions,
            ensure_personas(),
            adapters.brand_guidelines(),
            run_id,
        )
        with store.mutate(run_id) as r:
            if r is not None:
                r.referee, r.status = result, "REFEREED"
        return result
    finally:
        _release(run_id)


# --- apply + ship ---------------------------------------------------------------


def _applied_draft(draft: Draft, referee: RefereeResult, accept_all_edits: bool) -> Draft:
    """The final caption is the referee's compromise; other edits only with accept_all_edits."""
    new = draft.model_copy(update={"caption": referee.final_caption, "version": draft.version + 1})
    if accept_all_edits:
        for edit in referee.edits:  # later edits win
            if edit.target == "hashtags":
                new.hashtags = edit.after.split()
            elif edit.target == "visual_prompt":
                new.visual_prompt = edit.after
    return new


def apply(run_id: str, body: ApplyRequest) -> Run:
    run = _claim(run_id, {"REFEREED"}, "Applying changes…")
    try:
        assert run.draft is not None and run.referee is not None
        known = {c.id for c in run.referee.conflicts}
        unknown = set(body.conflict_ids or []) - known
        if unknown:
            raise NotFoundError(f"unknown conflict ids: {sorted(unknown)}")

        new_draft = _applied_draft(run.draft, run.referee, body.accept_all_edits)
        new_draft = adapters.update_post(run.draft, new_draft)
        shipped_at = _now()
        adapters.send_to_slack(new_draft, run.referee.tasks, shipped_at - run.started_at)
        with store.mutate(run_id) as r:
            if r is not None:
                r.draft, r.status, r.shipped_at = new_draft, "SHIPPED", shipped_at
        return get_run(run_id)
    finally:
        _release(run_id)
