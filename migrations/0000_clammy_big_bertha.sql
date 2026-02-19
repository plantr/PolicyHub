CREATE TABLE "addenda" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"business_unit_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"content" text NOT NULL,
	"status" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"approver" text NOT NULL,
	"comments" text,
	"artefact_hash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"details" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"audit_type" text NOT NULL,
	"status" text NOT NULL,
	"business_unit_id" integer,
	"scope" text,
	"lead_auditor" text NOT NULL,
	"audit_firm" text,
	"scheduled_date" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"report_date" timestamp,
	"findings_count" integer DEFAULT 0,
	"recommendations" text,
	"overall_rating" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"type" text NOT NULL,
	"activities" text[] NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"effective_date" timestamp,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "commitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"source_reference" text,
	"business_unit_id" integer,
	"category" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"owner" text NOT NULL,
	"due_date" timestamp,
	"completed_date" timestamp,
	"evidence_notes" text,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version" text NOT NULL,
	"status" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text,
	"change_reason" text,
	"change_summary" text,
	"risk_impact" text,
	"effective_date" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"pdf_s3_key" text,
	"pdf_file_name" text,
	"pdf_file_size" integer,
	"mark_down" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_reference" text,
	"title" text NOT NULL,
	"doc_type" text NOT NULL,
	"taxonomy" text NOT NULL,
	"owner" text NOT NULL,
	"delegates" text[],
	"reviewers" text[],
	"approvers" text[],
	"tags" text[],
	"review_frequency" text,
	"next_review_date" timestamp,
	"business_unit_id" integer,
	"parent_document_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "effective_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"business_unit_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"addendum_id" integer,
	"composed_content" text NOT NULL,
	"composition_hash" text NOT NULL,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text,
	"description" text,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finding_severities" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"business_unit_id" integer NOT NULL,
	"requirement_id" integer,
	"document_id" integer,
	"description" text,
	"root_cause" text,
	"remediation_plan" text,
	"owner" text NOT NULL,
	"approver" text,
	"due_date" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "impact_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" integer NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"author" text NOT NULL,
	"tags" text[],
	"status" text DEFAULT 'Published' NOT NULL,
	"jurisdiction" text,
	"related_document_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "likelihood_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" integer NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_document_id" integer NOT NULL,
	"to_document_id" integer NOT NULL,
	"link_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_unit_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "regulatory_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"url" text,
	"category" text NOT NULL,
	"effective_date" timestamp,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "requirement_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"requirement_id" integer NOT NULL,
	"document_id" integer,
	"version_id" integer,
	"business_unit_id" integer,
	"coverage_status" text NOT NULL,
	"rationale" text,
	"evidence_pointers" text,
	"test_logic" text,
	"reviewer_sign_off" text,
	"confirmed_at" timestamp,
	"ai_match_score" integer,
	"ai_match_rationale" text,
	"ai_match_recommendations" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"article" text,
	"evidence" text,
	"owner" text,
	"status" text,
	"notes" text,
	"combined_ai_score" integer,
	"combined_ai_rationale" text,
	"combined_ai_recommendations" text
);
--> statement-breakpoint
CREATE TABLE "review_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"reviewer" text NOT NULL,
	"outcome" text NOT NULL,
	"comments" text,
	"actions_raised" text,
	"reviewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risk_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"risk_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"due_date" timestamp,
	"completed_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risk_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_library" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"suggested_likelihood" integer DEFAULT 3 NOT NULL,
	"suggested_impact" integer DEFAULT 3 NOT NULL,
	"suggested_controls" text,
	"jurisdiction" text,
	"source" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risk_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business_unit_id" integer,
	"total_risks" integer DEFAULT 0 NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"high_count" integer DEFAULT 0 NOT NULL,
	"medium_count" integer DEFAULT 0 NOT NULL,
	"low_count" integer DEFAULT 0 NOT NULL,
	"open_actions" integer DEFAULT 0 NOT NULL,
	"snapshot_data" jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"status" text DEFAULT 'Identified' NOT NULL,
	"business_unit_id" integer,
	"requirement_id" integer,
	"owner" text NOT NULL,
	"inherent_likelihood" integer DEFAULT 3 NOT NULL,
	"inherent_impact" integer DEFAULT 3 NOT NULL,
	"inherent_score" integer DEFAULT 9 NOT NULL,
	"inherent_rating" text DEFAULT 'Medium' NOT NULL,
	"residual_likelihood" integer DEFAULT 3 NOT NULL,
	"residual_impact" integer DEFAULT 3 NOT NULL,
	"residual_score" integer DEFAULT 9 NOT NULL,
	"residual_rating" text DEFAULT 'Medium' NOT NULL,
	"mitigation_strategy" text,
	"control_description" text,
	"risk_appetite" text,
	"review_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_business_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_unit_id" integer NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_business_units_user_id_business_unit_id_unique" UNIQUE("user_id","business_unit_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"job_title" text,
	"department" text,
	"business_unit_id" integer,
	"status" text DEFAULT 'Active' NOT NULL,
	"phone" text,
	"notes" text,
	"auth_user_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_business_units" ADD CONSTRAINT "user_business_units_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;