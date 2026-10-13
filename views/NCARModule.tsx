import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NCAR, NCARStatus, Role, ActionPlan, User as UserRecord } from '../types';
import { getConfiguredPhilippineHolidays, getResponseSlaStatus, hasSubmittedNCARResponse, makeResponseSla } from '../utils/ncarSla';
import { 
  AlertTriangle, 
  User, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  X, 
  Check, 
  Paperclip, 
  Edit3, 
  Save, 
  Eye, 
  ScanEye,
  ArrowRight,
  ShieldAlert,
  FileUp,
  Send,
  AlertCircle,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RefreshCcw,
  PlusCircle,
  Eraser,
  Trash2,
  ClipboardList,
  CircleCheck,
  CircleX,
  Clock3,
} from 'lucide-react';

interface NCARModuleProps {
  ncars: NCAR[];
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  actionPlans: ActionPlan[];
  setActionPlans: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  role: Role;
  users: UserRecord[];
  issuingAuditor: string;
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
  onNotify, 
  setActiveModule 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [viewingNCAR, setViewingNCAR] = useState<NCAR | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreatingActionPlan, setIsCreatingActionPlan] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  const isAuditee = role === 'AUDITEE';
  const isLead = role === 'LEAD_AUDITOR';
  const isHeadManager = role === 'HEAD_MANAGER';
  const isAuditor = role === 'AUDITOR';
  const canEditCAP = isAuditee && Boolean(viewingNCAR && [NCARStatus.PART1_SUBMITTED, NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.REOPENED].includes(viewingNCAR.status));
  const canCreate = role === 'LEAD_AUDITOR' || role === 'AUDITOR';
  const isLeadReview = isLead && viewingNCAR?.createdByRole !== 'LEAD_AUDITOR' && viewingNCAR?.status === NCARStatus.FOR_APPROVAL;
  const isManagerReview = isHeadManager && (viewingNCAR?.createdByRole === 'LEAD_AUDITOR' ? viewingNCAR?.status === NCARStatus.FOR_APPROVAL : viewingNCAR?.status === NCARStatus.LEAD_APPROVED);
  const canApproveNCAR = Boolean(isLeadReview || isManagerReview);
  const isLeadCAPReview = isLead && viewingNCAR?.status === NCARStatus.ACTION_PLAN_SUBMITTED;
  const isManagerCAPReview = isHeadManager && viewingNCAR?.status === NCARStatus.CAP_LEAD_APPROVED;
  const canApproveCAP = Boolean((isLeadCAPReview || isManagerCAPReview) && !viewingNCAR?.assignedByAuditReportId);
  const canEditNCAR = isLead || isHeadManager || (canCreate && (!viewingNCAR || viewingNCAR.status === NCARStatus.DRAFT));
  const isReadOnlyFinding = Boolean(viewingNCAR && !canEditNCAR);
  const isPendingPart2 = (ncar: NCAR) => {
    const plan = actionPlans.find(actionPlan => actionPlan.ncarId === ncar.id);
    const readyForPart2 = [NCARStatus.PART1_SUBMITTED, NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.REOPENED].includes(ncar.status);
    return readyForPart2 && (!plan || plan.isDraft === true);
  };
  const getNCARTableStatus = (ncar: NCAR): 'Pending' | 'Approved' | 'Rejected' => {
    if (ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED) return 'Rejected';
    if (isPendingPart2(ncar)) return 'Pending';
    if ([NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.ACTION_PLAN_SUBMITTED, NCARStatus.CAP_LEAD_APPROVED, NCARStatus.CLOSED].includes(ncar.status)) return 'Approved';
    return 'Pending';
  };

  const getInitialDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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
    issuingAuditor
  };

  const [formData, setFormData] = useState(initialFormData);

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

  const getDaysRemaining = (deadline: string) => {
    if (!deadline) return 0;
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

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

    setIsCreatingActionPlan(!isAuditee && (ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED));
    setShowForm(true);
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
    const leadAuditor = issuingAuditor.trim();
    if (!leadAuditor) {
      onNotify('The Lead Auditor name is unavailable. Sign in again before escalating this NCAR.', 'warning');
      return;
    }
    setNcars(current => current.map(item => item.id === ncar.id ? {
      ...item,
      isEscalated: true,
      escalationStatus: 'Successfully Escalated to EEM',
      escalatedAt,
      escalatedBy: leadAuditor
    } : item));
    onNotify(`NCAR ${ncar.id} successfully escalated to EEM for tracking by ${leadAuditor}.`, 'success');
  };

  const handleApprove = () => {
    if (!viewingNCAR || !canApproveNCAR) return;
    const nextStatus = isLeadReview ? NCARStatus.LEAD_APPROVED : NCARStatus.APPROVED;
    const assignedAt = nextStatus === NCARStatus.APPROVED ? (viewingNCAR.assignedAt || new Date().toISOString()) : viewingNCAR.assignedAt;
    const responseSla = nextStatus === NCARStatus.APPROVED && viewingNCAR.findingType !== 'OFI'
      ? viewingNCAR.responseSla || makeResponseSla(assignedAt!, getConfiguredPhilippineHolidays())
      : viewingNCAR.responseSla;
    setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { ...n, status: nextStatus, ...(assignedAt ? { assignedAt } : {}), ...(responseSla ? { responseSla, deadline: responseSla.dueDate } : {}), rejectionRemarks: undefined } : n));
    onNotify(isLeadReview ? `NCAR ${viewingNCAR.id} validated by Lead Auditor and sent to Head Manager.` : `NCAR ${viewingNCAR.id} approved and assigned to ${viewingNCAR.auditee} for corrective action.`, 'success');
    closeForm();
  };

  const handleApproveCAP = () => {
    if (!viewingNCAR || !canApproveCAP) return;
    const nextStatus = isLeadCAPReview ? NCARStatus.CAP_LEAD_APPROVED : NCARStatus.CLOSED;
    setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { ...n, status: nextStatus, rejectionRemarks: undefined } : n));
    onNotify(isLeadCAPReview ? `CAP for ${viewingNCAR.id} approved by Lead Auditor and sent to Head Manager.` : `CAP for ${viewingNCAR.id} finally approved by Head Manager.`, 'success');
    closeForm();
  };

  const handleInitiateReject = () => {
    setShowRejectModal(true);
  };

  const finalizeRejection = () => {
    if (!viewingNCAR || !rejectionRemarks.trim()) return;
    const isCAPRejection = viewingNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED || viewingNCAR.status === NCARStatus.CAP_LEAD_APPROVED;
    setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { 
      ...n, 
      status: isCAPRejection ? NCARStatus.REOPENED : NCARStatus.REJECTED,
      rejectionRemarks: rejectionRemarks
    } : n));
    onNotify(`${isCAPRejection ? 'CAP' : 'NCAR'} ${viewingNCAR.id} Rejected: ${rejectionRemarks}`, 'warning');
    setShowRejectModal(false);
    setRejectionRemarks('');
    closeForm();
  };

  const saveNCAR = (status: NCARStatus.DRAFT | NCARStatus.FOR_APPROVAL) => {
    if (!canCreate && !(viewingNCAR && canEditNCAR)) return;
    const now = new Date();
    const submittingPart1 = status === NCARStatus.FOR_APPROVAL;
    const submittedStatus = submittingPart1 ? NCARStatus.PART1_SUBMITTED : NCARStatus.DRAFT;
    const ncarNumber = viewingNCAR?.id || getGeneratedNCARNumber();
    if (viewingNCAR) {
      const assignedAt = submittingPart1 ? viewingNCAR.assignedAt || now.toISOString() : viewingNCAR.assignedAt;
      const responseSla = submittingPart1 ? viewingNCAR.responseSla || makeResponseSla(assignedAt!, getConfiguredPhilippineHolidays()) : viewingNCAR.responseSla;
      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: viewingNCAR.status === NCARStatus.DRAFT ? submittedStatus : viewingNCAR.status,
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
        deadline: formData.dueDate,
        processName: formData.processName,
        ...(assignedAt ? { assignedAt } : {}),
        ...(responseSla ? { responseSla, deadline: responseSla.dueDate } : {})
      } : n));
    } else {
      const assignedAt = submittingPart1 ? now.toISOString() : undefined;
      const responseSla = assignedAt ? makeResponseSla(assignedAt, getConfiguredPhilippineHolidays()) : undefined;
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
        status: submittedStatus,
        deadline: responseSla?.dueDate || formData.dueDate,
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
        ...(responseSla ? { responseSla } : {})
      };
      setNcars(prev => [newNCAR, ...prev]);
    }
    onNotify(viewingNCAR && viewingNCAR.status !== NCARStatus.DRAFT ? `NCAR ${ncarNumber} changes saved.` : status === NCARStatus.DRAFT ? `NCAR ${ncarNumber} saved as draft.` : `NCAR ${ncarNumber} Part 1 submitted. The 5 working day Part 2 SLA has started.`, 'success');
    closeForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveNCAR(NCARStatus.FOR_APPROVAL);
  };

  const handleSaveDraft = () => saveNCAR(NCARStatus.DRAFT);

  const saveActionPlan = (isDraft: boolean) => {
    if (!viewingNCAR) return;
    if (!isDraft) {
      const missingFields = [
        ['Response Date', apFormData.responseDate],
        ['Consequence / Impact', apFormData.consequenceImpact],
        ['Immediate Correction', apFormData.correction],
        ['Correction Responsible Person', apFormData.correctionResponsible],
        ['Correction Target Date', apFormData.correctionTargetDate],
        ['Root Cause Analysis', apFormData.rootCause],
        ['Corrective Action Plan', apFormData.actionPlan],
        ['CAP Responsible Person', apFormData.responsible],
        ['CAP Target Date', apFormData.capTargetDate]
      ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
      if (apFormData.canOccurElsewhere === 'Yes' && !apFormData.elsewhereDetails.trim()) missingFields.push('Elsewhere Details');
      if (missingFields.length) {
        onNotify(`Complete the required Part 2 fields: ${missingFields.join(', ')}.`, 'warning');
        return;
      }
    }
    const additionalAuditee = apFormData.additionalAuditeeResponsible.trim();
    const correctionAdditionalAuditee = apFormData.correctionAdditionalAuditeeResponsible.trim();
    const isAuditeeUser = (name: string) => users.some(user => user.role === 'AUDITEE' && user.name.toLowerCase() === name.toLowerCase());
    if ((additionalAuditee && !isAuditeeUser(additionalAuditee)) || (correctionAdditionalAuditee && !isAuditeeUser(correctionAdditionalAuditee))) {
      onNotify('Choose an existing user with the Auditee role for each additional responsible person.', 'warning');
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
    if (!isDraft) setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { ...n, status: NCARStatus.ACTION_PLAN_SUBMITTED, responseAt: n.responseAt || new Date().toISOString(), responseSla: n.responseSla ? { ...n.responseSla, status: 'Submitted' } : undefined, rejectionRemarks: undefined } : n));
    else if (viewingNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED || viewingNCAR.status === NCARStatus.CAP_LEAD_APPROVED) {
      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { ...n, status: NCARStatus.APPROVED } : n));
    }
    onNotify(isDraft ? `CAP for ${viewingNCAR.id} saved as a draft.` : `CAP for ${viewingNCAR.id} submitted successfully.`, 'success');
    closeForm();
  };

  const handleApSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveActionPlan(false);
  };

  const handleApFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setApFormData({ ...apFormData, attachmentName: e.target.files[0].name });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setViewingNCAR(null);
    setIsCreatingActionPlan(false);
    setFormData(initialFormData);
    setApFormData(initialApFormData);
  };

  const initiateFreshPlan = () => {
    setApFormData(initialApFormData);
    setIsCreatingActionPlan(true);
    onNotify("Started a fresh action plan draft.", "info");
  };

  const ncarFindings = useMemo(() => ncars.filter(ncar => ncar.findingType !== 'OFI'), [ncars]);
  const filteredNCARs = useMemo(() => {
    return ncarFindings.filter(ncar => {
      if (isAuditee && (ncar.managerResponsible || ncar.auditee || '').toLowerCase() !== issuingAuditor.toLowerCase()) return false;
      const responsible = actionPlans.find(a => a.ncarId === ncar.id)?.responsiblePerson || ncar.auditee || '';
      const matchesSearch = ncar.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ncar.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ncar.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ncar.auditType && ncar.auditType.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (ncar.processName && ncar.processName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            responsible.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = statusFilter === 'All Status';
      if (!matchesStatus) {
        if (statusFilter === 'Pending') {
          matchesStatus = isPendingPart2(ncar);
        } else if (statusFilter === 'Draft') {
          matchesStatus = ncar.status === NCARStatus.DRAFT;
        } else if (statusFilter === 'For Approval') {
          matchesStatus = ncar.status === NCARStatus.FOR_APPROVAL || ncar.status === NCARStatus.LEAD_APPROVED || ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED;
        } else if (statusFilter === 'Rejected') {
          matchesStatus = ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED;
        } else if (statusFilter === 'Approved') {
          matchesStatus = !isPendingPart2(ncar) && [NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.ACTION_PLAN_SUBMITTED, NCARStatus.CAP_LEAD_APPROVED, NCARStatus.CLOSED].includes(ncar.status);
        } else if (statusFilter === 'Closed') {
          matchesStatus = ncar.status === NCARStatus.CLOSED;
        }
      }

      const matchesType = typeFilters.length === 0 || typeFilters.includes(ncar.findingType);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [ncarFindings, actionPlans, searchQuery, statusFilter, typeFilters, isAuditee, issuingAuditor]);

  const summaryCards = [
    { label: 'All Status', count: ncarFindings.length, caption: 'All NCARs in the register', icon: ClipboardList, color: 'blue', filter: 'All Status' },
    { label: 'Approved', count: ncarFindings.filter(ncar => !isPendingPart2(ncar) && [NCARStatus.APPROVED, NCARStatus.VALIDATED, NCARStatus.ACTION_PLAN_SUBMITTED, NCARStatus.CAP_LEAD_APPROVED, NCARStatus.CLOSED].includes(ncar.status)).length, caption: 'NCAR approved; Part 2 submitted or closed', icon: CircleCheck, color: 'green', filter: 'Approved' },
    { label: 'Rejected', count: ncarFindings.filter(ncar => [NCARStatus.REJECTED, NCARStatus.REOPENED].includes(ncar.status)).length, caption: 'Requires revision', icon: CircleX, color: 'red', filter: 'Rejected' },
    { label: 'Pending', count: ncarFindings.filter(isPendingPart2).length, caption: 'Part 2: corrective action not submitted', icon: Clock3, color: 'orange', filter: 'Pending' }
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">NCAR</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && <button onClick={() => { setViewingNCAR(null); setFormData(initialFormData); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-[#172554] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1E3268]"><Plus size={20} /> NCAR</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f3e7d3] bg-[#fff8e9] p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, count, caption, icon: Icon, color, filter }) => {
          const styles = {
            blue: { border: 'border-[#efe5d3]', icon: 'bg-indigo-50 text-[#172554]', count: 'text-[#172554]', stripe: 'bg-[#172554]' },
            green: { border: 'border-[#efe5d3]', icon: 'bg-emerald-50 text-emerald-700', count: 'text-gray-900', stripe: 'bg-emerald-500' },
            red: { border: 'border-[#efe5d3]', icon: 'bg-rose-50 text-rose-600', count: 'text-gray-900', stripe: 'bg-rose-500' },
            orange: { border: 'border-[#efe5d3]', icon: 'bg-amber-50 text-amber-700', count: 'text-gray-900', stripe: 'bg-orange-400' }
          }[color];
          const selected = statusFilter === filter;
          return (
            <button key={label} type="button" onClick={() => setStatusFilter(filter)} aria-pressed={selected} className={`group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border bg-[#fffef5] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.border} ${selected ? 'border-indigo-200 ring-2 ring-indigo-100' : ''}`}>
              <span className={`absolute inset-x-0 top-0 h-1 ${styles.stripe}`} />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-slate-600">{label}</span>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}><Icon size={19} /></span>
              </div>
              <p className={`text-3xl font-bold leading-none tracking-tight ${styles.count}`}>{count}</p>
              <p className="truncate text-[11px] text-slate-500">{caption}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search NCARs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-normal"
          />
        </div>
        <div className="flex gap-3 relative" ref={filterRef}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-xl text-sm font-black text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Filter size={20} /> Filters
          </button>
          {showFilters && (
            <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-40">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Finding Types</span>
              {['Major', 'Minor', 'OFI'].map(type => (
                <label key={type} className="text-sm text-[#4B5563] font-bold flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={typeFilters.includes(type)}
                    onChange={() => setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                    className="w-4 h-4 rounded text-[#172554] font-normal"
                  />
                  <span className="text-sm font-bold text-[#4B5563]">{type}</span>
                </label>
              ))}
            </div>
          )}
          {!isAuditee && <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
          >
            <option value="All Status">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="For Approval">For Approval</option>
            <option value="Rejected">Rejected</option>
            <option value="Approved">Approved</option>
            <option value="Closed">Closed</option>
          </select>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">NCAR ID</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Audit Type</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Process</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Finding Type</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Requirement</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Responsible</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Response Date</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Deadline</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Status</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[#4B5563]">
              {filteredNCARs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-8 py-12 text-center text-gray-400 font-medium text-sm">No NCARs matching criteria</td>
                </tr>
              ) : (
                filteredNCARs.map(ncar => {
                  const ap = actionPlans.find(a => a.ncarId === ncar.id);
                  const responsibleName = ap?.responsiblePerson || ncar.auditee || '-';
                  const initial = responsibleName !== '-' ? responsibleName.charAt(0).toUpperCase() : '?';

                  const slaStatus = getResponseSlaStatus(ncar);
                  const responseDeadline = ncar.responseSla?.dueDate || (ncar.assignedAt ? ncar.deadline : '');
                  const slaBadge = slaStatus === 'Overdue' ? 'border-red-200 bg-red-50 text-red-700' : slaStatus === 'Due Soon' ? 'border-amber-200 bg-amber-50 text-amber-700' : slaStatus === 'Submitted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-100 bg-blue-50 text-blue-700';

                  return (
                    <tr key={ncar.id} className="hover:bg-blue-50/20 transition-all group">
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#172554] bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter border border-blue-100 whitespace-nowrap">{ncar.id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-blue-900 bg-blue-50/80 px-2.5 py-1 rounded border border-blue-200/60 whitespace-nowrap">
                          {ncar.auditType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-normal text-gray-700 max-w-[150px] truncate block" title={ncar.processName}>
                          {ncar.processName || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full uppercase border whitespace-nowrap ${
                          ncar.findingType === 'Major' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-[#172554] border-blue-100'
                        }`}>
                          {ncar.findingType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-normal text-gray-700 text-sm line-clamp-1 max-w-[200px]" title={ncar.requirement}>{ncar.requirement}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {initial}
                          </div>
                          <span className="text-sm font-normal text-gray-700 whitespace-nowrap max-w-[130px] truncate" title={responsibleName}>
                            {responsibleName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-gray-600 whitespace-nowrap">{ap && !ap.isDraft && ap.submittedAt ? new Date(ap.submittedAt).toLocaleDateString() : 'â€”'}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="text-sm font-normal text-gray-600 whitespace-nowrap">{responseDeadline ? new Date(`${responseDeadline.slice(0, 10)}T00:00:00`).toLocaleDateString() : 'â€”'}</div>
                        {slaStatus ? <span className={`mt-1 inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${slaBadge}`}>{slaStatus === 'Due Soon' ? 'Due Soon' : slaStatus}</span> : <div className="text-xs font-medium text-[#172554] uppercase mt-0.5 whitespace-nowrap">{responseDeadline ? `${getDaysRemaining(responseDeadline)} days left` : 'Not assigned'}</div>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                          getNCARTableStatus(ncar) === 'Approved' ? 'border-green-200 bg-green-50 text-green-700' :
                          getNCARTableStatus(ncar) === 'Rejected' ? 'border-red-100 bg-red-50 text-red-600' : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                          {getNCARTableStatus(ncar)}
                        </span>
                        {ncar.isEscalated && <div className="mt-2"><span title={ncar.escalationStatus || 'Successfully Escalated to EEM'} className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Escalated</span><p className="mt-1 whitespace-nowrap text-[10px] text-gray-500">{ncar.escalatedBy ? `${ncar.escalatedBy} Â· ` : ''}{ncar.escalatedAt ? new Date(ncar.escalatedAt).toLocaleString() : 'Date not recorded'}</p></div>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          {isLead && slaStatus === 'Overdue' && !ncar.isEscalated && <button type="button" onClick={() => handleEscalate(ncar)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100" title="Escalate overdue NCAR to EEM for tracking only"><ArrowRight size={15} /> Escalate</button>}
                          {(() => {
                            const tooltipText = isAuditee 
                              ? (ncar.status === NCARStatus.CLOSED ? 'View Closed NCAR and CAP' : 'Open NCAR and CAP form') 
                              : "Review";
                            return (
                              <>
                              <div className="relative group/tooltip inline-flex justify-center items-center">
                                <button 
                                  onClick={() => handleAction(ncar)}
                                  className={`p-2 rounded-xl transition-all border ${
                                    isAuditee && (ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED)
                                    ? 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
                                    : 'text-[#172554] bg-blue-50 border-blue-100 hover:bg-blue-100'
                                  }`}
                                  title={tooltipText}
                                  aria-label={tooltipText}
                                >
                                  {isAuditee ? (ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED ? <RefreshCcw size={20} /> : <Eye size={20} />) : <ScanEye size={20} />}
                                </button>
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                                  <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                                    {tooltipText}
                                  </span>
                                  <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                                </div>
                              </div>
                              {!isAuditee && (
                                <button
                                  onClick={() => handleDelete(ncar)}
                                  className="p-2 rounded-xl transition-all border text-red-600 bg-red-50 border-red-100 hover:bg-red-100"
                                  title="Delete NCAR"
                                  aria-label={`Delete NCAR ${ncar.id}`}
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                              </>
                            );
                          })()}
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby={isCreatingActionPlan ? 'cap-modal-title' : 'ncar-modal-title'} className={`my-auto flex w-full flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200 ${isCreatingActionPlan ? 'max-h-[90vh] max-w-5xl' : isReadOnlyFinding ? 'max-h-[94vh] max-w-6xl' : 'max-h-[94vh] max-w-[94vw]'}`}>
            {!isCreatingActionPlan ? (
              <form onSubmit={handleSubmit} className="text-sm text-[#4B5563] font-medium">
                <div className="p-6 flex justify-between items-center border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl text-[#172554] shadow-lg">
                      {isAuditee ? (viewingNCAR?.status === NCARStatus.REOPENED || viewingNCAR?.status === NCARStatus.REJECTED ? <RefreshCcw size={24} /> : <Eye size={24} />) : viewingNCAR ? <Edit3 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <h4 id="ncar-modal-title" className="text-2xl font-black text-gray-800 tracking-tight">
                        {isAuditee ? (viewingNCAR?.status === NCARStatus.REOPENED || viewingNCAR?.status === NCARStatus.REJECTED ? 'Review & Plan' : 'View Finding Details') : viewingNCAR ? (viewingNCAR.status === NCARStatus.DRAFT ? 'Edit NCAR Draft' : `NCAR: ${viewingNCAR.id}`) : 'New NCAR'}
                      </h4>
                      <p className="text-sm text-[#4B5563] font-medium">NCARTool â€¢ Nonconformity Corrective Action Report</p>
                    </div>
                  </div>
                  <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
                
                <div className={`bg-[#F8FAFC] ${isReadOnlyFinding ? 'grid grid-cols-1 items-start gap-3 p-4 lg:grid-cols-2' : 'max-h-[70vh] space-y-5 overflow-y-auto p-6 custom-scrollbar'}`}>
                  {viewingNCAR?.rejectionRemarks && (
                    <div className={`rounded-xl border border-red-100 bg-red-50 p-4 ${isReadOnlyFinding ? 'lg:col-span-2' : ''}`}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">Review feedback</p>
                      <p className="text-sm text-red-800">{viewingNCAR.rejectionRemarks}</p>
                    </div>
                  )}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">NCAR Details</h5>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>NCAR Number</span><input readOnly value={viewingNCAR?.id || getGeneratedNCARNumber()} className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-700" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Management System Type</span><select required disabled={!canEditNCAR} value={formData.systemType} onChange={e => setFormData({...formData, systemType: e.target.value as typeof formData.systemType})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="QMS">QMS</option><option value="ISMS">ISMS</option><option value="QMS/ISMS">QMS/ISMS (legacy)</option><option value="Business">Business</option></select></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>ISO/Business Requirement</span><input required value={formData.requirement} onChange={e => setFormData({...formData, requirement: e.target.value})} placeholder="e.g. ISO 9001:2015 requirements" disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Finding Type</span><select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as typeof formData.type})} disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="Major">Major</option><option value="Minor">Minor</option><option value="OFI">OFI</option></select></label>
                    </div>
                  </section>
                  <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Finding</h5>
                    <div className="grid grid-cols-1 gap-4">
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Nonconformity</span><textarea required rows={isReadOnlyFinding ? 2 : 3} value={formData.statement} onChange={e => setFormData({...formData, statement: e.target.value})} disabled={!canEditNCAR} className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Evidence</span><textarea required rows={isReadOnlyFinding ? 2 : 3} value={formData.evidence} onChange={e => setFormData({...formData, evidence: e.target.value})} disabled={!canEditNCAR} className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{viewingNCAR?.evidenceAttachments?.length ? <div className="mt-2 space-y-1">{viewingNCAR.evidenceAttachments.map((file, index) => <a key={`${file.name}-${index}`} href={file.dataUrl} download={file.name} className="block text-xs font-medium text-blue-700 hover:underline">{file.name} ({(file.size / 1024).toFixed(1)} KB)</a>)}</div> : null}</label>
                    </div>
                  </section>
                  <section className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${isReadOnlyFinding ? 'lg:col-span-2' : ''}`}>
                    <h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Responsibility & Dates</h5>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Clause</span><input required value={formData.clause} onChange={e => setFormData({...formData, clause: e.target.value})} placeholder="Clause number" disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Issue Date</span><input required type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value, dueDate: getInitialResponseDueDate(e.target.value)})} disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Process Involved</span><input required value={formData.processName} onChange={e => setFormData({...formData, processName: e.target.value})} disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Manager Responsible</span><input required value={formData.managerResponsible} onChange={e => setFormData({...formData, managerResponsible: e.target.value})} disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Department Responsible</span><select required value={formData.departmentResponsible} onChange={e => setFormData({...formData, departmentResponsible: e.target.value})} disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Select department</option>{FINDING_AREAS.map(area => <option key={area} value={area}>{area}</option>)}</select></label>
                      <label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Issuing Auditor</span><input required value={formData.issuingAuditor} onChange={e => setFormData({...formData, issuingAuditor: e.target.value})} readOnly={!viewingNCAR && Boolean(issuingAuditor)} disabled={!canEditNCAR} className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-700" /></label>
                      <div className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span className="block">NCAR Response Due Date</span>{viewingNCAR?.responseSla ? <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-normal text-gray-700 sm:max-w-sm">{viewingNCAR.responseSla.dueDate}</div> : <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-normal text-gray-500 sm:max-w-sm">Calculated when Part 1 is submitted</div>}<span className="block text-[11px] font-normal text-gray-500">The 5 working day SLA starts when Part 1 is submitted to the Auditee. Weekends and configured Philippine holidays are excluded.</span></div>
                      {viewingNCAR?.responseSla && <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-gray-600">Response SLA Status</span><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getResponseSlaStatus(viewingNCAR) === 'Overdue' ? 'border-red-200 bg-red-50 text-red-700' : getResponseSlaStatus(viewingNCAR) === 'Due Soon' ? 'border-amber-200 bg-amber-50 text-amber-700' : getResponseSlaStatus(viewingNCAR) === 'Submitted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>{getResponseSlaStatus(viewingNCAR) || viewingNCAR.responseSla.status}</span></div><p className="text-xs text-gray-500">Assigned {new Date(viewingNCAR.responseSla.startedAt).toLocaleString()} Â· Due {viewingNCAR.responseSla.dueDate}</p>{viewingNCAR.responseSla.notificationHistory.length > 0 && <div className="border-t border-gray-200 pt-2"><p className="mb-1 text-xs font-medium text-gray-600">Notification History</p>{viewingNCAR.responseSla.notificationHistory.map((entry, index) => <p key={`${entry.type}-${index}`} className="text-xs text-gray-500">{entry.type === 'due-soon' ? 'Before-deadline reminder' : 'Overdue notification'} Â· {new Date(entry.notifiedAt).toLocaleString()}</p>)}</div>}{viewingNCAR.isEscalated && <div className="border-t border-gray-200 pt-2"><p className="text-xs font-semibold text-emerald-700">{viewingNCAR.escalationStatus || 'Previously escalated'}</p><p className="mt-1 text-xs text-gray-500">{viewingNCAR.escalatedBy ? `Initiated by ${viewingNCAR.escalatedBy}` : 'Initiating Lead Auditor not recorded'}{viewingNCAR.escalatedAt ? ` Â· ${new Date(viewingNCAR.escalatedAt).toLocaleString()}` : ' Â· Date not recorded'}</p></div>}</div>}
                    </div>
                  </section>
                  {isAuditee && viewingNCAR && canEditCAP && <section className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
                    <div><h5 className="text-sm font-bold text-indigo-950">Part 2: Investigation and Action Plan</h5><p className="mt-1 text-xs text-indigo-800">Continue to the corrective action plan when you are ready to provide your response.</p></div>
                    <button type="button" onClick={() => setIsCreatingActionPlan(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#172554] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E3268]"><Plus size={17} />Corrective Action Plan</button>
                  </section>}
                </div>
                <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 bg-white p-5 sm:px-6">
                  {canApproveNCAR ? (
                    <>
                      {canEditNCAR && <button type="button" onClick={() => saveNCAR(viewingNCAR?.status === NCARStatus.DRAFT ? NCARStatus.DRAFT : NCARStatus.FOR_APPROVAL)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Save changes</button>}
                      <button type="button" onClick={handleInitiateReject} className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Reject</button>
                      <button type="button" onClick={handleApprove} className="rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">{isLeadReview ? 'Approve' : 'Final Approve'}</button>
                    </>
                  ) : viewingNCAR && canEditNCAR && viewingNCAR.status !== NCARStatus.DRAFT ? (
                    <button type="button" onClick={() => saveNCAR(NCARStatus.FOR_APPROVAL)} className="rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">Save changes</button>
                  ) : canCreate && (!viewingNCAR || viewingNCAR.status === NCARStatus.DRAFT) ? (
                    <>
                      <button type="button" onClick={handleSaveDraft} className="rounded-lg border border-[#172554] bg-white px-5 py-2.5 text-sm font-semibold text-[#172554] hover:bg-blue-50">Save as Draft</button>
                      <button type="submit" className="flex items-center gap-2 rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Send size={16} /> Submit</button>
                    </>
                  ) : null}
                </div>
              </form>
            ) : (
              <form onSubmit={handleApSubmit} className="text-sm text-[#4B5563] font-medium">
  <div className="p-6 flex justify-between items-center border-b border-gray-100">
    <div className="flex items-center gap-4"><div className="bg-[#172554] p-3 rounded-2xl text-white shadow-lg"><Edit3 size={24} /></div><div><h4 id="cap-modal-title" className="text-2xl font-bold text-gray-800 tracking-tight">Corrective Action Plan</h4><p className="text-sm text-gray-500">Part 2 Â· NCAR Ref: {viewingNCAR?.id}</p></div></div>
    <button type="button" onClick={() => setIsCreatingActionPlan(false)} aria-label="Close CAP form" className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full"><X size={24} /></button>
  </div>
  <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
    {viewingNCAR?.rejectionRemarks && <div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-xs font-semibold uppercase text-red-600">Review feedback</p><p className="mt-1 text-sm text-red-800">{viewingNCAR.rejectionRemarks}</p></div>}
    <fieldset disabled={!canEditCAP} className="contents">
    <datalist id="cap-responsible-people"><option value="Bob Johnson" /><option value="Charlie Davis" /><option value="Sarah Wilson" /><option value="Michael Brown" /><option value="Alex Johnson" /><option value="Alice Smith" /></datalist>
    <datalist id="cap-auditee-people">{users.filter(user => user.role === 'AUDITEE').map(user => <option key={user.id} value={user.name} />)}</datalist>
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><h5 className="text-sm font-bold uppercase tracking-wide text-indigo-900">Part 2: Investigation and Action Plan</h5><p className="mt-1 text-xs text-indigo-800">Complete the impact assessment, investigation, immediate correction, and corrective action plan below.</p></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Impact Assessment</h5><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Response Date</span><input required type="date" value={apFormData.responseDate} onChange={e => setApFormData({...apFormData, responseDate: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Consequence/Impact to Process or Business Unit</span><textarea required rows={3} value={apFormData.consequenceImpact} onChange={e => setApFormData({...apFormData, consequenceImpact: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Describe the effect on the process or business unit." /></label></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Immediate Correction</h5><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Immediate Correction</span><textarea required rows={3} value={apFormData.correction} onChange={e => setApFormData({...apFormData, correction: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Describe the immediate steps taken to address the NC." /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Person Responsible <span className="font-normal text-gray-400">(Manager default)</span></span><input required list="cap-responsible-people" value={apFormData.correctionResponsible} onChange={e => setApFormData({...apFormData, correctionResponsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search or enter a name" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Correction Target Date</span><input required type="date" value={apFormData.correctionTargetDate} onChange={e => setApFormData({...apFormData, correctionTargetDate: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Additional Person Responsible (Auditee) <span className="font-normal text-gray-400">(Optional)</span></span><input list="cap-auditee-people" value={apFormData.correctionAdditionalAuditeeResponsible} onChange={e => setApFormData({...apFormData, correctionAdditionalAuditeeResponsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search auditees by name" /></label></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Root Cause Analysis</h5><div className="space-y-4"><label className="block space-y-1.5 text-xs font-medium text-gray-600"><span>Root Cause Analysis</span><textarea required rows={4} value={apFormData.rootCause} onChange={e => setApFormData({...apFormData, rootCause: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Identify the underlying cause." /></label><fieldset><legend className="mb-2 text-xs font-medium text-gray-600">Can the NC occur elsewhere?</legend><div className="flex gap-5">{(['Yes', 'No'] as const).map(answer => <label key={answer} className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="cap-occurs-elsewhere" required checked={apFormData.canOccurElsewhere === answer} onChange={() => setApFormData({...apFormData, canOccurElsewhere: answer})} />{answer}</label>)}</div></fieldset>{apFormData.canOccurElsewhere === 'Yes' && <label className="block space-y-1.5 text-xs font-medium text-gray-600"><span>Details</span><textarea required rows={3} value={apFormData.elsewhereDetails} onChange={e => setApFormData({...apFormData, elsewhereDetails: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Identify other processes or business units that may be affected." /></label>}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Corrective Action Plan</h5><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Corrective Action Plan</span><textarea required rows={4} value={apFormData.actionPlan} onChange={e => setApFormData({...apFormData, actionPlan: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Describe the actions that will prevent recurrence." /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Person Responsible <span className="font-normal text-gray-400">(Manager default)</span></span><input required list="cap-responsible-people" value={apFormData.responsible} onChange={e => setApFormData({...apFormData, responsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search or enter a name" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>CAP Target Date</span><input required type="date" value={apFormData.capTargetDate} onChange={e => setApFormData({...apFormData, capTargetDate: e.target.value, dueDate: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Additional Person Responsible (Auditee) <span className="font-normal text-gray-400">(Optional)</span></span><input list="cap-auditee-people" value={apFormData.additionalAuditeeResponsible} onChange={e => setApFormData({...apFormData, additionalAuditeeResponsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search auditees by name" /></label></div></section>
    </fieldset>
  </div>
  <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 bg-white p-5 sm:px-6">
    {canEditCAP && <><button type="button" onClick={() => saveActionPlan(true)} className="rounded-lg border border-[#172554] bg-white px-5 py-2.5 text-sm font-semibold text-[#172554] hover:bg-blue-50">Save as Draft</button><button type="submit" className="flex items-center gap-2 rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Send size={16} /> Submit</button></>}
    {canApproveCAP && <><button type="button" onClick={handleInitiateReject} className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><XCircle size={16} /> Reject</button><button type="button" onClick={handleApproveCAP} className="flex items-center gap-2 rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Check size={16} /> {isLeadCAPReview ? 'Approve & Forward' : 'Final Approve'}</button></>}
    {!canEditCAP && !canApproveCAP && <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>}
  </div>
</form>
            )}
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-50">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 text-red-600">
                <div className="p-3 bg-red-50 rounded-2xl">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black tracking-tight uppercase">Rejection Remarks</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ref: {viewingNCAR?.id}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} /> 
                  Provide reason for rejection (Required)
                </label>
                <textarea 
                  autoFocus
                  required
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="Explain why this action plan is not acceptable..."
                  className="w-full bg-red-50/20 border-2 border-red-50 rounded-2xl p-5 text-sm text-[#4B5563] outline-none focus:ring-4 focus:ring-red-100 focus:border-red-200 transition-all min-h-[120px] resize-none font-normal"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { setShowRejectModal(false); setRejectionRemarks(''); }}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={finalizeRejection}
                  disabled={!rejectionRemarks.trim()}
                  className="flex-[1.5] px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <AlertCircle size={18} /> Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NCARModule;








