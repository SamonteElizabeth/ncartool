
export type Role = 'LEAD_AUDITOR' | 'AUDITOR' | 'AUDITEE' | 'DEV_ADMIN';

export type AuditType = 'Quality/InfoSec' | 'Financial' | 'Special Request';

export type Designation = 'Manager' | 'Assistant Manager' | 'Supervisor' | 'Department Head' | 'Staff';

export enum AuditStatus {
  DRAFT = 'Draft',
  PLANNED = 'Planned',
  ACTUAL = 'Actual Audit',
  CLOSED = 'Closed'
}

export enum NCARStatus {
  PENDING = 'Pending',
  FOR_APPROVAL = 'For Approval',
  ACTION_PLAN_SUBMITTED = 'Action Plan Submitted',
  REJECTED = 'Rejected',
  VALIDATED = 'Validated',
  CLOSED = 'Closed',
  REOPENED = 'Reopened'
}

export interface AuditPlan {
  id: string;
  startDate: string;
  endDate: string;
  auditors: string[];
  auditees: string[];
  attachmentName?: string;
  status: AuditStatus;
  isLocked: boolean;
  createdAt: string;
  auditType: AuditType;
  processName: string;
}

export interface NCAR {
  id: string;
  auditPlanId: string;
  statement: string;
  requirement: string;
  evidence: string;
  findingType: 'Major' | 'Minor' | 'OFI';
  standardClause: string;
  clauseNumber?: string; // Required for QIS
  area: string;
  auditor: string;
  auditee: string;
  createdAt: string;
  status: NCARStatus;
  deadline: string;
  attachmentName?: string;
  rejectionRemarks?: string;
  auditType: AuditType;
  processName: string;
  isEscalated: boolean;
  responseAt?: string; // When the action plan was first submitted
}

export interface ActionPlan {
  id: string;
  ncarId: string;
  immediateCorrection: string;
  responsiblePerson: string;
  rootCause: string;
  correctiveAction: string;
  dueDate: string;
  submittedAt: string;
  completedAt?: string; // For tracking implementation timeliness
  remarks?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  dept: string;
  email: string;
  designation: Designation;
  reportsTo?: string; // User ID of superior
}
