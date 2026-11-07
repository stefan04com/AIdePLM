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
    Trend,
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


# --- canned defaults: the Boabe cozy-autumn demo (docs/demo-scenario.md), from a live run ---
# Same story as data/demo_comments.json: Legal vs Product on "no added sugar", Brand vs Product.

CANNED_FIT = FitResult(
    fits=True,
    score=88,
    reason="The cozy work-from-anywhere trend maps onto Boabe's core moment: the quiet corner, "
    "the warm cup, the grey Bucharest day. Its honest, low-key tone matches the calm voice.",
)

CANNED_DRAFT = DraftContent(
    brief="Join the cozy-corner thread with a grey Bucharest Tuesday and the new Pumpkin & "
    "Cinnamon Latte as part of the scene. It works because the trend rewards honest moments, "
    "not ads.",
    caption="Grey Tuesday, one corner, the Pumpkin & Cinnamon Latte still warm. Bucharest does "
    "autumn slowly when you let it. Order ahead in the app.",
    visual_prompt="A quiet café corner by a rain-streaked window on a grey autumn afternoon: "
    "a ceramic cup of pumpkin and cinnamon latte with steam, an open laptop, a wool blanket, "
    "warm window light, wood table, no people, no text",
    hashtags=["#CozySetup", "#BucharestAutumn"],
)

CANNED_PERSONAS = [
    Persona(
        id="remote_worker_regular",
        name="Laptop Regular",
        segment="Remote workers and students who use the café as a workspace for hours",
        cares_about=["a calm seat", "wifi and sockets", "being welcome to stay"],
        pet_peeves=["laptop bans", "noise", "being rushed out"],
        sample_quotes=["Perfect for chill or work. The coffees and food are very good."],
    ),
    Persona(
        id="curious_coffee_enthusiast",
        name="Origin Seeker",
        segment="Coffee-curious locals and visitors who care about beans, brewing and roast",
        cares_about=["single origin", "brewing method", "baristas who explain"],
        pet_peeves=["gimmicky flavoured drinks", "old crop beans"],
        sample_quotes=[
            "The baristas are friendly and helpful, explaining the coffee origins, the best "
            "vegetable milk combination for that particular origin, and so on."
        ],
    ),
    Persona(
        id="on_the_go_commuter",
        name="App-First Commuter",
        segment="Busy commuters who order ahead to skip the queue",
        cares_about=["speed", "ordering ahead", "orders that are right"],
        pet_peeves=["app bugs", "unclear prices", "waiting in line"],
        sample_quotes=[
            "Their app is so easy to manage and is very convenient in tight situations."
        ],
    ),
]

_CANNED_REACTIONS = [
    (
        "That corner shot speaks to my soul. A grey Tuesday with a warm latte is my whole "
        "personality from October to December.",
        0.8,
        True,
    ),
    (
        "The atmosphere looks cosy, but 'Pumpkin & Cinnamon Latte' tells me nothing about the "
        "origin or the roast behind it.",
        -0.1,
        False,
    ),
    (
        "The 'order ahead in the app' nudge is exactly what I need. I'll set up my Tuesday "
        "pick-up right now.",
        0.8,
        True,
    ),
]

_CANNED_TASKS = [
    Task(owner="Legal", task="Sign off the revised caption", due="today 15:00"),
    Task(
        owner="Product",
        task="Send Legal the documentation for 'no added sugar' before using it in a later post",
        due="this week",
    ),
]


REJECTED_TREND_ID = "trend_espresso_challenge"
CANNED_REJECTION = FitResult(
    fits=False,
    score=9,
    reason="Health-risk dare and a pile-on tone clash with Boabe's calm voice and "
    "no-health-claims rule.",
)


def fit(trend: Trend | None = None) -> FitResult:
    if trend is not None and trend.id == REJECTED_TREND_ID:
        return CANNED_REJECTION.model_copy()
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
    """Canned referee result built from the run's real comment ids / persona ids / caption."""
    latest = _heaviest_per_role(comments)  # docs/comment-weighting.md
    labels = {"brand": "Brand", "legal": "Legal", "product": "Product"}

    def human(role: str) -> ConflictParty:
        return ConflictParty(kind="human", id=role, label=labels[role])

    conflicts: list[Conflict] = []
    if "legal" in latest and "product" in latest:
        conflicts.append(
            Conflict(
                id="conf_1",
                between=[human("product"), human("legal")],
                summary="Product wants 'no added sugar' in the caption; Legal blocks it because "
                "there is no documentation for the claim.",
                positions={
                    "product": "'No added sugar' is the latte's main selling point.",
                    "legal": "An undocumented nutrition claim can't be published.",
                },
                compromise="Sell the latte on what we can state (real pumpkin, Ceylon "
                "cinnamon) and use 'no added sugar' once Legal has the documentation.",
            )
        )
    if "brand" in latest and "product" in latest:
        conflicts.append(
            Conflict(
                id="conf_2",
                between=[human("brand"), human("product")],
                summary="Brand wants the moment to lead; Product wants the drink as the hero.",
                positions={
                    "brand": "Lead with the cozy moment, latte in the background, soft CTA.",
                    "product": "Make the Pumpkin & Cinnamon Latte the hero of copy and visual.",
                },
                compromise="Keep the moment first and name the latte once with its real "
                "ingredients; soft call to action.",
            )
        )

    final_caption = (
        "Grey Tuesday. A Pumpkin & Cinnamon Latte, real pumpkin and Ceylon cinnamon, still warm "
        "in the corner. Bucharest does autumn slowly when you let it. Order ahead in the app."
    )
    edits: list[Edit] = []
    if "legal" in latest or "product" in latest:
        edits.append(
            Edit(
                target="caption",
                before=draft_.caption,
                after=final_caption,
                source_comment_id=latest.get("product") or latest["legal"],
            )
        )

    why = {
        "brand": ("applied", "The moment leads and the call to action stays soft."),
        "legal": ("applied", "No sugar, health or superlative claim in the caption."),
        "product": ("in_conflict", "Latte named with its real ingredients; sugar claim on hold."),
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
