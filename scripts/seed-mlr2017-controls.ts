/**
 * Seed script: MLR2017 (Money Laundering Regulations 2017) Controls – EMI/Payments
 *
 * Creates the MLR2017 regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-mlr2017-controls.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const controls = [
  {
    code: "AML-MLR17-001",
    category: "Governance & Accountability",
    title: "AML/CTF Governance Framework (EMI/Payments)",
    description: "Maintain a board-approved AML/CTF framework with clear senior ownership (eg SMF where applicable), MLRO/nominated officer responsibilities, defined escalation/decision rights, and MI on AML outcomes (alerts, SARs, reviews, remediation).",
    framework_sections: "MLRs 2017 overall; aligns to FCA expectations for risk-based AML systems and controls.",
    evidence: "Board/committee minutes; RACI; MI packs; annual effectiveness review; internal audit reports; remediation tracker.",
    owner: "Board / SMF (where applicable) / Financial Crime Compliance / MLRO",
    frequency: "Ongoing; formal review at least annually",
    related_policies: "AML/CTF Policy; Financial Crime Governance Standard; Escalation & Decision Rights Matrix",
    notes: "Ensure governance covers all rails (FPS/CHAPS/SWIFT/SEPA/cards) and delivery channels (API, agents).",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "AML-MLR17-002",
    category: "Risk Assessment",
    title: "Business-Wide ML/TF Risk Assessment (BWRA)",
    description: "Document ML/TF risks across customers, geographies/corridors, products (wallets, e-money accounts, prepaid, acquiring), delivery channels, and payment rails; use outputs to calibrate controls and resource allocation.",
    framework_sections: "MLRs 2017 require a business risk assessment (Reg 18).",
    evidence: "BWRA; methodology; inputs; approvals; refresh/change logs; control mapping.",
    owner: "Financial Crime Compliance / Risk",
    frequency: "At least annually; plus material change",
    related_policies: "BWRA Methodology; Risk Appetite; Product Risk Assessment Procedure",
    notes: "Include partner/agent and nested payment risks where applicable.",
    primary_source_url: "https://www.legislation.gov.uk/uksi/2017/692/regulation/18",
  },
  {
    code: "AML-MLR17-003",
    category: "Policies, Controls & Procedures",
    title: "Written AML/CTF PCPs (Risk-based)",
    description: "Maintain written policies, controls and procedures (PCPs) proportionate to your risks, covering CDD/EDD, monitoring, SAR reporting, record-keeping, training, and internal controls.",
    framework_sections: "MLRs 2017 require internal controls and ongoing management of AML/CTF compliance.",
    evidence: "AML/CTF policy suite; SOPs/playbooks; policy attestation; change logs; policy exceptions register.",
    owner: "Financial Crime Compliance",
    frequency: "Ongoing; review at least annually",
    related_policies: "AML/CTF Policy; Procedures Library; Change Management Procedure",
    notes: "Maintain a clear mapping of PCPs to risks identified in BWRA.",
    primary_source_url: "https://www.gov.uk/guidance/money-laundering-regulations-your-responsibilities",
  },
  {
    code: "AML-MLR17-004",
    category: "CDD / Onboarding",
    title: "Customer Identification & Verification (KYC)",
    description: "Identify and verify customers on onboarding using reliable sources; capture required attributes (name, DOB/incorporation, address, identifiers) and apply controls for impersonation and synthetic identity risk.",
    framework_sections: "Core CDD obligations under the UK AML/CTF regime; detailed expectations commonly implemented using JMLSG guidance.",
    evidence: "KYC files; ID&V evidence; verification logs; customer risk scores; onboarding approvals.",
    owner: "Onboarding Operations with Compliance oversight",
    frequency: "Per onboarding; refresh risk-based",
    related_policies: "KYC Procedure; Identity Verification Standard; Customer Risk Scoring SOP",
    notes: "Ensure controls cover both retail wallet users and merchants/programme customers where applicable.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2020/06/Part-I-Chapter-5_June-2020_Marked-up.pdf",
  },
  {
    code: "AML-MLR17-005",
    category: "CDD / Beneficial Ownership",
    title: "Beneficial Ownership Identification and Verification (where applicable)",
    description: "Where applicable, identify beneficial owners and take reasonable measures to verify them; understand ownership/control structures for legal entities and arrangements.",
    framework_sections: "Customer due diligence expectations for beneficial ownership (implemented via JMLSG-aligned practices).",
    evidence: "UBO registers; corporate structure charts; verification evidence; control rationale; periodic reviews.",
    owner: "Onboarding Operations / Compliance",
    frequency: "Per onboarding; refresh risk-based",
    related_policies: "Corporate KYC Procedure; Beneficial Ownership SOP",
    notes: "Apply to corporate wallet customers, merchants, agents, and key counterparties as relevant.",
    primary_source_url: "https://www.lawsociety.org.uk/en/topics/anti-money-laundering/quick-guide-to-the-mlrs",
  },
  {
    code: "AML-MLR17-006",
    category: "EDD / High Risk",
    title: "Enhanced Due Diligence (EDD) Triggers and Handling",
    description: "Define EDD triggers (eg high-risk geographies, complex ownership, unusual funding sources, higher-risk customers) and apply enhanced measures with approvals and documented rationale.",
    framework_sections: "Risk-based enhanced controls expected under the UK AML/CTF regime; JMLSG provides sector guidance on application.",
    evidence: "EDD packs; source of funds/wealth evidence (where required); adverse media; approvals; ongoing monitoring notes.",
    owner: "Financial Crime Compliance / Onboarding",
    frequency: "Per trigger; periodic review risk-based",
    related_policies: "EDD Procedure; High-Risk Customer Standard; Adverse Media Procedure",
    notes: "Ensure EDD applies consistently across rails (eg card loads vs bank transfers) and partner channels.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2020/06/Part-I-Chapter-5_June-2020_Marked-up.pdf",
  },
  {
    code: "AML-MLR17-007",
    category: "Ongoing Monitoring",
    title: "Business Relationship Monitoring and KYC Refresh",
    description: "Perform ongoing monitoring to ensure activity is consistent with customer profile/expected activity and keep CDD data up to date. Use triggers for review (eg change in behaviour, risk indicators, periodic cycle).",
    framework_sections: "Ongoing monitoring is a core day-to-day responsibility under the Money Laundering Regulations regime.",
    evidence: "Periodic review records; refresh evidence; trigger logs; outcomes; updated risk ratings.",
    owner: "Financial Crime Operations / Compliance",
    frequency: "Continuous; periodic reviews risk-based (eg 1\u20133 years depending on risk)",
    related_policies: "Ongoing Monitoring Procedure; KYC Refresh SOP",
    notes: "Define clear triggers and minimum review standards for EMIs (eg rapid growth, multiple funding sources, high-risk corridors).",
    primary_source_url: "https://www.gov.uk/guidance/money-laundering-regulations-your-responsibilities",
  },
  {
    code: "AML-MLR17-008",
    category: "Transaction Monitoring",
    title: "Typology-based Transaction Monitoring (TM) Across Rails",
    description: "Implement risk-based transaction monitoring scenarios for wallet activity, bank transfers, card loads/unloads, refunds, payouts, and (if applicable) acquiring/settlement flows. Maintain tuning and QA.",
    framework_sections: "Supports MLRs 2017 requirement to manage ML/TF risk through appropriate systems and controls; FCA expects risk-based approaches.",
    evidence: "Scenario library; thresholds; tuning logs; alert queue metrics; investigation outcomes; validation/QA results.",
    owner: "Financial Crime Monitoring Team / Compliance",
    frequency: "Continuous; tuning at least quarterly (risk-based)",
    related_policies: "TM Standard; Alert Triage Playbook; Model/Rules Change Control",
    notes: "Ensure coverage for instant payments and high-velocity channels common in EMIs.",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "AML-MLR17-009",
    category: "Screening",
    title: "PEP / Sanctions / Adverse Media Screening (as applicable)",
    description: "Run appropriate screening for customers and relevant connected parties, with governance for list updates, match adjudication, and ongoing rescreening. Escalate higher-risk results for EDD and monitoring.",
    framework_sections: "Part of risk-based AML/CTF control sets used to support CDD and ongoing monitoring expectations.",
    evidence: "Screening logs; match decisions; tuning documentation; QA sampling; rescreen schedules; data quality checks.",
    owner: "Financial Crime Operations / Compliance",
    frequency: "At onboarding; ongoing rescreen on list updates and periodically",
    related_policies: "Screening Procedure; Watchlist Governance Standard",
    notes: "Coordinate sanctions controls with your SAMLA sanctions programme; avoid duplicate/conflicting workflows.",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "AML-MLR17-010",
    category: "Investigations",
    title: "Investigation Workflow and Evidence Standards",
    description: "Maintain documented investigation procedures for alerts/cases, including minimum checks, evidence standards, second-person review criteria, and consistent case notes to support defensible decisions.",
    framework_sections: "Good practice under UK AML/CTF regime to evidence effective systems and controls and decisioning quality.",
    evidence: "Case files; checklists; review logs; QA results; escalation records; disposition rationale.",
    owner: "Financial Crime Investigations / Compliance",
    frequency: "Per case; QA sampling monthly/quarterly",
    related_policies: "Investigations SOP; Case Management Procedure; QA Plan",
    notes: "Define \u2018reason to suspect\u2019 standards and required minimum checks.",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "AML-MLR17-011",
    category: "SAR / Reporting",
    title: "Internal Suspicion Reporting and SAR Submission",
    description: "Ensure staff escalate suspicions promptly to the MLRO/nominated officer; maintain SAR decisioning and submit SARs to the UKFIU (NCA) where required. Track timeliness, completeness, and quality.",
    framework_sections: "Core AML/CTF operational expectation for regulated firms; SAR regime is central to UK AML/CTF framework alongside MLRs.",
    evidence: "Internal suspicion reports; SAR log; SAR submissions/acknowledgements; timeliness MI; quality reviews.",
    owner: "MLRO / Nominated Officer",
    frequency: "Per suspicion; MI monthly",
    related_policies: "SAR Reporting Procedure; Internal Escalation SOP; MLRO Decisioning Standard",
    notes: "Include customer comms controls during investigations to avoid prejudicing investigations.",
    primary_source_url: "https://www.gov.uk/guidance/money-laundering-regulations-your-responsibilities",
  },
  {
    code: "AML-MLR17-012",
    category: "Transfer of Funds (Payments-Specific)",
    title: "Payer/Payee Information Controls (Travel Rule / Funds Transfer Data)",
    description: "Ensure required payer/payee information accompanies transfers; detect incomplete/meaningless information; apply defined actions (reject/repair/request data) within documented timeframes and apply risk-based measures where data is missing.",
    framework_sections: "MLRs 2017 include transfer of funds requirements; JMLSG Part III provides interpretative guidance for payment service providers on payer/payee information handling.",
    evidence: "Field mapping by rail; exception logs; reject/repair SLAs; QA samples; operational playbooks; correspondent/partner communications.",
    owner: "Payments Ops / Compliance / IT",
    frequency: "Continuous; QA monthly/quarterly",
    related_policies: "Funds Transfer Data SOP; Exception Handling Playbook; Rail-specific Processing Guides",
    notes: "Critical for EMIs with cross-border flows and high STP rates; define fallbacks for missing data.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2023/05/JMLSG-Guidance_Part-III.pdf",
  },
  {
    code: "AML-MLR17-013",
    category: "Record Keeping",
    title: "AML/CTF Record Retention and Retrievability",
    description: "Maintain records of CDD/EDD, ongoing monitoring, transactions, alerts, investigations, SAR decisions and submissions, and funds transfer data compliance evidence; ensure integrity and quick retrieval.",
    framework_sections: "Day-to-day responsibilities under the MLR regime include record keeping and internal controls (risk-based, proportionate).",
    evidence: "Retention schedule; evidence repositories; immutable logs; access controls; retrieval test results.",
    owner: "Compliance / IT / Operations",
    frequency: "Ongoing; retention schedule reviewed annually",
    related_policies: "Record Keeping Policy; Data Retention Schedule; Access Control Policy",
    notes: "Test retrieval regularly (eg quarterly) to ensure you can respond to regulator/LE requests.",
    primary_source_url: "https://www.gov.uk/guidance/money-laundering-regulations-your-responsibilities",
  },
  {
    code: "AML-MLR17-014",
    category: "Training & Awareness",
    title: "Role-based AML/CTF Training and Competency Testing",
    description: "Provide role-based training (onboarding, payments ops, customer support, investigations, product/engineering) on AML/CTF risks, red flags, escalation, SAR process, and funds transfer data requirements; test competency and remediate.",
    framework_sections: "MLR regime expects firms to put in place internal controls and training proportionate to risk; FCA emphasises risk-based AML.",
    evidence: "Training materials; completion logs; assessments; remediation; curriculum map by role.",
    owner: "L&D / Compliance",
    frequency: "At least annually; joiners and role changes",
    related_policies: "Training Policy; AML/CTF Training Curriculum; Competency Testing SOP",
    notes: "Include scenario-based drills for payments teams (eg rapid-fire exceptions, high-risk corridor surges).",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "AML-MLR17-015",
    category: "Third Parties & Outsourcing",
    title: "Partner/Vendor Oversight for AML/CTF Activities",
    description: "Where partners or vendors support KYC, screening, monitoring, programme management, agents, or payout networks, perform due diligence, set SLAs/audit rights, monitor performance, and ensure access to evidence needed for AML decisions.",
    framework_sections: "Regime expectation: firms must put in place internal controls and monitoring systems proportionate to size/complexity; outsourcing does not remove accountability.",
    evidence: "Vendor due diligence; contracts/SLAs; performance reports; audit results; incident logs; remediation records.",
    owner: "Vendor Management / Compliance / Legal",
    frequency: "At onboarding; monitoring quarterly; annual review",
    related_policies: "Third-Party Risk Policy; Vendor Due Diligence SOP; Outsourcing Oversight Procedure",
    notes: "Pay special attention to nested relationships and data-sharing needed for investigations and SAR decisioning.",
    primary_source_url: "https://www.gov.uk/guidance/money-laundering-regulations-your-responsibilities",
  },
  {
    code: "AML-MLR17-016",
    category: "Assurance & Testing",
    title: "AML/CTF Control Effectiveness Testing and QA",
    description: "Perform periodic testing of onboarding/CDD quality, screening effectiveness, transaction monitoring outcomes, funds transfer data exception handling, and SAR processes. Track issues and remediation to closure.",
    framework_sections: "Supports demonstrability of effective, risk-based AML systems and controls expected by the FCA and consistent with MLR regime responsibilities.",
    evidence: "QA plans; sampling results; test evidence; issue logs; remediation tracker; independent review reports.",
    owner: "2LOD Compliance Assurance / Internal Audit",
    frequency: "Quarterly (risk-based); independent review at least annually",
    related_policies: "QA & Testing Standard; Issue Management Procedure; Change Control Procedure",
    notes: "Include regression testing after product launches, vendor upgrades, or new payment rails.",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "AML-MLR17-017",
    category: "Regulatory Change",
    title: "MLRs Change Monitoring and Implementation",
    description: "Monitor regulatory changes to the MLRs (and related guidance), assess impacts, update policies/controls, train staff, and evidence implementation.",
    framework_sections: "MLRs 2017 are amended over time; firms must keep frameworks current.",
    evidence: "Horizon scanning logs; impact assessments; implementation plans; updated policies; training records.",
    owner: "Compliance / Legal",
    frequency: "Ongoing; formal review quarterly",
    related_policies: "Regulatory Change Management Procedure; Policy Update SOP",
    notes: "Include change controls for 2025 amendments where applicable and document gap closure.",
    primary_source_url: "https://www.gov.uk/government/publications/proposed-amendments-to-the-money-laundering-regulations-draft-si-and-policy-note/the-draft-money-laundering-and-terrorist-financing-amendment-and-miscellaneous-provision-regulations-2025-policy-note",
  },
];

async function main() {
  console.log("Seeding MLR2017 (Money Laundering Regulations 2017) framework and controls...");

  // 1. Create or find the MLR2017 regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'MLR2017' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing MLR2017 source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017 – EMI/Payments Controls',
        'MLR2017',
        'United Kingdom',
        'https://www.legislation.gov.uk/uksi/2017/692/contents',
        'Financial Crime',
        'The Money Laundering Regulations 2017 (MLRs 2017) transpose the EU Fourth and Fifth Anti-Money Laundering Directives into UK law. They require regulated firms to conduct risk assessments, apply customer due diligence, maintain policies/controls/procedures, report suspicious activity, keep records, and ensure staff training. For EMIs and payment firms, the regulations also cover transfer of funds (payer/payee) information requirements.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created MLR2017 source (id=${sourceId})`);
  }

  // 2. Insert controls
  console.log(`Inserting ${controls.length} MLR2017 controls (source_id=${sourceId})...`);

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
