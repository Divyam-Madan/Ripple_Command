import pytest

from app.data.seed import seed_all
from app.db.session import get_session_factory


@pytest.fixture(scope="module")
def db_session():
    seed_all(reset=True)
    session = get_session_factory()()
    yield session
    session.close()
