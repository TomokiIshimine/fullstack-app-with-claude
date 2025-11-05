from __future__ import annotations

from unittest.mock import MagicMock, Mock, patch

import pytest

from app.config import CloudSQLConfig, DatabaseConfig, load_cloud_sql_config, load_database_config
from app.database import (
    _convert_ip_type_to_enum,
    _create_connection_factory,
    _create_standard_engine,
    _mask_password_in_uri,
    cleanup_connector,
    init_engine,
)

# Import IPTypes for testing
try:
    from google.cloud.sql.connector import IPTypes

    IPTYPES_AVAILABLE = True
except ImportError:
    IPTYPES_AVAILABLE = False
    IPTypes = None  # type: ignore


class TestDatabaseConfig:
    """Tests for DatabaseConfig and related loading functions."""

    def test_load_database_config_defaults(self, monkeypatch: pytest.MonkeyPatch):
        """Test loading database config with default values."""
        monkeypatch.delenv("USE_CLOUD_SQL_CONNECTOR", raising=False)
        monkeypatch.delenv("DB_POOL_SIZE", raising=False)
        monkeypatch.delenv("DB_MAX_OVERFLOW", raising=False)

        config = load_database_config()

        assert config.use_cloud_sql_connector is False
        assert config.pool_size == 5
        assert config.max_overflow == 10

    def test_load_database_config_custom_values(self, monkeypatch: pytest.MonkeyPatch):
        """Test loading database config with custom environment variables."""
        monkeypatch.setenv("USE_CLOUD_SQL_CONNECTOR", "true")
        monkeypatch.setenv("DATABASE_URL", "mysql://custom:pass@host:3306/db")
        monkeypatch.setenv("DB_POOL_SIZE", "10")
        monkeypatch.setenv("DB_MAX_OVERFLOW", "20")

        config = load_database_config()

        assert config.use_cloud_sql_connector is True
        assert config.database_uri == "mysql://custom:pass@host:3306/db"
        assert config.pool_size == 10
        assert config.max_overflow == 20

    def test_load_database_config_bool_variations(self, monkeypatch: pytest.MonkeyPatch):
        """Test that USE_CLOUD_SQL_CONNECTOR handles various boolean strings."""
        test_cases = [
            ("true", True),
            ("True", True),
            ("TRUE", True),
            ("false", False),
            ("False", False),
            ("FALSE", False),
            ("yes", False),  # Only "true" (case-insensitive) should be True
            ("1", False),
        ]

        for env_value, expected in test_cases:
            monkeypatch.setenv("USE_CLOUD_SQL_CONNECTOR", env_value)
            config = load_database_config()
            assert config.use_cloud_sql_connector is expected, f"Failed for USE_CLOUD_SQL_CONNECTOR={env_value}"


