#!/usr/bin/env python
"""Script to apply SQL migrations from infra/mysql/migrations/ directory."""

import hashlib
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

from sqlalchemy import text  # noqa: E402
from sqlalchemy.exc import SQLAlchemyError  # noqa: E402

from app.config import Config  # noqa: E402
from app.database import get_engine, init_engine, session_scope  # noqa: E402
from app.models import Base, SchemaMigration  # noqa: E402


def get_migration_files() -> list[Path]:
    """Get all SQL migration files from infra/mysql/migrations/ directory."""
    # Navigate from backend/ to infra/mysql/migrations/
    migrations_dir = backend_dir.parent / "infra" / "mysql" / "migrations"

    if not migrations_dir.exists():
        print(f"⚠️  Migrations directory not found: {migrations_dir}")
        return []

    # Get all .sql files, excluding README.md
    sql_files = sorted(migrations_dir.glob("*.sql"))

    return sql_files


def calculate_checksum(file_path: Path) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def get_applied_migrations(session) -> dict[str, str]:
    """Get all applied migrations from schema_migrations table.

    Returns:
        dict[filename, checksum]: Mapping of applied migration filenames to their checksums
    """
    applied = session.query(SchemaMigration).all()
    return {migration.filename: migration.checksum for migration in applied}


def apply_migration(session, migration_file: Path) -> None:
    """Apply a single migration file.

    Args:
        session: SQLAlchemy session
        migration_file: Path to the migration SQL file

    Raises:
        SQLAlchemyError: If migration execution fails
    """
    filename = migration_file.name
    checksum = calculate_checksum(migration_file)

    print(f"  📄 Applying migration: {filename}")

    # Read SQL file
    with open(migration_file, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Split by semicolon and execute each statement
    # Note: This is a simple approach; for complex migrations, consider using sqlparse
    statements = [stmt.strip() for stmt in sql_content.split(";") if stmt.strip()]

    for i, statement in enumerate(statements, 1):
        try:
            session.execute(text(statement))
            print(f"    ✓ Executed statement {i}/{len(statements)}")
        except SQLAlchemyError as e:
            print(f"    ✗ Failed to execute statement {i}: {e}")
            raise

    # Record migration in schema_migrations table
    migration_record = SchemaMigration(filename=filename, checksum=checksum)
    session.add(migration_record)

    print(f"  ✅ Migration {filename} applied successfully")


def verify_migration_integrity(applied_migrations: dict[str, str], migration_file: Path) -> bool:
    """Verify that an applied migration's checksum matches the current file.

    Args:
        applied_migrations: Dict of applied migrations {filename: checksum}
        migration_file: Path to the migration file

    Returns:
        bool: True if checksums match, False otherwise
    """
    filename = migration_file.name
    current_checksum = calculate_checksum(migration_file)
    recorded_checksum = applied_migrations.get(filename)

    if recorded_checksum and recorded_checksum != current_checksum:
        print(f"  ⚠️  WARNING: Migration {filename} has been modified after application!")
        print(f"      Recorded checksum: {recorded_checksum}")
        print(f"      Current checksum:  {current_checksum}")
        return False

    return True


def apply_migrations() -> int:
    """Apply all pending SQL migrations."""
    database_url = Config.SQLALCHEMY_DATABASE_URI
    print("🔗 Connecting to database...")
    init_engine(database_url)

    engine = get_engine()

    # Ensure schema_migrations table exists
    print("📋 Creating schema_migrations table if not exists...")
    Base.metadata.create_all(engine, tables=[SchemaMigration.__table__])

    # Get migration files
    migration_files = get_migration_files()

    if not migration_files:
        print("ℹ️  No migration files found")
        return 0

    print(f"📂 Found {len(migration_files)} migration file(s)")

    with session_scope() as session:
        # Get applied migrations
        applied_migrations = get_applied_migrations(session)
        print(f"✓ {len(applied_migrations)} migration(s) already applied")

        # Check for pending migrations
        pending_migrations = [f for f in migration_files if f.name not in applied_migrations]

        if not pending_migrations:
            print("✅ All migrations are up to date!")
            # Verify integrity of applied migrations
            print("\n🔍 Verifying migration integrity...")
            all_valid = True
            for migration_file in migration_files:
                if not verify_migration_integrity(applied_migrations, migration_file):
                    all_valid = False
            if all_valid:
                print("✅ All migration checksums are valid")
            return 0

        # Apply pending migrations
        print(f"\n🚀 Applying {len(pending_migrations)} pending migration(s)...")
        for migration_file in pending_migrations:
            try:
                apply_migration(session, migration_file)
            except SQLAlchemyError as e:
                print(f"\n❌ Migration failed: {migration_file.name}")
                print(f"   Error: {e}")
                # Session will be rolled back automatically by session_scope
                raise

        session.commit()
        print("\n✅ All migrations applied successfully!")

    return 0


if __name__ == "__main__":
    try:
        exit_code = apply_migrations()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ Error applying migrations: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
