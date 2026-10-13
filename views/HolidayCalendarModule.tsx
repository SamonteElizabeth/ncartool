import React, { useState } from 'react';
import { CalendarDays, Plus, Trash2, X } from 'lucide-react';
import { NCAR } from '../types';
import { addPhilippineWorkingDays, getConfiguredPhilippineHolidays, getPhilippineHolidayRecords, hasSubmittedNCARResponse, PH_HOLIDAY_STORAGE_KEY, PhilippineHoliday, PhilippineHolidayType } from '../utils/ncarSla';

interface HolidayCalendarModuleProps {
  setNcars: React.Dispatch<React.SetStateAction<NCAR[]>>;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

const HolidayCalendarModule: React.FC<HolidayCalendarModuleProps> = ({ setNcars, onNotify }) => {
  const [holidays, setHolidays] = useState<PhilippineHoliday[]>(() => getPhilippineHolidayRecords());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<PhilippineHolidayType>('Regular Holiday');
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);

  const saveHolidayCalendar = (records: PhilippineHoliday[]) => {
    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    setHolidays(sortedRecords);
    localStorage.setItem(PH_HOLIDAY_STORAGE_KEY, JSON.stringify(sortedRecords));
    const effectiveDates = getConfiguredPhilippineHolidays(new Date());
    setNcars(current => current.map(ncar => {
      if (ncar.findingType === 'OFI' || !ncar.assignedAt || hasSubmittedNCARResponse(ncar)) return ncar;
      const sla = ncar.responseSla || {
        startedAt: ncar.assignedAt,
        dueDate: ncar.deadline,
        status: 'On Track' as const,
        notificationHistory: []
      };
      const dueDate = addPhilippineWorkingDays(sla.startedAt, 5, effectiveDates);
      return { ...ncar, deadline: dueDate, responseSla: { ...sla, dueDate } };
    }));
    window.dispatchEvent(new CustomEvent('ncartool-holidays-updated'));
  };

  const addHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayDate || holidays.some(holiday => holiday.date === newHolidayDate && holiday.name.toLowerCase() === newHolidayName.trim().toLowerCase())) return;
    saveHolidayCalendar([...holidays, { id: crypto.randomUUID(), name: newHolidayName.trim(), date: newHolidayDate, type: newHolidayType, recurring: newHolidayRecurring }]);
    setNewHolidayName('');
    setNewHolidayDate('');
    setNewHolidayType('Regular Holiday');
    setNewHolidayRecurring(false);
    setIsAddModalOpen(false);
    onNotify('Holiday added. Open NCAR deadlines have been recalculated.', 'success');
  };

  const removeHoliday = (id: string) => {
    saveHolidayCalendar(holidays.filter(item => item.id !== id));
    onNotify('Holiday removed. Open NCAR deadlines have been recalculated.', 'success');
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-indigo-50 p-3 text-[#172554]"><CalendarDays size={22} /></span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-800">Holiday Calendar</h1>
            <p className="mt-1 text-sm text-gray-500">Configure Philippine holidays excluded from the 5 working day NCAR response SLA.</p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#f3e7d3] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div><h2 className="text-base font-semibold text-gray-800">SLA Holidays</h2>
            <p className="mt-1 text-sm text-gray-500">Changes recalculate deadlines for assigned NCARs whose corrective action response is not yet submitted.</p></div>
          <button type="button" onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#172554] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3268]"><Plus size={16} /> Add Holiday</button>
        </div>
        <div className="px-5 pb-5">
          {holidays.length ? <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {holidays.map(holiday => <li key={holiday.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div><p className="text-sm font-medium text-gray-800">{holiday.name}</p><p className="mt-0.5 text-xs text-gray-500">{new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} · {holiday.type} · {holiday.recurring ? 'Repeats yearly' : 'One-time'}</p></div>
              <button type="button" onClick={() => removeHoliday(holiday.id)} aria-label={`Remove holiday ${holiday.name}`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove</button>
            </li>)}
          </ul> : <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">No holidays configured. Add national or organization-observed Philippine holidays.</p>}
          <p className="mt-3 text-xs text-gray-400">Weekends are excluded automatically. Holiday dates are stored in this browser and used across NCARTool SLA calculations.</p>
        </div>
      </section>

      {isAddModalOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setIsAddModalOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="add-holiday-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div><h2 id="add-holiday-title" className="text-lg font-semibold text-gray-800">Add Holiday</h2><p className="mt-1 text-sm text-gray-500">Enter the holiday details for NCAR SLA calculations.</p></div>
            <button type="button" onClick={() => setIsAddModalOpen(false)} aria-label="Close add holiday form" className="rounded-full bg-gray-50 p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-gray-600 sm:col-span-2"><span className="block">Holiday Name <span className="text-red-500">*</span></span><input autoFocus type="text" value={newHolidayName} onChange={event => setNewHolidayName(event.target.value)} placeholder="e.g. Independence Day" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="space-y-1.5 text-sm text-gray-600"><span className="block">Date <span className="text-red-500">*</span></span><input type="date" value={newHolidayDate} onChange={event => setNewHolidayDate(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="space-y-1.5 text-sm text-gray-600"><span className="block">Type of Holiday</span><select value={newHolidayType} onChange={event => setNewHolidayType(event.target.value as PhilippineHolidayType)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"><option>Regular Holiday</option><option>Special Non-Working Holiday</option><option>Special Working Holiday</option><option>Local/Company Holiday</option></select></label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 sm:col-span-2"><input type="checkbox" checked={newHolidayRecurring} onChange={event => setNewHolidayRecurring(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#172554] focus:ring-indigo-500" /> Recurs every year</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" disabled={!newHolidayName.trim() || !newHolidayDate || holidays.some(holiday => holiday.date === newHolidayDate && holiday.name.toLowerCase() === newHolidayName.trim().toLowerCase())} onClick={addHoliday} className="inline-flex items-center gap-2 rounded-lg bg-[#172554] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3268] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Add Holiday</button>
          </div>
        </div>
      </div>}
    </div>
  );
};

export default HolidayCalendarModule;
