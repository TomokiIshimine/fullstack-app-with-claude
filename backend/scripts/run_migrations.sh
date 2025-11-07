#!/bin/bash
# Migration script that:
# 1. Creates tables using password-based admin user
# 2. Applies SQL migrations from infra/mysql/migrations/
# 3. Grants permissions to IAM user for application access

set -e  # Exit on error

echo "========================================="
echo "Step 1: Creating database tables"
echo "========================================="
python scripts/create_tables.py

echo ""
echo "========================================="
echo "Step 2: Applying SQL migrations"
echo "========================================="
python scripts/apply_sql_migrations.py

echo ""
echo "========================================="
echo "Step 3: Granting permissions to IAM user"
echo "========================================="

# Set up environment for grant script
export ADMIN_USER="${DB_USER}"
export ADMIN_PASSWORD="${DB_PASS}"

# IAM user email from Terraform
IAM_USER_EMAIL="${IAM_USER_EMAIL:-}"

if [ -z "$IAM_USER_EMAIL" ]; then
    echo "⚠️  Warning: IAM_USER_EMAIL not set, skipping IAM permission grant"
    echo "   Application will use password-based authentication"
    exit 0
fi

echo "Granting permissions to IAM user: $IAM_USER_EMAIL"

# Create temporary Python script for granting permissions
cat > /tmp/grant_permissions.py << 'EOFPYTHON'
import os
import sys
from google.cloud.sql.connector import Connector
import pymysql

def grant_permissions():
    instance_connection_name = os.getenv("CLOUDSQL_INSTANCE")
    iam_user_email = os.getenv("IAM_USER_EMAIL")
    db_name = os.getenv("DB_NAME")
    admin_user = os.getenv("ADMIN_USER")
    admin_password = os.getenv("ADMIN_PASSWORD")
    ip_type = os.getenv("CLOUDSQL_IP_TYPE", "PRIVATE")

    if not all([instance_connection_name, iam_user_email, db_name, admin_user, admin_password]):
        print("❌ Missing required environment variables")
        return 1

    print(f"Instance: {instance_connection_name}")
    print(f"Database: {db_name}")
    print(f"IAM User: {iam_user_email}")
    print(f"Admin User: {admin_user}")

    connector = Connector()

    try:
        conn = connector.connect(
            instance_connection_name,
            "pymysql",
            user=admin_user,
            password=admin_password,
            db=db_name,
            ip_type=ip_type,
        )

        cursor = conn.cursor()

        # Extract username from email (before @)
        mysql_username = iam_user_email.split("@")[0]

        # Grant privileges
        grant_query = f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{mysql_username}'@'%'"
        print(f"Executing: {grant_query}")
        cursor.execute(grant_query)

        cursor.execute("FLUSH PRIVILEGES")
        conn.commit()

        print("✅ IAM user permissions granted successfully")

        cursor.close()
        conn.close()
        connector.close()
        return 0

    except Exception as e:
        print(f"❌ Error granting permissions: {e}")
        connector.close()
        return 1

if __name__ == "__main__":
    sys.exit(grant_permissions())
EOFPYTHON

python /tmp/grant_permissions.py
rm /tmp/grant_permissions.py

echo ""
echo "========================================="
echo "✅ Migration completed successfully!"
echo "========================================="
