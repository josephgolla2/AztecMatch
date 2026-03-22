from flask import Blueprint, jsonify

from models.database import SessionLocal, User


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
        current = db.query(User).get(user_id)
        if not current:
            return jsonify({"success": False, "error": "User not found."}), 404

        current_interests = _parse_interests(current.interests or "")
        current_major = (current.major or "").strip().lower()

        users = db.query(User).filter(User.id != user_id).all()

        suggestions = []
        for other in users:
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
                    "major": other.major,
                    "score": score,
                }
            )

        suggestions.sort(key=lambda m: m["score"], reverse=True)

        return jsonify({"success": True, "matches": suggestions})
    finally:
        db.close()

