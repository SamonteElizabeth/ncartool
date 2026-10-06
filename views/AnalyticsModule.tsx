
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Building2, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Filter, Download, Settings,
  BarChart3, PieChart as PieChartIcon, Activity, Info
} from 'lucide-react';
import { NCAR, ActionPlan, User, AuditType, NCARStatus } from '../types';

interface AnalyticsModuleProps {
  ncars: NCAR[];
  actionPlans: ActionPlan[];
  users: User[];
  onNotify: (message: string, type: 'info' | 'success' | 'warning') => void;
}

const COLORS = ['#172554', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const TOOLTIP_STYLE = { borderRadius: 12, borderColor: '#E7E4DC', boxShadow: '0 8px 24px rgba(23,37,84,0.08)', fontSize: 12 };

const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ ncars, actionPlans, users, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'departments' | 'managers' | 'config'>('summary');
  const [tatThreshold, setTatThreshold] = useState(5);
  const [selectedAuditType, setSelectedAuditType] = useState<AuditType | 'All'>('All');

  // Filtered data based on audit type
  const filteredNCARs = useMemo(() => {
    if (selectedAuditType === 'All') return ncars;
    return ncars.filter(n => n.auditType === selectedAuditType);
  }, [ncars, selectedAuditType]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredNCARs.length;
    const open = filteredNCARs.filter(n => n.status === NCARStatus.PENDING || n.status === NCARStatus.REOPENED).length;
    const closed = filteredNCARs.filter(n => n.status === NCARStatus.CLOSED).length;
    const ofis = filteredNCARs.filter(n => n.findingType === 'OFI').length;
    const ncarsOnly = filteredNCARs.filter(n => n.findingType !== 'OFI').length;

    // Overdue calculation (based on TAT threshold)
    const overdue = filteredNCARs.filter(n => {
      if (n.status === NCARStatus.CLOSED) return false;
      const created = new Date(n.createdAt);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > tatThreshold;
    }).length;

    return { total, open, closed, ofis, ncarsOnly, overdue };
  }, [filteredNCARs, tatThreshold]);

  // Department Performance Data
  const deptData = useMemo(() => {
    const targetDepts = ['DISD', 'TSD', 'TASS', 'IA', 'MSP', 'CSS', 'DCFI', 'BTSG', 'EEM'];
    return targetDepts.map(dept => {
      const deptNCARs = filteredNCARs.filter(n => n.area === dept);
      return {
        name: dept,
        NCARs: deptNCARs.filter(n => n.findingType !== 'OFI').length,
        OFIs: deptNCARs.filter(n => n.findingType === 'OFI').length,
        Closed: deptNCARs.filter(n => n.status === NCARStatus.CLOSED).length,
      };
    });
  }, [filteredNCARs]);
  const deptChartData = useMemo(() => deptData.filter(dept => dept.NCARs + dept.OFIs > 0), [deptData]);

  // Manager Performance Data (Cascading)
  const managerData = useMemo(() => {
    const managers = users.filter(u => u.designation === 'Manager');
    return managers.map(manager => {
      const managedNCARs = filteredNCARs.filter(n => n.auditee === manager.name);
      
      // Response TAT calculation
      const responseTimes = managedNCARs
        .filter(n => n.responseAt)
        .map(n => {
          const created = new Date(n.createdAt);
          const responded = new Date(n.responseAt!);
          return Math.ceil((responded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      const avgResponseTAT = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : 'N/A';

      // CAP Timeliness
      const managerActionPlans = actionPlans.filter(ap => ap.responsiblePerson === manager.name);
      const timelyCAPs = managerActionPlans.filter(ap => {
        if (!ap.completedAt) return false;
        return new Date(ap.completedAt) <= new Date(ap.dueDate);
      }).length;

      const capTimeliness = managerActionPlans.length > 0
        ? Math.round((timelyCAPs / managerActionPlans.length) * 100)
        : 100;

      return {
        id: manager.id,
        name: manager.name,
        dept: manager.dept,
        reportsTo: manager.reportsTo,
        totalNCARs: managedNCARs.length,
        escalated: managedNCARs.filter(n => n.isEscalated).length,
        avgResponseTAT,
        capTimeliness,
        score: Math.max(0, 100 - (managedNCARs.filter(n => n.isEscalated).length * 20) - (managedNCARs.filter(n => n.status !== NCARStatus.CLOSED).length * 5))
      };
    });
  }, [filteredNCARs, actionPlans, users]);

  // Department Head Data (Cascading from Managers)
  const deptHeadData = useMemo(() => {
    const heads = users.filter(u => u.designation === 'Department Head');
    return heads.map(head => {
      const reportingManagers = managerData.filter(m => m.reportsTo === head.id);
      const avgScore = reportingManagers.length > 0
        ? Math.round(reportingManagers.reduce((acc, m) => acc + m.score, 0) / reportingManagers.length)
        : 100;
      
      return {
        name: head.name,
        dept: head.dept,
        avgManagerScore: avgScore,
        totalEscalated: reportingManagers.reduce((acc, m) => acc + m.escalated, 0)
      };
    });
  }, [managerData, users]);

  // Process Noncompliance Data
  const processData = useMemo(() => {
    const processes = Array.from(new Set(filteredNCARs.map(n => n.processName)));
    return processes.map(proc => {
      const procNCARs = filteredNCARs.filter(n => n.processName === proc);
      return {
        name: proc || 'Unknown',
        Major: procNCARs.filter(n => n.findingType === 'Major').length,
        Minor: procNCARs.filter(n => n.findingType === 'Minor').length,
        OFI: procNCARs.filter(n => n.findingType === 'OFI').length,
      };
    }).sort((a, b) => (b.Major + b.Minor + b.OFI) - (a.Major + a.Minor + a.OFI)).slice(0, 5);
  }, [filteredNCARs]);

  // TAT by Audit Type Data
  const tatByAuditTypeData = useMemo(() => {
    const types: AuditType[] = ['Quality/InfoSec', 'Financial', 'Special Request'];
    return types.map(type => {
      const typeNCARs = ncars.filter(n => n.auditType === type && n.responseAt);
      const responseTimes = typeNCARs.map(n => {
        const created = new Date(n.createdAt);
        const responded = new Date(n.responseAt!);
        return Math.ceil((responded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avg = responseTimes.length > 0 
        ? Number((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1))
        : 0;
      return { name: type, avgTAT: avg };
    });
  }, [ncars]);

  const recentActivities = useMemo(() => [...filteredNCARs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5), [filteredNCARs]);

  const renderSummary = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Findings', value: stats.total, note: `${stats.ncarsOnly} NCARs / ${stats.ofis} OFIs`, icon: Activity, color: 'text-[#172554]', bg: 'bg-indigo-50', bar: 'bg-[#172554]' },
          { label: 'Open NCARs', value: stats.open, note: 'Pending or reopened', icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-400' },
          { label: 'Closed', value: stats.closed, note: 'Successfully completed', icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
          { label: 'Overdue', value: stats.overdue, note: `Past ${tatThreshold}-day response target`, icon: Clock, color: 'text-rose-700', bg: 'bg-rose-50', bar: 'bg-rose-500' },
        ].map((kpi, i) => (
          <div key={i} className="relative overflow-hidden bg-white p-5 rounded-2xl border border-[#E7E4DC] shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute inset-x-0 top-0 h-1 ${kpi.bar}`} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-500">{kpi.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{kpi.value}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${kpi.bg}`}><kpi.icon className={kpi.color} size={20} /></div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">{kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Finding Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <div><h3 className="text-base font-semibold text-gray-900">Finding distribution</h3><p className="text-xs text-gray-500 mt-1">Breakdown by finding severity</p></div>
            <div className="p-2 rounded-lg bg-indigo-50 text-[#172554]"><PieChartIcon size={18} /></div>
          </div>
          <div className="relative h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Major NCAR', value: filteredNCARs.filter(n => n.findingType === 'Major').length },
                    { name: 'Minor NCAR', value: filteredNCARs.filter(n => n.findingType === 'Minor').length },
                    { name: 'OFI', value: stats.ofis },
                  ]}
                  cx="50%"
                  cy="45%"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={3}
                >
                  {[0, 1, 2].map(index => (
                    <Cell key={`cell-${index}`} fill={[COLORS[3], COLORS[0], COLORS[1]][index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-[10px] font-medium text-gray-500">Findings</p>
            </div>
          </div>
        </div>

        {/* Compliance Trend */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <div><h3 className="text-base font-semibold text-gray-900">Compliance trend</h3><p className="text-xs text-gray-500 mt-1">Monthly compliance score</p></div>
            <div className="p-2 rounded-lg bg-indigo-50 text-[#172554]"><TrendingUp size={18} /></div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[
                  { month: 'Sep', compliance: 85 },
                  { month: 'Oct', compliance: 82 },
                  { month: 'Nov', compliance: 88 },
                  { month: 'Dec', compliance: 92 },
                  { month: 'Jan', compliance: 90 },
                  { month: 'Feb', compliance: 94 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#EAE7DF" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#7B8190', fontSize: 11}} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#7B8190', fontSize: 11}} domain={[75, 100]} tickFormatter={value => `${value}%`} width={42} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={value => [`${value}%`, 'Compliance']} />
                <Line type="monotone" dataKey="compliance" name="Compliance" stroke="#172554" strokeWidth={3} dot={{ r: 4, fill: '#172554', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Non-compliant Processes */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <div><h3 className="text-base font-semibold text-gray-900">Top non-compliant processes</h3><p className="text-xs text-gray-500 mt-1">Findings grouped by process</p></div>
            <div className="p-2 rounded-lg bg-indigo-50 text-[#172554]"><Activity size={18} /></div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#EAE7DF" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#7B8190', fontSize: 11}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#626977', fontSize: 11}} width={120} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{fill: '#F7F6F1'}} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
                <Bar dataKey="Major" stackId="a" name="Major" fill="#E45C62" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Minor" stackId="a" name="Minor" fill="#394D7E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="OFI" stackId="a" name="OFI" fill="#36A889" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg Response TAT by Audit Type */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <div><h3 className="text-base font-semibold text-gray-900">Average response time</h3><p className="text-xs text-gray-500 mt-1">Days to first response by audit type</p></div>
            <div className="p-2 rounded-lg bg-violet-50 text-violet-700"><Clock size={18} /></div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tatByAuditTypeData} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 10 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#EAE7DF" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#7B8190', fontSize: 11}} tickFormatter={value => `${value}d`} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#626977', fontSize: 11}} width={112} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{fill: '#F7F6F1'}} formatter={value => [`${value} days`, 'Average response']} />
                <Bar dataKey="avgTAT" name="Average response" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {tatByAuditTypeData.map((entry, index) => <Cell key={entry.name} fill={[COLORS[0], '#8270B3', '#43A38D'][index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm lg:col-span-2">
          <div className="flex justify-between items-start mb-5">
            <div><h3 className="text-base font-semibold text-gray-900">Recent compliance activity</h3><p className="text-xs text-gray-500 mt-1">Latest findings in the selected audit type</p></div>
            <div className="p-2 rounded-lg bg-indigo-50 text-[#172554]"><Activity size={18} /></div>
          </div>
          <div className="space-y-6">
            {recentActivities.map((ncar, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${ncar.status === NCARStatus.CLOSED ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#172554]'}`}>
                    {ncar.status === NCARStatus.CLOSED ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{ncar.statement.length > 90 ? `${ncar.statement.substring(0, 90)}...` : ncar.statement}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-semibold text-[#172554]">{ncar.id}</span>
                      <span className="text-xs text-gray-300">/</span>
                      <span className="text-xs font-medium text-gray-500">{ncar.area}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-700 capitalize">{ncar.status.toLowerCase().replace('_', ' ')}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{new Date(ncar.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
          {recentActivities.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No activity for this audit type yet.</p>}
        </div>
      </div>
    </div>
  );

  const renderDepartments = () => (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Department performance</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">Compare NCAR and opportunity findings by department.</p>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptChartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }} barGap={5}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#EAE7DF" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#626977', fontSize: 11}} dy={8} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#7B8190', fontSize: 11}} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{fill: '#F7F6F1'}} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
              <Bar dataKey="NCARs" fill="#394D7E" radius={[5, 5, 0, 0]} maxBarSize={34} />
              <Bar dataKey="OFIs" fill="#43A38D" radius={[5, 5, 0, 0]} maxBarSize={34} />
              {deptChartData.length === 0 && <text x="50%" y="50%" textAnchor="middle" fill="#7B8190" fontSize="13">No department findings for this audit type</text>}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E4DC] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#F7F6F1] text-gray-600 border-b border-[#E7E4DC]">
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">Department</th>
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">Total NCARs</th>
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">Total OFIs</th>
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">Closure Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[#4B5563]">
            {deptData.map((dept, i) => (
              <tr key={i} className="hover:bg-[#F7F6F1] transition-colors">
                <td className="px-5 py-4 font-semibold text-gray-800">{dept.name}</td>
                <td className="px-5 py-4 font-normal text-[#172554]">{dept.NCARs}</td>
                <td className="px-5 py-4 font-normal text-emerald-600">{dept.OFIs}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${dept.NCARs + dept.OFIs > 0 ? (dept.Closed / (dept.NCARs + dept.OFIs)) * 100 : 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {dept.NCARs + dept.OFIs > 0 ? Math.round((dept.Closed / (dept.NCARs + dept.OFIs)) * 100) : 100}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderManagers = () => (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Cascading KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {deptHeadData.map((head, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Department Head</p>
                <h3 className="text-xl font-black text-gray-800">{head.name}</h3>
                <p className="text-sm font-bold text-[#172554]">{head.dept}</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl font-black text-lg ${head.avgManagerScore >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                {head.avgManagerScore}%
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-500">Aggregate Manager KPI</span>
                <span className="font-black text-gray-800">{head.avgManagerScore}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${head.avgManagerScore >= 90 ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                  style={{ width: `${head.avgManagerScore}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 italic">
                * This score is a weighted average of all reporting managers' compliance and TAT performance.
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#E7E4DC] shadow-sm">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-900">Manager KPI scores</h3>
          <p className="mt-1 text-xs text-gray-500">Compare current performance scores across managers.</p>
        </div>
        {managerData.length ? <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={managerData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#EAE7DF" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: '#7B8190', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#626977', fontSize: 11 }} width={125} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={value => [`${value}%`, 'KPI score']} cursor={{ fill: '#F7F6F1' }} />
              <Bar dataKey="score" name="KPI score" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {managerData.map(manager => <Cell key={manager.id} fill={manager.score >= 90 ? '#43A38D' : manager.score >= 70 ? '#D59A42' : '#E45C62'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div> : <p className="py-10 text-center text-sm text-gray-500">No manager performance data available.</p>}
      </div>

      {/* Manager Detailed Table */}
      <div className="bg-white rounded-2xl border border-[#E7E4DC] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E7E4DC] bg-[#F7F6F1]">
          <h3 className="text-base font-semibold text-gray-900">Manager performance index</h3>
          <p className="mt-1 text-xs text-gray-500">Response time, escalations, and corrective action timeliness.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-gray-500 border-b border-[#E7E4DC]">
                <th className="px-5 py-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">Manager</th>
                <th className="px-5 py-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">NCARs</th>
                <th className="px-5 py-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">Escalated</th>
                <th className="px-5 py-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">Avg Response TAT</th>
                <th className="px-5 py-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">CAP Timeliness</th>
                <th className="px-5 py-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">KPI Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[#4B5563]">
              {managerData.map((manager, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-800">{manager.name}</p>
                    <p className="text-sm font-normal text-gray-500">{manager.dept}</p>
                  </td>
                  <td className="px-5 py-4 font-normal text-gray-700">{manager.totalNCARs}</td>
                  <td className="px-5 py-4">
                    <span className={`font-medium ${manager.escalated > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {manager.escalated}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`font-medium ${Number(manager.avgResponseTAT) > tatThreshold ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {manager.avgResponseTAT} days
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${manager.capTimeliness < 80 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {manager.capTimeliness}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      manager.score >= 90 ? 'bg-emerald-50 text-emerald-600' :
                      manager.score >= 70 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {manager.score >= 90 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {manager.score}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-50 rounded-2xl text-[#172554]">
            <Settings size={24} />
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Analytics Configuration</h3>
        </div>
        
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm text-[#4B5563] font-bold uppercase tracking-widest">Response TAT Threshold (Working Days)</label>
              <span className="bg-blue-50 text-[#172554] px-3 py-1 rounded-lg font-black">{tatThreshold} Days</span>
            </div>
            <input 
              type="range" min="1" max="15" step="1" 
              value={tatThreshold} 
              onChange={(e) => setTatThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 font-normal"
            />
            <p className="text-xs text-gray-400 font-medium">NCARs and OFIs not responded to within this period will be flagged as overdue.</p>
          </div>

          <div className="pt-8 border-t border-gray-100">
            <button 
              onClick={() => {
                onNotify('Configuration saved successfully.', 'success');
              }}
              className="w-full bg-[#172554] text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-[#1E3268] transition-all uppercase tracking-widest"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor findings, response times, and performance across your audits.</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-[#E7E4DC] shadow-sm">
            <Filter size={16} className="text-gray-500" />
            <select 
              value={selectedAuditType} 
              onChange={(e) => setSelectedAuditType(e.target.value as any)}
              className="bg-transparent border-none text-sm text-gray-700 outline-none cursor-pointer appearance-none pr-8 font-medium"
            >
              <option value="All">All Audit Types</option>
              <option value="Quality/InfoSec">Quality/InfoSec</option>
              <option value="Financial">Financial</option>
              <option value="Special Request">Special Request</option>
            </select>
          </div>
          <button aria-label="Download analytics" title="Download analytics" className="p-3 bg-white text-gray-500 hover:text-[#172554] rounded-xl border border-[#E7E4DC] shadow-sm transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex max-w-full gap-1 overflow-x-auto p-1.5 bg-white border border-[#E7E4DC] rounded-xl w-fit shadow-sm">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'managers', label: 'Manager KPIs', icon: Users },
          { id: 'config', label: 'Config', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-[#172554] text-white shadow-sm'
                : 'text-gray-500 hover:bg-[#F5F4F0] hover:text-gray-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pb-10">
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'departments' && renderDepartments()}
        {activeTab === 'managers' && renderManagers()}
        {activeTab === 'config' && renderConfig()}
      </div>
    </div>
  );
};

export default AnalyticsModule;








