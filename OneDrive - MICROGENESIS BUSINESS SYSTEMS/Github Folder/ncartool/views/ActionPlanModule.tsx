import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NCAR, ActionPlan, NCARStatus, Role } from '../types';
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
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

const ActionPlanModule: React.FC<ActionPlanModuleProps> = ({ ncars, actionPlans, setActionPlans, setNcars, role, onNotify }) => {
  const [selectedNCAR, setSelectedNCAR] = useState<NCAR | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [isCreatingActionPlan, setIsCreatingActionPlan] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  const initialApFormData = {
    correction: '',
    rootCause: '',
    actionPlan: '',
    responsible: 'Bob Johnson',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    attachmentName: ''
  };

  const [apFormData, setApFormData] = useState(initialApFormData);
  
  const isLead = role === 'LEAD_AUDITOR';
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
          responsible: existingPlan.responsiblePerson,
          dueDate: existingPlan.dueDate,
          attachmentName: existingPlan.remarks || '' 
        });
      } else {
        setApFormData(initialApFormData);
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
      ? ncars.filter(n => n.status === NCARStatus.FOR_APPROVAL || n.status === NCARStatus.CLOSED || n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED)
      : ncars.filter(n => n.status === NCARStatus.PENDING || n.status === NCARStatus.REJECTED || n.status === NCARStatus.REOPENED);

    return base.filter(ncar => {
      const matchesSearch = 
        ncar.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncar.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncar.area.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'All Status' || 
        (statusFilter === 'Approved' && ncar.status === NCARStatus.CLOSED) ||
        (statusFilter === 'Rejected' && (ncar.status === NCARStatus.REJECTED || ncar.status === NCARStatus.REOPENED)) ||
        (statusFilter === 'For Approval' && ncar.status === NCARStatus.FOR_APPROVAL) ||
        (statusFilter === 'Pending' && ncar.status === NCARStatus.PENDING) ||
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

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNCAR || isReadOnly) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newAP: ActionPlan = {
      id: `ACT_${String(actionPlans.length + 1).padStart(6, '0')}_${timestamp}`,
      ncarId: selectedNCAR.id,
      immediateCorrection: apFormData.correction,
      responsiblePerson: apFormData.responsible,
      rootCause: apFormData.rootCause,
      correctiveAction: apFormData.actionPlan,
      dueDate: apFormData.dueDate,
      submittedAt: now.toISOString(),
      remarks: apFormData.attachmentName
    };

    setActionPlans(prev => [...prev.filter(ap => ap.ncarId !== selectedNCAR.id), newAP]);
    setNcars(prev => prev.map(n => n.id === selectedNCAR.id ? { ...n, status: NCARStatus.FOR_APPROVAL, rejectionRemarks: undefined } : n));
    
    handleCloseAction();
    onNotify(`Action Plan for ${selectedNCAR.id} submitted for review.`, 'success');
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
    setNcars(prev => prev.map(n => n.id === selectedNCAR.id ? { ...n, status: NCARStatus.CLOSED, rejectionRemarks: undefined } : n));
    onNotify(`Plan for ${selectedNCAR.id} Approved.`, 'success');
    handleCloseAction();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setApFormData({ ...apFormData, attachmentName: e.target.files[0].name });
    }
  };

  return (
    <div className="space-y-5 text-base relative">
      <div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Action Plans</h3>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search plans..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          />
        </div>
        <div className="flex gap-3 relative" ref={filterRef}>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all border-2 ${typeFilters.length > 0 || showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}>
            <Filter size={20} /> Filters
          </button>
          {showFilters && (
            <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-40">
              <span className="text-sm font-black text-gray-400 uppercase block mb-3 pb-2 border-b">Finding Types</span>
              {['Major', 'Minor', 'OFI'].map(type => (
                <label key={type} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <span className="text-sm font-bold text-gray-700">{type}</span>
                  <input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={typeFilters.includes(type)} onChange={() => toggleTypeFilter(type)} />
                </label>
              ))}
            </div>
          )}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 border-none rounded-xl px-5 py-3 text-sm font-black text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
            <option value="All Status">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            {isAuditee ? <><option value="Pending">Pending</option><option value="Reopened">Reopened</option></> : <option value="For Approval">For Approval</option>}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#00316E] text-white">
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest">NCAR ID</th>
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest">ACP ID</th>
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest">Finding Type</th>
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest">Requirement</th>
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest text-center">Deadline</th>
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest text-center">Status</th>
                  <th className="px-5 py-4 text-sm font-black uppercase tracking-widest text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredNCARs.length === 0 ? (
                  <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-400 font-bold italic text-sm">No matching items.</td></tr>
                ) : (
                  filteredNCARs.map(n => (
                    <tr key={n.id} className="hover:bg-blue-50/20 transition-all group">
                      {(() => {
                        const ap = actionPlans.find(a => a.ncarId === n.id);
                        const formatted = ap ? ap.id.replace(/^ACT_/, 'ACP__') : '-';
                        return (
                          <>
                            <td className="px-5 py-4"><span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">{n.id}</span></td>
                            <td className="px-5 py-4"><span className="text-sm font-black text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100">{formatted}</span></td>
                          </>
                        );
                      })()}
                    <td className="px-5 py-4"><span className={`text-sm font-black px-3 py-1 rounded-full uppercase border ${n.findingType === 'Major' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{n.findingType}</span></td>
                    <td className="px-5 py-4"><p className="font-bold text-gray-900 text-sm line-clamp-1">{n.requirement}</p></td>
                    <td className="px-5 py-4 text-center">
                      <div className="text-sm font-black text-gray-900">{new Date(n.deadline).toLocaleDateString()}</div>
                      <div className="text-sm font-black text-blue-500 uppercase mt-1">{getDaysRemaining(n.deadline)} days left</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-sm font-black px-3 py-1 rounded-full uppercase border ${n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-100' : n.status === NCARStatus.CLOSED ? 'bg-green-50 text-green-600 border-green-100' : n.status === NCARStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {n.status === NCARStatus.CLOSED ? 'Approved' : (n.status === NCARStatus.REOPENED ? 'Rejected' : (n.status === NCARStatus.FOR_APPROVAL ? 'Review Req.' : n.status))}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => setSelectedNCAR(n)}
                        className={`p-3 rounded-2xl transition-all border ${
                          isAuditee && (n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED)
                          ? 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
                          : 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'
                        }`}
                      >
                        {isReadOnly ? <Eye size={20} /> : (n.status === NCARStatus.REOPENED || n.status === NCARStatus.REJECTED ? <RefreshCcw size={20} /> : <Edit3 size={20} />)}
                      </button>
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
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {!isCreatingActionPlan ? (
              <>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl text-white shadow-xl ${selectedNCAR.status === NCARStatus.REOPENED || selectedNCAR.status === NCARStatus.REJECTED ? 'bg-red-600' : 'bg-[#00316E]'}`}>
                      <ClipboardList size={32} />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-gray-900 tracking-tight">Non-Conformance Detail</h4>
                      <p className="text-sm font-bold text-gray-400 uppercase mt-1">Ref ID: {selectedNCAR.id}</p>
                    </div>
                  </div>
                  <button onClick={handleCloseAction} className="p-3 text-gray-400 hover:text-gray-900 bg-white rounded-full border border-gray-100 transition-all"><X size={24} /></button>
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
                    <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-xs border-b-2 border-blue-100 pb-3"><ClipboardList size={18} /> Audit Finding</div>
                    <div className="space-y-6">
                      <div><label className="text-sm font-black text-gray-400 uppercase tracking-widest block mb-2">Statement</label><div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-base text-gray-700 italic">"{selectedNCAR.statement}"</div></div>
                      <div><label className="text-sm font-black text-gray-400 uppercase block mb-2">Evidence</label><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm font-bold text-gray-600 italic">{selectedNCAR.evidence}</div></div>
                    </div>
                  </div>
                    <div className="space-y-5">
                    <div className="flex items-center gap-3 text-green-600 font-black uppercase tracking-widest text-xs border-b-2 border-green-100 pb-3"><CheckCircle2 size={18} /> Action Plan</div>
                    <div className="space-y-6">
                      {isReadOnly || actionPlans.find(ap => ap.ncarId === selectedNCAR.id) ? (
                        (() => {
                          const ap = actionPlans.find(a => a.ncarId === selectedNCAR.id);
                          return (
                            <>
                              {ap && (
                                <div>
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div><label className="text-sm font-black text-gray-400 block mb-1">ACP Number</label><div className="bg-white p-3 rounded-2xl border border-gray-100 text-sm font-black text-gray-800">{ap.id.replace(/^ACT_/, 'ACP__')}</div></div>
                                    <div><label className="text-sm font-black text-gray-400 block mb-1">Auditee</label><div className="bg-white p-3 rounded-2xl border border-gray-100 text-sm font-black text-gray-800">{ap.responsiblePerson}</div></div>
                                  </div>
                                </div>
                              )}
                              <div><label className="text-sm font-black text-gray-400 block mb-2">Root Cause</label><div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-sm font-bold text-gray-800">{apFormData.rootCause || 'N/A'}</div></div>
                              <div><label className="text-sm font-black text-gray-400 block mb-2">Corrective Strategy</label><div className="bg-green-50/30 p-6 rounded-2xl border border-green-100 text-base text-gray-900 font-black">{apFormData.actionPlan || 'N/A'}</div></div>
                              {ap && ap.remarks && (
                                <div className="mt-4"><label className="text-sm font-black text-gray-400 block mb-2">Action Plan Attachment</label><div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm font-bold text-gray-800"><FileUp className="inline-block mr-2" /> <a href={`/${ap.remarks}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{ap.remarks}</a></div></div>
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
                    {isLead && selectedNCAR.status === NCARStatus.FOR_APPROVAL && (
                      <>
                        <button onClick={() => setShowRejectModal(true)} className="flex items-center gap-2 px-10 py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-black hover:bg-red-50 transition-all uppercase text-xs tracking-widest shadow-lg shadow-red-50"><XCircle size={18} /> Reject </button>
                        <button onClick={handleApprove} className="flex items-center gap-2 px-12 py-4 bg-[#00316E] text-white rounded-2xl font-black hover:bg-blue-700 shadow-2xl uppercase text-xs tracking-widest"><CheckCircle2 size={18} /> Approve </button>
                      </>
                    )}
                    {isAuditee && (selectedNCAR.status === NCARStatus.REOPENED || selectedNCAR.status === NCARStatus.REJECTED) && (
                      <div className="flex gap-3">
                        <button onClick={initiateFreshPlan} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-blue-100 text-blue-600 rounded-2xl font-black hover:bg-blue-50 transition-all uppercase text-xs tracking-widest shadow-lg shadow-blue-50"><PlusCircle size={20} /> Create New Plan</button>
                        <button onClick={() => setIsCreatingActionPlan(true)} className="flex items-center gap-3 px-10 py-4 bg-[#00316E] text-white rounded-2xl font-black hover:bg-blue-700 shadow-2xl uppercase text-xs tracking-widest"><RefreshCcw size={20} /> Edit Previous Plan</button>
                      </div>
                    )}
                    {isAuditee && selectedNCAR.status === NCARStatus.PENDING && (
                      <button onClick={() => setIsCreatingActionPlan(true)} className="flex items-center gap-3 px-12 py-4 bg-[#00316E] text-white rounded-2xl font-black hover:bg-blue-700 shadow-2xl uppercase text-xs tracking-widest">Start Action Plan <ArrowRight size={20} /></button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmitAction}>
                <div className="p-6 flex justify-between items-center border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#00316E] p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                      <Edit3 size={24} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                        {selectedNCAR.rejectionRemarks ? 'Action Plan Revision' : 'Create Action Plan'}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">Ref: {selectedNCAR.id}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsCreatingActionPlan(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 p-2 rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 flex items-start gap-4">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><AlertCircle size={20} /></div>
                      <div><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">NCAR Finding Statement</span><p className="text-sm font-bold text-gray-800 italic leading-relaxed">"{selectedNCAR.statement}"</p></div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Immediate Correction (Containment)</label>
                          <textarea 
                            required
                            value={apFormData.correction}
                            onChange={(e) => setApFormData({...apFormData, correction: e.target.value})}
                            placeholder="What steps were taken immediately to address this?"
                            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm font-bold min-h-[100px] outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Root Cause Analysis (RCA)</label>
                          <textarea 
                            required
                            value={apFormData.rootCause}
                            onChange={(e) => setApFormData({...apFormData, rootCause: e.target.value})}
                            placeholder="Identify systemic failures..."
                            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm font-bold min-h-[140px] outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Long-term Corrective Action</label>
                          <textarea 
                            required
                            value={apFormData.actionPlan}
                            onChange={(e) => setApFormData({...apFormData, actionPlan: e.target.value})}
                            placeholder="How will we prevent recurrence?"
                            className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-4 text-sm font-bold min-h-[100px] outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Assignee</label><input required type="text" value={apFormData.responsible} onChange={(e) => setApFormData({...apFormData, responsible: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-sm font-bold" /></div>
                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Target Date</label><input required type="date" value={apFormData.dueDate} onChange={(e) => setApFormData({...apFormData, dueDate: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-sm font-bold" /></div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Evidence Artifacts</label>
                          <input type="file" id="ap-mod-file" className="hidden" onChange={handleFileChange} />
                          <label htmlFor="ap-mod-file" className="w-full border-2 border-dashed border-blue-200 rounded-2xl p-6 bg-blue-50/30 flex items-center justify-center gap-4 cursor-pointer hover:bg-blue-100/30 transition-all">
                            <FileUp size={24} className="text-blue-500" />
                            <div className="text-left"><p className="text-[10px] font-black text-blue-900 uppercase truncate">{apFormData.attachmentName || 'Select evidence artifacts'}</p><p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest mt-1">Proof of Implementation</p></div>
                          </label>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <button type="button" onClick={() => setApFormData(initialApFormData)} className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-gray-100 text-gray-400 hover:text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"><Eraser size={18} /> Reset Form</button>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsCreatingActionPlan(false)} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-50 transition-all uppercase text-[10px] tracking-widest shadow-sm"><Undo2 size={18} /> Back</button>
                    <button type="submit" className="flex items-center gap-3 px-10 py-4 bg-[#00316E] text-white rounded-2xl font-black hover:bg-blue-700 shadow-2xl transition-all uppercase text-[10px] tracking-widest"><Send size={18} /> Submit Action Plan</button>
                  </div>
                </div>
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
                <div className="flex items-center gap-5"><div className="p-4 bg-red-50 rounded-2xl text-red-600"><AlertTriangle size={36} /></div><div><h4 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Rejection Log</h4><p className="text-sm font-black text-gray-400 tracking-widest mt-1">Ref: {selectedNCAR.id}</p></div></div>

                {ap ? (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-black text-gray-400 block mb-1">ACP Number</label><div className="text-sm font-black text-gray-800">{ap.id.replace(/^ACT_/, 'ACP__')}</div></div>
                      <div><label className="text-sm font-black text-gray-400 block mb-1">Auditee</label><div className="text-sm font-black text-gray-800">{ap.responsiblePerson}</div></div>
                    </div>
                    <div className="mt-4"><label className="text-sm font-black text-gray-400 block mb-1">Root Cause</label><div className="text-sm font-bold text-gray-800">{ap.rootCause || 'N/A'}</div></div>
                    <div className="mt-4"><label className="text-sm font-black text-gray-400 block mb-1">Corrective Strategy</label><div className="text-sm font-bold text-gray-800">{ap.correctiveAction || 'N/A'}</div></div>
                    {ap.remarks && (
                      <div className="mt-4"><label className="text-sm font-black text-gray-400 block mb-1">Action Plan Attachment</label><div className="bg-white p-3 rounded-xl border border-gray-100 text-sm font-bold text-gray-800"><FileUp className="inline-block mr-2" /> <a href={`/${ap.remarks}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{ap.remarks}</a></div></div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">No Action Plan found for this NCAR.</div>
                )}

                <div className="space-y-3"><label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={14} className="text-red-500" /> Rejection Reason (Required)</label><textarea autoFocus required value={rejectionRemarks} onChange={(e) => setRejectionRemarks(e.target.value)} placeholder="Clearly explain why this plan is not acceptable..." className="w-full bg-red-50/10 border-2 border-red-50 rounded-2xl p-6 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-red-100 transition-all min-h-[160px] resize-none" /></div>
                <div className="flex gap-4"><button onClick={() => { setShowRejectModal(false); setRejectionRemarks(''); }} className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-sm uppercase hover:bg-gray-100 transition-all">Cancel</button><button onClick={finalizeRejection} disabled={!rejectionRemarks.trim()} className="flex-[1.5] px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase hover:bg-red-700 shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3"><AlertCircle size={18} /> Confirm Rejection</button></div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ActionPlanModule;
