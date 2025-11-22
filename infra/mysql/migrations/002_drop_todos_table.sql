-- Migration: Drop todos table
-- Date: 2025-11-22
-- Description: Removes the todos table as the TODO feature has been removed from the application
--
-- IMPORTANT: This migration is for EXISTING databases only.
-- New installations should use infra/mysql/init/001_init.sql instead (which already excludes todos table).
--
-- Usage:
--   mysql -u root -p app_db < infra/mysql/migrations/002_drop_todos_table.sql
--
-- Or via Docker:
--   docker exec -i fullstack-app-with-claude-db-1 mysql -u root -ppassword app_db < infra/mysql/migrations/002_drop_todos_table.sql

-- Note: Database is already selected by SQLAlchemy connection, no USE statement needed

-- Drop todos table if it exists
-- This will automatically remove all associated indexes and foreign key constraints
DROP TABLE IF EXISTS todos;

-- Verification query (optional - should return empty result if successful)
-- SHOW TABLES LIKE 'todos';
