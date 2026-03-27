from flask import Blueprint, jsonify

from models.database import SessionLocal, User, user_profile_complete


matches_bp = Blueprint("matches", __name__, url_prefix="/api")


def _parse_interests(interests_raw: str) -> set[str]:
    if not interests_raw:
        return set()
    return {
        item.strip().lower()
        for item in interests_raw.split(",")
        if item.strip()
    }


@matches_bp.get("/matches/<int:user_id>")
def get_matches(user_id: int):
    db = SessionLocal()
    try:
        current = db.get(User, user_id)
        if not current:
            return jsonify({"success": False, "error": "User not found."}), 404

        if not user_profile_complete(current):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Complete your profile to unlock matches.",
                    }
                ),
                400,
            )

        current_interests = _parse_interests(current.interests or "")
        current_major = (current.major or "").strip().lower()

        users = db.query(User).filter(User.id != user_id).all()

        suggestions = []
        for other in users:
            if not user_profile_complete(other):
                continue

            score = 0

            other_major = (other.major or "").strip().lower()
            if current_major and other_major and current_major == other_major:
                score += 30

            other_interests = _parse_interests(other.interests or "")
            shared = current_interests.intersection(other_interests)
            score += 10 * len(shared)

            if score <= 0:
                continue

            suggestions.append(
                {
                    "id": other.id,
                    "name": f"{other.first_name} {other.last_name}",
                    "first_name": other.first_name,
                    "last_name": other.last_name,
                    "major": other.major,
                    "interests": other.interests,
                    "bio": other.bio,
                    "profile_picture": other.profile_picture,
                    "shared_interests": sorted(shared),
                    "same_major": bool(
                        current_major and other_major and current_major == other_major
                    ),
                    "score": score,
                }
            )

        suggestions.sort(key=lambda m: m["score"], reverse=True)

        return jsonify({"success": True, "matches": suggestions})
    finally:
        db.close()

