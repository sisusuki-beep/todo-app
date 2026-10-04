import os
import tempfile
import uuid

# app を import する前にテスト用DBとシークレットを指定する。
# 既定は一時SQLite。PostgreSQLで試すときは TEST_DATABASE_URL を指定（空のテスト用DBを使うこと）
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-0123456789"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

PASSWORD = "abcd1234"


def register(c: TestClient, email: str | None = None, password: str = PASSWORD):
    email = email or f"{uuid.uuid4().hex[:8]}@example.com"
    return c.post("/api/auth/register", json={"email": email, "password": password})


@pytest.fixture()
def anon():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client():
    """テストごとに新規ユーザーを登録し、認証済みのクライアントを返す。"""
    with TestClient(app) as c:
        token = register(c).json()["access_token"]
        c.headers["Authorization"] = f"Bearer {token}"
        yield c


@pytest.fixture()
def other_client():
    """`client` とは別ユーザーのクライアント（データ分離の検証用）。"""
    with TestClient(app) as c:
        token = register(c).json()["access_token"]
        c.headers["Authorization"] = f"Bearer {token}"
        yield c
