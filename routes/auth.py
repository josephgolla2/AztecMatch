from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from models.database import SessionLocal, User


auth_bp = Blueprint("auth", __name__, url_prefix="/api")


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not first_name or not last_name or not email or not password:
        return jsonify({"success": False, "error": "All fields are required."}), 400

    if not email.endswith("@sdsu.edu"):
        return jsonify({"success": False, "error": "Email must end with @sdsu.edu."}), 400

    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters."}), 400

    db = SessionLocal()
    try:
        existing = db.query(User).filter_by(email=email).first()
        if existing:
            return jsonify({"success": False, "error": "Email is already registered."}), 400

        # Use a widely-supported hash method that doesn't require hashlib.scrypt
        password_hash = generate_password_hash(password, method="pbkdf2:sha256")
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=password_hash,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return jsonify({"success": True, "user_id": user.id}), 201
    finally:
        db.close()


@auth_bp.post("/login")
def login():
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required."}), 400

        db = SessionLocal()
        try:
            user = db.query(User).filter_by(email=email).first()
            if not user or not check_password_hash(user.password_hash, password):
                return jsonify({"success": False, "error": "Invalid email or password."}), 401

            return jsonify(
                {
                    "success": True,
                    "user_id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            )
        finally:
            db.close()
    except Exception:
        return jsonify({"success": False, "error": "An error occurred during login."}), 500

