import { AuditReport, NCAR, NCARAuditTrailEntry, NCARStatus, Role } from '../types';

// APPROVED alone can also mean "Part 1 approved", so it only counts when the Head Manager approved it after Lead Auditor review.
export const isHeadManagerApproved = (finding: NCAR): boolean =>
  finding.status === NCARStatus.CLOSED || finding.status === NCARStatus.VALIDATED ||
  (finding.status === NCARStatus.APPROVED && (finding.auditTrail || []).some(entry => entry.action === 'HEAD_APPROVED' && entry.previousStatus === NCARStatus.CAP_LEAD_APPROVED));

export const headApprovalTrailEntry = (findingId: string, approver: string, role: Role, comments: string): NCARAuditTrailEntry => ({
  id: `trail-${findingId}-${Date.now()}`,
  action: 'HEAD_APPROVED',
  actionLabel: 'Final Approved by Head Manager',
  performedBy: approver,
  role,
  timestamp: new Date().toISOString(),
  comments,
  previousStatus: NCARStatus.CAP_LEAD_APPROVED,
  newStatus: NCARStatus.APPROVED
});

export const reportFindingIds = (report: AuditReport) => [...new Set([...report.ncarIds, ...report.ofiIds])];

// The report waiting for Head Manager final approval that contains this finding, if any.
export const findPendingFinalReport = (reports: AuditReport[], findingId: string) =>
  reports.find(report => report.status === 'Pending Final Approval' && reportFindingIds(report).includes(findingId));

// True when every other finding in the report is already approved, so approving this one completes the report.
export const isLastFindingAwaitingHeadApproval = (report: AuditReport, ncars: NCAR[], findingId: string) =>
  reportFindingIds(report).every(id => {
    if (id === findingId) return true;
    const finding = ncars.find(ncar => ncar.id === id);
    return Boolean(finding && isHeadManagerApproved(finding));
  });

export const fullReportFileName = (report: AuditReport) => `${report.referenceNumber || report.id || 'audit-report'}-Full-Audit-Report.csv`;

// Simulated send: no mail server yet, so the email is recorded on the report with the full-report CSV as its attachment.
export const finalApproveReport = (report: AuditReport, approver: string, executiveRecipients: string[]): AuditReport => {
  const approvedAt = new Date().toISOString();
  const approvedReport: AuditReport = { ...report, status: 'Approved', approvedBy: approver, approvedAt, updatedAt: approvedAt };
  return executiveRecipients.length
    ? { ...approvedReport, executiveEmail: { recipients: [...executiveRecipients], sentAt: approvedAt, sentBy: approver, attachmentName: fullReportFileName(approvedReport) } }
    : approvedReport;
};
