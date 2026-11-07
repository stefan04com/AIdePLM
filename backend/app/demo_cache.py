"""Last-good responses + canned defaults: demo mode and LLM failures still produce output."""

import json
import logging
import threading
from copy import deepcopy
from pathlib import Path

from pydantic import BaseModel

from .llm.schemas import DraftContent
from .models import (
    Comment,
    CommentStatus,
    Conflict,
    ConflictParty,
    Draft,
    Edit,
    FitResult,
    Persona,
    PersonaReaction,
    RefereeResult,
    Task,
)
from .store import ROOT

log = logging.getLogger(__name__)

_lock = threading.Lock()
_path: Path = ROOT / "data" / "last_good.json"
_last_good: dict[str, dict] = {}


def configure(path: Path) -> None:
    global _path
    _path = path
    _last_good.clear()


def remember(call: str, value: BaseModel) -> None:
    """Store a validated live response as the new last-good (persisted across restarts)."""
    with _lock:
        _last_good[call] = value.model_dump(mode="json")
        try:
            _path.parent.mkdir(parents=True, exist_ok=True)
            _path.write_text(json.dumps(_last_good, indent=2))
        except OSError:
            log.warning("could not persist last-good cache")


def _recall(call: str) -> dict | None:
    with _lock:
        if not _last_good:
            try:
                _last_good.update(json.loads(_path.read_text()))
            except (OSError, ValueError):
                pass
        return deepcopy(_last_good.get(call))


# --- canned defaults (match the scripted demo: Legal vs Product, Brand vs a persona) ---------

CANNED_FIT = FitResult(
    fits=True,
    score=82,
    reason="Playful, self-aware tone matches the brand voice; no competitor or claim risk.",
)

CANNED_DRAFT = DraftContent(
    brief="Own the 'running late' joke: a lighthearted post that promises our app gets you "
    "there faster than the excuses.",
    caption="Late again? Our app guarantees you'll arrive 10 minutes earlier than the train "
    "announcement. Download now.",
    visual_prompt="Flat illustration of a commuter sprinting past a stationary train, warm "
    "sunrise colours, brand palette",
    hashtags=["#MondayCommute", "#RunningLate"],
)

CANNED_PERSONAS = [
    Persona(
        id="gen_z_commuter",
        name="Gen Z commuter",
        segment="18-25, daily public transport, skeptical of ads",
        cares_about=["authentic tone", "humour", "no hard sell"],
        pet_peeves=["brands trying too hard", "fake urgency"],
        sample_quotes=["Honestly the app is fine but every ad feels like it's trying too hard."],
    ),
    Persona(
        id="busy_parent",
        name="Busy parent",
        segment="30-45, juggles school runs and work",
        cares_about=["saving time", "reliability", "concrete benefits"],
        pet_peeves=["vague promises", "complicated sign-ups"],
        sample_quotes=["If it saves me ten minutes in the morning, I'm in."],
    ),
    Persona(
        id="skeptical_veteran",
        name="Skeptical veteran",
        segment="45+, long-time customer, burned by marketing claims",
        cares_about=["honesty", "proof", "service quality"],
        pet_peeves=["guarantees", "exaggerated claims"],
        sample_quotes=["I've heard 'guaranteed' before. Show me, don't tell me."],
    ),
]

_CANNED_REACTIONS = [
    ("Funny and relatable, but 'download now' feels like an ad. Drop the hard sell.", 0.4, True),
    ("I only care if it really saves me time. A guarantee would get my attention.", 0.6, True),
    ("'Guarantees' sounds like marketing fluff. I've been burned by this before.", -0.5, False),
]

_CANNED_TASKS = [
    Task(owner="Legal", task="Sign off the revised caption wording", due="today 15:00"),
    Task(
        owner="Product",
        task="Provide a substantiated time-saving stat for follow-up posts",
        due="this week",
    ),
]


def fit() -> FitResult:
    data = _recall("fit")
    return FitResult.model_validate(data) if data else CANNED_FIT.model_copy()


def draft() -> DraftContent:
    data = _recall("draft")
    return DraftContent.model_validate(data) if data else CANNED_DRAFT.model_copy()


def personas() -> list[Persona]:
    data = _recall("personas")
    if data:
        return [Persona.model_validate(p) for p in data["personas"]]
    return [p.model_copy(deep=True) for p in CANNED_PERSONAS]


def reactions(personas_: list[Persona]) -> list[PersonaReaction]:
    """Canned reactions re-bound by position, so ids always match the personas in use."""
    return [
        PersonaReaction(persona_id=p.id, reaction=r, sentiment=s, would_engage=e)
        for p, (r, s, e) in zip(personas_, _CANNED_REACTIONS, strict=False)
    ]


def referee(comments: list[Comment], draft_: Draft, personas_: list[Persona]) -> RefereeResult:
    """Canned referee result built from the run's real comment ids / persona ids / caption."""
    latest = {c.role: c.id for c in comments}  # newest comment per role wins
    labels = {"brand": "Brand", "legal": "Legal", "product": "Product"}

    def human(role: str) -> ConflictParty:
        return ConflictParty(kind="human", id=role, label=labels[role])

    def persona(i: int) -> ConflictParty:
        p = personas_[min(i, len(personas_) - 1)]
        return ConflictParty(kind="persona", id=p.id, label=p.name)

    conflicts: list[Conflict] = []
    if "legal" in latest and "product" in latest:
        conflicts.append(
            Conflict(
                id="conf_1",
                between=[human("legal"), human("product")],
                summary="Legal wants the guarantee removed; Product wants the time-saving "
                "promise to stay prominent.",
                positions={
                    "legal": "No 'guarantee' or fixed-minutes claim.",
                    "product": "Keep time-saving as the headline benefit.",
                },
                compromise="Keep the time-saving angle but phrase it as 'helps you arrive "
                "earlier', with no guarantee and no number.",
            )
        )
    if "brand" in latest and personas_:
        p = persona(1)
        conflicts.append(
            Conflict(
                id="conf_2",
                between=[human("brand"), p],
                summary=f"Brand wants a soft CTA; {p.label} responds to a concrete benefit.",
                positions={
                    "brand": "Soft, on-brand call to action.",
                    p.id: "Wants a concrete, credible time-saving benefit.",
                },
                compromise="End with a soft CTA ('See how it works') after one concrete "
                "benefit line.",
            )
        )

    final_caption = "Late again? Our app helps you beat the train announcement. See how it works."
    edits: list[Edit] = []
    if "legal" in latest:
        edits.append(
            Edit(
                target="caption",
                before=draft_.caption,
                after=final_caption,
                source_comment_id=latest["legal"],
            )
        )
    if "brand" in latest:
        edits.append(
            Edit(
                target="hashtags",
                before=" ".join(draft_.hashtags),
                after="#MondayCommute #BeatTheDelay",
                source_comment_id=latest["brand"],
            )
        )

    why = {
        "brand": ("applied", "CTA softened and hashtag updated."),
        "legal": ("applied", "Guarantee and fixed-minutes claim removed."),
        "product": ("in_conflict", "Conflicts with Legal; resolved via compromise wording."),
    }
    statuses = [
        CommentStatus(comment_id=cid, status=why[role][0], why=why[role][1])  # type: ignore[arg-type]
        for role, cid in latest.items()
    ]
    return RefereeResult(
        conflicts=conflicts,
        edits=edits,
        tasks=[t.model_copy() for t in _CANNED_TASKS],
        comment_status=statuses,
        final_caption=final_caption,
        status="ready_to_ship",
    )
