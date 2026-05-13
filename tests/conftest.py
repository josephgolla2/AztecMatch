import os

# Configure before any application imports so SQLAlchemy binds to the test database.
os.environ["AZTECMATCH_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"

import pytest


@pytest.fixture
def app():
    from app import create_app
    from models.database import init_db

    application = create_app()
    application.config["TESTING"] = True
    init_db()
    yield application


@pytest.fixture
def client(app):
    return app.test_client()
