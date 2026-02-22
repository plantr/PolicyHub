/**
 * Seed script: IT Policy Documents
 *
 * Adds the IT-IS Governance Steering Committee Charter (OG-CHA-ITIS-001)
 * and ICT Risk Management Framework (OG-CHA-ITIS-002) as documents with
 * their latest versions and a policy link between them.
 *
 * Run with: npx tsx --env-file=.env scripts/seed-policy-documents.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function seed() {
  console.log('Seeding IT policy documents...');

  // =========================================================
  // 1. IT-IS Governance Steering Committee Charter (OG-CHA-ITIS-001)
  // =========================================================

  const existingDoc1 = await sql`
    SELECT id FROM documents WHERE document_reference = 'OG-CHA-ITIS-001' LIMIT 1
  `;

  let doc1Id: number;
  if (existingDoc1.length > 0) {
    doc1Id = existingDoc1[0].id;
    console.log(`Found existing OG-CHA-ITIS-001 (id=${doc1Id})`);
  } else {
    const [doc1] = await sql`
      INSERT INTO documents (
        document_reference, title, doc_type, taxonomy, owner,
        delegates, reviewers, approvers, tags, review_frequency
      ) VALUES (
        'OG-CHA-ITIS-001',
        'IT-IS Governance Steering Committee Charter',
        'Charter',
        'IT Governance',
        'Chief Security Officer',
        ARRAY['Cyber & Information Security Manager'],
        ARRAY['Chief Information Security Officer', 'Chief Security Officer'],
        ARRAY['Board of Directors'],
        ARRAY['IT Governance', 'Information Security', 'ISMS', 'Steering Committee', 'ITIS'],
        'Annual'
      )
      RETURNING id
    `;
    doc1Id = doc1.id;
    console.log(`Created OG-CHA-ITIS-001 (id=${doc1Id})`);
  }

  // Check if version already exists
  const existingVer1 = await sql`
    SELECT id FROM document_versions
    WHERE document_id = ${doc1Id} AND version = '1.4'
    LIMIT 1
  `;

  if (existingVer1.length > 0) {
    console.log(`Version 1.4 already exists for OG-CHA-ITIS-001, skipping.`);
  } else {
    await sql`
      INSERT INTO document_versions (
        document_id, version, status, content, change_reason,
        effective_date, created_by
      ) VALUES (
        ${doc1Id},
        '1.4',
        'Published',
        ${doc1Markdown},
        'Policy review and update to 9.1.4',
        '2022-11-25',
        'Cyber & Information Security Manager'
      )
    `;
    console.log(`Created version 1.4 for OG-CHA-ITIS-001`);
  }

  // =========================================================
  // 2. ICT Risk Management Framework (OG-CHA-ITIS-002)
  // =========================================================

  const existingDoc2 = await sql`
    SELECT id FROM documents WHERE document_reference = 'OG-CHA-ITIS-002' LIMIT 1
  `;

  let doc2Id: number;
  if (existingDoc2.length > 0) {
    doc2Id = existingDoc2[0].id;
    console.log(`Found existing OG-CHA-ITIS-002 (id=${doc2Id})`);
  } else {
    const [doc2] = await sql`
      INSERT INTO documents (
        document_reference, title, doc_type, taxonomy, owner,
        delegates, reviewers, approvers, tags, review_frequency
      ) VALUES (
        'OG-CHA-ITIS-002',
        'ICT Risk Management Framework',
        'Charter',
        'Risk Management',
        'Chief Operating Officer',
        ARRAY['Cyber and Information Security Manager'],
        ARRAY['Chief Operating Officer', 'Cyber and Information Security Manager'],
        ARRAY['Board of Directors'],
        ARRAY['ICT Risk', 'DORA', 'ISO 27001', 'Operational Resilience', 'Risk Management', 'Three Lines of Defence'],
        'Annual'
      )
      RETURNING id
    `;
    doc2Id = doc2.id;
    console.log(`Created OG-CHA-ITIS-002 (id=${doc2Id})`);
  }

  // Check if version already exists
  const existingVer2 = await sql`
    SELECT id FROM document_versions
    WHERE document_id = ${doc2Id} AND version = '1.2'
    LIMIT 1
  `;

  if (existingVer2.length > 0) {
    console.log(`Version 1.2 already exists for OG-CHA-ITIS-002, skipping.`);
  } else {
    await sql`
      INSERT INTO document_versions (
        document_id, version, status, content, change_reason,
        effective_date, created_by
      ) VALUES (
        ${doc2Id},
        '1.2',
        'Published',
        ${doc2Markdown},
        'Addition of 3LoD to section 2.1',
        '2025-11-11',
        'Chief Operating Officer'
      )
    `;
    console.log(`Created version 1.2 for OG-CHA-ITIS-002`);
  }

  // =========================================================
  // 3. Create policy link (doc2 references doc1)
  // =========================================================

  const existingLink = await sql`
    SELECT id FROM policy_links
    WHERE from_document_id = ${doc2Id} AND to_document_id = ${doc1Id}
    LIMIT 1
  `;

  if (existingLink.length > 0) {
    console.log('Policy link already exists, skipping.');
  } else {
    await sql`
      INSERT INTO policy_links (from_document_id, to_document_id, link_type)
      VALUES (${doc2Id}, ${doc1Id}, 'references')
    `;
    console.log(`Created policy link: OG-CHA-ITIS-002 -> OG-CHA-ITIS-001`);
  }

  console.log('Done!');
  await sql.end();
  process.exit(0);
}

// =========================================================
// DOCUMENT CONTENT
// =========================================================

const doc1Markdown = `# IT-IS Governance Steering Committee Charter

**Doc Number:** OG-CHA-ITIS-001 | **Version:** v1.4 | **Status:** Released | **Effective Date:** 25-Nov-22

---

## 1. Introduction

### 1.1 Document Definition
This document is a Charter. For a full description of document types, see *OG-POL-ITIS-001 - Information Security Policy Framework*.

### 1.2 Objective
To communicate the primary responsibilities and delegated authority of the IT-IS Governance Steering Committee for the effective and efficient management of IT-IS resources and Information Security requirements to facilitate the achievement of corporate objectives.

### 1.3 Scope

#### 1.3.1 Applicability to Personnel
This Charter applies to all personnel, members of the Board of Directors, and all consultants and contractors of the Company. This Policy also applies to applicable partners and joint ventures of the Company (where/if applicable).

### 1.4 Related Documents / References
- OG-POL-ITIS-001 – Information Security Policy Framework

---

## 2. Charter Statements

### 2.1 Delegation of Authority
Authority delegated to the IT-IS Governance Steering Committee is founded on the following principles:

1. Does not divest the Company Board of Directors ("Board of Directors") of their accountabilities concerning the exercise of the delegated power or the performance of the assigned duties herein.
2. Is given to a committee whose membership integrates both IT-IS and business knowledge.
3. Is subject to the statutory and legal limitations, recorded herein, and such other lawful limitations as may be applicable to the company from time to time.
4. Is subject to any limitations, conditions, policies and/or directives that may be developed and implemented by the Executive Team at the request of the Company Board of Directors.
5. May at any time be revoked or varied by the Chief Executive Officer.
6. The Board of Directors may confirm, vary, or revoke any decision taken by the IT-IS Governance Steering Committee.
7. Unless otherwise specified, the IT-IS Governance Steering Committee is hereby authorised, in writing:
   - a. To delegate further any powers and authority to any personnel and to allow sub-delegation of such powers only once.
   - b. To impose any limits or conditions in such further delegation to ensure good governance and controls.
8. The IT-IS Governance Steering Committee shall ensure that any further delegation or sub-delegation is to a functionary with the appropriate seniority, skill, expertise, and knowledge.
9. The IT-IS Governance Steering Committee or any other person with delegated powers may only exercise those powers in respect of the responsibilities and functions allocated to them.
10. Where power is delegated to more than one governance steering committee, it is based on different functional responsibility and expected process outcomes.
11. Reporting is to follow the delegation process. Non-conformance with the delegated powers shall be reported to the next higher level of authority.

---

## 3. Goals

1. Protect the Company's information assets.
2. Improve operational resiliency by implementing the correct controls, effective response plans, and recovery procedures.
3. Build a more secure-minded culture amongst our people.
4. Manage IT-IS risks in line with the business's risk appetite.
5. Compliance with internal Policies, selected industry standards, external laws, and regulations.
6. Maintenance of the Company's Information Security Management System (ISMS).

---

## 4. Responsibilities

### 4.1 Organisational Structure, Relationships, Frameworks and Processes
- Develop and implement a Governance Charter (this document)
- Establish a bridge between IT-IS and the business
- Implement IT-IS processes and governance mechanisms
- Implement IT-IS frameworks, Policies, Standards, and Procedures
- Provide transparency through regular reporting to the Board of Directors
- Encourage the desirable use of IT-IS
- Incorporate IT-IS governance in corporate governance
- Create an awareness of the maturity levels of governance

### 4.2 Strategic Alignment
- Facilitate the integration of IT-IS into business strategic thinking
- Implement a strategic IT-IS planning process integrated with business strategy
- Sustain and enhance the company's strategic objectives
- Integrate IT-IS plans with the business plans
- Define, maintain, and validate the IT-IS value proposition
- Align IT-IS operations with business operations
- Have regard for the legal and/or legislative requirements that apply to IT-IS
- Translate business requirements into efficient and effective IT-IS solutions

### 4.3 Value Delivery
- Enable IT-IS to add value to the business and mitigate risks
- Incorporate IT-IS into the business processes in a secure, sustainable manner
- Deliver the expected return from IT-IS investments
- Implement an ethical IT-IS governance and management culture
- Monitor and enforce good governance across all suppliers

### 4.4 Resource Management
- Exercise care and skill over sustainable IT-IS solutions
- Optimise resources usage and leverage knowledge
- Protect information and intellectual property
- Ensure the confidentiality, integrity and availability of information and information systems
- Implement information records management
- Obtain independent assurance that outsourced service providers have applied IT-IS governance principles
- Regularly demonstrate adequate business resilience arrangements

### 4.5 Risk Management
- Minimise risks
- Implement a risk management process based on the Board of Directors risk appetite
- Select and use an appropriate framework (or frameworks) for managing risk
- Comply with applicable laws and regulations
- Maintain an IT-IS risk register, including IT-IS legal risks
- Implement an IT-IS controls framework
- Perform continual risk assessments
- Include Confidentiality, Integrity, and Availability (CIA) when assessing risks
- Implement an information security strategy and ISMS
- Establish a business continuity program
- Identify and protect all personal information processed by the company

### 4.6 Performance Management
- Measure, manage and communicate IT-IS performance
- Report to the Board of Directors on IT-IS performance
- Report to the Board of Directors on ISMS performance

---

## 5. Deliverables

### 5.1 Mandatory Deliverables
- Agendas for meetings
- Minutes of meetings
- Status of action items from previous management reviews
- Authorised policies, standards, and procedures
- Report on internal controls
- IT-IS performance report
- IT-IS controls framework
- Register of statutory, regulatory, and contractual obligations
- IT-IS risk register
- Update on ISMS
- Internal audit results
- Results of any penetration or other technical tests
- Status of open non-conformities, corrective actions, and improvement plans
- Feedback from interested parties
- Changes in the internal or external context of the organisation
- Business continuity program
- Information security strategy

### 5.2 Additional Deliverables if Requested by the Board
- Criteria for decision-making
- IT-IS governance framework
- Accountability framework
- Defined value proposition for IT-IS
- Cascade of business goals to IT-IS process activity goals
- Business value proposition statements
- Report on IT-IS governance principles applied by all service providers
- Effectiveness monitoring and measurement results
- Results of the risk assessment

---

## 6. Jurisdiction
The IT-IS Governance Steering Committee is responsible for directing, controlling, and measuring the IT-IS activities and processes of the company, spanning operational activities, transformation programs, and all improvement initiatives.

## 7. Guidance From the Board of Directors
The IT-IS Governance Steering Committee will respond to the direction provided by the Board of Directors and seek approval of goals being targeted in the short and long-term.

## 8. Resources & Budget
The IT-IS Governance Steering Committee is required to ensure that the IT-IS processes within the scope of its authority always remain within the approved budgets.

---

## 9. Management Relationships and Duties

### 9.1 Official Members

#### 9.1.1 The Chair
The Chief Information Security Officer (CISO) will serve as the Chair.

#### 9.1.2 The Vice-Chair
The Chair shall appoint a Vice-Chair.

#### 9.1.3 Meetings
The Chair shall establish a schedule for regular meetings and may call ad hoc meetings upon written notice of no less than two (2) business days.

#### 9.1.4 Voting Members
| Role |
|------|
| Chief Security Officer (Chair) |
| Chief Executive Officer |
| Chief Product & Technology Officer |
| Chief Compliance Officer |
| Chief Financial Officer |
| General Counsel |
| Chief Delivery & Trading Officer |
| Head of Risk |
| Cyber & Information Security Manager |
| Data Protection Officer |

---

## 10. Quorum and Voting
A quorum shall consist of two-thirds of voting members. A simple majority shall pass a motion. The Chair shall only vote in the event of a tie.

## 11. Additional Notes
**Relationships to Other Committees:** Risk Committee and Audit Committee

---

## 12. Charter Compliance & Enforcement

### 12.1 Compliance Measures
Compliance can be measured by verifying the existence of all mandatory deliverables.

### 12.2 Enforcement
Violations may result in disciplinary action, up to and including termination of employment and/or legal action.

### 12.3 Policy Update & Approval
This Charter is subject to an annual review and Board approval.

---

## 13. Exception Process / Glossary

### 13.1 Exception Process
Non-compliance must be reviewed per the Exception Process in OG-POL-ITIS-001.

### 13.2 Glossary
| Term | Definition |
|------|-----------|
| Company | All entities of Orbital Group collectively |
| Board of Directors | Each and any Board of Directors of the Company entities |
| Orbital Group | Pay Perform Limited and any entity that directly or indirectly controls or is controlled by, or is under common control with, Pay Perform Limited |
| Accountability | Cannot be delegated; represents the highest form of responsibility |
| Responsibility | Assigned to those responsible for getting things done, usually at department head level |
| Departmental Responsibility | Those responsible for performing the actual functions |`;

const doc2Markdown = `# ICT Risk Management Framework

**Doc Number:** OG-CHA-ITIS-002 | **Version:** v1.2 | **Status:** Released | **Effective Date:** 11-Nov-25

---

## 1. Introduction

### 1.1 Document Definition
This document is a Charter.

### 1.2 Objective
This ICT Risk Management Framework establishes a comprehensive and integrated approach to identifying, assessing, managing, and monitoring ICT-related risks for the Company, a UK and EU regulated financial company. It is a fundamental component of the Company's overall risk management strategy, designed to protect the confidentiality, integrity, and availability of information and communication technology (ICT) systems and data, maintain operational resilience, and ensure strict compliance with regulatory requirements, including the **EU Digital Operational Resilience Act (DORA)** and the international standard **ISO/IEC 27001:2022**.

### 1.3 Scope

#### 1.3.1 Applicability to Personnel
This Charter applies to all personnel, members of the Board of Directors, and all consultants and contractors of the Company. This Policy also applies to applicable partners and joint ventures of the Company (where/if applicable).

#### 1.1.1 Applicability to Assets
This Charter applies to all information assets globally owned by the Company, or where the Company has custodial responsibilities.

### 1.2 Related Documents / References
- IT-IS Governance Steering Committee Charter
- Business Continuity Management Policy
- Disaster Recovery Policy
- Information Security Policy Framework
- IT-IS Risk Management Policy
- IT-IS Incident Management and Response Policy
- Operational Resilience Policy
- Outsourcing Policy
- Vendor Risk Management Policy

---

## 2. Framework

### 2.1 Governance and Oversight

Effective ICT risk management is driven by a clear, multi-tiered governance structure with explicitly defined roles and responsibilities to ensure accountability and strategic alignment.

| Role | Responsibility |
|------|---------------|
| **Board of Directors** | Holds ultimate accountability for defining business goals and ensuring CIA of all Company data and infrastructure assets. Responsible for guaranteeing regulatory compliance. |
| **Executive Team** | Setting information security objectives aligned with business goals and enforcement of all related policies. |
| **IT-IS Governance Committee (IT-ISGC)** | Central authority for the framework. Sets and reviews security strategy, maintains the security risk register, approves policies. Final arbiter for all risk acceptance decisions. |
| **Head of Risk** | Designs, maintains, and reviews the operational risk management framework. Advises the Management Board on operational risk tolerance. |
| **Chief Compliance Officer** | Independent oversight of operational resilience compliance. Challenges first line of defence inputs/outputs. |
| **Security Team** | Manages the Company's risk assessment and treatment program. Provides security expertise for all systems and users. |
| **Data Owners** | Accountable for data processing and storage within their domains. Assigns data classification levels. |
| **All Employees** | Responsible for effective operational risk management in day-to-day activities and timely reporting of risk/loss events. |

#### Three Lines of Defence (3LoD)
The Company applies the Three Lines of Defence model:
1. **First Line** - Operational teams (risk ownership)
2. **Second Line** - Risk and Compliance functions (oversight, challenge, monitoring)
3. **Third Line** - Internal Audit (independent evaluation, reporting to Board)

---

### 2.2 ICT Risk Management Process

#### Risk Identification and Assessment
- **Asset identification:** Maintaining a current inventory of all ICT assets (hardware, software, data, services)
- **Threat identification:** Identifying potential threats (cyberattacks, hardware failures, human error)
- **Vulnerability assessment:** Identifying weaknesses in ICT systems
- **Impact analysis:** Assessing potential business impact (financial, reputational, operational)
- **Risk scoring:** Assigning risk scores (low, medium, high) based on likelihood and impact

#### Risk Treatment
A formal risk treatment procedure must be documented. **Mandatory** for applications/systems with an inherent risk rating of **15 or higher** and must address legal/regulatory compliance requirements (GDPR, DPA, FCA, GFSC, FIU, EBA).

Treatment options:
- Remediation
- Outsourcing
- Insurance
- Acceptance

Risk treatment plans must include a **cost-benefit analysis** and assign functional responsibility for implementation.

#### Risk Mitigation and Controls

| Control Type | Purpose | Examples |
|-------------|---------|----------|
| **Proactive** | Prevent future risks from materialising | Threat intelligence, security awareness training, vulnerability scanning |
| **Preventative** | Stop threats from occurring | Firewalls, antivirus, access controls (MFA), data encryption |
| **Detective** | Detect when a threat has occurred | Intrusion detection systems, event monitoring, regular audits |
| **Corrective** | Recover from a security incident | Data backups, disaster recovery plans, incident response procedures |

#### Risk Acceptance
Risk analysis results, including residual risk, are reviewed by relevant Data Owners or Information Asset Owners. All final risk acceptance decisions are the responsibility of the **IT-IS Governance Steering Committee (IT-ISGSC)**.

---

### 2.3 Operational Resilience and DORA Alignment

- **Business Impact Analysis (BIA):** Foundational activity identifying potential impacts of disruptions to critical business services. Determines maximum acceptable downtime and maximum tolerable data loss.
- **Identification of Important Business Services (IBS):** Prioritised based on impact on customers, financial system, and Company reputation/viability.
- **Setting Impact Tolerances:** Defines maximum tolerable disruption level for each important service.
- **Resource Mapping:** Maps important business services to all necessary resources (people, processes, technology, facilities, information).
- **Scenario-based Testing:** Regular simulation of various disruption types to assess response/recovery effectiveness.
- **Self-assessment and Reporting:** Operational Resilience Self-Assessment conducted at least annually.
- **Third-party Resilience:** Collaborative approach with third-party providers, supported by the Outsourcing Policy and Vendor Management Policy.
- **Incident Management:** Complements the existing Incident Management & Response Policy.

---

### 2.4 Monitoring and Review

- **Independent reviews:** IT-ISGC initiates independent review of the ICT risk management framework and Information Security Program at least annually.
- **Quarterly steering group reports:** Security team prepares quarterly reports for the IT-ISGC covering the current risk landscape, key risk treatment plan status, and significant incidents.
- **Annual security report to the Board:** Comprehensive report summarising security posture, KPIs, major achievements, identified risks, and framework effectiveness.
- **Policy review:** All supporting policies reviewed annually or when significant changes occur.
- **Internal audits:** Regular examination of systems, people, policies, and processes.
- **Continuous improvement:** Committed to continually improving information security posture based on objective measurement and lessons learned.

---

## 3. Compliance & Enforcement

### 3.1 Compliance Measures
None.

### 3.2 Enforcement
Violations may result in disciplinary action, up to and including termination of employment and/or legal action.

### 3.3 Update & Approval
This Charter is subject to an annual review and Board approval. An earlier review may be needed for new laws, regulations, or emerging risks.

---

## 4. Exception Process / Glossary

### 4.1 Exception Process
Non-compliance must be reviewed and approved in accordance with the Company Exception Process.

### 4.2 Glossary
| Term | Definition |
|------|-----------|
| Company | All entities of Orbital Group collectively |
| Board of Directors | Each and any Board of Directors of the Company entities |`;

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await sql.end();
  process.exit(1);
});
