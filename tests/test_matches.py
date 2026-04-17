import uuid
import time


def register_user(client, first_name, last_name):
    timestamp = int(time.time() * 1000000)
    unique_email = f"{first_name.lower()}_{uuid.uuid4().hex[:12]}_{timestamp}@sdsu.edu"
    response = client.post(
        "/api/register",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "email": unique_email,
            "password": "password123"
        }
    )
    data = response.get_json()
    return data["user_id"]


def create_test_user(client):
    timestamp = int(time.time() * 1000000)
    unique_email = f"test_{uuid.uuid4().hex[:12]}_{timestamp}@sdsu.edu"
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
    return data["user_id"]


def complete_profile(client, user_id, interests, major="Computer Science"):
    return client.post(
        "/api/profile/update",
        json={
            "user_id": user_id,
            "gender": "Male",
            "age": 25,
            "height": "6'0\"",
            "status": "Student",
            "major": major,
            "interests": interests,
            "bio": "Test bio",
            "profile_picture": "/static/images/default-profile.png"
        }
    )


def test_matches_returns_candidates_for_completed_profiles(client):
    user1 = register_user(client, "User", "One")
    user2 = register_user(client, "User", "Two")

    response1 = complete_profile(client, user1, "music, coding, hiking")
    response2 = complete_profile(client, user2, "music, coding, movies")

    assert response1.status_code == 200
    assert response2.status_code == 200

    response = client.get(f"/api/matches/{user1}")
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data["success"] is True
    assert "matches" in data
    assert isinstance(data["matches"], list)
    assert len(data["matches"]) >= 1


def test_matches_for_incomplete_profile_behaves_correctly(client):
    user_id = create_test_user(client)

    response = client.get(f"/api/matches/{user_id}")
    assert response.status_code == 400

    data = response.get_json()
    assert data is not None
    assert data["success"] is False
    assert "Complete your profile" in data["error"]