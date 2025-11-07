# Database Migrations

This directory contains SQL migration scripts for updating existing database schemas.

## Important Notes

- **New installations**: Use `infra/mysql/init/001_init.sql` for initial setup (automatically executed by Docker Compose)
- **Existing databases**: Apply migration scripts from this directory manually

## Migration Files

| File | Date | Description |
|------|------|-------------|
| `001_add_role_and_name_to_users.sql` | 2025-11-07 | Add `role` and `name` columns to `users` table |

## How to Apply Migrations

### Method 1: Via Docker (Recommended)

```bash
# Ensure database container is running
docker ps | grep db

# Apply migration
docker exec -i fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db \
  < infra/mysql/migrations/001_add_role_and_name_to_users.sql

# Verify changes
docker exec -it fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db \
  -e "DESCRIBE users;"
```

### Method 2: Direct MySQL Connection

```bash
# Connect to MySQL server
mysql -u root -p app_db < infra/mysql/migrations/001_add_role_and_name_to_users.sql

# Verify changes
mysql -u root -p app_db -e "DESCRIBE users;"
```

### Method 3: Cloud SQL (GCP)

```bash
# Upload migration file
gcloud sql connect <INSTANCE_NAME> --user=root < infra/mysql/migrations/001_add_role_and_name_to_users.sql
```

## Verification

After applying migrations, verify the schema changes:

```sql
-- Check column structure
DESCRIBE users;

-- Check indexes
SHOW INDEX FROM users;

-- Verify existing users have default role
SELECT id, email, role, name FROM users LIMIT 10;
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

1. Update SQLAlchemy models in `backend/app/models/`
2. Update SQL initialization file `infra/mysql/init/001_init.sql`
3. Create migration script in this directory with sequential numbering
4. Test migration on local development database
5. Document migration in this README
6. Commit all changes together
