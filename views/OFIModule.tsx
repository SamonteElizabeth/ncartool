import React, { useMemo, useState } from 'react';
import { Check, CircleCheck, CircleX, Clock3, FileText, Paperclip, Plus, Search, Send, X } from 'lucide-react';
import { AuditReport, NCAR, OFIResponse, Role } from '../types';

interface OFIModuleProps {
  ncars: NCAR[];
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  reports: AuditReport[];
  role: Role;
  currentUserName: string;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

type OFIAction = 'Accept' | 'Reject' | null;

const OFIModule: React.FC<OFIModuleProps> = ({ ncars, setNcars, reports, role, currentUserName, onNotify }) => {
  const [selectedOFI, setSelectedOFI] = useState<NCAR | null>(null);
  const [action, setAction] = useState<OFIAction>(null);
  const [statusFilter, setStatusFilter] = useState('All OFIs');
  const [search, setSearch] = useState('');
  const [responseDate, setResponseDate] = useState(new Date().toISOString().slice(0, 10));
  const [applicable, setApplicable] = useState<'Yes' | 'No'>('Yes');
  const [correctiveActionPlan, setCorrectiveActionPlan] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [implementationProgress, setImplementationProgress] = useState('');
  const [implementationStatus, setImplementationStatus] = useState<'In Progress' | 'Implemented'>('In Progress');
  const [evidenceAttachments, setEvidenceAttachments] = useState<NonNullable<OFIResponse['evidenceAttachments']>>([]);

  const assignedReports = useMemo(() => new Map<string, AuditReport>(reports.filter(report => report.status !== 'Draft' && report.status !== 'Rejected').map(report => [report.id, report] as const)), [reports]);
  const assignedOFIs = useMemo(() => ncars.filter(ncar => ncar.findingType === 'OFI' && ncar.assignedByAuditReportId && assignedReports.has(ncar.assignedByAuditReportId)), [ncars, assignedReports]);
  const visibleAssignedOFIs = useMemo(() => role !== 'AUDITEE' ? assignedOFIs : assignedOFIs.filter(ofi => (ofi.managerResponsible || ofi.auditee).toLowerCase() === currentUserName.toLowerCase()), [assignedOFIs, role, currentUserName]);
  const filteredOFIs = useMemo(() => visibleAssignedOFIs.filter(ofi => {
    const query = search.trim().toLowerCase();
    const report = ofi.assignedByAuditReportId ? assignedReports.get(ofi.assignedByAuditReportId) : undefined;
    const matchesSearch = !query || `${ofi.id} ${ofi.statement} ${ofi.managerResponsible || ofi.auditee} ${ofi.departmentResponsible || ofi.area} ${report?.reportTitle || ''}`.toLowerCase().includes(query);
    const responseStatus = ofi.ofiResponse?.status || 'Pending';
    const matchesStatus = statusFilter === 'All OFIs' ||
      (statusFilter === 'Pending' && responseStatus === 'Pending') ||
      (statusFilter === 'Accepted' && ['Accepted', 'In Progress', 'Implemented'].includes(responseStatus)) ||
      (statusFilter === 'Rejected' && responseStatus === 'Rejected');
    return matchesSearch && matchesStatus;
  }), [visibleAssignedOFIs, assignedReports, search, statusFilter]);

  const cards = [
    { label: 'All OFIs', count: visibleAssignedOFIs.length, icon: FileText, style: 'border-blue-200 text-[#172554] bg-blue-50' },
    { label: 'Pending', count: visibleAssignedOFIs.filter(ofi => !ofi.ofiResponse || ofi.ofiResponse.status === 'Pending').length, icon: Clock3, style: 'border-amber-200 text-amber-700 bg-amber-50' },
    { label: 'Accepted', count: visibleAssignedOFIs.filter(ofi => ['Accepted', 'In Progress', 'Implemented'].includes(ofi.ofiResponse?.status || '')).length, icon: CircleCheck, style: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
    { label: 'Rejected', count: visibleAssignedOFIs.filter(ofi => ofi.ofiResponse?.status === 'Rejected').length, icon: CircleX, style: 'border-rose-200 text-rose-600 bg-rose-50' }
  ];

  const openOFI = (ofi: NCAR) => {
    const response = ofi.ofiResponse;
    setSelectedOFI(ofi);
    setAction(response?.status === 'Pending' || !response ? null : response.status === 'Rejected' ? 'Reject' : 'Accept');
    setResponseDate(response?.responseDate || new Date().toISOString().slice(0, 10));
    setApplicable(response?.applicable || 'Yes');
    setCorrectiveActionPlan(response?.correctiveActionPlan || '');
    setResponsiblePerson(response?.responsiblePerson || ofi.managerResponsible || ofi.auditee);
    setTargetDate(response?.targetDate || '');
    setNotes(response?.notes || '');
    setImplementationProgress(response?.implementationProgress || '');
    setImplementationStatus(response?.status === 'Implemented' ? 'Implemented' : 'In Progress');
    setEvidenceAttachments(response?.evidenceAttachments || []);
  };

  const saveResponse = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOFI || !action || role !== 'AUDITEE') return;
    if (action === 'Accept' && applicable === 'Yes' && (!correctiveActionPlan.trim() || !responsiblePerson.trim() || !targetDate)) {
      onNotify('Complete the corrective action plan, responsible person, and target date.', 'warning');
      return;
    }
    if ((action === 'Reject' || applicable === 'No') && !notes.trim()) {
      onNotify(action === 'Reject' ? 'Add notes explaining why you are rejecting the OFI.' : 'Explain why the OFI is not applicable.', 'warning');
      return;
    }

    const response: OFIResponse = {
      status: action === 'Reject' ? 'Rejected' : 'Accepted',
      responseDate,
      ...(action === 'Accept' ? { applicable, correctiveActionPlan: applicable === 'Yes' ? correctiveActionPlan.trim() : '', responsiblePerson: applicable === 'Yes' ? responsiblePerson.trim() : '', targetDate: applicable === 'Yes' ? targetDate : '' } : {}),
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    };
    const responseAt = new Date().toISOString();
    const updatedOFI = { ...selectedOFI, ofiResponse: response, responseAt, responseSla: selectedOFI.responseSla ? { ...selectedOFI.responseSla, status: 'Submitted' as const } : undefined };
    setNcars(current => current.map(ofi => ofi.id === selectedOFI.id ? updatedOFI : ofi));
    setSelectedOFI(updatedOFI);
    setAction(action);
    setEvidenceAttachments([]);
    onNotify(action === 'Reject' ? 'OFI response rejected and recorded.' : applicable === 'No' ? 'OFI response recorded with the non-applicability explanation.' : 'OFI accepted. The action plan is saved.', 'success');
  };

