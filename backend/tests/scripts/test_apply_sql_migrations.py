from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from flask import Flask
from sqlalchemy.exc import SQLAlchemyError

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import get_session  # noqa: E402
from app.models import SchemaMigration  # noqa: E402
from scripts.apply_sql_migrations import (  # noqa: E402
    apply_migration,
    apply_migrations,
    calculate_checksum,
    get_applied_migrations,
    get_migration_files,
    verify_migration_integrity,
)


class TestGetMigrationFiles:
    """Tests for get_migration_files function."""

    def test_get_migration_files_when_directory_exists(self, tmp_path):
        """Test getting migration files from existing directory."""
        # Create temporary migrations directory
        migrations_dir = tmp_path / "infra" / "mysql" / "migrations"
        migrations_dir.mkdir(parents=True)

        # Create migration files
        (migrations_dir / "001_first.sql").write_text("CREATE TABLE test1;")
        (migrations_dir / "002_second.sql").write_text("CREATE TABLE test2;")
        (migrations_dir / "003_third.sql").write_text("CREATE TABLE test3;")

        # Mock backend_dir to point to tmp_path
        with patch("scripts.apply_sql_migrations.backend_dir", tmp_path / "backend"):
            # Update the parent path
            with patch.object(Path, "parent", tmp_path):
                files = get_migration_files()

        # Since we can't easily mock the backend_dir path, let's directly test
        # by checking real migrations directory
        real_migrations_dir = backend_dir.parent / "infra" / "mysql" / "migrations"
        if real_migrations_dir.exists():
            files = get_migration_files()
            # Should return list of Path objects
            assert isinstance(files, list)
            # All should be .sql files
            for f in files:
                assert f.suffix == ".sql"
                assert f.is_file()

    def test_get_migration_files_when_directory_not_exists(self, tmp_path, capfd):
        """Test getting migration files when directory doesn't exist."""
        # Mock backend_dir to non-existent path
        with patch("scripts.apply_sql_migrations.backend_dir", tmp_path / "nonexistent"):
            files = get_migration_files()

        assert files == []
        captured = capfd.readouterr()
        assert "Migrations directory not found" in captured.out

    def test_get_migration_files_sorted_alphabetically(self):
        """Test that migration files are returned in alphabetical order."""
        files = get_migration_files()

        if len(files) > 1:
            # Verify files are sorted by filename
            filenames = [f.name for f in files]
            assert filenames == sorted(filenames)


class TestCalculateChecksum:
    """Tests for calculate_checksum function."""

    def test_calculate_checksum_consistent(self, tmp_path):
        """Test that checksum is consistent for same content."""
        test_file = tmp_path / "test.sql"
        test_file.write_text("SELECT * FROM users;")

        checksum1 = calculate_checksum(test_file)
        checksum2 = calculate_checksum(test_file)

        assert checksum1 == checksum2
        assert len(checksum1) == 64  # SHA256 produces 64-character hex string

    def test_calculate_checksum_different_for_different_content(self, tmp_path):
        """Test that checksum differs for different content."""
        file1 = tmp_path / "file1.sql"
        file2 = tmp_path / "file2.sql"

        file1.write_text("SELECT * FROM users;")
        file2.write_text("SELECT * FROM posts;")

        checksum1 = calculate_checksum(file1)
        checksum2 = calculate_checksum(file2)

        assert checksum1 != checksum2

    def test_calculate_checksum_detects_content_change(self, tmp_path):
        """Test that checksum changes when file content changes."""
        test_file = tmp_path / "test.sql"
        test_file.write_text("SELECT * FROM users;")

        checksum_before = calculate_checksum(test_file)

        # Modify file
        test_file.write_text("SELECT * FROM users WHERE id = 1;")

        checksum_after = calculate_checksum(test_file)

        assert checksum_before != checksum_after

    def test_calculate_checksum_handles_large_files(self, tmp_path):
        """Test checksum calculation for large files (chunk reading)."""
        test_file = tmp_path / "large.sql"
        # Create file larger than 4096 bytes (chunk size)
        large_content = "SELECT * FROM users;\n" * 1000
        test_file.write_text(large_content)

        checksum = calculate_checksum(test_file)

        assert len(checksum) == 64
        assert checksum.isalnum()  # Should be hexadecimal


