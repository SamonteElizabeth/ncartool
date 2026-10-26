import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuditReport, NCAR, NCARStatus, Role, ActionPlan, User as UserRecord, NCARAuditTrailEntry } from '../types';
import { findPendingFinalReport, isLastFindingAwaitingHeadApproval } from '../utils/auditReportApproval';
import ExecutiveSendPrompt from './ExecutiveSendPrompt';
import { 
  getConfiguredPhilippineHolidays, 
  getResponseSlaStatus, 
  hasSubmittedNCARResponse, 
  makeResponseSla,
  getWorkingDaysCountdown
} from '../utils/ncarSla';
import { 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  X, 
  Check, 
  Edit3, 
  ScanEye,
  Eye,
  ArrowRight,
  Send,
  AlertCircle,
  Clock,
  Clock3,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Trash2,
  ClipboardList,
  CircleCheck,
  CircleX,
  History,
  RotateCcw,
  CheckSquare
} from 'lucide-react';

interface NCARModuleProps {
  ncars: NCAR[];
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  actionPlans: ActionPlan[];
  setActionPlans: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  role: Role;
  users: UserRecord[];
  issuingAuditor: string;
  reports: AuditReport[];
  executiveRecipients: string[];
  onFinalApproveReport: (reportId: string) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning') => void;
  setActiveModule?: (module: string) => void;
}

const FINDING_AREAS = [
  'DISD', 'TSD', 'TASS', 'IA', 'MSP', 'CSS', 'DCFI', 'BTSG', 'EEM'
];

