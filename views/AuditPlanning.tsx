
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuditPlan, AuditStatus, Role } from '../types';
import { 
  Plus, 
  Calendar, 
  Users, 
  FileText, 
  X, 
  CheckCircle2, 
  Edit3, 
  ChevronRight, 
  Paperclip, 
  FileIcon, 
  Check, 
  ChevronDown,
  Search,
  Filter,
  CalendarDays,
  Trash2
} from 'lucide-react';
import { INITIAL_USERS } from '../mockData';

interface AuditPlanningProps {
  plans: AuditPlan[];
  setPlans: React.Dispatch<React.SetStateAction<AuditPlan[]>>;
  role: Role;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

const MultiSelectDropdown = ({ 
  label, 
  options, 
  selected, 
  onChange 
}: { 
  label: string; 
  options: string[]; 
  selected: string[]; 
  onChange: (val: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };
  const filteredOptions = options.filter(option => option.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-sm text-[#4B5563] font-medium uppercase tracking-widest block mb-2">{label}</label>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearchQuery(''); }}
        className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 flex items-center justify-between cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[48px]"
      >
        <div className="flex flex-wrap gap-1.5">
          {selected.length > 0 ? (
            selected.map(item => (
              <span key={item} className="bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                {item}
                <X 
                  size={10} 
                  className="cursor-pointer hover:text-blue-900" 
                  onClick={(e) => { e.stopPropagation(); toggleOption(item); }} 
                />
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400 font-normal">Select {label}...</span>
          )}
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-gray-100 p-2"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} placeholder={`Search ${label.toLowerCase()}...`} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm font-normal outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></div></div>
          <div className="max-h-56 overflow-y-auto p-1.5">
          {filteredOptions.length ? filteredOptions.map(option => (
            <div 
              key={option}
              onClick={() => toggleOption(option)}
              className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-blue-50 group"
            >
              <span className={`text-sm font-medium ${selected.includes(option) ? 'text-[#172554]' : 'text-gray-600'}`}>{option}</span>
              {selected.includes(option) && <Check size={16} className="text-[#172554]" />}
            </div>
          )) : <p className="px-3 py-6 text-center text-xs font-medium text-gray-400">No matching options</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const AuditPlanning: React.FC<AuditPlanningProps> = ({ plans, setPlans, role, onNotify }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    auditors: [] as string[],
    auditees: [] as string[],
    attachmentName: '',
    auditType: 'QMS' as AuditPlan['auditType'],
    processName: ''
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const isLead = role === 'LEAD_AUDITOR' || role === 'HEAD_MANAGER';
  
  const ALL_AUDITORS = INITIAL_USERS.filter((u: any) => u.role === 'AUDITOR' || u.role === 'LEAD_AUDITOR').map((u: any) => u.name);
  const ALL_AUDITEES = INITIAL_USERS.filter((u: any) => u.role === 'AUDITEE').map((u: any) => u.name);
  const PROCESS_OPTIONS = [
    'Access Control',
    'Incident Management',
    'Change Management',
    'Vendor Management',
    'Data Privacy',
    'Financial Reporting',
    'Procurement',
    'IT Operations'
  ];

  const getNextStatus = (current: AuditStatus): AuditStatus | null => {
    switch (current) {
      case AuditStatus.DRAFT: return AuditStatus.PLANNED;
      case AuditStatus.PLANNED: return AuditStatus.ACTUAL;
      case AuditStatus.ACTUAL: return AuditStatus.CLOSED;
      default: return null;
    }
  };

  const updateStatus = (id: string) => {
    if (!isLead) return;
    setPlans(prev => prev.map(p => {
      if (p.id === id) {
        const next = getNextStatus(p.status);
        if (next) {
          onNotify(`Status updated to ${next} for ${p.id}`, 'success');
          return { ...p, status: next };
        }
      }
      return p;
    }));
  };

  const handleDelete = (plan: AuditPlan) => {
    if (!isLead || !window.confirm(`Delete audit plan ${plan.id}? This action cannot be undone.`)) return;
    setPlans(prev => prev.filter(item => item.id !== plan.id));
    onNotify(`Audit plan ${plan.id} deleted.`, 'success');
  };

  const handleEdit = (plan: AuditPlan) => {
    setEditingId(plan.id);
    setFormData({
      startDate: plan.startDate,
      endDate: plan.endDate,
      auditors: [...plan.auditors],
      auditees: [...plan.auditees],
      attachmentName: plan.attachmentName || '',
      auditType: plan.auditType,
      processName: plan.processName
    });
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, attachmentName: e.target.files[0].name });
    }
  };

  const handleSavePlan = (e?: React.FormEvent | null, finalize = false) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (formData.auditors.length === 0 || formData.auditees.length === 0) {
      onNotify('Please select at least one auditor and one auditee.', 'warning');
      return;
    }
    if (!formData.processName.trim()) {
      onNotify('Please select at least one process for the audit plan.', 'warning');
      return;
    }

    if (editingId) {
      setPlans(prev => prev.map(p => p.id === editingId ? {
        ...p,
        startDate: formData.startDate,
        endDate: formData.endDate,
        auditors: formData.auditors,
        auditees: formData.auditees,
        attachmentName: formData.attachmentName,
        auditType: formData.auditType,
        processName: formData.processName,
        status: finalize ? p.status : AuditStatus.DRAFT
      } : p));
      onNotify('Audit Plan updated successfully.', 'success');
    } else {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const newPlan: AuditPlan = {
        id: `AP_${String(plans.length + 1).padStart(6, '0')}_${timestamp}`,
        startDate: formData.startDate || now.toISOString().split('T')[0],
        endDate: formData.endDate || now.toISOString().split('T')[0],
        auditors: formData.auditors,
        auditees: formData.auditees,
        attachmentName: formData.attachmentName || 'No attachment',
        status: finalize ? AuditStatus.PLANNED : AuditStatus.DRAFT,
        isLocked: false,
        createdAt: now.toISOString(),
        auditType: formData.auditType,
        processName: formData.processName
      };
      setPlans(prev => [newPlan, ...prev]);
      onNotify(finalize ? 'New Audit Plan created.' : 'New Audit Plan drafted.', 'success');
    }
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ 
      startDate: '', 
      endDate: '', 
      auditors: [], 
      auditees: [], 
      attachmentName: '',
      auditType: 'QMS',
      processName: ''
    });
  };

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesSearch = p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.auditors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            p.auditees.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesDate = true;
      if (dateFilter) {
        // Filter: Selected date must be within start and end range of the audit
        const sel = new Date(dateFilter).getTime();
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.endDate).getTime();
        matchesDate = sel >= start && sel <= end;
      }

      return matchesSearch && matchesDate;
    });
  }, [plans, searchQuery, dateFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Audit Plan</h3>
        </div>
        
        {isLead && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#172554] hover:bg-[#172554] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-200"
          >
            <Plus size={20} />
            Create Plan
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search plans by ID or User..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-normal"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-auto">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by active date"
              className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl py-3 pl-12 pr-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-normal appearance-none"
            />
          </div>
          {(searchQuery || dateFilter) && (
            <button 
              onClick={clearFilters}
              className="px-4 py-4 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear all filters"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Plan ID</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Docs</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Start Date</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">End Date</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900">Teams</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-blue-900 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[#4B5563]">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Search size={48} className="mb-4" />
                      <p className="font-medium text-sm text-gray-400">No plans matching criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="text-[12px] font-bold text-[#172554] bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter border border-blue-100">{plan.id}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {plan.attachmentName ? (
                         <div className="flex flex-col items-center gap-1 group/file cursor-pointer" onClick={() => onNotify(`Downloading ${plan.attachmentName}`)}>
                           <FileIcon size={18} className="text-blue-500 group-hover/file:scale-110 transition-transform" />
                           <span className="text-[10px] font-normal text-gray-500 truncate max-w-[80px]">{plan.attachmentName}</span>
                         </div>
                      ) : (
                        <span className="text-[12px] text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5 text-[12px] text-gray-600 font-normal">
                        <Calendar size={16} className="text-gray-400" />
                        {plan.startDate}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5 text-[12px] text-gray-600 font-normal">
                        <Calendar size={16} className="text-gray-400" />
                        {plan.endDate}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-start gap-1.5 text-[12px] text-blue-700 font-medium">
                          <Users size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                          <span>Auditors: {plan.auditors.join(', ')}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[12px] text-gray-500 font-normal">
                          <Users size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                          <span>Auditees: {plan.auditees.join(', ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {isLead && (
                          <div className="relative group/tooltip inline-flex justify-center items-center">
                            <button
                              onClick={() => handleEdit(plan)}
                              className={`p-2 rounded-xl transition-all border text-[#172554] bg-blue-50 border-blue-100 hover:bg-blue-100 hover:text-blue-700`}
                              title="Edit Audit Plan"
                              aria-label="Edit Audit Plan"
                            >
                              <Edit3 size={18} />
                            </button>
                            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:flex flex-col items-center z-30 transition-all duration-150">
                              <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                                Edit Audit Plan
                              </span>
                              <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1"></span>
                            </div>
                            <button
                              onClick={() => handleDelete(plan)}
                              className="p-2 rounded-xl transition-all border text-red-600 bg-red-50 border-red-100 hover:bg-red-100 hover:text-red-700"
                              title="Delete Audit Plan"
                              aria-label={`Delete Audit Plan ${plan.id}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleSavePlan} className="text-sm text-[#4B5563] font-medium">
              <div className="p-6 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="bg-[#172554] p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-semibold text-gray-800 tracking-tight">{editingId ? 'Update Audit Plan' : 'New Audit Plan'}</h4>
                    <p className="text-sm text-gray-500 font-medium">{editingId ? `Editing plan details for ${editingId}` : 'Set timeline and assign responsibilities.'}</p>
                  </div>
                </div>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#4B5563] font-medium">Audit Type</label>
                    <select 
                      required
                      value={formData.auditType}
                      onChange={(e) => setFormData({...formData, auditType: e.target.value as any})}
                      className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm appearance-none cursor-pointer font-normal"
                    >
                      <option value="QMS">QMS</option>
                      <option value="ISMS">ISMS</option>
                      <option value="Quality/InfoSec">Quality/InfoSec (legacy)</option>
                      <option value="Financial">Financial</option>
                      <option value="Special Request">Special Request</option>
                    </select>
                  </div>
                  <MultiSelectDropdown
                    label="Process Name"
                    options={[...new Set([...PROCESS_OPTIONS, ...formData.processName.split(', ').filter(Boolean)])]}
                    selected={formData.processName.split(', ').filter(Boolean)}
                    onChange={selected => setFormData({ ...formData, processName: selected.join(', ') })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#4B5563] font-medium">Start Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-normal" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#4B5563] font-medium">End Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-normal" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MultiSelectDropdown 
                    label="Auditors" 
                    options={ALL_AUDITORS} 
                    selected={formData.auditors} 
                    onChange={(val) => setFormData({...formData, auditors: val})} 
                  />
                  <MultiSelectDropdown 
                    label="Auditees" 
                    options={ALL_AUDITEES} 
                    selected={formData.auditees} 
                    onChange={(val) => setFormData({...formData, auditees: val})} 
                  />
                </div>

                <div>
                  <label className="text-sm text-[#4B5563] font-medium">Attachment (Scope/Checklist)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      className="hidden font-normal" 
                      id="audit-file-upload"
                    />
                    <label 
                      htmlFor="audit-file-upload"
                      className="text-sm text-[#4B5563] font-medium flex items-center justify-center gap-3 w-full bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-2xl p-6 cursor-pointer group-hover:bg-blue-100/50 group-hover:border-blue-400 transition-all"
                    >
                      <Paperclip size={20} className="text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-blue-900">{formData.attachmentName || 'Click to upload audit files'}</p>
                        <p className="text-[10px] text-blue-400 font-normal uppercase tracking-widest mt-0.5">PDF, DOCX or ZIP up to 10MB</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button type="button" onClick={() => handleSavePlan(null, false)} className="flex-1 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition-all text-sm uppercase tracking-widest">Draft</button>
                  <button type="button" onClick={(e) => handleSavePlan(null, true)} className="flex-[1.5] px-6 py-3.5 bg-[#172554] text-white rounded-2xl font-medium hover:bg-[#172554] shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest">
                    <CheckCircle2 size={20} />
                    {editingId ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPlanning;