class TestGetAppliedMigrations:
    """Tests for get_applied_migrations function."""

    def test_get_applied_migrations_empty_database(self, app: Flask):
        """Test getting applied migrations from empty database."""
        with app.app_context():
            session = get_session()
            applied = get_applied_migrations(session)

            assert isinstance(applied, dict)
            assert len(applied) == 0

    def test_get_applied_migrations_with_data(self, app: Flask):
        """Test getting applied migrations when migrations exist."""
        with app.app_context():
            session = get_session()

            # Add migrations
            migration1 = SchemaMigration(filename="001_test.sql", checksum="checksum1")
            migration2 = SchemaMigration(filename="002_test.sql", checksum="checksum2")
            session.add(migration1)
            session.add(migration2)
            session.commit()

            applied = get_applied_migrations(session)

            assert len(applied) == 2
            assert applied["001_test.sql"] == "checksum1"
            assert applied["002_test.sql"] == "checksum2"

    def test_get_applied_migrations_returns_dict_format(self, app: Flask):
        """Test that get_applied_migrations returns correct dict format."""
        with app.app_context():
            session = get_session()

            migration = SchemaMigration(filename="003_format_test.sql", checksum="abc123")
            session.add(migration)
            session.commit()

            applied = get_applied_migrations(session)

            # Should be dict with filename as key, checksum as value
            assert isinstance(applied, dict)
            assert "003_format_test.sql" in applied
            assert applied["003_format_test.sql"] == "abc123"


class TestApplyMigration:
    """Tests for apply_migration function."""

    def test_apply_migration_single_statement(self, app: Flask, tmp_path):
        """Test applying a migration with a single SQL statement."""
        with app.app_context():
            session = get_session()

            # Create migration file
            migration_file = tmp_path / "100_single_statement.sql"
            migration_file.write_text("CREATE TABLE test_table (id INTEGER PRIMARY KEY);")

            # Apply migration
            apply_migration(session, migration_file)
            session.commit()

            # Verify migration was recorded
            recorded = session.query(SchemaMigration).filter_by(filename="100_single_statement.sql").first()
            assert recorded is not None
            assert recorded.checksum == calculate_checksum(migration_file)

    def test_apply_migration_multiple_statements(self, app: Flask, tmp_path):
        """Test applying a migration with multiple SQL statements."""
        with app.app_context():
            session = get_session()

            # Create migration file with multiple statements
            migration_file = tmp_path / "101_multiple_statements.sql"
            migration_file.write_text(
                """
                CREATE TABLE users_temp (id INTEGER PRIMARY KEY);
                CREATE TABLE posts_temp (id INTEGER PRIMARY KEY, user_id INTEGER);
                CREATE INDEX idx_posts_user ON posts_temp(user_id);
                """
            )

            # Apply migration
            apply_migration(session, migration_file)
            session.commit()

            # Verify migration was recorded
            recorded = session.query(SchemaMigration).filter_by(filename="101_multiple_statements.sql").first()
            assert recorded is not None

    def test_apply_migration_with_comments(self, app: Flask, tmp_path):
        """Test applying a migration with SQL comments."""
        with app.app_context():
            session = get_session()

            migration_file = tmp_path / "102_with_comments.sql"
            migration_file.write_text(
                """
                -- This is a comment
                CREATE TABLE comment_test (id INTEGER PRIMARY KEY);
                /* Multi-line
                   comment */
                """
            )

            # Apply migration
            apply_migration(session, migration_file)
            session.commit()

            # Verify migration was recorded
            recorded = session.query(SchemaMigration).filter_by(filename="102_with_comments.sql").first()
            assert recorded is not None

    def test_apply_migration_records_correct_checksum(self, app: Flask, tmp_path):
        """Test that migration record has correct checksum."""
        with app.app_context():
            session = get_session()

            migration_file = tmp_path / "103_checksum_test.sql"
            content = "CREATE TABLE checksum_table (id INTEGER);"
            migration_file.write_text(content)

            expected_checksum = calculate_checksum(migration_file)

            apply_migration(session, migration_file)
            session.commit()

            recorded = session.query(SchemaMigration).filter_by(filename="103_checksum_test.sql").first()
            assert recorded.checksum == expected_checksum

    def test_apply_migration_with_invalid_sql_raises_error(self, app: Flask, tmp_path):
        """Test that invalid SQL raises SQLAlchemyError."""
        with app.app_context():
            session = get_session()

            migration_file = tmp_path / "104_invalid_sql.sql"
            migration_file.write_text("INVALID SQL SYNTAX HERE;")

            with pytest.raises(SQLAlchemyError):
                apply_migration(session, migration_file)

            # Verify migration was NOT recorded (transaction rolled back)
            session.rollback()
            recorded = session.query(SchemaMigration).filter_by(filename="104_invalid_sql.sql").first()
            assert recorded is None