  const addEvidence = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const readFile = (file: File) => new Promise<NonNullable<OFIResponse['evidenceAttachments']>[number]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: reader.result }) : reject(new Error('Could not read file'));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
    try {
      const attachments = await Promise.all(files.map(readFile));
      setEvidenceAttachments(current => [...current, ...attachments]);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Unable to read evidence file.', 'warning');
    }
  };

  const saveImplementation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOFI?.ofiResponse || role !== 'AUDITEE') return;
    const response: OFIResponse = {
      ...selectedOFI.ofiResponse,
      status: implementationStatus,
      implementationProgress: implementationProgress.trim(),
      evidenceAttachments,
      updatedAt: new Date().toISOString()
    };
    setNcars(current => current.map(ofi => ofi.id === selectedOFI.id ? { ...ofi, ofiResponse: response } : ofi));
    setSelectedOFI({ ...selectedOFI, ofiResponse: response });
    onNotify('OFI implementation progress and evidence saved.', 'success');
  };

  const labelClass = 'mb-1.5 block text-xs font-medium text-gray-600';
  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100';
  const response = selectedOFI?.ofiResponse;
  const canRespond = Boolean(selectedOFI && role === 'AUDITEE' && (selectedOFI.managerResponsible || selectedOFI.auditee).toLowerCase() === currentUserName.toLowerCase() && (!response || response.status === 'Pending'));
  const canTrack = Boolean(selectedOFI && role === 'AUDITEE' && (selectedOFI.managerResponsible || selectedOFI.auditee).toLowerCase() === currentUserName.toLowerCase() && response?.applicable === 'Yes' && ['Accepted', 'In Progress', 'Implemented'].includes(response.status));

  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold tracking-tight text-gray-800">Opportunities for Improvement</h1><p className="mt-1 text-sm text-gray-500">Respond to OFIs assigned when Part 1 is submitted, then track accepted improvements.</p></header>
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f3e7d3] bg-[#fff8e9] p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, count, icon: Icon }) => {
        const isSelected = statusFilter === label;
        const palette = label === 'Approved' || label === 'Accepted'
          ? { stripe: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-700' }
          : label === 'Rejected'
            ? { stripe: 'bg-rose-500', icon: 'bg-rose-50 text-rose-600' }
            : label === 'Pending'
              ? { stripe: 'bg-orange-400', icon: 'bg-amber-50 text-amber-700' }
              : { stripe: 'bg-[#172554]', icon: 'bg-indigo-50 text-[#172554]' };
        const caption = label === 'All OFIs' ? 'All opportunities' : label === 'Pending' ? 'Awaiting response' : label === 'Accepted' ? 'Accepted for action' : 'Response declined';
        return <button type="button" key={label} onClick={() => setStatusFilter(label)} aria-pressed={isSelected} className={`group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border bg-[#fffef5] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSelected ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-[#efe5d3]'}`}><span className={`absolute inset-x-0 top-0 h-1 ${palette.stripe}`} /><span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-medium text-slate-600">{label}</span><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}><Icon size={19} /></span></span><span className="text-3xl font-bold leading-none tracking-tight text-slate-900">{count}</span><span className="truncate text-[11px] text-slate-500">{caption}</span></button>;
      })}
    </div>
    <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search OFI, report, department, or auditee" className="w-full rounded-xl bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100" /></div>
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-blue-100 bg-blue-50 text-xs uppercase tracking-wide text-blue-900"><th className="px-5 py-4">OFI</th><th className="px-5 py-4">Approved Audit Report</th><th className="px-5 py-4">Responsible Auditee</th><th className="px-5 py-4">Response Date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">
      {filteredOFIs.length === 0 ? <tr><td colSpan={6} className="px-6 py-14 text-center"><FileText className="mx-auto mb-3 text-gray-300" size={32} /><p className="font-semibold text-gray-600">No OFIs to show</p><p className="mt-1 text-xs text-gray-400">OFIs appear here after Part 1 is submitted in their Audit Report.</p></td></tr> : filteredOFIs.map(ofi => {
    const assignedReport = ofi.assignedByAuditReportId ? assignedReports.get(ofi.assignedByAuditReportId) : undefined;
        const status = ofi.ofiResponse?.status || 'Pending';
        const badgeClass = status === 'Rejected' ? 'border-rose-100 bg-rose-50 text-rose-700' : status === 'Pending' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700';
        const rowCanTrack = role === 'AUDITEE' && ofi.ofiResponse?.applicable === 'Yes' && ['Accepted', 'In Progress', 'Implemented'].includes(status);
        return <tr key={ofi.id} className="hover:bg-blue-50/30"><td className="px-5 py-4"><p className="font-semibold text-gray-800">{ofi.id}</p><p className="mt-1 max-w-sm truncate text-xs text-gray-500" title={ofi.statement}>{ofi.statement}</p></td><td className="px-5 py-4 text-gray-700">{assignedReport?.reportTitle || assignedReport?.referenceNumber || assignedReport?.id}</td><td className="px-5 py-4 text-gray-700">{ofi.managerResponsible || ofi.auditee}</td><td className="px-5 py-4 text-gray-600">{ofi.ofiResponse?.responseDate || '—'}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{status}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => openOFI(ofi)} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#172554] hover:bg-blue-100">{role === 'AUDITEE' && status === 'Pending' ? 'Respond' : rowCanTrack ? 'Update Progress' : 'View'}</button></td></tr>;
      })}
    </tbody></table></div></div>

    {selectedOFI && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-5"><div role="dialog" aria-modal="true" aria-labelledby="ofi-modal-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 id="ofi-modal-title" className="text-xl font-bold text-[#172554]">OFI Response</h2><p className="mt-1 text-xs text-gray-500">{selectedOFI.id} · {selectedOFI.statement}</p></div><button type="button" onClick={() => setSelectedOFI(null)} className="rounded-full bg-gray-50 p-2 text-gray-500 hover:text-gray-900" aria-label="Close OFI"><X size={19} /></button></div>
      <div className="overflow-y-auto bg-gray-50 p-5">
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">OFI Content</h3>
          <div className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p className="sm:col-span-2 lg:col-span-3"><span className="mb-1 block text-xs font-medium text-gray-500">Opportunities for Improvement Statement</span><span className="whitespace-pre-wrap text-gray-800">{selectedOFI.statement || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Management System Type</span><span className="text-gray-800">{selectedOFI.systemType || selectedOFI.auditType || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Clause</span><span className="text-gray-800">{selectedOFI.clauseNumber || selectedOFI.standardClause || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Issue Date</span><span className="text-gray-800">{selectedOFI.issueDate || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Department Responsible</span><span className="text-gray-800">{selectedOFI.departmentResponsible || selectedOFI.area || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Manager Responsible (Auditee)</span><span className="text-gray-800">{selectedOFI.managerResponsible || selectedOFI.auditee || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Issuing Auditor</span><span className="text-gray-800">{selectedOFI.issuingAuditor || selectedOFI.auditor || '—'}</span></p>
            <p><span className="mb-1 block text-xs font-medium text-gray-500">Deadline for OFI Response</span><span className="text-gray-800">{selectedOFI.deadline || '—'}</span></p>
          </div>
        </section>
        {action === null && canRespond ? <section className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-gray-800">How would you like to respond?</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setAction('Accept')} className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Check size={16} /> Accept</button><button type="button" onClick={() => setAction('Reject')} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><CircleX size={16} /> Reject</button></div></section> : null}
        {action && canRespond && <form id="ofi-response-form" onSubmit={saveResponse} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-800">{action === 'Accept' ? 'Accept OFI' : 'Reject OFI'}</h3><button type="button" onClick={() => setAction(null)} className="text-xs font-semibold text-blue-700 hover:underline">Change response</button></div>
          <label className="block"><span className={labelClass}>Response Date <b className="text-rose-500">*</b></span><input required type="date" value={responseDate} onChange={event => setResponseDate(event.target.value)} className={inputClass} /></label>
          {action === 'Accept' ? <>
            <label className="block"><span className={labelClass}>Applicable to the Department / Business Unit? <b className="text-rose-500">*</b></span><select required value={applicable} onChange={event => setApplicable(event.target.value as 'Yes' | 'No')} className={inputClass}><option value="Yes">Yes</option><option value="No">No</option></select></label>
            {applicable === 'Yes' ? <div className="grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className={labelClass}>Corrective Action Plan <b className="text-rose-500">*</b></span><textarea required rows={3} value={correctiveActionPlan} onChange={event => setCorrectiveActionPlan(event.target.value)} className={inputClass} placeholder="Describe how the improvement will be implemented." /></label><label className="block"><span className={labelClass}>Responsible Person <b className="text-rose-500">*</b></span><input required value={responsiblePerson} onChange={event => setResponsiblePerson(event.target.value)} className={inputClass} /></label><label className="block"><span className={labelClass}>Target Date <b className="text-rose-500">*</b></span><input required type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} className={inputClass} /></label></div> : <label className="block"><span className={labelClass}>Why is this OFI not applicable? <b className="text-rose-500">*</b></span><textarea required rows={3} value={notes} onChange={event => setNotes(event.target.value)} className={inputClass} placeholder="Explain why the opportunity does not apply to this department or business unit." /></label>}
          </> : <label className="block"><span className={labelClass}>Reason for rejecting the improvement <b className="text-rose-500">*</b></span><textarea required rows={3} value={notes} onChange={event => setNotes(event.target.value)} className={inputClass} placeholder="Explain why you do not intend to implement this improvement." /></label>}
          <div className="flex justify-end border-t border-gray-100 pt-4"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Send size={16} /> Save Response</button></div>
        </form>}
        {response && !canRespond && <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-800">Auditee Response · {response.status}</h3><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-xs font-medium text-gray-500">Response Date</span><br />{response.responseDate || '—'}</p><p><span className="text-xs font-medium text-gray-500">Applicable</span><br />{response.applicable || '—'}</p>{response.correctiveActionPlan && <p className="sm:col-span-2"><span className="text-xs font-medium text-gray-500">Corrective Action Plan</span><br />{response.correctiveActionPlan}</p>}{response.responsiblePerson && <p><span className="text-xs font-medium text-gray-500">Responsible Person</span><br />{response.responsiblePerson}</p>}{response.targetDate && <p><span className="text-xs font-medium text-gray-500">Target Date</span><br />{response.targetDate}</p>}{response.notes && <p className="sm:col-span-2"><span className="text-xs font-medium text-gray-500">Notes</span><br />{response.notes}</p>}</div></div>}
        {canTrack && <form onSubmit={saveImplementation} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div><h3 className="font-semibold text-gray-800">Implementation Tracking</h3><p className="mt-1 text-xs text-gray-500">Record progress and attach supporting evidence for the accepted improvement.</p></div><label className="block"><span className={labelClass}>Implementation Status</span><select value={implementationStatus} onChange={event => setImplementationStatus(event.target.value as 'In Progress' | 'Implemented')} className={inputClass}><option value="In Progress">In Progress</option><option value="Implemented">Implemented</option></select></label><label className="block"><span className={labelClass}>Progress Update</span><textarea rows={3} value={implementationProgress} onChange={event => setImplementationProgress(event.target.value)} className={inputClass} placeholder="Describe implementation progress or completion details." /></label><label className="block"><span className={labelClass}>Evidence</span><span className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600"><Paperclip size={16} /><input type="file" multiple onChange={addEvidence} className="min-w-0 flex-1 text-xs" /></span></label>{evidenceAttachments.length > 0 && <ul className="space-y-1 text-xs text-gray-600">{evidenceAttachments.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3"><a href={file.dataUrl} download={file.name} className="truncate text-blue-700 hover:underline">{file.name}</a><button type="button" onClick={() => setEvidenceAttachments(current => current.filter((_, fileIndex) => fileIndex !== index))} className="text-rose-600">Remove</button></li>)}</ul>}<div className="flex justify-end border-t border-gray-100 pt-4"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Save Progress</button></div></form>}
        {!canRespond && !canTrack && !response && <p className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">This OFI is awaiting a response from {selectedOFI.managerResponsible || selectedOFI.auditee}.</p>}
        {response?.evidenceAttachments?.length ? <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4"><h3 className="text-sm font-semibold text-gray-800">Saved Evidence</h3><ul className="mt-2 space-y-1 text-xs">{response.evidenceAttachments.map((file, index) => <li key={`${file.name}-${index}`}><a href={file.dataUrl} download={file.name} className="text-blue-700 hover:underline">{file.name}</a></li>)}</ul></div> : null}
      </div>
      <div className="flex shrink-0 justify-end border-t border-gray-100 bg-white px-5 py-3"><button type="button" onClick={() => setSelectedOFI(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button></div>
    </div></div>}
  </div>;
};

export default OFIModule;
