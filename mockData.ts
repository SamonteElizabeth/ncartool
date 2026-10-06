
import { AuditPlan, AuditStatus, NCAR, NCARStatus, Role, ActionPlan, User } from './types';

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'John Doe', role: 'LEAD_AUDITOR', dept: 'IA', email: 'john.doe@example.com', designation: 'Staff' },
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
    status: NCARStatus.PENDING,
    deadline: '2023-09-23T10:00:00Z',
    auditType: 'Quality/InfoSec',
    processName: 'Access Control',
    isEscalated: false
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
      status: NCARStatus.FOR_APPROVAL,
    deadline: '2023-10-09T14:30:00Z',
    auditType: 'Financial',
    processName: 'Expense Management',
    isEscalated: false,
    responseAt: '2023-10-04T09:00:00Z'
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
    isEscalated: true
  }
];

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
  }
];
