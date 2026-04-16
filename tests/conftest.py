import os
import tempfile

import pytest

from app import create_app


@pytest.fixture
def client():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")

    # If your app later supports a test DB config, wire it here.
    # For now, this fixture mainly gives you a reusable test client.
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client

    os.close(db_fd)
    os.unlink(db_path)