-- Add budget column to projects table
-- Existing RLS policies (001_initial_schema.sql) already cover all columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(12, 2);
