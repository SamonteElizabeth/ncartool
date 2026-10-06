import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NCAR, NCARStatus, Role, ActionPlan } from '../types';
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
  Eraser
} from 'lucide-react';

interface NCARModuleProps {
  ncars: NCAR[];
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  actionPlans: ActionPlan[];
  setActionPlans: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  role: Role;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning') => void;
  setActiveModule?: (module: string) => void;
}

const FINDING_AREAS = [
  'DISD', 'TSD', 'TASS', 'IA', 'MSP', 'CSS', 'DCFI', 'BTSG', 'EEM'
];

const REQUIREMENTS = [
  'ISO 27001 Clause 8.1', 'ISO 27001 Clause A.9.4', 'ISO 9001 Clause 4.4',
  'ISO 9001 Clause 9.2', 'ISO 14001 Clause 6.1', 'Financial Policy Section 4.2',
  'IT Security Policy v2.1', 'Employee Handbook Sec 5'
];

const NCARModule: React.FC<NCARModuleProps> = ({ 
  ncars, 
  setNcars, 
  actionPlans, 
  setActionPlans, 
  role, 
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
  const isAuditor = role === 'AUDITOR';
  const canCreate = role === 'LEAD_AUDITOR' || role === 'AUDITOR';

  const getInitialDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const initialFormData = {
    type: 'Major' as 'Major' | 'Minor' | 'OFI',
    area: FINDING_AREAS[0],
    clause: REQUIREMENTS[0],
    statement: '',
    evidence: '',
    auditee: 'Bob Johnson',
    attachmentName: '',
    dueDate: getInitialDueDate(),
    auditType: 'Quality/InfoSec' as NCAR['auditType'],
    processName: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const initialApFormData = {
    correction: '',
    rootCause: '',
    actionPlan: '',
    responsible: 'Bob Johnson',
    dueDate: getInitialDueDate(),
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
      area: ncar.area,
      clause: ncar.requirement,
      statement: ncar.statement,
      evidence: ncar.evidence,
      auditee: ncar.auditee,
      attachmentName: ncar.attachmentName || '',
      dueDate: ncar.deadline.split('T')[0],
      auditType: ncar.auditType,
      processName: ncar.processName
    });

    const existingAp = actionPlans.find(ap => ap.ncarId === ncar.id);
    if (existingAp) {
      setApFormData({
        correction: existingAp.immediateCorrection,
        rootCause: existingAp.rootCause,
        actionPlan: existingAp.correctiveAction,
        responsible: existingAp.responsiblePerson,
        dueDate: existingAp.dueDate,
        attachmentName: existingAp.remarks || ''
      });
    } else {
      setApFormData(initialApFormData);
    }

    setIsCreatingActionPlan(false);
    setShowForm(true);
  };

  const handleApprove = () => {
    if (!viewingNCAR || !isLead) return;
    setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { ...n, status: NCARStatus.CLOSED, rejectionRemarks: undefined } : n));
    onNotify(`NCAR ${viewingNCAR.id} Approved and Closed.`, 'success');
    closeForm();
  };

  const handleInitiateReject = () => {
    setShowRejectModal(true);
  };

  const finalizeRejection = () => {
    if (!viewingNCAR || !rejectionRemarks.trim()) return;
    setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { 
      ...n, 
      status: NCARStatus.REOPENED,
      rejectionRemarks: rejectionRemarks
    } : n));
    onNotify(`NCAR ${viewingNCAR.id} Rejected: ${rejectionRemarks}`, 'warning');
    setShowRejectModal(false);
    setRejectionRemarks('');
    closeForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, attachmentName: e.target.files[0].name });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuditee || !formData.statement || !formData.evidence) return;

    const now = new Date();
    if (viewingNCAR) {
      setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? {
        ...n,
        statement: formData.statement,
        requirement: formData.clause,
        evidence: formData.evidence,
        findingType: formData.type,
        standardClause: formData.clause.split(' ').pop() || '8.1',
        area: formData.area,
        auditee: formData.auditee,
        attachmentName: formData.attachmentName,
        deadline: formData.dueDate,
        auditType: formData.auditType,
        processName: formData.processName
      } : n));
      onNotify(`NCAR ${viewingNCAR.id} updated.`, 'success');
    } else {
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const newNCAR: NCAR = {
        id: `NCAR_${String(ncars.length + 1).padStart(6, '0')}_${timestamp}`,
        auditPlanId: 'AP_UNKNOWN',
        statement: formData.statement,
        requirement: formData.clause,
        evidence: formData.evidence,
        findingType: formData.type,
        standardClause: formData.clause.split(' ').pop() || '8.1',
        area: formData.area,
        auditor: 'Current User',
        auditee: formData.auditee,
        createdAt: now.toISOString(),
        status: NCARStatus.PENDING,
        deadline: formData.dueDate,
        attachmentName: formData.attachmentName,
        auditType: formData.auditType,
        processName: formData.processName,
        isEscalated: false
      };
      setNcars(prev => [newNCAR, ...prev]);
      onNotify('NCAR raised and assigned.', 'success');
    }
    closeForm();
  }

  const handleApSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingNCAR) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newAP: ActionPlan = {
      id: `ACT_${String(actionPlans.length + 1).padStart(6, '0')}_${timestamp}`,
      ncarId: viewingNCAR.id,
      immediateCorrection: apFormData.correction,
      responsiblePerson: apFormData.responsible,
      rootCause: apFormData.rootCause,
      correctiveAction: apFormData.actionPlan,
      dueDate: apFormData.dueDate,
      submittedAt: now.toISOString(),
      remarks: apFormData.attachmentName
    };

    setActionPlans(prev => [...prev.filter(ap => ap.ncarId !== viewingNCAR.id), newAP]);
    setNcars(prev => prev.map(n => n.id === viewingNCAR.id ? { ...n, status: NCARStatus.FOR_APPROVAL, rejectionRemarks: undefined } : n));
    onNotify(`Action Plan for ${viewingNCAR.id} submitted successfully.`, 'success');
    closeForm();
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

  const filteredNCARs = useMemo(() => {
    return ncars.filter(ncar => {
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
          matchesStatus = ncar.status === NCARStatus.PENDING || ncar.status === NCARStatus.REOPENED;
        } else if (statusFilter === 'For Approval') {
          matchesStatus = ncar.status === NCARStatus.FOR_APPROVAL;
        } else if (statusFilter === 'Rejected') {
          matchesStatus = ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED;
        } else if (statusFilter === 'Approved') {
          matchesStatus = ncar.status === NCARStatus.VALIDATED || ncar.status === NCARStatus.CLOSED;
        } else if (statusFilter === 'Closed') {
          matchesStatus = ncar.status === NCARStatus.CLOSED;
        }
      }

      const matchesType = typeFilters.length === 0 || typeFilters.includes(ncar.findingType);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [ncars, searchQuery, statusFilter, typeFilters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">NCARs</h3>
        </div>
        {canCreate && (
          <button 
            onClick={() => { setViewingNCAR(null); setFormData(initialFormData); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#172554] hover:bg-[#172554] text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl shadow-blue-200 transition-all"
          >
            <Plus size={20} /> NCAR
          </button>
        )}
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
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
          >
            <option value="All Status">All Status</option>
            <option value="Pending">Pending</option>
            <option value="For Approval">For Approval</option>
            <option value="Rejected">Rejected</option>
            <option value="Approved">Approved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">NCAR ID</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Audit Type</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Process</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Finding Type</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Requirement</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Responsible</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Deadline</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Status</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[#4B5563]">
              {filteredNCARs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-8 py-12 text-center text-gray-400 font-medium text-sm">No NCARs matching criteria</td>
                </tr>
              ) : (
                filteredNCARs.map(ncar => {
                  const ap = actionPlans.find(a => a.ncarId === ncar.id);
                  const responsibleName = ap?.responsiblePerson || ncar.auditee || '-';
                  const initial = responsibleName !== '-' ? responsibleName.charAt(0).toUpperCase() : '?';

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
                      <td className="px-5 py-4 text-center">
                        <div className="text-sm font-normal text-gray-600 whitespace-nowrap">{new Date(ncar.deadline).toLocaleDateString()}</div>
                        <div className="text-xs font-medium text-[#172554] uppercase mt-0.5 whitespace-nowrap">{getDaysRemaining(ncar.deadline)} days left</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full uppercase border whitespace-nowrap ${
                          ncar.status === NCARStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                          ncar.status === NCARStatus.FOR_APPROVAL ? 'bg-blue-50 text-[#172554] border-blue-100' :
                          ncar.status === NCARStatus.VALIDATED ? 'bg-green-50 text-blue-700 border-blue-200' :
                          ncar.status === NCARStatus.CLOSED ? 'bg-green-50 text-green-600 border-green-100' : 
                          ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                          {ncar.status === NCARStatus.VALIDATED ? 'Approved' : (ncar.status === NCARStatus.REOPENED ? 'Rejected' : ncar.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center">
                          {(() => {
                            const tooltipText = isAuditee 
                              ? (ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED ? "Revise Action Plan" : "View Finding") 
                              : "Edit Finding";
                            return (
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
                                  {isAuditee ? (ncar.status === NCARStatus.REOPENED || ncar.status === NCARStatus.REJECTED ? <RefreshCcw size={20} /> : <Eye size={20} />) : <Edit3 size={20} />}
                                </button>
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                                  <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                                    {tooltipText}
                                  </span>
                                  <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                                </div>
                              </div>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {!isCreatingActionPlan ? (
              <form onSubmit={handleSubmit} className="text-sm text-[#4B5563] font-medium">
                <div className="p-6 flex justify-between items-center border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl text-[#172554] shadow-lg">
                      {isAuditee ? (viewingNCAR?.status === NCARStatus.REOPENED || viewingNCAR?.status === NCARStatus.REJECTED ? <RefreshCcw size={24} /> : <Eye size={24} />) : viewingNCAR ? <Edit3 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-800 tracking-tight">
                        {isAuditee ? (viewingNCAR?.status === NCARStatus.REOPENED || viewingNCAR?.status === NCARStatus.REJECTED ? 'Review & Plan' : 'View Finding Details') : viewingNCAR ? `Edit NCAR: ${viewingNCAR.id}` : 'New NCAR'}
                      </h4>
                      <p className="text-sm text-[#4B5563] font-medium">Audit context and finding severity log.</p>
                    </div>
                  </div>
                  <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {viewingNCAR?.rejectionRemarks && (
                    <div className="md:col-span-2 bg-red-50 border-2 border-red-100 rounded-2xl p-6 flex items-start gap-5 shadow-sm">
                      <div className="p-3 bg-red-100 rounded-xl text-red-600">
                        <MessageSquare size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Feedback from Lead Auditor</span>
                        <p className="text-sm font-bold text-red-800 leading-relaxed italic">"{viewingNCAR.rejectionRemarks}"</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <label className="text-sm text-[#4B5563] font-bold">Finding Statement</label>
                      <textarea 
                        readOnly={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                        required
                        value={formData.statement}
                        onChange={(e) => setFormData({...formData, statement: e.target.value})}
                        className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm min-h-[120px] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                      ></textarea>
                    </div>
                    <div>
                      <label className="text-sm text-[#4B5563] font-bold">Objective Evidence</label>
                      <textarea 
                        readOnly={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                        required
                        value={formData.evidence}
                        onChange={(e) => setFormData({...formData, evidence: e.target.value})}
                        className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm min-h-[120px] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                      ></textarea>
                    </div>

                    <div>
                      <label className="text-sm text-[#4B5563] font-bold">Attachment</label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          onChange={handleFileChange}
                          className="hidden font-normal" 
                          id="ncar-main-file-upload"
                          disabled={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                        />
                        <label 
                          htmlFor="ncar-main-file-upload"
                          className={`flex items-center justify-center gap-3 w-full bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-2xl p-6 transition-all ${isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group-hover:bg-blue-100/50 group-hover:border-blue-400'}`}
                        >
                          <Paperclip size={20} className="text-blue-500" />
                          <div className="text-left">
                            <p className="text-sm font-black text-blue-900">{formData.attachmentName || 'Click to upload audit files'}</p>
                            <p className="text-[10px] text-blue-400 uppercase tracking-widest mt-0.5">PDF, DOCX or ZIP up to 10MB</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-[#4B5563] font-bold">Audit Type</label>
                        <select 
                          disabled={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                          value={formData.auditType}
                          onChange={(e) => setFormData({...formData, auditType: e.target.value as any})}
                          className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                        >
                          <option value="" disabled>Select an audit type</option>
                          <option value="Quality/InfoSec">Quality/InfoSec</option>
                          <option value="Financial">Financial</option>
                          <option value="Special Request">Special Request</option>
                        </select>
                      </div>
                    <div className="space-y-2">
                          <label className="text-sm text-[#4B5563] font-bold">
                            Process Name
                          </label>
                          <select
                            disabled={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                            value={formData.processName}
                            onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                          >
                            <option value="" disabled>
                              Select a process
                            </option>
                            <option value="Access Control">Access Control</option>
                            <option value="User Management">User Management</option>
                            <option value="Audit Logging">Audit Logging</option>
                            <option value="Change Management">Change Management</option>
                            {/* Add more options as needed */}
                          </select>
                        </div>
                        </div> 
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-[#4B5563] font-bold">Finding Type</label>
                        <select 
                          disabled={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                          className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                        >
                          <option value="Major">Major</option>
                          <option value="Minor">Minor</option>
                          <option value="OFI">OFI</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-[#4B5563] font-bold">Due Date</label>
                          <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 animate-in fade-in zoom-in duration-300">
                             <Clock size={10} className="text-blue-500" />
                             <span className="text-[9px] font-black text-[#172554] uppercase tracking-tighter">
                                {getDaysRemaining(formData.dueDate)} Days Left
                             </span>
                          </div>
                        </div>
                        <input 
                          readOnly={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                          type="date" 
                          value={formData.dueDate}
                          onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                          className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-[#4B5563] font-bold">Requirement Clause</label>
                      <select 
                        disabled={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                        value={formData.clause}
                        onChange={(e) => setFormData({...formData, clause: e.target.value})}
                        className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                      >
                        {REQUIREMENTS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-[#4B5563] font-bold">Responsible Area</label>
                      <select 
                        disabled={isAuditee || (isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL)}
                        value={formData.area}
                        onChange={(e) => setFormData({...formData, area: e.target.value})}
                        className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal"
                      >
                        {FINDING_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                        {viewingNCAR && viewingNCAR.status === NCARStatus.FOR_APPROVAL && isLead && (
                      <div className="bg-blue-100 text-blue-700 p-2 px-4 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-tighter">
                        <ShieldCheck size={14} /> Review Required
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={closeForm} className="px-8 py-3 bg-white border-2 border-gray-200 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all text-sm tracking-widest uppercase">Close</button>
                    {isLead && viewingNCAR?.status === NCARStatus.FOR_APPROVAL ? (
                      <>
                        <button 
                          type="button"
                          onClick={handleInitiateReject}
                          className="px-8 py-3 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-black hover:bg-red-50 transition-all text-sm flex items-center gap-2 uppercase tracking-widest"
                        >
                          <XCircle size={18} /> Reject
                        </button>
                        <button 
                          type="button"
                          onClick={handleApprove}
                          className="px-10 py-3 bg-[#172554] text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-[#172554] flex items-center gap-2 text-sm uppercase tracking-widest"
                        >
                          <CheckCircle2 size={18} /> Approve
                        </button>
                      </>
                    ) : !isAuditee ? (
                      <button type="submit" className="px-10 py-3 bg-[#172554] text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-[#172554] flex items-center gap-2 text-sm uppercase tracking-widest">
                        <Save size={18} /> {viewingNCAR ? 'Update NCAR' : 'Save NCAR'}
                      </button>
                    ) : (
                      viewingNCAR && (viewingNCAR.status === NCARStatus.PENDING || viewingNCAR.status === NCARStatus.REJECTED || viewingNCAR.status === NCARStatus.REOPENED) && (
                        <div className="flex gap-3">
                          {(viewingNCAR.status === NCARStatus.REJECTED || viewingNCAR.status === NCARStatus.REOPENED) && (
                            <button 
                              type="button"
                              onClick={initiateFreshPlan}
                              className="px-8 py-3 bg-white border-2 border-blue-100 text-[#172554] rounded-2xl font-black hover:bg-blue-50 transition-all flex items-center gap-3 text-sm uppercase tracking-widest"
                            >
                              <PlusCircle size={18} /> Create New Plan
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => setIsCreatingActionPlan(true)}
                            className="px-10 py-3 bg-[#172554] text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-[#172554] flex items-center gap-3 text-sm uppercase tracking-widest"
                          >
                            {viewingNCAR.status === NCARStatus.PENDING ? 'Create Action Plan' : 'Edit Previous Plan'} <ArrowRight size={18} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleApSubmit} className="text-sm text-[#4B5563] font-medium">
                <div className="p-6 flex justify-between items-center border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#172554] p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                      <Edit3 size={24} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-800 tracking-tight">
                        {viewingNCAR?.rejectionRemarks ? 'Action Plan Revision' : 'Create Action Plan'}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">Ref: {viewingNCAR?.id}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsCreatingActionPlan(false)} className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {viewingNCAR?.rejectionRemarks && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4 mb-4 shadow-sm">
                      <MessageSquare className="text-red-600 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1">Lead Auditor Rejection Feedback</span>
                        <p className="text-sm font-bold text-red-800 italic leading-relaxed">"{viewingNCAR.rejectionRemarks}"</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 text-[#172554] mb-2 font-black text-xs uppercase tracking-widest">
                      <AlertCircle size={16} /> Non-Conformance Statement
                    </div>
                    <p className="text-sm text-[#4B5563] font-bold leading-relaxed italic">"{viewingNCAR?.statement}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest block mb-2">Immediate Correction</label>
                        <textarea 
                          required
                          value={apFormData.correction}
                          onChange={(e) => setApFormData({...apFormData, correction: e.target.value})}
                          placeholder="What steps were taken immediately to contain this?" 
                          className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm min-h-[100px] outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-normal"
                        ></textarea>
                      </div>
                      <div>
                        <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest block mb-2">Root Cause Analysis (RCA)</label>
                        <textarea 
                          required
                          value={apFormData.rootCause}
                          onChange={(e) => setApFormData({...apFormData, rootCause: e.target.value})}
                          placeholder="Why did this happen? Identify systemic failures..." 
                          className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm min-h-[120px] outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-normal"
                        ></textarea>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest block mb-2">Long-term Corrective Action</label>
                        <textarea 
                          required
                          value={apFormData.actionPlan}
                          onChange={(e) => setApFormData({...apFormData, actionPlan: e.target.value})}
                          placeholder="How will we prevent recurrence? Detail the strategy..." 
                          className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm min-h-[100px] outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-normal"
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest block">Assignee</label>
                          <input 
                            required
                            type="text" 
                            value={apFormData.responsible}
                            onChange={(e) => setApFormData({...apFormData, responsible: e.target.value})}
                            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-normal" 
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest">Target Date</label>
                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 animate-in fade-in zoom-in duration-300">
                               <Clock size={10} className="text-blue-500" />
                               <span className="text-[9px] font-black text-[#172554] uppercase tracking-tighter">
                                  {getDaysRemaining(apFormData.dueDate)} Days
                               </span>
                            </div>
                          </div>
                          <input 
                            required
                            type="date" 
                            value={apFormData.dueDate}
                            onChange={(e) => setApFormData({...apFormData, dueDate: e.target.value})}
                            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-normal" 
                          />
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <label className="text-sm text-[#4B5563] font-bold text-[10px] uppercase tracking-widest block mb-2">Implementation Evidence Artifacts</label>
                        <input 
                          type="file" 
                          onChange={handleApFileChange}
                          className="hidden font-normal" 
                          id="ncar-ap-file-upload"
                        />
                        <label 
                          htmlFor="ncar-ap-file-upload"
                          className="text-sm text-[#4B5563] font-bold flex items-center gap-3 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl p-3.5 px-5 cursor-pointer hover:bg-blue-100/50 hover:border-blue-400 transition-all shadow-sm"
                        >
                          <FileUp size={20} className="text-blue-500" />
                          <div className="text-left overflow-hidden">
                            <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest leading-none truncate">
                              {apFormData.attachmentName || 'Select evidence files'}
                            </p>
                            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.1em] mt-1.5">
                              Upload Proof of Implementation
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                  <button 
                    type="button"
                    onClick={() => setApFormData(initialApFormData)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                  >
                    <Eraser size={18} /> Reset Form
                  </button>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingActionPlan(false)} 
                      className="px-8 py-3 bg-white border-2 border-gray-200 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all text-sm tracking-widest uppercase"
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="px-10 py-3 bg-[#172554] text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-[#172554] flex items-center gap-3 text-sm tracking-widest uppercase"
                    >
                      <Send size={18} /> Submit for Review
                    </button>
                  </div>
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








