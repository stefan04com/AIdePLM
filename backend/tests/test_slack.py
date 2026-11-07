"""Tests for the Slack integration. urlopen is always mocked: no real network."""

import ast
import http.client
import io
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import timedelta
from pathlib import Path
from typing import Any, Self

import pytest

from app import slack
from app.slack import (
    SlackResult,
    SlackTask,
    build_blocks,
    format_elapsed,
    send_final_post,
)

SECRET_URL = "https://hooks.example.invalid/services/T000/B000/SECRETTOKEN"
IMAGE_URL = "https://cdn.example.invalid/post.png"
DATA_URL = "data:image/svg+xml;base64,PHN2Zy8+"
ELAPSED = timedelta(hours=1, minutes=50)
TASKS = [SlackTask(owner="Legal", task="Check the claim", due="Today 17:00")]


class FakeResponse:
    def __init__(self, status: int = 200) -> None:
        self.status = status

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc_info: object) -> None:
        return None


class FakeUrlopen:
    """Records calls; returns a response or raises the configured exception."""

    def __init__(self, status: int = 200, raises: Exception | None = None) -> None:
        self.status = status
        self.raises = raises
        self.calls: list[tuple[urllib.request.Request, float]] = []

    def __call__(
        self, request: urllib.request.Request, *, timeout: float
    ) -> FakeResponse:
        self.calls.append((request, timeout))
        if self.raises is not None:
            raise self.raises
        return FakeResponse(self.status)


def forbid_network(*args: object, **kwargs: object) -> None:
    raise AssertionError("urlopen must not be called here")


@pytest.fixture(autouse=True)
def isolated(monkeypatch: pytest.MonkeyPatch) -> None:
    """Start every test with no webhook configured and no way to reach the network."""
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
    monkeypatch.setattr(urllib.request, "urlopen", forbid_network)


@pytest.fixture
def configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", SECRET_URL)


def install(monkeypatch: pytest.MonkeyPatch, fake: FakeUrlopen) -> FakeUrlopen:
    monkeypatch.setattr(urllib.request, "urlopen", fake)
    return fake


def send() -> SlackResult:
    return send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED)


def blocks_of_type(
    blocks: list[dict[str, Any]], block_type: str
) -> list[dict[str, Any]]:
    return [block for block in blocks if block["type"] == block_type]


def section_texts(blocks: list[dict[str, Any]]) -> list[str]:
    return [block["text"]["text"] for block in blocks_of_type(blocks, "section")]


def assert_entities_intact(text: str) -> None:
    assert "&" not in re.sub(r"&(amp|lt|gt);", "", text)


# --- live send ---------------------------------------------------------------


@pytest.mark.usefixtures("configured")
def test_live_success_posts_expected_request(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install(monkeypatch, FakeUrlopen())

    result = send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED, timeout_s=7.5)

    assert result == SlackResult(sent=True, mode="live", error=None)
    assert len(fake.calls) == 1
    request, timeout = fake.calls[0]
    assert timeout == 7.5
    assert request.full_url == SECRET_URL
    assert request.get_method() == "POST"
    assert request.get_header("Content-type") == "application/json"

    payload = json.loads(request.data)
    assert payload["blocks"] == build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)
    assert payload["text"] == "Caption\nTrend → approved: 1h 50m"
    texts = section_texts(payload["blocks"])
    assert "Caption" in texts
    assert any("*Legal*: Check the claim (due: Today 17:00)" in text for text in texts)
    assert "Trend → approved: 1h 50m" in texts
    assert blocks_of_type(payload["blocks"], "image")[0]["image_url"] == IMAGE_URL