class TestCloudSQLConfig:
    """Tests for CloudSQLConfig and related loading functions."""

    def test_load_cloud_sql_config_with_password_auth(self, monkeypatch: pytest.MonkeyPatch):
        """Test loading Cloud SQL config with password authentication."""
        monkeypatch.setenv("CLOUDSQL_INSTANCE", "project:region:instance")
        monkeypatch.setenv("DB_USER", "testuser")
        monkeypatch.setenv("DB_NAME", "testdb")
        monkeypatch.setenv("DB_PASS", "testpassword")
        monkeypatch.setenv("ENABLE_IAM_AUTH", "false")

        config = load_cloud_sql_config()

        assert config.instance_connection_name == "project:region:instance"
        assert config.db_user == "testuser"
        assert config.db_name == "testdb"
        assert config.db_pass == "testpassword"
        assert config.enable_iam_auth is False

    def test_load_cloud_sql_config_with_iam_auth(self, monkeypatch: pytest.MonkeyPatch):
        """Test loading Cloud SQL config with IAM authentication."""
        monkeypatch.setenv("CLOUDSQL_INSTANCE", "project:region:instance")
        monkeypatch.setenv("DB_USER", "testuser@project.iam")
        monkeypatch.setenv("DB_NAME", "testdb")
        monkeypatch.setenv("ENABLE_IAM_AUTH", "true")
        monkeypatch.delenv("DB_PASS", raising=False)

        config = load_cloud_sql_config()

        assert config.instance_connection_name == "project:region:instance"
        assert config.db_user == "testuser@project.iam"
        assert config.db_name == "testdb"
        assert config.db_pass is None
        assert config.enable_iam_auth is True
        assert config.ip_type == "PRIVATE"  # Default value

    def test_load_cloud_sql_config_missing_required_fields(self, monkeypatch: pytest.MonkeyPatch):
        """Test that ValueError is raised when required fields are missing."""
        monkeypatch.delenv("CLOUDSQL_INSTANCE", raising=False)
        monkeypatch.delenv("DB_USER", raising=False)
        monkeypatch.delenv("DB_NAME", raising=False)

        with pytest.raises(ValueError, match="CLOUDSQL_INSTANCE, DB_USER, and DB_NAME must be set"):
            load_cloud_sql_config()

    def test_load_cloud_sql_config_missing_password_without_iam(self, monkeypatch: pytest.MonkeyPatch):
        """Test that ValueError is raised when password is missing and IAM auth is disabled."""
        monkeypatch.setenv("CLOUDSQL_INSTANCE", "project:region:instance")
        monkeypatch.setenv("DB_USER", "testuser")
        monkeypatch.setenv("DB_NAME", "testdb")
        monkeypatch.setenv("ENABLE_IAM_AUTH", "false")
        monkeypatch.delenv("DB_PASS", raising=False)

        with pytest.raises(ValueError, match="DB_PASS must be set when ENABLE_IAM_AUTH=false"):
            load_cloud_sql_config()

    def test_load_cloud_sql_config_custom_ip_type(self, monkeypatch: pytest.MonkeyPatch):
        """Test Cloud SQL config with custom IP type."""
        monkeypatch.setenv("CLOUDSQL_INSTANCE", "project:region:instance")
        monkeypatch.setenv("DB_USER", "testuser")
        monkeypatch.setenv("DB_NAME", "testdb")
        monkeypatch.setenv("DB_PASS", "password")
        monkeypatch.setenv("ENABLE_IAM_AUTH", "false")
        monkeypatch.setenv("CLOUDSQL_IP_TYPE", "public")  # lowercase

        config = load_cloud_sql_config()

        assert config.ip_type == "PUBLIC"  # Should be uppercased

    def test_load_cloud_sql_config_invalid_ip_type(self, monkeypatch: pytest.MonkeyPatch):
        """Test that ValueError is raised for invalid IP type."""
        monkeypatch.setenv("CLOUDSQL_INSTANCE", "project:region:instance")
        monkeypatch.setenv("DB_USER", "testuser")
        monkeypatch.setenv("DB_NAME", "testdb")
        monkeypatch.setenv("DB_PASS", "password")
        monkeypatch.setenv("ENABLE_IAM_AUTH", "false")
        monkeypatch.setenv("CLOUDSQL_IP_TYPE", "INVALID")

        with pytest.raises(ValueError, match="CLOUDSQL_IP_TYPE must be 'PRIVATE' or 'PUBLIC'"):
            load_cloud_sql_config()


class TestPasswordMasking:
    """Tests for password masking functionality."""

    def test_mask_password_in_uri_with_password(self):
        """Test masking password in database URI."""
        uri = "mysql+pymysql://user:secret123@localhost:3306/db"
        masked = _mask_password_in_uri(uri)
        assert masked == "mysql+pymysql://user:***@localhost:3306/db"

    def test_mask_password_in_uri_without_password(self):
        """Test URI without password remains unchanged."""
        uri = "mysql+pymysql://user@localhost:3306/db"
        masked = _mask_password_in_uri(uri)
        assert masked == uri

    def test_mask_password_in_uri_no_at_sign(self):
        """Test URI without @ sign remains unchanged."""
        uri = "sqlite:///database.db"
        masked = _mask_password_in_uri(uri)
        assert masked == uri

    def test_mask_password_in_uri_complex_password(self):
        """Test masking complex password with special characters (no @ in password)."""
        # Note: Passwords with @ character are not properly handled by the simple masking logic
        # In practice, @ should be URL-encoded in connection strings
        uri = "mysql+pymysql://user:p$ss!w0rd#123@localhost:3306/db"
        masked = _mask_password_in_uri(uri)
        # Should mask the password part
        assert "p$ss!w0rd#123" not in masked
        assert "user:***@localhost" in masked


