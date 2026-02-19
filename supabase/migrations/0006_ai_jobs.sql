-- AI background job queue for async Anthropic API processing
CREATE TABLE ai_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL CHECK (job_type IN ('ai-match', 'ai-coverage', 'ai-map-controls')),
  entity_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress_message text,
  result jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for polling and lookup
CREATE INDEX ai_jobs_status_idx ON ai_jobs(status);
CREATE INDEX ai_jobs_entity_idx ON ai_jobs(job_type, entity_id);

-- Enable RLS (consistent with all other tables)
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Permissive read policy: any authenticated user can poll their own jobs
-- Jobs are short-lived operational records, not BU-scoped data
CREATE POLICY "ai_jobs_select_authenticated" ON ai_jobs
  FOR SELECT TO authenticated
  USING (true);

-- Only service role can insert/update (server-side only)
-- No INSERT/UPDATE/DELETE policies for authenticated — server uses service role