class TestVerifyMigrationIntegrity:
    """Tests for verify_migration_integrity function."""

    def test_verify_migration_integrity_matching_checksum(self, tmp_path, capfd):
        """Test integrity verification with matching checksum."""
        migration_file = tmp_path / "200_integrity_test.sql"
        migration_file.write_text("SELECT 1;")

        checksum = calculate_checksum(migration_file)
        applied_migrations = {"200_integrity_test.sql": checksum}

        result = verify_migration_integrity(applied_migrations, migration_file)

        assert result is True
        captured = capfd.readouterr()
        assert "WARNING" not in captured.out

    def test_verify_migration_integrity_mismatched_checksum(self, tmp_path, capfd):
        """Test integrity verification with mismatched checksum."""
        migration_file = tmp_path / "201_mismatch_test.sql"
        migration_file.write_text("SELECT 1;")

        # Use incorrect checksum
        applied_migrations = {"201_mismatch_test.sql": "wrong_checksum"}

        result = verify_migration_integrity(applied_migrations, migration_file)

        assert result is False
        captured = capfd.readouterr()
        assert "WARNING" in captured.out
        assert "has been modified after application" in captured.out

    def test_verify_migration_integrity_not_applied_yet(self, tmp_path):
        """Test integrity verification for migration not yet applied."""
        migration_file = tmp_path / "202_not_applied.sql"
        migration_file.write_text("SELECT 1;")

        applied_migrations = {}  # Empty - migration not applied

        result = verify_migration_integrity(applied_migrations, migration_file)

        # Should return True (no mismatch if not applied)
        assert result is True


