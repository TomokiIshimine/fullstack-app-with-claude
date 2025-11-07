from __future__ import annotations

from datetime import datetime, timezone

import pytest
from flask import Flask
from sqlalchemy.exc import IntegrityError

from app.database import get_session
from app.models.schema_migration import SchemaMigration


class TestSchemaMigrationModel:
    """Tests for SchemaMigration model CRUD operations."""

    def test_create_schema_migration(self, app: Flask):
        """Test creating a new schema migration record."""
        with app.app_context():
            session = get_session()

            migration = SchemaMigration(
                filename="001_initial_migration.sql",
                checksum="abc123def456",
            )
            session.add(migration)
            session.commit()

            assert migration.id is not None
            assert migration.filename == "001_initial_migration.sql"
            assert migration.checksum == "abc123def456"
            assert isinstance(migration.applied_at, datetime)

    def test_query_schema_migration(self, app: Flask):
        """Test querying schema migration records."""
        with app.app_context():
            session = get_session()

            # Create migration
            migration = SchemaMigration(
                filename="002_test_migration.sql",
                checksum="checksum123",
            )
            session.add(migration)
            session.commit()
            migration_id = migration.id

            # Query by ID
            retrieved = session.query(SchemaMigration).filter_by(id=migration_id).first()
            assert retrieved is not None
            assert retrieved.filename == "002_test_migration.sql"
            assert retrieved.checksum == "checksum123"

    def test_query_schema_migration_by_filename(self, app: Flask):
        """Test querying schema migration by filename."""
        with app.app_context():
            session = get_session()

            migration = SchemaMigration(
                filename="003_unique_filename.sql",
                checksum="checksum456",
            )
            session.add(migration)
            session.commit()

            # Query by filename
            retrieved = session.query(SchemaMigration).filter_by(filename="003_unique_filename.sql").first()
            assert retrieved is not None
            assert retrieved.checksum == "checksum456"

    def test_unique_filename_constraint(self, app: Flask):
        """Test that filename must be unique."""
        with app.app_context():
            session = get_session()

            # Create first migration
            migration1 = SchemaMigration(
                filename="004_duplicate_test.sql",
                checksum="checksum1",
            )
            session.add(migration1)
            session.commit()

            # Attempt to create duplicate
            migration2 = SchemaMigration(
                filename="004_duplicate_test.sql",
                checksum="checksum2",
            )
            session.add(migration2)

            with pytest.raises(IntegrityError):
                session.commit()

            # Rollback to clean up the session state
            session.rollback()

    def test_applied_at_default_value(self, app: Flask):
        """Test that applied_at is automatically set to current time."""
        with app.app_context():
            session = get_session()

            before_creation = datetime.now(timezone.utc)

            migration = SchemaMigration(
                filename="005_timestamp_test.sql",
                checksum="checksum789",
            )
            session.add(migration)
            session.commit()

            after_creation = datetime.now(timezone.utc)

            # applied_at should be between before and after creation
            # Note: SQLite doesn't support timezone-aware datetimes, so we compare naive datetimes
            assert migration.applied_at is not None
            # Allow for 1 second tolerance to account for potential time differences
            assert (migration.applied_at.replace(tzinfo=None) - before_creation.replace(tzinfo=None)).total_seconds() >= -1
            assert (after_creation.replace(tzinfo=None) - migration.applied_at.replace(tzinfo=None)).total_seconds() >= -1

    def test_list_all_migrations_ordered(self, app: Flask):
        """Test listing all migrations ordered by applied_at."""
        with app.app_context():
            session = get_session()

            # Create multiple migrations
            migrations = [
                SchemaMigration(filename="010_first.sql", checksum="check1"),
                SchemaMigration(filename="011_second.sql", checksum="check2"),
                SchemaMigration(filename="012_third.sql", checksum="check3"),
            ]

            for migration in migrations:
                session.add(migration)
            session.commit()

            # Query all migrations ordered by applied_at
            all_migrations = session.query(SchemaMigration).order_by(SchemaMigration.applied_at).all()

            assert len(all_migrations) >= 3
            # Verify filenames are in the result
            filenames = [m.filename for m in all_migrations]
            assert "010_first.sql" in filenames
            assert "011_second.sql" in filenames
            assert "012_third.sql" in filenames

    def test_delete_schema_migration(self, app: Flask):
        """Test deleting a schema migration record."""
        with app.app_context():
            session = get_session()

            migration = SchemaMigration(
                filename="020_delete_test.sql",
                checksum="checksum_delete",
            )
            session.add(migration)
            session.commit()
            migration_id = migration.id

            # Delete migration
            session.delete(migration)
            session.commit()

            # Verify deletion
            retrieved = session.query(SchemaMigration).filter_by(id=migration_id).first()
            assert retrieved is None

    def test_update_checksum(self, app: Flask):
        """Test updating a migration's checksum (edge case - normally shouldn't happen)."""
        with app.app_context():
            session = get_session()

            migration = SchemaMigration(
                filename="030_update_test.sql",
                checksum="old_checksum",
            )
            session.add(migration)
            session.commit()

            # Update checksum
            migration.checksum = "new_checksum"
            session.commit()

            # Verify update
            session.refresh(migration)
            assert migration.checksum == "new_checksum"

    def test_repr_method(self, app: Flask):
        """Test __repr__ method for debugging."""
        with app.app_context():
            migration = SchemaMigration(
                filename="040_repr_test.sql",
                checksum="checksum_repr",
            )

            repr_str = repr(migration)
            assert "SchemaMigration" in repr_str
            assert "040_repr_test.sql" in repr_str
            # applied_at may be None before saving, so don't check for it in repr

    def test_count_migrations(self, app: Flask):
        """Test counting total migrations."""
        with app.app_context():
            session = get_session()

            initial_count = session.query(SchemaMigration).count()

            # Add migrations
            for i in range(5):
                migration = SchemaMigration(
                    filename=f"050_count_test_{i}.sql",
                    checksum=f"checksum_{i}",
                )
                session.add(migration)
            session.commit()

            final_count = session.query(SchemaMigration).count()
            assert final_count == initial_count + 5
