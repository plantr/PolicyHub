/**
 * Seed script: SAMLA Sanctions Controls (EMI/Payments) Framework
 *
 * Creates the SAMLA regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-samla-sanctions-controls.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const controls = [
  {
    code: "SAN-EMI-001",
    category: "Governance & Accountability",
    title: "Sanctions Compliance Framework (EMI/Payments)",
    description:
      "Maintain a board-approved sanctions compliance framework with clear accountability (eg senior manager ownership, sanctions lead, and defined escalation/decision rights). Include MI on screening performance, breaches, holds/freezes, licensing, and reporting.",
    framework_sections:
      "SAMLA is the enabling Act for UK sanctions regimes; practical obligations sit in sanctions regulations made under SAMLA. Aligns with FCA expectations on sanctions systems and controls and OFSI guidance.",
    evidence:
      "Board/committee minutes; sanctions MI packs; RACI; governance calendar; annual effectiveness review; remediation tracker.",
    owner: "Board / SMF (where applicable) / Financial Crime Compliance",
    frequency: "Ongoing; formal review at least annually",
    related_policies:
      "Sanctions Policy; Financial Crime Governance Standard; Escalation & Decision Rights Matrix",
    notes:
      "Ensure governance covers all rails (FPS/CHAPS/SWIFT/SEPA/cards) and distribution channels (API, web, agents).",
    primary_source_url:
      "https://www.fca.org.uk/publications/good-and-poor-practice/sanctions-systems-and-controls-firms-response-increased-sanctions-due-russias-invasion-ukraine",
  },
  {
    code: "SAN-EMI-002",
    category: "Risk Assessment",
    title: "Sanctions Business-Wide Risk Assessment (BWRA) for EMI/Payments",
    description:
      "Document sanctions risk across customers, corridors, products (e-money, wallets, prepaid, merchant acquiring), delivery channels, and counterparties. Use results to set screening scope, tuning, monitoring intensity and review cadence.",
    framework_sections:
      "OFSI guidance expects firms to understand and manage sanctions risk; FCA publishes good/poor practice for sanctions systems and controls.",
    evidence:
      "Sanctions BWRA; methodology; data inputs; approval record; refresh logs; control mapping to risks.",
    owner: "Financial Crime Compliance / Risk",
    frequency: "At least annually; plus material change",
    related_policies:
      "Risk Assessment Methodology; Sanctions Risk Appetite; Product Risk Assessment Procedure",
    notes:
      "Include exposure created by agents/partners, nested payments, and cross-border payout networks.",
    primary_source_url:
      "https://www.gov.uk/government/publications/financial-sanctions-general-guidance/uk-financial-sanctions-general-guidance",
  },
  {
    code: "SAN-EMI-003",
    category: "Lists & Data",
    title: "UK Sanctions List Update & List Governance",
    description:
      "Implement a controlled process to ingest sanctions updates, validate integrity, and deploy changes to screening systems. Maintain list provenance and demonstrate timeliness. Ensure teams use current UK designation sources (UK Sanctions List) and manage legacy references (eg older consolidated list).",
    framework_sections:
      "UK Sanctions List is the primary source of designations; OFSI guidance hub explains available guidance and tools.",
    evidence:
      "List update logs; deployment tickets; validation checks; change approvals; downtime/rollback records.",
    owner: "Sanctions Operations / IT / Compliance",
    frequency: "Daily (or automated continuous); governance review quarterly",
    related_policies:
      "Sanctions List Management SOP; Change Management Procedure",
    notes:
      "The UK Sanctions List replaced older designation sources; ensure processes reference the current search tool and data files.",
    primary_source_url:
      "https://www.gov.uk/government/publications/the-uk-sanctions-list",
  },
  {
    code: "SAN-EMI-004",
    category: "Screening (Customers)",
    title: "Customer & Connected Party Screening (Onboarding + Ongoing)",
    description:
      "Screen customers and connected parties (beneficial owners/controllers/signatories where applicable) at onboarding and on an ongoing basis (periodic re-screen and event-driven re-screen on list updates). Include adverse data quality checks (name/DOB/country).",
    framework_sections:
      "Financial sanctions implementation expectations in OFSI guidance; FCA good/poor practice highlights screening effectiveness themes.",
    evidence:
      "Screening results; alert adjudication logs; customer KYC data quality checks; tuning documentation; QA sampling.",
    owner: "Onboarding Ops / Sanctions Ops / Compliance",
    frequency:
      "Per onboarding; ongoing re-screen on list updates; periodic at least monthly/quarterly based on risk",
    related_policies:
      "KYC Procedure; Sanctions Screening Procedure; Customer Data Standards",
    notes:
      "For EMIs, ensure screening covers both retail wallet users and merchants (if acquiring) as well as programme managers/agents.",
    primary_source_url:
      "https://www.fca.org.uk/publications/good-and-poor-practice/sanctions-systems-and-controls-firms-response-increased-sanctions-due-russias-invasion-ukraine",
  },
  {
    code: "SAN-EMI-005",
    category: "Screening (Payments)",
    title: "Payer/Payee & Payment Message Screening (Real-time)",
    description:
      "Screen payer/payee (and relevant payment message fields) for outgoing and incoming payments, including wallet-to-bank, bank-to-wallet, card loads, payouts, and refunds. Use real-time interdiction where possible to prevent prohibited transactions.",
    framework_sections:
      "OFSI general guidance on compliance with UK financial sanctions; FCA good/poor practice includes transaction screening and operational readiness themes.",
    evidence:
      "Interdiction rules; payment screening logs; hit rates; false positive/negative testing; message parsing rules; coverage map by rail.",
    owner: "Payments Ops / Sanctions Ops / IT",
    frequency: "Continuous (real-time) with periodic tuning",
    related_policies:
      "Payments Screening SOP; Interdiction & Holds Procedure",
    notes:
      "Ensure screening includes transliteration/alias handling and partial/missing data strategies (eg enhanced review for weak identifiers).",
    primary_source_url:
      "https://www.gov.uk/government/publications/financial-sanctions-general-guidance/uk-financial-sanctions-general-guidance",
  },
  {
    code: "SAN-EMI-006",
    category: "Interdiction & Holds",
    title: "Sanctions Hit Handling: Hold/Reject/Freeze Workflow",
    description:
      "Define and operate a workflow to place holds, reject transactions, and freeze assets/accounts when a true match is identified or when required pending resolution. Include dual controls and documented decision points.",
    framework_sections:
      "Operational control supporting compliance with prohibitions in sanctions regulations made under SAMLA; aligns to OFSI implementation expectations.",
    evidence:
      "Case files; hold/freeze records; decision approvals; customer impact logs; release/reject evidence.",
    owner: "Sanctions Ops / Compliance / Payments Ops",
    frequency: "Per hit; review SLAs daily",
    related_policies:
      "Hit Handling Playbook; Account Restriction Procedure; Dual-Control Standard",
    notes:
      "Define service-level targets to resolve false positives quickly while preserving compliance and evidence quality.",
    primary_source_url:
      "https://www.gov.uk/government/publications/financial-sanctions-general-guidance/uk-financial-sanctions-general-guidance",
  },
  {
    code: "SAN-EMI-007",
    category: "Ownership & Control",
    title: "Designated Person (DP) Ownership/Control Assessment",
    description:
      "Implement procedures to identify whether an entity is owned or controlled (directly/indirectly) by a DP, and therefore treated as sanctioned for many regimes. Require corporate structure analysis and documented rationale.",
    framework_sections:
      "OFSI general guidance discusses how financial sanctions should be applied and is commonly used for ownership/control analysis expectations.",
    evidence:
      "UBO data; corporate structure charts; control rationale memo; approvals; ongoing monitoring for changes.",
    owner: "Compliance / Legal / Sanctions Ops",
    frequency: "Per trigger; periodic review risk-based",
    related_policies:
      "Ownership & Control Assessment SOP; Corporate KYC Procedure",
    notes:
      "Apply to merchant entities, corporate wallet customers, and key counterparties in payout networks.",
    primary_source_url:
      "https://www.gov.uk/government/publications/financial-sanctions-general-guidance/uk-financial-sanctions-general-guidance",
  },
  {
    code: "SAN-EMI-008",
    category: "Escalation & Decisioning",
    title: "Investigation Standards and Escalation Gates",
    description:
      "Maintain a documented investigation process for potential matches, including minimum checks, evidence standards, second-person review, legal escalation thresholds, and consistent case notes.",
    framework_sections:
      "FCA publication provides examples of good practice in sanctions systems and controls; OFSI guidance is the baseline for sanctions compliance expectations.",
    evidence:
      "Investigation checklists; case notes; review logs; QA results; escalation records.",
    owner: "Sanctions Ops / Compliance / Legal",
    frequency: "Per case; QA sampling monthly/quarterly",
    related_policies:
      "Investigations SOP; Legal Escalation Procedure; QA Plan",
    notes:
      "Track decision times to avoid operational backlogs that create exposure (eg delayed screening disposition).",
    primary_source_url:
      "https://www.fca.org.uk/publications/good-and-poor-practice/sanctions-systems-and-controls-firms-response-increased-sanctions-due-russias-invasion-ukraine",
  },
  {
    code: "SAN-EMI-009",
    category: "Reporting",
    title:
      "OFSI Reporting: Breaches, Asset Freezes, and Required Disclosures",
    description:
      "Implement controlled reporting to OFSI for suspected/confirmed breaches and asset freezes (as applicable), including internal triage, legal sign-off, and completeness checks. Track timeliness and maintain reporting logs.",
    framework_sections:
      "OFSI general guidance covers reporting expectations; FCA good/poor practice notes timeliness/quality of reporting to the FCA regarding potential breaches.",
    evidence:
      "Reporting log; OFSI submissions; internal memos; evidence packs; timeliness MI; approvals.",
    owner: "Compliance / Legal / Sanctions Ops",
    frequency: "Per event; MI monthly",
    related_policies:
      "Sanctions Reporting Procedure; Incident Management Procedure",
    notes:
      "Coordinate OFSI reporting with any parallel SAR obligations where relevant.",
    primary_source_url:
      "https://www.gov.uk/government/publications/financial-sanctions-general-guidance/uk-financial-sanctions-general-guidance",
  },
  {
    code: "SAN-EMI-010",
    category: "Regulator Engagement",
    title:
      "FCA Notifications and Supervisory Engagement (where applicable)",
    description:
      "Establish procedures to notify the FCA in a timely and accurate way of material sanctions issues, potential breaches, control breakdowns, and remediation progress as expected for FCA-regulated firms.",
    framework_sections:
      "FCA sanctions systems & controls publication includes expectations on reporting breaches and supervisory engagement.",
    evidence:
      "FCA notification logs; correspondence; remediation updates; incident post-mortems.",
    owner: "Compliance / Regulatory Affairs",
    frequency: "Per incident; periodic updates as agreed",
    related_policies:
      "Regulatory Engagement Procedure; Incident Escalation SOP",
    notes:
      "Align thresholds with your FCA relationship and internal incident severity model.",
    primary_source_url:
      "https://www.fca.org.uk/publications/good-and-poor-practice/sanctions-systems-and-controls-firms-response-increased-sanctions-due-russias-invasion-ukraine",
  },
  {
    code: "SAN-EMI-011",
    category: "Licensing",
    title: "OFSI Licence Management (General and Specific Licences)",
    description:
      "Operate a process to identify when a licence may be needed, apply for licences, implement licence conditions operationally (limits, reporting, record-keeping), and evidence compliance.",
    framework_sections:
      "OFSI guidance hub links to licensing and other sanctions guidance; licensing is a core component of sanctions compliance.",
    evidence:
      "Licence applications; licence conditions register; usage notifications; transaction records under licence; reporting under licence.",
    owner: "Legal / Compliance / Sanctions Ops",
    frequency: "Per need; licence conditions monitored continuously",
    related_policies:
      "Licensing Procedure; Licence Conditions Implementation SOP",
    notes:
      "Maintain a central register of licences and conditions accessible to operations teams.",
    primary_source_url:
      "https://www.gov.uk/guidance/uk-financial-sanctions-guidance",
  },
  {
    code: "SAN-EMI-012",
    category: "Customer Communications",
    title: "Controlled Customer Comms for Holds/Restrictions",
    description:
      "Implement scripts and approval gates for customer communications relating to holds/rejections/freezes to avoid inconsistent messaging and to preserve investigation integrity. Train frontline staff on safe communications during sanctions cases.",
    framework_sections:
      "Operational control aligned to FCA expectations for orderly handling of sanctions issues and OFSI compliance discipline.",
    evidence:
      "Comms templates; approvals; training attestations; call/chat QA samples; complaint logs.",
    owner: "Customer Operations / Compliance",
    frequency: "Ongoing; review semi-annually",
    related_policies:
      "Customer Contact SOP; Sanctions Holds Communication Standard",
    notes:
      "Not a statutory 'tipping off' offence under SAMLA per se, but essential to manage operational and evidential risk.",
    primary_source_url:
      "https://www.fca.org.uk/publications/good-and-poor-practice/sanctions-systems-and-controls-firms-response-increased-sanctions-due-russias-invasion-ukraine",
  },
  {
    code: "SAN-EMI-013",
    category: "Record Keeping",
    title: "Sanctions Record Retention and Audit Trail",
    description:
      "Retain evidence of screening inputs/outputs, alert handling, decisions, holds/freezes, reporting, and licensing reliance. Ensure auditability and integrity of records for potential OFSI/FCA enquiries.",
    framework_sections:
      "OFSI enforcement and monetary penalties guidance explains OFSI's approach and underscores the importance of robust evidence in enforcement contexts.",
    evidence:
      "Retention schedule; immutable logs; case files; reporting archives; audit trails; access controls.",
    owner: "Compliance / IT / Operations",
    frequency: "Ongoing; retention review annually",
    related_policies:
      "Record Keeping Policy; Data Retention Schedule; Access Control Policy",
    notes:
      "Ensure records can be produced quickly and completely, including historical screening results and decision trails.",
    primary_source_url:
      "https://www.gov.uk/government/publications/financial-sanctions-enforcement-and-monetary-penalties-guidance/financial-sanctions-enforcement-and-monetary-penalties-guidance",
  },
  {
    code: "SAN-EMI-014",
    category: "Training & Awareness",
    title: "Role-based Sanctions Training (EMI/Payments)",
    description:
      "Deliver training tailored to EMI/payment roles (onboarding, payments ops, customer support, investigations, product/engineering). Cover hit handling, ownership/control basics, reporting, licensing, and incident escalation.",
    framework_sections:
      "FCA guidance on financial crime systems and controls supports training expectations; OFSI guidance sets operational context.",
    evidence:
      "Training materials; completion logs; assessments; remediation; role-based curriculum map.",
    owner: "L&D / Compliance",
    frequency: "At least annually; plus joiners/role changes",
    related_policies:
      "Training Policy; Sanctions Training Curriculum; Competency Testing SOP",
    notes:
      "Include drills/table-top exercises for surge events (eg rapid designation updates).",
    primary_source_url:
      "https://public-prod-api.azurewebsites.net/files/sourcebook/FCG.pdf",
  },
  {
    code: "SAN-EMI-015",
    category: "Third Parties",
    title:
      "Third-Party and Partner Oversight (Agents, Program Managers, PSPs)",
    description:
      "Where partners support distribution, KYC, payment processing, payout networks, or screening, perform due diligence, set contractual requirements, monitor performance, and ensure access to evidence and data needed for sanctions compliance.",
    framework_sections:
      "Aligned to FCA expectations for effective systems and controls; OFSI guidance provides sanctions compliance context.",
    evidence:
      "Partner due diligence; contracts/SLAs; monitoring reports; audit results; incident logs.",
    owner: "Vendor Management / Compliance / Legal",
    frequency: "At onboarding; monitoring quarterly; annual review",
    related_policies:
      "Third-Party Risk Policy; Partner Due Diligence SOP; Outsourcing Oversight Procedure",
    notes:
      "Pay special attention to nested relationships where screening responsibilities may be unclear (eg sub-processors).",
    primary_source_url:
      "https://public-prod-api.azurewebsites.net/files/sourcebook/FCG.pdf",
  },
  {
    code: "SAN-EMI-016",
    category: "Assurance & Testing",
    title: "Screening Effectiveness Testing (Missed-Match, Tuning, QA)",
    description:
      "Perform periodic effectiveness testing: missed-match testing, data quality testing, tuning, and end-to-end testing of interdiction/hold workflows across rails and channels.",
    framework_sections:
      "FCA sanctions systems & controls publication provides good/poor practice examples; OFSI guidance provides compliance context.",
    evidence:
      "Test plans; results; defect logs; tuning change records; independent review reports; remediation tracker.",
    owner: "2LOD Compliance Assurance / Internal Audit",
    frequency: "Quarterly (or risk-based); independent review at least annually",
    related_policies: "QA & Testing Standard; Change Control Procedure",
    notes:
      "Include regression testing after vendor upgrades, list schema changes, or new payment rails/products.",
    primary_source_url:
      "https://www.fca.org.uk/publications/good-and-poor-practice/sanctions-systems-and-controls-firms-response-increased-sanctions-due-russias-invasion-ukraine",
  },
  {
    code: "SAN-EMI-017",
    category: "Tools & Sources",
    title: "UK Sanctions List Search Tool and Data File Controls",
    description:
      "Operationalise use of the UK Sanctions List search tool and downloadable data files in a controlled way (access controls, availability monitoring, fallback process if tool/data unavailable).",
    framework_sections:
      "UK Sanctions List is the authoritative source for current designations and provides a search tool.",
    evidence:
      "Access logs; availability monitoring; fallback instructions; evidence of periodic reconciliation against internal lists.",
    owner: "Sanctions Ops / IT",
    frequency: "Ongoing; reconciliation monthly",
    related_policies:
      "Sanctions Tools Procedure; Business Continuity Plan (Sanctions)",
    notes:
      "Maintain a documented fallback if external list services are unavailable during critical processing windows.",
    primary_source_url:
      "https://search-uk-sanctions-list.service.gov.uk/",
  },
];

async function main() {
  console.log("Seeding SAMLA Sanctions Controls (EMI/Payments) framework...");

  // 1. Create or find the SAMLA regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'SAMLA' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing SAMLA source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'Sanctions and Anti-Money Laundering Act 2018',
        'SAMLA',
        'United Kingdom',
        'https://www.legislation.gov.uk/ukpga/2018/13/contents',
        'Sanctions',
        'The Sanctions and Anti-Money Laundering Act 2018 (SAMLA) is the primary UK legislation enabling the government to impose, update, and enforce sanctions regimes after Brexit. It provides the framework under which specific sanctions regulations are made, covering financial sanctions, trade sanctions, immigration sanctions, and related obligations. OFSI enforces the financial sanctions provisions, and firms must implement robust screening, interdiction, reporting, and governance controls to comply.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created SAMLA source (id=${sourceId})`);
  }

  // 2. Insert controls
  console.log(`Inserting ${controls.length} SAMLA sanctions controls (source_id=${sourceId})...`);

  for (const c of controls) {
    await sql`
      INSERT INTO controls (
        source_id, code, title, description, category,
        evidence, owner, notes,
        framework_sections, frequency, related_policies, primary_source_url
      ) VALUES (
        ${sourceId}, ${c.code}, ${c.title}, ${c.description}, ${c.category},
        ${c.evidence}, ${c.owner}, ${c.notes},
        ${c.framework_sections}, ${c.frequency}, ${c.related_policies}, ${c.primary_source_url}
      )
      ON CONFLICT DO NOTHING
    `;
    console.log(`  \u2713 ${c.code} \u2014 ${c.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
