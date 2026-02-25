/**
 * Seed script: TA2000 (Terrorism Act 2000) Counter-Terrorist Financing Controls
 *
 * Creates the TA2000 regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-ta2000-controls.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const controls = [
  {
    code: "CTF-TA2000-001",
    category: "Governance & Accountability",
    title: "Board-approved AML/CTF & CTF Governance Framework",
    description: "Establish and maintain a board-approved AML/CTF framework with clear accountability (eg MLRO/nominated officer), escalation paths, and management information (MI) for terrorist financing (TF) risk. Ensure governance integrates with overall financial crime systems and controls.",
    framework_sections: "TA 2000 overall compliance; supports controls against Part III offences (ss15\u201318) and reporting/tipping-off provisions (ss21A, 21D). Also aligns to FCA financial crime systems & controls expectations.",
    evidence: "Board/committee minutes approving AML/CTF framework; org charts and role profiles; MI packs; annual effectiveness review; internal audit reports.",
    owner: "Board / SMF (where applicable) / Financial Crime Compliance / MLRO",
    frequency: "Ongoing; formal review at least annually and upon material change",
    related_policies: "AML/CTF Policy; Financial Crime Governance Standard; Escalation & Case Management Procedure",
    notes: "Define decision rights (eg account restrictions, exits) and escalation SLAs; document risk acceptance thresholds.",
    primary_source_url: "https://www.fca.org.uk/firms/financial-crime/money-laundering-terrorist-financing",
  },
  {
    code: "CTF-TA2000-002",
    category: "Risk Assessment",
    title: "Terrorist Financing (TF) Enterprise Risk Assessment",
    description: "Document a TF risk assessment covering customers, geographies, products, channels, and typologies; map inherent risk to controls and residual risk. Refresh on a risk-based schedule.",
    framework_sections: "Risk-based control foundation supporting TA 2000 offences (ss15\u201318) and regulated sector reporting expectations (s21A).",
    evidence: "TF risk assessment document; methodology; data inputs; approval record; refresh/change logs; control mapping.",
    owner: "Financial Crime Compliance / Risk",
    frequency: "At least annually; plus upon material change",
    related_policies: "Enterprise Financial Crime Risk Assessment Methodology; CTF Risk Appetite Statement",
    notes: "Include emerging risks (eg new corridors/channels) and document rationale for scoring.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2022/07/JMLSG-Guidance-Part-I_July-2022.pdf",
  },
  {
    code: "CTF-TA2000-003",
    category: "CDD / Onboarding",
    title: "Customer Identification & Verification (KYC) and Beneficial Ownership",
    description: "Perform customer identification and verification (and beneficial ownership where applicable) at onboarding and refresh as required. Capture expected activity/purpose where relevant to detect anomalous TF patterns.",
    framework_sections: "Supports prevention/detection relevant to TA 2000 Part III terrorist property offences (ss15\u201318) and enables informed suspicion reporting under s21A.",
    evidence: "KYC files; identity verification evidence; beneficial ownership records; expected activity profiles; refresh logs.",
    owner: "Operations (Onboarding) with Compliance oversight",
    frequency: "Per customer onboarding; refresh risk-based",
    related_policies: "CDD/KYC Procedure; Beneficial Ownership Procedure; Customer Risk Scoring Standard",
    notes: "Ensure controls cover all relevant roles (customer, beneficial owner, controller, signatory).",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2022/07/JMLSG-Guidance-Part-I_July-2022.pdf",
  },
  {
    code: "CTF-TA2000-004",
    category: "EDD / High Risk",
    title: "Enhanced Due Diligence (EDD) for Higher TF Risk",
    description: "Apply EDD where TF risk is higher (eg higher-risk geographies/corridors, complex ownership, unusual funding sources, high-risk products). Collect additional information and implement compensating controls.",
    framework_sections: "Risk-based mitigation supporting TA 2000 Part III offences (ss15\u201318) and regulated sector reporting under s21A.",
    evidence: "EDD pack; source of funds/wealth evidence (where applicable); adverse media checks; approvals and rationale.",
    owner: "Financial Crime Compliance / Onboarding",
    frequency: "Per EDD trigger; periodic review risk-based",
    related_policies: "EDD Procedure; High-Risk Customer Standard; Adverse Media Procedure",
    notes: "Define clear EDD triggers and approval thresholds; evidence rationale for decisions.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2022/07/JMLSG-Guidance-Part-I_July-2022.pdf",
  },
  {
    code: "CTF-TA2000-005",
    category: "Screening",
    title: "Name Screening (Customers & Connected Parties) and Ongoing Re-screening",
    description: "Screen customers and connected parties (eg beneficial owners/controllers) at onboarding and continuously/periodically thereafter; manage false positives and ensure escalation for potential matches.",
    framework_sections: "Supports TF detection relevant to TA 2000 Part III offences (ss15\u201318) and regulated sector duties (s21A). Often operated alongside sanctions screening.",
    evidence: "Screening configuration; match adjudication logs; tuning documents; QA sampling results; audit trail of decisions.",
    owner: "Financial Crime Operations / Compliance",
    frequency: "Real-time/ongoing; periodic tuning",
    related_policies: "Screening & Matching Procedure; Watchlist Governance Standard",
    notes: "Document screening scope (entities, thresholds, transliterations) and escalation timeframes.",
    primary_source_url: "https://public-prod-api.azurewebsites.net/files/sourcebook/FCG.pdf",
  },
  {
    code: "CTF-TA2000-006",
    category: "Transaction Monitoring",
    title: "TF Typology-Based Transaction Monitoring",
    description: "Implement risk-based monitoring scenarios/alerts calibrated to TF typologies (eg structuring, rapid pass-through, unusual corridors, fundraiser-style flows). Perform tuning and validation.",
    framework_sections: "Supports detection for TA 2000 Part III offences (ss15\u201318) and suspicion reporting under s21A.",
    evidence: "Scenario library; threshold governance; model tuning/validation; alert queue metrics; investigation outcomes.",
    owner: "Financial Crime Monitoring Team / Compliance",
    frequency: "Continuous; tuning at least quarterly (or risk-based)",
    related_policies: "Transaction Monitoring Standard; Alert Triage Playbook",
    notes: "Ensure coverage across rails (FPS/CHAPS/SWIFT/cards/e-money as relevant).",
    primary_source_url: "https://public-prod-api.azurewebsites.net/files/sourcebook/FCG.pdf",
  },
  {
    code: "CTF-TA2000-007",
    category: "Investigations",
    title: "Case Management & Investigation Standards",
    description: "Use a documented investigation workflow with consistent evidence checks, second-person review criteria, and robust case notes. Ensure decisions are traceable and auditable.",
    framework_sections: "Enables defensible decisioning for TA 2000 reporting (s21A) and supports management of tipping-off risk (s21D).",
    evidence: "Case files; checklists; review logs; QA results; escalation records; disposition rationale.",
    owner: "Financial Crime Investigations / Compliance",
    frequency: "Per case; QA sampling monthly/quarterly",
    related_policies: "Investigations Procedure; Case Management SOP; QA & Sampling Plan",
    notes: "Define \u201creason to suspect\u201d decision standards and required minimum checks.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2022/07/JMLSG-Guidance-Part-I_July-2022.pdf",
  },
  {
    code: "CTF-TA2000-008",
    category: "Reporting (SAR)",
    title: "Internal Escalation & SAR Submission to UKFIU",
    description: "Ensure staff escalate TF knowledge/suspicion promptly to the MLRO/nominated officer and submit SARs to the UKFIU (NCA) as soon as practicable when required. Track timeliness and quality.",
    framework_sections: "TA 2000 regulated sector failure to disclose (s21A); broader SAR regime guidance for regulated sector reporters.",
    evidence: "Internal suspicion reports; SAR decision logs; SAR submissions/acknowledgements; timeliness MI; SAR quality reviews.",
    owner: "MLRO / Nominated Officer",
    frequency: "Per suspicion; MI monthly",
    related_policies: "SAR Reporting Procedure; Internal Escalation Procedure; MLRO Decisioning Standard",
    notes: "Maintain clear criteria for escalation and documentation of why SAR was/was not filed.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/who-we-are/publications/775-ukfiu-chapter-2-submitting-a-sar/file.pdf",
  },
  {
    code: "CTF-TA2000-009",
    category: "Tipping-off Controls",
    title: "Customer Communication Controls to Prevent Tipping Off",
    description: "Restrict disclosure about SARs/investigations; implement customer comms scripts and approval gates; apply need-to-know access controls to cases to avoid prejudicing investigations.",
    framework_sections: "TA 2000 tipping off: regulated sector (s21D).",
    evidence: "RBAC matrices; comms templates; approvals; staff attestations; incident logs.",
    owner: "Financial Crime Compliance / Customer Operations",
    frequency: "Ongoing; review semi-annually",
    related_policies: "Tipping-Off Prevention Procedure; Customer Contact & Holds SOP",
    notes: "Train front-line and customer support staff on safe communications during investigations.",
    primary_source_url: "https://www.legislation.gov.uk/ukpga/2000/11/section/21D",
  },
  {
    code: "CTF-TA2000-010",
    category: "Record Keeping",
    title: "CTF Record Retention and Audit Trail",
    description: "Maintain records sufficient to reconstruct decisions (who knew what, when, and actions taken), including KYC, monitoring, investigation notes, SAR decisions and submissions, and communications.",
    framework_sections: "Supports demonstrability of compliance for TA 2000 (notably s21A and s21D) and aligns with AML/CTF expectations in JMLSG guidance.",
    evidence: "Retention schedule; evidence repositories; audit logs; case file completeness checks; backup and integrity controls.",
    owner: "Operations / Compliance / IT",
    frequency: "Ongoing; retention reviewed annually",
    related_policies: "Record Keeping Policy; Data Retention Schedule; Case Management SOP",
    notes: "Ensure retention periods meet legal/regulatory requirements and are consistently applied across systems.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2022/07/JMLSG-Guidance-Part-I_July-2022.pdf",
  },
  {
    code: "CTF-TA2000-011",
    category: "Training & Awareness",
    title: "Role-based AML/CTF Training Including TF & Tipping-off",
    description: "Deliver role-based training covering TF red flags, internal escalation, SAR process, and tipping-off boundaries; test comprehension and remediate gaps.",
    framework_sections: "JMLSG highlights staff exposure to criminal penalties under POCA and the Terrorism Act and the need for training; supports compliance with TA 2000 s21A/s21D.",
    evidence: "Training materials; attendance/completion logs; assessment results; remediation records.",
    owner: "L&D / Compliance",
    frequency: "At least annually; plus new joiners and role changes",
    related_policies: "Training Policy; AML/CTF Training Curriculum; Competency Assessment SOP",
    notes: "Include targeted training for investigators, customer support, and onboarding teams.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2022/09/Consultation-Sept-2022_Board-approved_Ch-7.pdf",
  },
  {
    code: "CTF-TA2000-012",
    category: "Third-Party Oversight",
    title: "Vendor/Outsourcing Oversight for AML/CTF Activities",
    description: "Where third parties support KYC, screening, monitoring, or investigations, perform due diligence, define SLAs, retain oversight, and ensure reporting obligations are not effectively weakened by outsourcing.",
    framework_sections: "UKFIU guidance notes reporting obligations cannot be devolved/outsourced; supports timely SAR reporting under TA 2000/regulated sector expectations.",
    evidence: "Vendor due diligence; contracts and SLAs; QA results; incident logs; audit reports.",
    owner: "Outsourcing/Vendor Management / Compliance",
    frequency: "At onboarding; ongoing monitoring quarterly; annual review",
    related_policies: "Third-Party Risk Policy; Vendor Due Diligence Procedure; Outsourcing Oversight SOP",
    notes: "Define escalation and access to underlying evidence needed for SAR decisions.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/who-we-are/publications/774-ukfiu-chapter-1-using-the-sar-portal/file",
  },
];

async function main() {
  console.log("Seeding TA2000 (Terrorism Act 2000) framework and controls...");

  // 1. Create or find the TA2000 regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'TA2000' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing TA2000 source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'Terrorism Act 2000 – Counter-Terrorist Financing Controls',
        'TA2000',
        'United Kingdom',
        'https://www.legislation.gov.uk/ukpga/2000/11/contents',
        'Financial Crime',
        'The Terrorism Act 2000 (TA 2000) is the principal UK legislation addressing terrorist financing. Part III (ss15–18) creates offences relating to terrorist property (fund-raising, use/possession, funding arrangements, and money laundering). The regulated sector reporting obligation (s21A) and tipping-off provisions (s21D) require firms to maintain controls for detection, escalation, and reporting of terrorist financing activity.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created TA2000 source (id=${sourceId})`);
  }

  // 2. Insert controls
  console.log(`Inserting ${controls.length} TA2000 controls (source_id=${sourceId})...`);

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
