import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const POCA_SOURCE_ID = 4;

const controls = [
  {
    code: "POCA-01",
    category: "Governance & accountability",
    title: "Appoint MLRO / Nominated Officer",
    description: "Formally appoint a Nominated Officer/MLRO with written responsibilities to receive internal disclosures, assess suspicion, and decide on SAR/DAML submissions. Define escalation routes and deputisation.",
    framework_sections: "Part 7 failure-to-disclose regime; supports ss.330–331 processes",
    evidence: "Appointment letter; role description; org chart; escalation matrix",
    owner: "Compliance/MLRO",
    frequency: "Annual review (or on change)",
    related_policies: "Financial crime governance policy",
    notes: "Ensure coverage for absence and conflicts.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/money-laundering-and-illicit-finance/suspicious-activity-reports",
  },
  {
    code: "POCA-02",
    category: "Governance & accountability",
    title: "Board-approved financial crime framework",
    description: "Approve and maintain a financial crime framework (policies, risk appetite, governance) covering money laundering and POCA obligations; document ownership and oversight.",
    framework_sections: "Supports Part 7 compliance; broader financial crime systems & controls",
    evidence: "Board minutes; policy suite; risk appetite statement; committee terms of reference",
    owner: "Board/SMF; Compliance",
    frequency: "Annual review",
    related_policies: "Financial crime policy; risk management framework",
    notes: "Align with regulator expectations where applicable.",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fg18-05.pdf",
  },
  {
    code: "POCA-03",
    category: "Criminal property risk prevention (ss.327–329)",
    title: "Customer Due Diligence (CDD/KYC) & beneficial ownership",
    description: "Perform CDD and verify identity and beneficial ownership proportionate to risk; apply enhanced measures for higher-risk customers/structures.",
    framework_sections: "Principal ML offences ss.327–329 (avoid dealing with criminal property)",
    evidence: "KYC files; BO register extracts; EDD checklists",
    owner: "Onboarding; Compliance",
    frequency: "Onboarding + periodic refresh",
    related_policies: "CDD/EDD procedures",
    notes: "Refresh frequency should be risk-based.",
    primary_source_url: "https://www.legislation.gov.uk/ukpga/2002/29/notes/division/5/7",
  },
  {
    code: "POCA-04",
    category: "Criminal property risk prevention (ss.327–329)",
    title: "Source of funds / source of wealth verification",
    description: "Collect and evaluate source of funds/wealth evidence when risk triggers are met (unusual wealth, high value transfers, high-risk jurisdictions, complex structures).",
    framework_sections: "Principal ML offences ss.327–329",
    evidence: "SoF/SoW documents; review notes; approvals",
    owner: "Onboarding; Compliance",
    frequency: "Event-driven + periodic",
    related_policies: "SoF/SoW procedure",
    notes: "Define triggers and acceptable evidence types.",
    primary_source_url: "https://www.sra.org.uk/solicitors/guidance/proceeds-crime-guidance/",
  },
  {
    code: "POCA-05",
    category: "Criminal property risk prevention (ss.327–329)",
    title: "Risk scoring & periodic review",
    description: "Maintain customer/jurisdiction/product risk scoring, with periodic refresh and event-driven review for material changes.",
    framework_sections: "Principal ML offences ss.327–329 (risk mitigation)",
    evidence: "Risk model; review logs; exception reports",
    owner: "Compliance/Financial Crime",
    frequency: "Quarterly/Annual (risk-based)",
    related_policies: "Risk assessment methodology",
    notes: "Document model governance and overrides.",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fg18-05.pdf",
  },
  {
    code: "POCA-06",
    category: "Criminal property risk prevention (ss.327–329)",
    title: "Transaction monitoring & alert triage",
    description: "Monitor transactions for unusual patterns; generate alerts; document triage, investigation, and escalation criteria to MLRO.",
    framework_sections: "Principal ML offences ss.327–329; supports ss.330 escalation",
    evidence: "Monitoring rules; alert case files; QA results",
    owner: "Financial Crime Ops",
    frequency: "Ongoing",
    related_policies: "Transaction monitoring procedure",
    notes: "Tune rules to typologies relevant to your business.",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fg18-05.pdf",
  },
  {
    code: "POCA-07",
    category: "Criminal property risk prevention (ss.327–329)",
    title: "Hold / stop processing capability",
    description: "Implement operational ability to pause onboarding/transactions when suspicion arises, pending investigation and (if needed) SAR/DAML decision.",
    framework_sections: "Avoid committing prohibited act under ss.327–329; enables DAML workflow",
    evidence: "System screenshots; hold logs; customer comms templates",
    owner: "Ops; Financial Crime",
    frequency: "Event-driven",
    related_policies: "Case management / holds procedure",
    notes: "Ensure customer messaging avoids tipping off.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/who-we-are/publications/776-ukfiu-chapter-3-understanding-damls-and-datfs/file",
  },
  {
    code: "POCA-08",
    category: "Suspicion escalation & reporting (ss.330–331)",
    title: "Internal suspicion reporting process",
    description: "Define and train a mandatory internal disclosure route for staff to report knowledge/suspicion (or reasonable grounds where applicable) to the MLRO promptly using a standard form.",
    framework_sections: "Failure to disclose (regulated sector) s.330; related obligations s.331",
    evidence: "Internal SAR forms; training records; reporting logs",
    owner: "All staff; MLRO",
    frequency: "Ongoing",
    related_policies: "Internal SAR procedure",
    notes: "Time expectations (e.g., same day) should be documented.",
    primary_source_url: "https://www.legislation.gov.uk/ukpga/2002/29/section/330",
  },
  {
    code: "POCA-09",
    category: "Suspicion escalation & reporting (ss.330–331)",
    title: "MLRO assessment & decision workflow",
    description: "Document MLRO triage/investigation steps, decision rationale, and approvals for SAR submission or no-SAR outcomes; maintain a case file for auditability.",
    framework_sections: "Supports ss.330–331 compliance and defensibility",
    evidence: "Case files; decision logs; QA/audit reports",
    owner: "MLRO",
    frequency: "Per case",
    related_policies: "MLRO operating procedure",
    notes: "Include second-line QA for quality and consistency.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/who-we-are/publications/775-ukfiu-chapter-2-submitting-a-sar/file.pdf",
  },
  {
    code: "POCA-10",
    category: "Suspicion escalation & reporting (ss.330–331)",
    title: "External SAR submission (UKFIU/NCA)",
    description: "Submit SARs via approved NCA/UKFIU channels with complete identifiers and a clear narrative; track submissions and outcomes.",
    framework_sections: "Part 7 SAR regime; supports ss.330–331",
    evidence: "SAR acknowledgements; submission logs; narrative templates",
    owner: "MLRO/UKFIU liaison",
    frequency: "Per case",
    related_policies: "SAR submission procedure",
    notes: "Implement SAR quality checks before submission.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/money-laundering-and-illicit-finance/suspicious-activity-reports",
  },
  {
    code: "POCA-11",
    category: "DAML / appropriate consent (s.335)",
    title: "DAML request playbook and timelines",
    description: "When a transaction may constitute a prohibited act, implement a DAML request workflow: pause activity, submit defence request, track statutory timeframes, and release only when permitted.",
    framework_sections: "Defence / appropriate consent under s.335 (DAML)",
    evidence: "DAML requests; timer tracking; release approvals",
    owner: "MLRO; Ops",
    frequency: "Per case",
    related_policies: "DAML procedure",
    notes: "Define criteria for DAML vs SAR-only submissions.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/who-we-are/publications/776-ukfiu-chapter-3-understanding-damls-and-datfs/file",
  },
  {
    code: "POCA-12",
    category: "Anti–tipping off & confidentiality",
    title: "Customer communications guardrails",
    description: "Restrict and standardise customer communications during holds/investigations to avoid tipping off; implement approved scripts and escalation to Compliance for exceptions.",
    framework_sections: "Part 7 tipping off / prejudice provisions (e.g., s.333A context)",
    evidence: "Templates; approvals; call recordings (where applicable)",
    owner: "Customer Ops; Compliance",
    frequency: "Ongoing",
    related_policies: "Customer communications policy",
    notes: "Keep case access on a need-to-know basis.",
    primary_source_url: "https://www.legislation.gov.uk/ukpga/2002/29/part/7",
  },
  {
    code: "POCA-13",
    category: "Anti–tipping off & confidentiality",
    title: "Access controls & secure case management",
    description: "Limit access to SAR/DAML cases and related information; use role-based permissions, audit logs, and secure storage for supporting documents.",
    framework_sections: "Supports tipping off controls and SAR confidentiality",
    evidence: "Access matrices; system audit logs; data retention settings",
    owner: "IT Security; Compliance",
    frequency: "Ongoing",
    related_policies: "Information security policy",
    notes: "Include secure handling of SAR reference numbers.",
    primary_source_url: "https://www.legislation.gov.uk/ukpga/2002/29/part/7",
  },
  {
    code: "POCA-14",
    category: "Training & competence",
    title: "Role-based POCA/SAR/DAML training",
    description: "Provide induction and refresher training on suspicion indicators, internal reporting, SAR/DAML processes, and tipping-off prohibitions; assess competence for high-risk roles.",
    framework_sections: "Supports ss.330–331 compliance and tipping-off prevention",
    evidence: "Training materials; attendance; assessments",
    owner: "HR; Compliance",
    frequency: "Annual + onboarding",
    related_policies: "Training policy",
    notes: "Track completion and follow up non-completions.",
    primary_source_url: "https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/money-laundering-and-illicit-finance/suspicious-activity-reports",
  },
  {
    code: "POCA-15",
    category: "Assurance & testing",
    title: "Quality assurance and independent testing",
    description: "Test the end-to-end POCA control environment: internal disclosures, MLRO decisions, SAR quality, DAML handling, and tipping-off controls; remediate findings.",
    framework_sections: "Supports defensibility across Part 7 obligations",
    evidence: "QA checklists; audit reports; issue logs; remediation tracking",
    owner: "2nd line / Internal Audit",
    frequency: "Quarterly/Annual",
    related_policies: "Assurance plan",
    notes: "Use metrics (timeliness, SAR rejection rates, QA findings).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fg18-05.pdf",
  },
  {
    code: "POCA-16",
    category: "Law enforcement cooperation / asset recovery readiness",
    title: "LE request handling (production orders, etc.)",
    description: "Maintain a controlled process to receive, triage, and respond to law enforcement requests and orders, preserving evidence and ensuring legal review.",
    framework_sections: "POCA asset recovery framework (supporting operational readiness)",
    evidence: "Request logs; legal reviews; evidence preservation records",
    owner: "Legal; Compliance",
    frequency: "As needed",
    related_policies: "LE request procedure",
    notes: "Keep strict confidentiality and access controls.",
    primary_source_url: "https://www.ukciu.gov.uk/%28xwxqxm55yk5tzxbr0dznv2en%29/Information/info.aspx?InfoSection=Legislation",
  },
];

async function main() {
  console.log(`Inserting ${controls.length} POCA controls (source_id=${POCA_SOURCE_ID})...`);

  for (const c of controls) {
    await sql`
      INSERT INTO controls (
        source_id, code, title, description, category,
        evidence, owner, notes,
        framework_sections, frequency, related_policies, primary_source_url
      ) VALUES (
        ${POCA_SOURCE_ID}, ${c.code}, ${c.title}, ${c.description}, ${c.category},
        ${c.evidence}, ${c.owner}, ${c.notes},
        ${c.framework_sections}, ${c.frequency}, ${c.related_policies}, ${c.primary_source_url}
      )
      ON CONFLICT DO NOTHING
    `;
    console.log(`  ✓ ${c.code} — ${c.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
