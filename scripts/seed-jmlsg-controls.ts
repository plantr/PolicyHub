/**
 * Seed script: JMLSG (Joint Money Laundering Steering Group) Controls – EMI/Payments
 *
 * Creates the JMLSG regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-jmlsg-controls.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const controls = [
  {
    code: "JMLSG-EMI-001",
    category: "Governance & Culture",
    title: "Senior Management Responsibility & MLRO Standing",
    description: "Ensure AML/CTF governance gives the MLRO/nominated officer sufficient seniority, authority, access, and independence; set clear reporting lines, escalation routes, and board-level oversight of AML/CTF effectiveness.",
    framework_sections: "Part I: Governance expectations; MLRO standing and effectiveness monitoring themes (see current Part I and published revisions).",
    evidence: "MLRO terms of reference; reporting line evidence; governance minutes; AML/CTF MI; annual effectiveness review; internal audit reports.",
    owner: "Board / SMF (where applicable) / MLRO / Compliance",
    frequency: "Ongoing; board reporting at least quarterly",
    related_policies: "AML/CTF Governance Standard; MLRO Charter; Escalation Procedure",
    notes: "Monitor JMLSG revisions and incorporate updates to governance expectations.",
    primary_source_url: "https://www.jmlsg.org.uk/revisions/",
  },
  {
    code: "JMLSG-EMI-002",
    category: "Risk-Based Approach",
    title: "Documented Risk-Based Methodology and Control Mapping",
    description: "Maintain a documented risk-based approach that explains how inherent ML/TF risks drive the choice, intensity and frequency of controls (CDD/EDD, monitoring, TM, reviews) and how residual risk is assessed.",
    framework_sections: "Part I: Risk-based approach and proportionality across products, customers and channels.",
    evidence: "Risk methodology; risk scoring models; control mapping; periodic validation and tuning; approvals.",
    owner: "Risk / Financial Crime Compliance",
    frequency: "At least annually; on material change",
    related_policies: "Risk Assessment Methodology; Control Framework Mapping Standard",
    notes: "Use JMLSG as interpretive guidance alongside statutory requirements (MLRs/POCA/TA2000).",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-003",
    category: "Customer Due Diligence",
    title: "CDD Standards (Identification, Verification, Purpose/Expected Activity)",
    description: "Apply CDD proportionate to risk: verify identity, collect adequate customer information, understand purpose/expected activity where relevant, and ensure documentation standards support effective monitoring and investigations.",
    framework_sections: "Part I: Customer due diligence and related monitoring principles; applicable across sectors.",
    evidence: "KYC files; verification evidence; expected activity profiles; data quality checks; refresh logs.",
    owner: "Onboarding Ops / Compliance",
    frequency: "Per onboarding; refresh risk-based",
    related_policies: "KYC Procedure; Customer Risk Scoring SOP; Data Standards",
    notes: "Ensure controls cover digital onboarding and impersonation risk mitigations.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-004",
    category: "Customer Due Diligence",
    title: "Beneficial Ownership & Control (Corporate Customers/Merchants)",
    description: "Identify beneficial owners/controllers and understand ownership/control structures. Document rationale and apply enhanced measures where ownership/control is complex or opaque.",
    framework_sections: "Part I: CDD and beneficial ownership themes; Part II sector guidance also addresses business-specific applications.",
    evidence: "UBO registers; structure charts; verification evidence; decision memos; ongoing monitoring.",
    owner: "Onboarding Ops / Compliance / Legal",
    frequency: "Per onboarding; refresh risk-based",
    related_policies: "Corporate KYC Procedure; Beneficial Ownership SOP",
    notes: "Apply to merchants, corporate wallets, agents, and key partners in payment chains.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-005",
    category: "Enhanced Due Diligence",
    title: "EDD Triggers, Approvals and Compensating Controls",
    description: "Define EDD triggers and requirements (eg high-risk geographies/corridors, complex ownership, higher-risk products, unusual funding) with documented approvals, source of funds/wealth (where required), and enhanced monitoring.",
    framework_sections: "Part I: EDD and high-risk factors; application under the risk-based approach.",
    evidence: "EDD packs; approvals; SoF/SoW evidence; adverse media; enhanced monitoring plans.",
    owner: "Financial Crime Compliance / Onboarding",
    frequency: "Per trigger; periodic review risk-based",
    related_policies: "EDD Procedure; High-Risk Customer Standard; Adverse Media Procedure",
    notes: "Implement consistent approval thresholds and evidence standards across channels.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-006",
    category: "PEP and High-Risk Screening",
    title: "PEP Identification and Risk Management",
    description: "Identify PEPs and apply proportionate enhanced measures, approvals, and ongoing monitoring. Maintain screening governance, rescreening cadence, and audit trails of decisions.",
    framework_sections: "Part I: PEP treatment and risk management principles (within CDD/EDD guidance).",
    evidence: "PEP screening results; adjudication logs; approvals; enhanced monitoring evidence; periodic reviews.",
    owner: "Financial Crime Ops / Compliance",
    frequency: "At onboarding; ongoing rescreen; review at least annually for PEPs",
    related_policies: "PEP Procedure; Screening Governance Standard",
    notes: "Harmonise with sanctions screening workflows (SAMLA controls) to avoid fragmented decisioning.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-007",
    category: "Ongoing Monitoring",
    title: "Ongoing Monitoring of Business Relationships",
    description: "Conduct ongoing monitoring to ensure transactions are consistent with customer profile, risk rating and expected activity; keep customer information up-to-date and refresh as required.",
    framework_sections: "Part I: Ongoing monitoring expectations and proportionality.",
    evidence: "Periodic review records; trigger logs; refreshed KYC evidence; updated risk scores; monitoring outcomes MI.",
    owner: "Financial Crime Ops / Compliance",
    frequency: "Continuous; periodic reviews risk-based",
    related_policies: "Ongoing Monitoring SOP; KYC Refresh SOP",
    notes: "Define triggers for EMIs: rapid volume growth, corridor shifts, multiple funding sources, unusual refund patterns.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-008",
    category: "Transaction Monitoring",
    title: "Scenario-Based Transaction Monitoring and Tuning",
    description: "Implement typology-based monitoring across rails (wallet, bank transfer, cards, payouts, refunds). Maintain scenario governance, tuning, QA sampling, and change control.",
    framework_sections: "Part I: Systems and controls supporting monitoring; sectoral adaptations per Part II where relevant.",
    evidence: "Scenario library; tuning logs; alert queues; investigation outcomes; QA results; model/rules change tickets.",
    owner: "Financial Crime Monitoring / Compliance",
    frequency: "Continuous; tuning at least quarterly (risk-based)",
    related_policies: "TM Standard; Alert Triage Playbook; Change Control Procedure",
    notes: "Ensure near real-time monitoring for high-velocity payment use cases common to EMIs.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-009",
    category: "SAR / Intelligence",
    title: "Suspicion Escalation and SAR Decisioning Quality",
    description: "Maintain procedures for internal suspicion reporting, MLRO decisioning, SAR submissions, and post-SAR controls (confidentiality, restricted access, safe customer communications).",
    framework_sections: "Part I: Reporting suspicion and handling intelligence; links to POCA/TA2000 offence context.",
    evidence: "Internal suspicion reports; SAR decision logs; SAR submissions; access control logs; QA reviews; MI on timeliness/quality.",
    owner: "MLRO / Nominated Officer",
    frequency: "Per suspicion; MI monthly",
    related_policies: "SAR Procedure; Internal Escalation SOP; Case Management Procedure",
    notes: "Ensure procedures address subject access requests and confidentiality controls where relevant.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-010",
    category: "Training & Awareness",
    title: "Role-Based AML/CTF Training and Competence",
    description: "Deliver role-based training and competency testing covering AML/CTF risks, red flags, CDD/EDD, monitoring, SAR process, and practical role expectations (ops, payments, support, engineering).",
    framework_sections: "Part I: Staff awareness and training expectations as part of effective systems and controls.",
    evidence: "Training materials; completion logs; assessments; remediation; role-based curriculum map.",
    owner: "L&D / Compliance / MLRO",
    frequency: "At least annually; joiners and role changes",
    related_policies: "Training Policy; AML/CTF Training Curriculum; Competency Testing SOP",
    notes: "Include drills for payments exception handling and fraud/ML overlap scenarios.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-011",
    category: "Record Keeping",
    title: "Record Keeping and Retrievability (CDD, Monitoring, SAR Audit Trail)",
    description: "Maintain orderly records supporting CDD/EDD, monitoring, investigations, and SAR decisions. Ensure records are retrievable, secure, and retained per legal requirements.",
    framework_sections: "Part I: Record keeping expectations within AML/CTF systems and controls.",
    evidence: "Retention schedule; evidence repositories; immutable logs; retrieval test results; access controls.",
    owner: "Compliance / Operations / IT",
    frequency: "Ongoing; retention review annually; retrieval tests quarterly",
    related_policies: "Record Keeping Policy; Data Retention Schedule; Access Control Policy",
    notes: "Align retention with MLRs 2017 and operational needs for disputes, complaints and fraud.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-012",
    category: "Payments Specialist",
    title: "Transfer of Funds (Payer/Payee Information) Controls",
    description: "For payment transfers, ensure required payer/payee information accompanies the transfer; detect missing or meaningless data and apply risk-based actions (reject/repair/request info) with defined SLAs and audit trails.",
    framework_sections: "Part III: Specialist guidance for payment service providers on transfer of funds / payer-payee information handling.",
    evidence: "Rail field mapping; exception logs; reject/repair SLAs; QA samples; partner comms; controls testing evidence.",
    owner: "Payments Ops / Compliance / IT",
    frequency: "Continuous; QA monthly/quarterly",
    related_policies: "Funds Transfer Data SOP; Exception Handling Playbook; Rail Processing Guides",
    notes: "Critical for EMIs with cross-border flows and high STP. Ensure consistent handling across partners.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2020/06/JMLSG-Guidance_Part-III_June-2020.pdf",
  },
  {
    code: "JMLSG-EMI-013",
    category: "Sector Guidance (EMI)",
    title: "Electronic Money Sector Guidance Application",
    description: "Apply sector-specific guidance for electronic money issuers, documenting how CDD and monitoring are adapted for e-money products (including where simplified measures may be appropriate) while remaining consistent with Part I principles.",
    framework_sections: "Part II Sector 3: Electronic money (used alongside Part I and Part III).",
    evidence: "Product risk assessments; CDD rules for e-money; simplified measure rationale; monitoring calibration evidence; approvals.",
    owner: "Product / Compliance / MLRO",
    frequency: "At product launch and on change; review annually",
    related_policies: "E-money Product Governance; Simplified Due Diligence SOP; Product Risk Assessment Procedure",
    notes: "Ensure any simplifications are justified by risk assessment and remain within applicable law.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2020/06/Part-II-Sector-3_June-2020_Marked-up.pdf",
  },
  {
    code: "JMLSG-EMI-014",
    category: "Outsourcing & Third Parties",
    title: "Applying JMLSG Expectations to Outsourced/Partnered Controls",
    description: "Where KYC, screening, monitoring or processing is outsourced, ensure JMLSG-aligned expectations are met: oversight, access to data/evidence, QA, and clear accountability.",
    framework_sections: "Part I: Systems and controls and application in different business models; Part II sector guidance may apply based on activities.",
    evidence: "Vendor due diligence; contracts/SLAs; audit rights; monitoring reports; QA results; incident logs; exit plans.",
    owner: "Vendor Management / Compliance / Operations",
    frequency: "At onboarding; monitoring quarterly; annual review",
    related_policies: "Outsourcing Policy; Vendor Due Diligence SOP; Oversight Procedure",
    notes: "Pay attention to nested payment chains where data needed for CDD/monitoring may be fragmented.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-015",
    category: "Guidance Maintenance",
    title: "JMLSG Guidance Version Control and Implementation",
    description: "Maintain a controlled process to track JMLSG guidance versions, revisions and ministerial approvals; perform impact assessments; update policies/training; retain evidence of implementation.",
    framework_sections: "JMLSG publishes current guidance, revisions and consultations; firms should keep control frameworks aligned to the approved guidance used by courts/regulators.",
    evidence: "Horizon scanning logs; impact assessments; policy updates; training communications; change tickets; evidence of version review.",
    owner: "Compliance / Legal",
    frequency: "Ongoing; review at least quarterly",
    related_policies: "Regulatory Change Management Procedure; Policy Update SOP",
    notes: "Use JMLSG \u2018Current Guidance\u2019, \u2018Revisions\u2019 and \u2018News\u2019 pages as inputs.",
    primary_source_url: "https://www.jmlsg.org.uk/news/",
  },
  {
    code: "JMLSG-EMI-016",
    category: "Assurance & Testing",
    title: "JMLSG-aligned Control Effectiveness Testing",
    description: "Perform periodic assurance to demonstrate that controls (CDD quality, monitoring, TM, SAR process, transfer of funds data handling) operate as designed and meet JMLSG expectations; track issues to closure.",
    framework_sections: "Part I/III: Emphasis on effective systems and controls and evidencing effectiveness.",
    evidence: "QA plans; sampling results; testing evidence; issue logs; remediation tracker; independent review reports.",
    owner: "2LOD Compliance Assurance / Internal Audit",
    frequency: "Quarterly (risk-based); independent review at least annually",
    related_policies: "QA & Testing Standard; Issue Management Procedure; Change Control Procedure",
    notes: "Include regression tests after product changes, vendor changes, and payments data changes.",
    primary_source_url: "https://www.jmlsg.org.uk/wp-content/uploads/2025/08/JMLSG-Guidance-Part-I_June-2023-updated-Nov-2024.pdf",
  },
  {
    code: "JMLSG-EMI-017",
    category: "Documentation",
    title: "Policy/Procedure Mapping to JMLSG Structure",
    description: "Maintain a mapping from internal policies and SOPs to JMLSG Part I/II/III sections to demonstrate interpretive coverage and provide auditability for supervisors and internal assurance.",
    framework_sections: "Part I/II/III mapping for coverage and evidence of interpretive compliance.",
    evidence: "Mapping matrix; policy inventory; SOP library; cross-references; audit trail of updates.",
    owner: "Compliance / Document Control",
    frequency: "Review at least annually; update on change",
    related_policies: "Policy Management Procedure; Document Control Standard",
    notes: "Useful to support audits and to explain proportionality decisions for EMIs.",
    primary_source_url: "https://www.jmlsg.org.uk/guidance/current-guidance/",
  },
];

async function main() {
  console.log("Seeding JMLSG (Joint Money Laundering Steering Group) framework and controls...");

  // 1. Create or find the JMLSG regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'JMLSG' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing JMLSG source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'JMLSG Guidance – EMI/Payments Controls',
        'JMLSG',
        'United Kingdom',
        'https://www.jmlsg.org.uk/guidance/current-guidance/',
        'Financial Crime',
        'The Joint Money Laundering Steering Group (JMLSG) publishes industry guidance on AML/CTF for the UK financial sector. Part I covers general principles (risk-based approach, CDD, EDD, monitoring, reporting, training, record keeping). Part II provides sector-specific guidance (including Sector 3 for electronic money issuers). Part III covers transfer of funds (payer/payee information) requirements for payment service providers. The guidance is approved by HM Treasury and used by courts and regulators as an interpretive benchmark.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created JMLSG source (id=${sourceId})`);
  }

  // 2. Insert controls
  console.log(`Inserting ${controls.length} JMLSG controls (source_id=${sourceId})...`);

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
