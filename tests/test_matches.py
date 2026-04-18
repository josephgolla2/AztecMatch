import uuid


def register_user(client, first_name, last_name):
    unique_email = f"{first_name.lower()}_{uuid.uuid4().hex[:8]}@sdsu.edu"
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


def test_matches_same_major_without_shared_interests(client):
    user1 = register_user(client, "Major", "One")
    user2 = register_user(client, "Major", "Two")

    complete_profile(client, user1, "music, hiking", major="Computer Science")
    complete_profile(client, user2, "cooking, chess", major="Computer Science")

    response = client.get(f"/api/matches/{user1}")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert len(data["matches"]) >= 1

    matched_ids = [match["id"] for match in data["matches"]]
    assert user2 in matched_ids


def test_matches_shared_interests_without_same_major(client):
    user1 = register_user(client, "Interest", "One")
    user2 = register_user(client, "Interest", "Two")

    complete_profile(client, user1, "music, coding", major="Computer Science")
    complete_profile(client, user2, "music, coding", major="Mathematics")

    response = client.get(f"/api/matches/{user1}")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert len(data["matches"]) >= 1

    matched_ids = [match["id"] for match in data["matches"]]
    assert user2 in matched_ids


def test_matches_excludes_users_with_no_major_or_interest_overlap(client):
    user1 = register_user(client, "NoMatch", "One")
    user2 = register_user(client, "NoMatch", "Two")

    complete_profile(client, user1, "music, coding", major="Computer Science")
    complete_profile(client, user2, "cooking, chess", major="Biology")

    response = client.get(f"/api/matches/{user1}")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True

    matched_ids = [match["id"] for match in data["matches"]]
    assert user2 not in matched_ids


def test_matches_combined_major_and_shared_interests_have_positive_score(client):
    user1 = register_user(client, "Combo", "One")
    user2 = register_user(client, "Combo", "Two")

    complete_profile(client, user1, "music, coding, hiking", major="Computer Science")
    complete_profile(client, user2, "music, coding, movies", major="Computer Science")

    response = client.get(f"/api/matches/{user1}")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert len(data["matches"]) >= 1

    target_match = next((m for m in data["matches"] if m["id"] == user2), None)
    assert target_match is not None
    assert target_match["same_major"] is True
    assert set(target_match["shared_interests"]) == {"music", "coding"}
    assert target_match["score"] == 50


def test_matches_for_incomplete_profile_behaves_correctly(client):
    user_id = create_test_user(client)

    response = client.get(f"/api/matches/{user_id}")
    assert response.status_code == 400

    data = response.get_json()
    assert data is not None
    assert data["success"] is False
    assert "Complete your profile" in data["error"]