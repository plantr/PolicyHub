/**
 * Seed script: ISO 27001:2022 Framework Controls
 *
 * Creates the ISO 27001 regulatory source and all associated controls.
 * Run with: npx tsx --env-file=.env scripts/seed-iso27001-controls.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

interface ControlData {
  code: string;
  title: string;
  description: string;
  category: string;
  owner: string;
  status: string;
}

async function seed() {
  console.log('Seeding ISO 27001:2022 framework and controls...');

  // 1. Create or find the ISO 27001 regulatory source
  const existing = await sql`SELECT id FROM regulatory_sources WHERE short_name = 'ISO27001' LIMIT 1`;

  let sourceId: number;
  if (existing.length > 0) {
    sourceId = existing[0].id;
    console.log(`Found existing ISO 27001 source (id=${sourceId})`);
  } else {
    const [source] = await sql`
      INSERT INTO regulatory_sources (name, short_name, jurisdiction, url, category, description)
      VALUES (
        'ISO/IEC 27001:2022 - Information Security Management',
        'ISO27001',
        'International',
        'https://www.iso.org/standard/27001',
        'Information Security',
        'ISO/IEC 27001 is the international standard for information security management systems (ISMS). It provides a framework for establishing, implementing, maintaining and continually improving an ISMS, including requirements for the assessment and treatment of information security risks.'
      )
      RETURNING id
    `;
    sourceId = source.id;
    console.log(`Created ISO 27001 source (id=${sourceId})`);
  }

  // 2. Define all ISO 27001:2022 controls
  const allControls: ControlData[] = [
    // ===================================================
    // A.5 Organizational Controls
    // ===================================================
    {
      code: 'A.5.1',
      title: 'Policies for information security',
      description: 'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.2',
      title: 'Information security roles and responsibilities',
      description: 'Information security roles and responsibilities shall be defined and allocated according to the organization needs.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.3',
      title: 'Segregation of duties',
      description: 'Conflicting duties and conflicting areas of responsibility shall be segregated.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.4',
      title: 'Management responsibilities',
      description: "Management shall require all personnel to apply information security in accordance with the established information security policy, topic-specific policies and procedures of the organization.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.5',
      title: 'Contact with authorities',
      description: 'The organization shall establish and maintain contact with relevant authorities.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.6',
      title: 'Contact with special interest groups',
      description: 'The organization shall establish and maintain contact with special interest groups or other specialist security forums and professional associations.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.7',
      title: 'Threat Intelligence',
      description: 'Information relating to information security threats shall be collected and analyzed to produce threat intelligence.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.8',
      title: 'Information security in project management',
      description: 'Information security shall be integrated into project management.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.9',
      title: 'Inventory of information and other associated assets',
      description: 'An inventory of information and other associated assets, including owners, shall be developed and maintained.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.10',
      title: 'Acceptable use of information and other associated assets',
      description: 'Rules for the acceptable use and procedures for handling information and other associated assets shall be identified, documented and implemented.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.11',
      title: 'Return of assets',
      description: "Personnel and other interested parties as appropriate shall return all the organization's assets in their possession upon change or termination of their employment, contract or agreement.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.12',
      title: 'Classification of information',
      description: 'Information shall be classified according to the information security needs of the organization based on confidentiality, integrity, availability and relevant interested party requirements.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.13',
      title: 'Labelling of information',
      description: 'An appropriate set of procedures for information labelling shall be developed and implemented in accordance with the information classification scheme adopted by the organization.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.14',
      title: 'Information transfer',
      description: 'Information transfer rules, procedures, or agreements shall be in place for all types of transfer facilities within the organization and between the organization and other parties.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.15',
      title: 'Access control',
      description: 'Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.16',
      title: 'Identity management',
      description: 'The full life cycle of identities shall be managed.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.17',
      title: 'Authentication information',
      description: 'Allocation and management of authentication information shall be controlled by a management process, including advising personnel on the appropriate handling of authentication information.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.18',
      title: 'Access rights',
      description: "Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with the organization's topic-specific policy on and rules for access control.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.19',
      title: 'Information security in supplier relationships',
      description: "Processes and procedures shall be defined and implemented to manage the information security risks associated with the use of supplier's products or services.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.20',
      title: 'Addressing information security within supplier agreements',
      description: 'Relevant information security requirements shall be established and agreed with each supplier based on the type of supplier relationship.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.21',
      title: 'Managing information security in the ICT supply chain',
      description: 'Processes and procedures shall be defined and implemented to manage the information security risks associated with the ICT products and services supply chain.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.22',
      title: 'Monitoring, review and change management of supplier services',
      description: 'The organization shall regularly monitor, review, evaluate and manage change in supplier information security practices and service delivery.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.23',
      title: 'Information security for use of cloud services',
      description: "Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization's information security requirements.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.24',
      title: 'Information security incident management planning and preparation',
      description: 'The organization shall plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.25',
      title: 'Assessment and decision on information security events',
      description: 'The organization shall assess information security events and decide if they are to be categorized as information security incidents.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.26',
      title: 'Response to information security incidents',
      description: 'Information security incidents shall be responded to in accordance with the documented procedures.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.27',
      title: 'Learning from information security incidents',
      description: 'Knowledge gained from information security incidents shall be used to strengthen and improve the information security controls.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.28',
      title: 'Collection of evidence',
      description: 'The organization shall establish and implement procedures for the identification, collection, acquisition and preservation of evidence related to information security events.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.29',
      title: 'Information security during disruption',
      description: 'The organization shall plan how to maintain information security at an appropriate level during disruption.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.30',
      title: 'ICT readiness for business continuity',
      description: 'ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.31',
      title: 'Legal, statutory, regulatory and contractual requirements',
      description: "Legal, statutory, regulatory and contractual requirements relevant to information security and the organization's approach to meet these requirements shall be identified, documented and kept up to date.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.32',
      title: 'Intellectual property rights',
      description: 'The organization shall implement appropriate procedures to protect intellectual property rights.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.33',
      title: 'Protection of records',
      description: 'Records shall be protected from loss, destruction, falsification, unauthorized access and unauthorized release.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.34',
      title: 'Privacy and protection of PII',
      description: 'The organization shall identify and meet the requirements regarding the preservation of privacy and protection of PII according to applicable laws and regulations and contractual requirements.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.35',
      title: 'Independent review of information security',
      description: "The organization's approach to managing information security and its implementation including people, processes and technologies shall be reviewed independently at planned intervals, or when significant changes occur.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.36',
      title: 'Compliance with policies, rules and standards for information security',
      description: "Compliance with the organization's information security policy, topic-specific policies, rules and standards shall be regularly reviewed.",
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.5.37',
      title: 'Documented operating procedures',
      description: 'Operating procedures for information processing facilities shall be documented and made available to personnel who need them.',
      category: 'Organizational Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // A.6 People Controls
    // ===================================================
    {
      code: 'A.6.1',
      title: 'Screening',
      description: 'Background verification checks on all candidates to become personnel shall be carried out prior to joining the organization and on an ongoing basis taking into consideration applicable laws, regulations and ethics and be proportional to the business requirements, the classification of the information to be accessed and the perceived risks.',
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.2',
      title: 'Terms and conditions of employment',
      description: "The employment contractual agreements shall state the personnel's and the organization's responsibilities for information security.",
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.3',
      title: 'Information security awareness, education and training',
      description: "Personnel of the organization and relevant interested parties shall receive appropriate information security awareness, education and training and regular updates of the organization's information security policy, topic-specific policies and procedures, as relevant for their job function.",
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.4',
      title: 'Disciplinary process',
      description: 'A disciplinary process shall be formalized and communicated to take actions against personnel and other relevant interested parties who have committed an information security policy violation.',
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.5',
      title: 'Responsibilities after termination or change of employment',
      description: 'Information security responsibilities and duties that remain valid after termination or change of employment shall be defined, enforced and communicated to relevant personnel and other interested parties.',
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.6',
      title: 'Confidentiality or non-disclosure agreements',
      description: "Confidentiality or non-disclosure agreements reflecting the organization's needs for the protection of information shall be identified, documented, regularly reviewed and signed by personnel and other relevant interested parties.",
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.7',
      title: 'Remote working',
      description: "Security measures shall be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization's premises.",
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.6.8',
      title: 'Information security event reporting',
      description: 'The organization shall provide a mechanism for personnel to report observed or suspected information security events through appropriate channels in a timely manner.',
      category: 'People Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // A.7 Physical Controls
    // ===================================================
    {
      code: 'A.7.1',
      title: 'Physical security perimeters',
      description: 'Security perimeters shall be defined and used to protect areas that contain information and other associated assets.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.2',
      title: 'Physical entry',
      description: 'Secure areas shall be protected by appropriate entry controls and access points.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.3',
      title: 'Securing offices, rooms and facilities',
      description: 'Physical security for offices, rooms and facilities shall be designed and implemented.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.4',
      title: 'Physical security monitoring',
      description: 'Premises shall be continuously monitored for unauthorized physical access.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.5',
      title: 'Protecting against physical and environmental threats',
      description: 'Protection against physical and environmental threats, such as natural disasters and other intentional or unintentional physical threats to infrastructure shall be designed and implemented.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.6',
      title: 'Working in secure areas',
      description: 'Security measures for working in secure areas shall be designed and implemented.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.7',
      title: 'Clear desk and clear screen',
      description: 'Clear desk rules for papers and removable storage media and clear screen rules for information processing facilities shall be defined and appropriately enforced.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.8',
      title: 'Equipment siting and protection',
      description: 'Equipment shall be sited securely and protected.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.9',
      title: 'Security of assets off-premises',
      description: 'Off-site assets shall be protected.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.10',
      title: 'Storage media',
      description: "Storage media shall be managed through their life cycle of acquisition, use, transportation and disposal in accordance with the organization's classification scheme and handling requirements.",
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.11',
      title: 'Supporting utilities',
      description: 'Information processing facilities shall be protected from power failures and other disruptions caused by failures in supporting utilities.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.12',
      title: 'Cabling security',
      description: 'Cables carrying power, data or supporting information services shall be protected from interception, interference or damage.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.13',
      title: 'Equipment maintenance',
      description: 'Equipment shall be maintained correctly to ensure availability, integrity and confidentiality of information.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.7.14',
      title: 'Secure disposal or re-use of equipment',
      description: 'Items of equipment containing storage media shall be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use.',
      category: 'Physical Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // A.8 Technological Controls
    // ===================================================
    {
      code: 'A.8.1',
      title: 'User endpoint devices',
      description: 'Information stored on, processed by or accessible via user endpoint devices shall be protected.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.2',
      title: 'Privileged access rights',
      description: 'The allocation and use of privileged access rights shall be restricted and managed.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.3',
      title: 'Information access restriction',
      description: 'Access to information and other associated assets shall be restricted in accordance with the established topic-specific policy on access control.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.4',
      title: 'Access to source code',
      description: 'Read and write access to source code, development tools and software libraries shall be appropriately managed.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.5',
      title: 'Secure authentication',
      description: 'Secure authentication technologies and procedures shall be implemented based on information access restrictions and the topic-specific policy on access control.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.6',
      title: 'Capacity management',
      description: 'The use of resources shall be monitored and adjusted in line with current and expected capacity requirements.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.7',
      title: 'Protection against malware',
      description: 'Protection against malware shall be implemented and supported by appropriate user awareness.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.8',
      title: 'Management of technical vulnerabilities',
      description: "Information about technical vulnerabilities of information systems in use shall be obtained, the organization's exposure to such vulnerabilities should be evaluated and appropriate measures should be taken.",
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.9',
      title: 'Configuration management',
      description: 'Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.10',
      title: 'Information deletion',
      description: 'Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.11',
      title: 'Data masking',
      description: "Data masking shall be used in accordance with the organization's topic-specific policy on access control and other related topic-specific policies, and business requirements, taking applicable legislation into consideration.",
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.12',
      title: 'Data leakage prevention',
      description: 'Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.13',
      title: 'Information backup',
      description: 'Backup copies of information, software and systems shall be maintained and regularly tested in accordance with the agreed topic-specific policy on backup.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.14',
      title: 'Redundancy of information processing facilities',
      description: 'Information processing facilities shall be implemented with redundancy sufficient to meet availability requirements.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.15',
      title: 'Logging',
      description: 'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.16',
      title: 'Monitoring activities',
      description: 'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.17',
      title: 'Clock synchronization',
      description: 'The clocks of information processing systems used by the organization shall be synchronized to approved time sources.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.18',
      title: 'Use of privileged utility programs',
      description: 'The use of utility programs that can be capable of overriding system and application controls shall be restricted and tightly controlled.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.19',
      title: 'Installation of software on operational systems',
      description: 'Procedures and measures shall be implemented to securely manage software installation on operational systems.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.20',
      title: 'Networks security',
      description: 'Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.21',
      title: 'Security of network services',
      description: 'Security mechanisms, service levels and service requirements of network services shall be identified, implemented and monitored.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.22',
      title: 'Segregation of networks',
      description: "Groups of information services, users and information systems shall be segregated in the organization's networks.",
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.23',
      title: 'Web filtering',
      description: 'Access to external websites shall be managed to reduce exposure to malicious content.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.24',
      title: 'Use of cryptography',
      description: 'Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.25',
      title: 'Secure development life cycle',
      description: 'Rules for the secure development of software and systems shall be established and applied.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.26',
      title: 'Application security requirements',
      description: 'Information security requirements shall be identified, specified and approved when developing or acquiring applications.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.27',
      title: 'Secure system architecture and engineering principles',
      description: 'Principles for engineering secure systems shall be established, documented, maintained and applied to any information system development activities.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.28',
      title: 'Secure coding',
      description: 'Secure coding principles shall be applied to software development.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.29',
      title: 'Security testing in development and acceptance',
      description: 'Security testing processes shall be defined and implemented in the development life cycle.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.30',
      title: 'Outsourced development',
      description: 'The organization shall direct, monitor and review the activities related to outsourced system development.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.31',
      title: 'Separation of development, test and production environments',
      description: 'Development, testing and production environments shall be separated and secured.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.32',
      title: 'Change management',
      description: 'Changes to information processing facilities and information systems shall be subject to change management procedures.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.33',
      title: 'Test information',
      description: 'Test information shall be appropriately selected, protected and managed.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'A.8.34',
      title: 'Protection of information systems during audit testing',
      description: 'Audit tests and other assurance activities involving assessment of operational systems shall be planned and agreed between the tester and appropriate management.',
      category: 'Technological Controls',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.4 Context of the Organization (ISMS Clauses)
    // ===================================================
    {
      code: 'C.4.1',
      title: 'Understanding the organization and its context',
      description: 'The organization shall determine external and internal issues that are relevant to its purpose and that affect its ability to achieve the intended outcome(s) of its information security management system.',
      category: 'Context of the Organization',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.4.2',
      title: 'Understanding the needs of interested parties',
      description: 'The organization shall determine: a) interested parties that are relevant to the information security management system; b) the relevant requirements of these interested parties; c) which of these requirements will be addressed through the information security management system.',
      category: 'Context of the Organization',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.4.3',
      title: 'Determining the scope of the information security management system',
      description: 'The organization shall determine the boundaries and applicability of the information security management system to establish its scope. When determining this scope, the organization shall consider: a) the external and internal issues referred to in 4.1; b) the requirements referred to in 4.2; c) interfaces and dependencies between activities performed by the organization, and those that are performed by other organizations. The scope shall be available as documented information.',
      category: 'Context of the Organization',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.4.4',
      title: 'Information security management system',
      description: 'The organization shall establish, implement, maintain and continually improve an information security management system, including the processes needed and their interactions, in accordance with the requirements of ISO 27001.',
      category: 'Context of the Organization',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.5 Leadership
    // ===================================================
    {
      code: 'C.5.1',
      title: 'Leadership and commitment',
      description: "Top management shall demonstrate leadership and commitment with respect to the information security management system by: a) ensuring the information security policy and objectives are established and compatible with the strategic direction; b) ensuring integration of ISMS requirements into the organization's processes; c) ensuring resources are available; d) communicating the importance of effective information security management; e) ensuring the ISMS achieves its intended outcomes; f) directing and supporting persons to contribute to effectiveness; g) promoting continual improvement; h) supporting other management roles to demonstrate leadership.",
      category: 'Leadership',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.5.2',
      title: 'Policy',
      description: 'Top management shall establish an information security policy that: a) is appropriate to the purpose of the organization; b) includes information security objectives or provides the framework for setting them; c) includes a commitment to satisfy applicable requirements; d) includes a commitment to continual improvement. The policy shall be available as documented information, communicated within the organization, and available to interested parties as appropriate.',
      category: 'Leadership',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.5.3',
      title: 'Organizational roles, responsibilities and authorities',
      description: 'Top management shall ensure that the responsibilities and authorities for roles relevant to information security are assigned and communicated within the organization. Top management shall assign the responsibility and authority for: a) ensuring that the ISMS conforms to the requirements of this document; b) reporting on the performance of the ISMS to top management.',
      category: 'Leadership',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.6 Planning
    // ===================================================
    {
      code: 'C.6.1.1',
      title: 'General actions to address risks and opportunities',
      description: 'When planning for the ISMS, the organization shall consider the issues referred to in 4.1 and the requirements referred to in 4.2 and determine the risks and opportunities that need to be addressed to: a) ensure the ISMS can achieve its intended outcomes; b) prevent or reduce undesired effects; c) achieve continual improvement. The organization shall plan: d) actions to address these risks and opportunities; and e) how to integrate and implement the actions into its ISMS processes and evaluate the effectiveness of these actions.',
      category: 'Planning',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.6.1.2',
      title: 'Information security risk assessment',
      description: 'The organization shall define and apply an information security risk assessment process that: a) establishes and maintains risk criteria including acceptance criteria and criteria for performing assessments; b) ensures repeated assessments produce consistent, valid and comparable results; c) identifies information security risks including risk owners; d) analyses information security risks including potential consequences, realistic likelihood and risk levels; e) evaluates information security risks by comparing results with criteria and prioritizing for treatment. The organization shall retain documented information about the process.',
      category: 'Planning',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.6.1.3',
      title: 'Information security risk treatment',
      description: 'The organization shall define and apply an information security risk treatment process to: a) select appropriate risk treatment options; b) determine all controls necessary to implement the chosen options; c) compare controls with Annex A and verify no necessary controls are omitted; d) produce a Statement of Applicability; e) formulate a risk treatment plan; f) obtain risk owners approval of the plan and acceptance of residual risks. The organization shall retain documented information about the process.',
      category: 'Planning',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.6.2',
      title: 'Information security objectives and planning to achieve them',
      description: 'The organization shall establish information security objectives at relevant functions and levels. The objectives shall: a) be consistent with the policy; b) be measurable; c) take into account applicable requirements and risk assessment/treatment results; d) be monitored; e) be communicated; f) be updated as appropriate; g) be available as documented information. When planning how to achieve objectives, the organization shall determine what will be done, resources required, who is responsible, when it will be completed, and how results will be evaluated.',
      category: 'Planning',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.6.3',
      title: 'Planning of changes',
      description: 'When the organization determines the need for changes to the information security management system, the changes shall be carried out in a planned manner.',
      category: 'Planning',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.7 Support
    // ===================================================
    {
      code: 'C.7.1',
      title: 'Resources',
      description: 'The organization shall determine and provide the resources needed for the establishment, implementation, maintenance and continual improvement of the information security management system.',
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.7.2',
      title: 'Competence',
      description: 'The organization shall: a) determine the necessary competence of persons doing work under its control that affects its information security performance; b) ensure that these persons are competent on the basis of appropriate education, training, or experience; c) where applicable, take actions to acquire the necessary competence, and evaluate the effectiveness of the actions taken; d) retain appropriate documented information as evidence of competence.',
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.7.3',
      title: 'Awareness',
      description: "Persons doing work under the organization's control shall be aware of: a) the information security policy; b) their contribution to the effectiveness of the ISMS, including the benefits of improved information security performance; c) the implications of not conforming with the ISMS requirements.",
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.7.4',
      title: 'Communication',
      description: 'The organization shall determine the need for internal and external communications relevant to the information security management system including: a) on what to communicate; b) when to communicate; c) with whom to communicate; d) how to communicate.',
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.7.5.1',
      title: 'Documented information',
      description: "The organization's information security management system shall include: a) documented information required by this document; and b) documented information determined by the organization as being necessary for the effectiveness of the information security management system.",
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.7.5.2',
      title: 'Creating and updating',
      description: 'When creating and updating documented information the organization shall ensure appropriate: a) identification and description (e.g. a title, date, author, or reference number); b) format (e.g. language, software version, graphics) and media (e.g. paper, electronic); and c) review and approval for suitability and adequacy.',
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.7.5.3',
      title: 'Control of documented information',
      description: 'Documented information required by the ISMS and by this document shall be controlled to ensure: a) it is available and suitable for use, where and when it is needed; b) it is adequately protected. For control, the organization shall address: c) distribution, access, retrieval and use; d) storage and preservation; e) control of changes; f) retention and disposition. External documented information shall be identified and controlled.',
      category: 'Support',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.8 Operation
    // ===================================================
    {
      code: 'C.8.1',
      title: 'Operational planning and control',
      description: 'The organization shall plan, implement and control the processes needed to meet requirements, and to implement the actions determined in Clause 6, by establishing criteria for the processes and implementing control in accordance with the criteria. Documented information shall be available to have confidence that processes have been carried out as planned. The organization shall control planned changes and review the consequences of unintended changes. Externally provided processes, products or services relevant to the ISMS shall be controlled.',
      category: 'Operation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.8.2',
      title: 'Information security risk assessment - Operation',
      description: 'The organization shall perform information security risk assessments at planned intervals or when significant changes are proposed or occur, taking account of the criteria established in 6.1.2 a). The organization shall retain documented information of the results.',
      category: 'Operation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.8.3',
      title: 'Information security risk treatment - Operation',
      description: 'The organization shall implement the information security risk treatment plan. The organization shall retain documented information of the results of the information security risk treatment.',
      category: 'Operation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.9 Performance Evaluation
    // ===================================================
    {
      code: 'C.9.1',
      title: 'Monitoring, measurement, analysis, and evaluation',
      description: 'The organization shall determine: a) what needs to be monitored and measured; b) methods for monitoring, measurement, analysis and evaluation to ensure valid results; c) when monitoring and measuring shall be performed; d) who shall monitor and measure; e) when results shall be analysed and evaluated; f) who shall analyse and evaluate results. Documented information shall be available as evidence. The organization shall evaluate the information security performance and effectiveness of the ISMS.',
      category: 'Performance Evaluation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.9.2.1',
      title: 'Internal audit - General',
      description: "The organization shall conduct internal audits at planned intervals to provide information on whether the ISMS: a) conforms to the organization's own requirements for its ISMS and the requirements of this document; b) is effectively implemented and maintained.",
      category: 'Performance Evaluation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.9.2.2',
      title: 'Internal audit program',
      description: 'The organization shall plan, establish, implement and maintain an audit programme including the frequency, methods, responsibilities, planning requirements and reporting. The organization shall: a) define audit criteria and scope; b) select auditors and conduct audits ensuring objectivity and impartiality; c) ensure results are reported to relevant management. Documented information shall be available as evidence of the audit programme and results.',
      category: 'Performance Evaluation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.9.3.1',
      title: 'Management review - General',
      description: "Top management shall review the organization's information security management system at planned intervals to ensure its continuing suitability, adequacy and effectiveness.",
      category: 'Performance Evaluation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.9.3.2',
      title: 'Management review inputs',
      description: 'The management review shall include consideration of: a) status of actions from previous reviews; b) changes in external and internal issues relevant to the ISMS; c) changes in needs and expectations of interested parties; d) feedback on information security performance including trends in nonconformities, monitoring and measurement results, audit results, and fulfilment of objectives; e) feedback from interested parties; f) results of risk assessment and status of risk treatment plan; g) opportunities for continual improvement.',
      category: 'Performance Evaluation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.9.3.3',
      title: 'Management review results',
      description: 'The results of the management review shall include decisions related to continual improvement opportunities and any needs for changes to the information security management system. Documented information shall be available as evidence of the results of management reviews.',
      category: 'Performance Evaluation',
      owner: 'Dominic Meagher',
      status: 'Active',
    },

    // ===================================================
    // C.10 Improvement
    // ===================================================
    {
      code: 'C.10.1',
      title: 'Continual improvement',
      description: 'The organization shall continually improve the suitability, adequacy and effectiveness of the information security management system.',
      category: 'Improvement',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
    {
      code: 'C.10.2',
      title: 'Nonconformity and corrective action',
      description: 'When a nonconformity occurs, the organization shall: a) react to the nonconformity, and as applicable take action to control and correct it and deal with the consequences; b) evaluate the need for action to eliminate the causes of nonconformity so that it does not recur or occur elsewhere; c) implement any action needed; d) review the effectiveness of any corrective action taken; e) make changes to the ISMS if necessary. Corrective actions shall be appropriate to the effects of the nonconformities encountered. Documented information shall be retained as evidence.',
      category: 'Improvement',
      owner: 'Dominic Meagher',
      status: 'Active',
    },
  ];

  // 3. Delete existing controls for this source, then insert fresh
  const deleted = await sql`DELETE FROM controls WHERE source_id = ${sourceId}`;
  console.log(`Deleted ${deleted.count} existing controls for ISO 27001 source.`);
  console.log(`Inserting ${allControls.length} controls...`);

  let inserted = 0;
  for (const ctrl of allControls) {
    await sql`
      INSERT INTO controls (source_id, code, title, description, category, owner, status)
      VALUES (${sourceId}, ${ctrl.code}, ${ctrl.title}, ${ctrl.description}, ${ctrl.category}, ${ctrl.owner}, ${ctrl.status})
    `;
    inserted++;
  }

  console.log(`Successfully inserted ${inserted} ISO 27001 controls.`);
  console.log('Done!');
  await sql.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await sql.end();
  process.exit(1);
});
