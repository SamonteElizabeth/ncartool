
import { AuditPlan, AuditReport, AuditStatus, NCAR, NCARStatus, Role, ActionPlan, User } from './types';

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'John Doe', role: 'LEAD_AUDITOR', dept: 'IA', email: 'john.doe@example.com', designation: 'Staff' },
  { id: '9', name: 'Head Manager', role: 'HEAD_MANAGER', dept: 'IA', email: 'head.manager@example.com', designation: 'Department Head' },
  { id: '2', name: 'Alice Smith', role: 'AUDITOR', dept: 'TSD', email: 'alice.smith@example.com', designation: 'Staff' },
  { id: '3', name: 'Bob Johnson', role: 'AUDITEE', dept: 'DISD', email: 'bob.johnson@example.com', designation: 'Manager', reportsTo: '6' },
  { id: '4', name: 'Charlie Davis', role: 'AUDITEE', dept: 'TASS', email: 'charlie.davis@example.com', designation: 'Manager', reportsTo: '7' },
  { id: '5', name: 'Dev Admin', role: 'DEV_ADMIN', dept: 'BTSG', email: 'dev.admin@example.com', designation: 'Staff' },
  { id: '6', name: 'Sarah Wilson', role: 'AUDITEE', dept: 'DISD', email: 'sarah.wilson@example.com', designation: 'Department Head' },
  { id: '7', name: 'Michael Brown', role: 'AUDITEE', dept: 'TASS', email: 'michael.brown@example.com', designation: 'Department Head' },
  { id: '8', name: 'Alex Johnson', role: 'AUDITEE', dept: 'DISD', email: 'alex.johnson@example.com', designation: 'Manager', reportsTo: '6' },
];

export const INITIAL_AUDIT_PLANS: AuditPlan[] = [
  {
    id: 'AP_000001_202310',
    startDate: '2023-10-01',
    endDate: '2023-10-05',
    auditors: ['John Doe'],
    auditees: ['Bob Johnson'],
    attachmentName: 'financial_audit_scope_v1.pdf',
    status: AuditStatus.PLANNED,
    isLocked: false,
    createdAt: new Date().toISOString(),
    auditType: 'Financial',
    processName: 'Expense Management'
  },
  {
    id: 'AP_000002_202309',
    startDate: '2023-09-15',
    endDate: '2023-09-20',
    auditors: ['Alice Smith'],
    auditees: ['Charlie Davis'],
    attachmentName: 'isms_certification_checklist.docx',
    status: AuditStatus.ACTUAL,
    isLocked: true,
    createdAt: new Date().toISOString(),
    auditType: 'Quality/InfoSec',
    processName: 'Access Control'
  },
  {
    id: 'AP_000003_202311',
    startDate: '2023-11-10',
    endDate: '2023-11-12',
    auditors: ['John Doe'],
    auditees: ['Alice Smith'],
    attachmentName: 'it_asset_management_scope.pdf',
    status: AuditStatus.CLOSED,
    isLocked: true,
    createdAt: new Date().toISOString(),
    auditType: 'Quality/InfoSec',
    processName: 'Asset Management'
  }
];

