"""Tests for the Slack integration. urlopen is always faked: no real network."""

import json
import urllib.error
import urllib.request
from datetime import timedelta
from typing import Any, Self

import pytest

from app.models import Task
from app.slack import SlackResult, build_blocks, format_elapsed, send_final_post

SECRET_URL = "https://hooks.example.invalid/services/T000/B000/SECRETTOKEN"
IMAGE_URL = "https://cdn.example.invalid/post.png"
ELAPSED = timedelta(hours=1, minutes=50)
TASKS = [Task(owner="Legal", task="Check the claim", due="Today 17:00")]


class FakeUrlopen:
    """Stands in for urllib.request.urlopen: records calls, returns or raises."""

    def __init__(self, status: int = 200, raises: Exception | None = None) -> None:
        self.status = status
        self.raises = raises
        self.calls: list[tuple[urllib.request.Request, float]] = []

    def __call__(self, request: urllib.request.Request, timeout: float) -> Self:
        self.calls.append((request, timeout))
        if self.raises is not None:
            raise self.raises
        return self

    # The fake doubles as the response object used in `with urlopen(...)`.
    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc_info: object) -> None:
        return None


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch) -> FakeUrlopen:
    """A configured webhook and a fake urlopen that succeeds by default."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", SECRET_URL)
    fake = FakeUrlopen()
    monkeypatch.setattr(urllib.request, "urlopen", fake)
    return fake


def send(**kwargs: Any) -> SlackResult:
    return send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED, **kwargs)


def sections(blocks: list[dict[str, Any]]) -> list[str]:
    return [b["text"]["text"] for b in blocks if b["type"] == "section"]


# --- sending ----------------------------------------------------------------


def test_sends_message_to_webhook(fake: FakeUrlopen) -> None:
    assert send() == SlackResult(sent=True, mode="live")

    [(request, timeout)] = fake.calls
    assert request.full_url == SECRET_URL
    assert request.get_method() == "POST"
    assert request.get_header("Content-type") == "application/json"
    assert timeout == 15.0
    payload = json.loads(request.data)
    assert payload["blocks"] == build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)
    assert payload["text"] == "Caption\nTrend → approved: 1h 50m"


def test_custom_timeout_is_passed_to_urlopen(fake: FakeUrlopen) -> None:
    send(timeout_s=2.5)
    assert fake.calls[0][1] == 2.5


def test_demo_mode_sends_nothing(fake: FakeUrlopen) -> None:
    assert send(demo_mode=True) == SlackResult(sent=False, mode="demo")
    assert fake.calls == []


@pytest.mark.parametrize("url", [None, "   ", "http://hooks.example.invalid/x"])
def test_missing_blank_or_http_url_is_not_configured(
    fake: FakeUrlopen, monkeypatch: pytest.MonkeyPatch, url: str | None
) -> None:
    if url is None:
        monkeypatch.delenv("SLACK_WEBHOOK_URL")
    else:
        monkeypatch.setenv("SLACK_WEBHOOK_URL", url)

    result = send()

    assert (result.sent, result.mode) == (False, "not_configured")
    assert fake.calls == []


def test_url_is_stripped_and_read_at_call_time(
    fake: FakeUrlopen, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", f"  {SECRET_URL}\n")
    assert send().mode == "live"
    assert fake.calls[0][0].full_url == SECRET_URL


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(SECRET_URL, code, SECRET_URL, None, None)


@pytest.mark.parametrize(
    ("exception", "error"),
    [
        (http_error(500), "Slack returned HTTP 500"),
        (TimeoutError(SECRET_URL), "Slack request timed out"),
        (urllib.error.URLError(TimeoutError(SECRET_URL)), "Slack request timed out"),
        (urllib.error.URLError(SECRET_URL), "Could not reach Slack"),
        (ConnectionResetError(SECRET_URL), "Could not reach Slack"),
        (ValueError(SECRET_URL), "Could not reach Slack"),
    ],
)
def test_failure_is_reported_without_raising_or_leaking_url(
    fake: FakeUrlopen, exception: Exception, error: str
) -> None:
    fake.raises = exception
    result = send()
    assert result == SlackResult(sent=False, mode="failed", error=error)
    assert "SECRETTOKEN" not in repr(result)


def test_non_200_status_is_failed(fake: FakeUrlopen) -> None:
    fake.status = 204
    assert send() == SlackResult(
        sent=False, mode="failed", error="Slack returned HTTP 204"
    )


# --- message content --------------------------------------------------------


def test_message_has_header_caption_image_tasks_and_elapsed() -> None:
    blocks = build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)

    assert [b["type"] for b in blocks] == [
        "header",
        "section",
        "image",
        "section",
        "section",
    ]
    assert sections(blocks) == [
        "Caption",
        "*Tasks*\n• *Legal*: Check the claim (due: Today 17:00)",
        "Trend → approved: 1h 50m",
    ]
    assert all(b["text"]["verbatim"] for b in blocks if b["type"] == "section")


def test_text_is_escaped_for_slack() -> None:
    tasks = [Task(owner="<!channel>", task="a & b", due="")]
    texts = sections(build_blocks("<@U1> & co", None, tasks, ELAPSED))
    assert texts[0] == "&lt;@U1&gt; &amp; co"
    assert texts[1] == "*Tasks*\n• *&lt;!channel&gt;*: a &amp; b"


def test_newlines_in_task_fields_cannot_fake_another_task() -> None:
    tasks = [Task(owner="Legal", task="ok\n• *CEO*: approve", due="")]
    tasks_text = sections(build_blocks("", None, tasks, ELAPSED))[0]
    assert tasks_text == "*Tasks*\n• *Legal*: ok • *CEO*: approve"


def test_blank_owner_shows_unassigned() -> None:
    tasks = [Task(owner="  ", task="Post it", due="")]
    tasks_text = sections(build_blocks("", None, tasks, ELAPSED))[0]
    assert tasks_text == "*Tasks*\n• *Unassigned*: Post it"


def test_blank_caption_and_no_tasks_leave_only_header_and_elapsed() -> None:
    blocks = build_blocks("  \n", None, [], ELAPSED)
    assert [b["type"] for b in blocks] == ["header", "section"]
    assert sections(blocks) == ["Trend → approved: 1h 50m"]


@pytest.mark.parametrize(
    "url",
    [
        None,
        "data:image/png;base64,AAAA",
        "ftp://x/a.png",
        "https://",
        "https://x.com/a b.png",
    ],
)
def test_image_block_only_for_http_urls(url: str | None) -> None:
    blocks = build_blocks("Caption", url, TASKS, ELAPSED)
    assert "image" not in [b["type"] for b in blocks]


def test_data_url_image_still_sends(fake: FakeUrlopen) -> None:
    result = send_final_post("Caption", "data:image/png;base64,AAAA", TASKS, ELAPSED)
    assert result.mode == "live"


def test_long_sections_are_cut_to_3000_chars() -> None:
    tasks = [Task(owner="Legal", task="t" * 5000, due="")]
    texts = sections(build_blocks("c" * 5000, None, tasks, ELAPSED))
    assert [len(text) for text in texts[:2]] == [3000, 3000]
    assert all(text.endswith("…") for text in texts[:2])


@pytest.mark.parametrize("prefix", range(2994, 3000))
def test_truncation_never_cuts_an_entity_in_half(prefix: int) -> None:
    caption_text = sections(build_blocks("a" * prefix + "&" * 10, None, [], ELAPSED))[0]
    body = caption_text.removesuffix("…")
    assert len(caption_text) <= 3000
    assert body == "a" * prefix + "&amp;" * ((len(body) - prefix) // 5)


@pytest.mark.parametrize(
    ("elapsed", "expected"),
    [
        (timedelta(hours=1, minutes=50, seconds=59), "1h 50m"),
        (timedelta(minutes=45), "45m"),
        (timedelta(minutes=-5), "0m"),
    ],
)
def test_format_elapsed(elapsed: timedelta, expected: str) -> None:
    assert format_elapsed(elapsed) == expected
