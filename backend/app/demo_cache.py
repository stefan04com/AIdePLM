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


# --- canned defaults: the Boabe cozy-autumn scenario (docs/demo-scenario.md) ------------------
# Copied from frontend/src/mocks so demo mode, the mocks and the fixture tell the same story.

CANNED_FIT = FitResult(
    fits=True,
    score=91,
    reason="Boabe's core moment is the slow cup in a warm corner; the trend is wholesome, "
    "local-friendly and touches no sensitive topic.",
)

CANNED_DRAFT = DraftContent(
    brief="Join the cozy autumn setup trend with the new Pumpkin & Cinnamon Latte as the warm "
    "thing in the mug.",
    caption="Meet our new Pumpkin & Cinnamon Latte: no added sugar and the healthiest latte in "
    "town. Order now in the Boabe app.",
    visual_prompt="Close-up of a Pumpkin & Cinnamon Latte in a ceramic cup, centred on a wooden "
    "desk, latte art, autumn leaves, warm window light",
    hashtags=["#CozyAutumn", "#PumpkinCinnamonLatte", "#Boabe"],
)

CANNED_PERSONAS = [
    Persona(
        id="student_night_owl",
        name="Student night owl",
        segment="20-28, studies or works on a laptop for hours",
        cares_about=["wifi and seats", "a calm corner", "honest, low-key posts"],
        pet_peeves=["the weekend laptop ban", "posts that look like ads"],
        sample_quotes=[
            "Nice cosy café in the heart of Bucharest. Perfect for chill or work.",
            "Also you can work with laptop or just chat.",
        ],
    ),
    Persona(
        id="busy_parent",
        name="Busy parent",
        segment="30-45, orders ahead, short on time",
        cares_about=["ordering ahead in the app", "no queues", "clear prices"],
        pet_peeves=["wrong or late orders", "prices shown too late"],
        sample_quotes=[
            "I like to order my coffees in advance and collect. So very convenient for me.",
            "Their app is so easy to manage and is very convenient in tight situations.",
        ],
    ),
    Persona(
        id="coffee_purist",
        name="Coffee purist",
        segment="25-45, cares about beans, origin and brewing",
        cares_about=["origin", "roast and extraction", "baristas who explain"],
        pet_peeves=["over-roasted coffee", "old crop", "marketing hype"],
        sample_quotes=[
            "Nice place, kind staff, good extraction in Hario V60 and espresso.",
            "Not the best coffee (most probably over roasted).",
        ],
    ),
]

_CANNED_REACTIONS = [
    (
        "The cozy corner is exactly my vibe, but 'healthiest latte in town' turns it into an "
        "ad. Show the setup, not the sales pitch.",
        0.2,
        False,
    ),
    (
        "Nice to know I can order it ahead in the app. A seasonal drink for the school-run "
        "morning sounds good.",
        0.6,
        True,
    ),
    (
        "'Healthiest' tells me nothing. Real pumpkin and Ceylon cinnamon with your house "
        "espresso would.",
        -0.3,
        False,
    ),
]

_CANNED_TASKS = [
    Task(
        owner="Product",
        task="Send the 'no added sugar' documentation to Legal before using the claim",
        due="this week",
    ),
    Task(owner="Legal", task="Sign off the final caption", due="today 15:00"),
]

FINAL_CAPTION = (
    "Grey week, warm corner. Our Pumpkin & Cinnamon Latte, with real pumpkin and Ceylon "
    "cinnamon, keeps us company. Pull up a chair."
)
FINAL_VISUAL_PROMPT = (
    "Cozy desk by a rainy window, wool blanket, candle and open laptop, a Pumpkin & Cinnamon "
    "Latte steaming in a ceramic cup, warm light"
)
FINAL_HASHTAGS = "#CozyAutumn #AutumnCorner #Boabe"


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


def _heaviest_per_role(comments: list[Comment]) -> dict[str, str]:
    """Comment id that speaks for each role: highest weight wins, the newer one on a tie."""
    best: dict[str, Comment] = {}
    for c in comments:  # chronological order, so ">=" lets the newer comment win a tie
        if c.role not in best or c.weight >= best[c.role].weight:
            best[c.role] = c
    return {role: c.id for role, c in best.items()}


def referee(comments: list[Comment], draft_: Draft, personas_: list[Persona]) -> RefereeResult:
    """Canned referee result built from the run's real comment ids / persona ids / draft."""
    latest = _heaviest_per_role(comments)  # docs/comment-weighting.md
    labels = {"brand": "Brand", "legal": "Legal", "product": "Product"}

    def human(role: str) -> ConflictParty:
        return ConflictParty(kind="human", id=role, label=labels[role])

    conflicts: list[Conflict] = []
    if "legal" in latest and "product" in latest:
        conflicts.append(
            Conflict(
                id="conf_1",
                between=[human("legal"), human("product")],
                summary="Product wants 'no added sugar' as the main selling point; Legal has no "
                "documentation for it and blocks it.",
                positions={
                    "legal": "No 'no added sugar' and no 'healthiest' until the claim is "
                    "documented.",
                    "product": "'No added sugar' is the launch's main selling point and must "
                    "stay.",
                },
                compromise="Drop the sugar and health claims now; name the real ingredients "
                "instead (pumpkin purée, Ceylon cinnamon). Product sends the sugar "
                "documentation to Legal for a later post.",
            )
        )
    if "brand" in latest and "product" in latest and personas_:
        p = personas_[0]  # the first persona stands for the "moment first" audience
        conflicts.append(
            Conflict(
                id="conf_2",
                between=[
                    human("brand"),
                    ConflictParty(kind="persona", id=p.id, label=p.name),
                    human("product"),
                ],
                summary=f"Brand and {p.name} want the cozy moment first; Product wants the "
                "latte as the hero.",
                positions={
                    "brand": "Lead with the moment, latte in the background, soft CTA.",
                    p.id: "Show the setup; a sales pitch kills it.",
                    "product": "The new latte must be the hero of the visual.",
                },
                compromise="The cozy corner leads, and the latte is the one warm thing in it: "
                "named once in the caption and in focus on the desk, but not a product shot.",
            )
        )

    edits: list[Edit] = []
    if "legal" in latest:
        edits.append(
            Edit(
                target="caption",
                before=draft_.caption,
                after=FINAL_CAPTION,
                source_comment_id=latest["legal"],
            )
        )
    if "brand" in latest:
        edits.append(
            Edit(
                target="visual_prompt",
                before=draft_.visual_prompt,
                after=FINAL_VISUAL_PROMPT,
                source_comment_id=latest["brand"],
            )
        )
        edits.append(
            Edit(
                target="hashtags",
                before=" ".join(draft_.hashtags),
                after=FINAL_HASHTAGS,
                source_comment_id=latest["brand"],
            )
        )

    why = {
        "brand": ("applied", "Moment leads, latte stays in the scene, soft CTA."),
        "legal": ("applied", "Sugar and health claims removed."),
        "product": (
            "in_conflict",
            "Sugar claim waits for documentation; the latte is still named and in focus.",
        ),
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
        final_caption=FINAL_CAPTION,
        status="ready_to_ship",
    )
