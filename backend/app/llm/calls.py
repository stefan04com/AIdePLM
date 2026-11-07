"""The LLM calls: five per run, plus optional regenerate and trend score.

Each: untrusted text in tags -> validated output -> fallback.
"""

import re

from .. import demo_cache, store
from ..models import (
    Comment,
    Draft,
    FitResult,
    Persona,
    PersonaReaction,
    RefereeResult,
    Trend,
    TrendScore,
)
from .client import call_structured, wrap
from .schemas import DraftContent, PersonasOut, ReactionsOut, RegenerateContent

HUMAN_ROLES = {"brand", "legal", "product"}


def _trend_block(trend: Trend) -> str:
    return wrap("trend", f"{trend.title}\n\n{trend.summary}")


def check_fit(trend: Trend, brand: str, run_id: str) -> FitResult:  # call #1
    return call_structured(
        call="fit",
        user=f"{_trend_block(trend)}\n\n{wrap('brand', brand)}",
        model_cls=FitResult,
        fallback=lambda: demo_cache.fit(trend),
        run_id=run_id,
        on_success=lambda r: (
            demo_cache.remember("fit", r) if r.fits else None
        ),  # last-good = a "yes"
    )


def write_draft(trend: Trend, brand: str, run_id: str) -> DraftContent:  # call #2
    return call_structured(
        call="draft",
        user=f"{_trend_block(trend)}\n\n{wrap('brand', brand)}",
        model_cls=DraftContent,
        fallback=demo_cache.draft,
        run_id=run_id,
        on_success=lambda r: demo_cache.remember("draft", r),
    )


def build_personas(reviews: str, brand: str) -> list[Persona]:  # call #3, once
    def check(out: PersonasOut) -> None:
        ids = [p.id for p in out.personas]
        if len(set(ids)) != len(ids) or HUMAN_ROLES & set(ids):
            raise ValueError("persona ids must be unique and not brand/legal/product")

    out = call_structured(
        call="personas",
        user=f"{wrap('brand', brand)}\n\n{wrap('reviews', reviews)}",
        model_cls=PersonasOut,
        fallback=lambda: PersonasOut(personas=demo_cache.personas()),
        check=check,
        on_success=lambda r: demo_cache.remember("personas", r),
    )
    return out.personas


def react(draft: Draft, personas: list[Persona], run_id: str) -> list[PersonaReaction]:  # #4
    post = wrap("post", f"{draft.caption}\n{' '.join(draft.hashtags)}")
    people = "\n".join(
        wrap(
            "persona",
            f"{p.name} ({p.segment})\ncares about: {'; '.join(p.cares_about)}\n"
            f"pet peeves: {'; '.join(p.pet_peeves)}\nquotes: {' | '.join(p.sample_quotes)}",
            id=p.id,
        )
        for p in personas
    )
    ids = {p.id for p in personas}

    def check(out: ReactionsOut) -> None:
        if {r.persona_id for r in out.reactions} != ids or len(out.reactions) != len(ids):
            raise ValueError(f"need exactly one reaction per persona id {sorted(ids)}")

    out = call_structured(
        call="reactions",
        user=f"{post}\n\n{people}",
        model_cls=ReactionsOut,
        fallback=lambda: ReactionsOut(reactions=demo_cache.reactions(personas)),
        run_id=run_id,
        check=check,
    )
    return out.reactions


def _comment_block(c: Comment) -> str:
    """<comment> with its weight (docs/comment-weighting.md), so the referee can rank feedback."""
    attrs = {
        "id": c.id,
        "role": c.role,
        "weight": f"{c.weight:.2f}",
        "verified": "yes" if c.industry_verified else "no",
    }
    if c.author_title:
        attrs["author_title"] = c.author_title
    return wrap("comment", c.text, **attrs)


