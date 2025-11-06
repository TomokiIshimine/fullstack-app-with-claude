#!/usr/bin/env python
"""Script to create a test user."""

import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session  # noqa: E402

from app.config import Config  # noqa: E402
from app.database import get_engine, init_engine  # noqa: E402
from app.models.user import User  # noqa: E402
from app.utils.password import hash_password  # noqa: E402


def create_user(email: str, password: str, role: str = "user", name: str | None = None):
    """Create a test user.

    Args:
        email: User's email address
        password: User's password (will be hashed)
        role: User's role ('admin' or 'user', default: 'user')
        name: User's display name (optional)
    """
    database_url = Config.SQLALCHEMY_DATABASE_URI
    print("Connecting to database...")
    init_engine(database_url)

    engine = get_engine()
    with Session(engine) as session:
        # Check if user already exists
        existing_user = session.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User {email} already exists (id={existing_user.id})")
            return

        # Create new user
        user = User(email=email, password_hash=hash_password(password), role=role, name=name)
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"✅ Created user: {user.email} (id={user.id}, role={user.role}, name={user.name})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <email> <password>")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    create_user(email, password)