@pytest.mark.usefixtures("configured")
def test_default_timeout_is_15_seconds(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install(monkeypatch, FakeUrlopen())

    send()

    assert fake.calls[0][1] == 15.0


def test_webhook_url_is_read_at_call_time(monkeypatch: pytest.MonkeyPatch) -> None:
    assert send().mode == "not_configured"

    monkeypatch.setenv("SLACK_WEBHOOK_URL", SECRET_URL)
    install(monkeypatch, FakeUrlopen())

    assert send().mode == "live"


def test_surrounding_whitespace_in_url_is_ignored(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", f"  {SECRET_URL}\n")
    fake = install(monkeypatch, FakeUrlopen())

    assert send().mode == "live"
    assert fake.calls[0][0].full_url == SECRET_URL


# --- modes that send nothing -------------------------------------------------


@pytest.mark.usefixtures("configured")
def test_demo_mode_does_not_call_urlopen(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install(monkeypatch, FakeUrlopen())

    result = send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED, demo_mode=True)

    assert result == SlackResult(sent=False, mode="demo", error=None)
    assert fake.calls == []


def test_demo_mode_wins_when_not_configured() -> None:
    assert send_final_post("Caption", None, [], ELAPSED, demo_mode=True).mode == "demo"


def test_missing_url_is_not_configured() -> None:
    result = send()

    assert (result.sent, result.mode) == (False, "not_configured")
    assert result.error


@pytest.mark.parametrize("value", ["", "   ", "\n"])
def test_blank_url_is_not_configured(
    monkeypatch: pytest.MonkeyPatch, value: str
) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", value)

    assert send().mode == "not_configured"


@pytest.mark.parametrize(
    "value",
    [
        "http://hooks.example.invalid/SECRETTOKEN",
        "ftp://hooks.example.invalid/SECRETTOKEN",
        "hooks.example.invalid/SECRETTOKEN",
    ],
)
def test_non_https_url_is_not_configured(
    monkeypatch: pytest.MonkeyPatch, value: str
) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", value)

    result = send()

    assert (result.sent, result.mode) == (False, "not_configured")
    assert "SECRETTOKEN" not in str(result)


# --- failures ----------------------------------------------------------------


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(
        SECRET_URL, code, f"failed {SECRET_URL}", None, io.BytesIO()
    )


FAILURES = [
    pytest.param(TimeoutError(f"timed out {SECRET_URL}"), "timed out", id="timeout"),
    pytest.param(
        urllib.error.URLError(TimeoutError(f"timed out {SECRET_URL}")),
        "timed out",
        id="timeout-during-connect",
    ),
    pytest.param(http_error(500), "HTTP 500", id="http-500"),
    pytest.param(http_error(404), "HTTP 404", id="http-404"),
    pytest.param(
        urllib.error.HTTPError(SECRET_URL, 403, "forbidden", None, None),
        "HTTP 403",
        id="http-error-without-body",
    ),
    pytest.param(
        urllib.error.URLError(f"no route {SECRET_URL}"), "reach", id="url-error"
    ),
    pytest.param(
        ConnectionResetError(f"reset {SECRET_URL}"), "reach", id="connection-reset"
    ),
    pytest.param(
        http.client.InvalidURL(f"bad {SECRET_URL}"), "reach", id="invalid-url"
    ),
    pytest.param(
        http.client.RemoteDisconnected(SECRET_URL), "reach", id="disconnected"
    ),
    pytest.param(ValueError(f"unknown type {SECRET_URL}"), "Invalid", id="value-error"),
]


@pytest.mark.usefixtures("configured")
@pytest.mark.parametrize(("exception", "expected"), FAILURES)
def test_external_failure_is_reported_without_raising(
    monkeypatch: pytest.MonkeyPatch, exception: Exception, expected: str
) -> None:
    install(monkeypatch, FakeUrlopen(raises=exception))

    result = send()

    assert (result.sent, result.mode) == (False, "failed")
    assert result.error is not None
    assert expected in result.error
    assert len(result.error) < 80


@pytest.mark.usefixtures("configured")
@pytest.mark.parametrize("status", [201, 204, 302])
def test_non_200_success_status_is_failed(
    monkeypatch: pytest.MonkeyPatch, status: int
) -> None:
    install(monkeypatch, FakeUrlopen(status=status))

    result = send()

    assert (result.sent, result.mode) == (False, "failed")
    assert result.error == f"Slack returned HTTP {status}"


@pytest.mark.usefixtures("configured")
@pytest.mark.parametrize(("exception", "expected"), FAILURES)
def test_secret_url_absent_from_errors_and_output(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    caplog: pytest.LogCaptureFixture,
    exception: Exception,
    expected: str,
) -> None:
    install(monkeypatch, FakeUrlopen(raises=exception))

    with caplog.at_level("DEBUG"):
        result = send()

    captured = capsys.readouterr()
    for text in (
        str(result.error),
        repr(result),
        caplog.text,
        captured.out,
        captured.err,
    ):
        assert "SECRETTOKEN" not in text


# --- image handling ----------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        DATA_URL,
        "file:///etc/passwd",
        "javascript:alert(1)",
        "ftp://cdn.example.invalid/a.png",
        "https://",
        "http://[broken",
        "https://cdn.example.invalid/a b.png",
        "https://cdn.example.invalid/" + "a" * 3000,
        "",
    ],
)
def test_unusable_image_url_omits_image_block(url: str) -> None:
    assert blocks_of_type(build_blocks("Caption", url, TASKS, ELAPSED), "image") == []