def referee(  # call #5
    draft: Draft,
    comments: list[Comment],
    reactions: list[PersonaReaction],
    personas: list[Persona],
    brand: str,
    run_id: str,
) -> RefereeResult:
    by_id = {p.id: p for p in personas}
    post = wrap(
        "post",
        f"caption: {draft.caption}\nhashtags: {' '.join(draft.hashtags)}\n"
        f"visual_prompt: {draft.visual_prompt}",
    )
    heaviest_first = sorted(comments, key=lambda c: c.weight, reverse=True)
    human = "\n".join(_comment_block(c) for c in heaviest_first)
    personas_xml = "\n".join(
        wrap(
            "reaction",
            f"{r.reaction}\n(sentiment {r.sentiment:+.1f}, "
            f"{'would' if r.would_engage else 'would not'} engage)",
            persona_id=r.persona_id,
            persona=by_id[r.persona_id].name if r.persona_id in by_id else r.persona_id,
        )
        for r in reactions
    )
    comment_ids = {c.id for c in comments}
    source_ids = comment_ids | set(by_id)

    def check(out: RefereeResult) -> None:
        if len({c.id for c in out.conflicts}) != len(out.conflicts):
            raise ValueError("duplicate conflict ids")
        for c in out.conflicts:
            party_ids = {p.id for p in c.between}
            for p in c.between:
                valid = HUMAN_ROLES if p.kind == "human" else set(by_id)
                if p.id not in valid:
                    raise ValueError(f"unknown {p.kind} party id {p.id!r}")
            if not set(c.positions) <= party_ids:
                raise ValueError(f"conflict {c.id}: positions keys must be party ids")
        for s in out.comment_status:
            if s.comment_id not in comment_ids:
                raise ValueError(f"unknown comment_id {s.comment_id!r}")
        for e in out.edits:
            if e.source_comment_id not in source_ids:
                raise ValueError(f"unknown source_comment_id {e.source_comment_id!r}")

    return call_structured(
        call="referee",
        user="\n\n".join([wrap("brand", brand), post, human, personas_xml]),
        model_cls=RefereeResult,
        fallback=lambda: demo_cache.referee(comments, draft, personas),
        run_id=run_id,
        check=check,
    )


def regenerate(draft: Draft, edited_caption: str, instruction: str, brand: str, run_id: str):
    """Call #6 (optional, team decision 2026-11-07): rewrite the caption the person edited."""
    post = wrap("post", f"caption: {draft.caption}\nhashtags: {' '.join(draft.hashtags)}")
    return call_structured(
        call="regenerate",
        user="\n\n".join(
            [
                wrap("brand", brand),
                post,
                wrap("edited_caption", edited_caption),
                wrap("instruction", instruction),
            ]
        ),
        model_cls=RegenerateContent,
        fallback=lambda: demo_cache.regenerate(edited_caption, draft),
        run_id=run_id,
        check=lambda out: _need(out.caption.strip(), "caption must not be empty"),
    )


def _need(value: object, message: str) -> None:
    if not value:
        raise ValueError(message)


def _popularity_rules() -> str:
    """The one-line rules (### 1.x headings) of docs/what-makes-a-post-popular.md."""
    try:
        text = (store.ROOT / "docs" / "what-makes-a-post-popular.md").read_text()
    except OSError:
        return ""
    return "\n".join(re.findall(r"^### 1\.\d+ .+$", text, re.MULTILINE))


def score_trend(words: str, hashtags: list[str]) -> TrendScore:  # call #7 (optional)
    trends = "\n".join(wrap("trend", f"{t.title}\n{t.summary}") for t in demo_cache.saved_trends())
    post = wrap("post", f"words: {words}\nhashtags: {' '.join(hashtags)}")
    return call_structured(
        call="trend_score",
        user="\n\n".join([post, trends, wrap("rules", _popularity_rules())]),
        model_cls=TrendScore,
        fallback=lambda: demo_cache.trend_score(words, hashtags),
    )
