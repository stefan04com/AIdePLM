"""The only place that talks to the LLM provider.

call_structured(): build prompt -> provider -> validate -> retry once -> last-good/canned fallback.
Untrusted text must be passed through wrap() so it lands inside delimited tags.
"""

import json
import logging
import os
import re
import time
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from .. import store
from . import usage

log = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent / "prompts"
TIMEOUT_S = 15.0
MAX_TOKENS = 2048
DEFAULT_REGION = "us-east-1"  # Bedrock region when AWS_REGION is not set
DEMO_MODEL = "demo-cache"

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    """Provider unreachable, timed out, or not configured."""


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text()


def wrap(tag: str, text: str, **attrs: str) -> str:
    """Wrap untrusted text in <tag>; angle brackets are escaped so it cannot close the tag."""
    safe = text.replace("<", "&lt;").replace(">", "&gt;")
    attr_str = "".join(f' {k}="{re.sub(r"[^A-Za-z0-9_ .:-]", "", v)}"' for k, v in attrs.items())
    return f"<{tag}{attr_str}>\n{safe}\n</{tag}>"


def _provider_name() -> str:
    """LLM_PROVIDER = "bedrock" | "anthropic"; default: bedrock if a Bedrock token is present."""
    explicit = os.environ.get("LLM_PROVIDER", "").strip().lower()
    if explicit:
        return explicit
    return "bedrock" if os.environ.get("AWS_BEARER_TOKEN_BEDROCK") else "anthropic"


def _make_client():
    import anthropic

    if _provider_name() == "bedrock":
        # The SDK reads AWS_BEARER_TOKEN_BEDROCK itself; the token is never stored in files.
        if not os.environ.get("AWS_BEARER_TOKEN_BEDROCK", "").strip():
            raise LLMError("AWS_BEARER_TOKEN_BEDROCK not set")
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
        return anthropic.AnthropicBedrock(
            aws_region=region or DEFAULT_REGION, timeout=TIMEOUT_S, max_retries=0
        )
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    if not api_key:
        raise LLMError("LLM_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key, timeout=TIMEOUT_S, max_retries=0)


def _provider_complete(system: str, user: str) -> tuple[str, int, int]:
    """One provider request -> (text, input_tokens, output_tokens). Swap provider here only."""
    model = os.environ.get("LLM_MODEL", "").strip()
    if not model:
        raise LLMError("LLM_MODEL not set")
    try:
        msg = _make_client().messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
        return text, msg.usage.input_tokens, msg.usage.output_tokens
    except LLMError:
        raise
    except Exception as exc:  # noqa: BLE001 - any provider failure means "use the fallback"
        raise LLMError(f"{type(exc).__name__}: {exc}") from exc


def _extract_json(text: str) -> object:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in response")
    return json.loads(text[start : end + 1])


def _live_in_demo(call: str) -> bool:
    """LIVE_IN_DEMO=referee,reactions: these calls hit the real LLM even in demo mode.

    Needs a configured LLM; any failure still ends in the canned fallback, so the demo is safe.
    """
    names = os.environ.get("LIVE_IN_DEMO", "").replace(" ", "").lower().split(",")
    return call in names and bool(os.environ.get("LLM_MODEL", "").strip())


def call_structured(
    *,
    call: str,
    user: str,
    model_cls: type[T],
    fallback: Callable[[], T],
    run_id: str | None = None,
    check: Callable[[T], None] | None = None,
    on_success: Callable[[T], None] | None = None,
) -> T:
    """Run one validated LLM call. Never raises: ends in `fallback()` if everything fails.

    `check` raises ValueError for semantic errors (e.g. unknown ids); treated like a schema error.
    """
    if store.demo_mode() and not _live_in_demo(call):
        usage.log_call(
            run_id=run_id,
            call=call,
            model=DEMO_MODEL,
            input_tokens=0,
            output_tokens=0,
            latency_ms=0,
        )
        return fallback()

    system = load_prompt(call)
    model = os.environ.get("LLM_MODEL", "").strip() or "unknown"
    prompt = user
    for attempt in (1, 2):
        started = time.monotonic()
        try:
            text, tokens_in, tokens_out = _provider_complete(system, prompt)
        except LLMError as exc:
            log.warning("llm call %s failed: %s", call, exc)
            break  # provider problems are not fixed by a retry within the 15s budget
        usage.log_call(
            run_id=run_id,
            call=call,
            model=model,
            input_tokens=tokens_in,
            output_tokens=tokens_out,
            latency_ms=int((time.monotonic() - started) * 1000),
        )
        try:
            result = model_cls.model_validate(_extract_json(text))
            if check:
                check(result)
        except (ValueError, ValidationError) as exc:
            log.warning("llm call %s invalid (attempt %d): %s", call, attempt, exc)
            prompt = (
                f"{user}\n\nYour previous answer was invalid: {str(exc)[:500]}\n"
                "Return ONLY the corrected JSON object."
            )
            continue
        if on_success:
            on_success(result)
        return result
    if run_id:
        store.mark_fallback(run_id, call)
    return fallback()