class TestStandardEngine:
    """Tests for standard engine creation."""

    def test_create_standard_engine_applies_pool_config(self):
        """Test that pool configuration is applied to standard engine (MySQL)."""
        # Use MySQL URI to test pool configuration
        # Note: This doesn't actually connect, just creates the engine
        db_config = DatabaseConfig(
            use_cloud_sql_connector=False,
            database_uri="mysql+pymysql://user:pass@localhost:3306/testdb",
            pool_size=10,
            max_overflow=20,
        )

        engine = _create_standard_engine(db_config)

        assert engine is not None
        assert engine.pool.size() == 10
        assert engine.pool._max_overflow == 20

        # Cleanup
        engine.dispose()

    def test_create_standard_engine_sqlite_no_pool_config(self):
        """Test that SQLite engine is created without pool_size/max_overflow."""
        db_config = DatabaseConfig(
            use_cloud_sql_connector=False,
            database_uri="sqlite:///:memory:",
            pool_size=10,  # Should be ignored for SQLite
            max_overflow=20,  # Should be ignored for SQLite
        )

        # Should not raise TypeError about invalid arguments
        engine = _create_standard_engine(db_config)

        assert engine is not None

        # Cleanup
        engine.dispose()

    def test_create_standard_engine_uses_database_uri(self):
        """Test that standard engine uses the provided database URI."""
        db_config = DatabaseConfig(
            use_cloud_sql_connector=False,
            database_uri="sqlite:///:memory:",
        )

        engine = _create_standard_engine(db_config)

        assert engine is not None
        assert "sqlite" in str(engine.url)

        # Cleanup
        engine.dispose()


class TestCloudSQLEngine:
    """Tests for Cloud SQL engine creation."""

    @patch("app.database.CLOUD_SQL_AVAILABLE", True)
    @patch("app.database.Connector")
    def test_create_cloud_sql_engine_with_iam_auth(self, mock_connector_class: Mock):
        """Test Cloud SQL engine creation with IAM authentication."""
        # Mock connector instance
        mock_connector = MagicMock()
        mock_connector_class.return_value = mock_connector

        # Mock connection
        mock_conn = MagicMock()
        mock_connector.connect.return_value = mock_conn

        db_config = DatabaseConfig(
            use_cloud_sql_connector=True,
            database_uri="",  # Not used in Cloud SQL mode
            pool_size=5,
            max_overflow=10,
        )
        cloud_sql_config = CloudSQLConfig(
            instance_connection_name="project:region:instance",
            db_user="testuser@project.iam",
            db_name="testdb",
            db_pass=None,
            enable_iam_auth=True,
        )

        # Import and patch within the function
        from app.database import _create_cloud_sql_engine

        engine = _create_cloud_sql_engine(db_config, cloud_sql_config)

        # Verify connector was created
        mock_connector_class.assert_called_once()

        # Verify engine configuration
        assert engine is not None
        assert engine.pool.size() == 5
        assert engine.pool._max_overflow == 10

        # Test the connection factory by calling creator
        creator_func = engine.pool._creator
        creator_func()

        # Verify connector.connect was called with IAM auth and IPTypes.PRIVATE
        if IPTYPES_AVAILABLE and IPTypes:
            expected_ip_type = IPTypes.PRIVATE
        else:
            expected_ip_type = "PRIVATE"  # Fallback for test environment without IPTypes

        mock_connector.connect.assert_called_once_with(
            "project:region:instance",
            "pymysql",
            ip_type=expected_ip_type,
            user="testuser@project.iam",
            db="testdb",
            enable_iam_auth=True,
        )

        # Cleanup
        engine.dispose()

    @patch("app.database.CLOUD_SQL_AVAILABLE", True)
    @patch("app.database.Connector")
    def test_create_cloud_sql_engine_with_password_auth(self, mock_connector_class: Mock):
        """Test Cloud SQL engine creation with password authentication."""
        # Mock connector instance
        mock_connector = MagicMock()
        mock_connector_class.return_value = mock_connector

        # Mock connection
        mock_conn = MagicMock()
        mock_connector.connect.return_value = mock_conn

        db_config = DatabaseConfig(
            use_cloud_sql_connector=True,
            database_uri="",
            pool_size=5,
            max_overflow=10,
        )
        cloud_sql_config = CloudSQLConfig(
            instance_connection_name="project:region:instance",
            db_user="testuser",
            db_name="testdb",
            db_pass="testpassword",
            enable_iam_auth=False,
        )

        from app.database import _create_cloud_sql_engine

        engine = _create_cloud_sql_engine(db_config, cloud_sql_config)

        # Verify connector was created
        mock_connector_class.assert_called_once()

        # Test the connection factory
        creator_func = engine.pool._creator
        creator_func()

        # Verify connector.connect was called with password and IPTypes.PRIVATE
        if IPTYPES_AVAILABLE and IPTypes:
            expected_ip_type = IPTypes.PRIVATE
        else:
            expected_ip_type = "PRIVATE"

        mock_connector.connect.assert_called_once_with(
            "project:region:instance",
            "pymysql",
            ip_type=expected_ip_type,
            user="testuser",
            db="testdb",
            password="testpassword",
        )

        # Cleanup
        engine.dispose()

    @patch("app.database.CLOUD_SQL_AVAILABLE", False)
    @patch("app.database.Connector", None)
    def test_create_cloud_sql_engine_not_available(self):
        """Test that RuntimeError is raised when Cloud SQL Connector is not available."""
        db_config = DatabaseConfig(
            use_cloud_sql_connector=True,
            database_uri="",
        )
        cloud_sql_config = CloudSQLConfig(
            instance_connection_name="project:region:instance",
            db_user="testuser",
            db_name="testdb",
            db_pass="testpassword",
            enable_iam_auth=False,
        )

        from app.database import _create_cloud_sql_engine

        with pytest.raises(RuntimeError, match="Cloud SQL Connector is not installed"):
            _create_cloud_sql_engine(db_config, cloud_sql_config)


