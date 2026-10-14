import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  NCAR, 
  ActionPlan, 
  NCARStatus, 
  Role, 
  ValidationSubmission, 
  ValidationEvidenceFile,
  ValidationStageStatus,
  NCARAuditTrailEntry
} from '../types';
import { 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  FileText, 
  User, 
  Calendar, 
  Eye, 
  Search, 
  FileIcon, 
  Filter, 
  Check,
  AlertCircle, 
  MessageSquare, 
  AlertTriangle, 
  X, 
  ClipboardList, 
  Clock, 
  RefreshCcw, 
  Send, 
  FileUp, 
  Eraser, 
  Undo2, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  History,
  CheckCheck
} from 'lucide-react';

interface ValidationModuleProps {
  ncars: NCAR[];
  actionPlans: ActionPlan[];
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  setActionPlans?: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  role: Role;
  currentUserName?: string;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const getNCARValidationStage = (ncar: NCAR): {
  stage: ValidationStageStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
} => {
  if (ncar.status === NCARStatus.CLOSED || ncar.validationStage === 'CLOSED') {
    return {
      stage: 'CLOSED',
      label: 'Closed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500'
    };
  }

  if (ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED || ncar.validationStage === 'RETURNED_FOR_REVISION') {
    return {
      stage: 'RETURNED_FOR_REVISION',
      label: 'Rejected',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500'
    };
  }

  if (ncar.status === NCARStatus.CAP_LEAD_APPROVED || ncar.validationStage === 'PENDING_HEAD_REVIEW') {
    return {
      stage: 'PENDING_HEAD_REVIEW',
      label: 'Lead Approved · Awaiting Head',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      dotClass: 'bg-purple-500'
    };
  }

  if (ncar.status === NCARStatus.VALIDATED || ncar.validationStage === 'PENDING_LEAD_REVIEW') {
    return {
      stage: 'PENDING_LEAD_REVIEW',
      label: 'Submitted · Awaiting Lead Review',
      badgeClass: 'bg-blue-50 text-[#172554] border-blue-200',
      dotClass: 'bg-blue-500'
    };
  }

  // If status is APPROVED or ACTION_PLAN_SUBMITTED with existing submissions
  if (ncar.validationSubmissions && ncar.validationSubmissions.length > 0) {
    const latest = ncar.validationSubmissions[ncar.validationSubmissions.length - 1];
    if (latest.headReview?.decision === 'Returned' || latest.leadReview?.decision === 'Returned') {
      return {
        stage: 'RETURNED_FOR_REVISION',
        label: 'Rejected',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500'
      };
    }
    if (latest.headReview?.decision === 'Approved') {
      return {
        stage: 'CLOSED',
        label: 'Closed',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500'
      };
    }
    if (latest.leadReview?.decision === 'Approved') {
      return {
        stage: 'PENDING_HEAD_REVIEW',
        label: 'Lead Approved · Awaiting Head',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-500'
      };
    }
    return {
      stage: 'PENDING_LEAD_REVIEW',
      label: 'Submitted · Awaiting Lead Review', 
      badgeClass: 'bg-blue-50 text-[#172554] border-blue-200',
      dotClass: 'bg-blue-500'
    };
  }

  return {
    stage: 'PENDING_SUBMISSION',
    label: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500'
  };
};

const ValidationModule: React.FC<ValidationModuleProps> = ({ 
  ncars, 
  actionPlans, 
  setNcars, 
  role, 
  currentUserName,
  onNotify 
}) => {
  const [viewingNCARId, setViewingNCARId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Modals for Review
  const [showLeadReviewModal, setShowLeadReviewModal] = useState(false);
  const [leadReviewDecision, setLeadReviewDecision] = useState<'Approved' | 'Returned'>('Approved');
  const [leadReviewComments, setLeadReviewComments] = useState('');

  const [showHeadReviewModal, setShowHeadReviewModal] = useState(false);
  const [headReviewDecision, setHeadReviewDecision] = useState<'Approved' | 'Returned'>('Approved');
  const [headReviewComments, setHeadReviewComments] = useState('');

  // Auditee Evidence Form state
  const [isEditingEvidence, setIsEditingEvidence] = useState(false);
  const [evidenceRemarks, setEvidenceRemarks] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<ValidationEvidenceFile[]>([]);
  const [showHistoryAccordion, setShowHistoryAccordion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  const isLead = role === 'LEAD_AUDITOR' || role === 'DEV_ADMIN';
  const isHead = role === 'HEAD_MANAGER' || role === 'DEV_ADMIN';
  const isAuditee = role === 'AUDITEE' || role === 'DEV_ADMIN';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewingNCAR = useMemo(() => {
    return ncars.find(n => n.id === viewingNCARId) || null;
  }, [ncars, viewingNCARId]);

  const viewingActionPlan = useMemo(() => {
    if (!viewingNCARId) return null;
    return actionPlans.find(ap => ap.ncarId === viewingNCARId) || null;
  }, [actionPlans, viewingNCARId]);

  // When viewing NCAR changes, populate form if resubmitting or editing
  useEffect(() => {
    if (viewingNCAR) {
      const latestSub = viewingNCAR.validationSubmissions && viewingNCAR.validationSubmissions.length > 0 
        ? viewingNCAR.validationSubmissions[viewingNCAR.validationSubmissions.length - 1] 
        : null;

      const stageInfo = getNCARValidationStage(viewingNCAR);
      if (stageInfo.stage === 'RETURNED_FOR_REVISION' && latestSub) {
        setEvidenceRemarks(latestSub.remarks || '');
        setEvidenceFiles(latestSub.evidenceFiles ? [...latestSub.evidenceFiles] : []);
        setIsEditingEvidence(isAuditee);
      } else if (stageInfo.stage === 'PENDING_SUBMISSION') {
        setEvidenceRemarks('');
        setEvidenceFiles([]);
        setIsEditingEvidence(isAuditee);
      } else {
        setIsEditingEvidence(false);
        setEvidenceRemarks('');
        setEvidenceFiles([]);
      }
      setShowHistoryAccordion(false);
    } else {
      setIsEditingEvidence(false);
      setEvidenceRemarks('');
      setEvidenceFiles([]);
    }
  }, [viewingNCAR, isAuditee]);

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getDaysRemaining = (deadline: string) => {
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  // Validatable findings are those that have an approved action plan, are submitted for validation, returned, or closed
  const validatableNCARs = useMemo(() => {
    return ncars.filter(ncar => {
      if (ncar.assignedByAuditReportId) return false;
      return (
        ncar.status === NCARStatus.APPROVED ||
        ncar.status === NCARStatus.VALIDATED ||
        ncar.status === NCARStatus.CAP_LEAD_APPROVED ||
        ncar.status === NCARStatus.CLOSED ||
        ncar.status === NCARStatus.REOPENED ||
        ncar.status === NCARStatus.REJECTED ||
        ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED ||
        Boolean(ncar.validationStage) ||
        Boolean(ncar.validationSubmissions && ncar.validationSubmissions.length > 0)
      );
    });
  }, [ncars]);

  const filteredItems = useMemo(() => {
    return validatableNCARs.filter(ncar => {
      const stageInfo = getNCARValidationStage(ncar);

      const matchesSearch = 
        ncar.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncar.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncar.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ncar.auditee && ncar.auditee.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = false;
      if (statusFilter === 'All') {
        matchesStatus = true;
      } else if (statusFilter === 'Pending') {
        matchesStatus = stageInfo.stage === 'PENDING_SUBMISSION' || 
                        stageInfo.stage === 'PENDING_LEAD_REVIEW' || 
                        stageInfo.stage === 'PENDING_HEAD_REVIEW';
      } else if (statusFilter === 'Approved') {
        matchesStatus = stageInfo.stage === 'CLOSED';
      } else if (statusFilter === 'Rejected') {
        matchesStatus = stageInfo.stage === 'RETURNED_FOR_REVISION';
      }

      const matchesType = 
        typeFilters.length === 0 || 
        typeFilters.includes(ncar.findingType);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [validatableNCARs, searchQuery, statusFilter, typeFilters]);

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newFile: ValidationEvidenceFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined
        };
        setEvidenceFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Auditee Submits or Resubmits Implementation Evidence
  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingNCAR) return;

    if (!evidenceRemarks.trim()) {
      onNotify('Please enter implementation remarks explaining the evidence.', 'warning');
      return;
    }

    if (evidenceFiles.length === 0) {
      onNotify('Please upload at least one piece of implementation evidence.', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const existingSubmissions = viewingNCAR.validationSubmissions || [];
    const nextVersion = existingSubmissions.length + 1;

    const newSubmission: ValidationSubmission = {
      id: `vsub-${viewingNCAR.id}-${Date.now()}`,
      version: nextVersion,
      submittedAt: now,
      submittedBy: currentUserName || viewingNCAR.auditee || 'Auditee',
      remarks: evidenceRemarks.trim(),
      evidenceFiles: [...evidenceFiles]
    };

    const trailEntry: NCARAuditTrailEntry = {
      id: `trail-val-${Date.now()}`,
      action: nextVersion > 1 ? 'PART2_SUBMITTED' : 'PART2_SUBMITTED',
      actionLabel: nextVersion > 1 
        ? `Implementation Evidence Resubmitted (v${nextVersion})` 
        : 'Implementation Evidence Submitted',
      performedBy: currentUserName || viewingNCAR.auditee || 'Auditee',
      role: 'AUDITEE',
      timestamp: now,
      previousStatus: viewingNCAR.status,
      newStatus: NCARStatus.VALIDATED,
      comments: evidenceRemarks.trim()
    };

    setNcars(prev => prev.map(n => {
      if (n.id === viewingNCAR.id) {
        return {
          ...n,
          status: NCARStatus.VALIDATED,
          validationStage: 'PENDING_LEAD_REVIEW',
          validationSubmissions: [...existingSubmissions, newSubmission],
          rejectionRemarks: undefined,
          auditTrail: [trailEntry, ...(n.auditTrail || [])]
        };
      }
      return n;
    }));

    onNotify(
      nextVersion > 1
        ? `Implementation evidence for ${viewingNCAR.id} (v${nextVersion}) resubmitted successfully. Forwarded to Lead Auditor.`
        : `Implementation evidence for ${viewingNCAR.id} submitted for validation.`,
      'success'
    );

    setIsEditingEvidence(false);
  };

  // Lead Auditor Review
  const finalizeLeadReview = () => {
    if (!viewingNCAR) return;
    if (leadReviewDecision === 'Returned' && !leadReviewComments.trim()) {
      onNotify('Please provide comments explaining why the submission was returned.', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const existingSubmissions = viewingNCAR.validationSubmissions || [];
    if (existingSubmissions.length === 0) {
      onNotify('No implementation submission found to review.', 'warning');
      return;
    }

    const latestIndex = existingSubmissions.length - 1;
    const latestSubmission = { ...existingSubmissions[latestIndex] };

    latestSubmission.leadReview = {
      reviewedAt: now,
      reviewedBy: currentUserName || 'Lead Auditor',
      role: 'LEAD_AUDITOR',
      decision: leadReviewDecision,
      comments: leadReviewComments.trim() || (leadReviewDecision === 'Approved' ? 'Implementation verified and validated.' : 'Returned for revision.')
    };

    const updatedSubmissions = [...existingSubmissions];
    updatedSubmissions[latestIndex] = latestSubmission;

    if (leadReviewDecision === 'Approved') {
      const trailEntry: NCARAuditTrailEntry = {
        id: `trail-lead-${Date.now()}`,
        action: 'LEAD_APPROVED',
        actionLabel: 'Implementation Validated by Lead Auditor',
        performedBy: currentUserName || 'Lead Auditor',
        role: 'LEAD_AUDITOR',
        timestamp: now,
        previousStatus: viewingNCAR.status,
        newStatus: NCARStatus.CAP_LEAD_APPROVED,
        comments: leadReviewComments.trim() || 'Lead Auditor validated the implementation evidence. Forwarded to Head Manager for final approval.'
      };

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.CAP_LEAD_APPROVED,
        validationStage: 'PENDING_HEAD_REVIEW',
        validationSubmissions: updatedSubmissions,
        rejectionRemarks: undefined,
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} implementation validated by Lead Auditor and forwarded to Head Manager for final review.`, 'success');
    } else {
      const trailEntry: NCARAuditTrailEntry = {
        id: `trail-lead-ret-${Date.now()}`,
        action: 'LEAD_RETURNED',
        actionLabel: 'Implementation Evidence Returned for Revision',
        performedBy: currentUserName || 'Lead Auditor',
        role: 'LEAD_AUDITOR',
        timestamp: now,
        previousStatus: viewingNCAR.status,
        newStatus: NCARStatus.REOPENED,
        comments: leadReviewComments.trim()
      };

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.REOPENED,
        validationStage: 'RETURNED_FOR_REVISION',
        validationSubmissions: updatedSubmissions,
        rejectionRemarks: leadReviewComments.trim(),
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} returned for revision to the Auditee.`, 'warning');
    }

    setShowLeadReviewModal(false);
    setLeadReviewComments('');
  };

  // Head Manager Review
  const finalizeHeadReview = () => {
    if (!viewingNCAR) return;
    if (headReviewDecision === 'Returned' && !headReviewComments.trim()) {
      onNotify('Please provide comments explaining why the submission was returned.', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const existingSubmissions = viewingNCAR.validationSubmissions || [];
    if (existingSubmissions.length === 0) {
      onNotify('No implementation submission found to review.', 'warning');
      return;
    }

    const latestIndex = existingSubmissions.length - 1;
    const latestSubmission = { ...existingSubmissions[latestIndex] };

    latestSubmission.headReview = {
      reviewedAt: now,
      reviewedBy: currentUserName || 'Head Manager',
      role: 'HEAD_MANAGER',
      decision: headReviewDecision,
      comments: headReviewComments.trim() || (headReviewDecision === 'Approved' ? 'Final approval granted. Finding officially closed.' : 'Returned for revision.')
    };

    const updatedSubmissions = [...existingSubmissions];
    updatedSubmissions[latestIndex] = latestSubmission;

    if (headReviewDecision === 'Approved') {
      const trailEntry: NCARAuditTrailEntry = {
        id: `trail-head-${Date.now()}`,
        action: 'HEAD_APPROVED',
        actionLabel: 'Final Approved & Finding Closed by Head Manager',
        performedBy: currentUserName || 'Head Manager',
        role: 'HEAD_MANAGER',
        timestamp: now,
        previousStatus: viewingNCAR.status,
        newStatus: NCARStatus.CLOSED,
        comments: headReviewComments.trim() || 'Head Manager verified implementation evidence. Finding officially closed.'
      };

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.CLOSED,
        validationStage: 'CLOSED',
        validationSubmissions: updatedSubmissions,
        isEscalated: false,
        escalationStatus: undefined,
        rejectionRemarks: undefined,
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} received final approval from Head Manager and is now Closed.`, 'success');
    } else {
      const trailEntry: NCARAuditTrailEntry = {
        id: `trail-head-ret-${Date.now()}`,
        action: 'HEAD_REJECTED',
        actionLabel: 'Implementation Evidence Returned by Head Manager',
        performedBy: currentUserName || 'Head Manager',
        role: 'HEAD_MANAGER',
        timestamp: now,
        previousStatus: viewingNCAR.status,
        newStatus: NCARStatus.REJECTED,
        comments: headReviewComments.trim()
      };

      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        status: NCARStatus.REJECTED,
        validationStage: 'RETURNED_FOR_REVISION',
        validationSubmissions: updatedSubmissions,
        rejectionRemarks: headReviewComments.trim(),
        auditTrail: [trailEntry, ...(n.auditTrail || [])]
      } : n));

      onNotify(`NCAR ${viewingNCAR.id} returned for revision by Head Manager.`, 'warning');
    }

    setShowHeadReviewModal(false);
    setHeadReviewComments('');
  };

  const handleCloseModal = () => {
    setViewingNCARId(null);
    setIsEditingEvidence(false);
    setEvidenceRemarks('');
    setEvidenceFiles([]);
    setShowHistoryAccordion(false);
  };

  // Status Filter Cards
  const pendingCount = validatableNCARs.filter(n => {
    const stage = getNCARValidationStage(n).stage;
    return stage === 'PENDING_SUBMISSION' || stage === 'PENDING_LEAD_REVIEW' || stage === 'PENDING_HEAD_REVIEW';
  }).length;

  const statusOptions = [
    { label: 'All', title: 'All Status', count: validatableNCARs.length },
    { label: 'Approved', title: 'Closed', count: validatableNCARs.filter(n => getNCARValidationStage(n).stage === 'CLOSED').length },
    { label: 'Rejected', title: 'Returned for Revision', count: validatableNCARs.filter(n => getNCARValidationStage(n).stage === 'RETURNED_FOR_REVISION').length },
    { label: 'Pending', title: 'Pending Review / Evidence', count: pendingCount }
  ];

  const statusCards = statusOptions.map(({ label, title, count }) => {
    const selected = statusFilter === label;
    const palette = label === 'Approved'
      ? { icon: CheckCircle2, title: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700', stripe: 'bg-emerald-500', selected: 'ring-2 ring-emerald-100 border-emerald-200' }
      : label === 'Rejected'
        ? { icon: XCircle, title: 'text-rose-700', badge: 'bg-rose-50 text-rose-700', stripe: 'bg-rose-500', selected: 'ring-2 ring-rose-100 border-rose-200' }
        : label === 'Pending'
          ? { icon: Clock, title: 'text-amber-700', badge: 'bg-amber-50 text-amber-700', stripe: 'bg-orange-400', selected: 'ring-2 ring-orange-100 border-orange-200' }
          : { icon: ClipboardList, title: 'text-[#172554]', badge: 'bg-indigo-50 text-[#172554]', stripe: 'bg-[#172554]', selected: 'ring-2 ring-indigo-100 border-indigo-200' };
    const StatusIcon = palette.icon;
    const caption = label === 'All' ? 'All items for validation' : label === 'Approved' ? 'Successfully closed' : label === 'Rejected' ? 'Requires revision' : 'Awaiting review or evidence';

    return (
      <button
        key={label}
        type="button"
        onClick={() => setStatusFilter(label)}
        aria-pressed={selected}
        className={`group relative flex h-full min-h-[136px] w-full min-w-0 flex-col items-stretch justify-between overflow-hidden rounded-2xl border bg-[#fffef5] px-5 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 ${selected ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-[#efe5d3]'}`}
      >
        <span className={`absolute inset-x-0 top-0 h-1 ${palette.stripe}`} />
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-slate-600">{title}</span>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.badge}`}>
            <StatusIcon size={19} strokeWidth={2} />
          </span>
        </span>
        <span className={`block text-3xl font-bold leading-none tracking-tight ${selected ? palette.title : 'text-slate-900'}`}>{count}</span>
        <span className="block truncate text-[11px] font-normal text-slate-500">{caption}</span>
      </button>
    );
  });

  return (
    <div className="space-y-5 text-base relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">CAP Validation</h3>
        </div>
        <div className="bg-blue-50 px-5 py-3 rounded-xl border border-blue-100 flex items-center gap-3">
          <div className="w-3 h-3 bg-[#172554] rounded-full animate-pulse"></div>
          <span className="text-sm font-black text-blue-700 uppercase tracking-wide">{pendingCount} Review(s) Requested</span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#f3e7d3] bg-[#fff8e9] p-2 shadow-sm">
        <div className="grid w-full grid-cols-2 auto-rows-fr items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label="Filter by validation status">
          {statusCards}
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by NCAR ID, Auditee, Requirement..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-normal"
          />
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-3 relative" ref={filterRef}>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all border-2 ${typeFilters.length > 0 || showFilters ? 'bg-blue-50 border-blue-200 text-[#172554]' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}
          >
            <Filter size={20} /> Filters
          </button>
          {showFilters && (
            <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-40">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest block mb-3">Finding Types</span>
              {['Major', 'Minor', 'OFI'].map(type => (
                <label key={type} className="text-sm text-[#4B5563] font-bold flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-bold text-[#4B5563]">{type}</span>
                  <input 
                    type="checkbox" 
                    checked={typeFilters.includes(type)} 
                    onChange={() => toggleTypeFilter(type)} 
                    className="w-4 h-4 rounded text-[#172554] font-normal" 
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">NCAR ID</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">ACP ID</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Auditee</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Finding Type</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Requirement</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Submission Date</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Validation Status</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Reviewer Comments</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[#4B5563]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 font-medium text-sm">
                    No items found for CAP validation
                  </td>
                </tr>
              ) : (
                filteredItems.map(n => {
                  const ap = actionPlans.find(a => a.ncarId === n.id);
                  const stageInfo = getNCARValidationStage(n);
                  const latestSub = n.validationSubmissions && n.validationSubmissions.length > 0
                    ? n.validationSubmissions[n.validationSubmissions.length - 1]
                    : null;
                  
                  const submissionDateDisplay = latestSub?.submittedAt 
                    ? new Date(latestSub.submittedAt).toLocaleDateString()
                    : 'Pending Submission';

                  // Reviewer comments display
                  let reviewerCommentSummary = '-';
                  if (n.rejectionRemarks) {
                    reviewerCommentSummary = n.rejectionRemarks;
                  } else if (latestSub?.headReview?.comments) {
                    reviewerCommentSummary = latestSub.headReview.comments;
                  } else if (latestSub?.leadReview?.comments) {
                    reviewerCommentSummary = latestSub.leadReview.comments;
                  }

                  const isActionRequired = isAuditee && (stageInfo.stage === 'PENDING_SUBMISSION' || stageInfo.stage === 'RETURNED_FOR_REVISION');

                  return (
                    <tr key={n.id} className="hover:bg-blue-50/20 transition-all group">
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#172554] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                          {n.id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#4B5563] bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          {ap ? ap.id : '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-normal text-gray-700">
                        {n.auditee || ap?.responsiblePerson || 'N/A'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full uppercase border ${n.findingType === 'Major' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-[#172554] border-blue-100'}`}>
                          {n.findingType}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-normal text-gray-700 text-sm max-w-xs truncate" title={n.requirement}>
                        {n.requirement}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="text-sm font-normal text-gray-700">
                          {submissionDateDisplay}
                        </div>
                        {latestSub?.version && (
                          <div className="text-[10px] font-semibold text-blue-600 uppercase">
                            v{latestSub.version}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${stageInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageInfo.dotClass}`}></span>
                          {stageInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-normal text-gray-600 max-w-xs truncate" title={reviewerCommentSummary}>
                        {reviewerCommentSummary !== '-' ? (
                          <span className="italic text-gray-700">"{reviewerCommentSummary}"</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="relative group/tooltip inline-flex justify-center items-center">
                          <button 
                            onClick={() => setViewingNCARId(n.id)} 
                            title={isActionRequired ? 'Upload & Submit Evidence' : 'View CAP Validation Details'}
                            aria-label={isActionRequired ? 'Upload & Submit Evidence' : 'View CAP Validation Details'}
                            className={`p-2.5 rounded-xl transition-all border ${isActionRequired ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-[#172554] bg-blue-50 border-blue-100 hover:bg-[#172554] hover:text-white'}`}
                          >
                            {isActionRequired ? <RefreshCcw size={18} /> : <Eye size={18} />}
                          </button>
                          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                            <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                              {isActionRequired ? 'Upload & Submit Evidence' : 'View CAP Validation Details'}
                            </span>
                            <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                          </div>
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

      {/* Main Validation Detail Modal */}
      {viewingNCAR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {(() => {
              const stageInfo = getNCARValidationStage(viewingNCAR);
              const latestSubmission = viewingNCAR.validationSubmissions && viewingNCAR.validationSubmissions.length > 0
                ? viewingNCAR.validationSubmissions[viewingNCAR.validationSubmissions.length - 1]
                : null;
              const historySubmissions = (viewingNCAR.validationSubmissions || []).slice(0, -1).reverse();

              const canAuditeeSubmit = isAuditee && (stageInfo.stage === 'PENDING_SUBMISSION' || stageInfo.stage === 'RETURNED_FOR_REVISION');
              const canLeadReview = isLead && stageInfo.stage === 'PENDING_LEAD_REVIEW';
              const canHeadReview = isHead && stageInfo.stage === 'PENDING_HEAD_REVIEW';

              return (
                <>
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/70 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 bg-[#172554] text-white rounded-2xl shadow-md">
                        <ShieldCheck size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-2xl font-bold text-gray-800 tracking-tight">CAP Validation</h4>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${stageInfo.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stageInfo.dotClass}`}></span>
                            {stageInfo.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">
                          Finding Ref: <span className="font-bold text-[#172554]">{viewingNCAR.id}</span> · Audit Plan: <span className="font-bold text-[#172554]">{viewingNCAR.auditPlanId}</span>
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleCloseModal} 
                      className="p-2.5 text-gray-400 hover:text-gray-800 bg-white rounded-full border border-gray-100 transition-all"
                      aria-label="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Scrollable Modal Content */}
                  <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-sm">
                    {/* Reviewer Feedback Banner if Returned for Revision */}
                    {stageInfo.stage === 'RETURNED_FOR_REVISION' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                        <AlertTriangle className="text-rose-600 mt-0.5 shrink-0" size={24} />
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                            Returned for Revision · Reviewer Feedback
                          </span>
                          <p className="text-sm font-semibold text-rose-950 italic">
                            "{viewingNCAR.rejectionRemarks || latestSubmission?.leadReview?.comments || latestSubmission?.headReview?.comments || 'Please revise and provide updated implementation evidence.'}"
                          </p>
                          <div className="text-[11px] text-rose-700 font-medium pt-1">
                            Reviewer: {latestSubmission?.headReview?.reviewedBy || latestSubmission?.leadReview?.reviewedBy || 'Auditor'} · {latestSubmission?.headReview?.reviewedAt || latestSubmission?.leadReview?.reviewedAt ? new Date((latestSubmission.headReview?.reviewedAt || latestSubmission.leadReview?.reviewedAt)!).toLocaleString() : 'Recent'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Closed Banner */}
                    {stageInfo.stage === 'CLOSED' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                        <CheckCheck className="text-emerald-600 mt-0.5 shrink-0" size={24} />
                        <div>
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                            Finding Successfully Closed
                          </span>
                          <p className="text-sm text-emerald-950 font-normal mt-0.5">
                            Both Lead Auditor and Head Manager have approved the implementation evidence. This NCAR is complete and closed.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Two-Column Grid: Left = Approved Finding & Action Plan; Right = Implementation Evidence & Validation */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column: Finding & Approved Action Plan */}
                      <div className="space-y-6">
                        {/* Section 1: NCAR Finding */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 text-[#172554] font-bold text-sm uppercase tracking-wide border-b border-gray-100 pb-3">
                            <ClipboardList size={18} className="text-blue-600" />
                            <span>Audit Finding Details</span>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 font-semibold block mb-1">Nonconformity Statement</label>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-800 font-normal">
                              "{viewingNCAR.statement}"
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Finding Type</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800">
                                {viewingNCAR.findingType}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Standard Clause</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800">
                                {viewingNCAR.standardClause || 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Requirement</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800 truncate" title={viewingNCAR.requirement}>
                                {viewingNCAR.requirement}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Auditee Responsible</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800">
                                {viewingNCAR.auditee || 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Process</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800 truncate">
                                {viewingNCAR.processName || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Area / Dept</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800 truncate">
                                {viewingNCAR.area || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-semibold block mb-1">Auditor</span>
                              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg block font-medium text-gray-800 truncate">
                                {viewingNCAR.auditor || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Approved Corrective Action Plan */}
                        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-blue-50 pb-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm uppercase tracking-wide">
                              <CheckCircle2 size={18} className="text-emerald-600" />
                              <span>Approved Corrective Action Plan</span>
                            </div>
                            {viewingActionPlan && (
                              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {viewingActionPlan.id}
                              </span>
                            )}
                          </div>

                          {viewingActionPlan ? (
                            <div className="space-y-3 text-xs">
                              <div>
                                <span className="text-gray-500 font-semibold block mb-1">Immediate Correction (Containment)</span>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm font-normal text-gray-800">
                                  {viewingActionPlan.immediateCorrection || 'N/A'}
                                </div>
                              </div>

                              <div>
                                <span className="text-gray-500 font-semibold block mb-1">Root Cause Analysis</span>
                                <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-sm font-normal text-gray-800">
                                  {viewingActionPlan.rootCause || 'N/A'}
                                </div>
                              </div>

                              <div>
                                <span className="text-gray-500 font-semibold block mb-1">Corrective Strategy (CAP)</span>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm font-normal text-gray-800">
                                  {viewingActionPlan.correctiveAction || 'N/A'}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <span className="text-gray-500 font-semibold block mb-0.5">Person Responsible</span>
                                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                                    <User size={14} className="text-blue-500" />
                                    {viewingActionPlan.responsiblePerson || 'N/A'}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <span className="text-gray-500 font-semibold block mb-0.5">Implementation Due Date</span>
                                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-blue-500" />
                                    {viewingActionPlan.dueDate || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              {viewingActionPlan.remarks && (
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <span className="text-gray-500 font-semibold block mb-1">CAP Attachment</span>
                                  <span className="text-xs font-medium text-[#172554] flex items-center gap-1.5">
                                    <FileIcon size={14} className="text-blue-600" />
                                    {viewingActionPlan.remarks}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                              <p className="text-xs font-semibold">No formal action plan record linked yet.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Implementation Evidence Submission & Review History */}
                      <div className="space-y-6">
                        {/* Current Submission / Evidence Section */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 text-[#172554] font-bold text-sm uppercase tracking-wide">
                              <FileText size={18} className="text-blue-600" />
                              <span>Implementation Evidence</span>
                            </div>

                            {latestSubmission && !isEditingEvidence && (
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                                Version {latestSubmission.version}
                              </span>
                            )}
                          </div>

                          {/* Active Evidence Form (When Auditee is Submitting or Updating Evidence) */}
                          {isEditingEvidence ? (
                            <form onSubmit={handleSubmitEvidence} className="space-y-4">
                              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                                Upload implementation evidence (e.g. photos, logs, attendance, reports) and describe the actions completed according to the approved plan.
                              </div>

                              <div>
                                <label className="text-xs text-gray-700 font-bold block mb-1.5">
                                  Implementation Remarks & Details <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  required
                                  rows={4}
                                  value={evidenceRemarks}
                                  onChange={(e) => setEvidenceRemarks(e.target.value)}
                                  placeholder="Describe the actions implemented, containment results, and procedures updated..."
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-normal transition-all"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-700 font-bold block mb-1.5">
                                  Upload Implementation Evidence Files <span className="text-red-500">*</span>
                                </label>
                                
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  multiple
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  id="implementation-evidence-upload"
                                />

                                <label
                                  htmlFor="implementation-evidence-upload"
                                  className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                                >
                                  <FileUp size={24} className="text-blue-600" />
                                  <span className="text-xs font-bold text-blue-900">Click to choose files or browse</span>
                                  <span className="text-[11px] text-gray-500">Supports PDF, Word, Excel, Images, ZIP</span>
                                </label>

                                {evidenceFiles.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <span className="text-xs font-semibold text-gray-600 block">
                                      Attached Files ({evidenceFiles.length}):
                                    </span>
                                    <div className="space-y-1.5">
                                      {evidenceFiles.map((file, idx) => (
                                        <div 
                                          key={idx} 
                                          className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-medium text-gray-800"
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <FileIcon size={16} className="text-blue-600 shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                            {file.size && (
                                              <span className="text-[10px] text-gray-400 shrink-0">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                                            title="Remove file"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 flex justify-end gap-3">
                                {latestSubmission && (
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingEvidence(false)}
                                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  type="submit"
                                  className="flex items-center gap-2 px-6 py-2.5 bg-[#172554] hover:bg-[#1E3268] text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
                                >
                                  <Send size={16} />
                                  <span>{latestSubmission ? 'Resubmit for Validation' : 'Submit for Validation'}</span>
                                </button>
                              </div>
                            </form>
                          ) : latestSubmission ? (
                            /* Read-Only Display of Latest Submission */
                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div>
                                  Submitted by: <span className="font-semibold text-gray-800">{latestSubmission.submittedBy}</span>
                                </div>
                                <div>
                                  Date: <span className="font-semibold text-gray-800">{new Date(latestSubmission.submittedAt).toLocaleString()}</span>
                                </div>
                              </div>

                              <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Auditee Implementation Remarks</label>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm font-normal text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {latestSubmission.remarks}
                                </div>
                              </div>

                              <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">
                                  Attached Implementation Evidence ({latestSubmission.evidenceFiles?.length || 0})
                                </label>
                                {latestSubmission.evidenceFiles && latestSubmission.evidenceFiles.length > 0 ? (
                                  <div className="space-y-2">
                                    {latestSubmission.evidenceFiles.map((file, idx) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-center justify-between bg-blue-50/40 border border-blue-100 p-3 rounded-xl text-xs"
                                      >
                                        <div className="flex items-center gap-2.5 truncate">
                                          <FileIcon size={18} className="text-blue-600 shrink-0" />
                                          <span className="font-medium text-gray-800 truncate">{file.name}</span>
                                          {file.size && (
                                            <span className="text-[10px] text-gray-400">
                                              ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                          )}
                                        </div>
                                        {file.dataUrl ? (
                                          <a 
                                            href={file.dataUrl} 
                                            download={file.name}
                                            className="flex items-center gap-1 px-3 py-1 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-all shrink-0"
                                          >
                                            <Download size={13} />
                                            <span>Download</span>
                                          </a>
                                        ) : (
                                          <span className="text-[11px] font-semibold text-gray-400">Attached</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    No file attachments provided for this submission.
                                  </div>
                                )}
                              </div>

                              {/* Reviewer Decisions on Current Submission */}
                              <div className="space-y-3 pt-2">
                                <label className="text-xs text-gray-500 font-semibold block">Reviewer Assessments</label>
                                
                                {/* Lead Review Block */}
                                <div className={`p-3.5 rounded-xl border text-xs ${latestSubmission.leadReview ? (latestSubmission.leadReview.decision === 'Approved' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200') : 'bg-gray-50 border-gray-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-800">1. Lead Auditor Validation</span>
                                    {latestSubmission.leadReview ? (
                                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${latestSubmission.leadReview.decision === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {latestSubmission.leadReview.decision}
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                                        Pending Review
                                      </span>
                                    )}
                                  </div>
                                  {latestSubmission.leadReview ? (
                                    <div className="space-y-1">
                                      <p className="text-gray-700 italic">"{latestSubmission.leadReview.comments}"</p>
                                      <div className="text-[10px] text-gray-500">
                                        Reviewed by {latestSubmission.leadReview.reviewedBy} on {new Date(latestSubmission.leadReview.reviewedAt).toLocaleString()}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-[11px]">Awaiting Lead Auditor verification of evidence.</p>
                                  )}
                                </div>

                                {/* Head Manager Review Block */}
                                <div className={`p-3.5 rounded-xl border text-xs ${latestSubmission.headReview ? (latestSubmission.headReview.decision === 'Approved' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200') : 'bg-gray-50 border-gray-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-800">2. Head Manager Final Approval</span>
                                    {latestSubmission.headReview ? (
                                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${latestSubmission.headReview.decision === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {latestSubmission.headReview.decision}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                                        {latestSubmission.leadReview?.decision === 'Approved' ? 'Awaiting Head Review' : 'Pending Lead Approval'}
                                      </span>
                                    )}
                                  </div>
                                  {latestSubmission.headReview ? (
                                    <div className="space-y-1">
                                      <p className="text-gray-700 italic">"{latestSubmission.headReview.comments}"</p>
                                      <div className="text-[10px] text-gray-500">
                                        Reviewed by {latestSubmission.headReview.reviewedBy} on {new Date(latestSubmission.headReview.reviewedAt).toLocaleString()}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-[11px]">Final closure requires Head Manager approval after Lead Auditor verification.</p>
                                  )}
                                </div>
                              </div>

                              {/* Button for Auditee to update evidence if returned */}
                              {canAuditeeSubmit && (
                                <div className="pt-2">
                                  <button
                                    onClick={() => setIsEditingEvidence(true)}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#172554] hover:bg-[#1E3268] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all"
                                  >
                                    <RefreshCcw size={16} />
                                    <span>Update & Resubmit Evidence</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* No submissions yet */
                            <div className="py-10 text-center space-y-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                              <FileUp size={36} className="text-gray-400 mx-auto" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-700">No Implementation Evidence Submitted Yet</p>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                  The Corrective Action Plan has been approved. The Auditee must upload proof of implementation and submit for validation.
                                </p>
                              </div>
                              {canAuditeeSubmit && (
                                <button
                                  onClick={() => setIsEditingEvidence(true)}
                                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#172554] hover:bg-[#1E3268] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all mt-2"
                                >
                                  <FileUp size={16} />
                                  <span>Submit Implementation Evidence</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Submission History Section (Preserving Prior Submissions) */}
                        {historySubmissions.length > 0 && (
                          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                            <button
                              type="button"
                              onClick={() => setShowHistoryAccordion(!showHistoryAccordion)}
                              className="w-full flex items-center justify-between text-left font-bold text-sm text-[#172554]"
                            >
                              <div className="flex items-center gap-2">
                                <History size={18} className="text-blue-600" />
                                <span>Previous Submission History ({historySubmissions.length})</span>
                              </div>
                              {showHistoryAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {showHistoryAccordion && (
                              <div className="space-y-4 pt-3 border-t border-gray-100 text-xs divide-y divide-gray-100">
                                {historySubmissions.map((hist) => (
                                  <div key={hist.id} className="pt-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        Version {hist.version}
                                      </span>
                                      <span className="text-gray-500 text-[11px]">
                                        {new Date(hist.submittedAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-gray-800 font-normal italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                      "{hist.remarks}"
                                    </p>
                                    {hist.evidenceFiles && hist.evidenceFiles.length > 0 && (
                                      <div className="text-[11px] text-gray-500">
                                        Files: {hist.evidenceFiles.map(f => f.name).join(', ')}
                                      </div>
                                    )}
                                    {/* Reviewer feedback on this historical version */}
                                    {(hist.leadReview || hist.headReview) && (
                                      <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-100 space-y-1 text-[11px]">
                                        {hist.leadReview && (
                                          <div>
                                            <span className="font-bold text-rose-800">Lead Auditor ({hist.leadReview.decision}): </span>
                                            <span className="text-rose-950 italic">"{hist.leadReview.comments}"</span>
                                          </div>
                                        )}
                                        {hist.headReview && (
                                          <div>
                                            <span className="font-bold text-rose-800">Head Manager ({hist.headReview.decision}): </span>
                                            <span className="text-rose-950 italic">"{hist.headReview.comments}"</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/70 flex flex-wrap justify-between items-center gap-4 shrink-0">
                    <div className="text-xs font-semibold text-gray-500">
                      Audit Ref: <span className="text-blue-600 font-bold">{viewingNCAR.auditPlanId}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Lead Auditor Actions */}
                      {canLeadReview && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setLeadReviewDecision('Returned');
                              setLeadReviewComments('');
                              setShowLeadReviewModal(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                          >
                            <XCircle size={16} />
                            <span>Return for Revision</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLeadReviewDecision('Approved');
                              setLeadReviewComments('Implementation verified and recommended for Head Manager approval.');
                              setShowLeadReviewModal(true);
                            }}
                            className="flex items-center gap-2 px-7 py-3 bg-[#172554] hover:bg-[#1E3268] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                          >
                            <CheckCircle2 size={16} />
                            <span>Validate Implementation</span>
                          </button>
                        </>
                      )}

                      {/* Head Manager Actions */}
                      {canHeadReview && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setHeadReviewDecision('Returned');
                              setHeadReviewComments('');
                              setShowHeadReviewModal(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                          >
                            <XCircle size={16} />
                            <span>Return for Revision</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHeadReviewDecision('Approved');
                              setHeadReviewComments('Head Manager final approval granted. Finding officially closed.');
                              setShowHeadReviewModal(true);
                            }}
                            className="flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                          >
                            <CheckCheck size={16} />
                            <span>Final Approve & Close NCAR</span>
                          </button>
                        </>
                      )}

                      {/* Close detail button */}
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-5 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Lead Auditor Review Modal */}
      {showLeadReviewModal && viewingNCAR && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${leadReviewDecision === 'Approved' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                  {leadReviewDecision === 'Approved' ? <ShieldCheck size={26} /> : <AlertTriangle size={26} />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {leadReviewDecision === 'Approved' ? 'Validate Implementation Evidence' : 'Return Implementation for Revision'}
                  </h4>
                  <p className="text-xs text-gray-500">Ref: {viewingNCAR.id}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                  {leadReviewDecision === 'Approved' ? 'Validation Remarks (Optional)' : 'Revision Feedback (Required)'}
                </label>
                <textarea
                  required={leadReviewDecision === 'Returned'}
                  rows={4}
                  value={leadReviewComments}
                  onChange={(e) => setLeadReviewComments(e.target.value)}
                  placeholder={leadReviewDecision === 'Approved' ? 'Confirming that implementation evidence fulfills the corrective action plan...' : 'Specify which evidence is lacking or what adjustments are needed...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeadReviewModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={finalizeLeadReview}
                  disabled={leadReviewDecision === 'Returned' && !leadReviewComments.trim()}
                  className={`flex-[1.5] px-4 py-2.5 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md disabled:opacity-50 ${leadReviewDecision === 'Approved' ? 'bg-[#172554] hover:bg-[#1E3268]' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {leadReviewDecision === 'Approved' ? 'Confirm & Forward' : 'Return for Revision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Head Manager Final Review Modal */}
      {showHeadReviewModal && viewingNCAR && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${headReviewDecision === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {headReviewDecision === 'Approved' ? <CheckCheck size={26} /> : <AlertTriangle size={26} />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {headReviewDecision === 'Approved' ? 'Final Approve & Close NCAR' : 'Return Implementation for Revision'}
                  </h4>
                  <p className="text-xs text-gray-500">Ref: {viewingNCAR.id}</p>
                </div>
              </div>

              {headReviewDecision === 'Approved' && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900 font-medium">
                  Approving this will officially mark the nonconformity as <strong>Closed</strong>. Both Lead Auditor and Head Manager approvals will be recorded.
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                  {headReviewDecision === 'Approved' ? 'Closure Comments (Optional)' : 'Revision Feedback (Required)'}
                </label>
                <textarea
                  required={headReviewDecision === 'Returned'}
                  rows={4}
                  value={headReviewComments}
                  onChange={(e) => setHeadReviewComments(e.target.value)}
                  placeholder={headReviewDecision === 'Approved' ? 'Final closure authorized...' : 'State the reason for return and requested corrections...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHeadReviewModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={finalizeHeadReview}
                  disabled={headReviewDecision === 'Returned' && !headReviewComments.trim()}
                  className={`flex-[1.5] px-4 py-2.5 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md disabled:opacity-50 ${headReviewDecision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {headReviewDecision === 'Approved' ? 'Confirm Closure' : 'Return for Revision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationModule;
