from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os

from models.database import init_db
from routes.auth import auth_bp
from routes.users import users_bp
from routes.matches import matches_bp
from routes.messages import messages_bp

FRONT_DIR = os.path.join(os.path.dirname(__file__), 'front')


def create_app() -> Flask:
    app = Flask(__name__, static_folder='static')
    app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024

    CORS(app)

    init_db()

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(matches_bp)
    app.register_blueprint(messages_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.route('/')
    def index():
        return send_from_directory(FRONT_DIR, 'index.html')

    @app.route('/<path:filename>')
    def serve_front(filename):
        return send_from_directory(FRONT_DIR, filename)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8080, debug=True)

