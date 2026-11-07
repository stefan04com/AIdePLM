import pytest
from fastapi.testclient import TestClient

from app import demo_cache, store
from app.llm import usage
from app.main import app


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    """Fresh store, demo mode on, all files in tmp_path, no real LLM key or Slack webhook."""
    secrets = ("LLM_API_KEY", "AWS_BEARER_TOKEN_BEDROCK", "SLACK_WEBHOOK_URL")
    for var in (*secrets, "LLM_MODEL", "DEMO_MODE", "LIVE_TRENDS"):
        monkeypatch.delenv(var, raising=False)
    store.reset()
    store.configure(tmp_path / "runs.json")
    usage.configure(tmp_path / "usage.jsonl")
    demo_cache.configure(tmp_path / "last_good.json")
    store.set_demo_mode(True)
    yield
    store.reset()


@pytest.fixture
def client():
    with TestClient(app) as c:  # runs lifespan; background tasks finish before post() returns
        yield c
