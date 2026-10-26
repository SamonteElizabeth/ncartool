import React, { useState } from 'react';
import { Building2, Mail, Plus, Trash2 } from 'lucide-react';
import { NCAR } from '../types';
import HolidayCalendarModule from './HolidayCalendarModule';

interface MaintenanceTableModuleProps {
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  executiveRecipients: string[];
  setExecutiveRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MaintenanceTableModule: React.FC<MaintenanceTableModuleProps> = ({ departments, setDepartments, executiveRecipients, setExecutiveRecipients, setNcars, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'departments' | 'executives' | 'holidays'>('departments');
  const [departmentName, setDepartmentName] = useState('');
  const [executiveEmail, setExecutiveEmail] = useState('');
  const normalizedExecutiveEmail = executiveEmail.trim().toLowerCase();
  const canAddExecutive = EMAIL_PATTERN.test(normalizedExecutiveEmail) && !executiveRecipients.includes(normalizedExecutiveEmail);

  const addExecutiveRecipient = () => {
    if (!canAddExecutive) return;
    setExecutiveRecipients(current => [...current, normalizedExecutiveEmail].sort((left, right) => left.localeCompare(right)));
    setExecutiveEmail('');
    onNotify(`${normalizedExecutiveEmail} will receive approved Audit Reports.`, 'success');
  };

  const removeExecutiveRecipient = (email: string) => {
    setExecutiveRecipients(current => current.filter(recipient => recipient !== email));
    onNotify(`${email} removed from Executive recipients.`, 'info');
  };

  const addDepartment = () => {
    const name = departmentName.trim();
    if (!name || departments.some(department => department.toLowerCase() === name.toLowerCase())) return;
    const updatedDepartments = [...departments, name].sort((left, right) => left.localeCompare(right));
    setDepartments(updatedDepartments);
    localStorage.setItem('ncartool-departments', JSON.stringify(updatedDepartments));
    setDepartmentName('');
    onNotify(`Department ${name} added and is available in User Management.`, 'success');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-800">Maintenance Table</h1>
        <p className="mt-1 text-sm text-gray-500">Manage shared lists used by NCARTool forms and SLA setup.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#f3e7d3] bg-[#fff8e9] p-2">
        <button type="button" onClick={() => setActiveTab('departments')} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeTab === 'departments' ? 'bg-[#172554] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}><span className="inline-flex items-center gap-2"><Building2 size={16} /> Department</span></button>
        <button type="button" onClick={() => setActiveTab('executives')} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeTab === 'executives' ? 'bg-[#172554] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}><span className="inline-flex items-center gap-2"><Mail size={16} /> Executive Recipients</span></button>
        <button type="button" onClick={() => setActiveTab('holidays')} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeTab === 'holidays' ? 'bg-[#172554] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>Holiday Calendar</button>
      </div>

      {activeTab === 'departments' ? <section className="overflow-hidden rounded-2xl border border-[#f3e7d3] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div><h2 className="text-base font-semibold text-gray-800">Departments</h2><p className="mt-1 text-sm text-gray-500">Departments added here appear in the User Management department dropdown.</p></div>
          <form onSubmit={event => { event.preventDefault(); addDepartment(); }} className="flex w-full gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="new-department">Department name</label>
            <input id="new-department" type="text" value={departmentName} onChange={event => setDepartmentName(event.target.value)} placeholder="Department name" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-64" />
            <button type="submit" disabled={!departmentName.trim() || departments.some(department => department.toLowerCase() === departmentName.trim().toLowerCase())} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#172554] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3268] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Add</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><th className="px-5 py-3 font-medium">Department Name</th><th className="px-5 py-3 text-right font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {departments.map(department => <tr key={department} className="hover:bg-gray-50"><td className="px-5 py-3.5"><span className="inline-flex items-center gap-2"><Building2 size={15} className="text-gray-400" />{department}</span></td><td className="px-5 py-3.5 text-right"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Active</span></td></tr>)}
              {!departments.length && <tr><td colSpan={2} className="px-5 py-10 text-center text-sm text-gray-500">No departments added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section> : activeTab === 'executives' ? <section className="overflow-hidden rounded-2xl border border-[#f3e7d3] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div><h2 className="text-base font-semibold text-gray-800">Executive Recipients</h2><p className="mt-1 text-sm text-gray-500">The full Audit Report is emailed to these addresses when the Head Manager gives final approval.</p></div>
          <form onSubmit={event => { event.preventDefault(); addExecutiveRecipient(); }} className="flex w-full gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="new-executive-email">Executive email</label>
            <input id="new-executive-email" type="email" value={executiveEmail} onChange={event => setExecutiveEmail(event.target.value)} placeholder="executive@company.com" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-64" />
            <button type="submit" disabled={!canAddExecutive} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#172554] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3268] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Add</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><th className="px-5 py-3 font-medium">Email</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {executiveRecipients.map(email => <tr key={email} className="hover:bg-gray-50"><td className="px-5 py-3.5"><span className="inline-flex items-center gap-2"><Mail size={15} className="text-gray-400" />{email}</span></td><td className="px-5 py-3.5 text-right"><button type="button" onClick={() => removeExecutiveRecipient(email)} title="Remove recipient" aria-label={`Remove ${email}`} className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"><Trash2 size={15} /></button></td></tr>)}
              {!executiveRecipients.length && <tr><td colSpan={2} className="px-5 py-10 text-center text-sm text-gray-500">No Executive recipients yet. Approved Audit Reports will not be emailed.</td></tr>}
            </tbody>
          </table>
        </div>
      </section> : <HolidayCalendarModule setNcars={setNcars} onNotify={onNotify} />}
    </div>
  );
};

export default MaintenanceTableModule;
