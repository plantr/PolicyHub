-- Enable Row Level Security on all public tables
-- This migration locks down all tables — access requires explicit RLS policies

-- Business units & regulatory profiles
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_profiles ENABLE ROW LEVEL SECURITY;

-- Regulatory sources & requirements (reference/lookup tables)
ALTER TABLE public.regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

-- Documents & versions
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effective_policies ENABLE ROW LEVEL SECURITY;

-- Approvals & audit trail
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;

-- Requirement mappings
ALTER TABLE public.requirement_mappings ENABLE ROW LEVEL SECURITY;

-- Findings & evidence
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_evidence ENABLE ROW LEVEL SECURITY;

-- Policy links
ALTER TABLE public.policy_links ENABLE ROW LEVEL SECURITY;

-- Audits
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Commitments
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

-- Knowledge base
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Risk management
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likelihood_levels ENABLE ROW LEVEL SECURITY;

-- Users & roles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_units ENABLE ROW LEVEL SECURITY;

-- Administration reference tables
ALTER TABLE public.entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_severities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_statuses ENABLE ROW LEVEL SECURITY;
