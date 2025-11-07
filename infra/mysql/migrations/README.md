# Database Migrations

This directory contains SQL migration scripts for updating existing database schemas.

## Important Notes

- **New installations**: Use `infra/mysql/init/001_init.sql` for initial setup (automatically executed by Docker Compose)
- **Existing databases (Local)**: Apply migration scripts using `apply_sql_migrations.py` script
- **CI/CD environments (Production/Staging)**: Migrations are **automatically applied** during deployment

## Migration Files

| File | Date | Description |
|------|------|-------------|
| `001_add_role_and_name_to_users.sql` | 2025-11-07 | Add `role` and `name` columns to `users` table |

## How to Apply Migrations

### Recommended Method: Automated Script (Local Development)

**This is the recommended approach for local development:**

```bash
# Apply all pending migrations
poetry -C backend run python scripts/apply_sql_migrations.py
```

**Features:**
- ✅ Automatically detects pending migrations
- ✅ Tracks applied migrations in `schema_migrations` table
- ✅ Prevents duplicate execution (idempotent)
- ✅ Validates file integrity with checksums
- ✅ Executes migrations in alphabetical order

**Example output:**
```
🔗 Connecting to database...
📋 Creating schema_migrations table if not exists...
📂 Found 2 migration file(s)
✓ 1 migration(s) already applied

🚀 Applying 1 pending migration(s)...
  📄 Applying migration: 002_add_status_column.sql
    ✓ Executed statement 1/2
    ✓ Executed statement 2/2
  ✅ Migration 002_add_status_column.sql applied successfully

✅ All migrations applied successfully!
```

### CI/CD Environments (Automatic)

**Production and staging environments use automatic migration:**

Migrations are automatically applied during deployment via GitHub Actions:

1. GitHub Actions triggers deployment workflow
2. Cloud Run Job executes `scripts/run_migrations.sh`
   - Step 1: Create tables (new tables only)
   - Step 2: **Apply SQL migrations** (schema changes)
   - Step 3: Grant IAM permissions
3. Application deploys only after successful migration
4. If migration fails, deployment is aborted

**No manual intervention required for production deployments.**

### Manual Methods (For Troubleshooting Only)

#### Method 1: Via Docker

```bash
# Ensure database container is running
docker ps | grep db

# Apply specific migration
docker exec -i fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db \
  < infra/mysql/migrations/001_add_role_and_name_to_users.sql

# Verify changes
docker exec -it fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db \
  -e "DESCRIBE users;"
```

⚠️ **Warning:** Manual execution bypasses migration tracking. The `schema_migrations` table will not be updated.

#### Method 2: Direct MySQL Connection

```bash
# Connect to MySQL server
mysql -u root -p app_db < infra/mysql/migrations/001_add_role_and_name_to_users.sql

# Verify changes
mysql -u root -p app_db -e "DESCRIBE users;"
```

#### Method 3: Cloud SQL (GCP) - Emergency Only

```bash
# For emergency fixes only - not recommended for routine deployments
gcloud sql connect <INSTANCE_NAME> --user=root < infra/mysql/migrations/001_add_role_and_name_to_users.sql
```

⚠️ **Warning:** Use only in emergencies. Normal deployments handle migrations automatically.

## Verification

After applying migrations, verify the schema changes:

```sql
-- Check migration history
SELECT * FROM schema_migrations ORDER BY applied_at DESC;

-- Check column structure
DESCRIBE users;

-- Check indexes
SHOW INDEX FROM users;

-- Verify existing users have default role
SELECT id, email, role, name FROM users LIMIT 10;
```

**Example migration history:**
```
+----+----------------------------------+------------------------------------------------------------------+---------------------+
| id | filename                         | checksum                                                         | applied_at          |
+----+----------------------------------+------------------------------------------------------------------+---------------------+
|  1 | 001_add_role_and_name_to_users.sql| 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069 | 2025-11-07 10:30:45 |
+----+----------------------------------+------------------------------------------------------------------+---------------------+
```

## Rollback

**WARNING: Rolling back migrations may result in data loss!**

If you need to rollback migration `001`:

```sql
USE app_db;

-- Remove role index
DROP INDEX idx_users_role ON users;

-- Remove columns (WARNING: This will delete all role and name data!)
ALTER TABLE users
  DROP COLUMN name,
  DROP COLUMN role;
```

## Best Practices

1. **Backup First**: Always backup your database before applying migrations
   ```bash
   docker exec fullstack-app-with-claude-db-1 mysqldump -u root -ppassword app_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on Staging**: Apply migrations to staging environment first

3. **Review Migration**: Read the SQL file carefully before executing

4. **Monitor Application**: Check application logs after migration for any errors

5. **Version Control**: Keep migration files in version control (already done)

## Migration Development Workflow

When adding new database schema changes:

1. **Update SQLAlchemy models** in `backend/app/models/`
   ```bash
   vim backend/app/models/user.py
   ```

2. **Update SQL initialization file** `infra/mysql/init/001_init.sql`
   - This ensures new installations have the correct schema

3. **Create migration script** in this directory with sequential numbering
   ```bash
   # Create new migration file
   vim infra/mysql/migrations/002_add_status_column.sql
   ```
   - Use format: `NNN_description.sql` (e.g., `002_add_status_column.sql`)
   - Write SQL statements to modify existing schema

4. **Test migration on local development database**
   ```bash
   # Apply migration locally
   poetry -C backend run python scripts/apply_sql_migrations.py

   # Verify changes
   docker exec -it fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db \
     -e "SELECT * FROM schema_migrations;"

   # Run tests to ensure application works
   make test
   ```

5. **Document migration in this README**
   - Add entry to the "Migration Files" table above

6. **Commit all changes together**
   ```bash
   git add backend/app/models/ infra/mysql/init/ infra/mysql/migrations/
   git commit -m "feat(db): add status column to users table"
   git push origin feature/add-user-status
   ```

7. **CI/CD automatically applies migration**
   - After merging to `main`, GitHub Actions deploys to production
   - Migration runs before application deployment
   - No manual intervention required

## Best Practices

### DO:
- ✅ Test migrations locally before committing
- ✅ Use sequential numbering for migration files
- ✅ Write idempotent migrations when possible
- ✅ Keep migrations small and focused
- ✅ Document breaking changes in commit messages
- ✅ Update both SQLAlchemy models and SQL files

### DON'T:
- ❌ Modify migration files after they've been applied
- ❌ Delete migration files from version control
- ❌ Skip migration files in numbering sequence
- ❌ Combine unrelated schema changes in one migration
- ❌ Apply migrations manually in production (use CI/CD)
