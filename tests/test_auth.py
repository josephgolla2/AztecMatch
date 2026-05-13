import uuid
import time


def unique_sdsu_email(prefix="testauth"):
    timestamp = int(time.time() * 1000000)
    return f"{prefix}_{uuid.uuid4().hex[:12]}_{timestamp}@sdsu.edu"


def test_register_rejects_non_sdsu_email(client):
    response = client.post(
        "/api/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": "test@gmail.com",
            "password": "password123"
        }
    )

    assert response.status_code in (400, 401)
    data = response.get_json()
    assert data is not None
    assert data["success"] is False


def test_register_accepts_valid_sdsu_email(client):
    response = client.post(
        "/api/register",
        json={
            "first_name": "Riley",
            "last_name": "Owens",
            "email": unique_sdsu_email("validregister"),
            "password": "password123"
        }
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    assert data["success"] is True
    assert "user_id" in data


def test_login_rejects_wrong_password(client):
    email = unique_sdsu_email("wronglogin")

    client.post(
        "/api/register",
        json={
            "first_name": "Riley",
            "last_name": "Owens",
            "email": email,
            "password": "password123"
        }
    )

    response = client.post(
        "/api/login",
        json={
            "email": email,
            "password": "wrongpassword"
        }
    )

    assert response.status_code in (400, 401)
    data = response.get_json()
    assert data is not None
    assert data["success"] is False