class TestIPTypeConversion:
    """Tests for IP type string to enum conversion."""

    @patch("app.database.CLOUD_SQL_AVAILABLE", True)
    @patch("app.database.IPTypes")
    def test_convert_ip_type_private(self, mock_iptypes: Mock):
        """Test converting 'PRIVATE' string to IPTypes.PRIVATE."""
        mock_iptypes.PRIVATE = "IPTypes.PRIVATE"
        mock_iptypes.PUBLIC = "IPTypes.PUBLIC"

        result = _convert_ip_type_to_enum("PRIVATE")
        assert result == "IPTypes.PRIVATE"

    @patch("app.database.CLOUD_SQL_AVAILABLE", True)
    @patch("app.database.IPTypes")
    def test_convert_ip_type_public(self, mock_iptypes: Mock):
        """Test converting 'PUBLIC' string to IPTypes.PUBLIC."""
        mock_iptypes.PRIVATE = "IPTypes.PRIVATE"
        mock_iptypes.PUBLIC = "IPTypes.PUBLIC"

        result = _convert_ip_type_to_enum("PUBLIC")
        assert result == "IPTypes.PUBLIC"

    @patch("app.database.CLOUD_SQL_AVAILABLE", True)
    @patch("app.database.IPTypes")
    def test_convert_ip_type_invalid(self, mock_iptypes: Mock):
        """Test that ValueError is raised for invalid IP type."""
        with pytest.raises(ValueError, match="Invalid IP type"):
            _convert_ip_type_to_enum("INVALID")

    @patch("app.database.CLOUD_SQL_AVAILABLE", False)
    def test_convert_ip_type_not_available(self):
        """Test that RuntimeError is raised when Cloud SQL Connector is not available."""
        with pytest.raises(RuntimeError, match="Cloud SQL Connector is not available"):
            _convert_ip_type_to_enum("PRIVATE")


