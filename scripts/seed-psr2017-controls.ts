/**
 * Seed script: PSR2017 (Payment Services Regulations 2017) Controls – EMI/Payments
 *
 * Creates the PSR2017 regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-psr2017-controls.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const controls = [
  {
    code: "PAY-PSR17-001",
    category: "Governance & Accountability",
    title: "PSRs Compliance Framework (EMI/Payments)",
    description: "Maintain a PSRs compliance framework with clear senior ownership, documented governance, and MI covering conduct, safeguarding (where applicable), operational/security incidents, customer outcomes, and remediation.",
    framework_sections: "PSRs 2017 overall compliance; FCA expectations described in the Payment Services & Electronic Money Approach Document.",
    evidence: "Board/committee minutes; RACI; compliance MI; annual compliance plan; internal audit reports; remediation tracker.",
    owner: "Board / SMF (where applicable) / Compliance",
    frequency: "Ongoing; formal review at least annually",
    related_policies: "Payments Compliance Policy; Governance Standard; Issue Management Procedure",
    notes: "Ensure governance covers all payment services you provide (e.g., money remittance, execution, acquiring, account services).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-002",
    category: "Authorisation & Permissions",
    title: "Authorisation / Registration & Ongoing Permissions Monitoring",
    description: "Maintain controls to ensure you hold the correct FCA authorisation/registration status for the payment services you provide, and continuously monitor for changes (new services, agents, cross-border activity).",
    framework_sections: "PSRs 2017 authorisation/registration regime and FCA supervisory approach.",
    evidence: "Permissions register; service taxonomy mapping to permissions; change impact assessments; approvals; FCA correspondence.",
    owner: "Compliance / Legal / Regulatory Affairs",
    frequency: "Ongoing; review quarterly",
    related_policies: "Regulatory Change Management; New Product Approval; Permissions Management SOP",
    notes: "Include controls for agents and distributors where used.",
    primary_source_url: "https://www.fca.org.uk/firms/payment-services-regulations-e-money-regulations",
  },
  {
    code: "PAY-PSR17-003",
    category: "Safeguarding",
    title: "Safeguarding Arrangements (Funds Segregation / Insurance) and Reconciliations",
    description: "Operate safeguarding arrangements for relevant customer funds, with daily/regular reconciliations, escalation for breaks, and documented safeguarding method (segregation and/or insurance/guarantee where applicable).",
    framework_sections: "Safeguarding requirements for payment and e-money firms and FCA policy updates on safeguarding regime.",
    evidence: "Safeguarding policy; designated accounts evidence; daily reconciliation reports; break logs; auditor reports; safeguarding attestation/evidence packs.",
    owner: "Finance / Operations with Compliance oversight",
    frequency: "Daily (reconciliations); governance monthly",
    related_policies: "Safeguarding Policy; Reconciliation SOP; Break Management Procedure",
    notes: "Safeguarding requirements and expectations have been subject to FCA policy updates; track and implement changes.",
    primary_source_url: "https://www.fca.org.uk/publications/policy-statements/ps25-12-changes-safeguarding-regime-payments-and-e-money-firms",
  },
  {
    code: "PAY-PSR17-004",
    category: "Prudential / Capital",
    title: "Capital and Prudential Monitoring (PI/EMI)",
    description: "Maintain prudential monitoring for own funds and other prudential requirements applicable to your authorisation type; trigger escalation on thresholds and forecast under stress scenarios.",
    framework_sections: "PSRs 2017 prudential framework and FCA approach to payment institutions and e-money firms.",
    evidence: "Capital calculations; prudential returns; forecasts; stress tests; breach/escalation logs.",
    owner: "Finance / Risk / Compliance",
    frequency: "Monthly; ad hoc on material change",
    related_policies: "Prudential Monitoring SOP; ICAAP-like Prudential Assessment (if applicable)",
    notes: "Map obligations to your authorisation class (small/authorised PI, EMI, etc.).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-005",
    category: "Conduct of Business",
    title: "Customer Information Disclosures (Pre-contract & Ongoing)",
    description: "Provide required information to payment service users (fees, charges, execution times, FX, complaints) in a clear, fair and not misleading way; maintain version control and approval workflows for disclosures.",
    framework_sections: "PSRs 2017 conduct of business and information requirements; FCA approach document provides interpretative guidance.",
    evidence: "Terms & conditions; fee schedules; disclosure templates; version history; approvals; customer testing/QA evidence.",
    owner: "Product / Legal / Compliance",
    frequency: "On change; review at least annually",
    related_policies: "Customer Disclosure Policy; T&Cs Governance; Pricing Change Procedure",
    notes: "Ensure disclosures are consistent across channels (app, web, API docs).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-006",
    category: "Execution & Settlement",
    title: "Payment Execution Times / Value Dating / Cut-off Controls",
    description: "Implement controls to meet execution time and value-dating requirements (including cut-off times), with monitoring and exception handling for failed/delayed payments.",
    framework_sections: "PSRs 2017 rights and obligations for payment transactions; FCA approach document discusses application in practice.",
    evidence: "SLA dashboards; incident logs; exception reports; customer communications; root-cause analyses.",
    owner: "Payments Operations",
    frequency: "Continuous monitoring; KPI review weekly/monthly",
    related_policies: "Payments Operations SOP; Exception Handling Playbook; Customer Comms SOP",
    notes: "Include controls for instant payments where applicable (higher operational risk).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-007",
    category: "Complaints & Redress",
    title: "Complaints Handling and Redress (Including FSCS/FOS Touchpoints Where Applicable)",
    description: "Maintain a compliant complaints process, including triage, investigation, response SLAs, root-cause analysis, and reporting. Provide clear escalation routes (e.g., FOS where applicable).",
    framework_sections: "PSRs 2017 conduct and consumer protection; FCA approach sets supervisory expectations for payments firms.",
    evidence: "Complaints logs; final response letters; RCA reports; MI; policy attestations; training records.",
    owner: "Customer Operations / Compliance",
    frequency: "Continuous; MI monthly",
    related_policies: "Complaints Policy; Redress Procedure; RCA Procedure",
    notes: "Ensure complaints process covers fraud/scams, disputed transactions, and chargebacks (where relevant).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-008",
    category: "Disputed / Unauthorised Transactions",
    title: "Unauthorised Transaction Handling and Refund Controls",
    description: "Implement controls to identify and handle unauthorised transactions, disputes, and refunds, including clear evidential standards, decisioning, and customer communication timelines.",
    framework_sections: "PSRs 2017 rights/obligations for unauthorised transactions and refunds; FCA approach guidance.",
    evidence: "Dispute case files; decision logs; refund records; chargeback logs (if applicable); QA results.",
    owner: "Fraud Operations / Customer Operations",
    frequency: "Per case; QA sampling monthly",
    related_policies: "Disputes & Refunds Procedure; Chargeback SOP; Customer Comms SOP",
    notes: "Align with SCA outcomes and fraud analytics to reduce repeat harm.",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-009",
    category: "Security & Authentication",
    title: "Strong Customer Authentication (SCA) and Exemption Governance",
    description: "Implement SCA for relevant electronic payments/access and manage exemptions (e.g., low-value/contactless/TRA) with governance, monitoring, and evidence of compliance.",
    framework_sections: "SCA requirements and related technical standards applicable to PSPs in the UK.",
    evidence: "SCA design docs; exemption policy; TRA model evidence (if used); monitoring dashboards; audit logs; penetration test results.",
    owner: "Security / Product / Compliance",
    frequency: "Continuous; exemption governance monthly/quarterly",
    related_policies: "SCA Policy; Authentication Standards; Exemptions Governance SOP",
    notes: "Keep technical standards and FCA expectations under review as they evolve.",
    primary_source_url: "https://www.fca.org.uk/firms/strong-customer-authentication",
  },
  {
    code: "PAY-PSR17-010",
    category: "Security & Open Banking",
    title: "Common and Secure Communication / API Security Controls (Where Applicable)",
    description: "If providing account access/open banking interfaces, maintain secure communication, API availability monitoring, access controls, and change management to meet technical standards and protect customer data.",
    framework_sections: "Technical standards for strong customer authentication and common and secure methods of communication (as applicable).",
    evidence: "API security controls; availability/SLA metrics; change approvals; incident logs; third-party access logs; security testing.",
    owner: "Engineering / Security / Compliance",
    frequency: "Continuous; change controls per release; reporting monthly",
    related_policies: "API Security Standard; Change Management; Access Management Policy",
    notes: "Applicable primarily to ASPSPs/AIS/PIS models; tailor to your role in the ecosystem.",
    primary_source_url: "https://handbook.fca.org.uk/techstandards/PS/2021/2021_01/?view=chapter",
  },
  {
    code: "PAY-PSR17-011",
    category: "Operational Resilience / Incidents",
    title: "Major Operational or Security Incident Reporting to FCA",
    description: "Maintain incident detection and classification criteria, and submit major incident notifications to the FCA within required timelines; track follow-ups and post-incident remediation.",
    framework_sections: "PSRs 2017 operational/security incident reporting and FCA notification expectations.",
    evidence: "Incident reports; FCA notification forms; timelines; post-incident reviews; remediation tracker.",
    owner: "Operations / Security / Compliance",
    frequency: "Per incident; testing quarterly",
    related_policies: "Incident Management Policy; Major Incident Reporting SOP; Post-Incident Review Procedure",
    notes: "FCA states PSPs must report major incidents using its form and provides timing guidance.",
    primary_source_url: "https://www.fca.org.uk/firms/notifications-under-psrs",
  },
  {
    code: "PAY-PSR17-012",
    category: "Fraud Risk Management",
    title: "Fraud Prevention and Monitoring (Including APP Fraud Controls Where Applicable)",
    description: "Implement fraud controls across onboarding and transaction lifecycle (screening, behavioural analytics, payee checks, velocity controls, scam interventions) and monitor outcomes and false positives.",
    framework_sections: "FCA guidance updates support a risk-based approach to payments and fraud, including APP-fraud-related expectations.",
    evidence: "Fraud strategy; monitoring dashboards; intervention logs; model validation; customer comms templates; outcomes MI.",
    owner: "Fraud / Financial Crime / Product",
    frequency: "Continuous; MI monthly",
    related_policies: "Fraud Risk Policy; Scam Intervention Playbook; Transaction Controls SOP",
    notes: "Map obligations to applicable APP fraud reimbursement or scheme rules where relevant to your payment rails.",
    primary_source_url: "https://www.fca.org.uk/publications/finalised-guidance/fg24-6-guidance-firms-enables-risk-based-approach-payments",
  },
  {
    code: "PAY-PSR17-013",
    category: "Outsourcing & Third Parties",
    title: "Outsourcing / Critical Third-Party Oversight",
    description: "Where critical functions are outsourced (processing, KYC, fraud tooling, cloud), perform due diligence, set SLAs/audit rights, monitor performance, and maintain exit/BCP plans.",
    framework_sections: "FCA approach document covers expectations for payment and e-money firms; outsourcing does not remove accountability.",
    evidence: "Vendor DD; contracts/SLAs; performance reports; audit results; BCP tests; exit plans.",
    owner: "Vendor Management / Operations / Compliance",
    frequency: "At onboarding; monitoring quarterly; annual review",
    related_policies: "Outsourcing Policy; Vendor Due Diligence SOP; Business Continuity Plan",
    notes: "Include sub-processor mapping and data access requirements for investigations and reporting.",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-014",
    category: "Agents & Distribution",
    title: "Agent/Distributor Governance and Monitoring (if used)",
    description: "Implement governance for agents/distributors: onboarding due diligence, training, conduct monitoring, complaints handling, and termination processes.",
    framework_sections: "PSRs 2017 regime for agents and FCA supervisory expectations set out in FCA publications.",
    evidence: "Agent register; due diligence packs; training logs; monitoring reports; audits; termination records.",
    owner: "Sales/Partnerships / Compliance",
    frequency: "At onboarding; monitoring quarterly",
    related_policies: "Agent Management SOP; Partner Due Diligence Procedure; Training Policy",
    notes: "Ensure customer disclosures remain accurate when distributed via third parties.",
    primary_source_url: "https://www.fca.org.uk/firms/emi-payment-institutions-key-publications",
  },
  {
    code: "PAY-PSR17-015",
    category: "Financial Crime Dependencies",
    title: "Sanctions Screening Dependency Controls (Interface with SAMLA)",
    description: "Ensure payment processing controls are integrated with sanctions screening/hit handling (holds/rejects) and reporting/licensing where applicable.",
    framework_sections: "PSRs 2017 operational controls often depend on sanctions compliance for payment execution decisions.",
    evidence: "Screening logs; interdiction rules; hold/reject audit trails; escalation records.",
    owner: "Sanctions Ops / Payments Ops",
    frequency: "Continuous; governance monthly",
    related_policies: "Sanctions Screening Procedure; Payments Interdiction SOP",
    notes: "Use the current UK Sanctions List as designation source for sanctions controls.",
    primary_source_url: "https://www.gov.uk/government/publications/the-uk-sanctions-list",
  },
  {
    code: "PAY-PSR17-016",
    category: "Regulatory Change",
    title: "PSRs Change Monitoring and Implementation",
    description: "Monitor changes to PSRs 2017 and FCA guidance (including Approach Document updates), assess impacts, update controls, and evidence implementation and training.",
    framework_sections: "PSRs 2017 are updated over time; FCA publishes updated Approach Document and policy statements affecting payments/e-money firms.",
    evidence: "Horizon scanning logs; impact assessments; implementation plans; updated policies; training evidence.",
    owner: "Compliance / Legal",
    frequency: "Ongoing; formal review quarterly",
    related_policies: "Regulatory Change Management Procedure; Policy Update SOP",
    notes: "Track FCA policy statements and guidance updates affecting safeguarding and fraud controls.",
    primary_source_url: "https://www.fca.org.uk/firms/emi-payment-institutions-key-publications",
  },
  {
    code: "PAY-PSR17-017",
    category: "Assurance & Testing",
    title: "PSRs Control Effectiveness Testing and QA",
    description: "Perform periodic testing across safeguarding, disclosures, execution SLAs, complaints, dispute handling, SCA/exemptions, and incident reporting. Track issues and remediate to closure.",
    framework_sections: "Supports demonstrability of effective PSRs compliance and FCA supervisory expectations.",
    evidence: "QA plans; sampling results; test evidence; issue logs; remediation tracker; independent review reports.",
    owner: "2LOD Compliance Assurance / Internal Audit",
    frequency: "Quarterly (risk-based); independent review at least annually",
    related_policies: "QA & Testing Standard; Issue Management Procedure; Change Control Procedure",
    notes: "Include regression testing after product launches, vendor upgrades, or new payment rails.",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
  {
    code: "PAY-PSR17-018",
    category: "Customer Data & Records",
    title: "Records, Audit Trails, and Customer Communication Logs",
    description: "Maintain audit trails for customer interactions and payment instructions (including timestamps, consent where relevant, and communication logs) to support dispute handling, complaints, incident response, and regulatory enquiries.",
    framework_sections: "PSRs-related obligations often require evidencing customer communications, instructions, and operational decisioning; FCA approach emphasizes robust processes.",
    evidence: "Case files; comms logs; audit logs; retention schedule; retrieval test results.",
    owner: "Operations / Compliance / IT",
    frequency: "Ongoing; retrieval tests quarterly",
    related_policies: "Record Keeping Policy; Data Retention Schedule; Customer Interaction Logging SOP",
    notes: "Ensure logs are immutable or tamper-evident for high-risk workflows (fraud/disputes).",
    primary_source_url: "https://www.fca.org.uk/publication/finalised-guidance/fca-approach-payment-services-electronic-money-2017.pdf",
  },
];

async function main() {
  console.log("Seeding PSR2017 (Payment Services Regulations 2017) framework and controls...");

  // 1. Create or find the PSR2017 regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'PSR2017' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing PSR2017 source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'Payment Services Regulations 2017 – EMI/Payments Controls',
        'PSR2017',
        'United Kingdom',
        'https://www.legislation.gov.uk/uksi/2017/752/contents',
        'Payments Regulation',
        'The Payment Services Regulations 2017 (PSRs 2017) transpose PSD2 into UK law and regulate payment service providers including EMIs, authorised/small payment institutions, and banks. They cover authorisation, conduct of business, safeguarding, execution requirements, complaints, SCA, incident reporting, and operational resilience. The FCA Approach Document provides interpretative guidance for firms.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created PSR2017 source (id=${sourceId})`);
  }

  // 2. Insert controls
  console.log(`Inserting ${controls.length} PSR2017 controls (source_id=${sourceId})...`);

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
