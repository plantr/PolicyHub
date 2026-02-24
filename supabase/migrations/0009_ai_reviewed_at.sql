-- Add AI review timestamp to documents
ALTER TABLE documents ADD COLUMN ai_reviewed_at TIMESTAMPTZ;
