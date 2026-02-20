-- Rename tables: requirements → controls, requirement_mappings → control_mappings
ALTER TABLE "requirements" RENAME TO "controls";
--> statement-breakpoint
ALTER TABLE "requirement_mappings" RENAME TO "control_mappings";
--> statement-breakpoint

-- Merge article data into evidence_status (evidence_status column already exists),
-- then drop the old article column
UPDATE "controls" SET "evidence_status" = "article" WHERE "article" IS NOT NULL AND "evidence_status" IS NULL;
--> statement-breakpoint
ALTER TABLE "controls" DROP COLUMN IF EXISTS "article";
--> statement-breakpoint

-- Rename FK columns: requirement_id → control_id
ALTER TABLE "control_mappings" RENAME COLUMN "requirement_id" TO "control_id";
--> statement-breakpoint
ALTER TABLE "findings" RENAME COLUMN "requirement_id" TO "control_id";
--> statement-breakpoint
ALTER TABLE "risks" RENAME COLUMN "requirement_id" TO "control_id";