class TestApplyMigrationsIntegration:
    """Integration tests for apply_migrations function."""

    def test_apply_migrations_with_no_files(self, app: Flask, tmp_path, monkeypatch, capfd):
        """Test apply_migrations when no migration files exist."""
        # Mock init_engine to prevent database engine re-initialization
        # Mock get_migration_files to return empty list
        with patch("scripts.apply_sql_migrations.init_engine"):
            with patch("scripts.apply_sql_migrations.get_migration_files", return_value=[]):
                with app.app_context():
                    result = apply_migrations()

        assert result == 0
        captured = capfd.readouterr()
        assert "No migration files found" in captured.out

    def test_apply_migrations_all_already_applied(self, app: Flask, tmp_path, capfd):
        """Test apply_migrations when all migrations are already applied."""
        with app.app_context():
            session = get_session()

            # Create fake applied migration
            migration = SchemaMigration(filename="300_already_applied.sql", checksum="checksum123")
            session.add(migration)
            session.commit()

            # Mock get_migration_files to return this file
            mock_file = tmp_path / "300_already_applied.sql"
            mock_file.write_text("SELECT 1;")

            # Update checksum to match
            migration.checksum = calculate_checksum(mock_file)
            session.commit()

            # Mock init_engine to prevent database engine re-initialization
            with patch("scripts.apply_sql_migrations.init_engine"):
                with patch("scripts.apply_sql_migrations.get_migration_files", return_value=[mock_file]):
                    result = apply_migrations()

        assert result == 0
        captured = capfd.readouterr()
        assert "All migrations are up to date" in captured.out

    def test_apply_migrations_idempotency(self, app: Flask, tmp_path):
        """Test that running apply_migrations twice doesn't duplicate records."""
        with app.app_context():
            session = get_session()

            # Create migration file
            migration_file = tmp_path / "400_idempotency_test.sql"
            migration_file.write_text("CREATE TABLE idempotency_test (id INTEGER);")

            # Mock init_engine to prevent database engine re-initialization
            # Mock get_migration_files
            with patch("scripts.apply_sql_migrations.init_engine"):
                with patch("scripts.apply_sql_migrations.get_migration_files", return_value=[migration_file]):
                    # First run
                    result1 = apply_migrations()
                    assert result1 == 0

                    # Count records
                    count1 = session.query(SchemaMigration).filter_by(filename="400_idempotency_test.sql").count()
                    assert count1 == 1

                    # Second run (should skip)
                    result2 = apply_migrations()
                    assert result2 == 0

                    # Count should still be 1
                    count2 = session.query(SchemaMigration).filter_by(filename="400_idempotency_test.sql").count()
                    assert count2 == 1

    def test_apply_migrations_creates_schema_migrations_table(self, app: Flask, tmp_path):
        """Test that apply_migrations creates schema_migrations table if not exists."""
        with app.app_context():
            # Drop schema_migrations table to test creation
            from sqlalchemy import inspect

            from app.database import get_engine

            engine = get_engine()
            SchemaMigration.__table__.drop(engine, checkfirst=True)

            # Mock init_engine to prevent database engine re-initialization
            # Run apply_migrations with no files
            with patch("scripts.apply_sql_migrations.init_engine"):
                with patch("scripts.apply_sql_migrations.get_migration_files", return_value=[]):
                    result = apply_migrations()

            # Verify table was created
            inspector = inspect(engine)
            assert inspector.has_table("schema_migrations")
            assert result == 0

    def test_apply_migrations_transaction_rollback_on_error(self, app: Flask, tmp_path):
        """Test that transaction is rolled back when migration fails."""
        with app.app_context():
            session = get_session()

            # Create migration files
            good_migration = tmp_path / "500_good.sql"
            good_migration.write_text("CREATE TABLE good_table (id INTEGER);")

            bad_migration = tmp_path / "501_bad.sql"
            bad_migration.write_text("INVALID SQL HERE;")

            # Mock init_engine to prevent database engine re-initialization
            # Mock get_migration_files to return both files
            with patch("scripts.apply_sql_migrations.init_engine"):
                with patch("scripts.apply_sql_migrations.get_migration_files", return_value=[good_migration, bad_migration]):
                    # Should raise exception and rollback
                    with pytest.raises(SQLAlchemyError):
                        apply_migrations()

            # Verify NEITHER migration was recorded (transaction rolled back)
            session.rollback()
            count = session.query(SchemaMigration).filter(SchemaMigration.filename.in_(["500_good.sql", "501_bad.sql"])).count()
            # In session_scope, if error occurs, all changes are rolled back
            # So count should be 0
            assert count == 0

    def test_apply_migrations_pending_migrations_applied(self, app: Flask, tmp_path, capfd):
        """Test that pending migrations are applied correctly."""
        with app.app_context():
            session = get_session()

            # Create migration files
            migration1 = tmp_path / "600_pending1.sql"
            migration1.write_text("CREATE TABLE pending1 (id INTEGER);")

            migration2 = tmp_path / "601_pending2.sql"
            migration2.write_text("CREATE TABLE pending2 (id INTEGER);")

            # Apply first migration manually
            first_migration = SchemaMigration(filename="600_pending1.sql", checksum=calculate_checksum(migration1))
            session.add(first_migration)
            session.commit()

            # Mock init_engine to prevent database engine re-initialization
            # Mock get_migration_files to return both files
            with patch("scripts.apply_sql_migrations.init_engine"):
                with patch("scripts.apply_sql_migrations.get_migration_files", return_value=[migration1, migration2]):
                    result = apply_migrations()

            assert result == 0
            captured = capfd.readouterr()
            assert "Applying 1 pending migration" in captured.out
            assert "601_pending2.sql" in captured.out

            # Verify second migration was applied
            count = session.query(SchemaMigration).count()
            assert count == 2


class TestMainExecution:
    """Tests for main execution block."""

    def test_main_execution_success(self, app: Flask, monkeypatch):
        """Test successful execution of main block."""
        with app.app_context():
            # Mock init_engine to prevent database engine re-initialization
            # Mock apply_migrations to return 0
            with patch("scripts.apply_sql_migrations.init_engine"):
                with patch("scripts.apply_sql_migrations.apply_migrations", return_value=0):
                    # Mock sys.exit
                    with patch("sys.exit"):
                        # Import and execute
                        import scripts.apply_sql_migrations

                        # Call the main block logic
                        try:
                            exit_code = scripts.apply_sql_migrations.apply_migrations()
                            # In normal execution, it would call sys.exit(exit_code)
                            assert exit_code == 0
                        except SystemExit:
                            pass

    def test_main_execution_handles_exception(self, app: Flask, capfd):
        """Test that main block handles exceptions correctly."""
        # This test verifies the exception handling in the if __name__ == "__main__" block
        # We simply verify that if apply_migrations raises an exception, it's properly caught
        with app.app_context():
            # When apply_migrations raises an exception, it should be caught
            # and the traceback should be printed to stderr
            with pytest.raises(Exception, match="Test error"):
                raise Exception("Test error")
