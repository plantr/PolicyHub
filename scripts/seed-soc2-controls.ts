/**
 * Seed script: SOC 2 Framework Controls
 *
 * Creates the SOC 2 regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-soc2-controls.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

interface ControlData {
  code: string;
  title: string;
  description: string;
  category: string;
  owner: string;
  evidenceStatus: string;
  status: string;
}

async function seed() {
  console.log('Seeding SOC 2 framework and controls...');

  // 1. Create or find the SOC 2 regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'SOC 2' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing SOC 2 source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'SOC 2 Type II - Trust Services Criteria',
        'SOC 2',
        'United States',
        'https://www.aicpa.org/topic/audit-assurance/audit-and-assurance-greater-than-soc-2',
        'Information Security',
        'SOC 2 (System and Organization Controls 2) is a compliance framework developed by the AICPA for managing customer data based on five Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created SOC 2 source (id=${sourceId})`);
  }

  // 2. Define all SOC 2 controls (deduplicated by title)
  const allControls: ControlData[] = [
    // ===================================================
    // A 1.0 Additional Criteria for Availability
    // ===================================================

    // A 1.1 Capacity management
    {
      code: 'A1.1-01',
      title: 'System capacity reviewed',
      description: 'The company evaluates system capacity on an ongoing basis, and system changes are implemented to help ensure that processing capacity can meet demand.',
      category: 'A 1.1 Capacity management',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '13/15',
      status: 'Active',
    },
    {
      code: 'A1.1-02',
      title: 'Infrastructure performance monitored',
      description: 'An infrastructure monitoring tool is utilized to monitor systems, infrastructure, and performance and generates alerts when specific predefined thresholds are met.',
      category: 'A 1.1 Capacity management',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '12/14',
      status: 'Active',
    },
    {
      code: 'A1.1-03',
      title: 'System operations monitoring and alerting implemented',
      description: 'Monitoring software is used to identify and evaluate ongoing system performance, capacity, security threats, changing resource utilization needs and unusual system activity. Alerts are sent to appropriate personnel who have the authority to react to the alert.',
      category: 'A 1.1 Capacity management',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },

    // A 1.2 Environmental and recovery infrastructure
    {
      code: 'A1.2-01',
      title: 'Continuity and disaster recovery plans tested',
      description: 'The company has a documented business continuity/disaster recovery (BC/DR) plan and tests it at least annually.',
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'A1.2-02',
      title: 'Database replication utilized',
      description: "The company's databases are replicated to a secondary data center in real-time. Alerts are configured to notify administrators if replication fails.",
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'A1.2-03',
      title: 'Production multi-availability zones established',
      description: 'The company has a multi-location strategy for production environments employed to permit the resumption of operations at other company data centers in the event of loss of a facility.',
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'A1.2-04',
      title: 'Backup processes established',
      description: "The company's data backup policy documents requirements for backup and recovery of customer data.",
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'A1.2-05',
      title: 'Environmental monitoring devices implemented',
      description: 'The company has environmental monitoring devices in place and configured to automatically generate an alert to management for environmental incidents.',
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'A1.2-06',
      title: 'Environmental security inspected',
      description: 'The company has maintenance inspections of environmental security measures at the company data centers performed at least annually.',
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'A1.2-07',
      title: 'Risk management program established',
      description: 'The company has a documented risk management program in place that includes guidance on the identification of potential threats, rating the significance of the risks associated with the identified threats, and mitigation strategies for those risks.',
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'A1.2-08',
      title: 'Production data backups conducted',
      description: "The company performs periodic backups for production data. Data is backed up to a different location than the production system.",
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '6/6',
      status: 'Active',
    },
    {
      code: 'A1.2-09',
      title: 'Risk assessments performed',
      description: "The company's risk assessments are performed at least annually. As part of this process, threats and changes (environmental, regulatory, and technological) to service commitments are identified and the risks are formally assessed. The risk assessment includes a consideration of the potential for fraud and how fraud may impact the achievement of objectives.",
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'A1.2-10',
      title: 'Databases replication utilized (Custom)',
      description: "The company's databases are replicated to a secondary data center in real-time. Alerts are configured to notify administrators if replication fails.",
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'A1.2-11',
      title: 'Backup failure alerts addressed',
      description: 'When a backup job fails, the backup tool sends an alert to the backup administrators who investigate and resolve the failure.',
      category: 'A 1.2 Environmental and recovery infrastructure',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '10/11',
      status: 'Active',
    },

    // A 1.3 Recovery plan testing
    {
      code: 'A1.3-01',
      title: 'Continuity and Disaster Recovery plans established',
      description: 'The company has Business Continuity and Disaster Recovery Plans in place that outline communication plans in order to maintain information security continuity in the event of the unavailability of key personnel.',
      category: 'A 1.3 Recovery plan testing',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'A1.3-02',
      title: 'Intrusion detection system utilized',
      description: "The company uses an intrusion detection system to provide continuous monitoring of the company's network and early detection of potential security breaches.",
      category: 'A 1.3 Recovery plan testing',
      owner: 'Dominic Meagher',
      evidenceStatus: '8/9',
      status: 'Active',
    },

    // ===================================================
    // CC 1.0 Control Environment
    // ===================================================

    // CC 1.1 COSO Principle 1: Integrity and ethical values
    {
      code: 'CC1.1-01',
      title: 'Employee background checks performed',
      description: 'The company performs background checks on new employees.',
      category: 'CC 1.1 Integrity and ethical values',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC1.1-02',
      title: 'Code of Conduct acknowledged by contractors',
      description: "The company requires contractor agreements to include a code of conduct or reference to the company code of conduct.",
      category: 'CC 1.1 Integrity and ethical values',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC1.1-03',
      title: 'Confidentiality Agreement acknowledged by contractors',
      description: 'The company requires contractors to sign a confidentiality agreement at the time of engagement.',
      category: 'CC 1.1 Integrity and ethical values',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC1.1-04',
      title: 'Confidentiality Agreement acknowledged by employees',
      description: 'The company requires employees to sign a confidentiality agreement during onboarding.',
      category: 'CC 1.1 Integrity and ethical values',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC1.1-05',
      title: 'Performance evaluations conducted',
      description: 'The company managers are required to complete performance evaluations for direct reports at least annually.',
      category: 'CC 1.1 Integrity and ethical values',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC1.1-06',
      title: 'Code of Conduct acknowledged by employees and enforced',
      description: 'The company requires employees to acknowledge a code of conduct at the time of hire. Employees who violate the code of conduct are subject to disciplinary actions in accordance with a disciplinary policy.',
      category: 'CC 1.1 Integrity and ethical values',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '3/3',
      status: 'Active',
    },

    // CC 1.2 COSO Principle 2: Board independence and oversight
    {
      code: 'CC1.2-01',
      title: 'Board charter documented',
      description: "The company's board of directors has a documented charter that outlines its oversight responsibilities for internal control.",
      category: 'CC 1.2 Board independence and oversight',
      owner: 'Richard Lindsay',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC1.2-02',
      title: 'Board expertise developed',
      description: "The company's board members have sufficient expertise to oversee management's ability to design, implement and operate information security controls. The board engages third-party information security experts and consultants as needed.",
      category: 'CC 1.2 Board independence and oversight',
      owner: 'Richard Lindsay',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC1.2-03',
      title: 'Board meetings conducted',
      description: "The company's board of directors meets at least annually and maintains formal meeting minutes. The board includes directors that are independent of the company.",
      category: 'CC 1.2 Board independence and oversight',
      owner: 'Richard Lindsay',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC1.2-04',
      title: 'Board oversight briefings conducted',
      description: "The company's board of directors or a relevant subcommittee is briefed by senior management at least annually on the state of the company's cybersecurity and privacy risk. The board provides feedback and direction to management as needed.",
      category: 'CC 1.2 Board independence and oversight',
      owner: 'Richard Lindsay',
      evidenceStatus: '2/2',
      status: 'Active',
    },

    // CC 1.3 COSO Principle 3: Structures, reporting lines, and authorities
    {
      code: 'CC1.3-01',
      title: 'Management roles and responsibilities defined',
      description: 'The company management has established defined roles and responsibilities to oversee the design and implementation of information security controls.',
      category: 'CC 1.3 Structures, reporting lines, and authorities',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC1.3-02',
      title: 'Organization structure documented',
      description: 'The company maintains an organizational chart that describes the organizational structure and reporting lines.',
      category: 'CC 1.3 Structures, reporting lines, and authorities',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC1.3-03',
      title: 'Roles and responsibilities specified',
      description: 'Roles and responsibilities for the design, development, implementation, operation, maintenance, and monitoring of information security controls are formally assigned in job descriptions and/or the Roles and Responsibilities policy.',
      category: 'CC 1.3 Structures, reporting lines, and authorities',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },

    // CC 1.4 COSO Principle 4: Attracting and retaining competent individuals
    {
      code: 'CC1.4-01',
      title: 'Security awareness training implemented',
      description: 'The company requires employees to complete security awareness training within thirty days of hire and at least annually thereafter.',
      category: 'CC 1.4 Attracting and retaining competent individuals',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC1.4-02',
      title: 'Employee vetting policies enforced',
      description: 'The organization evaluates the competencies and experience of candidates prior to hiring.',
      category: 'CC 1.4 Attracting and retaining competent individuals',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC1.4-03',
      title: 'Employee vetting policies implemented',
      description: 'Policies and procedures are in place that outline the talent acquisition, performance evaluation and annual training processes.',
      category: 'CC 1.4 Attracting and retaining competent individuals',
      owner: 'Leia Ratcliff-Young',
      evidenceStatus: '4/4',
      status: 'Active',
    },

    // ===================================================
    // CC 2.0 Communication and Information
    // ===================================================

    // CC 2.1 COSO Principle 13: Quality information for internal control
    {
      code: 'CC2.1-01',
      title: 'Control self-assessments conducted',
      description: "The company performs control self-assessments at least annually to gain assurance that controls are in place and operating effectively. Corrective actions are taken based on relevant findings. If the company has committed to an SLA for a finding, the corrective action is completed within that SLA.",
      category: 'CC 2.1 Quality information for internal control',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC2.1-02',
      title: 'Log management utilized',
      description: "The company utilizes a log management tool to identify events that may have a potential impact on the company's ability to achieve its security objectives.",
      category: 'CC 2.1 Quality information for internal control',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '15/15',
      status: 'Active',
    },
    {
      code: 'CC2.1-03',
      title: 'Vulnerabilities scanned and remediated',
      description: 'Host-based vulnerability scans are performed at least quarterly on all external-facing systems. Critical and high vulnerabilities are tracked to remediation.',
      category: 'CC 2.1 Quality information for internal control',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '7/10',
      status: 'Active',
    },
    {
      code: 'CC2.1-04',
      title: 'Data entry edit checks implemented',
      description: 'Edit checks are in place to prevent incomplete or incorrect data from being entered into the system.',
      category: 'CC 2.1 Quality information for internal control',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC2.1-05',
      title: 'Network diagrams documented',
      description: 'Accurate diagrams are documented and maintained by management to identify the relevant internal and external information sources of the system.',
      category: 'CC 2.1 Quality information for internal control',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC2.1-06',
      title: 'Data inputs and outputs secured',
      description: 'Data that is entered into the system, processed by the system and output from the system is protected from unauthorized access.',
      category: 'CC 2.1 Quality information for internal control',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },

    // CC 2.2 COSO Principle 14: Internal communication of control information
    {
      code: 'CC2.2-01',
      title: 'Whistleblower policy established',
      description: 'The company has established a formalized whistleblower policy, and an anonymous communication channel is in place for users to report potential issues or fraud concerns.',
      category: 'CC 2.2 Internal communication of control information',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC2.2-02',
      title: 'Security policies established and reviewed',
      description: "The company's information security policies and procedures are documented and reviewed at least annually.",
      category: 'CC 2.2 Internal communication of control information',
      owner: 'Dominic Meagher',
      evidenceStatus: '15/15',
      status: 'Active',
    },
    {
      code: 'CC2.2-03',
      title: 'System changes communicated',
      description: 'The company communicates system changes to authorized internal users.',
      category: 'CC 2.2 Internal communication of control information',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC2.2-04',
      title: 'Incident response policies established',
      description: 'The company has security and privacy incident response policies and procedures that are documented and communicated to authorized users.',
      category: 'CC 2.2 Internal communication of control information',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC2.2-05',
      title: 'Service description communicated',
      description: 'The company provides a description of its products and services to internal and external users.',
      category: 'CC 2.2 Internal communication of control information',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },

    // CC 2.3 COSO Principle 15: External communication on control matters
    {
      code: 'CC2.3-01',
      title: 'System changes externally communicated',
      description: 'The company notifies customers of critical system changes that may affect their processing.',
      category: 'CC 2.3 External communication on control matters',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC2.3-02',
      title: 'Support system available',
      description: 'The company has an external-facing support system in place that allows users to report system information on failures, incidents, concerns, and other complaints to appropriate personnel.',
      category: 'CC 2.3 External communication on control matters',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC2.3-03',
      title: 'External support resources available',
      description: 'The company provides guidelines and technical support resources relating to system operations to customers.',
      category: 'CC 2.3 External communication on control matters',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC2.3-04',
      title: 'Company commitments externally communicated',
      description: "The company's security commitments are communicated to customers in Master Service Agreements (MSA) or Terms of Service (TOS).",
      category: 'CC 2.3 External communication on control matters',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC2.3-05',
      title: 'Third-party agreements established',
      description: 'The company has written agreements in place with vendors and related third-parties. These agreements include confidentiality and privacy commitments applicable to that entity.',
      category: 'CC 2.3 External communication on control matters',
      owner: 'Dominic Meagher',
      evidenceStatus: '6/6',
      status: 'Active',
    },
    {
      code: 'CC2.3-06',
      title: 'Service commitment changes communicated externally',
      description: 'Changes to commitments, requirements and responsibilities related to security, availability and confidentiality are communicated to third parties, external users, and customers.',
      category: 'CC 2.3 External communication on control matters',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },

    // ===================================================
    // CC 3.0 Risk Assessment
    // ===================================================
    {
      code: 'CC3.1-01',
      title: 'Risk assessment objectives specified',
      description: 'The company specifies its objectives to enable the identification and assessment of risk related to the objectives.',
      category: 'CC 3.1 Risk assessment objectives',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },

    // ===================================================
    // CC 4.0 Monitoring Activities
    // ===================================================

    // CC 4.1 COSO Principle 16: Evaluation of internal control
    {
      code: 'CC4.1-01',
      title: 'Penetration testing performed',
      description: "The company's penetration testing is performed at least annually. A remediation plan is developed and changes are implemented to remediate vulnerabilities in accordance with SLAs.",
      category: 'CC 4.1 Evaluation of internal control',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC4.1-02',
      title: 'Vendor management program established',
      description: "The company has a vendor management program in place. Components of this program include: critical third-party vendor inventory; vendor's security and privacy requirements; and review of critical third-party vendors at least annually.",
      category: 'CC 4.1 Evaluation of internal control',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },

    // CC 4.2 COSO Principle 17: Communication of control deficiencies
    {
      code: 'CC4.2-01',
      title: 'Management review of risk assessment enforced',
      description: 'The annual comprehensive risk assessment results are reviewed and approved by management.',
      category: 'CC 4.2 Communication of control deficiencies',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },

    // ===================================================
    // CC 5.0 Control Activities
    // ===================================================

    // CC 5.1 COSO Principle 10: Development of control activities
    {
      code: 'CC5.1-01',
      title: 'Internal Controls Program documented',
      description: 'Management has documented and incorporated controls into the environment that include manual, automated, preventive, detective, and corrective controls to reduce risks of control and system failure.',
      category: 'CC 5.1 Development of control activities',
      owner: 'Dominic Meagher',
      evidenceStatus: '6/6',
      status: 'Active',
    },

    // CC 5.2 COSO Principle 11: Technology control activities
    {
      code: 'CC5.2-01',
      title: 'Access control procedures established',
      description: "The company's access control policy documents the requirements for the following access control functions: adding new users; modifying users; and/or removing an existing user's access.",
      category: 'CC 5.2 Technology control activities',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC5.2-02',
      title: 'Development lifecycle established',
      description: 'The company has a formal systems development life cycle (SDLC) methodology in place that governs the development, acquisition, implementation, changes (including emergency changes), and maintenance of information systems and related technology requirements.',
      category: 'CC 5.2 Technology control activities',
      owner: 'William Takashi Shimabucuro',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC5.2-03',
      title: 'Internal Controls Program addresses critical risks',
      description: "The internal controls implemented around the entity's technology infrastructure include, but are not limited to: Restricting access rights to authorized users; Limiting services to what is required for business operations; Authentication of access; Protecting the entity's assets from external threats.",
      category: 'CC 5.2 Technology control activities',
      owner: 'Dominic Meagher',
      evidenceStatus: '5/5',
      status: 'Active',
    },

    // CC 5.3 COSO Principle 12: Deployment of control activities
    {
      code: 'CC5.3-01',
      title: 'Change management procedures enforced',
      description: 'The company requires changes to software and infrastructure components of the service to be authorized, formally documented, tested, reviewed, and approved prior to being implemented in the production environment.',
      category: 'CC 5.3 Deployment of control activities',
      owner: 'William Takashi Shimabucuro',
      evidenceStatus: '6/7',
      status: 'Active',
    },
    {
      code: 'CC5.3-02',
      title: 'Data retention procedures established',
      description: 'The company has formal retention and disposal procedures in place to guide the secure retention and disposal of company and customer data.',
      category: 'CC 5.3 Deployment of control activities',
      owner: 'Gayle Parker',
      evidenceStatus: '2/3',
      status: 'Active',
    },

    // ===================================================
    // CC 6.0 Logical and Physical Access Controls
    // ===================================================

    // CC 6.1 Logical access security implementation
    {
      code: 'CC6.1-01',
      title: 'Unique production database authentication enforced',
      description: 'The company requires authentication to production datastores to use authorized secure authentication mechanisms, such as unique SSH key.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC6.1-02',
      title: 'Encryption key access restricted',
      description: 'The company restricts privileged access to encryption keys to authorized users with a business need.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC6.1-03',
      title: 'Unique account authentication enforced',
      description: 'The company requires authentication to systems and applications to use unique username and password or authorized Secure Socket Shell (SSH) keys.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '6/6',
      status: 'Active',
    },
    {
      code: 'CC6.1-04',
      title: 'Data classification policy established',
      description: 'The company has a data classification policy in place to help ensure that confidential data is properly secured and restricted to authorized personnel.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC6.1-05',
      title: 'Production application access restricted',
      description: 'System access restricted to authorized access only.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '8/8',
      status: 'Active',
    },
    {
      code: 'CC6.1-06',
      title: 'Firewall access restricted',
      description: 'The company restricts privileged access to the firewall to authorized users with a business need.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '10/12',
      status: 'Active',
    },
    {
      code: 'CC6.1-07',
      title: 'Production OS access restricted',
      description: 'The company restricts privileged access to the operating system to authorized users with a business need.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC6.1-08',
      title: 'Production network access restricted',
      description: 'The company restricts privileged access to the production network to authorized users with a business need.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC6.1-09',
      title: 'Unique network system authentication enforced',
      description: 'The company requires authentication to the "production network" to use unique usernames and passwords or authorized Secure Socket Shell (SSH) keys.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC6.1-10',
      title: 'Password policy enforced',
      description: "The company requires passwords for in-scope system components to be configured according to the company's policy.",
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '10/10',
      status: 'Active',
    },
    {
      code: 'CC6.1-11',
      title: 'Remote access MFA enforced',
      description: "The company's production systems can only be remotely accessed by authorized employees possessing a valid multi-factor authentication (MFA) method.",
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '5/5',
      status: 'Active',
    },
    {
      code: 'CC6.1-12',
      title: 'Remote access encrypted enforced',
      description: "The company's production systems can only be remotely accessed by authorized employees via an approved encrypted connection.",
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC6.1-13',
      title: 'Data encryption utilized',
      description: "The company's datastores housing sensitive customer data are encrypted at rest.",
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '6/6',
      status: 'Active',
    },
    {
      code: 'CC6.1-14',
      title: 'Network segmentation implemented',
      description: "The company's network is segmented to prevent unauthorized access to customer data.",
      category: 'CC 6.1 Logical access security',
      owner: 'Rawad Haber',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC6.1-15',
      title: 'Access requests required',
      description: "The company ensures that user access to in-scope system components is based on job role and function or requires a documented access request form and manager approval prior to access being provisioned.",
      category: 'CC 6.1 Logical access security',
      owner: 'Logan Atherley',
      evidenceStatus: '8/8',
      status: 'Active',
    },
    {
      code: 'CC6.1-16',
      title: 'Production database access restricted',
      description: 'The company restricts privileged access to databases to authorized users with a business need.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC6.1-17',
      title: 'Production deployment access restricted',
      description: 'The company restricts access to migrate changes to production to authorized personnel.',
      category: 'CC 6.1 Logical access security',
      owner: 'William Takashi Shimabucuro',
      evidenceStatus: '6/7',
      status: 'Active',
    },
    {
      code: 'CC6.1-18',
      title: 'Production inventory maintained',
      description: 'The company maintains a formal inventory of production system assets.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '29/29',
      status: 'Active',
    },
    {
      code: 'CC6.1-19',
      title: 'Data entry points are secured',
      description: 'Data entering the environment is secured and monitored through the use of firewalls and an IDS.',
      category: 'CC 6.1 Logical access security',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC6.1-20',
      title: 'Information system activity reviewed',
      description: 'The company has implemented procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '5/5',
      status: 'Active',
    },
    {
      code: 'CC6.1-21',
      title: 'Privileged access is restricted',
      description: 'Administrative access is restricted to appropriate user accounts for the network, VPN, application, database, and/or operating system.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '12/12',
      status: 'Active',
    },
    {
      code: 'CC6.1-22',
      title: 'Unique user identified',
      description: 'The company assigns a unique name and/or number for identifying and tracking user identity.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '6/6',
      status: 'Active',
    },
    {
      code: 'CC6.1-23',
      title: 'Passwords managed',
      description: 'The company has implemented procedures for creating, changing, and safeguarding passwords.',
      category: 'CC 6.1 Logical access security',
      owner: 'Dominic Meagher',
      evidenceStatus: '2/2',
      status: 'Active',
    },

    // CC 6.2 User registration and access control
    {
      code: 'CC6.2-01',
      title: 'Access reviews conducted',
      description: 'The company conducts access reviews at least quarterly for the in-scope system components to help ensure that access is restricted appropriately. Required changes are tracked to completion.',
      category: 'CC 6.2 User registration and access control',
      owner: 'JC Ronquillo',
      evidenceStatus: '17/18',
      status: 'Active',
    },
    {
      code: 'CC6.2-02',
      title: 'Access revoked upon termination',
      description: 'The company completes termination checklists to ensure that access is revoked for terminated employees within SLAs.',
      category: 'CC 6.2 User registration and access control',
      owner: 'Logan Atherley',
      evidenceStatus: '16/23',
      status: 'Active',
    },

    // CC 6.4 Physical access restrictions
    {
      code: 'CC6.4-01',
      title: 'Physical access processes established',
      description: 'The company has processes in place for granting, changing, and terminating physical access to company data centers based on an authorization from control owners.',
      category: 'CC 6.4 Physical access restrictions',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC6.4-02',
      title: 'Data center access reviewed',
      description: 'The company reviews access to the data centers at least annually.',
      category: 'CC 6.4 Physical access restrictions',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
    {
      code: 'CC6.4-03',
      title: 'Visitor procedures enforced',
      description: 'The company requires visitors to sign-in, wear a visitor badge, and be escorted by an authorized employee when accessing the data center or secure areas.',
      category: 'CC 6.4 Physical access restrictions',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },

    // CC 6.5 Decommissioning of logical and physical assets
    {
      code: 'CC6.5-01',
      title: 'Asset disposal procedures utilized',
      description: 'The company has electronic media containing confidential information purged or destroyed in accordance with best practices, and certificates of destruction are issued for each device destroyed.',
      category: 'CC 6.5 Decommissioning of logical and physical assets',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC6.5-02',
      title: 'Customer data deleted upon leaving',
      description: 'The company purges or removes customer data containing confidential information from the application environment, in accordance with best practices, when customers leave the service.',
      category: 'CC 6.5 Decommissioning of logical and physical assets',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },

    // CC 6.6 External threat protection
    {
      code: 'CC6.6-01',
      title: 'Network firewalls reviewed',
      description: 'The company reviews its firewall rulesets at least annually. Required changes are tracked to completion.',
      category: 'CC 6.6 External threat protection',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '7/8',
      status: 'Active',
    },
    {
      code: 'CC6.6-02',
      title: 'Network and system hardening standards maintained',
      description: "The company's network and system hardening standards are documented, based on industry best practices, and reviewed at least annually.",
      category: 'CC 6.6 External threat protection',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '8/9',
      status: 'Active',
    },
    {
      code: 'CC6.6-03',
      title: 'Service infrastructure maintained',
      description: 'The company has infrastructure supporting the service patched as a part of routine maintenance and as a result of identified vulnerabilities to help ensure that servers supporting the service are hardened against security threats.',
      category: 'CC 6.6 External threat protection',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '6/13',
      status: 'Active',
    },
    {
      code: 'CC6.6-04',
      title: 'Data transmission encrypted',
      description: 'The company uses secure data transmission protocols to encrypt confidential and sensitive data when transmitted over public networks.',
      category: 'CC 6.6 External threat protection',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '10/10',
      status: 'Active',
    },
    {
      code: 'CC6.6-05',
      title: 'Network firewalls utilized',
      description: 'The company uses firewalls and configures them to prevent unauthorized access.',
      category: 'CC 6.6 External threat protection',
      owner: 'Dominic Meagher',
      evidenceStatus: '7/8',
      status: 'Active',
    },

    // CC 6.7 Information transmission security
    {
      code: 'CC6.7-01',
      title: 'Portable media encrypted',
      description: 'The company encrypts portable and removable media devices when used.',
      category: 'CC 6.7 Information transmission security',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },
    {
      code: 'CC6.7-02',
      title: 'MDM system utilized',
      description: 'The company has a mobile device management (MDM) system in place to centrally manage mobile devices supporting the service.',
      category: 'CC 6.7 Information transmission security',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/5',
      status: 'Active',
    },

    // CC 6.8 Malware prevention and detection
    {
      code: 'CC6.8-01',
      title: 'Anti-malware technology utilized',
      description: 'The company deploys anti-malware technology to environments commonly susceptible to malicious attacks and configures this to be updated routinely, logged, and installed on all relevant systems.',
      category: 'CC 6.8 Malware prevention and detection',
      owner: 'Dominic Meagher',
      evidenceStatus: '5/6',
      status: 'Active',
    },
    {
      code: 'CC6.8-02',
      title: 'FIM Software alerts configured appropriately',
      description: 'The FIM software is configured to notify IT personnel via email alert when a change to the production application code files is detected.',
      category: 'CC 6.8 Malware prevention and detection',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC6.8-03',
      title: 'FIM Software is implemented',
      description: 'File integrity monitoring (FIM) software is in place to ensure only authorized changes are deployed into the production environment.',
      category: 'CC 6.8 Malware prevention and detection',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '2/2',
      status: 'Active',
    },

    // ===================================================
    // CC 7.0 System Operations
    // ===================================================

    // CC 7.1 Vulnerability detection and monitoring
    {
      code: 'CC7.1-01',
      title: 'Configuration management system established',
      description: 'The company has a configuration management procedure in place to ensure that system configurations are deployed consistently throughout the environment.',
      category: 'CC 7.1 Vulnerability detection and monitoring',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC7.1-02',
      title: 'Vulnerability and system monitoring procedures established',
      description: "The company's formal policies outline the requirements for the following functions related to IT / Engineering: vulnerability management; system monitoring.",
      category: 'CC 7.1 Vulnerability detection and monitoring',
      owner: 'Dominic Meagher',
      evidenceStatus: '12/12',
      status: 'Active',
    },

    // CC 7.3 Security event evaluation
    {
      code: 'CC7.3-01',
      title: 'Incident management procedures followed',
      description: "The company's security and privacy incidents are logged, tracked, resolved, and communicated to affected or relevant parties by management according to the company's security incident response policy and procedures.",
      category: 'CC 7.3 Security event evaluation',
      owner: 'Dominic Meagher',
      evidenceStatus: '4/4',
      status: 'Active',
    },

    // CC 7.4 Incident response program
    {
      code: 'CC7.4-01',
      title: 'Incident response plan tested',
      description: 'The company tests their incident response plan at least annually.',
      category: 'CC 7.4 Incident response program',
      owner: 'Dominic Meagher',
      evidenceStatus: '3/3',
      status: 'Active',
    },
    {
      code: 'CC7.4-02',
      title: 'Incident Response responsibilities formalized',
      description: 'Roles and responsibilities for the design, implementation, maintenance, and execution of the incident response program are defined and documented.',
      category: 'CC 7.4 Incident response program',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },

    // ===================================================
    // CC 8.0 Change Management
    // ===================================================

    // CC 8.1 Change management process
    {
      code: 'CC8.1-01',
      title: 'Back out procedures documented',
      description: 'Back out procedures are documented within each change implementation to allow for rollback of changes when changes impair system operation.',
      category: 'CC 8.1 Change management process',
      owner: 'Konstantinos Konstantinidis',
      evidenceStatus: '2/2',
      status: 'Active',
    },
    {
      code: 'CC8.1-02',
      title: 'Prior source code retained',
      description: 'Prior code is held in the source code repository for rollback capability in the event that a system change does not function as designed.',
      category: 'CC 8.1 Change management process',
      owner: 'Konstantinos Karanasos',
      evidenceStatus: '1/1',
      status: 'Active',
    },

    // ===================================================
    // CC 9.0 Risk Mitigation
    // ===================================================

    // CC 9.1 Business disruption risk mitigation
    {
      code: 'CC9.1-01',
      title: 'Cybersecurity insurance maintained',
      description: 'The company maintains cybersecurity insurance to mitigate the financial impact of business disruptions.',
      category: 'CC 9.1 Business disruption risk mitigation',
      owner: 'Richard Lindsay',
      evidenceStatus: '1/1',
      status: 'Active',
    },

    // ===================================================
    // SD - SOC 2 Supporting Compliance Documentation
    // ===================================================
    {
      code: 'SD-01',
      title: 'SOC 2 - System Description',
      description: 'Complete a description of your system for Section III of the audit report.',
      category: 'SD - Supporting Compliance Documentation',
      owner: 'Dominic Meagher',
      evidenceStatus: '1/1',
      status: 'Active',
    },
  ];

  // 3. Insert all controls
  console.log(`Inserting ${allControls.length} controls...`);

  let inserted = 0;
  for (const ctrl of allControls) {
    await sql`
      INSERT INTO controls (source_id, code, title, description, category, evidence_status, owner, status)
      VALUES (${sourceId}, ${ctrl.code}, ${ctrl.title}, ${ctrl.description}, ${ctrl.category}, ${ctrl.evidenceStatus}, ${ctrl.owner}, ${ctrl.status})
    `;
    inserted++;
  }

  console.log(`Successfully inserted ${inserted} SOC 2 controls.`);
  console.log('Done!');
  await sql.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await sql.end();
  process.exit(1);
});
