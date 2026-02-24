-- Expand ai_jobs status to include 'cancelled' and job_type to include bulk types
ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_status_check;
ALTER TABLE ai_jobs ADD CONSTRAINT ai_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_job_type_check;
ALTER TABLE ai_jobs ADD CONSTRAINT ai_jobs_job_type_check
  CHECK (job_type IN ('ai-match', 'ai-coverage', 'ai-map-controls', 'ai-map-all-documents', 'ai-bulk-coverage'));
