#!/usr/bin/env python
"""Script to create database tables."""

import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from dotenv import load_dotenv

    # Load environment variables if .env file exists
    env_file = backend_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
except ImportError:
    # python-dotenv is optional for this script
    # Config will load .env if it exists
    pass

from app.config import Config  # noqa: E402
from app.database import get_engine, init_engine  # noqa: E402
from app.models import Base  # noqa: E402


def create_tables():
    """Create all database tables."""
    database_url = Config.SQLALCHEMY_DATABASE_URI
    print("Connecting to database...")
    init_engine(database_url)

    engine = get_engine()
    print("Creating tables...")
    Base.metadata.create_all(engine)
    print("✅ All tables created successfully!")

    # Show created tables
    print("\nCreated tables:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")

    return 0


if __name__ == "__main__":
    try:
        exit_code = create_tables()
        sys.exit(exit_code)
    except Exception as e:
        print(f"❌ Error creating tables: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
