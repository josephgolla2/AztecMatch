"""Automated checks that user A cannot act as user B without B's credentials."""


def _register(client, suffix: str = "a"):
    return client.post(
        "/api/register",
        json={
            "first_name": "Test",
            "last_name": suffix.upper(),
            "email": f"test{suffix}@sdsu.edu",
            "password": "password123",
        },
    )


def _login(client, suffix: str = "a"):
    return client.post(
        "/api/login",
        json={"email": f"test{suffix}@sdsu.edu", "password": "password123"},
    )


def test_login_returns_access_token(client):
    assert _register(client).status_code == 201
    res = _login(client)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data and data["access_token"]


def test_profile_requires_auth(client):
    _register(client)
    res = client.get("/api/profile/1")
    assert res.status_code == 401


def test_messages_require_auth(client):
    _register(client)
    res = client.get("/api/messages/1")
    assert res.status_code == 401


def test_matches_require_auth(client):
    _register(client)
    res = client.get("/api/matches")
    assert res.status_code == 401


def test_user_a_cannot_update_user_b_profile(client):
    _register(client, "a")
    _register(client, "b")
    login_a = _login(client, "a")
    token_a = login_a.get_json()["access_token"]

    res = client.post(
        "/api/profile/update",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"bio": "hacked as B"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["user"]["id"] == 1
    assert data["user"]["bio"] == "hacked as B"

    login_b = _login(client, "b")
    token_b = login_b.get_json()["access_token"]
    prof_b = client.get("/api/profile/2", headers={"Authorization": f"Bearer {token_b}"}).get_json()
    assert prof_b["user"]["bio"] is None or prof_b["user"]["bio"] != "hacked as B"


def test_viewing_other_profile_omits_email(client):
    _register(client, "a")
    _register(client, "b")
    login_a = _login(client, "a")
    token_a = login_a.get_json()["access_token"]

    own = client.get("/api/profile/1", headers={"Authorization": f"Bearer {token_a}"}).get_json()
    assert "email" in own["user"]

    other = client.get("/api/profile/2", headers={"Authorization": f"Bearer {token_a}"}).get_json()
    assert "email" not in other["user"]


def test_messages_scoped_to_authenticated_user(client):
    _register(client, "a")
    _register(client, "b")
    login_a = _login(client, "a")
    token_a = login_a.get_json()["access_token"]

    send = client.post(
        "/api/messages/send",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"receiver_id": 2, "message": "hello from A"},
    )
    assert send.status_code == 200

    conv = client.get("/api/messages/2", headers={"Authorization": f"Bearer {token_a}"}).get_json()
    assert len(conv["messages"]) == 1

    login_b = _login(client, "b")
    token_b = login_b.get_json()["access_token"]
    conv_b = client.get("/api/messages/1", headers={"Authorization": f"Bearer {token_b}"}).get_json()
    assert len(conv_b["messages"]) == 1


def test_user_b_token_cannot_read_a_vs_c_conversation(client):
    _register(client, "a")
    _register(client, "b")
    _register(client, "c")

    ta = _login(client, "a").get_json()["access_token"]
    client.post(
        "/api/messages/send",
        headers={"Authorization": f"Bearer {ta}"},
        json={"receiver_id": 3, "message": "secret A to C"},
    )

    tb = _login(client, "b").get_json()["access_token"]
    leaked = client.get("/api/messages/3", headers={"Authorization": f"Bearer {tb}"}).get_json()
    assert leaked["messages"] == []
