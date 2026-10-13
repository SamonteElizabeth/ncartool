import { NCAR, NCARStatus } from '../types';

export const NCAR_RESPONSE_SLA_DAYS = 5;
export const PH_HOLIDAY_STORAGE_KEY = 'ncartool-philippine-holidays';

export type PhilippineHolidayType = 'Regular Holiday' | 'Special Non-Working Holiday' | 'Special Working Holiday' | 'Local/Company Holiday';
export interface PhilippineHoliday {
  id: string;
  name: string;
  date: string;
  type: PhilippineHolidayType;
  recurring: boolean;
}

export const getPhilippineDateKey = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type: string) => parts.find(entry => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const getPhilippineHolidayRecords = (): PhilippineHoliday[] => {
  try {
    const saved = localStorage.getItem(PH_HOLIDAY_STORAGE_KEY);
    const records = saved ? JSON.parse(saved) as unknown : [];
    if (!Array.isArray(records)) return [];
    return records.flatMap((record, index) => {
      if (typeof record === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record)) {
        return [{ id: `legacy-${record}`, name: 'Holiday', date: record, type: 'Regular Holiday' as const, recurring: false }];
      }
      if (!record || typeof record !== 'object') return [];
      const holiday = record as Partial<PhilippineHoliday>;
      if (typeof holiday.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) return [];
      return [{
        id: typeof holiday.id === 'string' ? holiday.id : `holiday-${index}-${holiday.date}`,
        name: typeof holiday.name === 'string' && holiday.name.trim() ? holiday.name.trim() : 'Holiday',
        date: holiday.date,
        type: holiday.type || 'Regular Holiday',
        recurring: holiday.recurring === true
      }];
    });
  } catch {
    return [];
  }
};

export const getConfiguredPhilippineHolidays = (aroundDate: Date = new Date()): string[] => {
  const records = getPhilippineHolidayRecords();
  const excludedRecords = records.filter(holiday => holiday.type !== 'Special Working Holiday');
  const years = [aroundDate.getFullYear() - 1, aroundDate.getFullYear(), aroundDate.getFullYear() + 1, aroundDate.getFullYear() + 2];
  return [...new Set(excludedRecords.flatMap(holiday => {
    if (!holiday.recurring) return [holiday.date];
    const monthDay = holiday.date.slice(4);
    return years.map(year => `${year}${monthDay}`);
  }))];
};

export const addPhilippineWorkingDays = (start: string | Date, days: number, holidays = getConfiguredPhilippineHolidays()): string => {
  const startKey = typeof start === 'string' ? getPhilippineDateKey(new Date(start)) : getPhilippineDateKey(start);
  const holidaySet = new Set(holidays);
  let cursor = parseDateKey(startKey);
  let counted = 0;
  while (counted < days) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    const key = toDateKey(cursor);
    if (weekday !== 0 && weekday !== 6 && !holidaySet.has(key)) counted += 1;
  }
  return toDateKey(cursor);
};

export const previousPhilippineWorkingDay = (dateKey: string, holidays = getConfiguredPhilippineHolidays()): string => {
  const holidaySet = new Set(holidays);
  const cursor = parseDateKey(dateKey);
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6 || holidaySet.has(toDateKey(cursor)));
  return toDateKey(cursor);
};

export const hasSubmittedNCARResponse = (ncar: NCAR): boolean => ncar.findingType === 'OFI'
  ? Boolean(ncar.ofiResponse?.responseDate && ncar.ofiResponse.status !== 'Pending')
  : Boolean(ncar.responseAt || [NCARStatus.ACTION_PLAN_SUBMITTED, NCARStatus.CAP_LEAD_APPROVED, NCARStatus.CLOSED].includes(ncar.status));

export const getResponseSlaStatus = (ncar: NCAR, now: Date = new Date(), holidays = getConfiguredPhilippineHolidays()): 'On Track' | 'Due Soon' | 'Overdue' | 'Submitted' | undefined => {
  if (!ncar.assignedAt && !ncar.responseSla) return undefined;
  if (hasSubmittedNCARResponse(ncar)) return 'Submitted';
  const dueDate = ncar.responseSla?.dueDate || ncar.deadline;
  if (!dueDate) return undefined;
  const today = getPhilippineDateKey(now);
  if (today > dueDate) return 'Overdue';
  if (today >= previousPhilippineWorkingDay(dueDate, holidays)) return 'Due Soon';
  return 'On Track';
};

export const makeResponseSla = (startedAt: string, holidays = getConfiguredPhilippineHolidays()): NonNullable<NCAR['responseSla']> => ({
  startedAt,
  dueDate: addPhilippineWorkingDays(startedAt, NCAR_RESPONSE_SLA_DAYS, holidays),
  status: 'On Track',
  notificationHistory: []
});
