import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, Check, CheckCircle2, ChevronDown, CircleCheck, CircleX, ClipboardList, Clock3, Download, FileText,
  Eye, Pencil, Plus, Search, Trash2, X
} from 'lucide-react';
import { ActionPlan, AuditPlan, AuditReport, AuditReportClause, AuditReportStatus, NCAR, NCARStatus, Role, User } from '../types';
import { getConfiguredPhilippineHolidays, hasSubmittedNCARResponse, makeResponseSla } from '../utils/ncarSla';

interface AuditReportModuleProps {
  reports: AuditReport[];
  setReports: React.Dispatch<React.SetStateAction<AuditReport[]>>;
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  auditPlans: AuditPlan[];
  ncars: NCAR[];
  users: User[];
  actionPlans: ActionPlan[];
  role: Role;
  currentUserName: string;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

type Tab = 'Details' | 'Objectives' | 'NCAR Log' | 'OFI Log' | 'Results' | 'ISO Clauses';
type EditableReportSection = 'Details' | 'Objectives' | 'ISO Clauses';
const TABS: Tab[] = ['Details', 'Objectives', 'NCAR Log', 'OFI Log', 'ISO Clauses', 'Results'];
const ISO_CLAUSES = [
  'Clause 4 – Context of the Organization',
  'Clause 5 – Leadership',
  'Clause 6 – Planning',
  'Clause 7 – Support',
  'Clause 8 – Operation',
  'Clause 9 – Performance Evaluation',
  'Clause 10 – Improvement'
];
const REPORT_FINDING_CLAUSES = [
  'ISO Clause 4.1', 'ISO Clause 4.2', 'ISO Clause 5.1', 'ISO Clause 5.2', 'ISO Clause 6.1', 'ISO Clause 6.2',
  'ISO Clause 7.1', 'ISO Clause 7.2', 'ISO Clause 7.3', 'ISO Clause 7.4', 'ISO Clause 7.5', 'ISO Clause 8.1',
  'ISO Clause 8.2', 'ISO Clause 8.3', 'ISO Clause 8.4', 'ISO Clause 8.5', 'ISO Clause 8.6', 'ISO Clause 8.7',
  'ISO Clause 9.1', 'ISO Clause 9.2', 'ISO Clause 9.3', 'ISO Clause 9.4', 'ISO Clause 9.5', 'ISO Clause 10.1',
  'ISO Clause 10.2', 'ISO Clause 10.3'
];
const REPORT_DEPARTMENTS = ['DISD', 'TSD', 'TASS', 'IA', 'MSP', 'CSS', 'DCFI', 'BTSG', 'EEM'];
type ReportStatusFilter = 'All Status' | 'Approved' | 'Rejected' | 'Pending';

interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = options.filter(option => option.toLowerCase().includes(query.trim().toLowerCase()));

  const toggleOption = (option: string) => {
    onChange(value.includes(option) ? value.filter(item => item !== option) : [...value, option]);
  };