class TestConnectionFactory:
    """Tests for connection factory function."""

    @patch("app.database.Connector")
    def test_connection_factory_iam_auth(self, mock_connector_class: Mock):
        """Test connection factory with IAM authentication."""
        mock_connector = MagicMock()
        mock_conn = MagicMock()
        mock_connector.connect.return_value = mock_conn

        cloud_sql_config = CloudSQLConfig(
            instance_connection_name="project:region:instance",
            db_user="testuser@project.iam",
            db_name="testdb",
            db_pass=None,
            enable_iam_auth=True,
        )

        getconn = _create_connection_factory(cloud_sql_config, mock_connector)
        result = getconn()

        assert result == mock_conn

        if IPTYPES_AVAILABLE and IPTypes:
            expected_ip_type = IPTypes.PRIVATE
        else:
            expected_ip_type = "PRIVATE"

        mock_connector.connect.assert_called_once_with(
            "project:region:instance",
            "pymysql",
            ip_type=expected_ip_type,
            user="testuser@project.iam",
            db="testdb",
            enable_iam_auth=True,
        )

    @patch("app.database.Connector")
    def test_connection_factory_password_auth(self, mock_connector_class: Mock):
        """Test connection factory with password authentication."""
        mock_connector = MagicMock()
        mock_conn = MagicMock()
        mock_connector.connect.return_value = mock_conn

        cloud_sql_config = CloudSQLConfig(
            instance_connection_name="project:region:instance",
            db_user="testuser",
            db_name="testdb",
            db_pass="secret123",
            enable_iam_auth=False,
        )

        getconn = _create_connection_factory(cloud_sql_config, mock_connector)
        result = getconn()

        assert result == mock_conn

        if IPTYPES_AVAILABLE and IPTypes:
            expected_ip_type = IPTypes.PRIVATE
        else:
            expected_ip_type = "PRIVATE"

        mock_connector.connect.assert_called_once_with(
            "project:region:instance",
            "pymysql",
            ip_type=expected_ip_type,
            user="testuser",
            db="testdb",
            password="secret123",
        )


class TestInitEngine:
    """Tests for init_engine function."""

    def test_init_engine_standard_mode(self, monkeypatch: pytest.MonkeyPatch):
        """Test init_engine with standard connection mode."""
        monkeypatch.setenv("USE_CLOUD_SQL_CONNECTOR", "false")
        monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")

        init_engine("sqlite:///:memory:")

        from app.database import get_engine

        engine = get_engine()
        assert engine is not None
        assert "sqlite" in str(engine.url)

        # Cleanup
        engine.dispose()

    def test_init_engine_backward_compatibility(self, monkeypatch: pytest.MonkeyPatch):
        """Test that init_engine maintains backward compatibility with database_uri parameter."""
        monkeypatch.setenv("USE_CLOUD_SQL_CONNECTOR", "false")

        # Even if DATABASE_URL is not set, database_uri parameter should work
        monkeypatch.delenv("DATABASE_URL", raising=False)

        init_engine("sqlite:///:memory:")

        from app.database import get_engine

        engine = get_engine()
        assert engine is not None

        # Cleanup
        engine.dispose()

    @patch("app.database.CLOUD_SQL_AVAILABLE", True)
    @patch("app.database.Connector")
    def test_init_engine_cloud_sql_mode(self, mock_connector_class: Mock, monkeypatch: pytest.MonkeyPatch):
        """Test init_engine with Cloud SQL Connector mode."""
        # Mock connector
        mock_connector = MagicMock()
        mock_connector_class.return_value = mock_connector
        mock_connector.connect.return_value = MagicMock()

        # Set environment variables for Cloud SQL mode
        monkeypatch.setenv("USE_CLOUD_SQL_CONNECTOR", "true")
        monkeypatch.setenv("CLOUDSQL_INSTANCE", "project:region:instance")
        monkeypatch.setenv("DB_USER", "testuser")
        monkeypatch.setenv("DB_NAME", "testdb")
        monkeypatch.setenv("DB_PASS", "testpassword")
        monkeypatch.setenv("ENABLE_IAM_AUTH", "false")

        # database_uri parameter should be ignored in Cloud SQL mode
        init_engine("this-should-be-ignored")

        from app.database import get_engine

        engine = get_engine()
        assert engine is not None

        # Verify connector was created
        mock_connector_class.assert_called_once()

        # Cleanup
        engine.dispose()
        cleanup_connector()


class TestCleanupConnector:
    """Tests for cleanup_connector function."""

    @patch("app.database._connector")
    def test_cleanup_connector_when_exists(self, mock_connector: Mock):
        """Test cleanup_connector when connector exists."""
        mock_connector.close = MagicMock()

        # Manually set global connector for testing
        import app.database

        app.database._connector = mock_connector

        cleanup_connector()

        # Verify close was called
        mock_connector.close.assert_called_once()

        # Verify connector is set to None
        assert app.database._connector is None

    def test_cleanup_connector_when_none(self):
        """Test cleanup_connector when connector is None (should not raise error)."""
        import app.database

        app.database._connector = None

        # Should not raise any exception
        cleanup_connector()

        assert app.database._connector is None
