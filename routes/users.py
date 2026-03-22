from flask import Blueprint, jsonify, request

from models.database import SessionLocal, User


users_bp = Blueprint("users", __name__, url_prefix="/api")


@users_bp.get("/profile/<int:user_id>")
def get_profile(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found."}), 404

        return jsonify(
            {
                "success": True,
                "user": {
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "major": user.major,
                    "interests": user.interests,
                    "bio": user.bio,
                },
            }
        )
    finally:
        db.close()


@users_bp.post("/profile/update")
def update_profile():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required."}), 400

    db = SessionLocal()
    try:
        user = db.query(User).get(int(user_id))
        if not user:
            return jsonify({"success": False, "error": "User not found."}), 404

        user.major = data.get("major", user.major)
        user.interests = data.get("interests", user.interests)
        user.bio = data.get("bio", user.bio)

        db.add(user)
        db.commit()
        db.refresh(user)

        return jsonify({"success": True})
    finally:
        db.close()


# profile update improvements by Victor