// Sample Audit Report AR-2026-HM-001: 5 NCARs + 1 OFI already approved by the Lead Auditor and waiting for
// the Head Manager to approve each one before the report can be final-approved and emailed to Executives.
const HEAD_REVIEW_REPORT_ID = 'AR-2026-HM-001';
const QMS_2026_REPORT_ID = 'AR-2026-QMS-001';
const ISMS_2026_REPORT_ID = 'AR-2026-ISMS-001';
const headReviewTrail = (id: string, auditee: string, isOFI = false, reportId = HEAD_REVIEW_REPORT_ID) => [
  { id: `trail-${id}-1`, action: 'PART1_SUBMITTED', actionLabel: 'Part 1 Submitted & Assigned', performedBy: 'John Doe', role: 'AUDITOR' as const, timestamp: '2026-10-06T01:00:00.000Z', newStatus: NCARStatus.PART1_SUBMITTED, comments: `Part 1 finding submitted via Audit Report ${reportId}.` },
  { id: `trail-${id}-2`, action: 'PART2_SUBMITTED', actionLabel: isOFI ? 'OFI Response Submitted' : 'Action Plan Submitted (CAP)', performedBy: auditee, role: 'AUDITEE' as const, timestamp: '2026-10-10T03:00:00.000Z', previousStatus: NCARStatus.PART1_SUBMITTED, newStatus: NCARStatus.ACTION_PLAN_SUBMITTED, comments: isOFI ? 'OFI accepted by the auditee.' : 'Corrective Action Plan (CAP) submitted.' },
  { id: `trail-${id}-3`, action: 'LEAD_APPROVED', actionLabel: 'Approved by Lead Auditor', performedBy: 'John Doe', role: 'LEAD_AUDITOR' as const, timestamp: '2026-10-21T02:00:00.000Z', previousStatus: NCARStatus.ACTION_PLAN_SUBMITTED, newStatus: NCARStatus.CAP_LEAD_APPROVED, comments: 'Lead Auditor approved the report package and forwarded it to the Head Manager.' }
];
const headReviewNcar = (id: string, statement: string, requirement: string, evidence: string, findingType: 'Major' | 'Minor', clause: string, dept: string, auditee: string, processName: string, reportId = HEAD_REVIEW_REPORT_ID): NCAR => ({
  id, auditPlanId: 'AP_000001_202310', statement, requirement, evidence, findingType, standardClause: clause, clauseNumber: clause,
  area: dept, auditor: 'John Doe', auditee, createdAt: '2026-10-06T01:00:00.000Z', status: NCARStatus.CAP_LEAD_APPROVED, deadline: '2026-10-13',
  auditType: 'QMS', processName, isEscalated: false, systemType: 'QMS', issueDate: '2026-10-06', processInvolved: processName,
  managerResponsible: auditee, departmentResponsible: dept, issuingAuditor: 'John Doe', createdByRole: 'AUDITOR',
  assignedByAuditReportId: reportId, assignedAt: '2026-10-06T01:00:00.000Z', responseAt: '2026-10-10T03:00:00.000Z',
  auditTrail: headReviewTrail(id, auditee, false, reportId)
});
const HEAD_REVIEW_NCARS: NCAR[] = [
  headReviewNcar('NCAR2026-HM-001', 'Customer complaints were closed without documented root cause analysis.', 'Complaint Handling Procedure, Section 6.3', 'Four of twelve sampled complaints closed in Q3 2026 had no root cause recorded.', 'Major', '10.2', 'DISD', 'Bob Johnson', 'Complaint Handling'),
  headReviewNcar('NCAR2026-HM-002', 'Training records for new hires were incomplete.', 'Competence and Training Procedure, Section 4.1', 'Three of eight new hires had no signed onboarding training record.', 'Minor', '7.2', 'DISD', 'Alex Johnson', 'Onboarding'),
  headReviewNcar('NCAR2026-HM-003', 'Calibration of measuring equipment was overdue.', 'Monitoring and Measuring Resources Procedure, Section 3.2', 'Two torque gauges were used past their calibration due date in September 2026.', 'Major', '7.1', 'TASS', 'Charlie Davis', 'Equipment Maintenance'),
  headReviewNcar('NCAR2026-HM-004', 'Obsolete document versions were in use at a workstation.', 'Document Control Procedure, Section 5.4', 'Revision 2 of the work instruction was posted while Revision 4 is current.', 'Minor', '7.5', 'TASS', 'Charlie Davis', 'Document Control'),
  headReviewNcar('NCAR2026-HM-005', 'Supplier evaluations were not performed annually.', 'Supplier Management Procedure, Section 2.3', 'Five active suppliers had no evaluation on file for 2025 or 2026.', 'Minor', '8.4', 'DISD', 'Bob Johnson', 'Purchasing'),
  {
    ...headReviewNcar('OFI2026-HM-001', 'Consider a shared dashboard for open corrective actions so department heads can track due dates.', '', 'Several CAP due dates were tracked only in personal spreadsheets.', 'Minor', '10.3', 'DISD', 'Bob Johnson', 'Corrective Action'),
    findingType: 'OFI',
    auditTrail: headReviewTrail('OFI2026-HM-001', 'Bob Johnson', true),
    ofiResponse: { status: 'Accepted', responseDate: '2026-10-10', applicable: 'Yes', correctiveActionPlan: 'Build a CAP tracking dashboard in the team site.', responsiblePerson: 'Bob Johnson', targetDate: '2026-12-15' }
  }
];
// Sample Audit Report "QMS 2026": 1 NCAR + 1 OFI waiting for Head Manager approval.
const QMS_2026_NCARS: NCAR[] = [
  headReviewNcar('NCAR2026-QMS-001', 'Internal audit findings from the previous cycle were not tracked to closure.', 'Internal Audit Procedure, Section 7.2', 'Two findings from the 2025 internal audit had no closure evidence or follow-up record.', 'Minor', '9.2', 'DISD', 'Bob Johnson', 'Internal Audit', QMS_2026_REPORT_ID),
  {
    ...headReviewNcar('OFI2026-QMS-001', 'Consider adding quality objectives progress to the monthly management meeting agenda.', '', 'Quality objectives were reviewed only during the annual management review.', 'Minor', '6.2', 'TASS', 'Charlie Davis', 'Management Review', QMS_2026_REPORT_ID),
    findingType: 'OFI',
    auditTrail: headReviewTrail('OFI2026-QMS-001', 'Charlie Davis', true, QMS_2026_REPORT_ID),
    ofiResponse: { status: 'Accepted', responseDate: '2026-10-10', applicable: 'Yes', correctiveActionPlan: 'Add a standing quality objectives item to the monthly management meeting.', responsiblePerson: 'Charlie Davis', targetDate: '2026-11-30' }
  }
];

