import uuid


def create_test_user(client):
    unique_email = f"test_{uuid.uuid4().hex[:8]}@sdsu.edu"
    response = client.post(
        "/api/register",
        json={
            "first_name": "Profile",
            "last_name": "Tester",
            "email": unique_email,
            "password": "password123"
        }
    )
    data = response.get_json()

    if "user" in data:
        return data["user"]["id"]
    return data["user_id"]


def test_get_profile_returns_user(client):
    user_id = create_test_user(client)

    response = client.get(f"/api/profile/{user_id}")

    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["success"] is True
    assert data["user"]["id"] == user_id


def test_get_profile_returns_404_for_missing_user(client):
    response = client.get("/api/profile/999999")
    assert response.status_code == 404

    data = response.get_json()
    assert data is not None
    assert data["success"] is False


def test_update_profile_rejects_invalid_age(client):
    user_id = create_test_user(client)

    response = client.post(
        "/api/profile/update",
        json={
            "user_id": user_id,
            "age": 121
        }
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert data["success"] is False


def test_update_profile_and_fetch_profile(client):
    user_id = create_test_user(client)

    update_response = client.post(
        "/api/profile/update",
        json={
            "user_id": user_id,
            "gender": "Male",
            "age": 31,
            "height": "6'2\"",
            "status": "Full-time student",
            "major": "Computer Science",
            "interests": "music, math, programming",
            "bio": "Testing profile updates"
        }
    )

    assert update_response.status_code == 200
    update_data = update_response.get_json()
    assert update_data is not None
    assert update_data["success"] is True

    profile_response = client.get(f"/api/profile/{user_id}")
    assert profile_response.status_code == 200

    profile_data = profile_response.get_json()
    assert profile_data is not None
    assert profile_data["success"] is True
    assert profile_data["user"]["id"] == user_id
    assert profile_data["user"]["major"] == "Computer Science"
    assert profile_data["user"]["age"] == 31
    assert profile_data["user"]["status"] == "Full-time student"