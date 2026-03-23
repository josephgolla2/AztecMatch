from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker


DATABASE_URL = "sqlite:///aztecmatch.db"

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    major = Column(String(255), nullable=True)
    interests = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    gender = Column(String(50), nullable=True)
    age = Column(Integer, nullable=True)
    height = Column(String(50), nullable=True)
    status = Column(String(100), nullable=True)
    profile_picture = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sent_messages = relationship(
        "Message",
        back_populates="sender",
        foreign_keys="Message.sender_id",
        cascade="all, delete-orphan",
    )
    received_messages = relationship(
        "Message",
        back_populates="receiver",
        foreign_keys="Message.receiver_id",
        cascade="all, delete-orphan",
    )


def user_profile_complete(user: User) -> bool:
    if not user.gender or not user.height or not user.status:
        return False
    if user.age is None:
        return False
    if not user.profile_picture or not str(user.profile_picture).strip():
        return False
    return True


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_users_columns()


def _migrate_users_columns() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return

    existing = {col["name"] for col in insp.get_columns("users")}
    alters = []
    if "gender" not in existing:
        alters.append("ALTER TABLE users ADD COLUMN gender VARCHAR(50)")
    if "age" not in existing:
        alters.append("ALTER TABLE users ADD COLUMN age INTEGER")
    if "height" not in existing:
        alters.append("ALTER TABLE users ADD COLUMN height VARCHAR(50)")
    if "status" not in existing:
        alters.append("ALTER TABLE users ADD COLUMN status VARCHAR(100)")
    if "profile_picture" not in existing:
        alters.append("ALTER TABLE users ADD COLUMN profile_picture TEXT")

    if not alters:
        return

    with engine.begin() as conn:
        for statement in alters:
            conn.execute(text(statement))

