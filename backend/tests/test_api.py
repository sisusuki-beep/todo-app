# `client` フィクスチャ（テストごとに新規ユーザーで認証済み）は conftest.py にある


def test_default_tab_and_last_tab_protected(client):
    tabs = client.get("/api/tabs").json()
    assert len(tabs) == 1
    assert client.delete(f"/api/tabs/{tabs[0]['id']}").status_code == 409


def test_tab_crud_and_reorder(client):
    a = client.get("/api/tabs").json()[0]
    b = client.post("/api/tabs", json={"name": "仕事"}).json()
    c = client.post("/api/tabs", json={"name": "買い物"}).json()
    assert [b["order"], c["order"]] == [1, 2]

    assert client.put(f"/api/tabs/{c['id']}", json={"order": 0}).status_code == 200
    names = [t["id"] for t in client.get("/api/tabs").json()]
    assert names == [c["id"], a["id"], b["id"]]

    r = client.put(f"/api/tabs/{b['id']}", json={"name": "  Work  "})
    assert r.json()["name"] == "Work"
    assert client.post("/api/tabs", json={"name": "  "}).status_code == 422
    assert client.put("/api/tabs/9999", json={"name": "x"}).status_code == 404


def test_task_lifecycle_and_badge(client):
    tab = client.get("/api/tabs").json()[0]
    r = client.post("/api/tasks", json={"tab_id": tab["id"], "title": "牛乳", "priority": "high"})
    assert r.status_code == 201
    t = r.json()
    assert t["is_completed"] is False and t["priority"] == "high"
    assert client.get("/api/tabs").json()[0]["incomplete_count"] == 1

    assert client.patch(f"/api/tasks/{t['id']}/toggle").json()["is_completed"] is True
    assert client.get("/api/tabs").json()[0]["incomplete_count"] == 0

    r = client.put(f"/api/tasks/{t['id']}", json={"description": "メモ", "due_date": "2026-10-01"})
    assert r.json()["due_date"] == "2026-10-01"
    r = client.put(f"/api/tasks/{t['id']}", json={"due_date": None})
    assert r.json()["due_date"] is None and r.json()["description"] == "メモ"
    assert client.put(f"/api/tasks/{t['id']}", json={"title": None}).status_code == 422

    assert client.delete(f"/api/tasks/{t['id']}").status_code == 204
    assert client.get(f"/api/tasks/{t['id']}").status_code == 404


def test_validation(client):
    tab = client.get("/api/tabs").json()[0]
    assert client.post("/api/tasks", json={"tab_id": tab["id"], "title": ""}).status_code == 422
    assert (
        client.post("/api/tasks", json={"tab_id": tab["id"], "title": "x", "priority": "urgent"}).status_code
        == 422
    )
    assert client.post("/api/tasks", json={"tab_id": 9999, "title": "x"}).status_code == 404


def test_filter_sort_search(client):
    tab = client.get("/api/tabs").json()[0]["id"]
    mk = lambda **kw: client.post("/api/tasks", json={"tab_id": tab, **kw}).json()
    a = mk(title="Alpha", priority="low", due_date="2026-12-01")
    b = mk(title="Beta", priority="high")
    c = mk(title="100% gamma", priority="medium", due_date="2026-10-01", description="hello")
    client.patch(f"/api/tasks/{a['id']}/toggle")

    ids = lambda r: [t["id"] for t in r.json()]
    base = f"/api/tabs/{tab}/tasks"
    assert ids(client.get(base)) == [a["id"], b["id"], c["id"]]
    assert ids(client.get(base, params={"status": "active"})) == [b["id"], c["id"]]
    assert ids(client.get(base, params={"status": "completed"})) == [a["id"]]
    assert ids(client.get(base, params={"sort": "priority"})) == [b["id"], c["id"], a["id"]]
    assert ids(client.get(base, params={"sort": "due_date"})) == [c["id"], a["id"], b["id"]]
    assert ids(client.get(base, params={"q": "HELLO"})) == [c["id"]]
    assert ids(client.get(base, params={"q": "100%"})) == [c["id"]]  # %はリテラル扱い
    assert client.get(base, params={"status": "bogus"}).status_code == 422
    assert client.get("/api/tabs/9999/tasks").status_code == 404

    # 横断検索
    other = client.post("/api/tabs", json={"name": "他"}).json()
    x = client.post("/api/tasks", json={"tab_id": other["id"], "title": "alpha two"}).json()
    assert set(ids(client.get("/api/tasks", params={"q": "alpha"}))) == {a["id"], x["id"]}


def test_reorder_and_move_task(client):
    tab = client.get("/api/tabs").json()[0]["id"]
    t = [client.post("/api/tasks", json={"tab_id": tab, "title": str(i)}).json() for i in range(3)]
    client.put(f"/api/tasks/{t[2]['id']}", json={"order": 0})
    got = client.get(f"/api/tabs/{tab}/tasks").json()
    assert [x["id"] for x in got] == [t[2]["id"], t[0]["id"], t[1]["id"]]
    assert [x["order"] for x in got] == [0, 1, 2]

    other = client.post("/api/tabs", json={"name": "移動先"}).json()["id"]
    r = client.put(f"/api/tasks/{t[0]['id']}", json={"tab_id": other})
    assert r.json()["tab_id"] == other and r.json()["order"] == 0


def test_cascade_delete(client):
    other = client.post("/api/tabs", json={"name": "消す"}).json()["id"]
    t = client.post("/api/tasks", json={"tab_id": other, "title": "x"}).json()
    assert client.delete(f"/api/tabs/{other}").status_code == 204
    assert client.get(f"/api/tasks/{t['id']}").status_code == 404
