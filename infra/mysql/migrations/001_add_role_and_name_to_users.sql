-- Migration: Add role and name columns to users table
-- Date: 2025-11-07
-- Description: Adds role (ENUM) and name (VARCHAR) columns for user management feature
--
-- IMPORTANT: This migration is for EXISTING databases only.
-- New installations should use infra/mysql/init/001_init.sql instead.
--
-- Usage:
--   mysql -u root -p app_db < infra/mysql/migrations/001_add_role_and_name_to_users.sql
--
-- Or via Docker:
--   docker exec -i fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db < infra/mysql/migrations/001_add_role_and_name_to_users.sql

-- Note: Database is already selected by SQLAlchemy connection, no USE statement needed

-- Step 1: Add role column with default value
-- All existing users will be assigned 'user' role by default
ALTER TABLE users
  ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user'
  AFTER password_hash;

-- Step 2: Add name column (nullable for backward compatibility)
ALTER TABLE users
  ADD COLUMN name VARCHAR(100) NULL
  AFTER role;

-- Step 3: Create index on role column for performance
-- This index is used when filtering users by role (e.g., admin list queries)
CREATE INDEX idx_users_role ON users (role);

-- Verification query (optional - you can run this separately to check results)
-- SELECT id, email, role, name, created_at FROM users LIMIT 10;
