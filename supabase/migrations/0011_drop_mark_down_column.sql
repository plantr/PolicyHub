-- Merge mark_down into content (prefer mark_down where it exists), then drop mark_down
UPDATE document_versions
SET content = mark_down
WHERE mark_down IS NOT NULL AND mark_down <> '';

ALTER TABLE document_versions DROP COLUMN IF EXISTS mark_down;