  return <div className="relative">
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
    <button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen(open => !open)} className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left text-sm text-gray-800 outline-none transition hover:border-gray-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
      <span className={value.length ? 'truncate' : 'truncate text-gray-400'}>{value.length ? value.join(', ') : placeholder}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">{value.length > 0 && <span>{value.length} selected</span>}<ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
    </button>
    {isOpen && <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="border-b border-gray-100 p-2.5"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></div></div>
      <div role="listbox" aria-label={label} aria-multiselectable="true" className="max-h-48 overflow-y-auto p-1.5">{filteredOptions.length ? filteredOptions.map(option => <button key={option} type="button" role="option" aria-selected={value.includes(option)} onClick={() => toggleOption(option)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${value.includes(option) ? 'border-[#172554] bg-[#172554] text-white' : 'border-gray-300 bg-white'}`}>{value.includes(option) && <Check size={12} />}</span><span className="truncate">{option}</span></button>) : <p className="px-3 py-5 text-center text-xs text-gray-400">No matching options</p>}</div>
      <div className="flex justify-between border-t border-gray-100 px-3 py-2"><button type="button" onClick={() => onChange([])} disabled={!value.length} className="text-xs font-semibold text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Clear selection</button><button type="button" onClick={() => { setIsOpen(false); setQuery(''); }} className="text-xs font-semibold text-[#172554] hover:underline">Done</button></div>
    </div>}
  </div>;
};

const blankReport = (preparedBy: string): AuditReport => {
  const now = new Date().toISOString();
  return {
    id: `AR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reportTitle: '', subject: '', referenceNumber: '', linkedAuditPlanId: '', preparedBy,
    releaseDate: '', confidentiality: '', objectives: '• ', conclusion: '', ncarIds: [], ofiIds: [],
    repeatNcarIds: [], clauses: [], status: 'Draft', createdAt: now, updatedAt: now
  };
};

type ReportNcarDraft = {
  statement: string;
  evidence: string;
  evidenceAttachments: { name: string; type: string; size: number; dataUrl: string }[];
  requirement: string;
  findingType: 'Major' | 'Minor';
  systemType: 'QMS' | 'ISMS' | 'Business';
  clause: string;
  issueDate: string;
  processInvolved: string;
  managerResponsible: string;
  departmentResponsible: string;
  issuingAuditor: string;
  deadline: string;
};

const blankReportNcar = (issuingAuditor: string): ReportNcarDraft => ({
  statement: '', evidence: '', evidenceAttachments: [], requirement: '', findingType: 'Major', systemType: 'QMS',
  clause: '', issueDate: new Date().toISOString().slice(0, 10), processInvolved: '',
  managerResponsible: '', departmentResponsible: '', issuingAuditor, deadline: ''
});

type ReportOfiDraft = {
  statement: string;
  systemType: 'QMS' | 'ISMS' | 'Business';
  clause: string;
  issueDate: string;
  businessUnit: string;
  auditeeName: string;
  issuingAuditor: string;
  deadline: string;
};

const blankReportOfi = (issuingAuditor: string): ReportOfiDraft => ({
  statement: '', systemType: 'QMS', clause: '', issueDate: new Date().toISOString().slice(0, 10),
  businessUnit: '', auditeeName: '', issuingAuditor, deadline: ''
});

const AuditReportModule: React.FC<AuditReportModuleProps> = ({ reports, setReports, setNcars, auditPlans, ncars, users, actionPlans, role, currentUserName, onNotify }) => {
  const [editing, setEditing] = useState<AuditReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('All Status');
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [pickerType, setPickerType] = useState<'NCAR' | 'OFI' | null>(null);
  const [ncarDraft, setNcarDraft] = useState<ReportNcarDraft | null>(null);
  const [ofiDraft, setOfiDraft] = useState<ReportOfiDraft | null>(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [clauseDraft, setClauseDraft] = useState<AuditReportClause | null>(null);
  const [editingSection, setEditingSection] = useState<EditableReportSection | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const baselineRef = useRef('');

  const isEditor = editing !== null;
  const isReadOnly = editing?.status !== 'Draft';
  const isAuthorized = role === 'AUDITOR' || role === 'LEAD_AUDITOR';
  const canEditFindings = role === 'LEAD_AUDITOR' || role === 'HEAD_MANAGER';
  const canEditSavedReport = role === 'LEAD_AUDITOR' || role === 'HEAD_MANAGER';
  const isLeadReportReview = role === 'LEAD_AUDITOR' && editing?.status === 'Pending Lead Review';
  const isFinalReportReview = role === 'HEAD_MANAGER' && editing?.status === 'Pending Final Approval';
  const canApproveReport = Boolean(isLeadReportReview || isFinalReportReview);
  const isDirty = Boolean(editing && JSON.stringify(editing) !== baselineRef.current);

  const updateReport = (patch: Partial<AuditReport>) => {
    setEditing(current => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
    setValidationErrors([]);
  };

  const saveSectionChanges = () => {
    if (!editing || !editingSection || !canEditSavedReport) return;
    const saved = { ...editing, updatedAt: new Date().toISOString() };
    setReports(current => current.map(report => report.id === saved.id ? saved : report));
    setEditing(saved);
    baselineRef.current = JSON.stringify(saved);
    setEditingSection(null);
    onNotify(`${editingSection} section updated.`, 'success');
  };

  const cancelSectionChanges = () => {
    if (!editing) return;
    const saved = reports.find(report => report.id === editing.id);
    if (saved) {
      const copy = structuredClone(saved);
      setEditing(copy);
      baselineRef.current = JSON.stringify(copy);
    }
    setEditingSection(null);
    setClauseDraft(null);
  };

  const renderSectionEditControls = (section: EditableReportSection) => {
    if (!isReadOnly || !canEditSavedReport) return null;
    if (editingSection === section) return <div className="flex items-center gap-2"><button type="button" onClick={cancelSectionChanges} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button><button type="button" onClick={saveSectionChanges} className="inline-flex items-center gap-1.5 rounded-lg bg-[#172554] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E3268]"><Check size={14} /> Save Changes</button></div>;
    return <button type="button" onClick={() => setEditingSection(section)} title={`Edit ${section}`} aria-label={`Edit ${section}`} className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#172554] hover:bg-blue-100"><Pencil size={14} /> Edit</button>;
  };

  const openNew = () => {
    if (!isAuthorized) return;
    const next = blankReport(currentUserName);
    baselineRef.current = JSON.stringify(next);
    setEditing(next);
    setEditingSection(null);
    setActiveTab('Details');
    setValidationErrors([]);
  };

  const openSaved = (report: AuditReport) => {
    const copy = structuredClone(report);
    baselineRef.current = JSON.stringify(copy);
    setEditing(copy);
    setEditingSection(null);
    setActiveTab('Details');
    setValidationErrors([]);
  };

  const deleteReport = (report: AuditReport) => {
    if (!isAuthorized || report.status !== 'Draft') return;
    if (!window.confirm(`Delete draft audit report "${report.reportTitle || 'Untitled report'}"?`)) return;
    setReports(current => current.filter(item => item.id !== report.id));
    onNotify('Draft Audit Report deleted.', 'success');
  };

  const cancelEditing = () => {
    if (isDirty && !window.confirm('Discard your unsaved Audit Report changes?')) return;
    setEditing(null);
    setPickerType(null);
    setClauseDraft(null);
    setValidationErrors([]);
  };

  const saveReport = (status: AuditReportStatus) => {
    if (!editing || isReadOnly || !isAuthorized) return;
    if (status !== 'Draft') {
      const errors: string[] = [];
      if (!editing.reportTitle.trim()) errors.push('Report Title is required.');
      if (!editing.subject.trim()) errors.push('Subject / Audit Scope is required.');
      if (!editing.referenceNumber.trim()) errors.push('Reference Number is required.');
      if (!editing.linkedAuditPlanId) errors.push('Linked Audit Plan is required.');
      if (!editing.preparedBy) errors.push('Prepared By is required.');
      if (!editing.releaseDate) errors.push('Release Date is required.');
      if (!editing.confidentiality) errors.push('Confidentiality is required.');
      if (!editing.objectives.trim()) errors.push('Audit Objectives are required.');
      if (!editing.conclusion.trim()) errors.push('Audit Conclusion is required.');
      if (status === 'Awaiting Auditee Responses') {
        const findingIds = [...new Set([...editing.ncarIds, ...editing.ofiIds])];
        const linkedFindings = ncars.filter(ncar => findingIds.includes(ncar.id));
        const missingManager = linkedFindings.filter(ncar => !(ncar.managerResponsible || ncar.auditee));
        const conflictingFindings = linkedFindings.filter(ncar => ncar.assignedByAuditReportId && ncar.assignedByAuditReportId !== editing.id);
        if (missingManager.length) errors.push(`Manager Responsible is required for: ${missingManager.map(ncar => ncar.id).join(', ')}.`);
        if (conflictingFindings.length) errors.push(`Already assigned to another Audit Report: ${conflictingFindings.map(ncar => ncar.id).join(', ')}.`);
      }
      if (errors.length) {
        setValidationErrors(errors);
        setActiveTab(errors.some(error => error.includes('Objectives') || error.includes('Conclusion')) ? 'Objectives' : 'Details');
        return;
      }
      setShowSubmitConfirmation(true);
      return;
    }

    commitReport(status);
  };

  const commitReport = (status: AuditReportStatus) => {
    if (!editing || isReadOnly || !isAuthorized) return;
    setShowSubmitConfirmation(false);
    const saved = { ...editing, status, updatedAt: new Date().toISOString() };
    setReports(current => [saved, ...current.filter(report => report.id !== saved.id)]);
    if (status === 'Awaiting Auditee Responses') {
      const findingIds = new Set([...saved.ncarIds, ...saved.ofiIds]);
      const assignedAt = new Date().toISOString();
      setNcars(current => current.map(ncar => {
        if (!findingIds.has(ncar.id)) return ncar;
        const responseSla = ncar.responseSla || makeResponseSla(assignedAt, getConfiguredPhilippineHolidays());
        return {
          ...ncar,
          assignedByAuditReportId: saved.id,
          assignedAt: ncar.assignedAt || assignedAt,
          responseSla,
          deadline: responseSla.dueDate,
          status: ncar.findingType === 'OFI' ? ncar.status : NCARStatus.PART1_SUBMITTED,
          ofiResponse: ncar.findingType === 'OFI' ? ncar.ofiResponse || { status: 'Pending', responseDate: '' } : ncar.ofiResponse
        };
      }));
    }
    setEditing(null);
    setValidationErrors([]);
    onNotify(status === 'Draft' ? 'Audit Report saved as a draft.' : 'Part 1 submitted. The 5 working day SLA has started for the assigned Auditees.', 'success');
  };

  const continueTo = (tab: Tab) => {
    if (!editing) return;
    const nextIndex = TABS.indexOf(tab);
    if (!isReadOnly) updateReport({ workflowStep: Math.max(editing.workflowStep || 0, nextIndex) });
    setActiveTab(tab);
  };

  const approveReport = () => {
    if (!editing || !canApproveReport || !currentUserName) return;
    const isLeadApproval = isLeadReportReview;
    if (!window.confirm(isLeadApproval ? 'Approve this complete NCAR/OFI report package and forward it to the Head Manager?' : 'Give final approval to this complete NCAR/OFI report package?')) return;
    const findingIds = [...new Set([...editing.ncarIds, ...editing.ofiIds])];
    const findingsToAssign = ncars.filter(ncar => findingIds.includes(ncar.id));
    const incomplete = findingsToAssign.filter(ncar => !hasSubmittedNCARResponse(ncar));
    if (incomplete.length > 0) {
      onNotify(`Cannot approve yet. These Part 2 responses are still incomplete: ${incomplete.map(ncar => ncar.id).join(', ')}.`, 'warning');
      return;
    }

    const approvedAt = new Date().toISOString();
    const approvedReport = isLeadApproval
      ? { ...editing, status: 'Pending Final Approval' as const, leadApprovedBy: currentUserName, leadApprovedAt: approvedAt, updatedAt: approvedAt }
      : { ...editing, status: 'Approved' as const, approvedBy: currentUserName, approvedAt, updatedAt: approvedAt };
    setReports(current => current.map(report => report.id === editing.id ? approvedReport : report));
    setNcars(current => current.map(ncar => findingIds.includes(ncar.id) ? { ...ncar, status: isLeadApproval ? NCARStatus.CAP_LEAD_APPROVED : NCARStatus.CLOSED } : ncar));
    setEditing(approvedReport);
    baselineRef.current = JSON.stringify(approvedReport);
    onNotify(isLeadApproval ? 'Lead Auditor approved the completed NCAR/OFI package. It is now pending Head Manager final approval.' : 'Head Manager gave final approval to the NCAR/OFI package.', 'success');
  };

  const reportNcars = useMemo(() => {
    const linkedIds = new Set(editing?.ncarIds || []);
    const uniqueFindings = new Map<string, NCAR>();
    ncars.forEach(ncar => {
      if (linkedIds.has(ncar.id) && !uniqueFindings.has(ncar.id)) uniqueFindings.set(ncar.id, ncar);
    });
    return [...uniqueFindings.values()];
  }, [ncars, editing?.ncarIds]);
  const reportOfis = useMemo(() => {
    const linkedIds = new Set(editing?.ofiIds || []);
    const uniqueFindings = new Map<string, NCAR>();
    ncars.forEach(ncar => {
      if (linkedIds.has(ncar.id) && !uniqueFindings.has(ncar.id)) uniqueFindings.set(ncar.id, ncar);
    });
    return [...uniqueFindings.values()];
  }, [ncars, editing?.ofiIds]);
  const exportFullReport = () => {
    if (!editing) return;
    const linkedPlan = auditPlans.find(plan => plan.id === editing.linkedAuditPlanId);
    const rows: unknown[][] = [
      ['INTERNAL AUDIT REPORT'],
      ['Report Details'],
      ['Report Title', editing.reportTitle], ['Reference Number', editing.referenceNumber], ['Subject / Audit Scope', editing.subject],
      ['Linked Audit Plan', editing.linkedAuditPlanId], ['Audit Type', linkedPlan?.auditType], ['Process', linkedPlan?.processName],
      ['Audit Plan Start Date', linkedPlan?.startDate], ['Audit Plan End Date', linkedPlan?.endDate], ['Auditors', linkedPlan?.auditors.join(', ')], ['Auditees', linkedPlan?.auditees.join(', ')],
      ['Prepared By', editing.preparedBy], ['Release Date', editing.releaseDate],
      ['Confidentiality', editing.confidentiality], ['Status', editing.status], ['Approved By', editing.approvedBy], ['Approved At', editing.approvedAt],
      [], ['Objectives and Conclusion'], ['Audit Objectives', editing.objectives], ['Audit Conclusion', editing.conclusion], [],
      ['NCAR Log'],
      ['NCAR ID', 'Nonconformity (What went wrong?)', 'Evidence', 'ISO/Business Requirement', 'Finding Type', 'Management System Type', 'Clause', 'Issue Date', 'Process Involved', 'Manager Responsible', 'Department Responsible', 'Issuing Auditor', 'NCAR Response Date', 'Part 2 Response Date', 'Consequence / Impact', 'Immediate Correction', 'Correction Responsible', 'Correction Target Date', 'Root Cause Analysis', 'Can Occur Elsewhere?', 'Elsewhere Details', 'Corrective Action Plan', 'CAP Responsible', 'CAP Target Date'],
      ...reportNcars.map(finding => {
        const plan = actionPlans.find(actionPlan => actionPlan.ncarId === finding.id && !actionPlan.isDraft);
        return [finding.id, finding.statement, [finding.evidence, ...(finding.evidenceAttachments || []).map(file => file.name)].filter(Boolean).join('; '), finding.requirement, finding.findingType, finding.systemType, finding.clauseNumber || finding.standardClause, finding.issueDate, finding.processInvolved || finding.processName, finding.managerResponsible || finding.auditee, finding.departmentResponsible || finding.area, finding.issuingAuditor || finding.auditor, finding.deadline, plan?.responseDate, plan?.consequenceImpact, plan?.immediateCorrection, plan?.correctionResponsible || plan?.responsiblePerson, plan?.correctionTargetDate, plan?.rootCause, plan?.canOccurElsewhere, plan?.elsewhereDetails, plan?.correctiveAction, plan?.capResponsible || plan?.responsiblePerson, plan?.capTargetDate];
      }),
      [], ['OFI Log'],
      ['OFI ID', 'Opportunities for Improvement Statement', 'Management System Type', 'Clause', 'Issue Date', 'Department Responsible', 'Manager Responsible (Auditee)', 'Issuing Auditor', 'Deadline for OFI Response', 'Response Date', 'Auditee Decision', 'Applicable', 'Corrective Action Plan', 'Responsible Person', 'Target Date', 'Notes', 'Implementation Progress'],
      ...reportOfis.map(finding => [finding.id, finding.statement, finding.systemType, finding.clauseNumber || finding.standardClause, finding.issueDate, finding.departmentResponsible || finding.area, finding.managerResponsible || finding.auditee, finding.issuingAuditor || finding.auditor, finding.deadline, finding.ofiResponse?.responseDate, finding.ofiResponse?.status, finding.ofiResponse?.applicable, finding.ofiResponse?.correctiveActionPlan, finding.ofiResponse?.responsiblePerson, finding.ofiResponse?.targetDate, finding.ofiResponse?.notes, finding.ofiResponse?.implementationProgress]),
      [], ['Results'], ['Department / Business Unit', 'Audit Maturity Level', 'Major NC', 'Minor NC', 'Opportunities for Improvement', 'Related Findings'],
      ...(editing.resultsGeneratedAt ? departmentResults.map(result => [result.department, result.level, result.major, result.minor, result.ofi, result.ids.join(', ')]) : [['Results have not been generated']]),
      [], ['ISO Clauses'], ['Clause', 'Highlights', 'Lowlights', 'Related NCAR References', 'Related OFI References'],
      ...(editing.clauses.length ? editing.clauses.map(entry => [entry.clause, entry.highlights, entry.lowlights, entry.ncarIds.join(', '), entry.ofiIds.join(', ')]) : [['No clause entries']])
    ];
    const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editing.referenceNumber || editing.id || 'audit-report'}-Full-Audit-Report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const availableFindings = useMemo(() => {
    if (!pickerType) return [];
    const source = ncars.filter(ncar => (pickerType === 'OFI' ? ncar.findingType === 'OFI' : ncar.findingType !== 'OFI') && (!ncar.assignedByAuditReportId || ncar.assignedByAuditReportId === editing?.id));
    const query = pickerSearch.trim().toLowerCase();
    return source.filter(ncar => `${ncar.id} ${ncar.statement} ${ncar.requirement} ${ncar.area}`.toLowerCase().includes(query));
  }, [ncars, pickerType, pickerSearch, editing?.id]);
  const previewFinding = availableFindings.find(ncar => ncar.id === previewId) || ncars.find(ncar => ncar.id === previewId);

  const openPicker = (type: 'NCAR' | 'OFI') => {
    setPickerType(type);
    setPickerSearch('');
    setPreviewId('');
  };

  const addFinding = () => {
    if (!editing || !pickerType || !previewFinding) return;
    const isOFI = pickerType === 'OFI';
    const currentIds = isOFI ? editing.ofiIds : editing.ncarIds;
    if (!currentIds.includes(previewFinding.id)) {
      updateReport(isOFI ? { ofiIds: [...currentIds, previewFinding.id], resultsGeneratedAt: undefined } : { ncarIds: [...currentIds, previewFinding.id], resultsGeneratedAt: undefined });
    }
    setPickerType(null);
    setPreviewId('');
  };

  const openFindingEditor = (finding: NCAR) => {
    if (!canEditFindings) return;
    setEditingFindingId(finding.id);
    if (finding.findingType === 'OFI') {
      setOfiDraft({
        statement: finding.statement,
        systemType: finding.systemType === 'ISMS' || finding.systemType === 'Business' ? finding.systemType : 'QMS',
        clause: finding.clauseNumber || finding.standardClause || '',
        issueDate: finding.issueDate || '',
        businessUnit: finding.departmentResponsible || finding.area || '',
        auditeeName: finding.managerResponsible || finding.auditee || '',
        issuingAuditor: finding.issuingAuditor || finding.auditor || '',
        deadline: finding.deadline || ''
      });
      setNcarDraft(null);
    } else {
      setNcarDraft({
        statement: finding.statement,
        evidence: finding.evidence,
        evidenceAttachments: finding.evidenceAttachments || [],
        requirement: finding.requirement,
        findingType: finding.findingType === 'Major' ? 'Major' : 'Minor',
        systemType: finding.systemType === 'ISMS' || finding.systemType === 'Business' ? finding.systemType : 'QMS',
        clause: finding.clauseNumber || finding.standardClause || '',
        issueDate: finding.issueDate || '',
        processInvolved: finding.processInvolved || finding.processName || '',
        managerResponsible: finding.managerResponsible || finding.auditee || '',
        departmentResponsible: finding.departmentResponsible || finding.area || '',
        issuingAuditor: finding.issuingAuditor || finding.auditor || '',
        deadline: finding.deadline || ''
      });
      setOfiDraft(null);
    }
  };

  const saveReportNcar = () => {
    if (!editing || !ncarDraft || (editingFindingId ? !canEditFindings : isReadOnly)) return;
    if (editingFindingId) {
      const plan = auditPlans.find(item => item.id === editing.linkedAuditPlanId);
      setNcars(current => current.map(finding => finding.id === editingFindingId ? {
        ...finding,
        statement: ncarDraft.statement.trim(),
        evidence: ncarDraft.evidence.trim(),
        evidenceAttachments: ncarDraft.evidenceAttachments,
        requirement: ncarDraft.requirement.trim(),
        findingType: ncarDraft.findingType,
        standardClause: ncarDraft.clause.trim(),
        clauseNumber: ncarDraft.clause.trim(),
        area: ncarDraft.departmentResponsible.trim(),
        auditee: ncarDraft.managerResponsible.trim(),
        auditType: ncarDraft.systemType === 'Business' ? 'Financial' : plan?.auditType || finding.auditType,
        processName: ncarDraft.processInvolved.trim() || finding.processName,
        systemType: ncarDraft.systemType,
        issueDate: ncarDraft.issueDate || finding.issueDate,
        processInvolved: ncarDraft.processInvolved.trim(),
        managerResponsible: ncarDraft.managerResponsible.trim(),
        departmentResponsible: ncarDraft.departmentResponsible.trim(),
        issuingAuditor: ncarDraft.issuingAuditor.trim() || finding.issuingAuditor || finding.auditor
      } : finding));
      setNcarDraft(null);
      setEditingFindingId(null);
      onNotify(`NCAR ${editingFindingId} updated.`, 'success');
      return;
    }
    const issueDate = new Date().toISOString().slice(0, 10);
    const year = issueDate.slice(0, 4);
    const prefix = `NCAR${year}-AR-`;
    const nextNumber = ncars.filter(ncar => ncar.id.startsWith(prefix)).length + 1;
    const id = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    const plan = auditPlans.find(item => item.id === editing.linkedAuditPlanId);
    const finding: NCAR = {
      id,
      auditPlanId: editing.linkedAuditPlanId,
      statement: ncarDraft.statement.trim(),
      evidence: ncarDraft.evidence.trim(),
      evidenceAttachments: ncarDraft.evidenceAttachments,
      requirement: '',
      findingType: ncarDraft.findingType,
      standardClause: ncarDraft.clause.trim(),
      clauseNumber: ncarDraft.clause.trim(),
      area: ncarDraft.departmentResponsible.trim(),
      auditor: ncarDraft.issuingAuditor.trim() || currentUserName,
      auditee: ncarDraft.managerResponsible.trim(),
      createdAt: new Date().toISOString(),
      status: NCARStatus.DRAFT,
      deadline: ncarDraft.deadline,
      auditType: ncarDraft.systemType === 'Business' ? 'Financial' : plan?.auditType || 'Quality/InfoSec',
      processName: ncarDraft.processInvolved.trim() || plan?.processName || editing.subject,
      isEscalated: false,
      systemType: ncarDraft.systemType,
      issueDate: ncarDraft.issueDate || issueDate,
      processInvolved: ncarDraft.processInvolved.trim(),
      managerResponsible: ncarDraft.managerResponsible.trim(),
      departmentResponsible: ncarDraft.departmentResponsible.trim(),
      issuingAuditor: ncarDraft.issuingAuditor.trim() || currentUserName,
      createdByRole: role
    };
    setNcars(current => [finding, ...current]);
    updateReport({ ncarIds: [...editing.ncarIds, id], resultsGeneratedAt: undefined });
    setNcarDraft(null);
    setEditingFindingId(null);
  };

  const addEvidenceAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!ncarDraft || !event.target.files?.length) return;
    const files = Array.from(event.target.files);
    event.target.value = '';
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        setNcarDraft(current => current ? {
          ...current,
          evidenceAttachments: [...current.evidenceAttachments, {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: reader.result as string
          }]
        } : current);
      };
      reader.onerror = () => onNotify(`Unable to read ${file.name}. Please try another file.`, 'warning');
      reader.readAsDataURL(file);
    });
  };

  const saveReportOfi = () => {
    if (!editing || !ofiDraft || (editingFindingId ? !canEditFindings : isReadOnly)) return;
    if (editingFindingId) {
      const plan = auditPlans.find(item => item.id === editing.linkedAuditPlanId);
      setNcars(current => current.map(finding => finding.id === editingFindingId ? {
        ...finding,
        statement: ofiDraft.statement.trim(),
        standardClause: ofiDraft.clause.trim(),
        clauseNumber: ofiDraft.clause.trim(),
        area: ofiDraft.businessUnit.trim(),
        auditee: ofiDraft.auditeeName.trim(),
        auditType: ofiDraft.systemType === 'Business' ? 'Financial' : plan?.auditType || finding.auditType,
        systemType: ofiDraft.systemType,
        issueDate: ofiDraft.issueDate || finding.issueDate,
        departmentResponsible: ofiDraft.businessUnit.trim(),
        managerResponsible: ofiDraft.auditeeName.trim(),
        issuingAuditor: ofiDraft.issuingAuditor.trim() || finding.issuingAuditor || finding.auditor
      } : finding));
      setOfiDraft(null);
      setEditingFindingId(null);
      onNotify(`OFI ${editingFindingId} updated.`, 'success');
      return;
    }
    const issueDate = ofiDraft.issueDate || new Date().toISOString().slice(0, 10);
    const prefix = `OFI${issueDate.slice(0, 4)}-AR-`;
    let nextNumber = ncars.filter(ncar => ncar.id.startsWith(prefix)).length + 1;
    while (ncars.some(ncar => ncar.id === `${prefix}${String(nextNumber).padStart(3, '0')}`)) nextNumber += 1;
    const id = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    const plan = auditPlans.find(item => item.id === editing.linkedAuditPlanId);
    const finding: NCAR = {
      id,
      auditPlanId: editing.linkedAuditPlanId,
      statement: ofiDraft.statement.trim(),
      evidence: '',
      requirement: '',
      findingType: 'OFI',
      standardClause: ofiDraft.clause.trim(),
      clauseNumber: ofiDraft.clause.trim(),
      area: ofiDraft.businessUnit.trim(),
      auditor: ofiDraft.issuingAuditor.trim() || currentUserName,
      auditee: ofiDraft.auditeeName.trim(),
      createdAt: new Date().toISOString(),
      status: NCARStatus.DRAFT,
      deadline: ofiDraft.deadline,
      auditType: ofiDraft.systemType === 'Business' ? 'Financial' : plan?.auditType || 'Quality/InfoSec',
      processName: plan?.processName || editing.subject,
      isEscalated: false,
      systemType: ofiDraft.systemType,
      issueDate,
      departmentResponsible: ofiDraft.businessUnit.trim(),
      issuingAuditor: ofiDraft.issuingAuditor.trim() || currentUserName,
      createdByRole: role
    };
    setNcars(current => [finding, ...current]);
    updateReport({ ofiIds: [...editing.ofiIds, id] });
    setOfiDraft(null);
    setEditingFindingId(null);
  };

  const removeFinding = (type: 'NCAR' | 'OFI', id: string) => {
    if (!editing || isReadOnly) return;
    if (type === 'NCAR') {
      updateReport({ ncarIds: editing.ncarIds.filter(value => value !== id), repeatNcarIds: editing.repeatNcarIds.filter(value => value !== id), clauses: editing.clauses.map(entry => ({ ...entry, ncarIds: entry.ncarIds.filter(value => value !== id) })), resultsGeneratedAt: undefined });
    } else {
      updateReport({ ofiIds: editing.ofiIds.filter(value => value !== id), clauses: editing.clauses.map(entry => ({ ...entry, ofiIds: entry.ofiIds.filter(value => value !== id) })), resultsGeneratedAt: undefined });
    }
  };

  const beginClause = (entry?: AuditReportClause) => {
    if (!editing || (isReadOnly && !(canEditSavedReport && editingSection === 'ISO Clauses')) || (!isReadOnly && !isAuthorized)) return;
    setClauseDraft(entry ? structuredClone(entry) : { id: `clause-${Date.now()}`, clause: '', highlights: '', lowlights: '', ncarIds: [], ofiIds: [] });
  };

  const saveClause = () => {
    if (!editing || !clauseDraft?.clause || (isReadOnly && !(canEditSavedReport && editingSection === 'ISO Clauses'))) return;
    if (editing.clauses.some(entry => entry.clause === clauseDraft.clause && entry.id !== clauseDraft.id)) {
      onNotify('This ISO clause is already listed in the report.', 'warning');
      return;
    }
    const next = editing.clauses.some(entry => entry.id === clauseDraft.id)
      ? editing.clauses.map(entry => entry.id === clauseDraft.id ? clauseDraft : entry)
      : [...editing.clauses, clauseDraft];
    updateReport({ clauses: next });
    setClauseDraft(null);
  };

  const departmentResults = useMemo(() => {
    if (!editing?.resultsGeneratedAt) return [];
    const grouped = new Map<string, { major: number; minor: number; ofi: number; ids: string[]; repeat: boolean }>();
    [...reportNcars, ...reportOfis].forEach(finding => {
      const department = finding.departmentResponsible || finding.area || '';
      if (!department) return;
      const summary = grouped.get(department) || { major: 0, minor: 0, ofi: 0, ids: [], repeat: false };
      if (finding.findingType === 'OFI') summary.ofi += 1;
      else if (finding.findingType === 'Major') summary.major += 1;
      else summary.minor += 1;
      summary.ids.push(finding.id);
      summary.repeat = summary.repeat || editing.repeatNcarIds.includes(finding.id);
      grouped.set(department, summary);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([department, summary]) => ({
      department,
      level: summary.repeat ? 'Level 3' : summary.major > 0 ? 'Level 2' : summary.minor + summary.ofi > 0 ? 'Level 1' : '—',
      ...summary
    }));
  }, [editing, reportNcars, reportOfis]);

  const generateResults = () => {
    if (!editing || isReadOnly) return;
    if (reportNcars.length + reportOfis.length === 0) {
      onNotify('Link NCAR or OFI findings before generating department results.', 'warning');
      return;
    }
    updateReport({ resultsGeneratedAt: new Date().toISOString() });
  };

  const updateClause = (patch: Partial<AuditReportClause>) => setClauseDraft(current => current ? { ...current, ...patch } : current);
  const toggleClauseFinding = (kind: 'ncarIds' | 'ofiIds', id: string) => {
    if (!clauseDraft) return;
    const values = clauseDraft[kind];
    const nextValues = values.includes(id) ? values.filter(value => value !== id) : [...values, id];
    if (kind === 'ncarIds') updateClause({ ncarIds: nextValues });
    else updateClause({ ofiIds: nextValues });
  };

  const renderFindingPicker = () => {
    if (!pickerType) return null;
    const alreadyLinked = pickerType === 'NCAR' ? editing?.ncarIds || [] : editing?.ofiIds || [];
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 sm:p-6">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <div><h4 className="text-xl font-bold text-gray-800">Select {pickerType} record</h4><p className="mt-1 text-sm text-gray-500">Review an existing finding before linking it to this report.</p></div>
            <button type="button" onClick={() => setPickerType(null)} className="rounded-full bg-gray-50 p-2 text-gray-500 hover:text-gray-900" aria-label="Close selector"><X size={20} /></button>
          </div>
          <div className="grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={pickerSearch} onChange={event => setPickerSearch(event.target.value)} placeholder={`Search ${pickerType} records`} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" /></div>
              {availableFindings.length ? availableFindings.map(finding => (
                <button type="button" key={finding.id} onClick={() => setPreviewId(finding.id)} className={`w-full rounded-xl border p-3 text-left transition ${previewId === finding.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                  <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-[#172554]">{finding.id}</span><span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase text-gray-600">{finding.findingType}</span></div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{finding.statement}</p>
                  {alreadyLinked.includes(finding.id) && <span className="mt-2 inline-block text-[10px] font-semibold text-emerald-700">Already linked</span>}
                </button>
              )) : <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">No matching existing records.</p>}
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              {previewFinding ? <><div className="mb-3 flex items-center justify-between"><h5 className="font-bold text-gray-800">Review finding</h5><span className="text-xs text-gray-500">{previewFinding.id}</span></div>
                <dl className="space-y-3 text-sm"><div><dt className="text-xs font-semibold text-gray-500">Statement</dt><dd className="mt-1 whitespace-pre-wrap text-gray-800">{previewFinding.statement}</dd></div><div><dt className="text-xs font-semibold text-gray-500">Evidence</dt><dd className="mt-1 whitespace-pre-wrap text-gray-800">{previewFinding.evidence}</dd></div><div><dt className="text-xs font-semibold text-gray-500">Requirement / Clause</dt><dd className="mt-1 text-gray-800">{previewFinding.requirement} · {previewFinding.clauseNumber || previewFinding.standardClause}</dd></div><div><dt className="text-xs font-semibold text-gray-500">Department / Process</dt><dd className="mt-1 text-gray-800">{previewFinding.departmentResponsible || previewFinding.area || '—'} · {previewFinding.processInvolved || previewFinding.processName || '—'}</dd></div></dl>
                <button type="button" disabled={alreadyLinked.includes(previewFinding.id)} onClick={addFinding} className="mt-5 w-full rounded-xl bg-[#172554] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1E3268] disabled:cursor-not-allowed disabled:opacity-50">{alreadyLinked.includes(previewFinding.id) ? 'Already linked' : `Add ${pickerType} to report`}</button>
              </> : <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-gray-500">Select a record to review its details before including it.</div>}
            </div>
          </div>
          <div className="flex justify-end border-t border-gray-100 p-4"><button type="button" onClick={() => setPickerType(null)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Done</button></div>
        </div>
      </div>
    );
  };

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500';
  const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-600';
  const visibleReports = reports.filter(report => statusFilter === 'All Status' || (statusFilter === 'Pending' ? report.status !== 'Draft' && report.status !== 'Approved' && report.status !== 'Rejected' : report.status === statusFilter));
  const summaryCards = [
    { label: 'All Status', count: reports.length, caption: 'All audit reports', icon: ClipboardList, color: 'blue', filter: 'All Status' as const },
    { label: 'Approved', count: reports.filter(report => report.status === 'Approved').length, caption: 'Approved by Head Manager', icon: CircleCheck, color: 'green', filter: 'Approved' as const },
    { label: 'Rejected', count: reports.filter(report => report.status === 'Rejected').length, caption: 'Requires revision', icon: CircleX, color: 'red', filter: 'Rejected' as const },
    { label: 'Pending', count: reports.filter(report => report.status !== 'Draft' && report.status !== 'Approved' && report.status !== 'Rejected').length, caption: 'Awaiting responses or approval', icon: Clock3, color: 'orange', filter: 'Pending' as const }
  ];

  if (!isEditor) return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold tracking-tight text-gray-800">Internal Audit Report</h1><p className="mt-1 text-sm text-gray-500">Audit Result Summary · Confidential</p></div>
        {isAuthorized && <button type="button" onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172554] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E3268]"><Plus size={18} /> Create Audit Report</button>}
      </header>
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f3e7d3] bg-[#fff8e9] p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, count, caption, icon: Icon, color, filter }) => {
          const styles = {
            blue: { border: 'border-[#efe5d3]', icon: 'bg-indigo-50 text-[#172554]', count: 'text-[#172554]', stripe: 'bg-[#172554]' },
            green: { border: 'border-[#efe5d3]', icon: 'bg-emerald-50 text-emerald-700', count: 'text-gray-900', stripe: 'bg-emerald-500' },
            red: { border: 'border-[#efe5d3]', icon: 'bg-rose-50 text-rose-600', count: 'text-gray-900', stripe: 'bg-rose-500' },
            orange: { border: 'border-[#efe5d3]', icon: 'bg-amber-50 text-amber-700', count: 'text-gray-900', stripe: 'bg-orange-400' }
          }[color] || { border: 'border-[#efe5d3]', icon: 'bg-indigo-50 text-[#172554]', count: 'text-gray-900', stripe: 'bg-[#172554]' };
          return <button key={label} type="button" onClick={() => setStatusFilter(filter)} aria-pressed={statusFilter === filter} className={`group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border bg-[#fffef5] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.border} ${statusFilter === filter ? 'border-indigo-200 ring-2 ring-indigo-100' : ''}`}>
            <span className={`absolute inset-x-0 top-0 h-1 ${styles.stripe}`} />
            <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-medium text-slate-600">{label}</span><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}><Icon size={19} /></span></div>
            <p className={`text-3xl font-bold leading-none tracking-tight ${styles.count}`}>{count}</p><p className="truncate text-[11px] text-slate-500">{caption}</p>
          </button>;
        })}
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left">
          <thead><tr className="border-b border-blue-100 bg-blue-50 text-xs uppercase tracking-wide text-blue-900"><th className="px-5 py-4">Report Title</th><th className="px-5 py-4">Reference Number</th><th className="px-5 py-4">Linked Audit Plan</th><th className="px-5 py-4">Prepared By</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100 text-sm">{visibleReports.length === 0 ? <tr><td colSpan={6} className="px-6 py-14 text-center"><FileText className="mx-auto mb-3 text-gray-300" size={34} /><p className="font-semibold text-gray-600">{reports.length ? `No ${statusFilter.toLowerCase()} reports` : 'No audit reports yet'}</p><p className="mt-1 text-xs text-gray-400">{reports.length ? 'Choose another status card to view reports.' : 'Create a report to begin documenting an audit result.'}</p></td></tr> : visibleReports.map(report => <tr key={report.id} className="hover:bg-blue-50/30"><td className="px-5 py-4 font-semibold text-gray-800">{report.reportTitle || 'Untitled report'}</td><td className="px-5 py-4 text-gray-600">{report.referenceNumber || '—'}</td><td className="px-5 py-4 text-gray-600">{auditPlans.find(plan => plan.id === report.linkedAuditPlanId)?.id || '—'}</td><td className="px-5 py-4 text-gray-600">{report.preparedBy || '—'}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${report.status === 'Draft' ? 'border-amber-200 bg-amber-50 text-amber-700' : report.status === 'Pending Approval' ? 'border-orange-200 bg-orange-50 text-orange-700' : report.status === 'Rejected' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{report.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openSaved(report)} title={canEditFindings ? 'View report' : report.status === 'Draft' ? 'Edit report' : 'View report'} aria-label={`${canEditFindings ? 'View' : report.status === 'Draft' ? 'Edit' : 'Open'} ${report.reportTitle || 'audit report'}`} className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-[#172554] transition hover:bg-blue-100">{canEditFindings ? <Eye size={16} /> : <Pencil size={16} />}</button><button type="button" onClick={() => deleteReport(report)} disabled={!isAuthorized || report.status !== 'Draft'} title={report.status === 'Draft' ? 'Delete draft report' : 'Only draft reports can be deleted'} aria-label={`Delete ${report.reportTitle || 'audit report'}`} className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /></button></div></td></tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );

  const formLabel = 'mb-1.5 block text-xs font-semibold text-gray-600';
  const canEditClauseSection = !isReadOnly || (canEditSavedReport && editingSection === 'ISO Clauses');
  const setTab = (tab: Tab) => { setActiveTab(tab); setValidationErrors([]); };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-amber-100/70 bg-gradient-to-r from-[#fff8e9] via-[#fffdf7] to-[#fff8e9] px-5 py-4 shadow-sm sm:px-7 sm:py-5">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><button type="button" onClick={cancelEditing} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#172554]"><ArrowLeft size={16} /> All Reports</button><h1 className="text-2xl font-extrabold tracking-tight text-[#172554] sm:text-3xl">Internal Audit Report</h1><p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">Audit Result Summary · Confidential</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={exportFullReport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"><Download size={16} /> Export Excel</button>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${editing.status === 'Draft' ? 'border-amber-200 bg-amber-50 text-amber-700' : editing.status === 'Rejected' ? 'border-rose-200 bg-rose-50 text-rose-700' : editing.status === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}><span className="h-2 w-2 rounded-full bg-current" />{editing.status}</span>
            {canApproveReport && <button type="button" onClick={approveReport} className="rounded-xl bg-[#172554] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">{isLeadReportReview ? 'Approve & Forward' : 'Final Approve'}</button>}
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[#f2ead9] bg-gradient-to-b from-[#fffaf0] to-[#fffdf8] px-3 py-3 shadow-sm sm:px-4 sm:py-3.5">
        <div className="overflow-x-auto pb-1"><div className="relative flex min-w-[740px] items-center justify-between gap-1.5" role="tablist" aria-label="Audit report sections">
          <span aria-hidden="true" className="absolute left-[7%] right-[7%] top-1/2 h-[2px] -translate-y-1/2 bg-slate-300" />
          {TABS.map((tab, index) => {
            const active = activeTab === tab;
            const complete = index < (editing.workflowStep || 0);
            return <button key={tab} type="button" role="tab" aria-selected={active} onClick={() => setTab(tab)} className={`relative z-10 flex min-w-0 flex-1 items-center justify-center rounded-full border px-2.5 py-2.5 text-xs font-bold transition sm:px-3 sm:py-3 sm:text-sm ${active ? 'border-[#29236f] bg-[#29236f] text-white shadow-md' : complete ? 'border-[#d9d5f5] bg-[#eeecff] text-[#29236f]' : 'border-[#efe7d7] bg-[#fffaf0] text-[#172554]'}`}>
              <span className="whitespace-nowrap">{tab}</span>
            </button>;
          })}
        </div></div>
      </div>

      {validationErrors.length > 0 && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><div className="mb-2 flex items-center gap-2 font-bold"><AlertCircle size={17} /> Complete the required fields before submitting</div><ul className="list-inside list-disc space-y-1">{validationErrors.map(error => <li key={error}>{error}</li>)}</ul></div>}

      <main className="min-h-[420px] rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
        {activeTab === 'Details' && <section className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-gray-800">Report Details</h2><p className="mt-1 text-sm text-gray-500">Enter the report identity, audit scope, and release information.</p></div>{renderSectionEditControls('Details')}</div><div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label><span className={formLabel}>Report Title <b className="text-red-500">*</b></span><input className={inputClass} value={editing.reportTitle} disabled={isReadOnly && editingSection !== 'Details'} onChange={event => updateReport({ reportTitle: event.target.value })} placeholder="Enter report title" /></label>
          <label><span className={formLabel}>Reference Number <b className="text-red-500">*</b></span><input className={inputClass} value={editing.referenceNumber} disabled={isReadOnly && editingSection !== 'Details'} onChange={event => updateReport({ referenceNumber: event.target.value })} placeholder="Enter reference number" /></label>
          <label className="md:col-span-2"><span className={formLabel}>Subject / Audit Scope <b className="text-red-500">*</b></span><textarea className={inputClass} rows={3} value={editing.subject} disabled={isReadOnly && editingSection !== 'Details'} onChange={event => updateReport({ subject: event.target.value })} placeholder="Describe the subject and scope of this audit" /></label>
          <label><span className={formLabel}>Linked Audit Plan <b className="text-red-500">*</b></span><select className={inputClass} value={editing.linkedAuditPlanId} disabled={isReadOnly && editingSection !== 'Details'} onChange={event => updateReport({ linkedAuditPlanId: event.target.value })}><option value="">Select an Audit Plan</option>{auditPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.id} · {plan.auditType} · {plan.processName}</option>)}</select></label>
          <label><span className={formLabel}>Prepared By <b className="text-red-500">*</b></span><input className={inputClass} value={editing.preparedBy} readOnly disabled={isReadOnly} /></label>
          <label><span className={formLabel}>Release Date <b className="text-red-500">*</b></span><input type="date" className={inputClass} value={editing.releaseDate} disabled={isReadOnly && editingSection !== 'Details'} onChange={event => updateReport({ releaseDate: event.target.value })} /></label>
          <label><span className={formLabel}>Confidentiality <b className="text-red-500">*</b></span><select className={inputClass} value={editing.confidentiality} disabled={isReadOnly && editingSection !== 'Details'} onChange={event => updateReport({ confidentiality: event.target.value })}><option value="">Select confidentiality</option><option>Confidential</option><option>Internal</option><option>Public</option></select></label>
        </div>{!isReadOnly && <div className="flex justify-end border-t border-gray-100 pt-4"><button type="button" onClick={() => continueTo('Objectives')} className="rounded-xl bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">Next</button></div>}</section>}

        {activeTab === 'Objectives' && <section className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-gray-800">Objectives and Conclusion</h2><p className="mt-1 text-sm text-gray-500">Enter the audit objectives and your conclusion.</p></div>{renderSectionEditControls('Objectives')}</div><label className="block"><span className={formLabel}>Audit Objectives <b className="text-red-500">*</b></span><textarea rows={7} className={inputClass} value={editing.objectives} disabled={isReadOnly && editingSection !== 'Objectives'} onChange={event => updateReport({ objectives: event.target.value })} placeholder="Enter audit objectives" /></label><label className="block"><span className={formLabel}>Audit Conclusion <b className="text-red-500">*</b></span><textarea rows={7} className={inputClass} value={editing.conclusion} disabled={isReadOnly && editingSection !== 'Objectives'} onChange={event => updateReport({ conclusion: event.target.value })} placeholder="Enter audit conclusion" /></label>{!isReadOnly && <div className="flex justify-end border-t border-gray-100 pt-4"><button type="button" onClick={() => continueTo('NCAR Log')} className="rounded-xl bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">Next</button></div>}</section>}

        {(activeTab === 'NCAR Log' || activeTab === 'OFI Log') && (() => {
          const isOFI = activeTab === 'OFI Log';
          const rows = isOFI ? reportOfis : reportNcars;
          return <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-lg font-bold text-gray-800">{activeTab}</h2><p className="mt-1 text-sm text-gray-500">Step {isOFI ? 4 : 3} of 6 · {isOFI ? 'Opportunities for improvement linked to this report.' : 'Nonconformity findings linked to this report.'}</p></div><div className="flex flex-wrap gap-2">{!isReadOnly && <button type="button" onClick={() => isOFI ? setOfiDraft(blankReportOfi(currentUserName)) : setNcarDraft(blankReportNcar(currentUserName))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172554] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Plus size={16} /> Add {isOFI ? 'OFI' : 'NCAR'}</button>}</div></div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">{rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-gray-400">No {isOFI ? 'OFI' : 'NCAR'} findings have been created or linked to this report yet.</p> : <ul className="divide-y divide-gray-100">{rows.map(finding => <li key={finding.id} className="flex items-start justify-between gap-4 px-4 py-4 transition hover:bg-blue-50/30 sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-[#172554]">{finding.id}</span><span className="text-xs text-gray-500">{finding.findingType === 'OFI' ? 'Opportunity for Improvement' : `${finding.findingType} NCAR`}</span></div><p className="mt-2 whitespace-pre-wrap text-sm font-medium text-gray-800">{finding.statement || 'No finding statement provided.'}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span>{finding.systemType || 'Management system not specified'}</span><span>Clause: {finding.clauseNumber || finding.standardClause || '—'}</span><span>Department: {finding.departmentResponsible || finding.area || '—'}</span><span>Responsible: {finding.managerResponsible || finding.auditee || '—'}</span>{!isOFI && <span>NCAR Response Date: {finding.deadline || 'Set on approval'}</span>}</div></div><div className="flex shrink-0 items-center gap-1">{canEditFindings && <button type="button" onClick={() => openFindingEditor(finding)} aria-label={`Edit ${finding.id}`} title="Edit finding" className="rounded-lg p-2 text-[#172554] hover:bg-blue-50"><Pencil size={15} /></button>}{!isReadOnly && <button type="button" onClick={() => removeFinding(isOFI ? 'OFI' : 'NCAR', finding.id)} aria-label={`Unlink ${finding.id}`} title="Unlink finding from report" className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><X size={15} /></button>}</div></li>)}</ul>}</div>
            {rows.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold text-gray-800">Part 2 Responses</h3>{rows.map(finding => {
              const plan = !isOFI ? actionPlans.find(actionPlan => actionPlan.ncarId === finding.id && !actionPlan.isDraft) : undefined;
              const response = isOFI ? finding.ofiResponse : undefined;
              return <details key={`response-${finding.id}`} className="rounded-xl border border-gray-200 bg-white p-4"><summary className="cursor-pointer text-sm font-medium text-gray-800">{finding.id} <span className="ml-2 text-xs font-normal text-gray-500">{isOFI ? response?.status || 'Awaiting response' : plan ? `Submitted ${plan.responseDate || ''}` : 'Awaiting Part 2'}</span></summary>
                {isOFI ? <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><p><span className="block text-xs text-gray-500">Response Date</span>{response?.responseDate || '—'}</p><p><span className="block text-xs text-gray-500">Applicable</span>{response?.applicable || '—'}</p><p className="sm:col-span-2"><span className="block text-xs text-gray-500">Corrective Action Plan</span>{response?.correctiveActionPlan || '—'}</p><p><span className="block text-xs text-gray-500">Responsible Person</span>{response?.responsiblePerson || '—'}</p><p><span className="block text-xs text-gray-500">Target Date</span>{response?.targetDate || '—'}</p><p className="sm:col-span-2"><span className="block text-xs text-gray-500">Auditee Notes</span>{response?.notes || '—'}</p></div>
                  : <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><p><span className="block text-xs text-gray-500">Response Date</span>{plan?.responseDate || '—'}</p><p><span className="block text-xs text-gray-500">Consequence / Impact</span>{plan?.consequenceImpact || '—'}</p><p><span className="block text-xs text-gray-500">Immediate Correction</span>{plan?.immediateCorrection || '—'}</p><p><span className="block text-xs text-gray-500">Correction Responsible</span>{plan?.correctionResponsible || plan?.responsiblePerson || '—'}</p><p><span className="block text-xs text-gray-500">Correction Target Date</span>{plan?.correctionTargetDate || '—'}</p><p><span className="block text-xs text-gray-500">Root Cause Analysis</span>{plan?.rootCause || '—'}</p><p><span className="block text-xs text-gray-500">Can Occur Elsewhere?</span>{plan?.canOccurElsewhere || '—'} {plan?.elsewhereDetails}</p><p><span className="block text-xs text-gray-500">CAP Responsible Person</span>{plan?.capResponsible || plan?.responsiblePerson || '—'}</p><p className="sm:col-span-2"><span className="block text-xs text-gray-500">Corrective Action Plan</span>{plan?.correctiveAction || '—'}</p><p><span className="block text-xs text-gray-500">CAP Target Date</span>{plan?.capTargetDate || '—'}</p></div>}
              </details>;
            })}</div>}
            {!isOFI && rows.length > 0 && !isReadOnly && <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="mb-2 text-xs font-semibold text-indigo-900">Repeat audit findings</p><div className="flex flex-wrap gap-3">{rows.map(finding => <label key={finding.id} className="flex items-center gap-2 text-xs text-indigo-900"><input type="checkbox" checked={editing.repeatNcarIds.includes(finding.id)} onChange={event => updateReport({ repeatNcarIds: event.target.checked ? [...editing.repeatNcarIds, finding.id] : editing.repeatNcarIds.filter(id => id !== finding.id), resultsGeneratedAt: undefined })} />{finding.id}</label>)}</div><p className="mt-2 text-[11px] text-indigo-700">Mark only findings confirmed as recurring from a prior audit. This affects the maturity level.</p></div>}
            {!isReadOnly && <div className="flex justify-end border-t border-gray-100 pt-4"><button type="button" onClick={() => continueTo(isOFI ? 'ISO Clauses' : 'OFI Log')} className="rounded-xl bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">Next</button></div>}
          </section>;
        })()}

        {activeTab === 'Results' && <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-lg font-bold text-gray-800">Nonconformity Summary per Department</h2><p className="mt-1 text-sm text-gray-500">Generate the summary when linked audit findings are ready.</p></div>{!isReadOnly && <button type="button" onClick={generateResults} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#172554] hover:bg-blue-100">Generate Results</button>}</div><div className="overflow-x-auto rounded-xl border border-gray-100"><table className="w-full min-w-[740px] text-left text-sm"><thead><tr className="bg-blue-50 text-xs uppercase tracking-wide text-blue-900"><th className="px-4 py-3">Department / Business Unit</th><th className="px-4 py-3">Audit Maturity Level</th><th className="px-4 py-3">Major NC</th><th className="px-4 py-3">Minor NC</th><th className="px-4 py-3">Opportunities for Improvement</th><th className="px-4 py-3">Related Findings</th></tr></thead><tbody className="divide-y divide-gray-100">{!editing.resultsGeneratedAt ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">Results have not been generated.</td></tr> : departmentResults.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No department data is available for the selected findings.</td></tr> : departmentResults.map(result => <tr key={result.department}><td className="px-4 py-3 font-medium text-gray-800">{result.department}</td><td className="px-4 py-3">{result.level}</td><td className="px-4 py-3">{result.major}</td><td className="px-4 py-3">{result.minor}</td><td className="px-4 py-3">{result.ofi}</td><td className="px-4 py-3 text-xs text-gray-600">{result.ids.join(', ')}</td></tr>)}</tbody></table></div><p className="text-xs text-gray-500">Precedence: Level 3 for a marked repeat finding; otherwise Level 2 when a major NC exists; otherwise Level 1 when a minor NC or OFI exists. Departments without findings receive no maturity level.</p></section>}

        {activeTab === 'ISO Clauses' && <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-lg font-bold text-gray-800">ISO Clauses</h2><p className="mt-1 text-sm text-gray-500">Record clause highlights, lowlights, and related finding references.</p></div><div className="flex flex-wrap gap-2">{renderSectionEditControls('ISO Clauses')}{canEditClauseSection && <button type="button" onClick={() => beginClause()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172554] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]"><Plus size={16} /> Add Clause</button>}</div></div>
          {editing.clauses.length === 0 ? <div className="rounded-xl border border-dashed border-gray-200 px-5 py-12 text-center"><ClipboardList className="mx-auto mb-3 text-gray-300" size={32} /><p className="text-sm font-semibold text-gray-700">No clause entries yet</p><p className="mt-1 text-xs text-gray-500">Add an ISO clause to document report highlights and lowlights.</p></div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{editing.clauses.map(entry => <article key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-[#172554]">{entry.clause}</h3>{canEditClauseSection && <div className="flex gap-1"><button type="button" onClick={() => beginClause(entry)} className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">Edit</button><button type="button" onClick={() => updateReport({ clauses: editing.clauses.filter(item => item.id !== entry.id) })} className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${entry.clause}`}><Trash2 size={15} /></button></div>}</div><div className="mt-3 grid gap-3 text-sm"><div><span className="text-xs font-semibold text-gray-500">Highlights</span><p className="mt-1 whitespace-pre-wrap text-gray-700">{entry.highlights || '—'}</p></div><div><span className="text-xs font-semibold text-gray-500">Lowlights</span><p className="mt-1 whitespace-pre-wrap text-gray-700">{entry.lowlights || '—'}</p></div><div className="text-xs text-gray-500">NCARs: {entry.ncarIds.join(', ') || '—'} · OFIs: {entry.ofiIds.join(', ') || '—'}</div></div></article>)}</div>}
          {!isReadOnly && <div className="flex justify-end border-t border-gray-100 pt-4"><button type="button" onClick={() => continueTo('Results')} className="rounded-xl bg-[#172554] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">Next</button></div>}
        </section>}
      </main>

      <footer className="sticky bottom-0 z-20 flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-[0_-8px_24px_rgba(23,37,84,0.08)] backdrop-blur sm:flex-row sm:justify-end">
        <button type="button" onClick={cancelEditing} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={() => saveReport('Draft')} disabled={isReadOnly || !isAuthorized} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#172554] hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">Save as Draft</button>
        <button type="button" onClick={() => saveReport('Awaiting Auditee Responses')} disabled={isReadOnly || !isAuthorized} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172554] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E3268] disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={17} /> Submit</button>
      </footer>

      {ofiDraft && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-5"><div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3"><div><h3 className="text-lg font-bold text-gray-800">{editingFindingId ? 'Edit OFI' : 'Add OFI'}</h3><p className="text-xs text-gray-500">{editingFindingId ? 'Update this linked OFI finding.' : 'Create an opportunity for improvement in this report.'}</p></div><button type="button" onClick={() => { setOfiDraft(null); setEditingFindingId(null); }} className="rounded-full bg-gray-50 p-2 text-gray-500" aria-label="Close OFI form"><X size={19} /></button></div><div className="grid flex-1 content-start gap-x-4 gap-y-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3"><label className="block lg:col-span-3"><span className={labelClass}>Opportunities for Improvement Statement <b className="text-red-500">*</b></span><textarea rows={2} className={inputClass} value={ofiDraft.statement} onChange={event => setOfiDraft({ ...ofiDraft, statement: event.target.value })} placeholder="Describe the opportunity for improvement" /></label><label className="block"><span className={labelClass}>Audit Type</span><select className={inputClass} value={ofiDraft.systemType} onChange={event => setOfiDraft({ ...ofiDraft, systemType: event.target.value as ReportOfiDraft['systemType'] })}><option value="QMS">QMS</option><option value="ISMS">ISMS</option><option value="Business">Business</option></select></label><SearchableMultiSelect label="Clause" options={REPORT_FINDING_CLAUSES} value={ofiDraft.clause.split(', ').filter(Boolean)} onChange={value => setOfiDraft({ ...ofiDraft, clause: value.join(', ') })} placeholder="Select ISO clauses" /><label className="block"><span className={labelClass}>Issue Date</span><input type="date" className={inputClass} value={ofiDraft.issueDate} onChange={event => setOfiDraft({ ...ofiDraft, issueDate: event.target.value })} /></label><label className="block"><span className={labelClass}>Department Responsible</span><select className={inputClass} value={ofiDraft.businessUnit} onChange={event => setOfiDraft({ ...ofiDraft, businessUnit: event.target.value })}><option value="">Select department</option>{REPORT_DEPARTMENTS.map(department => <option key={department} value={department}>{department}</option>)}</select></label><label className="block"><span className={labelClass}>Manager Responsible (Auditee) <b className="text-red-500">*</b></span><select className={inputClass} value={ofiDraft.auditeeName} onChange={event => setOfiDraft({ ...ofiDraft, auditeeName: event.target.value })}><option value="">Select auditee</option>{users.filter(user => user.role === 'AUDITEE').map(user => <option key={user.id} value={user.name}>{user.name}</option>)}</select></label><label className="block"><span className={labelClass}>Issuing Auditor</span><input className={inputClass} value={ofiDraft.issuingAuditor} readOnly /></label><label className="block"><span className={labelClass}>Deadline for OFI Response</span><input type="date" className={inputClass} value={ofiDraft.deadline} onChange={event => setOfiDraft({ ...ofiDraft, deadline: event.target.value })} /></label></div><div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-white px-5 py-3"><button type="button" onClick={() => { setOfiDraft(null); setEditingFindingId(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="button" disabled={!ofiDraft.statement.trim() || !ofiDraft.auditeeName.trim()} onClick={saveReportOfi} className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} /> {editingFindingId ? 'Save Changes' : 'Add OFI'}</button></div></div></div>}
      {ncarDraft && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-5"><div className="flex h-[92vh] max-h-[900px] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3"><div><h3 className="text-lg font-bold text-gray-800">{editingFindingId ? 'Edit NCAR Finding' : 'Add NCAR Finding'}</h3><p className="text-xs text-gray-500">{editingFindingId ? 'Update this linked NCAR finding.' : 'Create a new finding directly in this report.'}</p></div><button type="button" onClick={() => { setNcarDraft(null); setEditingFindingId(null); }} className="rounded-full bg-gray-50 p-2 text-gray-500" aria-label="Close NCAR form"><X size={19} /></button></div><div className="grid flex-1 content-start gap-x-4 gap-y-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3"><label className="block lg:col-span-3"><span className={labelClass}>Nonconformity (What went wrong?) <b className="text-red-500">*</b></span><textarea rows={2} className={inputClass} value={ncarDraft.statement} onChange={event => setNcarDraft({ ...ncarDraft, statement: event.target.value })} placeholder="Describe what went wrong" /></label><div className="block lg:col-span-2"><label className={labelClass}>Evidence <b className="text-red-500">*</b></label><textarea rows={2} className={inputClass} value={ncarDraft.evidence} onChange={event => setNcarDraft({ ...ncarDraft, evidence: event.target.value })} placeholder="Describe the objective evidence" /><label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2.5 text-xs font-semibold text-[#172554] transition hover:bg-blue-50"><input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.txt,.ppt,.pptx,image/*" className="sr-only" onChange={addEvidenceAttachments} /><span>Attach files, images, or Excel sheets</span></label>{ncarDraft.evidenceAttachments.length > 0 && <div className="mt-2 space-y-1.5">{ncarDraft.evidenceAttachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs"><a href={file.dataUrl} download={file.name} className="min-w-0 truncate font-medium text-blue-700 hover:underline">{file.name} <span className="font-normal text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span></a><button type="button" onClick={() => setNcarDraft({ ...ncarDraft, evidenceAttachments: ncarDraft.evidenceAttachments.filter((_, fileIndex) => fileIndex !== index) })} aria-label={`Remove ${file.name}`} className="shrink-0 text-gray-400 hover:text-red-600"><X size={14} /></button></div>)}</div>}</div><label className="block"><span className={labelClass}>Finding Type <b className="text-red-500">*</b></span><select className={inputClass} value={ncarDraft.findingType} onChange={event => setNcarDraft({ ...ncarDraft, findingType: event.target.value as ReportNcarDraft['findingType'] })}><option value="Major">Major</option><option value="Minor">Minor</option></select></label><label className="block"><span className={labelClass}>Audit Type</span><select className={inputClass} value={ncarDraft.systemType} onChange={event => setNcarDraft({ ...ncarDraft, systemType: event.target.value as ReportNcarDraft['systemType'] })}><option value="QMS">QMS</option><option value="ISMS">ISMS</option><option value="Business">Business</option></select></label><SearchableMultiSelect label="Clause" options={REPORT_FINDING_CLAUSES} value={ncarDraft.clause.split(', ').filter(Boolean)} onChange={value => setNcarDraft({ ...ncarDraft, clause: value.join(', ') })} placeholder="Select ISO clauses" /><label className="block"><span className={labelClass}>Issue Date</span><input type="date" className={inputClass} value={ncarDraft.issueDate} onChange={event => setNcarDraft({ ...ncarDraft, issueDate: event.target.value })} /></label><SearchableMultiSelect label="Process Involved" options={Array.from(new Set(auditPlans.map(plan => plan.processName).filter(Boolean)))} value={ncarDraft.processInvolved.split(', ').filter(Boolean)} onChange={value => setNcarDraft({ ...ncarDraft, processInvolved: value.join(', ') })} placeholder="Select processes" /><label className="block"><span className={labelClass}>Manager Responsible (Auditee) <b className="text-red-500">*</b></span><select className={inputClass} value={ncarDraft.managerResponsible} onChange={event => setNcarDraft({ ...ncarDraft, managerResponsible: event.target.value })}><option value="">Select auditee</option>{users.filter(user => user.role === 'AUDITEE').map(user => <option key={user.id} value={user.name}>{user.name}</option>)}</select></label><label className="block"><span className={labelClass}>Department Responsible</span><select className={inputClass} value={ncarDraft.departmentResponsible} onChange={event => setNcarDraft({ ...ncarDraft, departmentResponsible: event.target.value })}><option value="">Select department</option>{REPORT_DEPARTMENTS.map(department => <option key={department} value={department}>{department}</option>)}</select></label><label className="block"><span className={labelClass}>Issuing Auditor</span><input className={inputClass} value={ncarDraft.issuingAuditor} readOnly /></label><div className="block"><span className={labelClass}>NCAR Response Date</span><div className={`${inputClass} flex min-h-[42px] items-center bg-gray-50 text-gray-500`}>Automatically calculated as 5 working days after assignment to the auditee.</div></div></div><div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-white px-5 py-3"><button type="button" onClick={() => { setNcarDraft(null); setEditingFindingId(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="button" disabled={!ncarDraft.statement.trim() || !ncarDraft.evidence.trim() || !ncarDraft.managerResponsible.trim()} onClick={saveReportNcar} className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} /> {editingFindingId ? 'Save Changes' : 'Add NCAR'}</button></div></div></div>}
      {clauseDraft && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 sm:p-6"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-gray-100 p-5"><div><h3 className="text-xl font-bold text-gray-800">{editing.clauses.some(entry => entry.id === clauseDraft.id) ? 'Edit ISO Clause' : 'Add ISO Clause'}</h3><p className="mt-1 text-sm text-gray-500">Clause entries belong to this report and link to existing findings.</p></div><button type="button" onClick={() => setClauseDraft(null)} className="rounded-full bg-gray-50 p-2 text-gray-500" aria-label="Close clause form"><X size={20} /></button></div><div className="space-y-4 p-5"><label className="block"><span className={labelClass}>ISO Clause <b className="text-red-500">*</b></span><select className={inputClass} value={clauseDraft.clause} disabled={!canEditClauseSection} onChange={event => updateClause({ clause: event.target.value })}><option value="">Select ISO Clause</option>{ISO_CLAUSES.filter(clause => clauseDraft.clause === clause || !editing.clauses.some(entry => entry.clause === clause)).map(clause => <option key={clause} value={clause}>{clause}</option>)}</select></label><label className="block"><span className={labelClass}>Highlights</span><textarea rows={3} className={inputClass} value={clauseDraft.highlights} disabled={!canEditClauseSection} onChange={event => updateClause({ highlights: event.target.value })} placeholder="Document positive observations or areas performing well" /></label><label className="block"><span className={labelClass}>Lowlights</span><textarea rows={3} className={inputClass} value={clauseDraft.lowlights} disabled={!canEditClauseSection} onChange={event => updateClause({ lowlights: event.target.value })} placeholder="Document issues, weaknesses, or areas requiring improvement" /></label><div className="grid gap-4 md:grid-cols-2"><fieldset className="rounded-xl border border-gray-100 p-3"><legend className="px-1 text-xs font-semibold text-gray-600">Related NCAR References</legend><div className="max-h-40 space-y-2 overflow-y-auto">{reportNcars.length ? reportNcars.map(finding => <label key={finding.id} className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={clauseDraft.ncarIds.includes(finding.id)} disabled={!canEditClauseSection} onChange={() => toggleClauseFinding('ncarIds', finding.id)} />{finding.id} · {finding.statement.slice(0, 72)}</label>) : <p className="text-xs text-gray-400">No NCARs linked to this report.</p>}</div></fieldset><fieldset className="rounded-xl border border-gray-100 p-3"><legend className="px-1 text-xs font-semibold text-gray-600">Related OFI References</legend><div className="max-h-40 space-y-2 overflow-y-auto">{reportOfis.length ? reportOfis.map(finding => <label key={finding.id} className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={clauseDraft.ofiIds.includes(finding.id)} disabled={!canEditClauseSection} onChange={() => toggleClauseFinding('ofiIds', finding.id)} />{finding.id} · {finding.statement.slice(0, 72)}</label>) : <p className="text-xs text-gray-400">No OFIs linked to this report.</p>}</div></fieldset></div></div><div className="flex justify-end gap-2 border-t border-gray-100 p-5"><button type="button" onClick={() => setClauseDraft(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="button" disabled={!clauseDraft.clause || !canEditClauseSection} onClick={saveClause} className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} /> Save Clause</button></div></div></div>}
      {showSubmitConfirmation && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowSubmitConfirmation(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="submit-ncar-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-[#f3e7d3] bg-[#fffef5] shadow-2xl">
          <div className="border-b border-[#f3ead9] px-5 py-4">
            <h2 id="submit-ncar-title" className="text-lg font-semibold text-[#172554]">Submit NCAR?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Submit Part 1 and assign the linked findings to their Auditees?</p>
            <p className="mt-2 text-xs leading-5 text-gray-500">This starts the 5 working day response period for the Auditees to complete Part 2.</p>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4">
            <button type="button" onClick={() => setShowSubmitConfirmation(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={() => commitReport('Awaiting Auditee Responses')} className="rounded-lg bg-[#25206f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#30298b]">Submit NCAR</button>
          </div>
        </div>
      </div>}
      {renderFindingPicker()}
    </div>
  );
};

export default AuditReportModule;