// Sample Audit Report "ISMS 2026": 1 NCAR waiting for Head Manager approval.
const ISMS_2026_NCARS: NCAR[] = [{
  ...headReviewNcar('NCAR2026-ISMS-001', 'User access rights were not removed promptly for resigned employees.', 'Access Control Policy, Section 3.4', 'Three of ten sampled resigned employees still had active system accounts 30 days after their last working day.', 'Major', 'A.5.18', 'TASS', 'Charlie Davis', 'Access Management', ISMS_2026_REPORT_ID),
  auditType: 'ISMS',
  systemType: 'ISMS'
}];

// Sample OFI in the approved report IAR-2026-001 that the auditee marked Implemented; waiting for Lead Auditor approval.
const IMPLEMENTED_OFI: NCAR = {
  ...headReviewNcar('OFI2026-IMPL-001', 'Consider automating reminders for expense approvals pending more than three days.', '', 'Approvers relied on manual follow-ups for pending expense requests.', 'Minor', '8.1', 'DISD', 'Bob Johnson', 'Expense Management', 'AR-2026-OFI-001'),
  findingType: 'OFI',
  status: NCARStatus.CLOSED,
  auditTrail: [
    { id: 'trail-OFI2026-IMPL-001-4', action: 'OFI_IMPLEMENTATION_SUBMITTED', actionLabel: 'OFI Implementation Submitted for Approval', performedBy: 'Bob Johnson', role: 'AUDITEE', timestamp: '2026-10-22T06:00:00.000Z', comments: 'Automatic reminders are live for all approvers.' },
    ...headReviewTrail('OFI2026-IMPL-001', 'Bob Johnson', true, 'AR-2026-OFI-001')
  ],
  ofiResponse: {
    status: 'Implemented',
    responseDate: '2026-10-10',
    applicable: 'Yes',
    correctiveActionPlan: 'Configure automatic reminders in the expense system for approvals pending more than three days.',
    responsiblePerson: 'Bob Johnson',
    targetDate: '2026-10-31',
    implementationProgress: 'Automatic reminders are live for all approvers. Pending approvals over three days dropped from 14 to 2 in the first week.',
    evidenceAttachments: [{ name: 'reminder-configuration.txt', type: 'text/plain', size: 52, dataUrl: 'data:text/plain;base64,UmVtaW5kZXIgcnVsZTogcGVuZGluZyA+IDMgZGF5cyAtPiBlbWFpbCBhcHByb3Zlci4=' }],
    updatedAt: '2026-10-22T06:00:00.000Z',
    implementationReview: { stage: 'PENDING_LEAD', submittedAt: '2026-10-22T06:00:00.000Z' }
  }
};

export const ALWAYS_LOADED_DEMO_NCAR_IDS = ['NCAR2026-SLA-001', 'NCAR2026-EXEC-001', ...[...HEAD_REVIEW_NCARS, ...QMS_2026_NCARS, ...ISMS_2026_NCARS, IMPLEMENTED_OFI].map(ncar => ncar.id)];