const NCARModule: React.FC<NCARModuleProps> = ({ 
  ncars, 
  setNcars, 
  actionPlans, 
  setActionPlans, 
  role, 
  users,
  issuingAuditor,
  reports,
  executiveRecipients,
  onFinalApproveReport,
  onNotify
}) => {
  const [showForm, setShowForm] = useState(false);
  const [viewingNCAR, setViewingNCAR] = useState<NCAR | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'part1' | 'part2' | 'history'>('part1');
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Rejection / Revision modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [rejectionActionType, setRejectionActionType] = useState<'LEAD_RETURN' | 'HEAD_REJECT'>('LEAD_RETURN');

  // Approval modal (for optional comments)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalActionType, setApprovalActionType] = useState<'LEAD_APPROVE' | 'HEAD_APPROVE'>('LEAD_APPROVE');
  // Audit Report whose last pending finding was just approved; drives the "send to Executive?" prompt.
  const [sendPromptReport, setSendPromptReport] = useState<AuditReport | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [dismissOverdueBanner, setDismissOverdueBanner] = useState(false);

  const isAuditee = role === 'AUDITEE';
  const isLead = role === 'LEAD_AUDITOR';
  const isHeadManager = role === 'HEAD_MANAGER';
  const isAuditor = role === 'AUDITOR';

  // State checks for viewing NCAR
  const isPendingPart2 = (ncar: NCAR) => {
    const plan = actionPlans.find(actionPlan => actionPlan.ncarId === ncar.id);
    const readyForPart2 = [NCARStatus.PART1_SUBMITTED, NCARStatus.REOPENED, NCARStatus.REJECTED].includes(ncar.status);
    return readyForPart2 && (!plan || plan.isDraft === true);
  };

  const canEditPart1 = Boolean(
    (!viewingNCAR || viewingNCAR.status === NCARStatus.DRAFT) && (role === 'AUDITOR' || role === 'LEAD_AUDITOR')
  );

  const canEditPart2 = Boolean(
    isAuditee && viewingNCAR && [
      NCARStatus.PART1_SUBMITTED,
      NCARStatus.REOPENED,
      NCARStatus.REJECTED,
      NCARStatus.APPROVED
    ].includes(viewingNCAR.status)
  );

  // Review states
  const isLeadReviewEligible = isLead && Boolean(
    viewingNCAR && (
      viewingNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED ||
      (viewingNCAR.createdByRole !== 'LEAD_AUDITOR' && viewingNCAR.status === NCARStatus.FOR_APPROVAL)
    )
  );

  const isHeadManagerReviewEligible = isHeadManager && Boolean(
    viewingNCAR && (
      viewingNCAR.status === NCARStatus.CAP_LEAD_APPROVED ||
      (viewingNCAR.createdByRole === 'LEAD_AUDITOR' && viewingNCAR.status === NCARStatus.FOR_APPROVAL)
    )
  );

  const getToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getInitialDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getInitialResponseDueDate = (issueDate = getToday()) => {
    if (!issueDate) return '';
    const [year, month, day] = issueDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return '';
    let weekdaysAdded = 0;
    while (weekdaysAdded < 5) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) weekdaysAdded += 1;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const initialFormData = {
    type: 'Major' as 'Major' | 'Minor' | 'OFI',
    systemType: 'QMS' as 'QMS/ISMS' | 'QMS' | 'ISMS' | 'Business',
    requirement: '',
    clause: '',
    statement: '',
    evidence: '',
    managerResponsible: '',
    departmentResponsible: '',
    issueDate: getToday(),
    dueDate: getInitialResponseDueDate(),
    processName: '',
    issuingAuditor: issuingAuditor || 'Auditor'
  };

  const [formData, setFormData] = useState(initialFormData);

  const initialApFormData = {
    correction: '',
    rootCause: '',
    actionPlan: '',
    responsible: '',
    correctionResponsible: '',
    correctionAdditionalAuditeeResponsible: '',
    dueDate: getInitialDueDate(),
    correctionTargetDate: '',
    responseDate: getToday(),
    consequenceImpact: '',
    canOccurElsewhere: 'No' as 'Yes' | 'No',
    elsewhereDetails: '',
    capTargetDate: '',
    additionalAuditeeResponsible: '',
    attachmentName: ''
  };

  const [apFormData, setApFormData] = useState(initialApFormData);

  const getGeneratedNCARNumber = (systemType = formData.systemType, issueDate = formData.issueDate) => {
    const year = issueDate ? issueDate.slice(0, 4) : String(new Date().getFullYear());
    const typeCode = systemType === 'Business' ? 'BUS' : 'QIS';
    const prefix = `NCAR${year}-${typeCode}-01-N`;
    const existingNumbers = ncars
      .filter(ncar => ncar.id.startsWith(prefix))
      .map(ncar => Number(ncar.id.slice(prefix.length)))
      .filter(Number.isFinite);
    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    return `${prefix}${String(nextNumber).padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!viewingNCAR) return;
    const latest = ncars.find(ncar => ncar.id === viewingNCAR.id);
    if (latest && latest !== viewingNCAR) setViewingNCAR(latest);
  }, [ncars, viewingNCAR?.id]);

  const handleAction = (ncar: NCAR) => {
    setViewingNCAR(ncar);
    setFormData({
      type: ncar.findingType,
      systemType: ncar.systemType || (ncar.auditType === 'Financial' ? 'Business' : 'QMS/ISMS'),
      requirement: ncar.requirement,
      clause: ncar.clauseNumber || ncar.standardClause || '',
      statement: ncar.statement,
      evidence: ncar.evidence,
      managerResponsible: ncar.managerResponsible || ncar.auditee || '',
      departmentResponsible: ncar.departmentResponsible || ncar.area || '',
      dueDate: ncar.deadline.split('T')[0],
      issueDate: ncar.issueDate || ncar.createdAt.split('T')[0],
      processName: ncar.processInvolved || ncar.processName,
      issuingAuditor: ncar.issuingAuditor || ncar.auditor
    });

    const existingAp = actionPlans.find(ap => ap.ncarId === ncar.id);
    if (existingAp) {
      setApFormData({
        correction: existingAp.immediateCorrection,
        rootCause: existingAp.rootCause,
        actionPlan: existingAp.correctiveAction,
        responsible: existingAp.capResponsible || existingAp.responsiblePerson,
        correctionResponsible: existingAp.correctionResponsible || '',
        correctionAdditionalAuditeeResponsible: existingAp.correctionAdditionalAuditeeResponsible || '',
        dueDate: existingAp.capTargetDate || existingAp.dueDate,
        correctionTargetDate: existingAp.correctionTargetDate || '',
        responseDate: existingAp.responseDate || getToday(),
        consequenceImpact: existingAp.consequenceImpact || '',
        canOccurElsewhere: existingAp.canOccurElsewhere || 'No',
        elsewhereDetails: existingAp.elsewhereDetails || '',
        capTargetDate: existingAp.capTargetDate || '',
        additionalAuditeeResponsible: existingAp.additionalAuditeeResponsible || '',
        attachmentName: existingAp.remarks || ''
      });
    } else {
      setApFormData({
        ...initialApFormData,
        responsible: ncar.managerResponsible || ncar.auditee || '',
        correctionResponsible: ncar.managerResponsible || ncar.auditee || ''
      });
    }

    if (isAuditee && (ncar.status === NCARStatus.PART1_SUBMITTED || ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED)) {
      setActiveModalTab('part2');
    } else if (ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED) {
      setActiveModalTab('part2');
    } else {
      setActiveModalTab('part1');
    }

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setViewingNCAR(null);
    setFormData(initialFormData);
    setApFormData(initialApFormData);
    setActiveModalTab('part1');
  };

  const handleDelete = (ncar: NCAR) => {
    if (isAuditee || !window.confirm(`Delete NCAR ${ncar.id} and its linked action plan? This action cannot be undone.`)) return;
    setNcars(prev => prev.filter(item => item.id !== ncar.id));
    setActionPlans(prev => prev.filter(plan => plan.ncarId !== ncar.id));
    onNotify(`NCAR ${ncar.id} and its linked action plan deleted.`, 'success');
  };

  const handleEscalate = (ncar: NCAR) => {
    if (role !== 'LEAD_AUDITOR' || getResponseSlaStatus(ncar) !== 'Overdue' || ncar.isEscalated) return;
    const escalatedAt = new Date().toISOString();
    const leadAuditor = issuingAuditor.trim() || 'Lead Auditor';
    
    const trailEntry: NCARAuditTrailEntry = {
      id: `trail-${Date.now()}`,
      action: 'ESCALATED',
      actionLabel: 'Escalated to Executive Management (EEM)',
      performedBy: leadAuditor,
      role: 'LEAD_AUDITOR',
      timestamp: escalatedAt,
      previousStatus: ncar.status,
      newStatus: ncar.status,
      comments: 'Overdue NCAR escalated to EEM for tracking and resolution follow-up.'
    };

    setNcars(current => current.map(item => item.id === ncar.id ? {
      ...item,
      isEscalated: true,
      escalationStatus: 'Successfully Escalated to EEM',
      escalatedAt,
      escalatedBy: leadAuditor,
      auditTrail: [trailEntry, ...(item.auditTrail || [])]
    } : item));
    onNotify(`NCAR ${ncar.id} successfully escalated to EEM for tracking by ${leadAuditor}.`, 'success');
  };

  const createTrailEntry = (
    action: NCARAuditTrailEntry['action'],
    actionLabel: string,
    comments?: string,
    previousStatus?: NCARStatus | string,
    newStatus?: NCARStatus | string
  ): NCARAuditTrailEntry => ({
    id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    actionLabel,
    performedBy: issuingAuditor || 'System User',
    role,
    timestamp: new Date().toISOString(),
    comments: comments?.trim() || undefined,
    previousStatus,
    newStatus
  });

  // Save / Submit Part 1 by Auditor
  const saveNCARPart1 = (isSubmitting: boolean) => {
    if (!canEditPart1) return;
    const now = new Date();
    const holidays = getConfiguredPhilippineHolidays();
    const ncarNumber = viewingNCAR?.id || getGeneratedNCARNumber();

    const newStatus = isSubmitting ? NCARStatus.PART1_SUBMITTED : NCARStatus.DRAFT;
    const assignedAt = isSubmitting ? (viewingNCAR?.assignedAt || now.toISOString()) : undefined;
    const responseSla = assignedAt ? makeResponseSla(assignedAt, holidays) : undefined;
    const deadlineDate = responseSla ? responseSla.dueDate : formData.dueDate;

    const trailEntry = createTrailEntry(
      isSubmitting ? 'PART1_SUBMITTED' : 'DRAFT_SAVED',
      isSubmitting ? 'Part 1 Submitted & Assigned' : 'Draft Saved',
      isSubmitting ? `Auditor completed and submitted Part 1. 5-working-day Corrective Action Plan (CAP) SLA initiated for ${formData.managerResponsible || 'auditee'}.` : 'NCAR draft saved by auditor.',
      viewingNCAR?.status || NCARStatus.DRAFT,
      newStatus
    );

    if (viewingNCAR) {
      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: newStatus,
        statement: formData.statement,
        requirement: formData.requirement,
        evidence: formData.evidence,
        findingType: formData.type,
        standardClause: formData.clause,
        clauseNumber: formData.clause,
        systemType: formData.systemType,
        issueDate: formData.issueDate,
        processInvolved: formData.processName,
        managerResponsible: formData.managerResponsible,
        departmentResponsible: formData.departmentResponsible,
        issuingAuditor: formData.issuingAuditor,
        area: formData.departmentResponsible,
        auditee: formData.managerResponsible,
        auditor: formData.issuingAuditor,
        deadline: deadlineDate,
        processName: formData.processName,
        ...(assignedAt ? { assignedAt } : {}),
        ...(responseSla ? { responseSla } : {}),
        auditTrail: [trailEntry, ...(n.auditTrail || [])],
        rejectionRemarks: isSubmitting ? undefined : n.rejectionRemarks
      } : n));
    } else {
      const newNCAR: NCAR = {
        id: ncarNumber,
        auditPlanId: 'AP_UNKNOWN',
        statement: formData.statement,
        requirement: formData.requirement,
        evidence: formData.evidence,
        findingType: formData.type,
        standardClause: formData.clause,
        clauseNumber: formData.clause,
        area: formData.departmentResponsible,
        auditor: formData.issuingAuditor,
        auditee: formData.managerResponsible,
        createdAt: now.toISOString(),
        status: newStatus,
        deadline: deadlineDate,
        auditType: formData.systemType === 'Business' ? 'Financial' : 'Quality/InfoSec',
        processName: formData.processName,
        isEscalated: false,
        systemType: formData.systemType,
        issueDate: formData.issueDate,
        processInvolved: formData.processName,
        managerResponsible: formData.managerResponsible,
        departmentResponsible: formData.departmentResponsible,
        issuingAuditor: formData.issuingAuditor,
        createdByRole: role,
        ...(assignedAt ? { assignedAt } : {}),
        ...(responseSla ? { responseSla } : {}),
        auditTrail: [trailEntry]
      };
      setNcars(prev => [newNCAR, ...prev]);
    }

    onNotify(
      isSubmitting 
        ? `NCAR ${ncarNumber} Part 1 submitted. The 5-working-day Corrective Action Plan (CAP) response period has started.` 
        : `NCAR ${ncarNumber} draft saved successfully.`,
      'success'
    );
    closeForm();
  };

  // Save / Submit Part 2 by Auditee
  const saveActionPlanPart2 = (isDraft: boolean) => {
    if (!viewingNCAR) return;

    if (!isDraft) {
      const missingFields = [
        ['Response Date', apFormData.responseDate],
        ['Consequence / Impact', apFormData.consequenceImpact],
        ['Immediate Correction (IC)', apFormData.correction],
        ['Correction Responsible Person', apFormData.correctionResponsible],
        ['Correction Target Date', apFormData.correctionTargetDate],
        ['Root Cause Analysis (RCA)', apFormData.rootCause],
        ['Proposed Corrective Action Plan (CAP)', apFormData.actionPlan],
        ['CAP Responsible Person', apFormData.responsible],
        ['CAP Target Date', apFormData.capTargetDate]
      ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);

      if (apFormData.canOccurElsewhere === 'Yes' && !apFormData.elsewhereDetails.trim()) {
        missingFields.push('Details on occurrence elsewhere');
      }

      if (missingFields.length) {
        onNotify(`Please complete required Part 2 fields: ${missingFields.join(', ')}.`, 'warning');
        return;
      }
    }

    const additionalAuditee = apFormData.additionalAuditeeResponsible.trim();
    const correctionAdditionalAuditee = apFormData.correctionAdditionalAuditeeResponsible.trim();
    const isAuditeeUser = (name: string) => users.some(u => u.role === 'AUDITEE' && u.name.toLowerCase() === name.toLowerCase());

    if ((additionalAuditee && !isAuditeeUser(additionalAuditee)) || (correctionAdditionalAuditee && !isAuditeeUser(correctionAdditionalAuditee))) {
      onNotify('Please select an existing user with the Auditee role for each additional responsible person.', 'warning');
      return;
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existingPlan = actionPlans.find(ap => ap.ncarId === viewingNCAR.id);

    const newAP: ActionPlan = {
      id: existingPlan?.id || `ACT_${String(actionPlans.length + 1).padStart(6, '0')}_${timestamp}`,
      ncarId: viewingNCAR.id,
      immediateCorrection: apFormData.correction,
      responsiblePerson: apFormData.responsible,
      rootCause: apFormData.rootCause,
      correctiveAction: apFormData.actionPlan,
      dueDate: apFormData.capTargetDate,
      submittedAt: isDraft ? (existingPlan?.submittedAt || now.toISOString()) : now.toISOString(),
      remarks: apFormData.attachmentName,
      responseDate: apFormData.responseDate,
      consequenceImpact: apFormData.consequenceImpact,
      correctionResponsible: apFormData.correctionResponsible,
      correctionAdditionalAuditeeResponsible: correctionAdditionalAuditee,
      correctionTargetDate: apFormData.correctionTargetDate,
      canOccurElsewhere: apFormData.canOccurElsewhere,
      elsewhereDetails: apFormData.elsewhereDetails,
      capResponsible: apFormData.responsible,
      additionalAuditeeResponsible: additionalAuditee,
      capTargetDate: apFormData.capTargetDate,
      isDraft
    };

    setActionPlans(prev => [...prev.filter(ap => ap.ncarId !== viewingNCAR.id), newAP]);

    if (!isDraft) {
      const trailEntry = createTrailEntry(
        'PART2_SUBMITTED',
        'Corrective Action Plan Submitted (IC, RCA & CAP)',
        'Auditee submitted complete Corrective Action Plan (CAP) including Immediate Correction, Root Cause Analysis, and proposed Action Plan for Lead Auditor review.',
        viewingNCAR.status,
        NCARStatus.ACTION_PLAN_SUBMITTED
      );

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.ACTION_PLAN_SUBMITTED,
        responseAt: now.toISOString(),
        responseSla: n.responseSla ? { ...n.responseSla, status: 'Submitted' } : undefined,
        auditTrail: [trailEntry, ...(n.auditTrail || [])],
        rejectionRemarks: undefined
      } : n));

      onNotify(`Corrective Action Plan (CAP) for NCAR ${viewingNCAR.id} submitted successfully. Now pending Lead Auditor review.`, 'success');
    } else {
      onNotify(`Corrective Action Plan (CAP) draft for NCAR ${viewingNCAR.id} saved as a draft.`, 'success');
    }

    closeForm();
  };

  const initiateReject = (type: 'LEAD_RETURN' | 'HEAD_REJECT') => {
    setRejectionActionType(type);
    setRejectionRemarks('');
    setShowRejectModal(true);
  };

  const finalizeRejection = () => {
    if (!viewingNCAR || !rejectionRemarks.trim()) return;

    if (rejectionActionType === 'LEAD_RETURN') {
      const trailEntry = createTrailEntry(
        'LEAD_RETURNED',
        'Returned for Revision by Lead Auditor',
        rejectionRemarks.trim(),
        viewingNCAR.status,
        NCARStatus.REOPENED
      );

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.REOPENED,
        rejectionRemarks: rejectionRemarks.trim(),
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} returned for revision by Lead Auditor with comments.`, 'warning');
    } else {
      const trailEntry = createTrailEntry(
        'HEAD_REJECTED',
        'Rejected by Head Manager',
        rejectionRemarks.trim(),
        viewingNCAR.status,
        NCARStatus.REJECTED
      );

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.REJECTED,
        rejectionRemarks: rejectionRemarks.trim(),
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} rejected by Head Manager and returned for correction.`, 'warning');
    }

    setShowRejectModal(false);
    setRejectionRemarks('');
    closeForm();
  };

  const initiateApprove = (type: 'LEAD_APPROVE' | 'HEAD_APPROVE') => {
    setApprovalActionType(type);
    setApprovalComments('');
    setShowApproveModal(true);
  };

  const finalizeApproval = () => {
    if (!viewingNCAR) return;

    if (approvalActionType === 'LEAD_APPROVE') {
      const trailEntry = createTrailEntry(
        'LEAD_APPROVED',
        'Approved by Lead Auditor',
        approvalComments.trim() || 'Lead Auditor reviewed and approved the complete NCAR response (Part 1 and Corrective Action Plan). Forwarded to Head Manager.',
        viewingNCAR.status,
        NCARStatus.CAP_LEAD_APPROVED
      );

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.CAP_LEAD_APPROVED,
        rejectionRemarks: undefined,
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} approved by Lead Auditor and forwarded to Head Manager for final review.`, 'success');
    } else {
      const trailEntry = createTrailEntry(
        'HEAD_APPROVED',
        'Final Approved by Head Manager',
        approvalComments.trim() || 'Head Manager granted final approval for NCAR and corrective action plan.',
        viewingNCAR.status,
        NCARStatus.APPROVED
      );

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.APPROVED,
        isEscalated: false,
        escalationStatus: undefined,
        rejectionRemarks: undefined,
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} received final approval from Head Manager.`, 'success');
      const pendingReport = viewingNCAR.status === NCARStatus.CAP_LEAD_APPROVED ? findPendingFinalReport(reports, viewingNCAR.id) : undefined;
      if (pendingReport && isLastFindingAwaitingHeadApproval(pendingReport, ncars, viewingNCAR.id)) setSendPromptReport(pendingReport);
    }

    setShowApproveModal(false);
    setApprovalComments('');
    closeForm();
  };

  const ncarFindings = useMemo(() => ncars.filter(ncar => ncar.findingType !== 'OFI'), [ncars]);
  
  const overdueNCARs = useMemo(() => {
    return ncarFindings.filter(ncar => getResponseSlaStatus(ncar) === 'Overdue');
  }, [ncarFindings]);

  const filteredNCARs = useMemo(() => {
    return ncarFindings.filter(ncar => {
      if (isAuditee && (ncar.managerResponsible || ncar.auditee || '').toLowerCase() !== issuingAuditor.toLowerCase()) {
        return false;
      }
      const responsible = actionPlans.find(a => a.ncarId === ncar.id)?.responsiblePerson || ncar.auditee || '';
      const matchesSearch = ncar.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ncar.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ncar.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ncar.auditType && ncar.auditType.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (ncar.processName && ncar.processName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            responsible.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = statusFilter === 'All Status';
      if (!matchesStatus) {
        if (statusFilter === 'Draft') {
          matchesStatus = ncar.status === NCARStatus.DRAFT;
        } else if (statusFilter === 'Awaiting Auditee (CAP)' || statusFilter === 'Awaiting Auditee (Part 2)') {
          matchesStatus = ncar.status === NCARStatus.PART1_SUBMITTED || isPendingPart2(ncar);
        } else if (statusFilter === 'Pending Review') {
          matchesStatus = ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED || ncar.status === NCARStatus.FOR_APPROVAL;
        } else if (statusFilter === 'Pending Lead Review') {
          matchesStatus = ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || (ncar.status === NCARStatus.FOR_APPROVAL && ncar.createdByRole !== 'LEAD_AUDITOR');
        } else if (statusFilter === 'Pending Head Approval') {
          matchesStatus = ncar.status === NCARStatus.CAP_LEAD_APPROVED || (ncar.status === NCARStatus.FOR_APPROVAL && ncar.createdByRole === 'LEAD_AUDITOR');
        } else if (statusFilter === 'Approved') {
          matchesStatus = [NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.CLOSED].includes(ncar.status);
        } else if (statusFilter === 'Returned / Rejected') {
          matchesStatus = ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED;
        } else if (statusFilter === 'Overdue SLA') {
          matchesStatus = getResponseSlaStatus(ncar) === 'Overdue';
        }
      }

      const matchesType = typeFilters.length === 0 || typeFilters.includes(ncar.findingType);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [ncarFindings, actionPlans, searchQuery, statusFilter, typeFilters, isAuditee, issuingAuditor]);

  const summaryCards = [
    { 
      label: 'All NCARs', 
      count: ncarFindings.length, 
      caption: 'Total nonconformity records', 
      icon: ClipboardList, 
      color: 'blue', 
      filter: 'All Status' 
    },
    { 
      label: 'Awaiting Action Plan (CAP)', 
      count: ncarFindings.filter(ncar => ncar.status === NCARStatus.PART1_SUBMITTED || isPendingPart2(ncar)).length, 
      caption: 'Active 5-working-day SLA', 
      icon: Clock3, 
      color: 'amber', 
      filter: 'Awaiting Auditee (CAP)' 
    },
    { 
      label: 'Pending Review', 
      count: ncarFindings.filter(ncar => ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED).length, 
      caption: 'Awaiting Lead or Head decision', 
      icon: CheckSquare, 
      color: 'purple', 
      filter: 'Pending Review' 
    },
    { 
      label: 'Approved', 
      count: ncarFindings.filter(ncar => [NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.CLOSED].includes(ncar.status)).length, 
      caption: 'Individual final approval granted', 
      icon: CircleCheck, 
      color: 'green', 
      filter: 'Approved' 
    },
    { 
      label: 'Rejected', 
      count: ncarFindings.filter(ncar => [NCARStatus.REJECTED, NCARStatus.REOPENED].includes(ncar.status)).length, 
      caption: 'Rejected need some revision ', 
      icon: CircleX, 
      color: 'red', 
      filter: 'Rejected' 
    }
  ] as const;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">NCAR Module</h1>
          <p className="mt-1 text-sm text-gray-500 font-normal">Nonconformity Corrective Action Reports · Individual Review & SLA Management</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isAuditor || isLead) && (
            <button 
              onClick={() => { 
                setViewingNCAR(null); 
                setFormData(initialFormData); 
                setActiveModalTab('part1');
                setShowForm(true); 
              }} 
              className="flex items-center gap-2 rounded-xl bg-[#172554] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E3268]"
            >
              <Plus size={18} /> New NCAR
            </button>
          )}
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {overdueNCARs.length > 0 && !dismissOverdueBanner && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-medium">
                Attention: {overdueNCARs.length} NCAR {overdueNCARs.length === 1 ? 'response is' : 'responses are'} overdue past the 5-working-day SLA.
              </p>
              <p className="text-xs text-red-700 font-normal mt-0.5">
                Auditees must submit their corrective action plan. Lead Auditors can escalate overdue findings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              type="button" 
              onClick={() => setStatusFilter('Overdue SLA')}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-normal hover:bg-red-700 transition"
            >
              View Overdue ({overdueNCARs.length})
            </button>
            <button 
              type="button" 
              onClick={() => setDismissOverdueBanner(true)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f3e7d3] bg-[#fff8e9] p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, count, caption, icon: Icon, color, filter }) => {
          const styles = {
            blue: { border: 'border-[#efe5d3]', icon: 'bg-indigo-50 text-[#172554]', count: 'text-[#172554]', stripe: 'bg-[#172554]' },
            amber: { border: 'border-[#efe5d3]', icon: 'bg-amber-50 text-amber-700', count: 'text-amber-700', stripe: 'bg-amber-500' },
            purple: { border: 'border-[#efe5d3]', icon: 'bg-purple-50 text-purple-700', count: 'text-purple-700', stripe: 'bg-purple-600' },
            green: { border: 'border-[#efe5d3]', icon: 'bg-emerald-50 text-emerald-700', count: 'text-emerald-700', stripe: 'bg-emerald-500' },
            red: { border: 'border-[#efe5d3]', icon: 'bg-rose-50 text-rose-600', count: 'text-rose-600', stripe: 'bg-rose-500' }
          }[color];
          const selected = statusFilter === filter;
          return (
            <button 
              key={label} 
              type="button" 
              onClick={() => setStatusFilter(filter)} 
              aria-pressed={selected} 
              className={`group relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-2xl border bg-[#fffef5] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.border} ${selected ? 'border-indigo-200 ring-2 ring-indigo-100' : ''}`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${styles.stripe}`} />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-normal text-slate-600">{label}</span>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}><Icon size={18} /></span>
              </div>
              <p className={`text-2xl font-semibold leading-none tracking-tight ${styles.count}`}>{count}</p>
              <p className="truncate text-[11px] text-slate-500 font-normal">{caption}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by NCAR ID, requirement, auditee, process, department..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-5 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-normal text-gray-700"
          />
        </div>
        <div className="flex gap-2.5 relative" ref={filterRef}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-normal text-gray-700 hover:bg-gray-100 transition-all border border-gray-200"
          >
            <Filter size={16} /> Finding Types
          </button>
          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 z-40">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest block mb-2">Filter Types</span>
              {['Major', 'Minor'].map(type => (
                <label key={type} className="text-sm text-gray-700 font-normal flex items-center gap-2.5 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={typeFilters.includes(type)}
                    onChange={() => setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                    className="w-4 h-4 rounded text-[#172554]"
                  />
                  <span>{type} Nonconformity</span>
                </label>
              ))}
            </div>
          )}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-normal text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="All Status">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Awaiting Auditee (CAP)">Awaiting Action Plan (CAP)</option>
            <option value="Pending Review">Pending Review (All)</option>
            <option value="Pending Lead Review">Pending Lead Review</option>
            <option value="Pending Head Approval">Pending Head Approval</option>
            <option value="Approved">Approved</option>
            <option value="Returned / Rejected">Returned / Rejected</option>
            <option value="Overdue SLA">Overdue SLA</option>
          </select>
        </div>
      </div>

      {/* Main NCAR Table */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-blue-100 text-xs font-medium uppercase tracking-wider">
                <th className="px-4 py-3.5">NCAR ID</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">System</th>
                <th className="px-4 py-3.5">Auditee</th>
                <th className="px-4 py-3.5 text-center">Corrective Action Plan (CAP)</th>
                <th className="px-4 py-3.5 text-center">Response Deadline & SLA</th>
                <th className="px-4 py-3.5 text-center">Approval Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {filteredNCARs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center text-gray-400">
                    <FileText className="mx-auto mb-2 text-gray-300" size={32} />
                    <p className="font-medium text-gray-600">No NCAR records found matching your filters.</p>
                    <p className="text-xs text-gray-400 mt-1 font-normal">Try resetting the status filter or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredNCARs.map(ncar => {
                  const ap = actionPlans.find(a => a.ncarId === ncar.id);
                  const responsibleName = ncar.managerResponsible || ncar.auditee || ap?.responsiblePerson || '-';
                  const initial = responsibleName !== '-' ? responsibleName.charAt(0).toUpperCase() : '?';

                  const slaStatus = getResponseSlaStatus(ncar);
                  const responseDeadline = ncar.responseSla?.dueDate || ncar.deadline;
                  const countdown = responseDeadline ? getWorkingDaysCountdown(responseDeadline) : null;
                  const hasSubmitted = hasSubmittedNCARResponse(ncar);

                  let statusBadgeStyle = 'border-slate-200 bg-slate-50 text-slate-700';
                  let statusLabel = ncar.status as string;

                  if (ncar.status === NCARStatus.DRAFT) {
                    statusBadgeStyle = 'border-slate-200 bg-slate-50 text-slate-700';
                    statusLabel = 'Draft';
                  } else if (ncar.status === NCARStatus.PART1_SUBMITTED) {
                    statusBadgeStyle = 'border-blue-200 bg-blue-50 text-blue-700';
                    statusLabel = 'Awaiting Action Plan';
                  } else if (ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED) {
                    statusBadgeStyle = 'border-amber-200 bg-amber-50 text-amber-800';
                    statusLabel = 'Pending Lead Review';
                  } else if (ncar.status === NCARStatus.CAP_LEAD_APPROVED) {
                    statusBadgeStyle = 'border-purple-200 bg-purple-50 text-purple-700';
                    statusLabel = 'Pending Head Approval';
                  } else if (ncar.status === NCARStatus.APPROVED || ncar.status === NCARStatus.VALIDATED || ncar.status === NCARStatus.CLOSED) {
                    statusBadgeStyle = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                    statusLabel = 'Approved';
                  } else if (ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED) {
                    statusBadgeStyle = 'border-rose-200 bg-rose-50 text-rose-700';
                    statusLabel = 'Returned for Revision';
                  }

                  return (
                    <tr key={ncar.id} className="hover:bg-blue-50/20 transition-all">
                      {/* NCAR ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-normal text-[#172554] bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/70 whitespace-nowrap text-xs">
                          {ncar.id}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className={`w-fit text-[11px] font-normal px-2.5 py-1 rounded-full uppercase border whitespace-nowrap ${
                          ncar.findingType === 'Major' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-[#172554] border-blue-200'
                        }`}>
                          {ncar.findingType}
                        </span>
                      </td>

                      {/* System */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-700 font-normal whitespace-nowrap">
                          {ncar.systemType || ncar.auditType || 'QMS'}
                        </span>
                      </td>

                      {/* Auditee */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-normal shrink-0">
                            {initial}
                          </div>
                          <span className="text-xs text-gray-700 font-normal whitespace-nowrap max-w-[150px] truncate" title={responsibleName}>
                            {responsibleName}
                          </span>
                        </div>
                      </td>

                      {/* Corrective Action Plan (CAP) Status */}
                      <td className="px-4 py-3.5 text-center">
                        {hasSubmitted ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <CheckCircle2 size={12} /> Submitted
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5 font-normal">
                              {ap?.submittedAt ? new Date(ap.submittedAt).toLocaleDateString() : 'Recorded'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <Clock3 size={12} /> Awaiting Action Plan
                          </span>
                        )}
                      </td>

                      {/* Response Deadline & SLA Countdown */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="text-xs font-normal text-gray-600 whitespace-nowrap">
                          {responseDeadline ? new Date(`${responseDeadline.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'}
                        </div>
                        {hasSubmitted ? (
                          <span className="mt-1 inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-normal text-emerald-700">
                            SLA Satisfied
                          </span>
                        ) : countdown ? (
                          <span className={`mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-normal ${
                            countdown.isOverdue 
                              ? 'border-red-300 bg-red-100 text-red-800' 
                              : countdown.isDueToday 
                              ? 'border-amber-300 bg-amber-100 text-amber-800' 
                              : slaStatus === 'Due Soon'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-blue-200 bg-blue-50 text-blue-800'
                          }`}>
                            {countdown.isOverdue && <AlertTriangle size={10} />}
                            {countdown.text}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-normal">Not assigned</span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-normal uppercase tracking-tight ${statusBadgeStyle}`}>
                          {statusLabel}
                        </span>
                        {ncar.isEscalated && ncar.status !== NCARStatus.APPROVED && ncar.status !== NCARStatus.VALIDATED && ncar.status !== NCARStatus.CLOSED && (
                          <div className="mt-1">
                            <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-normal text-emerald-700">
                              Escalated to EEM
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center items-center">
                          <button 
                            type="button"
                            onClick={() => handleAction(ncar)}
                            className="inline-flex items-center justify-center p-2 rounded-xl transition-all border border-blue-100 bg-blue-50 text-[#172554] hover:bg-blue-100 hover:text-blue-900"
                            title="View NCAR"
                          >
                            <Eye size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Review & Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5 backdrop-blur-sm">
          <div 
            role="dialog" 
            aria-modal="true" 
            className="my-auto flex w-full max-w-5xl flex-col max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-gray-100"
          >
            {/* Modal Header */}
            <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="bg-[#172554] p-2.5 rounded-xl text-white shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-800 tracking-tight">
                      {viewingNCAR ? `NCAR: ${viewingNCAR.id}` : 'Create New Nonconformity'}
                    </h2>
                    {viewingNCAR && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-800">
                        {viewingNCAR.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-normal mt-0.5">
                    Nonconformity Corrective Action Report
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={closeForm} 
                className="text-gray-400 hover:text-gray-800 bg-white p-2 rounded-full border border-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-gray-200 bg-white px-5 pt-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('part1')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs transition ${
                  activeModalTab === 'part1'
                    ? 'border-[#172554] text-[#172554] font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-800 font-normal'
                }`}
              >
                <FileText size={15} />
                <span>Part 1: Finding Details</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('part2')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs transition ${
                  activeModalTab === 'part2'
                    ? 'border-[#172554] text-[#172554] font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-800 font-normal'
                }`}
              >
                <Edit3 size={15} />
                <span>Part 2: Investigation & Action Plan </span>
                {viewingNCAR && hasSubmittedNCARResponse(viewingNCAR) && (
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('history')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs transition ${
                  activeModalTab === 'history'
                    ? 'border-[#172554] text-[#172554] font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-800 font-normal'
                }`}
              >
                <History size={15} />
                <span>Audit Logs ({viewingNCAR?.auditTrail?.length || 0})</span>
              </button>
            </div>

            {/* Rejection Remarks banner if exists */}
            {viewingNCAR?.rejectionRemarks && (
              <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-rose-800 font-medium text-xs uppercase tracking-wide">
                  <AlertCircle size={15} />
                  <span>Review Comments</span>
                </div>
                <p className="mt-1 text-sm text-rose-900 font-normal">
                  {viewingNCAR.rejectionRemarks}
                </p>
              </div>
            )}

            {/* Lead Auditor Approved banner awaiting Head Manager */}
            {viewingNCAR && (viewingNCAR.status === NCARStatus.CAP_LEAD_APPROVED || (viewingNCAR.createdByRole === 'LEAD_AUDITOR' && viewingNCAR.status === NCARStatus.FOR_APPROVAL)) && (
              <div className="mx-6 mt-4 rounded-xl border border-purple-200 bg-purple-50/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-purple-900 text-xs font-medium">
                  <CheckCircle2 size={16} className="text-purple-700 shrink-0" />
                  <span>Approved by Lead Auditor — Pending final approval.</span>
                </div>
                {isHeadManager ? (
                  <span className="text-[11px] font-medium text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full shrink-0">
                    Head Manager Approval
                  </span>
                ) : (
                  <span className="text-[11px] font-normal text-purple-600 bg-white border border-purple-200 px-2.5 py-0.5 rounded-full shrink-0">
                    Awaiting Head Manager Final Approval
                  </span>
                )}
              </div>
            )}

            {/* Tab 1: Part 1 Finding Details */}
            {activeModalTab === 'part1' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC] custom-scrollbar">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    Finding Classification
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>NCAR Number</span>
                      <input 
                        readOnly 
                        value={viewingNCAR?.id || getGeneratedNCARNumber()} 
                        className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Finding Type <span className="text-red-500 font-normal">*</span></span>
                      <select 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.type} 
                        onChange={e => setFormData({ ...formData, type: e.target.value as typeof formData.type })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal"
                      >
                        <option value="Major">Major Nonconformity</option>
                        <option value="Minor">Minor Nonconformity</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Management System Type</span>
                      <select 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.systemType} 
                        onChange={e => setFormData({ ...formData, systemType: e.target.value as typeof formData.systemType })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal"
                      >
                        <option value="QMS">QMS</option>
                        <option value="ISMS">ISMS</option>
                        <option value="Business">Business</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Clause Reference <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.clause} 
                        onChange={e => setFormData({ ...formData, clause: e.target.value })} 
                        placeholder="e.g. ISO 9001 Clause 8.1"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    Requirement & Evidence
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Specified Requirement (ISO/Policy Clause) <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.requirement} 
                        onChange={e => setFormData({ ...formData, requirement: e.target.value })} 
                        placeholder="State the explicit requirement that was breached"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Nonconformity Statement (What went wrong?) <span className="text-red-500 font-normal">*</span></span>
                      <textarea 
                        required 
                        rows={3} 
                        disabled={!canEditPart1} 
                        value={formData.statement} 
                        onChange={e => setFormData({ ...formData, statement: e.target.value })} 
                        placeholder="Provide clear description of the nonconformity"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Objective Evidence <span className="text-red-500 font-normal">*</span></span>
                      <textarea 
                        required 
                        rows={3} 
                        disabled={!canEditPart1} 
                        value={formData.evidence} 
                        onChange={e => setFormData({ ...formData, evidence: e.target.value })} 
                        placeholder="State factual, observable, and verifiable records/findings"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                      />
                      {viewingNCAR?.evidenceAttachments?.length ? (
                        <div className="mt-2 space-y-1.5">
                          {viewingNCAR.evidenceAttachments.map((file, idx) => (
                            <a 
                              key={idx} 
                              href={file.dataUrl} 
                              download={file.name} 
                              className="text-xs font-normal text-blue-700 hover:underline block"
                            >
                              📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    Assignment & SLA
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Process Involved <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.processName} 
                        onChange={e => setFormData({ ...formData, processName: e.target.value })} 
                        placeholder="Process or operation area"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Department Responsible <span className="text-red-500 font-normal">*</span></span>
                      <select 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.departmentResponsible} 
                        onChange={e => setFormData({ ...formData, departmentResponsible: e.target.value })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal"
                      >
                        <option value="">Select Department</option>
                        {FINDING_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Manager Responsible (Auditee) <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.managerResponsible} 
                        onChange={e => setFormData({ ...formData, managerResponsible: e.target.value })} 
                        placeholder="Auditee Manager name"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Issuing Auditor</span>
                      <input 
                        readOnly 
                        value={formData.issuingAuditor} 
                        className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Issue Date <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        type="date" 
                        required 
                        disabled={!canEditPart1} 
                        value={formData.issueDate} 
                        onChange={e => setFormData({ ...formData, issueDate: e.target.value })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <div className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Response Deadline (5 Working Days SLA)</span>
                      <div className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm font-normal text-blue-900">
                        {viewingNCAR?.responseSla?.dueDate || viewingNCAR?.deadline || 'Calculated on Part 1 submission'}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Tab 2: Part 2 Investigation & Action Plan */}
            {activeModalTab === 'part2' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC] custom-scrollbar">
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <div className="flex items-center gap-2 text-indigo-900 font-medium text-xs uppercase tracking-wide">
                    <CheckSquare size={16} />
                    <span>Part 2: Auditee Investigation & Corrective Action Plan</span>
                  </div>
                  <p className="mt-1 text-xs text-indigo-800 font-normal">
                    The Auditee is responsible for conducting an impact assessment, immediate correction, root cause analysis, and proposing a sustainable corrective action plan.
                  </p>
                </section>

                {/* Impact Assessment */}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    1. Impact Assessment
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Response Date <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        type="date" 
                        required 
                        disabled={!canEditPart2} 
                        value={apFormData.responseDate} 
                        onChange={e => setApFormData({ ...apFormData, responseDate: e.target.value })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600 sm:col-span-2">
                      <span>Consequence / Impact on Process or Business Unit <span className="text-red-500 font-normal">*</span></span>
                      <textarea 
                        required 
                        rows={3} 
                        disabled={!canEditPart2} 
                        value={apFormData.consequenceImpact} 
                        onChange={e => setApFormData({ ...apFormData, consequenceImpact: e.target.value })} 
                        placeholder="Detail the operational, financial, compliance, or customer effects."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                      />
                    </label>
                  </div>
                </section>

                {/* Immediate Correction (IC) */}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    2. Immediate Correction (IC)
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-normal text-gray-600 sm:col-span-2">
                      <span>Immediate Correction Action (What containment/remedy was done?) <span className="text-red-500 font-normal">*</span></span>
                      <textarea 
                        required 
                        rows={3} 
                        disabled={!canEditPart2} 
                        value={apFormData.correction} 
                        onChange={e => setApFormData({ ...apFormData, correction: e.target.value })} 
                        placeholder="Describe the immediate remedial action taken to contain the nonconformity."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Correction Person Responsible <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        required 
                        disabled={!canEditPart2} 
                        value={apFormData.correctionResponsible} 
                        onChange={e => setApFormData({ ...apFormData, correctionResponsible: e.target.value })} 
                        placeholder="Enter responsible manager/staff name"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>Correction Target Date <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        type="date" 
                        required 
                        disabled={!canEditPart2} 
                        value={apFormData.correctionTargetDate} 
                        onChange={e => setApFormData({ ...apFormData, correctionTargetDate: e.target.value })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                  </div>
                </section>

                {/* Root Cause Analysis (RCA) */}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    3. Root Cause Analysis (RCA)
                  </h3>
                  <div className="space-y-4">
                    <label className="block space-y-1 text-xs font-normal text-gray-600">
                      <span>Root Cause Analysis (Why did this occur?) <span className="text-red-500 font-normal">*</span></span>
                      <textarea 
                        required 
                        rows={3} 
                        disabled={!canEditPart2} 
                        value={apFormData.rootCause} 
                        onChange={e => setApFormData({ ...apFormData, rootCause: e.target.value })} 
                        placeholder="State the underlying system/process root cause (e.g. 5 Whys, fishbone analysis findings)."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                      />
                    </label>
                    <div>
                      <span className="block text-xs font-normal text-gray-600 mb-1.5">
                        Can the Nonconformity occur elsewhere in the organization?
                      </span>
                      <div className="flex gap-6">
                        {(['No', 'Yes'] as const).map(option => (
                          <label key={option} className="flex items-center gap-2 text-sm font-normal text-gray-700 cursor-pointer">
                            <input 
                              type="radio" 
                              disabled={!canEditPart2}
                              checked={apFormData.canOccurElsewhere === option}
                              onChange={() => setApFormData({ ...apFormData, canOccurElsewhere: option })}
                              className="w-4 h-4 text-[#172554]"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {apFormData.canOccurElsewhere === 'Yes' && (
                      <label className="block space-y-1 text-xs font-normal text-gray-600">
                        <span>Details on other affected processes or areas <span className="text-red-500 font-normal">*</span></span>
                        <textarea 
                          required 
                          rows={2} 
                          disabled={!canEditPart2} 
                          value={apFormData.elsewhereDetails} 
                          onChange={e => setApFormData({ ...apFormData, elsewhereDetails: e.target.value })} 
                          placeholder="List other departments or systems where similar failure could happen."
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                        />
                      </label>
                    )}
                  </div>
                </section>

                {/* Proposed Corrective Action Plan (CAP) */}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#172554]">
                    4. Proposed Corrective Action Plan (CAP)
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-normal text-gray-600 sm:col-span-2">
                      <span>Corrective Action Plan (Action to eliminate root cause and prevent recurrence) <span className="text-red-500 font-normal">*</span></span>
                      <textarea 
                        required 
                        rows={4} 
                        disabled={!canEditPart2} 
                        value={apFormData.actionPlan} 
                        onChange={e => setApFormData({ ...apFormData, actionPlan: e.target.value })} 
                        placeholder="Detail the specific corrective actions to eliminate the identified root cause."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 resize-y font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>CAP Person Responsible <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        required 
                        disabled={!canEditPart2} 
                        value={apFormData.responsible} 
                        onChange={e => setApFormData({ ...apFormData, responsible: e.target.value })} 
                        placeholder="Enter responsible manager name"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                    <label className="space-y-1 text-xs font-normal text-gray-600">
                      <span>CAP Target Completion Date <span className="text-red-500 font-normal">*</span></span>
                      <input 
                        type="date" 
                        required 
                        disabled={!canEditPart2} 
                        value={apFormData.capTargetDate} 
                        onChange={e => setApFormData({ ...apFormData, capTargetDate: e.target.value })} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-50 font-normal" 
                      />
                    </label>
                  </div>
                </section>
              </div>
            )}

            {/* Tab 3: Audit Trail & Decision History */}
            {activeModalTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-800">Audit Trail & Decision History</h3>
                      <p className="text-xs text-gray-500 font-normal">Chronological audit log of every submission, review decision, and comment.</p>
                    </div>
                    <span className="text-xs font-normal px-2.5 py-1 bg-blue-50 text-blue-900 rounded-full border border-blue-200">
                      {viewingNCAR?.auditTrail?.length || 0} Events Recorded
                    </span>
                  </div>

                  {!viewingNCAR?.auditTrail || viewingNCAR.auditTrail.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
                      <History className="mx-auto mb-2 text-gray-300" size={32} />
                      <p className="text-sm font-normal">No audit trail records logged yet.</p>
                      <p className="text-xs text-gray-400 mt-1 font-normal">Actions taken on this NCAR will be logged here with timestamps and reviewer details.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-indigo-200 ml-4 pl-6 space-y-6">
                      {viewingNCAR.auditTrail.map((entry) => {
                        const isApproved = entry.action === 'LEAD_APPROVED' || entry.action === 'HEAD_APPROVED';
                        const isRejected = entry.action === 'LEAD_RETURNED' || entry.action === 'HEAD_REJECTED';
                        const isSubmitted = entry.action === 'PART1_SUBMITTED' || entry.action === 'PART2_SUBMITTED';

                        return (
                          <div key={entry.id} className="relative group">
                            <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                              isApproved ? 'bg-emerald-500' :
                              isRejected ? 'bg-rose-500' :
                              isSubmitted ? 'bg-indigo-600' : 'bg-slate-400'
                            }`} />

                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm transition hover:shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-normal px-2 py-0.5 rounded-md ${
                                    isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                    isRejected ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                                    isSubmitted ? 'bg-indigo-50 text-indigo-900 border border-indigo-200' :
                                    'bg-slate-50 text-slate-700 border border-slate-200'
                                  }`}>
                                    {entry.actionLabel}
                                  </span>
                                  {entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus && (
                                    <span className="text-[11px] text-gray-500 font-normal">
                                      {entry.previousStatus} → <span className="text-gray-800 font-normal">{entry.newStatus}</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 font-normal">
                                  {new Date(entry.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2 font-normal">
                                <span className="font-normal text-gray-900">{entry.performedBy}</span>
                                <span className="text-gray-400">·</span>
                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-normal text-gray-700">
                                  {entry.role.replace('_', ' ')}
                                </span>
                              </div>

                              {entry.comments && (
                                <div className="mt-2 text-xs p-3 rounded-lg bg-slate-50 border border-slate-100 text-gray-700 whitespace-pre-wrap font-normal">
                                  "{entry.comments}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white p-4 sm:px-6">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-normal">
                {viewingNCAR?.responseSla?.dueDate && (
                  <span>Response Due: <span className="font-normal text-gray-700">{viewingNCAR.responseSla.dueDate}</span></span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {canEditPart1 && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => saveNCARPart1(false)} 
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-normal text-gray-700 hover:bg-gray-50"
                    >
                      Save Draft
                    </button>
                    <button 
                      type="button" 
                      onClick={() => saveNCARPart1(true)} 
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#172554] px-5 py-2 text-xs font-normal text-white hover:bg-[#1E3268] shadow-sm"
                    >
                      <Send size={14} /> Submit Part 1 (Start SLA)
                    </button>
                  </>
                )}

                {canEditPart2 && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => saveActionPlanPart2(true)} 
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-normal text-gray-700 hover:bg-gray-50"
                    >
                      Save CAP Draft
                    </button>
                    <button 
                      type="button" 
                      onClick={() => saveActionPlanPart2(false)} 
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#172554] px-5 py-2 text-xs font-normal text-white hover:bg-[#1E3268] shadow-sm"
                    >
                      <Send size={14} /> Submit Corrective Action Plan (CAP)
                    </button>
                  </>
                )}

                {isLeadReviewEligible && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => initiateReject('LEAD_RETURN')} 
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-normal text-rose-700 hover:bg-rose-100"
                    >
                      <RotateCcw size={14} /> Reject
                    </button>
                    <button 
                      type="button" 
                      onClick={() => initiateApprove('LEAD_APPROVE')} 
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#172554] px-5 py-2 text-xs font-normal text-white hover:bg-[#1E3268] shadow-sm"
                    >
                      <Check size={14} /> Approve (For Head Manager Review)
                    </button>
                  </>
                )}

                {isHeadManagerReviewEligible && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => initiateReject('HEAD_REJECT')} 
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-normal text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle size={14} /> Reject NCAR
                    </button>
                    <button 
                      type="button" 
                      onClick={() => initiateApprove('HEAD_APPROVE')} 
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-normal text-white hover:bg-emerald-800 shadow-sm"
                    >
                      <CheckCircle2 size={14} /> Final Approve
                    </button>
                  </>
                )}

                {viewingNCAR && (viewingNCAR.status === NCARStatus.CAP_LEAD_APPROVED || (viewingNCAR.createdByRole === 'LEAD_AUDITOR' && viewingNCAR.status === NCARStatus.FOR_APPROVAL)) && !isHeadManager && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 text-xs font-normal">
                    <Clock size={13} />
                    <span>Approved by Lead Auditor · Awaiting Head Manager Final Approval</span>
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={closeForm} 
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-normal text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Remarks Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-rose-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-xl">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {rejectionActionType === 'LEAD_RETURN' 
                      ? 'Return NCAR for Revision' 
                      : 'Reject NCAR (Head Manager)'}
                  </h3>
                  <p className="text-xs text-gray-500 font-normal">Reference: {viewingNCAR?.id}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-normal text-gray-700 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  Reason for Rejection / Revision Instructions <span className="text-red-500 font-normal">*</span>
                </label>
                <textarea 
                  autoFocus
                  required
                  rows={4}
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="Explain why this response is returned and what corrections the Auditee must make..."
                  className="w-full bg-rose-50/20 border-2 border-rose-100 rounded-xl p-3 text-sm text-gray-800 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300 resize-none font-normal"
                />
                <p className="text-[11px] text-gray-500 font-normal">
                  This decision, reviewer name, timestamp, and comments will be permanently recorded in the NCAR audit trail.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowRejectModal(false); setRejectionRemarks(''); }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-normal text-xs hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={finalizeRejection}
                  disabled={!rejectionRemarks.trim()}
                  className="px-5 py-2 bg-rose-600 text-white rounded-xl font-medium text-xs hover:bg-rose-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <AlertCircle size={15} /> Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation & Notes Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-emerald-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {approvalActionType === 'LEAD_APPROVE' 
                      ? 'Approve for Head Manager Review' 
                      : 'Grant Final Approval (Head Manager)'}
                  </h3>
                  <p className="text-xs text-gray-500 font-normal">Reference: {viewingNCAR?.id}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-normal text-gray-700 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  Review Notes / Comments (Optional)
                </label>
                <textarea 
                  rows={3}
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Enter optional observations or approval remarks to log in the audit trail..."
                  className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-3 text-sm text-gray-800 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 resize-none font-normal"
                />
                <p className="text-[11px] text-gray-500 font-normal">
                  Your name, role, decision, and comments will be added to the NCAR audit trail.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowApproveModal(false); setApprovalComments(''); }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-normal text-xs hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={finalizeApproval}
                  className="px-5 py-2 bg-[#172554] text-white rounded-xl font-medium text-xs hover:bg-[#1E3268] transition shadow-sm flex items-center gap-1.5"
                >
                  <Check size={15} /> Confirm Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sendPromptReport && (
        <ExecutiveSendPrompt
          report={sendPromptReport}
          executiveRecipients={executiveRecipients}
          onNo={() => setSendPromptReport(null)}
          onYes={() => { onFinalApproveReport(sendPromptReport.id); setSendPromptReport(null); }}
        />
      )}

    </div>
  );
};

export default NCARModule;
