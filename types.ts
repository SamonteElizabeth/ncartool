
export type Role = 'LEAD_AUDITOR' | 'HEAD_MANAGER' | 'AUDITOR' | 'AUDITEE' | 'GUEST' | 'DEV_ADMIN';

export type AuditType = 'QMS' | 'ISMS' | 'Quality/InfoSec' | 'Financial' | 'Special Request';

export type Designation = 'Manager' | 'Assistant Manager' | 'Supervisor' | 'Department Head' | 'Staff';

export enum AuditStatus {
  DRAFT = 'Draft',
  PLANNED = 'Planned',
  ACTUAL = 'Actual Audit',
  CLOSED = 'Closed'
}

export enum NCARStatus {
  DRAFT = 'Draft',
  PART1_SUBMITTED = 'Part 1 Submitted',
  PENDING = 'Pending',
  FOR_APPROVAL = 'For Approval',
  LEAD_APPROVED = 'Lead Auditor Approved',
  APPROVED = 'Approved',
  ACTION_PLAN_SUBMITTED = 'Action Plan Submitted',
  CAP_LEAD_APPROVED = 'CAP Approved by Lead Auditor',
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
  evidenceAttachments?: { name: string; type: string; size: number; dataUrl: string }[];
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
  escalationStatus?: 'Successfully Escalated to EEM';
  escalatedAt?: string;
  escalatedBy?: string;
  responseAt?: string; // When the action plan was first submitted
  systemType?: 'QMS/ISMS' | 'QMS' | 'ISMS' | 'Business';
  issueDate?: string;
  processInvolved?: string;
  managerResponsible?: string;
  departmentResponsible?: string;
  issuingAuditor?: string;
  createdByRole?: Role;
  assignedByAuditReportId?: string;
  assignedAt?: string;
  responseSla?: {
    startedAt: string;
    dueDate: string;
    status: 'On Track' | 'Due Soon' | 'Overdue' | 'Submitted';
    notificationHistory: { type: 'due-soon' | 'overdue'; notifiedAt: string }[];
  };
  auditTrail?: NCARAuditTrailEntry[];
  ofiResponse?: OFIResponse;
}

export interface NCARAuditTrailEntry {
  id: string;
  action: 'PART1_SUBMITTED' | 'PART2_SUBMITTED' | 'LEAD_APPROVED' | 'LEAD_RETURNED' | 'HEAD_APPROVED' | 'HEAD_REJECTED' | 'DRAFT_SAVED' | 'ESCALATED' | 'COMMENT_ADDED';
  actionLabel: string;
  performedBy: string;
  role: Role;
  timestamp: string;
  comments?: string;
  previousStatus?: NCARStatus | string;
  newStatus?: NCARStatus | string;
}

export type OFIResponseStatus = 'Pending' | 'Accepted' | 'Rejected' | 'In Progress' | 'Implemented';

export interface OFIResponse {
  status: OFIResponseStatus;
  responseDate: string;
  applicable?: 'Yes' | 'No';
  correctiveActionPlan?: string;
  responsiblePerson?: string;
  targetDate?: string;
  notes?: string;
  implementationProgress?: string;
  evidenceAttachments?: { name: string; type: string; size: number; dataUrl: string }[];
  updatedAt?: string;
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
  responseDate?: string;
  consequenceImpact?: string;
  correctionResponsible?: string;
  correctionAdditionalAuditeeResponsible?: string;
  correctionTargetDate?: string;
  canOccurElsewhere?: 'Yes' | 'No';
  elsewhereDetails?: string;
  capResponsible?: string;
  additionalAuditeeResponsible?: string;
  capTargetDate?: string;
  isDraft?: boolean;
}

export type AuditReportStatus = 'Draft' | 'Awaiting Auditee Responses' | 'Pending Lead Review' | 'Pending Final Approval' | 'Pending Approval' | 'Approved' | 'Rejected';

export interface AuditReportClause {
  id: string;
  clause: string;
  highlights: string;
  lowlights: string;
  ncarIds: string[];
  ofiIds: string[];
}

export interface AuditReport {
  id: string;
  reportTitle: string;
  subject: string;
  referenceNumber: string;
  linkedAuditPlanId: string;
  preparedBy: string;
  releaseDate: string;
  confidentiality: string;
  objectives: string;
  conclusion: string;
  ncarIds: string[];
  ofiIds: string[];
  repeatNcarIds: string[];
  clauses: AuditReportClause[];
  workflowStep?: number;
  resultsGeneratedAt?: string;
  status: AuditReportStatus;
  approvedBy?: string;
  approvedAt?: string;
  leadApprovedBy?: string;
  leadApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
  read?: boolean;
  recipientName?: string;
  relatedRecordId?: string;
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
