#!/usr/bin/env python
"""Script to grant database permissions to IAM user.

This script grants necessary permissions to the IAM service account user
so that it can create tables and manage the database.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google.cloud.sql.connector import Connector

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment variables if .env file exists
env_file = backend_dir / ".env"
if env_file.exists():
    load_dotenv(env_file)


def grant_permissions():
    """Grant permissions to IAM user using password-based admin connection."""
    # Get configuration from environment
    instance_connection_name = os.getenv("CLOUDSQL_INSTANCE")
    iam_user = os.getenv("DB_USER")  # IAM user email
    db_name = os.getenv("DB_NAME")
    admin_user = os.getenv("ADMIN_USER", "app_user")  # Password-based admin
    admin_password = os.getenv("ADMIN_PASSWORD")
    ip_type = os.getenv("CLOUDSQL_IP_TYPE", "PRIVATE").upper()

    if not all([instance_connection_name, iam_user, db_name, admin_password]):
        print("❌ Error: Required environment variables not set")
        print("Required: CLOUDSQL_INSTANCE, DB_USER, DB_NAME, ADMIN_PASSWORD")
        return 1

    print(f"Connecting to Cloud SQL as admin user: {admin_user}")
    print(f"Instance: {instance_connection_name}")
    print(f"Database: {db_name}")
    print(f"IAM User: {iam_user}")
    print(f"IP Type: {ip_type}")

    connector = Connector()

    try:
        # Connect using password-based admin user
        conn = connector.connect(
            instance_connection_name,
            "pymysql",
            user=admin_user,
            password=admin_password,
            db=db_name,
            ip_type=ip_type,
        )

        cursor = conn.cursor()

        # Grant all privileges to IAM user on the database
        print(f"\nGranting privileges to IAM user: {iam_user}")

        # Remove '@' and everything after it for MySQL username
        # IAM users in Cloud SQL use email format but MySQL expects just the local part
        mysql_username = iam_user.split("@")[0]

        grant_queries = [
            f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{mysql_username}'@'%';",
            "FLUSH PRIVILEGES;",
        ]

        for query in grant_queries:
            print(f"Executing: {query}")
            cursor.execute(query)

        conn.commit()
        print("✅ Privileges granted successfully!")

        # Verify grants
        cursor.execute(f"SHOW GRANTS FOR '{mysql_username}'@'%';")
        grants = cursor.fetchall()
        print("\nCurrent grants:")
        for grant in grants:
            print(f"  {grant[0]}")

        cursor.close()
        conn.close()
        connector.close()

        return 0

    except Exception as e:
        print(f"❌ Error granting permissions: {e}")
        import traceback

        traceback.print_exc()
        connector.close()
        return 1


if __name__ == "__main__":
    sys.exit(grant_permissions())
