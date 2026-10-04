import pytest

from conftest import PASSWORD, register


def test_register_returns_token_and_creates_default_tab(anon):
    r = register(anon, "New.User@Example.com")
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "new.user@example.com"  # 小文字に正規化
    assert "password" not in str(body)
    tabs = anon.get("/api/tabs", headers={"Authorization": f"Bearer {body['access_token']}"}).json()
    assert len(tabs) == 1


@pytest.mark.parametrize(
    "password",
    [
        "abc1234",  # 7文字
        "abcdefgh",  # 数字なし
        "12345678",  # 英字なし
        "Abcd1234",  # 大文字
        "abcd-123",  # 記号
        "abcd 1234",  # 空白
        "あいうえお1234",  # 全角
        "a1" * 37,  # 74文字（上限超過）
    ],
)
def test_register_rejects_weak_passwords(anon, password):
    assert register(anon, password=password).status_code == 422


def test_register_accepts_boundary_passwords(anon):
    assert register(anon, password="abcdefg1").status_code == 201  # ちょうど8文字
    assert register(anon, password=("a1" * 36)).status_code == 201  # 72文字


def test_register_rejects_bad_email(anon):
    assert register(anon, "not-an-email").status_code == 422


def test_duplicate_email_case_insensitive(anon):
    assert register(anon, "dup@example.com").status_code == 201
    assert register(anon, "DUP@example.com").status_code == 409


def test_login(anon):
    register(anon, "login@example.com")
    ok = anon.post("/api/auth/login", json={"email": "Login@example.com", "password": PASSWORD})
    assert ok.status_code == 200
    token = ok.json()["access_token"]
    me = anon.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "login@example.com"

    wrong = anon.post("/api/auth/login", json={"email": "login@example.com", "password": "wrong1234"})
    unknown = anon.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()  # ユーザーの有無を区別しない


def test_password_is_stored_hashed(anon):
    from sqlalchemy import select

    from app import models
    from app.database import SessionLocal

    register(anon, "hash@example.com")
    with SessionLocal() as db:
        user = db.scalar(select(models.User).where(models.User.email == "hash@example.com"))
    assert user.password_hash != PASSWORD and user.password_hash.startswith("$2")


@pytest.mark.parametrize(
    "method,path",
    [("get", "/api/tabs"), ("post", "/api/tabs"), ("get", "/api/tasks?q=a"), ("get", "/api/auth/me")],
)
def test_endpoints_require_auth(anon, method, path):
    assert getattr(anon, method)(path).status_code == 401


def test_invalid_token_rejected(anon):
    r = anon.get("/api/tabs", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_data_is_isolated_between_users(client, other_client):
    tab = client.get("/api/tabs").json()[0]
    task = client.post("/api/tasks", json={"tab_id": tab["id"], "title": "secret"}).json()

    # 他ユーザーからは存在しないものとして扱われる
    assert other_client.get(f"/api/tasks/{task['id']}").status_code == 404
    assert other_client.put(f"/api/tasks/{task['id']}", json={"title": "x"}).status_code == 404
    assert other_client.patch(f"/api/tasks/{task['id']}/toggle").status_code == 404
    assert other_client.delete(f"/api/tasks/{task['id']}").status_code == 404
    assert other_client.get(f"/api/tabs/{tab['id']}/tasks").status_code == 404
    assert other_client.put(f"/api/tabs/{tab['id']}", json={"name": "x"}).status_code == 404
    assert other_client.delete(f"/api/tabs/{tab['id']}").status_code == 404
    assert other_client.post("/api/tasks", json={"tab_id": tab["id"], "title": "x"}).status_code == 404
    assert other_client.get("/api/tasks", params={"q": "secret"}).json() == []
    assert tab["id"] not in [t["id"] for t in other_client.get("/api/tabs").json()]

    # 自分のタスクを他人のタブへ移動することもできない
    other_tab = other_client.get("/api/tabs").json()[0]
    r = client.put(f"/api/tasks/{task['id']}", json={"tab_id": other_tab["id"]})
    assert r.status_code == 404
    assert client.get(f"/api/tasks/{task['id']}").json()["tab_id"] == tab["id"]


def test_last_tab_protection_is_per_user(client, other_client):
    client.post("/api/tabs", json={"name": "2つ目"})  # 自分は2タブ
    other_only = other_client.get("/api/tabs").json()[0]
    # 他ユーザーのタブ数に関係なく、そのユーザーの最後の1つは消せない
    assert other_client.delete(f"/api/tabs/{other_only['id']}").status_code == 409