def test_no_image_url_omits_image_block() -> None:
    assert blocks_of_type(build_blocks("Caption", None, TASKS, ELAPSED), "image") == []


@pytest.mark.parametrize("url", [IMAGE_URL, "http://cdn.example.invalid/a.png"])
def test_http_image_url_includes_image_block(url: str) -> None:
    images = blocks_of_type(build_blocks("Caption", url, TASKS, ELAPSED), "image")

    assert len(images) == 1
    assert images[0]["image_url"] == url
    assert images[0]["alt_text"]


@pytest.mark.usefixtures("configured")
def test_data_url_message_still_sends(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install(monkeypatch, FakeUrlopen())

    result = send_final_post("Caption", DATA_URL, TASKS, ELAPSED)

    assert result.mode == "live"
    assert result.sent is True
    body = fake.calls[0][0].data
    assert b"data:image" not in body
    assert section_texts(json.loads(body)["blocks"])[0] == "Caption"


# --- escaping ----------------------------------------------------------------


def test_caption_is_escaped() -> None:
    blocks = build_blocks(
        "A & B <!channel> <@U123> <http://evil.example|click>", None, [], ELAPSED
    )

    assert section_texts(blocks)[0] == (
        "A &amp; B &lt;!channel&gt; &lt;@U123&gt; &lt;http://evil.example|click&gt;"
    )


def test_ampersand_is_escaped_only_once() -> None:
    assert section_texts(build_blocks("&lt;!channel&gt;", None, [], ELAPSED))[0] == (
        "&amp;lt;!channel&amp;gt;"
    )


def test_task_fields_are_escaped() -> None:
    task = SlackTask(owner="<!here>", task="<!channel> & go", due="<@U123>")

    text = section_texts(build_blocks("Caption", None, [task], ELAPSED))[1]

    assert "&lt;!here&gt;" in text
    assert "&lt;!channel&gt; &amp; go" in text
    assert "&lt;@U123&gt;" in text
    assert "<" not in text and ">" not in text


def test_untrusted_sections_are_verbatim_so_bare_mentions_are_not_parsed() -> None:
    blocks = build_blocks("@channel http://evil.example", None, TASKS, ELAPSED)

    for block in blocks_of_type(blocks, "section"):
        assert block["text"]["verbatim"] is True


@pytest.mark.usefixtures("configured")
def test_fallback_text_is_escaped(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install(monkeypatch, FakeUrlopen())

    send_final_post("<!channel> & <http://evil.example|x>", None, [], ELAPSED)

    assert json.loads(fake.calls[0][0].data)["text"].startswith(
        "&lt;!channel&gt; &amp; &lt;http://evil.example|x&gt;\n"
    )


def test_newline_in_task_field_cannot_fake_another_task() -> None:
    task = SlackTask(owner="Legal", task="Real\n• *CEO*: Fake", due="Today")

    text = section_texts(build_blocks("Caption", None, [task], ELAPSED))[1]

    assert text == "*Tasks*\n• *Legal*: Real • *CEO*: Fake (due: Today)"


# --- limits ------------------------------------------------------------------


def test_short_caption_is_not_truncated() -> None:
    caption = "a" * 3000

    assert section_texts(build_blocks(caption, None, [], ELAPSED))[0] == caption


def test_long_caption_is_truncated_to_section_limit() -> None:
    text = section_texts(build_blocks("a" * 5000, None, [], ELAPSED))[0]

    assert len(text) == 3000
    assert text.endswith("…")


@pytest.mark.parametrize("char", ["&", "<", ">"])
@pytest.mark.parametrize("prefix", range(2985, 3000))
def test_truncation_never_breaks_an_entity(char: str, prefix: int) -> None:
    # Moving the prefix length lands the cut at every offset inside an entity.
    text = section_texts(build_blocks("a" * prefix + char * 50, None, [], ELAPSED))[0]

    assert len(text) <= 3000
    assert text.endswith("…")
    assert_entities_intact(text)


def test_caption_that_only_exceeds_limit_once_escaped_is_truncated() -> None:
    text = section_texts(build_blocks("<" * 1000, None, [], ELAPSED))[0]

    assert len(text) <= 3000
    assert_entities_intact(text)


@pytest.mark.usefixtures("configured")
def test_fallback_text_is_truncated_safely(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install(monkeypatch, FakeUrlopen())

    send_final_post("&" * 5000, None, [], ELAPSED)

    text = json.loads(fake.calls[0][0].data)["text"]
    assert len(text) < 3100
    assert_entities_intact(text)


def test_huge_single_task_fields_fit_section_limit() -> None:
    task = SlackTask(owner="<" * 5000, task="&" * 5000, due=">" * 5000)

    for text in section_texts(build_blocks("Caption", None, [task], ELAPSED)):
        assert len(text) <= 3000
        assert_entities_intact(text)


@pytest.mark.parametrize("image_url", [IMAGE_URL, None])
def test_many_huge_tasks_respect_block_and_section_limits(
    image_url: str | None,
) -> None:
    tasks = [
        SlackTask(owner=f"Owner{i}", task="x" * 2400, due="Today") for i in range(200)
    ]

    blocks = build_blocks("Caption", image_url, tasks, ELAPSED)

    assert len(blocks) == 50
    texts = section_texts(blocks)
    assert all(len(text) <= 3000 for text in texts)
    assert texts[-1] == "Trend → approved: 1h 50m"

    summary = re.fullmatch(r"…and (\d+) more tasks", texts[-2])
    assert summary is not None
    shown = sum(text.count("• *Owner") for text in texts)
    assert shown + int(summary.group(1)) == len(tasks)


def test_many_short_tasks_are_chunked_without_loss_when_they_fit() -> None:
    tasks = [
        SlackTask(owner=f"Owner{i}", task="x" * 200, due="Today") for i in range(100)
    ]

    blocks = build_blocks("Caption", None, tasks, ELAPSED)
    texts = section_texts(blocks)

    assert len(blocks) <= 50
    assert all(len(text) <= 3000 for text in texts)
    assert sum(text.count("• *Owner") for text in texts) == 100


# --- duration ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("elapsed", "expected"),
    [
        (timedelta(hours=1, minutes=50), "1h 50m"),
        (timedelta(minutes=45), "45m"),
        (timedelta(minutes=59, seconds=59), "59m"),
        (timedelta(hours=1), "1h 0m"),
        (timedelta(hours=26, minutes=5), "26h 5m"),
        (timedelta(seconds=30), "0m"),
        (timedelta(0), "0m"),
        (timedelta(minutes=-5), "0m"),
    ],
)
def test_format_elapsed(elapsed: timedelta, expected: str) -> None:
    assert format_elapsed(elapsed) == expected


def test_elapsed_line_is_in_message() -> None:
    texts = section_texts(build_blocks("Caption", None, [], timedelta(minutes=45)))

    assert texts[-1] == "Trend → approved: 45m"


# --- message shape -----------------------------------------------------------


def test_empty_tasks_omits_tasks_section() -> None:
    blocks = build_blocks("Caption", None, [], ELAPSED)

    assert section_texts(blocks) == ["Caption", "Trend → approved: 1h 50m"]


@pytest.mark.parametrize("caption", ["", "   \n"])
def test_blank_caption_omits_section_slack_would_reject(caption: str) -> None:
    assert section_texts(build_blocks(caption, None, [], ELAPSED)) == [
        "Trend → approved: 1h 50m"
    ]


def test_blank_task_fields_stay_readable() -> None:
    text = section_texts(
        build_blocks("Caption", None, [SlackTask(" ", "Do it", "")], ELAPSED)
    )[1]

    assert text == "*Tasks*\n• *Unassigned*: Do it"


def test_message_order_matches_spec() -> None:
    types = [
        block["type"] for block in build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)
    ]

    assert types == ["header", "section", "image", "section", "section"]


def test_build_blocks_is_pure(monkeypatch: pytest.MonkeyPatch) -> None:
    first = build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)
    monkeypatch.setenv("SLACK_WEBHOOK_URL", SECRET_URL)

    assert build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED) == first
    assert SECRET_URL not in json.dumps(first)


def test_dataclasses_are_frozen() -> None:
    with pytest.raises(AttributeError):
        TASKS[0].owner = "x"  # type: ignore[misc]
    with pytest.raises(AttributeError):
        SlackResult(sent=True, mode="live").sent = False  # type: ignore[misc]


def test_module_imports_only_the_standard_library() -> None:
    tree = ast.parse(Path(slack.__file__).read_text(encoding="utf-8"))
    roots: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            assert node.level == 0
            roots.add(str(node.module).split(".")[0])

    assert roots <= set(sys.stdlib_module_names)
