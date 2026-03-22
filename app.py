from flask import Flask, jsonify
from flask_cors import CORS

from models.database import init_db
from routes.auth import auth_bp
from routes.users import users_bp
from routes.matches import matches_bp
from routes.messages import messages_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # Enable CORS for all routes (frontend can be opened from file:// or another port)
    CORS(app)

    # Initialize database
    init_db()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(matches_bp)
    app.register_blueprint(messages_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8080, debug=True)