export const INITIAL_NCARS: NCAR[] = [
  {
    id: 'NCAR_000001_202309',
    auditPlanId: 'AP_000002_202309',
    statement: 'Passwords were found written on sticky notes in the open workspace.',
    requirement: 'ISO 27001 Clause A.9.4',
    evidence: 'Physical observation at desk #42',
    findingType: 'Major',
    standardClause: '8.1',
    clauseNumber: '10.2',
    area: 'TASS',
    auditor: 'Alice Smith',
    auditee: 'Charlie Davis',
    createdAt: '2023-09-16T10:00:00Z',
    status: NCARStatus.FOR_APPROVAL,
    deadline: '2023-09-23T10:00:00Z',
    auditType: 'Quality/InfoSec',
    processName: 'Access Control',
    isEscalated: false,
    auditTrail: [
      {
        id: 'trail-001',
        action: 'PART1_SUBMITTED',
        actionLabel: 'Part 1 Submitted & Assigned',
        performedBy: 'Alice Smith',
        role: 'AUDITOR',
        timestamp: '2023-09-16T10:00:00Z',
        newStatus: NCARStatus.PART1_SUBMITTED,
        comments: 'Part 1 finding logged by auditor. 5 working-day response SLA started.'
      }
    ]
  },
  {
    id: 'NCAR_000002_202310',
    auditPlanId: 'AP_000001_202310',
    statement: 'Travel expense reports were approved without supporting receipts.',
    requirement: 'Financial Policy Section 4.2',
    evidence: 'Sample of 5 reports in July cycle',
    findingType: 'Minor',
    standardClause: '4.2',
    area: 'DISD',
    auditor: 'John Doe',
    auditee: 'Bob Johnson',
    createdAt: '2023-10-02T14:30:00Z',
    status: NCARStatus.ACTION_PLAN_SUBMITTED,
    deadline: '2023-10-09T14:30:00Z',
    auditType: 'Financial',
    processName: 'Expense Management',
    isEscalated: false,
    responseAt: '2023-10-04T09:00:00Z',
    auditTrail: [
      {
        id: 'trail-002-1',
        action: 'PART1_SUBMITTED',
        actionLabel: 'Part 1 Submitted & Assigned',
        performedBy: 'John Doe',
        role: 'LEAD_AUDITOR',
        timestamp: '2023-10-02T14:30:00Z',
        newStatus: NCARStatus.PART1_SUBMITTED,
        comments: 'Part 1 finding logged and assigned to auditee.'
      },
      {
        id: 'trail-002-2',
        action: 'PART2_SUBMITTED',
        actionLabel: 'Action Plan Submitted (CAP)',
        performedBy: 'Bob Johnson',
        role: 'AUDITEE',
        timestamp: '2023-10-04T09:00:00Z',
        previousStatus: NCARStatus.PART1_SUBMITTED,
        newStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        comments: 'Immediate correction, root cause analysis, and proposed CAP submitted for Lead Auditor review.'
      }
    ]
  },
  {
    id: 'NCAR_000003_202311',
    auditPlanId: 'AP_000003_202311',
    statement: 'The IT asset register was not updated for the last 6 months.',
    requirement: 'ISO 27001 Clause 8.1',
    evidence: 'Review of register logs vs. recent procurement invoices.',
    findingType: 'Major',
    standardClause: '8.1',
    clauseNumber: '10.2',
    area: 'TSD',
    auditor: 'John Doe',
    auditee: 'Alice Smith',
    createdAt: '2023-11-11T11:00:00Z',
    status: NCARStatus.REOPENED,
    deadline: '2023-11-18T11:00:00Z',
    rejectionRemarks: 'The proposed corrective action only addresses the backlog but does not identify the root cause of why the updates were missed initially.',
    auditType: 'Quality/InfoSec',
    processName: 'Asset Management',
    isEscalated: true,
    auditTrail: [
      {
        id: 'trail-003-1',
        action: 'PART1_SUBMITTED',
        actionLabel: 'Part 1 Submitted & Assigned',
        performedBy: 'John Doe',
        role: 'LEAD_AUDITOR',
        timestamp: '2023-11-11T11:00:00Z',
        newStatus: NCARStatus.PART1_SUBMITTED,
        comments: 'Part 1 finding logged and assigned to auditee.'
      },
      {
        id: 'trail-003-2',
        action: 'PART2_SUBMITTED',
        actionLabel: 'Action Plan Submitted (CAP)',
        performedBy: 'Alice Smith',
        role: 'AUDITEE',
        timestamp: '2023-11-14T15:00:00Z',
        previousStatus: NCARStatus.PART1_SUBMITTED,
        newStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        comments: 'Proposed corrective action plan submitted.'
      },
      {
        id: 'trail-003-3',
        action: 'LEAD_RETURNED',
        actionLabel: 'Returned for Revision by Lead Auditor',
        performedBy: 'John Doe',
        role: 'LEAD_AUDITOR',
        timestamp: '2023-11-15T10:00:00Z',
        previousStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        newStatus: NCARStatus.REOPENED,
        comments: 'The proposed corrective action only addresses the backlog but does not identify the root cause of why the updates were missed initially.'
      }
    ],
    validationStage: 'RETURNED_FOR_REVISION',
    validationSubmissions: [
      {
        id: 'vsub-003-1',
        version: 1,
        submittedAt: '2023-11-14T15:00:00Z',
        submittedBy: 'Alice Smith',
        remarks: 'Asset register spreadsheet updated with all 14 recent IT procurements and assigned custodians.',
        evidenceFiles: [
          { name: 'it_asset_register_updated_nov2023.xlsx', size: 45200, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        ],
        leadReview: {
          reviewedAt: '2023-11-15T10:00:00Z',
          reviewedBy: 'John Doe',
          role: 'LEAD_AUDITOR',
          decision: 'Returned',
          comments: 'The spreadsheet update is acknowledged, but quarterly physical verification logs and server room access audit evidence were not provided. Please attach these.'
        }
      }
    ]
  },
  {
    id: 'NCAR_000004_202312',
    auditPlanId: 'AP_000001_202310',
    statement: 'A sample approved finding is ready for corrective action planning.',
    requirement: 'Financial Policy Section 5.1',
    evidence: 'Sample review found incomplete approval notes in a submitted expense report.',
    findingType: 'Minor',
    standardClause: '5.1',
    clauseNumber: '5.1',
    area: 'DISD',
    auditor: 'John Doe',
    auditee: 'Bob Johnson',
    createdAt: '2023-12-05T09:00:00Z',
    status: NCARStatus.APPROVED,
    deadline: '2023-12-19T09:00:00Z',
    auditType: 'Financial',
    processName: 'Expense Management',
    isEscalated: false,
    systemType: 'Business',
    issueDate: '2023-12-05',
    processInvolved: 'Expense Management',
    managerResponsible: 'Bob Johnson',
    departmentResponsible: 'DISD',
    issuingAuditor: 'John Doe',
    createdByRole: 'AUDITOR',
    validationStage: 'PENDING_SUBMISSION',
    auditTrail: [
      {
        id: 'trail-004-1',
        action: 'PART1_SUBMITTED',
        actionLabel: 'Part 1 Submitted & Assigned',
        performedBy: 'John Doe',
        role: 'AUDITOR',
        timestamp: '2023-12-05T09:00:00Z',
        newStatus: NCARStatus.PART1_SUBMITTED,
        comments: 'Part 1 finding logged.'
      },
      {
        id: 'trail-004-2',
        action: 'PART2_SUBMITTED',
        actionLabel: 'Action Plan Submitted (CAP)',
        performedBy: 'Bob Johnson',
        role: 'AUDITEE',
        timestamp: '2023-12-10T11:00:00Z',
        previousStatus: NCARStatus.PART1_SUBMITTED,
        newStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        comments: 'Corrective Action Plan (CAP) submitted.'
      },
      {
        id: 'trail-004-3',
        action: 'LEAD_APPROVED',
        actionLabel: 'Approved by Lead Auditor',
        performedBy: 'John Doe',
        role: 'LEAD_AUDITOR',
        timestamp: '2023-12-12T14:00:00Z',
        previousStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        newStatus: NCARStatus.CAP_LEAD_APPROVED,
        comments: 'Lead Auditor verified and recommended for approval.'
      },
      {
        id: 'trail-004-4',
        action: 'HEAD_APPROVED',
        actionLabel: 'Final Approved by Head Manager',
        performedBy: 'Head Manager',
        role: 'HEAD_MANAGER',
        timestamp: '2023-12-15T16:00:00Z',
        previousStatus: NCARStatus.CAP_LEAD_APPROVED,
        newStatus: NCARStatus.APPROVED,
        comments: 'Approved by Head Manager.'
      }
    ]
  },
  {
    id: 'NCAR2026-SLA-001',
    auditPlanId: 'AP_000001_202310',
    statement: 'Expense approvals are not consistently completed within the department review window.',
    requirement: 'Expense Approval Procedure, Section 5.1',
    evidence: 'Audit sampling found three expense requests still awaiting manager review after the stated review period.',
    findingType: 'Minor',
    standardClause: '5.1',
    clauseNumber: '5.1',
    area: 'DISD',
    auditor: 'John Doe',
    auditee: 'Bob Johnson',
    createdAt: '2026-09-30T08:00:00.000Z',
    status: NCARStatus.PART1_SUBMITTED,
    deadline: '2026-10-08',
    auditType: 'Financial',
    processName: 'Expense Management',
    isEscalated: false,
    systemType: 'Business',
    issueDate: '2026-10-01',
    processInvolved: 'Expense Management',
    managerResponsible: 'Bob Johnson',
    departmentResponsible: 'DISD',
    issuingAuditor: 'John Doe',
    createdByRole: 'AUDITOR',
    assignedByAuditReportId: 'AR-2026-SLA-001',
    assignedAt: '2026-10-01T01:00:00.000Z',
    auditTrail: [
      {
        id: 'trail-sla-1',
        action: 'PART1_SUBMITTED',
        actionLabel: 'Part 1 Submitted & Assigned',
        performedBy: 'John Doe',
        role: 'AUDITOR',
        timestamp: '2026-10-01T01:00:00.000Z',
        newStatus: NCARStatus.PART1_SUBMITTED,
        comments: 'Part 1 finding submitted via Audit Report AR-2026-SLA-001. 5-working-day SLA initiated for Bob Johnson.'
      }
    ]
  },
  {
    id: 'OFI2026-AR-001',
    auditPlanId: 'AP_000001_202310',
    statement: 'Consider adding a quarterly review of expense approval trends to identify recurring delays and simplify the approval workflow.',
    requirement: '',
    evidence: 'Audit sampling found repeated approval delays across several expense submissions.',
    findingType: 'OFI',
    standardClause: 'Financial Policy Section 5.1',
    clauseNumber: '5.1',
    area: 'DISD',
    auditor: 'John Doe',
    auditee: 'Bob Johnson',
    createdAt: '2026-10-13T00:00:00.000Z',
    status: NCARStatus.APPROVED,
    deadline: '2026-11-15',
    auditType: 'Financial',
    processName: 'Expense Management',
    isEscalated: false,
    systemType: 'Business',
    issueDate: '2026-10-13',
    departmentResponsible: 'DISD',
    managerResponsible: 'Bob Johnson',
    issuingAuditor: 'John Doe',
    createdByRole: 'AUDITOR',
    assignedByAuditReportId: 'AR-2026-OFI-001',
    assignedAt: '2026-10-13T00:00:00.000Z',
    ofiResponse: { status: 'Pending', responseDate: '' }
  },
  {
    id: 'NCAR2026-EXEC-001',
    auditPlanId: 'AP_000001_202310',
    statement: 'Vendor payments were released without the required second-level approval.',
    requirement: 'Accounts Payable Procedure, Section 4.2',
    evidence: 'Two of ten sampled vendor payments in September 2026 had no second approver recorded in the payment system.',
    findingType: 'Minor',
    standardClause: '8.1',
    clauseNumber: '8.1',
    area: 'DISD',
    auditor: 'John Doe',
    auditee: 'Bob Johnson',
    createdAt: '2026-10-05T01:00:00.000Z',
    status: NCARStatus.CAP_LEAD_APPROVED,
    deadline: '2026-10-12',
    auditType: 'Financial',
    processName: 'Accounts Payable',
    isEscalated: false,
    systemType: 'Business',
    issueDate: '2026-10-05',
    processInvolved: 'Accounts Payable',
    managerResponsible: 'Bob Johnson',
    departmentResponsible: 'DISD',
    issuingAuditor: 'John Doe',
    createdByRole: 'AUDITOR',
    assignedByAuditReportId: 'AR-2026-EXEC-001',
    assignedAt: '2026-10-05T01:00:00.000Z',
    responseAt: '2026-10-09T03:00:00.000Z',
    auditTrail: [
      {
        id: 'trail-exec-1',
        action: 'PART1_SUBMITTED',
        actionLabel: 'Part 1 Submitted & Assigned',
        performedBy: 'John Doe',
        role: 'AUDITOR',
        timestamp: '2026-10-05T01:00:00.000Z',
        newStatus: NCARStatus.PART1_SUBMITTED,
        comments: 'Part 1 finding submitted via Audit Report AR-2026-EXEC-001.'
      },
      {
        id: 'trail-exec-2',
        action: 'PART2_SUBMITTED',
        actionLabel: 'Action Plan Submitted (CAP)',
        performedBy: 'Bob Johnson',
        role: 'AUDITEE',
        timestamp: '2026-10-09T03:00:00.000Z',
        previousStatus: NCARStatus.PART1_SUBMITTED,
        newStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        comments: 'Corrective Action Plan (CAP) submitted.'
      },
      {
        id: 'trail-exec-3',
        action: 'LEAD_APPROVED',
        actionLabel: 'Approved by Lead Auditor',
        performedBy: 'John Doe',
        role: 'LEAD_AUDITOR',
        timestamp: '2026-10-20T02:00:00.000Z',
        previousStatus: NCARStatus.ACTION_PLAN_SUBMITTED,
        newStatus: NCARStatus.CAP_LEAD_APPROVED,
        comments: 'Lead Auditor verified the CAP and forwarded it to the Head Manager for final approval.'
      }
    ]
  },
  ...HEAD_REVIEW_NCARS,
  ...QMS_2026_NCARS,
  ...ISMS_2026_NCARS,
  IMPLEMENTED_OFI
];

export const INITIAL_AUDIT_REPORTS: AuditReport[] = [{
  id: 'AR-2026-OFI-001',
  reportTitle: 'Sample Internal Audit Report — Expense Management',
  subject: 'Expense Management',
  referenceNumber: 'IAR-2026-001',
  linkedAuditPlanId: 'AP_000001_202310',
  preparedBy: 'John Doe',
  releaseDate: '2026-10-13',
  confidentiality: 'Confidential',
  objectives: '• Review expense processing and approval controls.',
  conclusion: 'Controls are operating, with an opportunity to improve approval trend monitoring.',
  ncarIds: [],
  ofiIds: ['OFI2026-AR-001', 'OFI2026-IMPL-001'],
  repeatNcarIds: [],
  clauses: [],
  workflowStep: 5,
  status: 'Approved',
  approvedBy: 'Head Manager',
  approvedAt: '2026-10-13T00:00:00.000Z',
  createdAt: '2026-10-12T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z'
}, {
  id: 'AR-2026-SLA-001',
  reportTitle: 'Sample Internal Audit Report — Expense Approval',
  subject: 'Expense Approval',
  referenceNumber: 'IAR-2026-SLA-001',
  linkedAuditPlanId: 'AP_000001_202310',
  preparedBy: 'John Doe',
  releaseDate: '2026-10-01',
  confidentiality: 'Confidential',
  objectives: '• Review the timeliness and documentation of expense approvals.',
  conclusion: 'An NCAR was issued and assigned to the responsible auditee.',
  ncarIds: ['NCAR2026-SLA-001'],
  ofiIds: [],
  repeatNcarIds: [],
  clauses: [],
  workflowStep: 5,
  status: 'Approved',
  approvedBy: 'Head Manager',
  approvedAt: '2026-10-01T01:00:00.000Z',
  createdAt: '2026-09-30T08:00:00.000Z',
  updatedAt: '2026-10-01T01:00:00.000Z'
}, {
  id: 'AR-2026-EXEC-001',
  reportTitle: 'Sample Internal Audit Report — Accounts Payable',
  subject: 'Accounts Payable',
  referenceNumber: 'IAR-2026-EXEC-001',
  linkedAuditPlanId: 'AP_000001_202310',
  preparedBy: 'John Doe',
  releaseDate: '2026-10-05',
  confidentiality: 'Confidential',
  objectives: '• Review approval controls over vendor payments.',
  conclusion: 'One NCAR was issued for payments released without second-level approval. The CAP has been reviewed by the Lead Auditor.',
  ncarIds: ['NCAR2026-EXEC-001'],
  ofiIds: [],
  repeatNcarIds: [],
  clauses: [],
  workflowStep: 5,
  status: 'Pending Final Approval',
  leadApprovedBy: 'John Doe',
  leadApprovedAt: '2026-10-20T02:00:00.000Z',
  createdAt: '2026-10-04T08:00:00.000Z',
  updatedAt: '2026-10-20T02:00:00.000Z'
}, {
  id: HEAD_REVIEW_REPORT_ID,
  reportTitle: 'Sample Internal Audit Report — Quality Management System',
  subject: 'Quality Management System',
  referenceNumber: 'IAR-2026-HM-001',
  linkedAuditPlanId: 'AP_000001_202310',
  preparedBy: 'John Doe',
  releaseDate: '2026-10-06',
  confidentiality: 'Confidential',
  objectives: '• Assess conformity of complaint handling, training, calibration, document control and supplier management.',
  conclusion: 'Five NCARs and one OFI were issued. All responses were approved by the Lead Auditor and await Head Manager approval.',
  ncarIds: HEAD_REVIEW_NCARS.filter(ncar => ncar.findingType !== 'OFI').map(ncar => ncar.id),
  ofiIds: HEAD_REVIEW_NCARS.filter(ncar => ncar.findingType === 'OFI').map(ncar => ncar.id),
  repeatNcarIds: [],
  clauses: [],
  workflowStep: 5,
  status: 'Pending Final Approval',
  leadApprovedBy: 'John Doe',
  leadApprovedAt: '2026-10-21T02:00:00.000Z',
  createdAt: '2026-10-05T08:00:00.000Z',
  updatedAt: '2026-10-21T02:00:00.000Z'
}, {
  id: QMS_2026_REPORT_ID,
  reportTitle: 'QMS 2026',
  subject: 'Quality Management System',
  referenceNumber: 'IAR-2026-QMS-001',
  linkedAuditPlanId: 'AP_000001_202310',
  preparedBy: 'John Doe',
  releaseDate: '2026-10-06',
  confidentiality: 'Confidential',
  objectives: '• Assess the effectiveness of internal audit follow-up and management review of quality objectives.',
  conclusion: 'One NCAR and one OFI were issued. Both responses were approved by the Lead Auditor and await Head Manager approval.',
  ncarIds: ['NCAR2026-QMS-001'],
  ofiIds: ['OFI2026-QMS-001'],
  repeatNcarIds: [],
  clauses: [],
  workflowStep: 5,
  status: 'Pending Final Approval',
  leadApprovedBy: 'John Doe',
  leadApprovedAt: '2026-10-21T02:00:00.000Z',
  createdAt: '2026-10-05T08:00:00.000Z',
  updatedAt: '2026-10-21T02:00:00.000Z'
}, {
  id: ISMS_2026_REPORT_ID,
  reportTitle: 'ISMS 2026',
  subject: 'Information Security Management System',
  referenceNumber: 'IAR-2026-ISMS-001',
  linkedAuditPlanId: 'AP_000001_202310',
  preparedBy: 'John Doe',
  releaseDate: '2026-10-06',
  confidentiality: 'Confidential',
  objectives: '• Assess the effectiveness of user access management controls.',
  conclusion: 'One NCAR was issued. The CAP was approved by the Lead Auditor and awaits Head Manager approval.',
  ncarIds: ['NCAR2026-ISMS-001'],
  ofiIds: [],
  repeatNcarIds: [],
  clauses: [],
  workflowStep: 5,
  status: 'Pending Final Approval',
  leadApprovedBy: 'John Doe',
  leadApprovedAt: '2026-10-21T02:00:00.000Z',
  createdAt: '2026-10-05T08:00:00.000Z',
  updatedAt: '2026-10-21T02:00:00.000Z'
}];

export const INITIAL_ACTION_PLANS: ActionPlan[] = [
  {
    id: 'ACT_000001_202310',
    ncarId: 'NCAR_000002_202310',
    immediateCorrection: 'All 5 flagged reports have been recalled and receipts provided.',
    responsiblePerson: 'Bob Johnson',
    rootCause: 'Lack of automated validation in the expense portal.',
    correctiveAction: 'Implement mandatory attachment validation.',
    dueDate: '2023-11-15',
    submittedAt: '2023-10-04T09:00:00Z',
    // Action Plan submitted and pending lead auditor approval (no completedAt)
    remarks: 'expense_receipts_bundle.pdf'
  },
  {
    id: 'ACT_000002_202311',
    ncarId: 'NCAR_000003_202311',
    immediateCorrection: 'Current asset register has been updated.',
    responsiblePerson: 'Alice Smith',
    rootCause: 'Staff turnover in the IT department.',
    correctiveAction: 'Hire more staff.',
    dueDate: '2023-12-01',
    submittedAt: '2023-11-14T15:00:00Z',
    remarks: 'it_asset_backlog_fix.xlsx'
  },
  {
    id: 'ACT_000003_202312',
    ncarId: 'NCAR_000004_202312',
    immediateCorrection: 'Recalled expense report #EXP-7712 and attached missing approval notes.',
    responsiblePerson: 'Bob Johnson',
    rootCause: 'Manual bypass of the second-level signature workflow during peak cycle.',
    correctiveAction: 'Enforce two-stage digital signature gate prior to disbursement.',
    dueDate: '2023-12-30',
    submittedAt: '2023-12-10T11:00:00Z',
    remarks: 'expense_approval_process_update.pdf'
  },
  {
    id: 'ACT2026-EXEC-001',
    ncarId: 'NCAR2026-EXEC-001',
    immediateCorrection: 'Both payments were reviewed and approved retroactively by the Finance Manager.',
    responsiblePerson: 'Bob Johnson',
    rootCause: 'The payment system allowed release with a single approver when the second approver was on leave.',
    correctiveAction: 'Configure the payment system to block release until two approvers sign off, and assign a backup approver.',
    dueDate: '2026-11-30',
    submittedAt: '2026-10-09T03:00:00.000Z',
    responseDate: '2026-10-09',
    consequenceImpact: 'Risk of unauthorized or erroneous vendor payments.',
    correctionResponsible: 'Bob Johnson',
    correctionTargetDate: '2026-10-15',
    canOccurElsewhere: 'No',
    capResponsible: 'Bob Johnson',
    capTargetDate: '2026-11-30'
  },
  ...[...HEAD_REVIEW_NCARS, ...QMS_2026_NCARS, ...ISMS_2026_NCARS].filter(ncar => ncar.findingType !== 'OFI').map((ncar): ActionPlan => ({
    id: ncar.id.replace('NCAR', 'ACT'),
    ncarId: ncar.id,
    immediateCorrection: `Contained the issue in ${ncar.processName} and corrected the affected records.`,
    responsiblePerson: ncar.auditee,
    rootCause: 'The procedure step was not built into the team checklist, so it depended on individual memory.',
    correctiveAction: 'Add the step to the checklist, brief the team, and include it in the monthly self-check.',
    dueDate: '2026-11-30',
    submittedAt: '2026-10-10T03:00:00.000Z',
    responseDate: '2026-10-10',
    correctionResponsible: ncar.auditee,
    correctionTargetDate: '2026-10-20',
    canOccurElsewhere: 'No',
    capResponsible: ncar.auditee,
    capTargetDate: '2026-11-30'
  }))
];
