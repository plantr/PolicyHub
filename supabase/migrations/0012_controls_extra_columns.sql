-- Add missing columns to controls table for spreadsheet import mapping
ALTER TABLE controls ADD COLUMN IF NOT EXISTS framework_sections text;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS related_policies text;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS primary_source_url text;
