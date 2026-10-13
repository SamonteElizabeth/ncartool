import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NCAR, ActionPlan, NCARStatus, Role, User as UserRecord } from '../types';
import { getResponseSlaStatus } from '../utils/ncarSla';
import { 
  AlertCircle, 
  FileUp, 
  Send, 
  User, 
  Calendar, 
  ShieldCheck, 
  XCircle, 
  X, 
  Edit3, 
  Eye, 
  Search, 
  Filter, 
  Check,
  MessageSquare,
  AlertTriangle,
  PlusCircle,
  RefreshCcw,
  ArrowRight,
  Eraser,
  Undo2,
  ClipboardList,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface ActionPlanModuleProps {
  ncars: NCAR[];
  actionPlans: ActionPlan[];
  setActionPlans: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  role: Role;
  users: UserRecord[];
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

const ActionPlanModule: React.FC<ActionPlanModuleProps> = ({ ncars, actionPlans, setActionPlans, setNcars, role, users, onNotify }) => {
  const [selectedNCAR, setSelectedNCAR] = useState<NCAR | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [isCreatingActionPlan, setIsCreatingActionPlan] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  const getToday = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const initialApFormData = {
    correction: '',
    rootCause: '',
    actionPlan: '',
    responsible: '',
    correctionResponsible: '',
    correctionAdditionalAuditeeResponsible: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
  
  const isLead = role === 'LEAD_AUDITOR' || role === 'HEAD_MANAGER';
  const isHeadManager = role === 'HEAD_MANAGER';
  const isAuditor = role === 'AUDITOR';
  const isAuditee = role === 'AUDITEE';
  const isReadOnly = isLead || isAuditor;

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
    if (selectedNCAR) {
      const existingPlan = actionPlans.find(ap => ap.ncarId === selectedNCAR.id);
      if (existingPlan) {
        setApFormData({
          correction: existingPlan.immediateCorrection,
          rootCause: existingPlan.rootCause,
          actionPlan: existingPlan.correctiveAction,
          responsible: existingPlan.capResponsible || existingPlan.responsiblePerson,
          correctionResponsible: existingPlan.correctionResponsible || '',
          correctionAdditionalAuditeeResponsible: existingPlan.correctionAdditionalAuditeeResponsible || '',
          dueDate: existingPlan.capTargetDate || existingPlan.dueDate,
          correctionTargetDate: existingPlan.correctionTargetDate || '',
          responseDate: existingPlan.responseDate || getToday(),
          consequenceImpact: existingPlan.consequenceImpact || '',
          canOccurElsewhere: existingPlan.canOccurElsewhere || 'No',
          elsewhereDetails: existingPlan.elsewhereDetails || '',
          capTargetDate: existingPlan.capTargetDate || '',
          additionalAuditeeResponsible: existingPlan.additionalAuditeeResponsible || '',
          attachmentName: existingPlan.remarks || '' 
        });
      } else {
        const defaultResponsible = selectedNCAR.managerResponsible || selectedNCAR.auditee || '';
        setApFormData({
          ...initialApFormData,
          responsible: defaultResponsible,
          correctionResponsible: defaultResponsible,
          correctionAdditionalAuditeeResponsible: ''
        });
      }
    }
  }, [selectedNCAR, actionPlans]);

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

  const filteredNCARs = useMemo(() => {
    let base = (isLead || isAuditor)
      ? ncars.filter(n => n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED || n.status === NCARStatus.CLOSED || n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED)
      : ncars.filter(n => n.status === NCARStatus.APPROVED || n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED || n.status === NCARStatus.CLOSED || n.status === NCARStatus.REJECTED || n.status === NCARStatus.REOPENED);

    return base.filter(ncar => {
      const matchesSearch = 
        ncar.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncar.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncar.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ncar.auditee && ncar.auditee.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === 'All Status' || 
        (statusFilter === 'Approved' && ncar.status === NCARStatus.CLOSED) ||
        (statusFilter === 'Rejected' && (ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED)) ||
        (statusFilter === 'For Approval' && (ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED)) ||
        (statusFilter === 'Pending' && (ncar.status === NCARStatus.PENDING || ncar.status === NCARStatus.ACTION_PLAN_SUBMITTED || ncar.status === NCARStatus.CAP_LEAD_APPROVED)) ||
        ncar.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType = 
        typeFilters.length === 0 || 
        typeFilters.includes(ncar.findingType);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [ncars, searchQuery, statusFilter, typeFilters, isLead, isAuditor]);

  const initiateFreshPlan = () => {
    setApFormData(initialApFormData);
    setIsCreatingActionPlan(true);
    onNotify("Started a fresh action plan draft.", "info");
  };

  const handleCloseAction = () => {
    setSelectedNCAR(null);
    setIsCreatingActionPlan(false);
    setApFormData(initialApFormData);
  };

  const saveActionPlan = (isDraft: boolean) => {
    if (!selectedNCAR || isReadOnly) return;
    const additionalAuditee = apFormData.additionalAuditeeResponsible.trim();
    const correctionAdditionalAuditee = apFormData.correctionAdditionalAuditeeResponsible.trim();
    const isAuditeeUser = (name: string) => users.some(user => user.role === 'AUDITEE' && user.name.toLowerCase() === name.toLowerCase());
    if ((additionalAuditee && !isAuditeeUser(additionalAuditee)) || (correctionAdditionalAuditee && !isAuditeeUser(correctionAdditionalAuditee))) {
      onNotify('Choose an existing user with the Auditee role for each additional responsible person.', 'warning');
      return;
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existingPlan = actionPlans.find(ap => ap.ncarId === selectedNCAR.id);
    const newAP: ActionPlan = {
      id: existingPlan?.id || `ACT_${String(actionPlans.length + 1).padStart(6, '0')}_${timestamp}`,
      ncarId: selectedNCAR.id,
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

    setActionPlans(prev => [...prev.filter(ap => ap.ncarId !== selectedNCAR.id), newAP]);
    if (!isDraft) {
      setNcars(prev => prev.map(n => n.id === selectedNCAR.id ? { ...n, status: NCARStatus.ACTION_PLAN_SUBMITTED, responseAt: n.responseAt || new Date().toISOString(), responseSla: n.responseSla ? { ...n.responseSla, status: 'Submitted' } : undefined, rejectionRemarks: undefined } : n));
    } else if (selectedNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED || selectedNCAR.status === NCARStatus.CAP_LEAD_APPROVED) {
      setNcars(prev => prev.map(n => n.id === selectedNCAR.id ? { ...n, status: NCARStatus.APPROVED } : n));
    }
    
    handleCloseAction();
    onNotify(isDraft ? `CAP for ${selectedNCAR.id} saved as a draft.` : `CAP for ${selectedNCAR.id} submitted for review.`, 'success');
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    saveActionPlan(false);
  };

  const finalizeRejection = () => {
    if (!selectedNCAR || !rejectionRemarks.trim()) return;
    setNcars(prev => prev.map(n => n.id === selectedNCAR.id ? { ...n, status: NCARStatus.REOPENED, rejectionRemarks: rejectionRemarks } : n));
    onNotify(`Plan for ${selectedNCAR.id} Rejected: ${rejectionRemarks}`, 'warning');
    handleCloseAction();
    setShowRejectModal(false);
    setRejectionRemarks('');
  };

  const handleApprove = () => {
    if (!selectedNCAR) return;
    const isLeadApproval = role === 'LEAD_AUDITOR' && selectedNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED;
    const isFinalApproval = role === 'HEAD_MANAGER' && selectedNCAR.status === NCARStatus.CAP_LEAD_APPROVED;
    if (!isLeadApproval && !isFinalApproval) return;
    const nextStatus = isLeadApproval ? NCARStatus.CAP_LEAD_APPROVED : NCARStatus.CLOSED;
    setNcars(prev => prev.map(n => n.id === selectedNCAR.id ? { ...n, status: nextStatus, rejectionRemarks: undefined } : n));
    onNotify(isLeadApproval ? `CAP for ${selectedNCAR.id} approved by Lead Auditor and sent to Head Manager.` : `CAP for ${selectedNCAR.id} approved by Head Manager.`, 'success');
    handleCloseAction();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setApFormData({ ...apFormData, attachmentName: e.target.files[0].name });
    }
  };

  const pendingCount = ncars.filter(n => isHeadManager ? n.status === NCARStatus.CAP_LEAD_APPROVED : n.status === NCARStatus.ACTION_PLAN_SUBMITTED).length;
  const statusOptions = [
    { label: 'All Status', count: ncars.length },
    { label: 'Approved', count: ncars.filter(n => n.status === NCARStatus.CLOSED).length },
    { label: 'Rejected', count: ncars.filter(n => n.status === NCARStatus.REJECTED || n.status === NCARStatus.REOPENED).length },
    ...(isAuditee
      ? [{ label: 'Pending', count: ncars.filter(n => n.status === NCARStatus.PENDING || n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED).length }]
      : [{ label: 'Pending', count: ncars.filter(n => n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED).length }])
  ];
  const statusCards = statusOptions.map(({ label, count }) => {
    const selected = statusFilter === label;
    const palette = label === 'Approved'
      ? { icon: CheckCircle2, title: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700', stripe: 'bg-emerald-500', selected: 'ring-2 ring-emerald-100 border-emerald-200' }
      : label === 'Rejected'
        ? { icon: XCircle, title: 'text-rose-700', badge: 'bg-rose-50 text-rose-700', stripe: 'bg-rose-500', selected: 'ring-2 ring-rose-100 border-rose-200' }
        : label === 'Pending' || label === 'For Approval'
          ? { icon: Clock, title: 'text-amber-700', badge: 'bg-amber-50 text-amber-700', stripe: 'bg-orange-400', selected: 'ring-2 ring-orange-100 border-orange-200' }
        : { icon: ClipboardList, title: 'text-[#172554]', badge: 'bg-indigo-50 text-[#172554]', stripe: 'bg-[#172554]', selected: 'ring-2 ring-indigo-100 border-indigo-200' };
    const StatusIcon = palette.icon;
    const caption = label === 'All Status' ? 'All action plans' : label === 'Approved' ? 'Successfully completed' : label === 'Rejected' ? 'Requires revision' : label === 'Pending' ? (isAuditee ? 'Awaiting action plan' : 'Awaiting review') : 'Awaiting review';

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
          <span className="truncate text-xs font-medium text-slate-600">{label}</span>
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
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Corrective Action Plan</h3>
        </div>
        {isLead && (
          <div className="bg-blue-50 px-5 py-3 rounded-xl border border-blue-100 flex items-center gap-3">
            <div className="w-3 h-3 bg-[#172554] rounded-full animate-pulse"></div>
            <span className="text-sm font-black text-blue-700 uppercase tracking-wide">{pendingCount} Review(s) Requested</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#f3e7d3] bg-[#fff8e9] p-2 shadow-sm">
        <div className={`grid w-full grid-cols-2 auto-rows-fr items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 ${statusOptions.length > 4 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`} role="group" aria-label="Filter by action plan status">
          {statusCards}
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          <input 
            type="text" 
            placeholder="Search plans..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            title="Search by NCAR ID, ACP ID, requirement, or auditee"
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-normal"
          />
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-3 relative" ref={filterRef}>
          <div className="relative group/tooltip inline-block">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              title="Filter findings by type (Major, Minor, OFI)"
              aria-label="Filter findings by type"
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${typeFilters.length > 0 || showFilters ? 'bg-blue-50 border-blue-200 text-[#172554]' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}
            >
              <Filter size={20} /> Filters
            </button>
            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
              <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                Filter by Finding Type
              </span>
              <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
            </div>
          </div>
          {showFilters && (
            <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-40">
              <span className="text-sm font-bold text-gray-400 uppercase block mb-3 pb-2 border-b">Finding Types</span>
              {['Major', 'Minor', 'OFI'].map(type => (
                <label key={type} className="text-sm text-[#4B5563] font-medium flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <span className="text-sm font-medium text-[#4B5563]">{type}</span>
                  <input type="checkbox" className="w-4 h-4 rounded text-[#172554] font-normal" checked={typeFilters.includes(type)} onChange={() => toggleTypeFilter(type)} />
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
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Finding Type</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Requirement</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Corrective Action Plan</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Auditee</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Response Date</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Deadline</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Status</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[#4B5563]">
                {filteredNCARs.length === 0 ? (
                  <tr><td colSpan={10} className="px-8 py-12 text-center text-gray-400 font-medium text-sm">No matching items.</td></tr>
                ) : (
                  filteredNCARs.map(n => (
                    <tr key={n.id} className="hover:bg-blue-50/20 transition-all group">
                      {(() => {
                        const ap = actionPlans.find(a => a.ncarId === n.id);
                        const formatted = ap ? ap.id.replace(/^ACT_/, 'ACP__') : '-';
                        return (
                          <>
                            <td className="px-5 py-4"><span className="text-sm font-bold text-[#172554] bg-blue-50 px-2 py-1 rounded border border-blue-100">{n.id}</span></td>
                            <td className="px-5 py-4"><span className="text-sm font-bold text-[#4B5563] bg-gray-50 px-2 py-1 rounded border border-gray-100">{formatted}</span></td>
                          </>
                        );
                      })()}
                    <td className="px-5 py-4"><span className={`text-xs font-medium px-3 py-1 rounded-full uppercase border ${n.findingType === 'Major' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-[#172554] border-blue-100'}`}>{n.findingType}</span></td>
                    <td className="px-5 py-4"><p className="font-normal text-gray-700 text-sm line-clamp-1">{n.requirement}</p></td>
                    <td className="px-5 py-4 max-w-[260px]">
                      {(() => {
                        const plan = actionPlans.find(item => item.ncarId === n.id);
                        if (!plan || plan.isDraft) return <span className="text-xs text-gray-400">{plan ? 'Draft — not submitted' : 'Not submitted'}</span>;
                        return <p className="line-clamp-2 text-sm text-gray-700" title={plan.correctiveAction}>{plan.correctiveAction || 'CAP submitted'}</p>;
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {(n.auditee || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-normal text-gray-700 whitespace-nowrap max-w-[130px] truncate" title={n.auditee}>
                          {n.auditee || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-gray-600 whitespace-nowrap">{(() => { const ap = actionPlans.find(plan => plan.ncarId === n.id); return ap && !ap.isDraft && ap.submittedAt ? new Date(ap.submittedAt).toLocaleDateString() : '—'; })()}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="text-sm font-normal text-gray-600">{n.deadline ? new Date(`${(n.responseSla?.dueDate || n.deadline).slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'}</div>
                      {getResponseSlaStatus(n) ? <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getResponseSlaStatus(n) === 'Overdue' ? 'border-red-200 bg-red-50 text-red-700' : getResponseSlaStatus(n) === 'Due Soon' ? 'border-amber-200 bg-amber-50 text-amber-700' : getResponseSlaStatus(n) === 'Submitted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>{getResponseSlaStatus(n)}</span> : <div className="text-xs font-medium text-[#172554] uppercase mt-1">{n.deadline ? `${getDaysRemaining(n.deadline)} days left` : 'Not assigned'}</div>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full uppercase border ${n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-100' : n.status === NCARStatus.CLOSED ? 'bg-green-50 text-green-600 border-green-100' : n.status === NCARStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-[#172554] border-blue-100'}`}>
                        {n.status === NCARStatus.CLOSED ? 'Approved' : n.status === NCARStatus.REOPENED ? 'Rejected' : n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED ? 'Pending' : n.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        const actionTooltip = isReadOnly 
                          ? "View Action Plan" 
                          : isAuditee && (n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED)
                            ? "Revise Action Plan" 
                          : isAuditee && (n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED)
                              ? "Edit Corrective Action Plan"
                              : isAuditee && n.status === NCARStatus.PENDING
                              ? "Create Action Plan"
                          : n.status === NCARStatus.ACTION_PLAN_SUBMITTED || n.status === NCARStatus.CAP_LEAD_APPROVED
                                ? (isLead ? "Review & Approve Action Plan" : "View Action Plan")
                                : n.status === NCARStatus.CLOSED
                                  ? "View Approved Plan"
                                  : "Edit Action Plan";

                        return (
                          <div className="relative group/tooltip inline-flex justify-center items-center">
                            <button 
                              onClick={() => setSelectedNCAR(n)}
                              title={actionTooltip}
                              aria-label={actionTooltip}
                              className={`p-3 rounded-2xl transition-all border ${
                                isAuditee && (n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED)
                                ? 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
                                : 'text-[#172554] bg-blue-50 border-blue-100 hover:bg-blue-100'
                              }`}
                            >
                              {isReadOnly ? <Eye size={20} /> : (n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED ? <RefreshCcw size={20} /> : <Edit3 size={20} />)}
                            </button>
                            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                              <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                                {actionTooltip}
                              </span>
                              <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedNCAR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[94vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {!isCreatingActionPlan ? (
              <>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl text-white shadow-xl ${selectedNCAR.status === NCARStatus.REOPENED || selectedNCAR.status === NCARStatus.REJECTED ? 'bg-red-600' : 'bg-[#172554]'}`}>
                      <ClipboardList size={32} />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-gray-800 tracking-tight">NCAR and CAP Details</h4>
                      <p className="text-sm font-bold text-gray-400 uppercase mt-1">Ref ID: {selectedNCAR.id}</p>
                    </div>
                  </div>
                  <div className="relative group/tooltip inline-block">
                    <button onClick={handleCloseAction} title="Close detail window" aria-label="Close" className="p-3 text-gray-400 hover:text-gray-800 bg-white rounded-full border border-gray-100 transition-all">
                      <X size={24} />
                    </button>
                    <div className="pointer-events-none absolute bottom-full mb-2 right-0 hidden group-hover/tooltip:flex flex-col items-end z-30 transition-all duration-150">
                      <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                        Close
                      </span>
                      <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1 mr-3"></span>
                    </div>
                  </div>
                </div>

                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-5">
                    {selectedNCAR.rejectionRemarks && (
                      <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 flex items-start gap-5 shadow-sm">
                        <AlertTriangle className="text-red-600 mt-1 flex-shrink-0" size={24} />
                        <div>
                          <span className="text-sm font-black text-red-600 uppercase tracking-widest block mb-1">Feedback from Auditor</span>
                          <p className="text-base font-bold text-red-900 italic leading-relaxed">"{selectedNCAR.rejectionRemarks}"</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[#172554] font-black uppercase text-m border-b-2 border-blue-100 pb-3"><ClipboardList size={18} /> NCAR Details</div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">NCAR ID</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.id}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Status</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.status}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Audit Type</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.auditType}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Finding Type</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.findingType}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Process</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.processInvolved || selectedNCAR.processName || 'N/A'}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Department / Area</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.departmentResponsible || selectedNCAR.area || 'N/A'}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Requirement / Clause</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.requirement}{selectedNCAR.clauseNumber ? ` · ${selectedNCAR.clauseNumber}` : ''}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">NCAR Response Due Date</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{new Date(selectedNCAR.deadline).toLocaleDateString()}</div></div>
                      <div className="sm:col-span-2"><label className="text-sm text-[#4B5563] font-bold block mb-1">Nonconformity Statement</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal whitespace-pre-wrap">{selectedNCAR.statement}</div></div>
                      <div className="sm:col-span-2"><label className="text-sm text-[#4B5563] font-bold block mb-1">Objective Evidence</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal whitespace-pre-wrap">{selectedNCAR.evidence}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Issuing Auditor</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.issuingAuditor || selectedNCAR.auditor || 'N/A'}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Auditee / Manager</label><div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm font-normal">{selectedNCAR.managerResponsible || selectedNCAR.auditee || 'N/A'}</div></div>
                    </div>
                  </div>
                    <div className="space-y-5">
                    <div className="flex items-center gap-3 text-green-600 font-black uppercase text-m border-b-2 border-green-100 pb-3"><CheckCircle2 size={18} /> Corrective Action Plan (CAP)</div>
                    <div className="space-y-6">
                      {isReadOnly || actionPlans.find(ap => ap.ncarId === selectedNCAR.id) ? (
                        (() => {
                          const ap = actionPlans.find(a => a.ncarId === selectedNCAR.id);
                          return (
                            <>
                              {ap && (
                                <div>
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div><label className="text-sm text-[#4B5563] font-bold mb-1">CAP Number</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal">{ap.id.replace(/^ACT_/, 'CAP_')}</div></div>
                                    <div><label className="text-sm text-[#4B5563] font-bold block mb-1">CAP Person Responsible</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal">{ap.capResponsible || ap.responsiblePerson}</div></div>
                                  </div>
                                </div>
                              )}
                              {ap?.isDraft && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">CAP saved as draft</div>}
                              {ap && <>
                                <div className="grid grid-cols-2 gap-3"><div><label className="text-sm text-[#4B5563] font-bold block mb-2">Response Date</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.responseDate || 'N/A'}</div></div><div><label className="text-sm text-[#4B5563] font-bold block mb-2">CAP Submitted On</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.isDraft ? 'Not submitted' : new Date(ap.submittedAt).toLocaleDateString()}</div></div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Consequence / Impact to Process or Business Unit</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal whitespace-pre-wrap">{ap.consequenceImpact || 'N/A'}</div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Immediate Correction</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal whitespace-pre-wrap">{ap.immediateCorrection || 'N/A'}</div></div>
                                <div className="grid grid-cols-2 gap-3"><div><label className="text-sm text-[#4B5563] font-bold block mb-2">Correction Person Responsible</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.correctionResponsible || 'N/A'}</div></div><div><label className="text-sm text-[#4B5563] font-bold block mb-2">Correction Target Date</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.correctionTargetDate || 'N/A'}</div></div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Additional Auditee for Immediate Correction</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.correctionAdditionalAuditeeResponsible || 'Not assigned'}</div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Root Cause Analysis</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal whitespace-pre-wrap">{ap.rootCause || 'N/A'}</div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Can the NC occur elsewhere?</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.canOccurElsewhere || 'N/A'}{ap.elsewhereDetails ? ` · ${ap.elsewhereDetails}` : ''}</div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Corrective Action Plan</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal whitespace-pre-wrap">{ap.correctiveAction || 'N/A'}</div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">CAP Target Date</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.capTargetDate || ap.dueDate}</div></div>
                                <div><label className="text-sm text-[#4B5563] font-bold block mb-2">Additional Auditee for CAP</label><div className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-normal">{ap.additionalAuditeeResponsible || 'Not assigned'}</div></div>
                              </>}
                              {ap && ap.remarks && (
                                <div className="mt-4"><label className="text-sm text-[#4B5563] font-bold block mb-2">Action Plan Attachment</label><div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm font-normal text-gray-800"><FileUp className="inline-block mr-2" /> <a href={`/${ap.remarks}`} target="_blank" rel="noopener noreferrer" className="underline text-[#172554]">{ap.remarks}</a></div></div>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200"><Clock size={48} className="text-gray-300 mb-4" /><p className="text-gray-400 font-black uppercase text-xs tracking-widest">Plan Pending Submission</p></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <div className="text-xs font-bold text-gray-400">Audit Ref: <span className="text-blue-500 font-black">{selectedNCAR.auditPlanId}</span></div>
                  <div className="flex gap-4">
                    {((role === 'LEAD_AUDITOR' && selectedNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED) || (role === 'HEAD_MANAGER' && selectedNCAR.status === NCARStatus.CAP_LEAD_APPROVED)) && (
                      <>
                        <div className="relative group/tooltip inline-block">
                          <button onClick={() => setShowRejectModal(true)} title="Reject Action Plan and request revision" aria-label="Reject Action Plan" className="flex items-center gap-2 px-10 py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all uppercase text-xs tracking-widest shadow-lg shadow-red-50">
                            <XCircle size={18} /> Reject
                          </button>
                          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                            <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                              Reject Action Plan
                            </span>
                            <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                          </div>
                        </div>
                        <div className="relative group/tooltip inline-block">
                          <button onClick={handleApprove} title={isHeadManager ? "Final approval of CAP" : "Approve CAP and send to Head Manager"} aria-label={isHeadManager ? "Final approval of CAP" : "Approve CAP and send to Head Manager"} className="flex items-center gap-2 px-12 py-4 bg-[#172554] text-white rounded-2xl font-bold hover:bg-[#1E3268] shadow-2xl uppercase text-xs tracking-widest">
                            <CheckCircle2 size={18} /> {isHeadManager ? 'Final Approve' : 'Approve & Forward'}
                          </button>
                          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                            <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                              {isHeadManager ? 'Final approval by Head Manager' : 'Approve CAP and forward to Head Manager'}
                            </span>
                            <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                          </div>
                        </div>
                      </>
                    )}
                    {isAuditee && (selectedNCAR.status === NCARStatus.REOPENED || selectedNCAR.status === NCARStatus.REJECTED) && (
                      <div className="flex gap-3">
                        <div className="relative group/tooltip inline-block">
                          <button onClick={initiateFreshPlan} title="Start fresh action plan" aria-label="Create New Plan" className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-blue-100 text-[#172554] rounded-2xl font-bold hover:bg-blue-50 transition-all uppercase text-xs tracking-widest shadow-lg shadow-blue-50">
                            <PlusCircle size={20} /> Create New Plan
                          </button>
                          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                            <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                              Start New Plan
                            </span>
                            <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                          </div>
                        </div>
                        <div className="relative group/tooltip inline-block">
                          <button onClick={() => setIsCreatingActionPlan(true)} title="Modify previously submitted action plan" aria-label="Edit Previous Plan" className="flex items-center gap-3 px-10 py-4 bg-[#172554] text-white rounded-2xl font-bold hover:bg-[#1E3268] shadow-2xl uppercase text-xs tracking-widest">
                            <RefreshCcw size={20} /> Edit Previous Plan
                          </button>
                          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                            <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                              Edit Previous Plan
                            </span>
                            <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                          </div>
                        </div>
                      </div>
                    )}
                    {isAuditee && selectedNCAR.status === NCARStatus.APPROVED && (
                      <div className="relative group/tooltip inline-block">
                        <button onClick={() => setIsCreatingActionPlan(true)} title="Begin creating action plan" aria-label="Start Action Plan" className="flex items-center gap-3 px-12 py-4 bg-[#172554] text-white rounded-2xl font-bold hover:bg-[#1E3268] shadow-2xl uppercase text-xs tracking-widest">
                          Start Action Plan <ArrowRight size={20} />
                        </button>
                        <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                          <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                            Create Action Plan
                          </span>
                          <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                        </div>
                      </div>
                    )}
                    {isAuditee && (selectedNCAR.status === NCARStatus.ACTION_PLAN_SUBMITTED || selectedNCAR.status === NCARStatus.CAP_LEAD_APPROVED) && (
                      <button onClick={() => setIsCreatingActionPlan(true)} title="Edit submitted CAP" aria-label="Edit submitted CAP" className="flex items-center gap-2 rounded-2xl bg-[#172554] px-8 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-[#1E3268]">
                        <Edit3 size={18} /> Edit CAP
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmitAction} className="text-sm text-[#4B5563] font-medium">
  <div className="p-6 flex justify-between items-center border-b border-gray-100"><div className="flex items-center gap-4"><div className="bg-[#172554] p-3 rounded-2xl text-white shadow-lg"><Edit3 size={24} /></div><div><h4 className="text-2xl font-bold text-gray-800 tracking-tight">{selectedNCAR.rejectionRemarks ? 'CAP Revision' : 'Corrective Action Plan (CAP)'}</h4><p className="text-sm text-gray-500">NCARTool · Ref: {selectedNCAR.id}</p></div></div><button type="button" onClick={() => setIsCreatingActionPlan(false)} aria-label="Close CAP form" className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full"><X size={24} /></button></div>
  <div className="p-6 space-y-5 max-h-[76vh] overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
    {selectedNCAR.rejectionRemarks && <div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-xs font-semibold uppercase text-red-600">Review feedback</p><p className="mt-1 text-sm text-red-800">{selectedNCAR.rejectionRemarks}</p></div>}
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase text-blue-900">NCAR finding</p><p className="mt-1 text-sm text-gray-700">{selectedNCAR.statement}</p></div>
    <datalist id="cap-responsible-people"><option value="Bob Johnson" /><option value="Charlie Davis" /><option value="Sarah Wilson" /><option value="Michael Brown" /><option value="Alex Johnson" /><option value="Alice Smith" /></datalist>
    <datalist id="cap-auditee-people">{users.filter(user => user.role === 'AUDITEE').map(user => <option key={user.id} value={user.name} />)}</datalist>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Impact Assessment</h5><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Response Date</span><input required type="date" value={apFormData.responseDate} onChange={e => setApFormData({...apFormData, responseDate: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Consequence/Impact to Process or Business Unit</span><textarea required rows={3} value={apFormData.consequenceImpact} onChange={e => setApFormData({...apFormData, consequenceImpact: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Describe the effect on the process or business unit." /></label></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Immediate Correction</h5><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Immediate Correction</span><textarea required rows={3} value={apFormData.correction} onChange={e => setApFormData({...apFormData, correction: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Describe the immediate steps taken to address the NC." /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Person Responsible <span className="font-normal text-gray-400">(Manager default)</span></span><input required list="cap-responsible-people" value={apFormData.correctionResponsible} onChange={e => setApFormData({...apFormData, correctionResponsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search or enter a name" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Correction Target Date</span><input required type="date" value={apFormData.correctionTargetDate} onChange={e => setApFormData({...apFormData, correctionTargetDate: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Additional Person Responsible (Auditee) <span className="font-normal text-gray-400">(Optional)</span></span><input list="cap-auditee-people" value={apFormData.correctionAdditionalAuditeeResponsible} onChange={e => setApFormData({...apFormData, correctionAdditionalAuditeeResponsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search auditees by name" /></label></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Root Cause Analysis</h5><div className="space-y-4"><label className="block space-y-1.5 text-xs font-medium text-gray-600"><span>Root Cause Analysis</span><textarea required rows={4} value={apFormData.rootCause} onChange={e => setApFormData({...apFormData, rootCause: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Identify the underlying cause." /></label><fieldset><legend className="mb-2 text-xs font-medium text-gray-600">Can the NC occur elsewhere?</legend><div className="flex gap-5">{(['Yes', 'No'] as const).map(answer => <label key={answer} className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="cap-occurs-elsewhere" required checked={apFormData.canOccurElsewhere === answer} onChange={() => setApFormData({...apFormData, canOccurElsewhere: answer})} />{answer}</label>)}</div></fieldset>{apFormData.canOccurElsewhere === 'Yes' && <label className="block space-y-1.5 text-xs font-medium text-gray-600"><span>Details</span><textarea required rows={3} value={apFormData.elsewhereDetails} onChange={e => setApFormData({...apFormData, elsewhereDetails: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Identify other processes or business units that may be affected." /></label>}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h5 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#172554]">Corrective Action Plan</h5><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Corrective Action Plan</span><textarea required rows={4} value={apFormData.actionPlan} onChange={e => setApFormData({...apFormData, actionPlan: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Describe the actions that will prevent recurrence." /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>Person Responsible <span className="font-normal text-gray-400">(Manager default)</span></span><input required list="cap-responsible-people" value={apFormData.responsible} onChange={e => setApFormData({...apFormData, responsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search or enter a name" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600"><span>CAP Target Date</span><input required type="date" value={apFormData.capTargetDate} onChange={e => setApFormData({...apFormData, capTargetDate: e.target.value, dueDate: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1.5 text-xs font-medium text-gray-600 sm:col-span-2"><span>Additional Person Responsible (Auditee) <span className="font-normal text-gray-400">(Optional)</span></span><input list="cap-auditee-people" value={apFormData.additionalAuditeeResponsible} onChange={e => setApFormData({...apFormData, additionalAuditeeResponsible: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" placeholder="Search auditees by name" /></label></div></section>
  </div>
  <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 bg-white p-5 sm:px-6"><button type="button" onClick={() => saveActionPlan(true)} className="rounded-lg border border-[#172554] bg-white px-5 py-2.5 text-sm font-semibold text-[#172554] hover:bg-blue-50">Save as Draft</button><button type="submit" className="flex items-center gap-2 rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Send size={16} /> Submit</button></div>
</form>
            )}
          </div>
        </div>
      )}

      {showRejectModal && selectedNCAR && (() => {
        const ap = actionPlans.find(a => a.ncarId === selectedNCAR.id);
        return (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-red-50">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-5"><div className="p-4 bg-red-50 rounded-2xl text-red-600"><AlertTriangle size={36} /></div><div><h4 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Rejection Log</h4><p className="text-sm font-medium text-gray-400 tracking-wider mt-1">Ref: {selectedNCAR.id}</p></div></div>

                {ap ? (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">ACP Number</label><div className="text-sm font-bold text-gray-800">{ap.id.replace(/^ACT_/, 'ACP__')}</div></div>
                      <div><label className="text-sm text-[#4B5563] font-bold block mb-1">Auditee</label><div className="text-sm font-bold text-gray-800">{ap.responsiblePerson}</div></div>
                    </div>
                    <div className="mt-4"><label className="text-sm text-[#4B5563] font-bold block mb-1">Root Cause</label><div className="text-sm font-normal text-gray-800">{ap.rootCause || 'N/A'}</div></div>
                    <div className="mt-4"><label className="text-sm text-[#4B5563] font-bold block mb-1">Corrective Strategy</label><div className="text-sm font-normal text-gray-800">{ap.correctiveAction || 'N/A'}</div></div>
                    {ap.remarks && (
                      <div className="mt-4"><label className="text-sm text-[#4B5563] font-bold block mb-1">Action Plan Attachment</label><div className="bg-white p-3 rounded-xl border border-gray-100 text-sm font-medium text-gray-800"><FileUp className="inline-block mr-2" /> <a href={`/${ap.remarks}`} target="_blank" rel="noopener noreferrer" className="underline text-[#172554]">{ap.remarks}</a></div></div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">No Action Plan found for this NCAR.</div>
                )}

                <div className="space-y-3"><label className="text-sm text-[#4B5563] font-bold uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} className="text-red-500" /> Rejection Reason (Required)</label><textarea autoFocus required value={rejectionRemarks} onChange={(e) => setRejectionRemarks(e.target.value)} placeholder="Clearly explain why this plan is not acceptable..." className="w-full bg-red-50/10 border-2 border-red-50 rounded-2xl p-6 text-sm text-[#4B5563] outline-none focus:ring-4 focus:ring-red-100 transition-all min-h-[160px] resize-none font-normal" /></div>
                <div className="flex gap-4">
                  <div className="flex-1 relative group/tooltip">
                    <button onClick={() => { setShowRejectModal(false); setRejectionRemarks(''); }} title="Cancel rejection" aria-label="Cancel" className="w-full px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-sm uppercase hover:bg-gray-100 transition-all">Cancel</button>
                    <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                      <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                        Cancel rejection
                      </span>
                      <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                    </div>
                  </div>
                  <div className="flex-[1.5] relative group/tooltip">
                    <button onClick={finalizeRejection} disabled={!rejectionRemarks.trim()} title={!rejectionRemarks.trim() ? "Please provide a rejection reason first" : "Confirm and send rejection feedback"} aria-label="Confirm Rejection" className="w-full px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-sm uppercase hover:bg-red-700 shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3">
                      <AlertCircle size={18} /> Confirm Rejection
                    </button>
                    <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                      <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                        {!rejectionRemarks.trim() ? "Reason required" : "Send rejection feedback"}
                      </span>
                      <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ActionPlanModule;







