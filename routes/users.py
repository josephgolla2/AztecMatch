from flask import Blueprint, g, jsonify, request

from auth_utils import require_auth
from models.database import SessionLocal, User, user_profile_complete


users_bp = Blueprint("users", __name__, url_prefix="/api")


def _user_payload(user: User, *, include_email: bool) -> dict:
    payload = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "major": user.major,
        "interests": user.interests,
        "bio": user.bio,
        "gender": user.gender,
        "age": user.age,
        "height": user.height,
        "status": user.status,
        "profile_picture": user.profile_picture,
        "profile_complete": user_profile_complete(user),
    }
    if include_email:
        payload["email"] = user.email
    return payload


@users_bp.get("/profile/<int:user_id>")
@require_auth
def get_profile(user_id: int):
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found."}), 404

        viewer_id = g.current_user_id
        include_email = viewer_id == user.id

        return jsonify(
            {
                "success": True,
                "user": _user_payload(user, include_email=include_email),
            }
        )
    finally:
        db.close()


@users_bp.post("/profile/update")
@require_auth
def update_profile():
    data = request.get_json() or {}

    db = SessionLocal()
    try:
        user = db.get(User, g.current_user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found."}), 404

        if "major" in data:
            user.major = (data.get("major") or "").strip() or None
        if "interests" in data:
            user.interests = (data.get("interests") or "").strip() or None
        if "bio" in data:
            user.bio = (data.get("bio") or "").strip() or None
        if "gender" in data:
            user.gender = (data.get("gender") or "").strip() or None
        if "height" in data:
            user.height = (data.get("height") or "").strip() or None
        if "status" in data:
            user.status = (data.get("status") or "").strip() or None
        if "profile_picture" in data:
            user.profile_picture = (data.get("profile_picture") or "").strip() or None

        if "age" in data:
            raw_age = data.get("age")
            if raw_age is None or raw_age == "":
                user.age = None
            else:
                try:
                    age = int(raw_age)
                except (TypeError, ValueError):
                    return jsonify({"success": False, "error": "Age must be a number."}), 400
                if age < 16 or age > 60:
                    return jsonify({"success": False, "error": "Age must be between 16 and 60."}), 400
                user.age = age

        db.add(user)
        db.commit()
        db.refresh(user)

        return jsonify({"success": True, "user": _user_payload(user, include_email=True)})
    finally:
        db.close()


# profile update improvements by Victor
