/**
 * Seed script: All IT Policy Documents
 *
 * Adds all OG-POL-ITIS policy documents from the IT Policies PDF folder.
 * Extracts text content from PDFs at runtime using pdftotext (poppler).
 *
 * Run with: npx tsx --env-file=.env scripts/seed-all-policies.ts
 */
import postgres from 'postgres';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const PDF_DIR = process.env.POLICY_PDF_DIR || '/Users/robert.plant/Documents/IT Policies';

// ---------------------------------------------------------------------------
// Policy metadata
// ---------------------------------------------------------------------------

interface PolicyMeta {
  reference: string;
  title: string;
  domain: string;
  owner: string;
  delegates: string[];
  reviewers: string[];
  approvers: string[];
  tags: string[];
  reviewFrequency: string;
  version: string;
  effectiveDate: string;
  createdBy: string;
  changeReason: string;
  pdfFileName: string;
}

const policies: PolicyMeta[] = [
  {
    reference: 'OG-POL-ITIS-001',
    title: 'Information Security Policy Framework',
    domain: 'Information Security',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Information Security', 'ISMS', 'ISO 27001', 'Policy Framework', 'Governance'],
    reviewFrequency: 'Annual',
    version: '1.4',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual Review',
    pdfFileName: 'OG-POL-ITIS-001- Information Security Policy Framework.pdf',
  },
  {
    reference: 'OG-POL-ITIS-002',
    title: 'Acceptable Use Policy',
    domain: 'Acceptable Use',
    owner: 'Chief Operating Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer', 'Chief Operating Officer'],
    approvers: ['Board of Directors'],
    tags: ['Acceptable Use', 'Electronic Assets', 'Data Protection', 'GenAI'],
    reviewFrequency: 'Annual',
    version: '1.4',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Updates to section 2.7',
    pdfFileName: 'OG-POL-ITIS-002 - Acceptable Use Policy (3).pdf',
  },
  {
    reference: 'OG-POL-ITIS-003',
    title: 'Acceptable Use Policy - End User Agreement',
    domain: 'Acceptable Use',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['End User Agreement', 'Acceptable Use', 'GenAI', 'Electronic Devices'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Updates to section 2.5 (GenAI)',
    pdfFileName: 'OG-POL-ITIS-003 - Acceptable Use Policy-End User Agreement..pdf',
  },
  {
    reference: 'OG-POL-ITIS-004',
    title: 'Data Classification Policy',
    domain: 'Data Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Data Classification', 'Information Assets', 'Data Handling', 'Public', 'Internal', 'Confidential', 'Restricted'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-004 - Data Classification Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-005',
    title: 'Data Handling Policy',
    domain: 'Data Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Data Handling', 'Information Assets', 'Data Destruction', 'Data Classification'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-005 - Data Handling Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-006',
    title: 'IT-IS Risk Management Policy',
    domain: 'Risk Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Risk Management', 'Risk Assessment', 'ISO 27001', 'DORA', 'Risk Treatment'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review and minor updates to section 2.10',
    pdfFileName: 'OG-POL-ITIS-006 - IT-IS Risk Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-007',
    title: 'Asset Management Policy',
    domain: 'Asset Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Asset Management', 'Information Assets', 'Decommissioning', 'Asset Register'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-08-01',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual Review',
    pdfFileName: 'OG-POL-ITIS-007 - Asset Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-008',
    title: 'Business Continuity Management Policy',
    domain: 'Business Continuity',
    owner: 'Chief Operating Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Operating Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Business Continuity', 'BCP', 'Disaster Recovery', 'DORA', 'ISO 22301', 'BIA'],
    reviewFrequency: 'Annual',
    version: '1.4',
    effectiveDate: '2023-02-03',
    createdBy: 'Chief Operating Officer',
    changeReason: 'Updates following the revision of the resilience framework',
    pdfFileName: 'OG-POL-ITIS-008 - Business Continuity Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-009',
    title: 'Access Control Policy',
    domain: 'Access Control',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Access Control', 'Authentication', 'RBAC', 'Privileged Access', 'MFA'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2022-11-25',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review and amendments to section 2.18',
    pdfFileName: 'OG-POL-ITIS-009 - Access Control Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-010',
    title: 'Encryption and Key Management Policy',
    domain: 'Cryptography',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Encryption', 'Key Management', 'Cryptography', 'HSM', 'NIST'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-07-27',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review and update to section 4.2',
    pdfFileName: 'OG-POL-ITIS-010 - Encryption and Key Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-012',
    title: 'IT-IS Incident Management & Response Policy',
    domain: 'Incident Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Incident Management', 'Incident Response', 'CSIRT', 'Forensics', 'Data Breach'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2023-02-03',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review and updates to section 4.2',
    pdfFileName: 'OG-POL-ITIS-012 - IT-IS Incident Management & Response Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-013',
    title: 'Disaster Recovery Policy',
    domain: 'Disaster Recovery',
    owner: 'Chief Operating Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Operating Officer', 'Chief Product & Technology Officer'],
    approvers: ['Board of Directors'],
    tags: ['Disaster Recovery', 'Business Continuity', 'DR Testing', 'BIA', 'RTO', 'RPO'],
    reviewFrequency: 'Annual',
    version: '1.4',
    effectiveDate: '2023-02-03',
    createdBy: 'Chief Operating Officer',
    changeReason: 'Updates following the revision of the resilience framework',
    pdfFileName: 'OG-POL-ITIS-013 - Disaster Recovery Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-014',
    title: 'Vendor Management Policy',
    domain: 'Vendor Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Vendor Management', 'Third Party', 'Due Diligence', 'Supply Chain', 'SOC 2'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-07-27',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-014 - Vendor Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-015',
    title: 'Security Awareness Training Policy',
    domain: 'Security Awareness',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Security Awareness', 'Training', 'Phishing', 'SAT'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-07-27',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-015 - Security Awareness Training Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-016',
    title: 'IT-IS Project Management Policy',
    domain: 'Project Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Project Management', 'Information Security', 'Risk Assessment'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-07-27',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-016 - IT-IS Project Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-017',
    title: 'System and Network Configuration Policy',
    domain: 'Operations Security',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Configuration Management', 'Network Security', 'Patch Management', 'Change Control', 'Logging'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-09-19',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-017 - System and Network Configuration Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-018',
    title: 'Data Protection Policy',
    domain: 'Data Protection',
    owner: 'Data Protection Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Data Protection Officer', 'Chief Information Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Data Protection', 'GDPR', 'Privacy', 'Personal Data', 'DORA', 'DPA'],
    reviewFrequency: 'Annual',
    version: '1.1',
    effectiveDate: '2024-02-06',
    createdBy: 'Data Protection Officer',
    changeReason: 'Inclusion of regulatory changes',
    pdfFileName: 'OG-POL-ITIS-018 - Data Protection Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-019',
    title: 'Secure Application Development Policy',
    domain: 'Application Security',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Secure Development', 'SDLC', 'OWASP', 'Application Security', 'Code Review'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-09-19',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review and minor amendments to wording',
    pdfFileName: 'OG-POL-ITIS-019 - Secure Application Development Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-020',
    title: 'Data Retention Policy',
    domain: 'Data Protection',
    owner: 'Data Protection Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Data Protection Officer', 'Chief Information Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Data Retention', 'GDPR', 'Personal Data', 'Records Management'],
    reviewFrequency: 'Annual',
    version: '1.1',
    effectiveDate: '2024-02-06',
    createdBy: 'Data Protection Officer',
    changeReason: 'Inclusion of regulatory changes',
    pdfFileName: 'OG-POL-ITIS-020 - Data Retention Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-021',
    title: 'Vulnerability Management Policy',
    domain: 'Vulnerability Management',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Vulnerability Management', 'Patch Management', 'Penetration Testing', 'Anti-Malware', 'Logging'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-09-19',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-021 - Vulnerability Management Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-022',
    title: 'Physical Security Policy',
    domain: 'Physical Security',
    owner: 'Chief Security Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Information Security Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Physical Security', 'Access Control', 'Visitor Management', 'CCTV'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-09-19',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Annual review',
    pdfFileName: 'OG-POL-ITIS-022 - Physical Security Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-024',
    title: 'Data Breach Policy',
    domain: 'Data Protection',
    owner: 'Data Protection Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Data Protection Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Data Breach', 'Incident Response', 'GDPR', 'Notification', 'DORA', 'ICO'],
    reviewFrequency: 'Annual',
    version: '1.2',
    effectiveDate: '2023-09-19',
    createdBy: 'Data Protection Officer',
    changeReason: 'Inclusion of regulatory changes',
    pdfFileName: 'OG-POL-ITIS-024 - Data Breach Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-027',
    title: 'Operational Resilience Policy (PPL)',
    domain: 'Operational Resilience',
    owner: 'Chief Operating Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Operating Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Operational Resilience', 'DORA', 'FCA', 'Business Continuity', 'PPL', 'ISO 22301'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2024-04-25',
    createdBy: 'Chief Operating Officer',
    changeReason: 'Updates following the revision of the resilience framework',
    pdfFileName: 'OG-POL-ITIS-027 - Operational Resilience Policy (PPL).pdf',
  },
  {
    reference: 'OG-POL-ITIS-028',
    title: 'Operational Resilience Policy (PPDL-PPGL)',
    domain: 'Operational Resilience',
    owner: 'Chief Operating Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Operating Officer', 'Chief Security Officer'],
    approvers: ['Board of Directors'],
    tags: ['Operational Resilience', 'DORA', 'GFSC', 'Business Continuity', 'PPDL', 'PPGL', 'ISO 22301'],
    reviewFrequency: 'Annual',
    version: '1.3',
    effectiveDate: '2024-04-25',
    createdBy: 'Chief Operating Officer',
    changeReason: 'Updates following the revision of the resilience framework',
    pdfFileName: 'OG-POL-ITIS-028 - Operational Resilience Policy (PPDL-PPGL).pdf',
  },
  {
    reference: 'OG-POL-ITIS-029',
    title: 'Operational Resilience Policy (PPOU)',
    domain: 'Operational Resilience',
    owner: 'Chief Operating Officer',
    delegates: ['Cyber & Information Security Manager'],
    reviewers: ['Chief Operating Officer', 'Head of Risk'],
    approvers: ['Board of Directors'],
    tags: ['Operational Resilience', 'DORA', 'Estonia', 'FIU', 'PPOU', 'ISO 22301'],
    reviewFrequency: 'Annual',
    version: '1.1',
    effectiveDate: '2025-10-28',
    createdBy: 'Chief Operating Officer',
    changeReason: 'Updates following the revision of the resilience framework',
    pdfFileName: 'OG-POL-ITIS-029 - Operational Resilience Policy (PPOU).pdf',
  },
  {
    reference: 'OG-POL-ITIS-029B',
    title: 'Backup and Restore Policy',
    domain: 'Data Protection',
    owner: 'Cyber & Information Security Manager',
    delegates: [],
    reviewers: ['Cyber & Information Security Manager'],
    approvers: ['Board of Directors'],
    tags: ['Backup', 'Restore', 'Disaster Recovery', 'RPO', 'RTO', 'Encryption'],
    reviewFrequency: 'Annual',
    version: '1.0',
    effectiveDate: '2025-11-11',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Released version',
    pdfFileName: 'OG-POL-ITIS-029 - Backup and Restore Policy.pdf',
  },
  {
    reference: 'OG-POL-ITIS-030',
    title: 'Artificial Intelligence Policy',
    domain: 'Artificial Intelligence',
    owner: 'Cyber & Information Security Manager',
    delegates: [],
    reviewers: ['Cyber & Information Security Manager'],
    approvers: ['Board of Directors'],
    tags: ['AI', 'Artificial Intelligence', 'Ethics', 'GDPR', 'EU AI Act', 'GenAI'],
    reviewFrequency: 'Annual',
    version: '1.0',
    effectiveDate: '2025-11-11',
    createdBy: 'Cyber & Information Security Manager',
    changeReason: 'Released version',
    pdfFileName: 'OG-POL-ITIS-030 - Artificial Intelligence Policy.pdf',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractPdfText(filePath: string): string {
  try {
    return execSync(`pdftotext "${filePath}" -`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    console.warn(`  Warning: Could not extract text from ${filePath}`);
    return '';
  }
}

/** Strip PDF headers/footers and clean up extracted text for the content field */
function cleanContent(raw: string): string {
  return raw
    .replace(/Doc\.\s*Name:.*$/gm, '')
    .replace(/Doc\.\s*Number:.*$/gm, '')
    .replace(/Version:.*$/gm, '')
    .replace(/Status:.*$/gm, '')
    .replace(/Effective Date:.*$/gm, '')
    .replace(/INTERNAL\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding ${policies.length} IT policy documents...`);
  console.log(`PDF directory: ${PDF_DIR}\n`);

  let created = 0;
  let skipped = 0;

  for (const p of policies) {
    const pdfPath = `${PDF_DIR}/${p.pdfFileName}`;

    // Check PDF exists
    if (!existsSync(pdfPath)) {
      console.warn(`  SKIP ${p.reference} - PDF not found: ${p.pdfFileName}`);
      skipped++;
      continue;
    }

    // Check if document already exists (by reference + title to handle the 029 duplicate)
    const existing = await sql`
      SELECT id FROM documents
      WHERE document_reference = ${p.reference}
        AND title = ${p.title}
      LIMIT 1
    `;

    let docId: number;
    if (existing.length > 0) {
      docId = existing[0].id;
      console.log(`  EXISTS ${p.reference} - ${p.title} (id=${docId})`);
    } else {
      const [doc] = await sql`
        INSERT INTO documents (
          document_reference, title, doc_type, domain, owner,
          delegates, reviewers, approvers, tags, review_frequency
        ) VALUES (
          ${p.reference},
          ${p.title},
          'Policy',
          ${p.domain},
          ${p.owner},
          ${sql.array(p.delegates)},
          ${sql.array(p.reviewers)},
          ${sql.array(p.approvers)},
          ${sql.array(p.tags)},
          ${p.reviewFrequency}
        )
        RETURNING id
      `;
      docId = doc.id;
      console.log(`  CREATED ${p.reference} - ${p.title} (id=${docId})`);
      created++;
    }

    // Check if this version already exists
    const existingVer = await sql`
      SELECT id FROM document_versions
      WHERE document_id = ${docId} AND version = ${p.version}
      LIMIT 1
    `;

    if (existingVer.length > 0) {
      console.log(`    Version ${p.version} already exists, skipping.`);
      continue;
    }

    // Extract content from PDF
    const rawText = extractPdfText(pdfPath);
    const content = cleanContent(rawText);

    if (!content) {
      console.warn(`    Warning: No content extracted for ${p.reference}`);
    }

    await sql`
      INSERT INTO document_versions (
        document_id, version, status, content, change_reason,
        effective_date, created_by, pdf_file_name
      ) VALUES (
        ${docId},
        ${p.version},
        'Published',
        ${content},
        ${p.changeReason},
        ${p.effectiveDate},
        ${p.createdBy},
        ${p.pdfFileName}
      )
    `;
    console.log(`    Version ${p.version} created.`);
  }

  // ---------------------------------------------------------------------------
  // Policy links (cross-references found in the documents)
  // ---------------------------------------------------------------------------

  console.log('\nCreating policy links...');

  const linkPairs: [string, string][] = [
    // OG-POL-ITIS-001 references
    ['OG-POL-ITIS-001', 'OG-CHA-ITIS-001'],
    // OG-POL-ITIS-002 references
    ['OG-POL-ITIS-002', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-002', 'OG-POL-ITIS-003'],
    ['OG-POL-ITIS-002', 'OG-POL-ITIS-005'],
    // OG-POL-ITIS-003 references
    ['OG-POL-ITIS-003', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-004 references
    ['OG-POL-ITIS-004', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-004', 'OG-POL-ITIS-005'],
    ['OG-POL-ITIS-004', 'OG-POL-ITIS-009'],
    // OG-POL-ITIS-005 references
    ['OG-POL-ITIS-005', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-005', 'OG-POL-ITIS-004'],
    // OG-POL-ITIS-006 references
    ['OG-POL-ITIS-006', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-006', 'OG-POL-ITIS-004'],
    // OG-POL-ITIS-007 references
    ['OG-POL-ITIS-007', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-007', 'OG-POL-ITIS-002'],
    ['OG-POL-ITIS-007', 'OG-POL-ITIS-004'],
    ['OG-POL-ITIS-007', 'OG-POL-ITIS-005'],
    // OG-POL-ITIS-008 references
    ['OG-POL-ITIS-008', 'OG-CHA-ITIS-002'],
    ['OG-POL-ITIS-008', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-008', 'OG-POL-ITIS-013'],
    ['OG-POL-ITIS-008', 'OG-POL-ITIS-027'],
    ['OG-POL-ITIS-008', 'OG-POL-ITIS-028'],
    ['OG-POL-ITIS-008', 'OG-POL-ITIS-029'],
    // OG-POL-ITIS-009 references
    ['OG-POL-ITIS-009', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-010 references
    ['OG-POL-ITIS-010', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-010', 'OG-POL-ITIS-005'],
    // OG-POL-ITIS-012 references
    ['OG-POL-ITIS-012', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-013 references
    ['OG-POL-ITIS-013', 'OG-CHA-ITIS-002'],
    ['OG-POL-ITIS-013', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-013', 'OG-POL-ITIS-008'],
    ['OG-POL-ITIS-013', 'OG-POL-ITIS-012'],
    // OG-POL-ITIS-014 references
    ['OG-POL-ITIS-014', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-014', 'OG-POL-ITIS-004'],
    ['OG-POL-ITIS-014', 'OG-POL-ITIS-006'],
    ['OG-POL-ITIS-014', 'OG-POL-ITIS-010'],
    // OG-POL-ITIS-015 references
    ['OG-POL-ITIS-015', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-016 references
    ['OG-POL-ITIS-016', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-017 references
    ['OG-POL-ITIS-017', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-017', 'OG-POL-ITIS-021'],
    // OG-POL-ITIS-018 references
    ['OG-POL-ITIS-018', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-018', 'OG-POL-ITIS-005'],
    ['OG-POL-ITIS-018', 'OG-POL-ITIS-020'],
    // OG-POL-ITIS-019 references
    ['OG-POL-ITIS-019', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-019', 'OG-POL-ITIS-009'],
    // OG-POL-ITIS-020 references
    ['OG-POL-ITIS-020', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-020', 'OG-POL-ITIS-018'],
    // OG-POL-ITIS-021 references
    ['OG-POL-ITIS-021', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-022 references
    ['OG-POL-ITIS-022', 'OG-POL-ITIS-001'],
    ['OG-POL-ITIS-022', 'OG-POL-ITIS-005'],
    // OG-POL-ITIS-024 references
    ['OG-POL-ITIS-024', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-029B (Backup) references
    ['OG-POL-ITIS-029B', 'OG-POL-ITIS-001'],
    // OG-POL-ITIS-030 references
    ['OG-POL-ITIS-030', 'OG-POL-ITIS-001'],
  ];

  let linksCreated = 0;
  for (const [fromRef, toRef] of linkPairs) {
    // Look up document IDs by reference (take the first match)
    const fromRows = await sql`
      SELECT id FROM documents WHERE document_reference = ${fromRef} LIMIT 1
    `;
    const toRows = await sql`
      SELECT id FROM documents WHERE document_reference = ${toRef} LIMIT 1
    `;

    if (fromRows.length === 0 || toRows.length === 0) continue;

    const fromId = fromRows[0].id;
    const toId = toRows[0].id;

    const existingLink = await sql`
      SELECT id FROM policy_links
      WHERE from_document_id = ${fromId} AND to_document_id = ${toId}
      LIMIT 1
    `;

    if (existingLink.length === 0) {
      await sql`
        INSERT INTO policy_links (from_document_id, to_document_id, link_type)
        VALUES (${fromId}, ${toId}, 'references')
      `;
      linksCreated++;
    }
  }
  console.log(`  Created ${linksCreated} new policy links.`);

  console.log(`\nDone! Created ${created} documents, skipped ${skipped}.`);
  await sql.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await sql.end();
  process.exit(1);
});
